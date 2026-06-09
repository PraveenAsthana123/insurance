# Enterprise AI Tool Landscape · Top 1% Architect Reference

> Operator brief 2026-06-08 · captured as permanent project reference.
> Implementation scaffold at `backend/ai_tool_registry/` + `frontend/src/pages/AIToolLandscapePage.jsx`.
> Composes with: §38 (governance) · §47 (architecture) · §52 (tool review) · §57.7 (honest stub) · §91 (WebLLM+CDP+RAG+LangGraph).

## Why This Doc

The set of tools that typically appear across **OpenAI · Anthropic · Databricks · NVIDIA · AWS · Microsoft · Google** and enterprise AI architecture interviews · captured as a single reference operator can browse via the AI Tool Landscape Page.

---

## Complete Enterprise AI Tool Landscape (25 layers)

| Layer | Current (project / default) | Other tools to know |
|---|---|---|
| OCR | PaddleOCR | Azure Document Intelligence · Google Document AI · Textract · Tesseract · OCRmyPDF |
| Parsing | Document Splitter | Docling · Unstructured · LlamaParse · Marker |
| Chunking | Recursive Splitter | RAPTOR · GraphRAG Chunking · Agentic Chunking · Late Chunking · Semantic Chunking |
| Tokenization | TikToken | SentencePiece · HuggingFace Tokenizers · WordPiece · BPE |
| Embedding | Mistral Embedding | VoyageAI · BGE-M3 · E5 · Cohere Embed · Jina Embedding · Instructor XL |
| Vector DB | ChromaDB | Qdrant · Pinecone · Weaviate · Milvus · Elasticsearch · pgvector |
| Cache | Query Cache | Redis · DragonflyDB · Momento · Hazelcast |
| Retrieval | Sentence Window | BM25 · Hybrid Search · GraphRAG · Agentic Search · HyDE |
| Reranking | MMR | BGE-Reranker · Cohere Rerank · ColBERT · Cross Encoder · Jina Reranker |
| Evaluation | RAG Evaluation | RAGAS · DeepEval · TruLens · G-Eval · Promptfoo · ARES · OpenAI Evals |
| Guardrails | Custom | NeMo Guardrails · Lakera · Rebuff · Llama Guard · Guardrails AI · ShieldGemma |
| Agent Framework | Multi-Agent | LangGraph · CrewAI · AutoGen · Semantic Kernel · PydanticAI · Google ADK · OpenAI Agents SDK · SmolAgents |
| Workflow | Custom | Temporal · Airflow · Prefect · Dagster · Camunda · Step Functions · Durable Functions |
| MCP | MCP | A2A · ACP · OpenAPI Tools · Function Calling |
| Memory | Custom | Mem0 · Zep · LangMem · Letta |
| Observability | CloudWatch | Langfuse · LangSmith · Phoenix · AgentOps · OpenTelemetry · Helicone · OpenLIT |
| Security | Custom | Presidio · Garak · Lakera · ProtectAI · HiddenLayer · NVIDIA NeMo Safety |
| Serving | vLLM | TGI · TensorRT-LLM · Triton · SGLang · Ollama · LMDeploy |
| Scaling | KubeRay | Ray Serve · KEDA · HPA · Istio |
| Deployment | Kubernetes | OpenShift · EKS · AKS · GKE |
| CI/CD | Manual | GitHub Actions · Harness · ArgoCD · Jenkins |
| Monitoring | CloudWatch | Prometheus · Grafana · Datadog · New Relic |
| AI Governance | — | Responsible AI Toolkit · MLflow Registry · DataHub · OPA · Temporal · Fairlearn · SHAP · LIME |
| API Gateway | — | Kong · NGINX · Istio |
| Feature Store | — | Feast · Tecton · Hopsworks |

---

## Missing Agent Ecosystem Tools

| Category | Tools |
|---|---|
| Agent Framework | LangGraph · CrewAI · AutoGen · Semantic Kernel |
| Agent Governance | Paperclip · Archon |
| Agent Communication | MCP · A2A · ACP |
| Agent IDE | OpenHands · Claude Code · Cursor · Windsurf |
| Agent Evaluation | AgentOps · Langfuse |
| Agent Memory | Mem0 · Letta · Zep |
| Agent Workflow | Temporal · LangGraph |

---

## Missing Multimodal Tools

