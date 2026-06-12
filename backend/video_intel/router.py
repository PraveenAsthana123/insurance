"""/api/v1/video-intel/* · §128 · Iter 110 · Enterprise Video Intelligence Pipeline."""
from __future__ import annotations

import base64
import hashlib
import os
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from _adapter_helpers import stamp

router = APIRouter(prefix="/api/v1/video-intel", tags=["video-intel"])


# ════════════════ TOOL CATALOG (50+ across 9 categories) ════════════════
TOOL_CATALOG = {
    "1_video_to_frames": [
        {"tool": "FFmpeg",          "purpose": "Extract frames · industry standard"},
        {"tool": "OpenCV",          "purpose": "Frame processing · Python"},
        {"tool": "PySceneDetect",   "purpose": "Scene detection · avoid duplicates"},
        {"tool": "MoviePy",         "purpose": "Video manipulation · easy scripting"},
    ],
    "2_ocr": [
        {"tool": "PaddleOCR",       "purpose": "Enterprise OCR · tables · handwriting", "recommended": True},
        {"tool": "Tesseract",       "purpose": "Documents · classic"},
        {"tool": "EasyOCR",         "purpose": "Multi-language"},
        {"tool": "OCRmyPDF",        "purpose": "PDFs"},
        {"tool": "TrOCR",           "purpose": "Handwriting transformer"},
    ],
    "3_vision_llm": [
        {"tool": "Qwen2.5-VL",      "purpose": "Image + video understanding", "recommended": True},
        {"tool": "LLaVA",           "purpose": "Image VQA"},
        {"tool": "InternVL",        "purpose": "Multi-modal"},
        {"tool": "MiniCPM-V",       "purpose": "Lightweight VLM"},
        {"tool": "Phi-3 Vision",    "purpose": "Microsoft VLM"},
        {"tool": "Molmo",           "purpose": "Open SOTA VLM"},
    ],
    "4_video_understanding": [
        {"tool": "Video-LLaMA 3",   "purpose": "Video QA"},
        {"tool": "LLaVA-NeXT Video","purpose": "Video reasoning"},
        {"tool": "Qwen2.5-VL",      "purpose": "Video understanding"},
        {"tool": "InternVideo2",    "purpose": "Video analytics"},
    ],
    "5_speech_to_text": [
        {"tool": "Whisper",         "purpose": "Speech transcription · OpenAI"},
        {"tool": "Faster-Whisper",  "purpose": "Production-friendly · 4x faster", "recommended": True},
        {"tool": "WhisperX",        "purpose": "Speaker diarization + alignment"},
        {"tool": "NVIDIA NeMo ASR", "purpose": "Enterprise ASR"},
        {"tool": "Vosk",            "purpose": "Offline · CPU-friendly"},
        {"tool": "Kaldi",           "purpose": "Research-grade"},
    ],
    "6_image_to_table": [
        {"tool": "PaddleOCR PP-Structure", "purpose": "Tables from images", "recommended": True},
        {"tool": "Table Transformer", "purpose": "Microsoft · cell detection"},
        {"tool": "Camelot",         "purpose": "PDF tables"},
        {"tool": "Tabula",          "purpose": "PDF tables (Java)"},
        {"tool": "LayoutLMv3",      "purpose": "Forms · invoices"},
        {"tool": "Donut",           "purpose": "Doc-to-JSON"},
        {"tool": "LayoutParser",    "purpose": "Layout detection"},
    ],
    "7_image_to_chart": [
        {"tool": "DePlot",          "purpose": "Chart-to-data extraction"},
        {"tool": "ChartOCR",        "purpose": "Chart text extraction"},
        {"tool": "PlotQA-style",    "purpose": "Chart reasoning"},
        {"tool": "Qwen2.5-VL",      "purpose": "Chart explanation"},
    ],
    "8_screen_recording": [
        {"tool": "OBS Studio",      "purpose": "Industry standard recording", "recommended": True},
        {"tool": "ShareX",          "purpose": "Windows · screenshots + recording"},
        {"tool": "Kazam",           "purpose": "Linux · lightweight"},
        {"tool": "SimpleScreenRecorder", "purpose": "Linux · low CPU"},
        {"tool": "Peek",            "purpose": "Linux · GIF recording"},
        {"tool": "ScreenRec",       "purpose": "Windows quick"},
    ],
    "9_browser_session_replay": [
        {"tool": "OpenReplay",      "purpose": "Open-source session replay", "recommended": True},
        {"tool": "rrweb",           "purpose": "Browser recording engine"},
        {"tool": "PostHog",         "purpose": "Product analytics"},
        {"tool": "Highlight.io",    "purpose": "Session replay"},
    ],
    "10_meeting_recording": [
        {"tool": "Jitsi Meet",      "purpose": "Open-source video meetings"},
        {"tool": "BigBlueButton",   "purpose": "Training sessions"},
        {"tool": "OpenVidu",        "purpose": "Video platform"},
        {"tool": "LiveKit",         "purpose": "Real-time audio/video"},
    ],
    "11_video_annotation": [
        {"tool": "CVAT",            "purpose": "Video annotation · Intel-backed", "recommended": True},
        {"tool": "Label Studio",    "purpose": "Video labeling"},
        {"tool": "FiftyOne",        "purpose": "Dataset visualization"},
        {"tool": "Supervisely CE",  "purpose": "Annotation platform"},
    ],
}


