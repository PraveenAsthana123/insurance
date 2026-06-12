"""§140 · Train 6 REAL reference models · one per technique family.

Each model trained on REAL data from PostgreSQL (or HF pretrained for CV/transformer).
Honest §57.7 — declares data_source and synthetic flag.
"""
from __future__ import annotations
import json
import os
import warnings
from datetime import datetime
from pathlib import Path
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import psycopg2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

R = Path("/mnt/deepa/insur_project")
REF = R / "models/refs"
REF.mkdir(parents=True, exist_ok=True)


def stamp():
    return {"ts_local": datetime.now().isoformat(),
            "data_source": "REAL · PostgreSQL agent_invocation OR toy env (RL only)",
            "synthetic": False, "spec": "§140 reference impl"}


def connect():
    return psycopg2.connect(host="localhost", port=5434, user="insur_user",
                             password="insur_secret_password", dbname="insur_analytics")


# ─── 1 · Time-Series · AR(7) on hourly counts ───
def train_time_series():
    print("\n[1/6] Time Series · AR(7) on hourly agent_invocation count")
    out = REF / "time-series"; out.mkdir(parents=True, exist_ok=True)
    conn = connect()
    df = pd.read_sql_query("""
        SELECT date_trunc('hour', created_at) AS hr, COUNT(*) AS n
        FROM agent_invocation
        WHERE created_at IS NOT NULL
        GROUP BY 1 ORDER BY 1
    """, conn)
    conn.close()
    series = df["n"].values.astype(float)
    if len(series) < 20:
        print("  ⚠ Insufficient hours · honest skip"); return None
    k = 7
    Xy = np.array([series[i-k:i+1] for i in range(k, len(series))])
    X, y = Xy[:, :-1], Xy[:, -1]
    split = int(0.8 * len(X))
    Xtr, Xte, ytr, yte = X[:split], X[split:], y[:split], y[split:]
    from sklearn.linear_model import Ridge
    m = Ridge(alpha=1.0).fit(Xtr, ytr)
    pred = m.predict(Xte)
    mae = float(np.mean(np.abs(pred - yte)))
    mape = float(np.mean(np.abs((pred - yte) / np.clip(yte, 1, None))) * 100)
    plt.figure(figsize=(10, 4))
    plt.plot(yte, label="actual"); plt.plot(pred, label="pred")
    plt.title(f"AR(7) on hourly count · MAE={mae:.2f}")
    plt.legend(); plt.tight_layout(); plt.savefig(out / "forecast.png", dpi=80); plt.close()
    import joblib
    joblib.dump(m, out / "model.joblib")
    metrics = {**stamp(), "technique": "time-series", "method": "Ridge AR(7)",
                "MAE": round(mae, 4), "MAPE_pct": round(mape, 2),
                "n_hours_train": int(split), "n_hours_test": int(len(X) - split)}
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"  MAE: {mae:.2f}  MAPE: {mape:.2f}%")
    return metrics