| Category | Tools |
|---|---|
| OCR | PaddleOCR · Textract · Docling · Azure DI |
| VLM | GPT-4o · Gemini · Claude Vision · LLaVA · Qwen-VL |
| Image Embedding | CLIP · SigLIP |
| Video AI | Video-LLaVA · Qwen-VL |
| Audio AI | Whisper |
| Speech AI | Deepgram · AssemblyAI |
| TTS | ElevenLabs · XTTS · Bark · VALL-E |

---

## Missing Fine-Tuning Tools

| Category | Tools |
|---|---|
| Fine Tuning | Axolotl |
| Fast Fine Tuning | Unsloth |
| RLHF | TRL |
| DPO | TRL |
| Distributed Training | DeepSpeed |
| Sharding | FSDP |
| Large Scale Training | Megatron-LM |
| Experiment Tracking | MLflow · W&B |

---

## Missing Production Engineering Tools

| Category | Tool |
|---|---|
| API Gateway | Kong |
| API Gateway | NGINX |
| Service Mesh | Istio |
| Policy Engine | OPA |
| Secrets | Vault |
| Feature Store | Feast |
| Metadata Catalog | DataHub |
| Data Governance | Collibra |
| Lineage | OpenLineage |
| Chaos Testing | Litmus |
| Load Testing | K6 |
| Benchmarking | LLMPerf |

---

## Missing AI Security Tools

| Category | Tool |
|---|---|
| PII Detection | Presidio |
| AI Red Teaming | Garak |
| Prompt Injection | Lakera |
| Model Security | Protect AI |
| Runtime Security | Falco |
| Container Security | Trivy |
| Secret Scanning | Gitleaks |
| Vulnerability Scanning | Snyk |

---

## Missing Enterprise Governance Tools

| Category | Tool |
|---|---|
| AI Governance | Responsible AI Toolkit |
| Model Registry | MLflow |
| Data Catalog | DataHub |
| Policy Engine | OPA |
| Approval Workflow | Temporal |
| Risk Assessment | Fairlearn |
| Explainability | SHAP · LIME |

---

## Top 1% Architect Knowledge Map

| Phase | Must Know Tools |
|---|---|
| Data | Spark · Airflow · Kafka |
| OCR | Docling · PaddleOCR |
| Chunking | Semantic · RAPTOR · GraphRAG |
| Embedding | BGE-M3 · Voyage |
| Vector DB | Qdrant · Pinecone |
| Retrieval | Hybrid · HyDE · MMR |
| Agent | LangGraph · CrewAI |
| MCP | MCP · A2A |
| Memory | Mem0 · Zep |
| Evaluation | RAGAS · DeepEval |
| Guardrails | NeMo · Lakera |
| Security | Presidio · Garak |
| Observability | OTel · Langfuse |
| Workflow | Temporal |
| Serving | vLLM · TensorRT-LLM |
| Scaling | Ray · KubeRay |
| Deployment | Kubernetes · ArgoCD |
| Governance | OPA · MLflow |

---

## Enterprise Agentic AI / RAG Implementation Master Matrix