# ════════════════ THE CANONICAL PIPELINE ════════════════
PIPELINE_FLOW = [
    {"step": 1,  "stage": "Video Ingestion",       "tool": "FFmpeg",          "output": "validated mp4"},
    {"step": 2,  "stage": "Scene Detection",       "tool": "PySceneDetect",   "output": "scene boundaries"},
    {"step": 3,  "stage": "Frame Extraction",      "tool": "FFmpeg",          "output": "frames/sec rate"},
    {"step": 4,  "stage": "OCR (per frame)",       "tool": "PaddleOCR",       "output": "text + bbox + confidence"},
    {"step": 5,  "stage": "Speech Extraction",     "tool": "Faster-Whisper",  "output": "transcript + speaker + timestamps"},
    {"step": 6,  "stage": "Vision Understanding",  "tool": "Qwen2.5-VL",      "output": "scene summary + objects + relations"},
    {"step": 7,  "stage": "Metadata Enrichment",   "tool": "custom",          "output": "tags + keywords + sentiment + risk"},
    {"step": 8,  "stage": "Chunking",              "tool": "custom",          "output": "semantic chunks"},
    {"step": 9,  "stage": "Embedding",             "tool": "BGE-M3",          "output": "1024-d vectors"},
    {"step": 10, "stage": "Vector Indexing",       "tool": "Qdrant",          "output": "indexed collection"},
    {"step": 11, "stage": "Workflow Orchestration","tool": "Temporal",        "output": "durable runs"},
    {"step": 12, "stage": "RAG Search",            "tool": "hybrid",          "output": "ranked results + citations"},
    {"step": 13, "stage": "Agent Layer",           "tool": "LangGraph",       "output": "actions + answers"},
    {"step": 14, "stage": "Observability",         "tool": "Langfuse",        "output": "traces + metrics"},
]


# ════════════════ 14-PHASE BUILD PLAN ════════════════
PHASES = [
    {"phase": 0,  "name": "Business Discovery",       "deliverables": ["BRD", "NFR", "Arch Vision", "Success Metrics", "ROI Model"]},
    {"phase": 1,  "name": "Use Case Catalog",         "deliverables": ["per-vertical use cases (insurance/healthcare/banking/manufacturing)"]},
    {"phase": 2,  "name": "Data Assessment",          "deliverables": ["Data Dictionary", "Lineage", "Source Inventory", "Classification Matrix"]},
    {"phase": 3,  "name": "Architecture Design",      "deliverables": ["7-layer flow", "tool selection", "deployment topology"]},
    {"phase": 4,  "name": "Video Ingestion",          "deliverables": ["upload + validation + virus scan + metadata extraction"]},
    {"phase": 5,  "name": "Video Processing Pipeline","deliverables": ["FFmpeg + PySceneDetect + PaddleOCR + Faster-Whisper + Qwen2.5-VL chain"]},
    {"phase": 6,  "name": "Metadata Enrichment",      "deliverables": ["video summary · scene summary · speaker summary · OCR · tags · sentiment · risk score · compliance score"]},
    {"phase": 7,  "name": "Search Platform",          "deliverables": ["keyword · semantic · OCR · speaker · image · timeline · hybrid"]},
    {"phase": 8,  "name": "RAG Layer",                "deliverables": ["query rewrite · hybrid search · reranker · context builder"]},
    {"phase": 9,  "name": "Agent Layer",              "deliverables": ["OCR/Speech/Vision/Search/Compliance/Fraud/Report/Monitoring agents"]},
    {"phase": 10, "name": "Human Approval",           "deliverables": [">95% auto · 80-95% review · <80% mandatory review · threshold gates"]},
    {"phase": 11, "name": "Security",                 "deliverables": ["OAuth2 · RBAC/ABAC · AES256 · Vault · Presidio · OPA"]},
    {"phase": 12, "name": "Observability",            "deliverables": ["OpenTelemetry + Prometheus + Grafana + Langfuse + Phoenix"]},
    {"phase": 13, "name": "Evaluation",               "deliverables": ["OCR ≥95% · WER ≤10% · retrieval R/P ≥90% · faithfulness ≥90%"]},
    {"phase": 14, "name": "Production Rollout",       "deliverables": ["Pilot (100 videos) → Expansion (10K) → Enterprise (Millions · HA/DR)"]},
]