# ─── 2 · LSTM (RNN) ───
def train_lstm():
    print("\n[2/6] RNN/LSTM · 2-layer LSTM on hourly counts (torch)")
    out = REF / "rnn-lstm"; out.mkdir(parents=True, exist_ok=True)
    try:
        import torch
        import torch.nn as nn
    except ImportError:
        print("  ⚠ torch not installed · honest skip"); return None
    conn = connect()
    df = pd.read_sql_query("""
        SELECT date_trunc('hour', created_at) AS hr, COUNT(*) AS n
        FROM agent_invocation GROUP BY 1 ORDER BY 1
    """, conn)
    conn.close()
    series = df["n"].values.astype("float32")
    if len(series) < 24:
        print("  ⚠ Insufficient · skip"); return None
    mu, sd = series.mean(), series.std() or 1.0
    s = (series - mu) / sd
    k = 7
    X = torch.tensor([s[i-k:i] for i in range(k, len(s))]).unsqueeze(-1)
    y = torch.tensor([s[i] for i in range(k, len(s))]).unsqueeze(-1)

    class LSTMReg(nn.Module):
        def __init__(self):
            super().__init__()
            self.lstm = nn.LSTM(1, 16, num_layers=2, batch_first=True)
            self.fc = nn.Linear(16, 1)
        def forward(self, x):
            o, _ = self.lstm(x)
            return self.fc(o[:, -1, :])

    m = LSTMReg()
    opt = torch.optim.Adam(m.parameters(), lr=1e-2)
    loss_fn = nn.MSELoss()
    split = int(0.8 * len(X))
    Xtr, Xte, ytr, yte = X[:split], X[split:], y[:split], y[split:]
    for epoch in range(40):
        m.train(); opt.zero_grad()
        pred = m(Xtr); loss = loss_fn(pred, ytr)
        loss.backward(); opt.step()
    m.train(False)
    with torch.no_grad():
        pred_te = m(Xte).numpy().flatten()
    yte_np = yte.numpy().flatten()
    pred_real = pred_te * sd + mu
    yte_real = yte_np * sd + mu
    mae = float(np.mean(np.abs(pred_real - yte_real)))
    plt.figure(figsize=(10, 4))
    plt.plot(yte_real, label="actual"); plt.plot(pred_real, label="pred")
    plt.title(f"LSTM(2) · hourly count · MAE={mae:.2f}")
    plt.legend(); plt.tight_layout(); plt.savefig(out / "forecast.png", dpi=80); plt.close()
    torch.save(m.state_dict(), out / "lstm.pt")
    metrics = {**stamp(), "technique": "rnn-lstm", "method": "LSTM(2 layers, hidden=16)",
                "MAE": round(mae, 4), "n_epochs": 40,
                "n_params": sum(p.numel() for p in m.parameters())}
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"  MAE: {mae:.2f}")
    return metrics


# ─── 3 · VAE ───
def train_vae():
    print("\n[3/6] VAE · PyTorch · 5-feature distribution from agent_invocation")
    out = REF / "vae"; out.mkdir(parents=True, exist_ok=True)
    try:
        import torch
        import torch.nn as nn
    except ImportError:
        print("  ⚠ torch · skip"); return None
    conn = connect()
    df = pd.read_sql_query("""
        SELECT COALESCE(duration_ms,0) AS duration_ms,
               COALESCE(cost_usd,0) AS cost_usd,
               COALESCE(tokens_in,0) AS tokens_in,
               COALESCE(tokens_out,0) AS tokens_out,
               COALESCE(retry_count,0) AS retry_count
        FROM agent_invocation LIMIT 5000
    """, conn)
    conn.close()
    X = df.values.astype("float32")
    mu, sd = X.mean(0), X.std(0); sd[sd == 0] = 1
    X = (X - mu) / sd
    X = torch.tensor(X)

    class VAE(nn.Module):
        def __init__(self, d_in=5, d_h=16, d_z=3):
            super().__init__()
            self.enc = nn.Sequential(nn.Linear(d_in, d_h), nn.ReLU())
            self.mu = nn.Linear(d_h, d_z); self.lv = nn.Linear(d_h, d_z)
            self.dec = nn.Sequential(nn.Linear(d_z, d_h), nn.ReLU(), nn.Linear(d_h, d_in))
        def forward(self, x):
            h = self.enc(x); mu = self.mu(h); lv = self.lv(h)
            z = mu + torch.exp(0.5*lv) * torch.randn_like(lv)
            return self.dec(z), mu, lv

    m = VAE()
    opt = torch.optim.Adam(m.parameters(), lr=1e-3)
    for epoch in range(50):
        m.train(); opt.zero_grad()
        xh, mu, lv = m(X)
        recon = ((xh - X) ** 2).mean()
        kld = -0.5 * (1 + lv - mu.pow(2) - lv.exp()).sum(1).mean()
        loss = recon + 0.01 * kld
        loss.backward(); opt.step()
    m.train(False)
    with torch.no_grad():
        xh, mu, lv = m(X)
        recon = ((xh - X) ** 2).mean(1).numpy()
    p95 = float(np.percentile(recon, 95))
    p99 = float(np.percentile(recon, 99))
    plt.figure(figsize=(8, 4))
    plt.hist(recon, bins=50); plt.axvline(p95, color="r", label="P95 (anomaly threshold)")
    plt.title("VAE reconstruction error · anomaly score histogram")
    plt.legend(); plt.tight_layout(); plt.savefig(out / "anomaly_hist.png", dpi=80); plt.close()
    torch.save(m.state_dict(), out / "vae.pt")
    metrics = {**stamp(), "technique": "vae", "method": "VAE(d_z=3, d_h=16)",
                "n_samples": int(len(X)), "n_epochs": 50,
                "recon_p95": round(p95, 4), "recon_p99": round(p99, 4),
                "n_params": sum(p.numel() for p in m.parameters())}
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"  recon P95: {p95:.4f}  P99: {p99:.4f}")
    return metrics