| Phase | Input | Process | Output | Tools | Evaluation | Common Issue |
|---|---|---|---|---|---|---|
| Data Creation | Files | Collect · Clean · Normalize | Raw Dataset | Python · Spark · Airflow | Data Quality | Missing Data |
| OCR | Scanned PDF | OCR Extraction | Text | Docling · PaddleOCR · Azure DI | OCR Accuracy | Poor Scan |
| Parsing | Text Docs | Structure Extract | Metadata + Content | Unstructured.io · LlamaParse | Parse Accuracy | Table Loss |
| Chunking | Parsed Content | Split | Chunks | Semantic · Recursive · Agentic | Recall | Context Loss |
| Tokenization | Chunks | Token Gen | Token IDs | TikToken · SentencePiece | Token Efficiency | Overflow |
| Embedding | Tokens | Vector Gen | Embeddings | BGE · OpenAI · E5 | Retrieval Accuracy | Poor Semantics |
| Vector Storage | Embeddings | Store | Index | Qdrant · Pinecone · Weaviate | Recall@K | Drift |
| Metadata Indexing | Metadata | Filter Index | Filters | Elasticsearch | Filter Accuracy | Missing Metadata |
| Cache Layer | Query | Semantic Match | Cached Response | Redis | Hit Rate | Stale |
| Query Understanding | User Query | Intent Detect | Structured Query | LLM | Intent Accuracy | Ambiguous |
| Pre-Retrieval | Query | Rewrite | Enhanced Query | HyDE · Expansion | Quality | Wrong Expansion |
| Retrieval | Enhanced Query | Vector Search | Candidates | Qdrant | Recall@K | Low Recall |
| Hybrid Search | Query | Vector + BM25 | Candidates | Elastic + Vector | NDCG | Ranking Issues |
| ReRanking | Candidates | Reorder | Top-K | BGE Reranker · Cohere | Precision@K | Latency |
| Post Retrieval | Results | Context Optim | Final Context | Compression | Relevance | Token Waste |
| Prompt Building | Context | Template Assembly | Final Prompt | LangChain | Quality | Drift |
| LLM Inference | Prompt | Reasoning | Response | GPT · Claude · Gemini · Llama | Accuracy | Hallucination |
| Tool Calling | Task | MCP Execution | Tool Results | MCP | Success | Failure |
| Agent Execution | Workflow | Multi-Agent Reasoning | Decision | LangGraph · CrewAI | Success | Loops |
| Verification | Response | Fact Check | Verified | Verifier Agent | Factuality | Hallucination |
| Guardrails | Response | Safety Validation | Safe Response | NeMo | Safety Score | False Positive |
| Output Evaluation | Response | Quality Assess | Scores | RAGAS · DeepEval · G-Eval | Quality | Poor Eval |
| Logging | System Events | Log Collection | Logs | ELK | Coverage | Missing Logs |
| Tracing | Requests | Distributed Trace | Trace Graph | OpenTelemetry | Completeness | Missing Spans |
| Monitoring | Metrics | Dashboarding | Insights | Grafana | SLA | Blind Spots |
| Security | User + System | Security Controls | Secure System | OPA · Presidio | Risk Score | Data Leakage |
| Deployment | Model | Production Release | Live Service | K8s · Helm | Uptime | Downtime |
| Inference Serving | Request | GPU Execution | Response | vLLM · TGI | TPS | GPU Bottleneck |
| Auto Scaling | Load | Scale Pods | Capacity | KEDA · HPA | Availability | Scale Delay |
| Disaster Recovery | Failure | Recovery | Restored Service | Backup + DR | RTO/RPO | Data Loss |

---

## Evaluation Framework Matrix

| Category | RAGAS | DeepEval | G-Eval |
|---|---|---|---|
| Faithfulness | ✅ | ✅ | ✅ |
| Context Precision | ✅ | ❌ | ❌ |
| Context Recall | ✅ | ❌ | ❌ |
| Answer Relevancy | ✅ | ✅ | ✅ |
| Hallucination Detection | Partial | ✅ | ✅ |
| Toxicity | ❌ | ✅ | ✅ |
| Bias Detection | ❌ | ✅ | Partial |
| Consistency | ❌ | ✅ | ✅ |
| Creativity | ❌ | ✅ | Partial |
| Custom Evaluation | Partial | ✅ | ✅ |

---

## Guardrails Implementation Matrix

| Layer | Controls | Tool |
|---|---|---|
| Input | Prompt Injection | NeMo Guardrails |
| Input | PII Detection | Presidio |
| Input | Toxic Content | Guardrails AI |
| Context | Retrieval Validation | Verifier Agent |
| Output | Hallucination Check | DeepEval |
| Output | Toxicity Check | DeepEval |
| Output | Bias Detection | Fairlearn |
| Tool | Tool Permissions | MCP RBAC |
| Agent | Agent Limits | LangGraph |
| Human Approval | HITL | Temporal |

---

## Security Framework Matrix

| Category | Controls |
|---|---|
| Authentication | OAuth2 · MFA |
| Authorization | RBAC · ABAC |
| Data Security | Encryption |
| API Security | Rate Limiting |
| LLM Security | Prompt Injection Detection |
| Model Security | Versioning |
| Infrastructure | Network Policies |
| Runtime | Falco |
| Audit Logging | ELK |
| Compliance | GDPR · HIPAA · SOC2 |

---

## Top 1% Enterprise AI Architect Stack

