# Global Agent Approval Policy

This policy applies to Claude, Codex, local agents, OpenClaw, Paperclip, PoliysAI, CUA, Stagehand, Playwright, MCP tools, and any future agent runtime.

## Mandatory Approval Chain

Every request must move through this chain:

```text
User/API/Event request
  -> Approval Agent: initial allow/deny/needs-info decision
  -> Search Agent: context, repo, MCP, policy, prior-work lookup
  -> Approval Agent: approve next-agent handoff
  -> Reviewer Agent: plan/risk/test acceptance review
  -> Approval Agent: approve execution scope
  -> Code/Execution Agent: perform approved work only
  -> Error Agent: handle failures, retries, rollback decisions
  -> Memory Agent: store approved summary and handoff state
  -> Reviewer Agent: post-execution review
  -> Approval Agent: approve next request or close workflow
```

No agent may call tools, edit files, execute browser actions, run shell commands, deploy, or submit downstream tasks unless the Approval Agent has approved that phase.

## Agent Roles

| Agent | Responsibility | Blocks When |
|---|---|---|
| Approval Agent | Approves each request and each next-agent handoff. | Risk unknown, role invalid, scope too broad, missing evidence. |
| Search Agent | Finds repo context, MCP capabilities, docs, policies, and prior decisions. | Source not found, stale data risk, missing MCP status. |
| Reviewer Agent | Reviews plan, scope, output quality, tests, and policy fit. | No tests, weak acceptance criteria, unsafe side effect. |
| Code Agent | Implements approved file/code/doc changes. | Approval missing or write scope changed. |
| Advisor Agent | Explains architecture, tradeoffs, and missing policy. | Decision needs human or domain owner. |
| Error Agent | Classifies failures and creates recovery path. | Retry storm, destructive recovery, unknown state. |
| Memory Agent | Stores approved summaries and handoff state. | Secrets, raw PII, unapproved memory retention. |
| MCP Agent | Validates MCP/tool availability and monitors capability status. | Tool unavailable, permission missing, connector untrusted. |

## Approval Decision Values

- `allow`: request can move to the named next agent.
- `deny`: request cannot proceed.
- `require_human_approval`: human must approve before execution.
- `needs_context`: Search Agent must gather more evidence.
- `blocked`: system state prevents safe execution.

## Required Approval Record

Every approval record must include:

- request id
- user or service role
- current agent
- next agent
- requested action
- tool or MCP server
- risk level
- policy decision
- reason
- evidence links or artifacts
- timestamp
- correlation id

## Side-Effect Rules

Real side effects require explicit approval:

- file writes
- shell commands
- browser/CUA clicks, form fills, navigation with auth
- database writes
- deployment
- secrets access
- external API calls that mutate state
- task submission to other agents

Dry-run actions may proceed with lower approval but must still be logged.

## Next-Request Approval

After a request completes, the Approval Agent must decide whether the next request can start. The next request is blocked until:

- post-execution reviewer status is complete
- test or validation evidence exists
- memory summary is stored
- errors are closed or assigned
- MCP/tool status is current


## Approval Broker Endpoint

HOLY exposes `POST /api/v1/agent-platform/approval-broker/decide` for local approve/submit/next automation. It can auto-approve low-risk local work and submit safe next tasks to OpenClaw, but it must return `require_human_approval` or `deny` for production, secrets, deploy, destructive, real browser/CUA, GitHub admin/auth, database migration, or external SaaS write scopes.
