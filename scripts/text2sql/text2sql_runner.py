"""§141 · Text-to-SQL runner · 100% real Postgres + Ollama small LLM.

Pipeline:
  Natural language Q → Ollama llama3.2:1b → SQL → Postgres → Result + audit row
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import psycopg2
import requests

R = Path("/mnt/deepa/insur_project")
OUT = R / "data/text2sql"
OUT.mkdir(parents=True, exist_ok=True)
OLLAMA_URL = os.environ.get("OLLAMA_HOST", "http://localhost:11434")


# Schema introspection · honest source
def schema_summary(table_filter=None) -> str:
    conn = psycopg2.connect(host="localhost", port=5434, user="insur_user",
                             password="insur_secret_password", dbname="insur_analytics")
    c = conn.cursor()
    c.execute("""
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name = ANY(%s)
        ORDER BY table_name, ordinal_position
    """, (table_filter or ['agent_invocation', 'claims_record', 'department', 'audit_log'],))
    rows = c.fetchall()
    conn.close()
    by_table = {}
    for t, col, ty in rows:
        by_table.setdefault(t, []).append(f"{col} {ty}")
    return "\n".join(
        f"TABLE {t} ({', '.join(cols)})" for t, cols in by_table.items()
    )


def run(question: str, model: str = "llama3.2:1b") -> dict:
    """Translate Q → SQL via Ollama · execute · return."""
    t0 = datetime.now()
    schema = schema_summary()
    prompt = f"""You are a SQL writer. Output ONLY valid SQL (no commentary).

SCHEMA:
{schema}

RULES:
- Use only the tables/columns above.
- Limit results to 50 rows max.
- For agent_invocation, use status='Success' filter for happy-path queries.
- Return ONLY a single SELECT statement. No DROP/UPDATE/DELETE/INSERT.

QUESTION: {question}

SQL:"""
    r = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False, "options": {"temperature": 0.1}},
        timeout=120,
    )
    if r.status_code != 200:
        return {"error": f"Ollama: {r.status_code}", "question": question}
    raw = r.json().get("response", "").strip()
    # Extract first SELECT
    sql = raw
    if "```" in sql:
        # strip code fences
        parts = sql.split("```")
        for p in parts:
            if "select" in p.lower():
                sql = p.strip().lstrip("sql").strip()
                break
    if "SELECT" not in sql.upper():
        return {"question": question, "raw_response": raw, "error": "No SELECT in response"}
    # Safety check: reject destructive verbs
    for bad in ["DROP", "DELETE", "UPDATE", "INSERT", "TRUNCATE", "ALTER"]:
        if bad in sql.upper():
            return {"question": question, "sql": sql,
                    "error": f"Rejected · destructive keyword {bad}"}
    # Execute
    try:
        conn = psycopg2.connect(host="localhost", port=5434, user="insur_user",
                                 password="insur_secret_password", dbname="insur_analytics")
        c = conn.cursor()
        c.execute(sql)
        rows = c.fetchall()[:50]
        cols = [d[0] for d in c.description]
        conn.close()
        result = [dict(zip(cols, [str(v) if v is not None else None for v in row])) for row in rows]
    except Exception as e:
        return {"question": question, "sql": sql, "error": str(e)[:160], "model": model}

    return {
        "question": question, "model": model,
        "generated_sql": sql,
        "n_rows": len(result),
        "result_sample": result[:5],
        "latency_ms": (datetime.now() - t0).total_seconds() * 1000,
        "ts_local": datetime.now().isoformat(),
        "spec": "§141 text2sql",
    }


# Demo set · runs against real DB
DEMOS = [
    "How many agent invocations are there in total?",
    "Count agent invocations by status.",
    "Top 5 agents by total invocations.",
    "Average duration_ms per status.",
    "How many claims_record rows exist?",
    "List 5 most recent agent invocations with their status.",
    "Sum of cost_usd across all agent_invocation rows.",
]


def main():
    print(f"\n[§141] Text2SQL demo · {datetime.now()}")
    print("=" * 70)
    results = []
    for q in DEMOS:
        print(f"\nQ: {q}")
        out = run(q)
        if "error" in out:
            print(f"  ✗ {out['error']}")
        else:
            print(f"  ✓ SQL: {out['generated_sql'][:100]}...")
            print(f"    rows: {out['n_rows']}  latency: {out['latency_ms']:.0f}ms")
        results.append(out)
    (OUT / "demo_runs.json").write_text(json.dumps(results, indent=2))
    n_ok = sum(1 for r in results if "error" not in r)
    print(f"\n  ━━━ {n_ok}/{len(DEMOS)} demos succeeded · saved to {OUT}/demo_runs.json ━━━")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        q = " ".join(sys.argv[1:])
        print(json.dumps(run(q), indent=2))
    else:
        main()
