"""/api/v1/vllm/* · Iter 90 · vLLM Stage-1 adapter (high-throughput inference)."""
import httpx
from fastapi import APIRouter
from _adapter_helpers import stamp, configured_when, env_config, scaffold_note

router = APIRouter(prefix="/api/v1/vllm", tags=["vllm"])
ENV_KEY = "VLLM_URL"

@router.get("/health")
def health():
    url = env_config(ENV_KEY, "http://localhost:8000")
    live = False
    if configured_when(ENV_KEY):
        try: live = httpx.get(f"{url}/health", timeout=2).status_code == 200
        except: live = False
    return {**stamp(), "module": "vllm-adapter", "vendor": "vLLM (Apache 2.0 · OSS)",
            "configured": configured_when(ENV_KEY), "live_at": url if live else None,
            "scaffold_note": None if live else scaffold_note(ENV_KEY, "vLLM"),
            "fallback": "Ollama (Iter 87 · LLM Gateway primary)",
            "capabilities": ["PagedAttention KV cache", "continuous batching",
                             "OpenAI-compatible API", "multi-LoRA serving",
                             "/metrics for Prometheus scrape"],
            "spec": "§56 Stage-1 · §57.7 honest · 5-10x throughput vs Ollama at scale"}

@router.get("/metrics")
def metrics():
    if configured_when(ENV_KEY):
        try:
            url = env_config(ENV_KEY)
            r = httpx.get(f"{url}/metrics", timeout=5)
            if r.status_code == 200:
                # Parse key Prometheus metrics
                text = r.text
                key_metrics = {}
                for line in text.split("\n"):
                    if line.startswith("vllm:"):
                        parts = line.split()
                        if len(parts) >= 2:
                            key_metrics[parts[0]] = parts[1]
                return {**stamp(), "status": "live", "raw_size_bytes": len(text),
                        "key_metrics": key_metrics}
        except Exception as e:
            return {**stamp(), "status": "error", "error": str(e)[:200]}
    # Scaffold · point at Ollama
    try:
        from os import environ
        oh = environ.get("OLLAMA_HOST", "http://localhost:11434")
        r = httpx.get(f"{oh}/api/tags", timeout=2)
        installed = len(r.json().get("models", [])) if r.status_code == 200 else 0
    except: installed = 0
    return {**stamp(), "status": "scaffold",
            "fallback": "Ollama metrics proxy",
            "ollama_models_available": installed,
            "vllm_metrics_when_live": [
                "vllm:num_requests_running",
                "vllm:num_requests_waiting",
                "vllm:num_requests_swapped",
                "vllm:cpu_cache_usage_perc",
                "vllm:gpu_cache_usage_perc",
                "vllm:time_to_first_token_seconds",
                "vllm:time_per_output_token_seconds",
                "vllm:e2e_request_latency_seconds",
                "vllm:request_prompt_tokens",
                "vllm:request_generation_tokens",
            ]}

@router.get("/config-example")
def config_example():
    return {**stamp(), "vendor": "vLLM",
            "setup_steps": [
                "1. pip install vllm",
                "2. python -m vllm.entrypoints.openai.api_server --model meta-llama/Llama-3.1-8B-Instruct",
                "3. export VLLM_URL=http://localhost:8000",
                "4. Configure Prometheus to scrape :8000/metrics",
                "5. (Optional) Add Grafana dashboard from vllm-project/vllm-dashboards"],
            "oss_url": "https://github.com/vllm-project/vllm",
            "when_to_use": "Production inference at 100+ req/s · multi-GPU · LoRA serving",
            "vs_ollama": "Ollama easier for dev; vLLM 5-10x throughput at scale"}
