# validation_log.md — append-only test/build/runtime evidence

format: `<TS> | <task> | <command> | <result>`

2026-06-02T05:16Z | sql-extract       | bash scripts/fix_all_runner.sh move-sql       | 0 violations (was 6)
2026-06-02T05:16Z | sql-extract       | bash scripts/pending_tasks_runner.sh boot     | BOOT_OK routes=177
2026-06-02T05:13Z | opa-rego-fix      | docker run opa test /policies                  | 8/8 PASS (was 5/8)
2026-06-02T05:10Z | pytest-importlib  | pytest --collect-only tests/                  | 304 tests collected (was 0)
2026-06-02T05:20Z | bot-daemon        | curl http://localhost:8001/bot/health         | status=ok chunks=600 graph=786
2026-06-02T04:33Z | doctor            | bash ~/.claude/scripts/insur-final.sh doctor  | 83/83 ok
2026-06-02T04:17Z | fix-all           | bash ~/.claude/scripts/insur-fix-all.sh all   | 14/14 OK
2026-06-02T04:00Z | drill-council-hitl| python tests/drills/drill_council_and_hitl.py | 19/19 PASS (15 pos · 4 neg)
2026-06-02T04:00Z | drill-dept-art    | python tests/drills/drill_insurance_dept_artifacts.py | 25/25 PASS
2026-06-02T01:30Z | e2e-demo          | python scripts/end_to_end_demo.py             | R²=0.8795 · 600 chunks · 786 nodes