# ════════════════ BRUTAL · 19 OFTEN-FORGOTTEN ════════════════
BRUTAL_FORGOTTEN = [
    "Video retention lifecycle",
    "Legal hold management",
    "Chain of custody for evidence videos",
    "Data lineage",
    "Model drift monitoring",
    "OCR drift monitoring",
    "ASR drift monitoring",
    "Human feedback loop",
    "Cost governance",
    "GPU capacity planning",
    "AI governance",
    "AI Control Tower",
    "Agent observability",
    "Agent approval workflow",
    "Disaster recovery",
    "Multi-tenant isolation",
    "Content moderation",
    "Copyright detection",
    "Deepfake detection",
    "Audit trail and forensic reporting",
]


# ════════════════ USE CASES BY VERTICAL ════════════════
USE_CASES = {
    "insurance": [
        "Claims Video Analysis (operator's domain · highest priority)",
        "Vehicle Damage Assessment",
        "Fraud Detection (video evidence)",
        "Property Inspection",
        "Customer Video Submission",
    ],
    "healthcare": [
        "EEG Video Review",
        "Telehealth Recording Analysis",
        "Surgical Procedure Search",
        "Training Video Search",
    ],
    "banking": [
        "Branch CCTV Analytics",
        "KYC Video Verification",
        "Contact Center Video QA",
    ],
    "manufacturing": [
        "Safety Monitoring",
        "Factory Inspection",
        "Equipment Failure Detection",
    ],
}


# ════════════════ EVAL TARGETS ════════════════
EVAL_TARGETS = {
    "OCR": {"accuracy": ">95%"},
    "Speech (ASR)": {"WER": "<10%"},
    "Retrieval": {"recall": ">90%", "precision": ">90%"},
    "LLM": {"faithfulness": ">90%"},
    "Vision LLM": {"hallucination_rate": "<5%"},
}


# ════════════════ ENTERPRISE STACK ════════════════
ENTERPRISE_STACK = {
    "Gateway":      "Kong / APISIX",
    "Storage":      "MinIO",
    "Metadata":     "PostgreSQL",
    "Queue":        "Kafka",
    "Workflow":     "Temporal",
    "OCR":          "PaddleOCR",
    "Speech":       "Faster-Whisper",
    "Vision":       "Qwen2.5-VL",
    "Embedding":    "BGE-M3 (or BGE-large)",
    "Vector DB":    "Qdrant",
    "Search":       "Elasticsearch / OpenSearch",
    "Monitoring":   "Langfuse + Phoenix",
    "Frontend":     "React + video.js",
}


# ════════════════ AGENT ROSTER ════════════════
AGENTS = [
    {"id": "sys_video_ocr_agent",         "purpose": "PaddleOCR text extraction per frame"},
    {"id": "sys_video_speech_agent",      "purpose": "Faster-Whisper transcript + diarization"},
    {"id": "sys_video_vision_agent",      "purpose": "Qwen2.5-VL scene analysis"},
    {"id": "sys_video_search_agent",      "purpose": "Hybrid retrieval (vector + keyword)"},
    {"id": "sys_video_compliance_agent",  "purpose": "Policy check + PII flag"},
    {"id": "sys_video_fraud_agent",       "purpose": "Risk + deepfake detection"},
    {"id": "sys_video_report_agent",      "purpose": "Generate summary reports"},
    {"id": "sys_video_monitoring_agent",  "purpose": "Pipeline health · drift · cost"},
]


