"""§21 + §37 · MANDATORY · Ingest operator prompts from Claude JSONL → Postgres.

Reads: ~/.claude/projects/-mnt-deepa-insur-project/*.jsonl
Writes: operator_prompt table (created if missing)
"""
import json
import os
import psycopg2
import psycopg2.extras
from datetime import datetime
from pathlib import Path
from glob import glob


def main():
    conn = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                             password='insur_secret_password', dbname='insur_analytics')
    c = conn.cursor()
    # Create table per §21 contract
    c.execute("""
        CREATE TABLE IF NOT EXISTS operator_prompt (
            prompt_id BIGSERIAL PRIMARY KEY,
            session_id VARCHAR(64),
            ts TIMESTAMPTZ,
            actor VARCHAR(64) DEFAULT 'operator',
            prompt_text TEXT,
            n_chars INT,
            transcript_path TEXT,
            tenant_id VARCHAR(64) DEFAULT 'default',
            ingested_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_op_prompt_ts ON operator_prompt(ts);
        CREATE INDEX IF NOT EXISTS idx_op_prompt_session ON operator_prompt(session_id);
    """)
    conn.commit()

    jsonl_paths = sorted(glob(
        '/home/praveen/.claude/projects/-mnt-deepa-insur-project/*.jsonl'))
    total_inserted = 0
    for fp in jsonl_paths:
        session_id = Path(fp).stem
        # Skip already-ingested (check max ts for this session)
        c.execute("SELECT MAX(ts) FROM operator_prompt WHERE session_id=%s", (session_id,))
        last_ts = c.fetchone()[0]
        n_inserted_this_session = 0

        with open(fp, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except Exception:
                    continue
                # Claude transcripts emit user messages as type=user with message.content
                if row.get('type') != 'user':
                    continue
                ts_str = row.get('timestamp') or row.get('created_at')
                if not ts_str:
                    continue
                try:
                    ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                except Exception:
                    continue
                if last_ts and ts.replace(tzinfo=None) <= last_ts.replace(tzinfo=None):
                    continue
                # Extract text
                content = row.get('message', {}).get('content', '')
                if isinstance(content, list):
                    text_parts = [b.get('text', '') for b in content if b.get('type') == 'text']
                    text = '\n'.join(p for p in text_parts if p)
                elif isinstance(content, str):
                    text = content
                else:
                    text = ''
                text = text.strip()
                if not text or text.startswith('<') and 'system' in text[:50].lower():
                    continue
                c.execute("""
                    INSERT INTO operator_prompt
                      (session_id, ts, prompt_text, n_chars, transcript_path)
                    VALUES (%s, %s, %s, %s, %s)
                """, (session_id, ts, text[:50000], len(text), fp))
                n_inserted_this_session += 1
                total_inserted += 1
        if n_inserted_this_session:
            print(f"  {Path(fp).name[:40]:<42} inserted {n_inserted_this_session}")
        conn.commit()

    # Summary
    c.execute("SELECT COUNT(*), MIN(ts), MAX(ts) FROM operator_prompt")
    n, mn, mx = c.fetchone()
    c.execute("SELECT COUNT(*) FROM operator_prompt WHERE ts > NOW() - INTERVAL '48 hours'")
    n_48h = c.fetchone()[0]
    print(f"\n  TOTAL inserted this run: {total_inserted}")
    print(f"  TOTAL in operator_prompt: {n} (last 48h: {n_48h})")
    print(f"  Span: {mn} → {mx}")
    conn.close()


if __name__ == "__main__":
    main()
