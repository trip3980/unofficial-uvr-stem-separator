# Transcription Reference Audit

## Scope

This audit studies transcription workflow references for OpenStem's Local Transcription workspace. It does not copy branding, code, or UI. It extracts practical workflow patterns: simple input selection, local backend readiness, model selection, queue/history, export formats, timestamp honesty, diarization honesty, and output verification.

## Sanitized HAR Note

OpenStem also inspected a local TurboScribe HAR capture as a sensitive reference artifact. HAR files can contain cookies, auth headers, account identifiers, private file names, transcript IDs, request bodies, and response bodies, so only sanitized observations were documented in `docs/TURBOSCRIBE_HAR_REFERENCE_AUDIT.md`.

The HAR-informed adaptation is limited to safe product patterns: Recent Files, Folders, `Uncategorized`, bulk action placeholders, language selection, mode selection, speaker recognition planning, export status, and output verification. Runtime UI must not use TurboScribe branding, web upload behavior, private endpoints, or analytics patterns.

## References Inspected

| Project                                                                                                 | What was useful                                                                                                                                                      | OpenStem adaptation                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TurboScribe web product behavior, https://turboscribe.ai/                                               | Clear upload flow, language selection, transcription modes, speaker recognition option, common audio/video formats, PDF/DOCX/TXT/SRT/VTT/CSV export, bulk export.    | Adapt the simple queue/export/history pattern, but keep OpenStem local, unaffiliated, and honest about unimplemented native execution.                             |
| dparksports/turboscribe, https://github.com/dparksports/turboscribe                                     | Windows desktop transcription, directory batch processing, multiple Whisper model sizes, CUDA option, resume/skip checked files, cancel, Python backend, Apache-2.0. | Useful as a local Windows workflow reference. Do not copy code without separate review. Do not inherit cloud meeting detection or model download behavior blindly. |
| openai/whisper, https://github.com/openai/whisper                                                       | Canonical model sizes, English variants, FFmpeg dependency, Python/PyTorch path.                                                                                     | Use model size and memory wording as reference; require FFmpeg/Python/backend checks before native run.                                                            |
| ggml-org/whisper.cpp, https://github.com/ggml-org/whisper.cpp                                           | C/C++ implementation, CPU-only support, Windows/macOS/Linux support, quantization and VAD options.                                                                   | Candidate later for packaged native transcription after build, license, model, and update strategy are documented.                                                 |
| SYSTRAN/faster-whisper, https://github.com/SYSTRAN/faster-whisper                                       | CTranslate2 backend, lower memory, int8 quantization, CPU/GPU performance, PyAV decoding.                                                                            | Best candidate for first Python native runner after probe and model verification.                                                                                  |
| m-bain/whisperX, https://github.com/m-bain/whisperX                                                     | Word-level timestamps, forced alignment, VAD, diarization, batching.                                                                                                 | Treat as optional advanced timestamp/diarization lane. Diarization may require Hugging Face token/license acceptance.                                              |
| linto-ai/whisper-timestamped, https://github.com/linto-ai/whisper-timestamped                           | Word timestamps, confidence, VAD to reduce silence hallucination.                                                                                                    | Optional timestamp refinement lane; not a default dependency.                                                                                                      |
| jianfch/stable-ts, https://github.com/jianfch/stable-ts                                                 | Timestamp stabilization, silence suppression, VAD and gap adjustment.                                                                                                | Useful for later timestamp quality controls and warnings.                                                                                                          |
| jhj0517/Whisper-WebUI, https://github.com/jhj0517/Whisper-WebUI                                         | Backend choice, file/YouTube/microphone sources, SRT/WebVTT/TXT, VAD, diarization post-processing.                                                                   | Reinforces model/backend selection and export-state separation.                                                                                                    |
| Zackriya-Solutions/meetily, https://github.com/Zackriya-Solutions/meetily                               | Local-first meeting capture, local transcription/storage, desktop packaging, privacy posture, exports in paid/advanced lane.                                         | Reinforces privacy and local history rules. Do not add cloud summaries by default.                                                                                 |
| PVAS-Development/whisperdesk, https://github.com/PVAS-Development/whisperdesk                           | Drag/drop queue, batch resume, duplicate protection, retry failed items, FFmpeg requirement, many exports, local history/search.                                     | Strong pattern for later queue/history stability once single-file proof exists.                                                                                    |
| zackees/transcribe-anything, https://github.com/zackees/transcribe-anything                             | Multi-backend CLI, isolated backends, speaker JSON, cross-platform testing.                                                                                          | Useful CLI pattern if OpenStem later wraps an external backend, but output verification remains required.                                                          |
| soderstromkr/whisper-local-transcribe, https://github.com/soderstromkr/whisper-local-transcribe         | Simple local Tkinter GUI around faster-whisper.                                                                                                                      | Useful reminder that the first workflow should stay plain: choose file, choose model, run, save output.                                                            |
| literatecomputing/transcribe-with-whisper, https://github.com/literatecomputing/transcribe-with-whisper | Browser-local editor over VTT, regenerate HTML/DOCX after edits.                                                                                                     | Useful future reference for transcript correction/export refresh, not first pass.                                                                                  |
| pluja/whishper, https://github.com/pluja/whishper                                                       | 100% local suite, faster-whisper backend, TXT/JSON/VTT/SRT, subtitle editor, CPU/GPU support.                                                                        | Good local privacy/export reference. AGPL-3.0 requires care before code reuse.                                                                                     |
| kaixxx/noScribe, https://github.com/kaixxx/noScribe                                                     | GUI for Whisper plus pyannote, speaker identification, interview workflow.                                                                                           | Reinforces diarization as optional and dependency-heavy. GPL-3.0 requires care before code reuse.                                                                  |
| collabora/WhisperLive, https://github.com/collabora/WhisperLive                                         | Near-live transcription, microphone and pre-recorded files.                                                                                                          | Useful later for streaming design; not part of the first scaffold.                                                                                                 |