# ─── 4 · Tiny GAN ───
def train_gan():
    print("\n[4/6] GAN · PyTorch · vanilla on real 2-feat")
    out = REF / "gan"; out.mkdir(parents=True, exist_ok=True)
    try:
        import torch
        import torch.nn as nn
    except ImportError:
        print("  ⚠ torch · skip"); return None
    conn = connect()
    df = pd.read_sql_query("""
        SELECT COALESCE(duration_ms,0) AS d, COALESCE(tokens_in,0) AS t
        FROM agent_invocation LIMIT 3000
    """, conn)
    conn.close()
    X = df.values.astype("float32")
    mu, sd = X.mean(0), X.std(0); sd[sd == 0] = 1
    X = (X - mu) / sd
    X = torch.tensor(X)
    G = nn.Sequential(nn.Linear(8, 16), nn.ReLU(), nn.Linear(16, 2))
    D = nn.Sequential(nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 1), nn.Sigmoid())
    opt_g = torch.optim.Adam(G.parameters(), lr=1e-3)
    opt_d = torch.optim.Adam(D.parameters(), lr=1e-3)
    bce = nn.BCELoss()
    n_batch = 100
    for epoch in range(60):
        idx = torch.randperm(len(X))[:n_batch]
        real = X[idx]
        z = torch.randn(n_batch, 8)
        fake = G(z)
        opt_d.zero_grad()
        ld = bce(D(real), torch.ones(n_batch, 1)) + bce(D(fake.detach()), torch.zeros(n_batch, 1))
        ld.backward(); opt_d.step()
        opt_g.zero_grad()
        lg = bce(D(fake), torch.ones(n_batch, 1))
        lg.backward(); opt_g.step()
    G.train(False)
    with torch.no_grad():
        gen = G(torch.randn(1000, 8)).numpy()
    plt.figure(figsize=(7, 5))
    plt.scatter(X.numpy()[:500, 0], X.numpy()[:500, 1], alpha=0.4, label="real")
    plt.scatter(gen[:, 0], gen[:, 1], alpha=0.4, label="generated")
    plt.legend(); plt.title("GAN: real vs generated (2-feat)")
    plt.tight_layout(); plt.savefig(out / "gan_samples.png", dpi=80); plt.close()
    torch.save(G.state_dict(), out / "G.pt"); torch.save(D.state_dict(), out / "D.pt")
    metrics = {**stamp(), "technique": "gan", "method": "Vanilla GAN(2-feat)",
                "n_samples_real": int(len(X)), "n_generated": 1000, "n_epochs": 60,
                "final_d_loss": round(ld.item(), 4), "final_g_loss": round(lg.item(), 4)}
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"  d_loss: {ld.item():.4f}  g_loss: {lg.item():.4f}")
    return metrics


