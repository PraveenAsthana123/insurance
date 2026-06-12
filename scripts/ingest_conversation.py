"""§145 MANDATORY · Conversation turn ingester.

Captures BOTH operator prompts AND assistant responses from Claude JSONL transcript.
Stores: conversation_turn table · per-turn timestamp · session_id · role (user/assistant)
"""
import json
import psycopg2
from datetime import datetime
from pathlib import Path
from glob import glob


def text_from_content(content):
    if isinstance(content, list):
        out = []
        for b in content:
            t = b.get('type')
            if t == 'text':
                out.append(b.get('text', ''))
            elif t == 'tool_use':
                tn = b.get('name', '?')
                out.append(f"[tool: {tn}]")
            elif t == 'tool_result':
                tr = b.get('content', '')
                if isinstance(tr, list):
                    tr = '\n'.join(x.get('text', '') for x in tr if x.get('type') == 'text')
                out.append(f"[tool_result] {str(tr)[:500]}")
        return '\n'.join(p for p in out if p).strip()
    if isinstance(content, str):
        return content.strip()
    return ''


def main():
    conn = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                             password='insur_secret_password', dbname='insur_analytics')
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS conversation_turn (
            turn_id BIGSERIAL PRIMARY KEY,
            session_id VARCHAR(64),
            ts TIMESTAMPTZ,
            role VARCHAR(16),
            text_content TEXT,
            n_chars INT,
            transcript_path TEXT,
            tenant_id VARCHAR(64) DEFAULT 'default',
            ingested_at TIMESTAMPTZ DEFAULT NOW()
        )""")
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_conv_turn_ts ON conversation_turn(ts);
        CREATE INDEX IF NOT EXISTS idx_conv_turn_session ON conversation_turn(session_id);
        CREATE INDEX IF NOT EXISTS idx_conv_turn_role ON conversation_turn(role);
    """)
    conn.commit()

    jsonl_paths = sorted(glob('/home/praveen/.claude/projects/-mnt-deepa-insur-project/*.jsonl'))
    total = 0
    for fp in jsonl_paths:
        session_id = Path(fp).stem
        c.execute("SELECT MAX(ts) FROM conversation_turn WHERE session_id=%s", (session_id,))
        last_ts = c.fetchone()[0]
        n_this_session = 0
        with open(fp, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except Exception:
                    continue
                role = row.get('type')
                if role not in ('user', 'assistant'):
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
                msg = row.get('message', {})
                content = msg.get('content', '')
                text = text_from_content(content)
                if not text:
                    continue
                # Skip system-reminder noise
                if text.startswith('<system-reminder>') or text.startswith('<'):
                    if 'system' in text[:80].lower():
                        continue
                c.execute("""INSERT INTO conversation_turn
                              (session_id, ts, role, text_content, n_chars, transcript_path)
                              VALUES (%s, %s, %s, %s, %s, %s)""",
                          (session_id, ts, role, text[:50000], len(text), fp))
                n_this_session += 1
                total += 1
        conn.commit()
        if n_this_session:
            print(f"  {Path(fp).name[:40]:<42} inserted {n_this_session}")

    c.execute("SELECT COUNT(*), COUNT(*) FILTER (WHERE role='user'), COUNT(*) FILTER (WHERE role='assistant') FROM conversation_turn")
    n, n_u, n_a = c.fetchone()
    c.execute("SELECT COUNT(*) FROM conversation_turn WHERE ts > NOW() - INTERVAL '48 hours'")
    n_48h = c.fetchone()[0]
    print(f"\n  THIS RUN: +{total}")
    print(f"  TOTAL conversation_turn: {n}  (user: {n_u} · assistant: {n_a})")
    print(f"  Last 48h: {n_48h}")
    conn.close()
    return total


if __name__ == "__main__":
    main()