| Layer | Preferred Tool |
|---|---|
| Parsing | Docling |
| Chunking | Semantic + RAPTOR |
| Embedding | BGE-M3 |
| Vector DB | Qdrant |
| Retrieval | Hybrid + GraphRAG |
| Reranker | BGE-Reranker |
| Agents | LangGraph |
| Workflow | Temporal |
| MCP | MCP Protocol |
| LLM | GPT-4o + Claude + Gemini |
| Guardrails | NeMo + Lakera |
| Evaluation | RAGAS + DeepEval |
| Observability | Langfuse + Phoenix + OTel |
| Security | Presidio + Garak |
| Serving | vLLM |
| Deployment | Kubernetes |
| Governance | Archon + SpecKit + Harness |

---

## AI Architect Missing Topics (P1/P2/P3)

### P1 · MUST KNOW

FSDP · DeepSpeed ZeRO (1/2/3) · NCCL · RDMA / InfiniBand · Ray + vLLM · Foundation Model Training · ASR/TTS · Multimodal AI · AWS Bedrock · Vertex AI · Azure AI Foundry · AI Security · AI Evaluation · Cloud vs On-Prem · GPU Scheduling

### P2 · IMPORTANT

Diffusion Models (SDXL · Flux · Sora) · Mamba · State Space Models · Synthetic Data · RLHF / DPO · Video AI · Voice Cloning

### P3 · NICE TO KNOW

Custom Foundation Model Training · Advanced Robotics AI · Physical AI

---

## Tool Deep-Dives (Operator's brief)

### PolyAI · Enterprise Voice AI Platform

Voice-first customer service agents. Strong: Voice (10/10) · Contact Center (10/10) · Analytics (9/10). Weak: Multi-Agent (6/10) · Software Engineering (2/10).

**Select for**: contact-center transformation · omnichannel customer engagement · call automation. Combine with LangGraph for orchestration · MCP for tools · OpenTelemetry for tracing · Langfuse for observability.

### Polis · Collective Intelligence Platform

Large-scale opinion clustering · consensus discovery for thousands/millions of participants. Uses ML clustering + NLP + sentiment analysis. **NOT** an agent framework.

**Select for**: enterprise governance · employee engagement · policy discussions · AI governance programs.

### OpenClaw · Personal AI Assistant Platform

Open-source autonomous agent across email · calendars · files · web · APIs. Self-hosted personal assistant. Gateway + Reasoning + Memory + Skills + Scheduler + MCP.

**Select for**: personal automation · simple tool orchestration. **Combine with**: LangGraph + MCP + OpenTelemetry + OPA + Verifier/Human Approval for enterprise.

### Paperclip · Agent Organization Control Plane

Manages teams of AI agents as an organization. Defines goals · budgets · governance · org charts. CEO/Manager/Worker/QA/Finance agents.

**Select for**: multi-agent governance · agent workforce management · AI consulting orgs · software factories · customer support hierarchies.

### OpenHands (formerly OpenDevin) · Autonomous Coding Agent

Open-source AI software engineer. Planner + Coding + Execution + Browser + File + Git + QA + Verifier agents. Terminal access + browser automation + multi-step planning.

**Select for**: autonomous code generation. **Wrap with**: SpecKit specs · Archon knowledge · Harness quality gates · OPA security · OTel observability · human approval.

### Harness · AI-Native Software Delivery Platform

Evolving from CI/CD into AI agent-driven testing · code review · deployment validation · incident analysis. 12 agent types: Requirement · Test Generation · QA · Code Review · Security · Deployment · SRE · Incident · Observability · Cost · Compliance · Developer.

**Select for**: AI test automation · DevOps automation · governance pipeline.

---

## Marketing AI Maturity Model (6 levels)

| Level | Stage | Characteristics |
|---|---|---|
| L1 | Manual Marketing | Human-driven campaigns |
| L2 | Automated Marketing | Scheduled campaigns |
| L3 | AI Assisted Marketing | AI recommendations |
| L4 | Predictive Marketing | AI forecasts outcomes |
| L5 | Autonomous Marketing | AI executes campaigns |
| L6 | Self-Optimizing | AI continuously improves itself |

> **insur_project state**: L2-L3 (per `docs/MARKETING_KPI_FRAMEWORK.md`).

---

## Cloud AI Services

| Cloud | Service | Purpose |
|---|---|---|
| AWS | Bedrock | Managed Foundation Models |
| AWS | SageMaker | Training & Deployment |
| Azure | AI Foundry | AI Platform |
| Azure | Azure OpenAI | Managed GPT |
| GCP | Vertex AI | End-to-End AI |
| GCP | Model Garden | Foundation Models |