## Community Feedback Themes

- Whisper can hallucinate or repeat text during silence or low-speech sections. OpenStem should show confidence limits and consider VAD/timestamp refinement later.
- Word-level timestamps are difficult. Segment timestamps, word timestamps, and confidence should have separate states.
- Diarization is useful but not simple. It may be slow, imperfect, require extra models, or require gated model access.
- FFmpeg, CUDA, cuDNN, Python, PyTorch, model caches, and GPU wheels are frequent setup pain points.
- Long files and large directories need background execution, cancellation, queue persistence, retry, and output verification.
- Users value local privacy. Audio, transcript text, file paths, and history should stay local by default.
- Export support is workflow-critical, but PDF/DOCX/SRT/VTT/CSV should not be marked complete without real local writers and file verification.

## Strengths To Adapt

- Keep the first path simple: select input, select output, choose model, check readiness, run, verify outputs.
- Use clear model labels: speed, memory, accuracy, language, installed, verified.
- Separate file queue state from history state.
- Preserve a local history model that can search and retry later.
- Make export choices visible but honest.
- Use exact diagnostic codes for blocked states.

## Weaknesses To Avoid

- Do not let planned features appear active.
- Do not call browser preview local execution.
- Do not treat filenames as proof of output.
- Do not log transcript text by default.
- Do not silently download or bundle model weights.
- Do not rely on diarization unless the required model and license path are explicit.
- Do not let successful transcription alter separator proof or Beta status.

## Crash And Dependency Risks

- Long files can exhaust memory if processed as a single buffer.
- GPU installs are platform-specific and can fail silently if not probed.
- CUDA/cuDNN versions can mismatch faster-whisper or PyTorch requirements.
- WhisperX alignment and diarization can require additional language-specific models.
- PDF/DOCX export can fail on fonts, encodings, long transcripts, or locked output folders.
- Directory scans can duplicate work or overwrite outputs if naming is not deterministic.

## OpenStem Adaptation Plan

1. Keep the Local Transcription submenu separate from Audio Separator.
2. Start with an honest scaffold and readiness panel.
3. Add filename template validation now because it is pure and testable.
4. Add a native probe before any run button is enabled.
5. Add single-file TXT/JSON output before PDF/DOCX/subtitles.
6. Add PDF export only after TXT/JSON output is verified.
7. Add directory queue only after single-file cancellation/failure handling works.
8. Add timestamp/diarization lanes only when backend output supports them.
9. Keep release state Hardened Functional Alpha.
10. Keep Beta Candidate blocked until verified local AI E2E stem-separation proof passes.