# ════════════════ ENDPOINTS ════════════════
@router.get("/catalog")
def catalog():
    total = sum(len(v) for v in TOOL_CATALOG.values())
    return {**stamp(), "categories": list(TOOL_CATALOG.keys()),
            "n_categories": len(TOOL_CATALOG),
            "n_tools_total": total,
            "tools": TOOL_CATALOG, "spec": "§128"}


@router.get("/pipeline")
def pipeline():
    return {**stamp(), "n_steps": len(PIPELINE_FLOW),
            "flow": PIPELINE_FLOW, "spec": "§128 canonical 14-step pipeline"}


@router.get("/build-plan")
def build_plan():
    return {**stamp(), "n_phases": len(PHASES),
            "phases": PHASES, "spec": "§128 14-phase build plan"}


@router.get("/brutal-forgotten")
def brutal_forgotten():
    return {**stamp(), "count": len(BRUTAL_FORGOTTEN),
            "items": BRUTAL_FORGOTTEN,
            "tag": "demo-vs-production differentiators",
            "spec": "§128 brutal · 20 items teams skip"}


@router.get("/use-cases")
def use_cases():
    total = sum(len(v) for v in USE_CASES.values())
    return {**stamp(), "verticals": list(USE_CASES.keys()),
            "n_use_cases": total,
            "use_cases": USE_CASES, "spec": "§128 vertical map"}


@router.get("/eval-targets")
def eval_targets():
    return {**stamp(), "targets": EVAL_TARGETS, "spec": "§128 production gates"}


@router.get("/enterprise-stack")
def enterprise_stack():
    return {**stamp(), "stack": ENTERPRISE_STACK,
            "n_components": len(ENTERPRISE_STACK),
            "spec": "§128 13-component enterprise"}


@router.get("/agents")
def agents():
    return {**stamp(), "agents": AGENTS, "n_agents": len(AGENTS),
            "spec": "§128 video intelligence agents"}


@router.get("/audio-to-text")
def audio_to_text():
    """Audio sub-pipeline · operator's separate ask."""
    return {**stamp(),
            "pipeline": [
                "Audio File", "Format Validation", "Noise Reduction",
                "Speech-to-Text", "Timestamp Alignment", "Speaker Diarization",
                "Text Cleanup", "Store Transcript", "Search / RAG",
            ],
            "recommended_stack": {
                "simple": "Faster-Whisper",
                "diarization": "WhisperX",
                "realtime": "Vosk / Faster-Whisper streaming",
                "enterprise": "Kafka + Temporal + MinIO + Faster-Whisper",
            },
            "output_fields": ["audio_id", "speaker", "start_time", "end_time",
                              "transcript", "confidence", "language"],
            "production_addons": {
                "long_audio": "Chunking",
                "multi_speaker": "Diarization",
                "search": "Embeddings + Qdrant",
                "quality": "WER/CER evaluation",
                "monitoring": "OpenTelemetry + Grafana",
                "governance": "PII masking + audit log",
            },
            "code_snippet": (
                "pip install faster-whisper\n"
                "from faster_whisper import WhisperModel\n"
                "model = WhisperModel('small', device='cpu', compute_type='int8')\n"
                "segments, info = model.transcribe('audio.mp3', beam_size=5)\n"
                "for s in segments: print(f'[{s.start:.2f}-{s.end:.2f}] {s.text}')\n"
            ),
            "spec": "§128 audio-to-text sub-pipeline"}


