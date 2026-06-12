#!/bin/bash
# §150 · install systemd --user unit for the multi-process supervisor daemon.
# Idempotent · re-runnable.

set -u
ROOT="/mnt/deepa/insur_project"
UNIT_SRC="$ROOT/scripts/insur-supervisor.service"
UNIT_DST="$HOME/.config/systemd/user/insur-supervisor.service"

mkdir -p "$HOME/.config/systemd/user"

# Copy unit (overwrite ok · single source of truth in repo)
cp -f "$UNIT_SRC" "$UNIT_DST"

systemctl --user daemon-reload
systemctl --user enable insur-supervisor.service
systemctl --user restart insur-supervisor.service
sleep 3
systemctl --user is-active insur-supervisor.service
systemctl --user status insur-supervisor.service --no-pager | head -8

echo
echo "✓ Supervisor systemd unit installed and running"
echo "  Logs: journalctl --user -u insur-supervisor.service -f"
echo "  Stop: systemctl --user stop insur-supervisor.service"
echo "  Restart: systemctl --user restart insur-supervisor.service"
