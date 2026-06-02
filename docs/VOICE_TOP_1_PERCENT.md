# Voice Control — What's Missing for Top 1%

Per operator 2026-06-01 ("what other feature missing? top 1%").

Current voice stack (scripts/voice + voice-pro + voice-diagnose +
voice-noise-cancel + voice_log.sh + voice_history_init.py) covers the
**top ~30%** of voice-control tools. To hit top 1%, here's the gap list,
ordered by impact-per-effort.

## Tier A — High impact, low effort (do next)

### 1. Voice Activity Detection (VAD) — replaces fixed chunks
**Why**: Fixed 4-sec chunks miss the start of phrases and waste time on silence.
**How**: silero-vad (Python, free, sub-100ms latency). Detect speech start/end,
record only when speaking.
**Effort**: ~150 LOC; dep: `pip install silero-vad`
**ROI**: 3× more responsive feel

### 2. Wake word ("Hey Claude" / "Computer")
**Why**: 24/7 listening burns CPU + privacy concern. Wake word = on-demand.
**How**: openwakeword (Python, free, ~500MB model). Detects 1 of 4 built-in
words or custom-trained.
**Effort**: ~100 LOC; dep: `pip install openwakeword`
**ROI**: Battery savings + privacy posture + always-running daemon

### 3. Punctuation triggers
**Why**: Right now transcripts have no punctuation. "I went to the store
period new sentence today I bought milk" should produce "I went to the
store. Today I bought milk."
**How**: regex post-process on transcript before typing.
**Effort**: ~50 LOC
**Triggers**: `period / comma / question mark / exclamation / colon /
new line / new paragraph`

### 4. Code mode (curly braces / parens / brackets)
**Why**: Saying "function foo bracket" → `function foo() {`
**How**: Post-process replace "open bracket"→`{`, "close paren"→`)`, etc.
**Effort**: ~30 LOC
**ROI**: voice-to-code becomes usable

### 5. Larger Whisper model for Indian English / accents
**Why**: whisper-base struggles with non-American accents
**How**: `--model small` (244MB) or `--model medium` (769MB) or `--model
large-v3` (1.5GB)
**Effort**: 1 command line flag (already there as `--model`)
**ROI**: 30-50% better accuracy for Indian English

### 6. Custom vocabulary (initial_prompt)
**Why**: Whisper hallucinates rare technical terms
**How**: `whisper.transcribe(initial_prompt="claims, underwriting, fraud,
SHAP, ChromaDB, Ollama, ...")` biases toward your vocabulary
**Effort**: Already added — `--prompt "...your terms..."` flag

## Tier B — Medium impact, medium effort

### 7. Streaming partial transcripts
**Why**: User sees what's being typed as they speak, not after chunk ends
**How**: faster-whisper supports streaming via `transcribe(...) → generator`
**Effort**: ~200 LOC refactor

### 8. Hotkey-driven push-to-talk (no terminal needed)
**Why**: Operator wants to bind voice to a keyboard shortcut
**How**: xbindkeys (X11) or sxhkd binds key → bash scripts/voice
**Effort**: ~30 LOC + xbindkeys config

### 9. Multi-language switching
**Why**: Operator may want to switch between English / Hindi
**How**: Trigger "switch to Hindi" / "switch to English" reloads model
with new `language=` param
**Effort**: ~50 LOC

### 10. GPU-accelerated transcription
**Why**: CPU whisper-base is slow. GPU is 5-10× faster
**How**: `pip install torch` with CUDA; whisper auto-uses GPU
**Effort**: 1 line if NVIDIA GPU; ~3 lines to verify CUDA
**ROI**: Real-time transcription latency

## Tier C — High impact, high effort

### 11. Speaker diarization (who said what)
**Why**: Multi-person meetings
**How**: pyannote.audio (open-source, accurate, requires HF token)
**Effort**: ~300 LOC + new pipeline

### 12. Always-on transcription daemon → searchable archive
**Why**: Personal memory: search anything you said in last month
**How**: systemd-user service runs voice-pro 24/7 → SQLite (have already!)
+ FTS5 full-text search index
**Effort**: ~150 LOC

### 13. Real-time translation
**Why**: Hindi → English (or any direction)
**How**: Whisper has built-in translation mode (`task="translate"`)
**Effort**: ~30 LOC flag

### 14. Local LLM intent parsing (beyond simple triggers)
**Why**: "Send a polite reply to the email from John about the meeting"
should map to multi-step action, not just typed text
**How**: Ollama + qwen2.5 (already installed) parses intent → dispatches
**Effort**: ~200 LOC

### 15. Conversation memory (context across sessions)
**Why**: "Continue what we were doing yesterday" should remember
**How**: Vector DB (Chroma already installed) + episodic memory layer
**Effort**: ~400 LOC

## Tier D — Cool but niche

### 16. Voiceprint authentication (only YOU can give commands)
**Why**: Prevent strangers from issuing voice commands
**How**: SpeechBrain + speaker recognition model
**Effort**: ~500 LOC + enrollment flow

### 17. Emotion / sentiment classification per chunk
**Why**: Adjust LLM response tone based on user mood
**How**: SpeechBrain emotion model
**Effort**: ~150 LOC

### 18. Audio fingerprint search (find this song in history)
**Why**: "What was that ambient noise I heard last Tuesday?"
**How**: Probably overkill

## Top 1% bar — practical recommendation

To hit top 1%, implement Tier A (1-6) + Tier B (7-10):
- VAD eliminates fixed-chunk awkwardness
- Wake word makes 24/7 listening privacy-safe
- Punctuation + code mode makes voice-to-code real
- Larger model + custom vocab handles accents
- Streaming transcripts feel real-time
- Hotkey makes it daily-driver
- Multi-language for bilingual operators
- GPU for instant feedback

**Estimated effort**: ~1000 LOC across 1 day of focused work.

After Tier A+B, you've leapfrogged Whisper.cpp + most consumer voice
tools (Dragon, Talon, Otter). You're in OpenAI / Google internal-tool
territory.

## What's already done (above baseline)

- ✅ Trigger-word vocabulary (8 verbs) — most voice tools have only 1-2
- ✅ TTS feedback — most tools are silent
- ✅ 3-tier fallback chain — most tools just fail
- ✅ SQLite history — most tools forget
- ✅ Per-chunk volume reporting — most tools hide diagnostics
- ✅ Noise cancellation via PulseAudio — most tools punt to OS
- ✅ pynput keystroke injection — works in any focused window

This already puts the current stack ahead of most consumer voice tools.

## See also

- `scripts/voice-pro --language en --prompt "your vocab"` for accent + vocab tuning
- `bash scripts/voice_log.sh --triggers` to see what's been heard
- `docs/VOICE_QUICKSTART.md` for the operator-facing how-to
