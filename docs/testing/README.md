# docs/testing/

Canonical testing references for HOLY Beverage.

| File | Purpose |
|---|---|
| [MASTER_TESTING_MATRIX.md](MASTER_TESTING_MATRIX.md) | 50+ testing areas × open-source tool catalog; backs the §64.30 12-tier per-dept policy with concrete tool choices. |
| [OPEN_SOURCE_TESTING_ECOSYSTEM.md](OPEN_SOURCE_TESTING_ECOSYSTEM.md) | Complete open-source testing ecosystem with repo status and adoption order. |
| [ENTERPRISE_AI_TESTING_LANDSCAPE.md](ENTERPRISE_AI_TESTING_LANDSCAPE.md) | Modern enterprise AI-native testing pyramid, architecture, missed gaps, and top 1% stack. |
| [GLOBAL_PROCESS_TESTING_POLICY.md](GLOBAL_PROCESS_TESTING_POLICY.md) | Global policy to test every department process/subprocess with agents, cron schedules, evidence, and gates. |
| [PROCESS_AGENT_CRON_CATALOG.md](PROCESS_AGENT_CRON_CATALOG.md) | Human-readable summary of generated per-process agent and cron assignments. |
| [PROCESS_AGENT_CRON_CATALOG.json](PROCESS_AGENT_CRON_CATALOG.json) | Machine-readable per-process agent, subprocess, and cron catalog. |
| [PROCESS_TESTING_DIAGRAMS.md](PROCESS_TESTING_DIAGRAMS.md) | Graphs, flowcharts, pipeline, cron scheduling, and agent assignment diagrams for global process testing. |

## How to use

- **Setting up a new dept's `tests/<dept>/<tier>/`** → consult §1 of the matrix, pick a tool from §2, cite it in the tier's local README.
- **Adding a new tool** → file a 40-row review per global §52 under `docs/architecture/tool-reviews/`, then add a row to §1 of the matrix.
- **Audit gap discovery** → cross-check §6 (the "AI teams miss this" gap list) against the dept's current coverage.

## Composes with

- Global CLAUDE.md §64.30 (12-tier per-dept testing policy)
- Global CLAUDE.md §43 (drill testing pattern)
- Global CLAUDE.md §47 (architecture & design patterns)
- Global CLAUDE.md §52 (40-row brutal tool review)
