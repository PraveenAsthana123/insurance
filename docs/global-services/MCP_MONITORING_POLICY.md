# MCP Monitoring Policy

This policy defines how to identify, monitor, and integrate MCP servers/tools for the agent platform.

## MCP Categories To Track

| Category | Examples | Required Monitor |
|---|---|---|
| Workspace/filesystem | repo files, patches, local images | allowed roots, write scope, destructive command guard |
| Web/search | current facts, docs, citations | source freshness, citation policy, copyright limits |
| OpenClaw | task submission and polling | `/api/v1/openclaw/status`, queue length, result schema |
| Paperclip | context artifacts | `/api/v1/paperclip/status`, artifact count, retention, PII redaction |
| Agent Platform | policy and CUA dry-run | `/api/v1/agent-platform/status`, governance decisions |
| Ollama/Kivi | local model service | `setup_kivi_model.py --check-only`, `/api/tags`, latency |
| Stagehand/CUA | browser/computer-use | dry-run status, target allowlist, session audit |
| Calendar/email/chat connectors | Gmail, Outlook, Slack, Teams | connector installation, auth scope, approval gate |
| Code hosting | GitHub | repo permission, PR/issue action audit |

## How To Monitor MCP Health

Minimum local commands:

```bash
./scripts/setup_agent_platform.py status
./scripts/agent_fleet.sh supervisor-health
./scripts/agent_fleet.sh supervisor-report
./scripts/setup_kivi_model.py --check-only
```

UI monitor:

```text
/agent-supervisor
```

The UI shows the MCP/tool registry, working-local/dry-run status, risk notes, and approval flow simulation.

## Integration Gate For New MCP Server

A new MCP server may be integrated only after documenting:

- name and owner
- capability list
- read/write/destructive operations
- auth method
- secrets required
- RBAC role mapping
- approval requirements
- audit fields
- health check command or endpoint
- fallback behavior
- tests

## Missing MCP Candidates

Potential future integrations:

- GitHub connector for PR/issue/CI workflows
- Slack or Teams connector for incident approvals
- Google Drive/SharePoint for policy/document corpus
- Calendar connector for approval windows and change windows
- Notion/Linear for task and governance tracking
- OPA/Kyverno policy server
- Prometheus/Grafana/Jaeger observability MCP
- Vector DB / graph DB / ontology MCP
- Kubernetes MCP for cluster state
- Vault/secret-manager MCP

Do not install or enable a connector without explicit user approval and a documented auth scope.
