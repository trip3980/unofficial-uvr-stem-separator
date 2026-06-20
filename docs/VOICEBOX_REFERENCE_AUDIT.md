# Voicebox Reference Audit

Release state: Hardened Functional Alpha.

Current proof note: one local CPU separator proof lane has passed; Beta Candidate still needs final release checklist review, packaged-app review, and user approval.

Voicebox-style transcription, dictation, captures, TTS, voice profiles, post-processing, local LLM refinement, API/MCP patterns, and Tauri architecture lessons do not count as OpenStem AI stem-separation proof.

## Repo Inspected

- Reference project: https://github.com/jamiepine/voicebox
- Local checkout: local external reference checkout, not committed to OpenStem.
- Commit inspected: `b35b90961d5bc83a8b4e96e8b6ccde2a03152ff9`
- Checkout status: clean during inspection.
- OpenStem source impact: reference only; the Voicebox repository is not committed into OpenStem.

## License

Voicebox includes a `LICENSE` file declaring the MIT License. No Voicebox source files were copied into OpenStem in this pass.

If any Voicebox code is copied or substantially adapted later:

1. record the exact source file,
2. preserve the MIT notice,
3. update root `THIRD_PARTY_NOTICES.md`,
4. update `docs/THIRD_PARTY_NOTICES.md`,
5. update About/Legal,
6. add tests proving the notice and non-affiliation wording remain present.

## Security Policy Finding

Voicebox includes `SECURITY.md`.

Useful security notes:

- supported versions are documented,
- older versions are listed as unsupported,
- vulnerabilities are routed to a private security contact,
- local processing, remote server mode, auto-updates, and Python server boundaries are explicitly discussed.

OpenStem adaptation: keep local-first language clear, keep remote/API/MCP disabled by default, and do not create cloud upload or remote-control behavior without a separate security design.

## Architecture Summary

Voicebox is a local-first voice studio built with:

- React frontend,
- Tauri/Rust native shell,
- Python FastAPI backend,
- SQLite-style persisted capture/task/profile state,
- local STT and local LLM integration,
- async task queue,
- model/download readiness checks,
- local audio capture and post-processing services,
- optional API/MCP patterns.

Important inspected areas:

- `backend/services/captures.py`
- `backend/routes/captures.py`
- `backend/services/transcribe.py`
- `backend/routes/transcription.py`
- `backend/services/task_queue.py`
- `backend/services/refinement.py`
- `backend/services/llm.py`
- `backend/services/effects.py`
- `backend/utils/effects.py`
- `backend/services/profiles.py`
- `backend/mcp_server/tools.py`
- `app/src/lib/hooks/useRestoreActiveTasks.tsx`
- `app/src/lib/hooks/useGenerationProgress.ts`
- `app/src/lib/hooks/useCaptureRecordingSession.ts`
- `app/src/lib/hooks/useAudioRecording.ts`
- `app/src/lib/hooks/useTranscription.ts`
- `app/src/lib/hooks/useDictationReadiness.ts`
- `tauri/src-tauri/src`

## Useful Concepts

1. Capture ledger for recording/import/transcript history.
2. Simple STT model ladder instead of exposing raw model details first.
3. Async queue for GPU/CPU contention control.
4. Retry, cancel, stale-task recovery, and task status streaming.
5. Local LLM transcript refinement with draft-only boundaries.
6. Deterministic cleanup before LLM refinement to reduce hallucination risk.
7. Effect preset model for voice cleanup and post-processing.
8. Profile/preset system for repeatable workflows.
9. Readiness endpoints that separate missing model, pending download, and runnable states.
10. Tauri native separation as an architecture discipline reference.

## Concepts Rejected

1. Voicebox branding in OpenStem feature names.
2. Any claim that OpenStem is affiliated with or endorsed by Voicebox.
3. Voice cloning as a default OpenStem feature.
4. Global hotkeys and OS paste automation without separate approval.
5. Remote API or MCP exposure by default.
6. Cloud upload of audio or transcripts by default.
7. Switching OpenStem from Electron to Tauri in this task.
8. Treating transcription, dictation, TTS, local LLM, or effects as separator model proof.
9. Copying Tauri/Rust native code into the Electron app.
10. Adding heavy Python/native effects dependencies without release and license review.

## Code-Copy Risks

No Voicebox source files were copied.

Direct code reuse would require:

- MIT notice preservation for Voicebox code,
- review of transitive dependencies,
- security review for server/API/MCP surfaces,
- review of native capture and global input hooks,
- tests proving OpenStem does not expose remote/cloud paths by default.

OpenStem uses an independent TypeScript policy file at `src/services/voiceboxReferenceWorkflow.ts` to document accepted concepts without importing Voicebox code.

## OpenStem Adaptation Plan

1. Keep the main separator workflow UVR5-simple and proof-gated.
2. Use Voicebox only for local transcription, recording/intake, prompt workflow, mastering, and local-model workflow patterns.
3. Extend the Workflow Run Ledger with capture-ledger language.
4. Keep the transcription model selector user-facing as Fast, Balanced, Accurate, and Maximum Accuracy.
5. Use queue states for transcription, normalization, VTT parsing, export, prompt workflow, and mastering jobs.
6. Keep local LLM refinement draft-only and local/off until a real model is configured.
7. Keep post-processing non-destructive and output-verification gated.
8. Keep API/MCP future-only and disabled by default.

## Recommended Implementation Tasks

