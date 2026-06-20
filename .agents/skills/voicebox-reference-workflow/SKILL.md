---
name: voicebox-reference-workflow
description: Use when adapting Voicebox-style capture history, local STT model selection, local LLM refinement, queue/retry recovery, voice input/recording, post-processing effects, or local-first voice workflow patterns.
---

# Voicebox Reference Workflow

Use this skill whenever OpenStem work touches Voicebox-style local voice I/O patterns, capture history, STT model selection, local LLM refinement, queue/retry recovery, recording UX, post-processing presets, or local-first voice workflow design.

## Core Boundaries

- Use Voicebox as a reference, not branding.
- OpenStem is not affiliated with or endorsed by Voicebox.
- Do not copy Voicebox code without license review.
- Do not add voice cloning by default.
- Do not add global hotkeys, OS paste automation, API, or MCP behavior without separate approval.
- Preserve original captures.
- Keep transcript and audio processing local by default.
- Cloud upload is disabled by default.
- Queue, retry, cancel, and recovery states must be explicit.
- Model readiness must be honest.
- Effects and mastering must verify output files.
- This workflow does not approve Beta Candidate.
- This workflow does not satisfy stem-separation proof.

## Preferred Adaptation Pattern

Use this path for local capture or transcription work:

Capture or import -> verify source -> choose local model/profile -> queue job -> run local backend -> verify outputs -> update metadata-only ledger -> allow retry, edit, export, or archive.

Do not create a complete history entry unless the written artifacts exist and have nonzero size.

## Capture Ledger Rules

Capture records should track:

- capture id,
- source type,
- original file path,
- managed local path,
- transcript path,
- duration,
- language,
- model used,
- status,
- retries,
- errors,
- history entry,
- linked exports,
- linked prompt outputs.

Transcript text should not be logged by default. Full-history transcript storage must be opt-in.

## Model Ladder Rules

Use simple labels first:

- Fast,
- Balanced,
- Accurate,
- Maximum Accuracy.

Map those labels to Whisper-family options only after backend and model readiness are documented. Model availability, source, license, and SHA-256 state must not be faked.

## Queue And Recovery

Use structured states:

- `JOB_QUEUED`
- `JOB_RUNNING`
- `JOB_COMPLETE`
- `JOB_FAILED`
- `JOB_CANCELED`
- `JOB_RETRY_READY`
- `JOB_STALE_RECOVERED`
- `JOB_OUTPUT_NOT_VERIFIED`

Failed later stages must preserve earlier verified artifacts.

## Local LLM Refinement

Local LLM refinement can support cleanup, filler-word cleanup, technical-term preservation, prompt workflow formatting, prompt-library execution, and clarity rewrites.

Rules:

- local model preferred,
- cloud disabled by default,
- no PHI/cloud by default,
- draft-only output,
- no fake model readiness,
- no transcript text in logs by default,
- user can disable refinement.

## Post-Processing Effects

Voicebox-style effect presets can inform OpenStem Mastering Lab and voice cleanup:

- Voice Cleanup,
- Podcast / Dialogue,
- Gentle Mastering,
- AI Music Cleanup,
- Custom Preset.

Every effect chain must be non-destructive by default and must write a verified output copy before completion is shown.

## Tauri And API/MCP

Voicebox uses Tauri. OpenStem uses Electron. The useful lesson is narrow native process separation and verified helper execution, not an automatic framework rewrite.

Voicebox-style API/MCP automation is future-only in OpenStem. It must be disabled by default, local-only if implemented, and never used to upload audio, transcript text, PHI, or model artifacts without explicit user action and documented policy.
