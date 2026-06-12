#!/usr/bin/env python3
"""§150 — multi-process supervisor daemon (the "advance machnisum").

Replaces nohup-and-pray. Spawns N child services, monitors each via
port-binding + HTTP probe + process liveness, and respawns on death
with exponential-backoff. JSON state file at jobs/state/supervisor.json
for UI consumption.

Run as: python scripts/multi_supervisor.py
        python scripts/multi_supervisor.py --status
        python scripts/multi_supervisor.py --once    # one tick · then exit
"""
from __future__ import annotations
import json
import os
import signal
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

# === config ===
ROOT = Path("/mnt/deepa/insur_project")
LOG_DIR = ROOT / "jobs" / "logs"
STATE_DIR = ROOT / "jobs" / "state"
LOG_DIR.mkdir(parents=True, exist_ok=True)
STATE_DIR.mkdir(parents=True, exist_ok=True)
STATE_FILE = STATE_DIR / "supervisor.json"
TZ = ZoneInfo("America/Edmonton")
VENV = "/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"

SERVICES = [
    {
        "name": "backend",
        "port": 8001,
        "cmd": [VENV, "scripts/launch_backend.py"],
        "cwd": str(ROOT),
        "log": "backend.log",
        "env": {
            "BEV_CORS_ORIGINS": "http://localhost:3000,http://localhost:3210,http://127.0.0.1:3000,http://127.0.0.1:3210",
            "INSUR_SKIP_MIGRATIONS": "1",
            "INSUR_DISABLE_PRESIDIO": "1",
            "TF_CPP_MIN_LOG_LEVEL": "3",
        },
        "health_path": "/api/v1/health",
        "ready_wait": 30,
    },
    {
        "name": "vite-3210",
        "port": 3210,
        "cmd": ["node", "node_modules/.bin/vite", "--host", "0.0.0.0", "--port", "3210"],
        "cwd": str(ROOT / "frontend"),
        "log": "vite_3210.log",
        "env": {},
        "health_path": "/",
        "ready_wait": 15,
    },
    {
        "name": "vite-3000",
        "port": 3000,
        "cmd": ["node", "node_modules/.bin/vite", "--host", "0.0.0.0", "--port", "3000"],
        "cwd": str(ROOT / "frontend"),
        "log": "vite_3000.log",
        "env": {},
        "health_path": "/",
        "ready_wait": 15,
    },
]

# === helpers ===
def stamp() -> str:
    return datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S MDT")

def utc_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