1. Add capture-ledger persistence through native Electron userData storage.
2. Add native single-file transcription runner with TXT/JSON output first.
3. Verify transcript outputs by existence, nonzero size, extension, and selected output folder.
4. Add serialized job queue for transcription and export before directory mode.
5. Add retry/cancel/stale recovery for queued jobs.
6. Add local LLM refinement only after a local model runner exists.
7. Add profile/preset storage for transcription, prompt workflow, mastering, and export settings.
8. Add non-destructive post-processing effect chains only after measured analysis and verified output writes are stable.

## Capture Ledger Adaptation

OpenStem should track:

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

Supported actions should be:

- replay source audio,
- re-transcribe,
- edit transcript inline,
- rename speakers,
- rename title/session,
- send to prompt workflow,
- export/archive,
- regenerate output,
- open folder.

Original audio is preserved unless the user explicitly deletes it. Transcript text is not logged by default. Completion requires verified files on disk.

## STT Model Ladder Adaptation

Use creator-friendly labels first:

| Label            | Whisper-family mapping       | Readiness rule                                                                          |
| ---------------- | ---------------------------- | --------------------------------------------------------------------------------------- |
| Fast             | `base`, `base.en`            | Missing / Not checked until backend, file, source/license, and hash state are verified. |
| Balanced         | `small`, `small.en`          | Missing / Not checked until backend, file, source/license, and hash state are verified. |
| Accurate         | `medium`, `medium.en`        | Missing / Not checked until backend, file, source/license, and hash state are verified. |
| Maximum Accuracy | `large`, `large-v3`, `turbo` | Missing / Not checked until backend, file, source/license, and hash state are verified. |

Do not force users to understand implementation details before the readiness check. Do not mark Whisper weights verified without source and checksum metadata when available.

## Queue, Retry, And Recovery Adaptation

OpenStem should use a serialized queue by default for:

- transcription jobs,
- normalization jobs,
- VTT parsing jobs,
- export jobs,
- prompt workflow jobs,
- mastering jobs.

Required diagnostic states:

- `JOB_QUEUED`
- `JOB_RUNNING`
- `JOB_COMPLETE`
- `JOB_FAILED`
- `JOB_CANCELED`
- `JOB_RETRY_READY`
- `JOB_STALE_RECOVERED`
- `JOB_OUTPUT_NOT_VERIFIED`

Failed later stages must not wipe earlier verified outputs.

## Local LLM Refinement Adaptation

Useful modes:

- Clean transcript,
- Preserve technical terms,
- Remove filler words,
- Format into prompt workflow,
- Run prompt library,
- Rewrite for clarity.

Rules:

- local LLM preferred,
- cloud disabled by default,
- no PHI/cloud by default,
- draft-only output,
- no fake model readiness,
- no transcript text in logs,
- user can disable refinement.

## Post-Processing Effects Adaptation

Useful presets:

- Voice Cleanup,
- Podcast / Dialogue,
- Gentle Mastering,
- AI Music Cleanup,
- Custom Preset.

Potential effects:

- gain,
- compressor,
- high-pass,
- low-pass,
- limiter,
- normalization,
- reverb/delay/chorus only when clearly labeled as creative effects.

Do not show measured values unless measured. Do not overwrite originals.

## Pedalboard Dependency Review

Voicebox uses `pedalboard` in its Python backend. Pedalboard is useful as a reference for audio I/O and effects chains, but OpenStem should not add it now.

Current finding from upstream project pages:

- license: GPL-3.0 with statically included third-party components documented upstream,
- latest checked version in this pass: `0.9.23`,
- PyPI wheel sizes for `0.9.23`: roughly 2.4 MB to 5.2 MB per wheel depending on platform/Python tag,
- compatibility: Windows, macOS, and Linux wheels exist, with platform caveats,
- packaging risk: Python native extension and GPL license implications require explicit release/legal approval before bundling,
- FFmpeg interaction: complementary for effects; FFmpeg remains the simpler first OpenStem lane for decode/probe/encode and verified exports,
- decision: optional future candidate only; do not add as a dependency in this pass.

## Mic And Dictation Workflow Adaptation

Safe OpenStem subset:

- in-app mic recording,
- simple start/stop,
- microphone selection,
- permission handling,
- recording status pill,
- transcript status,
- capture history.

Rejected for now:

- global hotkeys,
- OS-level paste automation,
- voice cloning,
- default cloud dictation.

## Profile And Preset Adaptation

Useful profile types:

- Session Transcription Profile,
- Zoom VTT Intake Profile,
- Podcast Notes Profile,
- Clinical Draft Profile,
- Music Mastering Profile,
- Voice Cleanup Profile.

Each profile can store input type, model preference, prompt library, export formats, folder preferences, automation checkpoints, and overwrite policy.

## API/MCP Future Decision

Voicebox API/MCP patterns are future-only for OpenStem.

Rules if revisited:

- disabled by default,
- localhost-only by default,
- no remote API exposure by default,
- no audio/transcript/PHI upload by default,
- explicit security review before implementation,
- separate tests for auth, origin, file access, and audit logging.

## Tauri vs Electron Lessons

Voicebox uses Tauri for native performance. OpenStem currently uses Electron.

The useful lesson is architecture/process separation, not an immediate rewrite. Electron remains acceptable if IPC is narrow, packaging is verified, and native helpers are controlled. Tauri can remain a future comparison only.

## Proof Boundary

This audit and the new `voiceboxReferenceWorkflow` policy do not run audio-separator, do not verify separator weights, do not create stems, do not satisfy `proof:check`, and do not approve Beta Candidate.