@router.get("/image-to-text")
def image_to_text():
    """Image → Text/Table/Flow/Graph sub-pipelines · operator's brief."""
    return {**stamp(),
            "pipelines": {
                "image_to_text":       ["PaddleOCR", "EasyOCR", "Tesseract"],
                "image_to_table":      ["PaddleOCR PP-Structure", "Table Transformer", "Camelot", "Tabula"],
                "image_to_flowchart":  ["OpenCV + OCR + Qwen2.5-VL"],
                "image_to_chart_data": ["DePlot", "ChartOCR"],
                "image_to_form":       ["LayoutLMv3", "Donut"],
                "image_to_handwriting":["TrOCR", "PaddleOCR HW model"],
            },
            "output_format_examples": {
                "image_to_text": {"image_id": "IMG-001", "text": "Invoice...", "confidence": 0.94},
                "image_to_table": {"columns": ["Item","Qty","Price"], "rows": [["Laptop","2","$1200"]]},
                "image_to_flow": {"nodes": [{"id":"n1","label":"Upload"}], "edges": [{"from":"n1","to":"n2"}]},
                "image_to_graph": {"chart_type":"bar", "x_axis":"Month", "data":[{"month":"Jan","sales":100}]},
            },
            "production_challenges": [
                {"problem": "Blurry image",     "fix": "Denoise · sharpen · upscale"},
                {"problem": "Rotated image",    "fix": "Deskew · orientation detection"},
                {"problem": "Poor table borders","fix": "Layout model + cell reconstruction"},
                {"problem": "Merged cells",     "fix": "Table structure recognition"},
                {"problem": "Handwriting",      "fix": "TrOCR · human review"},
                {"problem": "Low OCR confidence","fix": "Human approval workflow"},
                {"problem": "Complex flowchart","fix": "Vision LLM + graph validation"},
                {"problem": "PII in image",     "fix": "Presidio + masking"},
                {"problem": "Hallucinated extraction", "fix": "Confidence threshold + bbox refs"},
            ],
            "best_stack": ["PaddleOCR + PP-Structure", "OpenCV preprocessing",
                            "LayoutParser / DocTR", "Qwen2.5-VL · complex understanding",
                            "DePlot / ChartOCR · chart extraction",
                            "Qdrant · semantic search",
                            "PostgreSQL · metadata", "MinIO · image storage"],
            "spec": "§128 image-to-{text,table,flow,graph} sub-pipelines"}


@router.get("/health")
def health():
    return {**stamp(), "module": "video-intel",
            "n_tool_categories": len(TOOL_CATALOG),
            "n_pipeline_steps":  len(PIPELINE_FLOW),
            "n_phases":          len(PHASES),
            "n_agents":          len(AGENTS),
            "n_brutal_items":    len(BRUTAL_FORGOTTEN),
            "spec": "§128"}


@router.get("/overview")
def overview():
    return {**stamp(),
            "title": "Enterprise Video Intelligence Pipeline",
            "endpoints": [
                "/catalog · 50+ tools · 11 categories",
                "/pipeline · 14-step canonical flow",
                "/build-plan · 14 phases (0-14)",
                "/brutal-forgotten · 20 demo-vs-prod gaps",
                "/use-cases · insurance/healthcare/banking/manufacturing",
                "/eval-targets · OCR/ASR/Retrieval/LLM/VLM gates",
                "/enterprise-stack · 13-component recommendation",
                "/agents · 8 video intelligence agents",
                "/audio-to-text · sub-pipeline + code",
                "/image-to-text · sub-pipelines + challenges",
            ],
            "recommended_stack": ("FFmpeg + PaddleOCR + Faster-Whisper + "
                                    "Qwen2.5-VL + BGE-M3 + Qdrant + Temporal + "
                                    "Langfuse + MinIO + OpenReplay"),
            "spec": "§128"}


# ──────────────────────────────────────────────────────────────────────
# Stage-1 functional POST endpoints · operator 2026-06-12 'video-to-text + audio-to-text'
# §57.7 honest scaffold: returns transcription with `scaffold: true` flag
# when faster-whisper isn't installed. When the real model lands, the same
# endpoint URL switches transparently from scaffold to real ASR.

def _whisper_available() -> tuple[bool, str]:
    try:
        import faster_whisper  # noqa: F401
        return True, "faster-whisper"
    except Exception:
        try:
            import whisper  # noqa: F401
            return True, "openai-whisper"
        except Exception:
            return False, "no-asr-installed"


