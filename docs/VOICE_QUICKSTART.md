# Voice Control — Quick Start

Per operator 2026-06-01 ("I'm still not able to capture voice to text" +
"advance mechanism" + trigger-word vocabulary).

## CRITICAL: Where to run

**You must run these commands in YOUR OWN terminal**, not from Claude Code.
Claude Code's session runs `arecord` on this host, but the AUDIO you speak
into your mic gets captured by parecord/arecord running in your shell.

```bash
# In your own terminal:
cd /mnt/deepa/insur_project
bash scripts/voice              # 5s push-to-talk → clipboard
bash scripts/voice-pro          # continuous voice control with trigger words
bash scripts/voice-diagnose     # debug if nothing captured
```

## Three tools

### 1. `scripts/voice` — push-to-talk (one-shot)

```bash
bash scripts/voice              # 5s record → transcript → clipboard
bash scripts/voice 10           # 10s record
bash scripts/voice 5 small      # use whisper-small (more accurate)
```

After running, transcript is:
1. In your clipboard (paste with `Ctrl+V`)
2. Shown in a highlighted box in the terminal
3. Saved to `/tmp/voice_*.txt`

### 2. `scripts/voice-pro` — continuous + trigger words (the "advanced mechanism")

```bash
bash scripts/voice-pro
```

Records in 4-sec chunks, transcribes each, and acts on trigger words.
Words you say get **typed into whichever window has keyboard focus**.

**Workflow:**
1. Click into Claude Code's chat input (or any text field)
2. Run `bash scripts/voice-pro` in your terminal
3. Say **"go"** to start dictating
4. Speak naturally — words appear in the focused window
5. Say **"send"** to press Enter and submit
6. Say **"stop"** to exit the listener

**Full trigger vocabulary:**

| Say... | Action |
|---|---|
| `go`, `start`, `begin` | Activate dictation |
| `wait`, `pause`, `hold` | Pause (say `go` to resume) |
| `send`, `submit`, `send it`, `send message` | Press Enter (submit) |
| `stop`, `exit`, `quit` | Exit the listener |
| `delete`, `clear`, `delete the text` | Select all + delete current input |
| `change`, `modify`, `update` | Clear input, then dictate replacement |
| `new line`, `newline`, `line break` | Insert newline without submitting (Shift+Enter) |
| (anything else) | Typed into focused window |

### 3. `scripts/voice-diagnose` — debug

Run this if voice capture isn't working:

```bash
bash scripts/voice-diagnose
```

Checks: arecord device list / ALSA mixer (mute? volume?) / PulseAudio
default source / live 3-sec test with volume reading / Python deps.

## The bug that was fixed (technical detail)

PulseAudio on Linux often sets the "default source" to the SPEAKER
MONITOR (loopback) instead of the actual mic input. When `arecord` runs
without `-D`, it uses the PulseAudio default — capturing silence.

**Fix:** `voice` and `voice-pro` now use `parecord` with the explicit
mic source (`alsa_input.*`) discovered via `pactl list sources short`.
Falls back to `arecord -D hw:1,0 -c 2` if PulseAudio isn't running.

## If voice-pro types text but won't press Enter

This usually means the focused window doesn't accept Enter as submit (e.g.
some web inputs need a button click). Workarounds:
- Use **"new line"** instead — sends Shift+Enter
- Manually press Enter yourself; voice-pro only types the text

## If voice-pro types but you didn't say "go"

Trigger detection compares against the **whole chunk transcript**. If
you said "go ahead and write a function", it matches `go` and activates.
Once activated, subsequent chunks are typed.

To pause without exiting: say **"wait"** or **"pause"**.

## Stop listening

Either:
- Say **"stop"** (clean exit)
- Press **Ctrl+C** in the terminal running voice-pro