---

## Distributed Training Architecture

| Technique | Purpose | Source |
|---|---|---|
| DDP | Data Parallel | PyTorch |
| FSDP | Fully Sharded | PyTorch |
| ZeRO-1 | Optimizer Sharding | DeepSpeed |
| ZeRO-2 | Gradient Sharding | DeepSpeed |
| ZeRO-3 | Full Sharding | DeepSpeed |
| QLoRA | Quantized LoRA FT | PEFT |
| LoRA | Parameter-Efficient FT | PEFT |
| Axolotl | Training Framework | Axolotl |
| Unsloth | Fast Fine-Tuning | Unsloth |
| Megatron-LM | Large Scale Training | NVIDIA |

Communication layer: **NCCL** (GPU) · **RDMA** (Low Latency) · **InfiniBand** (High Speed) · **MPI** (Distributed Computing).

---

## Distributed Inference Architecture

```
Load Balancer → Head Node → RabbitMQ → Worker Nodes → vLLM → GPU
```

| Layer | Tool | Purpose |
|---|---|---|
| Queue | RabbitMQ | Batch Distribution |
| Cluster | Ray | Distributed Execution |
| Serving | vLLM | Inference |
| GPU Mgmt | Ray Serve | GPU Scheduling |
| Model Store | S3 / GCS | Model Storage |
| Monitoring | OpenTelemetry | Tracing |
| Metrics | Prometheus | Monitoring |
| Dashboard | Grafana | Visualization |

---

## On-Prem Deployment Evolution

| Level | Stage |
|---|---|
| L1 | Single VM · CPU Only |
| L2 | Single VM · Single GPU |
| L3 | Single VM · Docker · Multiple Containers |
| L4 | Kubernetes · Multi GPU · Multi Node |

---

## Composes With (this project)

- §38 (governance) — tool registry feeds the per-decision audit row
- §47 (architecture) — tool list informs §47 7-surface choice
- §52 (brutal tool review) — the 40-row checklist applies to every tool here
- §57.7 (honest stub) — tools the project DOES NOT use are flagged 'reference-only'
- §70 (cron audit) — tool drift detection via category counts
- §75 (per-process metrics) — each tool category produces metrics
- §76 (RAI) — Guardrails + Security tools are mandatory per §76
- §91 (WebLLM+CDP+RAG+LangGraph) — the canonical browser-native stack
- §92 (ai-agents/) — 50-tool mandate maps to this catalog

---

## Implementation Status (live · per this project)

| Tool / Category | Status | Reference |
|---|---|---|
| FastAPI (API framework) | ✓ Used | backend modules |
| Pydantic (schemas) | ✓ Used | every router |
| PostgreSQL (RDBMS) | ✓ Used | 12 tables |
| OpenTelemetry (tracing) | 🟡 Partial | core/middleware |
| MCP (tool protocol) | 🟡 Scaffolded | webllm_cdp_rag_langgraph/ |
| WebLLM (browser LLM) | 🟡 Scaffolded | webllm_cdp_rag_langgraph/ |
| CDP (Chrome DevTools Protocol) | 🟡 Scaffolded | webllm_cdp_rag_langgraph/ |
| LangGraph (agent workflow) | 🟡 Scaffolded | webllm_cdp_rag_langgraph/ |
| Autonomous agent (rule-based) | ✓ Used | marketing_campaigns/autonomous_agent.py |
| Drift / DLP (security) | ✓ Used | services.\_dlp_scan |
| RAGAS / DeepEval / G-Eval | ⏳ Planned | Tier 5/T6 |
| Qdrant · Pinecone · Weaviate | ⏳ Planned | T6.x |
| Docling · LlamaParse · Unstructured | ⏳ Planned | T6.x |
| BGE-M3 / Voyage / Cohere | ⏳ Planned | T6.x |
| Temporal · Airflow · Prefect | ⏳ Planned | replace cron eventually |
| Langfuse · Phoenix · AgentOps | ⏳ Planned | extend §38.3 audit row |
| Garak · Lakera · Presidio | ⏳ Planned | T6.x security gates |
| vLLM · TGI · TensorRT-LLM | ⏳ Planned | T6.x serving |
| KubeRay · Kubernetes | ⏳ Planned | T6.x deploy |