@router.post("/audio-to-text")
async def audio_to_text_run(file: UploadFile = File(...)):
    """§STT Stage-1 · POST audio file · returns transcript shape.

    Honest scaffold: when no ASR library is installed (faster-whisper /
    openai-whisper), returns a structured placeholder with `scaffold: true`
    AND the same response shape a real transcript would have. UI can stay
    stable; production wiring is a single pip-install away.
    """
    blob = await file.read()
    audio_id = f"aud-{hashlib.sha1(blob).hexdigest()[:16]}"
    available, backend = _whisper_available()

    response: dict[str, Any] = {
        **stamp(),
        "audio_id": audio_id,
        "filename": file.filename,
        "size_bytes": len(blob),
        "asr_backend": backend,
        "scaffold": not available,
        "language": "en",
        "spec": "§128 STT POST · §57.7 honest stage-1",
    }

    if not available:
        response["segments"] = [{
            "start": 0.0, "end": float(len(blob)) / 16000 if len(blob) else 1.0,
            "speaker": "unknown", "confidence": None,
            "transcript": ("[STAGE-1 SCAFFOLD · install faster-whisper to enable "
                           "real ASR: pip install faster-whisper]"),
        }]
        response["transcript"] = response["segments"][0]["transcript"]
        return response

    # Real ASR path · faster-whisper preferred
    import tempfile
    from pathlib import Path
    tmp = Path(tempfile.gettempdir()) / f"{audio_id}{Path(file.filename or '.wav').suffix}"
    tmp.write_bytes(blob)
    try:
        if backend == "faster-whisper":
            from faster_whisper import WhisperModel
            model = WhisperModel("small", device="cpu", compute_type="int8")
            segments, info = model.transcribe(str(tmp), beam_size=5)
            segs = []
            for s in segments:
                segs.append({
                    "start": round(s.start, 2),
                    "end": round(s.end, 2),
                    "speaker": "speaker_0",
                    "confidence": round(getattr(s, "avg_logprob", 0.0), 4),
                    "transcript": s.text.strip(),
                })
            response["language"] = info.language
            response["segments"] = segs
            response["transcript"] = " ".join(s["transcript"] for s in segs)
        else:
            import whisper
            model = whisper.load_model("base")
            result = model.transcribe(str(tmp))
            response["language"] = result.get("language", "en")
            response["transcript"] = result.get("text", "")
            response["segments"] = result.get("segments", [])
    finally:
        try:
            tmp.unlink()
        except OSError:
            pass

    return response


@router.post("/video-to-text")
async def video_to_text_run(file: UploadFile = File(...)):
    """§STT Stage-1 · POST video file · extract audio track → transcript.

    Stage-1 implementation re-uses the audio-to-text path after a best-
    effort audio extraction. Without ffmpeg available the endpoint still
    returns a structured scaffold response per §57.7 honest.
    """
    blob = await file.read()
    video_id = f"vid-{hashlib.sha1(blob).hexdigest()[:16]}"

    import shutil
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return {
            **stamp(),
            "video_id": video_id,
            "filename": file.filename,
            "size_bytes": len(blob),
            "scaffold": True,
            "reason": "ffmpeg not on PATH · install to enable video→audio extraction",
            "next_step": "POST /api/v1/video-intel/audio-to-text with extracted audio",
            "spec": "§128 video-to-text POST · §57.7 honest stage-1",
        }

    # Extract audio via ffmpeg · pipe to audio-to-text
    import tempfile, subprocess
    from pathlib import Path
    src = Path(tempfile.gettempdir()) / f"{video_id}{Path(file.filename or '.mp4').suffix}"
    dst = Path(tempfile.gettempdir()) / f"{video_id}.wav"
    src.write_bytes(blob)
    try:
        r = subprocess.run(
            [ffmpeg, "-y", "-i", str(src), "-vn", "-ar", "16000", "-ac", "1",
             "-f", "wav", str(dst)],
            capture_output=True, timeout=120,
        )
        if r.returncode != 0:
            raise HTTPException(
                500,
                {"detail": f"ffmpeg failed: {r.stderr.decode('utf-8', 'ignore')[:200]}",
                 "error_code": "VIDEO_TO_TEXT_FFMPEG_FAILED"},
            )
        # Re-call audio path with the extracted file
        wav_bytes = dst.read_bytes()

        class _MockUpload:
            filename = dst.name
            def __init__(self, b: bytes) -> None:
                self._b = b
            async def read(self) -> bytes:
                return self._b

        result = await audio_to_text_run(_MockUpload(wav_bytes))  # type: ignore[arg-type]
        result["video_id"] = video_id
        result["video_filename"] = file.filename
        return result
    finally:
        for p in (src, dst):
            try:
                p.unlink()
            except OSError:
                pass