# ─── 5 · Transformer (DistilBERT) ───
def train_transformer():
    print("\n[5/6] Transformer · HF DistilBERT sentiment (pretrained) on REAL input_text")
    out = REF / "transformer"; out.mkdir(parents=True, exist_ok=True)
    try:
        from transformers import pipeline
    except ImportError:
        print("  ⚠ transformers not installed · honest skip"); return None
    conn = connect()
    df = pd.read_sql_query("""
        SELECT COALESCE(input_text, '') AS text
        FROM agent_invocation WHERE LENGTH(COALESCE(input_text,'')) > 10
        LIMIT 50
    """, conn)
    conn.close()
    if len(df) == 0:
        print("  ⚠ no text · skip"); return None
    try:
        clf = pipeline("sentiment-analysis",
                        model="distilbert-base-uncased-finetuned-sst-2-english",
                        truncation=True, max_length=128)
        texts = df["text"].head(20).tolist()
        results = clf(texts)
        pos_count = sum(1 for r in results if r["label"] == "POSITIVE")
        avg_score = float(np.mean([r["score"] for r in results]))
    except Exception as e:
        print(f"  ⚠ transformer call failed: {str(e)[:100]}")
        results, pos_count, avg_score = [], 0, 0.0
    metrics = {**stamp(), "technique": "transformer", "method": "distilbert-sst-2",
                "n_texts": len(results), "positive_count": pos_count,
                "avg_confidence": round(avg_score, 4)}
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"  scored {len(results)} texts · {pos_count} positive · avg conf {avg_score:.4f}")
    return metrics


# ─── 6 · PPO (RL) ───
def train_ppo():
    print("\n[6/6] RL/PPO · stable-baselines3 on CartPole-v1 (toy reference)")
    out = REF / "reinforcement-learning"; out.mkdir(parents=True, exist_ok=True)
    try:
        import gymnasium as gym
        from stable_baselines3 import PPO
    except ImportError:
        print("  ⚠ stable-baselines3 not installed · honest skip"); return None
    env = gym.make("CartPole-v1")
    model = PPO("MlpPolicy", env, verbose=0)
    model.learn(total_timesteps=10000)
    rewards = []
    for _ in range(10):
        obs, _ = env.reset()
        total = 0
        done = False; trunc = False
        while not (done or trunc):
            action, _ = model.predict(obs, deterministic=True)
            obs, r, done, trunc, _ = env.step(action)
            total += r
        rewards.append(total)
    mean_r = float(np.mean(rewards))
    model.save(str(out / "ppo_cartpole.zip"))
    metrics = {**stamp(), "technique": "reinforcement-learning",
                "method": "PPO · MlpPolicy", "env": "CartPole-v1",
                "n_timesteps": 10000, "n_test_episodes": 10,
                "mean_episode_reward": round(mean_r, 2),
                "max_possible": 500, "passes_solve_threshold": mean_r >= 195,
                "data_source": "Toy reference env (no real RL data exists yet)"}
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"  mean reward: {mean_r:.2f}  passes_solved: {mean_r >= 195}")
    return metrics


def main():
    print(f"\n[§140] Train 6 reference models · {datetime.now()}")
    print("=" * 75)
    results = {}
    for name, fn in [("time-series", train_time_series),
                       ("rnn-lstm", train_lstm),
                       ("vae", train_vae),
                       ("gan", train_gan),
                       ("transformer", train_transformer),
                       ("reinforcement-learning", train_ppo)]:
        try:
            results[name] = fn()
        except Exception as e:
            print(f"  ✗ {name} failed: {str(e)[:120]}")
            results[name] = {"error": str(e)[:120], "spec": "§140"}

    summary = {
        "computed_at": datetime.now().isoformat(),
        "n_techniques_attempted": 6,
        "n_succeeded": sum(1 for v in results.values() if v and "error" not in v),
        "by_technique": results,
        "spec": "§140 reference impl training",
    }
    (REF / "summary.json").write_text(json.dumps(summary, indent=2))
    print(f"\n  ━━━ SUMMARY ━━━")
    print(f"  {summary['n_succeeded']}/{summary['n_techniques_attempted']} reference models trained")


if __name__ == "__main__":
    main()
