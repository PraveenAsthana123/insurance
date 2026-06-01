# Missing Global Policies Checklist

Use this list to harden any project that adopts the agent platform.

| Policy | Status | Purpose |
|---|---|---|
| Agent approval policy | Created | Approve every request and next-agent handoff. |
| Claude/Codex handoff policy | Created | Keep multi-agent work coordinated. |
| MCP monitoring policy | Created | Track MCP capability, health, auth, and risk. |
| Global agent service policy | Created | Let other projects access OpenClaw/Paperclip/Ollama safely. |
| Secret handling policy | Needed | Define vault use, redaction, and no-secret prompt rules. |
| Data retention policy | Needed | Define artifact TTL, Paperclip retention, logs, and deletion. |
| Human approval workflow policy | Needed | Define who can approve high-risk actions and escalation. |
| Incident response policy | Needed | Define Error Agent ownership, rollback, and communication. |
| Model governance policy | Needed | Define model versioning, evals, rollback, and drift monitoring. |
| Cost governance policy | Needed | Define token/GPU/agent-count budgets and alerts. |
| Tenant isolation policy | Needed | Define workspace/user/customer isolation rules. |
| Deployment/change policy | Needed | Define promotion gates, change windows, and rollback. |
| Browser/CUA safety policy | Needed | Define allowlists, session recording, screenshots, and blocked actions. |
| Memory management policy | Needed | Define short-term, long-term, semantic, and audit memory boundaries. |