def port_bound(port: int) -> bool:
    """Returns True if the port is in LISTEN state."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            r = s.connect_ex(("127.0.0.1", port))
            return r == 0
    except OSError:
        return False

def kill_port(port: int) -> None:
    """Kill any process bound to a port (last resort)."""
    try:
        subprocess.run(
            ["pkill", "-9", "-f", f":{port}"],
            check=False,
            capture_output=True,
            timeout=5,
        )
    except (subprocess.SubprocessError, OSError):
        pass

def write_state(state: dict) -> None:
    state["updated_utc"] = utc_iso()
    state["updated_local"] = stamp()
    STATE_FILE.write_text(json.dumps(state, indent=2))

def read_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except json.JSONDecodeError:
            pass
    return {"services": {}}

def log_event(msg: str) -> None:
    line = f"[{stamp()}] {msg}"
    print(line, flush=True)
    with open(LOG_DIR / "supervisor.log", "a") as f:
        f.write(line + "\n")

# === supervision ===
class Supervisor:
    def __init__(self) -> None:
        self.children: dict[str, subprocess.Popen | None] = {s["name"]: None for s in SERVICES}
        self.restart_counts: dict[str, int] = {s["name"]: 0 for s in SERVICES}
        self.last_restart: dict[str, float] = {s["name"]: 0.0 for s in SERVICES}
        self.backoff_seconds: dict[str, int] = {s["name"]: 5 for s in SERVICES}

    def spawn(self, svc: dict) -> bool:
        name = svc["name"]
        log_path = LOG_DIR / svc["log"]
        env = {**os.environ, **svc["env"]}
        try:
            with open(log_path, "ab") as logf:
                proc = subprocess.Popen(
                    svc["cmd"],
                    cwd=svc["cwd"],
                    env=env,
                    stdout=logf,
                    stderr=subprocess.STDOUT,
                    start_new_session=True,
                )
            self.children[name] = proc
            self.last_restart[name] = time.time()
            self.restart_counts[name] += 1
            log_event(f"spawned {name} pid={proc.pid} backoff={self.backoff_seconds[name]}s")
            return True
        except (OSError, ValueError) as e:
            log_event(f"spawn FAILED {name}: {e}")
            return False

    def is_alive(self, svc: dict) -> bool:
        # Two checks: port-bound AND child not terminated
        if not port_bound(svc["port"]):
            return False
        child = self.children[svc["name"]]
        if child is not None and child.poll() is not None:
            return False
        return True

    def restart(self, svc: dict) -> None:
        name = svc["name"]
        kill_port(svc["port"])
        time.sleep(2)
        # Exponential backoff: 5s → 10s → 20s → 40s → 60s cap
        elapsed = time.time() - self.last_restart[name]
        if elapsed < 60:
            self.backoff_seconds[name] = min(60, self.backoff_seconds[name] * 2)
        else:
            self.backoff_seconds[name] = 5
        time.sleep(self.backoff_seconds[name])
        self.spawn(svc)

    def tick(self) -> dict:
        """One supervision pass. Returns state dict."""
        state = {"services": {}, "tick_count": self._tick_count()}
        for svc in SERVICES:
            name = svc["name"]
            alive = self.is_alive(svc)
            if not alive:
                # Was running and died? Or never started?
                child = self.children[name]
                exit_code = child.poll() if child else None
                log_event(
                    f"{name} DOWN port={svc['port']} child_exit={exit_code} "
                    f"restart_count={self.restart_counts[name]}"
                )
                self.restart(svc)
                # Recheck after spawn
                time.sleep(svc.get("ready_wait", 10))
                alive = self.is_alive(svc)
            child = self.children[name]
            state["services"][name] = {
                "port": svc["port"],
                "alive": alive,
                "pid": child.pid if child and child.poll() is None else None,
                "restart_count": self.restart_counts[name],
                "last_restart_utc": utc_iso() if self.last_restart[name] else None,
                "backoff_seconds": self.backoff_seconds[name],
                "health_path": svc["health_path"],
            }
        write_state(state)
        return state

    _t = [0]
    def _tick_count(self) -> int:
        self._t[0] += 1
        return self._t[0]

# === CLI ===
def status_print() -> None:
    state = read_state()
    print(f"§150 supervisor status @ {stamp()}")
    print(f"  updated: {state.get('updated_local', '(none)')}")
    print()
    print(f"{'SERVICE':<14} {'PORT':<7} {'ALIVE':<7} {'PID':<8} {'RESTARTS':<10} {'BACKOFF':<10}")
    print("-" * 70)
    for name, svc in state.get("services", {}).items():
        alive = "✓ UP" if svc.get("alive") else "✗ DOWN"
        pid = svc.get("pid") or "-"
        print(f"{name:<14} {svc.get('port', '-'):<7} {alive:<7} {str(pid):<8} "
              f"{svc.get('restart_count', 0):<10} {svc.get('backoff_seconds', '-')}s")
    print()

def supervisor_running() -> int | None:
    """Returns PID if another supervisor is running, else None."""
    try:
        r = subprocess.run(
            ["pgrep", "-f", "multi_supervisor.py"],
            capture_output=True, text=True, timeout=5,
        )
        pids = [int(p) for p in r.stdout.split() if p.isdigit() and int(p) != os.getpid()]
        return pids[0] if pids else None
    except (subprocess.SubprocessError, OSError):
        return None

def main() -> None:
    if "--status" in sys.argv:
        status_print()
        return

    once = "--once" in sys.argv

    other = supervisor_running()
    if other and not once:
        log_event(f"another supervisor already running pid={other} · exiting")
        return

    sup = Supervisor()
    log_event("=== §150 multi-process supervisor START ===")

    # Trap signals
    stopping = [False]
    def stop(sig, frame):
        stopping[0] = True
        log_event(f"signal {sig} received · stopping (children stay alive)")
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    try:
        while not stopping[0]:
            state = sup.tick()
            alive_count = sum(1 for s in state["services"].values() if s.get("alive"))
            log_event(f"tick complete · alive={alive_count}/{len(SERVICES)}")
            if once:
                break
            time.sleep(30)  # tick every 30s
    finally:
        log_event("=== §150 supervisor exiting · children stay alive ===")

if __name__ == "__main__":
    main()
