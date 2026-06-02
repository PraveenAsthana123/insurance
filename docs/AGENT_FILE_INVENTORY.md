# Agent File Inventory

## `agents/agent.py`

- layer: orchestration/worker
- business logic gist: one-shot worker that pulls simple tasks from Redis, calls Ollama once, and stores result in Redis.
- input: Redis `tasks` list with JSON task objects.
- process: `main()` blocks on `BRPOP`; `call_ollama()` invokes `/api/generate` with configured model.
- output: Redis `done` list with task ID, agent ID, prompt preview, response/error, duration, token count.
- upstream: `agents/seeder.py`, future API/gateway, or workflow harness.
- downstream: Ollama, Redis `done`, debugging tools/UI.
- production gap: no typed task contract, no dead-letter queue, no JSON structured logs, no retry policy.

## `agents/council_agent.py`

- layer: orchestration/worker plus council policy POC
- business logic gist: three-stage author/reviewer/chair council for harder prompts.
- input: Redis `council_tasks` list with department and prompt.
- process: `run_council()` calls author model, reviewer model, then chair model; each stage uses `call_ollama()`.
- output: Redis `council_done` list with full audit trail.
- upstream: `backend/routers/insur.py` council ask endpoint or `agents/council_seeder.py`.
- downstream: Ollama, Redis `council_done`, `GET /api/v1/insur/council/result/{task_id}`.
- production gap: policy and adapters are in one file; should split into domain policy, model adapter, queue adapter, audit adapter.

## `agents/seeder.py`

- layer: harness/test data
- business logic gist: seeds N simple department prompts to the Redis `tasks` queue.
- input: CLI argument N, default 100.
- process: randomly selects prompt templates and writes JSON tasks.
- output: Redis `tasks` queue populated; old `tasks` and `done` are cleared.
- warning: destructive for demo queues because it clears old state.

## `agents/council_seeder.py`

- layer: harness/test data
- business logic gist: seeds N council-grade tasks into Redis `council_tasks`.
- input: CLI argument N, default 10.
- process: randomly selects harder prompts that benefit from review.
- output: Redis `council_tasks` queue populated; old `council_tasks` and `council_done` are cleared.
- warning: destructive for council queues because it clears old state.

## `agents/Dockerfile`

- layer: runtime packaging
- business logic gist: container runtime for worker scripts.
- input: source files and `agents/requirements.txt`.
- process: install Python dependencies and run configured command.
- output: runnable Docker image for `agents` and `council_agents` services.

## `agents/requirements.txt`

- layer: runtime dependency manifest
- dependencies: `redis`, `httpx`.
- reason: Redis queue access and HTTP calls to Ollama.
