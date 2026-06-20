# Local Transcription Workflow

## Purpose

Local Transcription adds a speech-to-text workspace beside OpenStem's separator workflow. It helps a user plan local transcription jobs for audio or video files, choose a Whisper-family model, choose an output folder, preview safe export filenames, and later verify transcript outputs when a native runner exists.

This workspace is not stem separation. Transcription does not prove separator models, does not satisfy `proof:check`, and does not unblock Beta Candidate.

## Product Pattern

The useful pattern to adapt is a simple transcription dashboard: add files, choose language/model, choose output/export, run, show progress, keep local history, and export transcript formats. OpenStem adapts that pattern locally and honestly:

- no cloud upload by default,
- no copied branding,
- no fake account or unlimited-service claims,
- no fake local files,
- no fake history,
- no fake PDF export,
- no fake timestamps or speaker labels.

## User Path

Prefer this path:

Select input -> select output -> choose Whisper model -> check readiness -> run -> show progress -> show real outputs -> add local history.

The first implementation is an honest scaffold. Native transcription is marked `Planned / Not active` until Electron IPC and backend execution are wired.

## Voicebox Reference Adaptation

OpenStem inspected Voicebox as a local-first voice workflow reference at commit `b35b90961d5bc83a8b4e96e8b6ccde2a03152ff9`. No Voicebox source files were copied.

Useful adaptation:

- keep a capture/intake ledger for recordings, imported audio, VTT files, pasted transcripts, transcribed files, and prompt workflow outputs,
- keep original audio and imported files preserved unless the user explicitly deletes them,
- use metadata-only history by default,
- make re-transcribe, edit transcript, rename speakers, export/archive, regenerate output, and open folder first-class recovery actions,
- keep every completed record blocked until native file existence and nonzero size are verified.

Voicebox is a reference only. OpenStem is not affiliated with or endorsed by Voicebox, and transcription/capture features do not satisfy stem-separation proof.

## Input Modes

Supported or planned input modes:

- single audio file,
- multiple audio files,
- video file through FFmpeg,
- directory mode,
- recursive directory scan with explicit toggle,
- recent files and local history after real completed jobs.

Supported formats depend on FFmpeg or backend decoder support: WAV, MP3, M4A, MP4, MOV, AAC, FLAC, OGG, OPUS, WMA, AIFF, and other formats only after decoder support is verified.

If FFmpeg is missing, show: `FFmpeg required for audio/video decoding.`

## Model Options

Whisper model families to study or support:

- OpenAI Whisper,
- faster-whisper / CTranslate2,
- whisper.cpp GGML/GGUF,
- WhisperX,
- whisper-timestamped,
- stable-ts.

Model sizes:

- tiny,
- base,
- small,
- medium,
- large,
- turbo,
- tiny.en,
- base.en,
- small.en,
- medium.en.

Model labels must show model size, approximate RAM/VRAM need, speed estimate, accuracy estimate, language support, CPU usability, GPU recommendation, installed/missing state, hash verification state, and source/license status.

## Voicebox-Informed STT Model Ladder

OpenStem should preserve simple labels in the UI and keep technical details in the readiness panel:

- Fast: maps to `base` / `base.en` where available.
- Balanced: maps to `small` / `small.en` where available.
- Accurate: maps to `medium` / `medium.en` where available.
- Maximum Accuracy: maps to `large`, `large-v3`, or `turbo` where available.

Every lane starts as Missing / Not checked until the native backend, model file, source/license metadata, and hash state are known. A Whisper model lane is transcription readiness only; it does not verify separator model weights.

## Model Weights Policy

Do not bundle Whisper model weights unless licensing and package strategy are documented.

Do not commit model weights.

Do not mark a transcription model verified unless the local file exists and a SHA-256 check passes when an expected hash is available.

Whisper model readiness is separate from OpenStem separator model readiness.

## Readiness Codes

Use transcription-specific states:

- `WHISPER_MODEL_MISSING`
- `WHISPER_MODEL_INSTALLED_NOT_VERIFIED`
- `WHISPER_MODEL_HASH_VERIFIED`
- `WHISPER_BACKEND_NOT_INSTALLED`
- `WHISPER_BACKEND_READY`
- `WHISPER_FFMPEG_MISSING`
- `TRANSCRIPTION_INPUT_MISSING`
- `TRANSCRIPTION_OUTPUT_FOLDER_MISSING`
- `TRANSCRIPTION_READY`
- `TRANSCRIPTION_RUNNING`
- `TRANSCRIPTION_COMPLETE`
- `TRANSCRIPTION_FAILED`
- `TRANSCRIPTION_DRY_RUN_ONLY`
- `TRANSCRIPT_OUTPUT_NOT_VERIFIED`

These states must not be reused as source-separation proof states.

## Backend Readiness

Before native transcription can run, OpenStem must check:

- native Electron mode,
- input path exists,
- output folder exists and is writable,
- FFmpeg or backend decoder readiness,
- Python readiness if using Python backends,
- PyTorch readiness if needed,
- faster-whisper readiness if used,
- whisper.cpp executable readiness if used,
- selected model existence,
- selected model hash when an expected hash exists.

Browser preview cannot claim local files were read or written.

## Directory Mode

Directory mode must be non-destructive:

- no source-file deletion,
- no overwriting by default,
- no recursive scan without a clear toggle,
- skip already transcribed files only after deterministic output matching,
- queue preview before run,
- failed-file retry,
- pause/cancel only after subprocess safety is designed,
- one local history entry per completed file.

## History Model

History stays local and starts empty. A history entry requires a real completed native transcription job.

History fields should include transcript id, source file path/name, source duration, source size, model, backend, language, task, start/completion time, output folder, output files, status, error code, transcript path, PDF path, subtitle path, notes, session name, and session number.

Do not store transcript text in logs by default.

## Filename Template

Default PDF template:

```text
{safe_title}_session_number_{session_number}_{date}_{duration_min}_min.pdf
```

Example:

```text
Joe_Dirt_session_number_003_01-01-2026_124_min.pdf
```

Supported tokens:

- `{title}`
- `{safe_title}`
- `{session_number}`
- `{date}`
- `{time}`
- `{duration_min}`
- `{duration_hhmmss}`
- `{model}`
- `{language}`
- `{source_basename}`
- `{transcript_id}`
- `{folder}`
- `{status}`

Rules:

- sanitize invalid filename characters,
- block path traversal,
- avoid Windows reserved names,
- cap excessive length,
- reject unsupported tokens,
- add a safe duplicate suffix,
- preview before export.

`{folder}` and `{status}` are local metadata tokens only. They do not prove that a file moved folders, a job ran, or an output completed.

## Dashboard Pattern

The Local Transcription workspace uses a safe local-dashboard pattern:

- Recent Files starts empty.
- Folders include `Uncategorized` by default.
- New Folder is Planned / Not active.
- Bulk Export and Bulk Move are Planned / Not active.
- Verify Outputs requires native execution.
- No remote upload queue is active.

Mode labels are OpenStem labels: Fast, Balanced, Accurate, and Maximum Accuracy. They are planning labels until the native backend maps them to real model settings.

Language selection starts with Auto Detect and English options, then expands into popular, more, and other languages. Backend confidence and language output must come from the real transcription runner before being shown as verified.

Speaker recognition is Planned / Requires diarization backend. `DIARIZATION_BACKEND_MISSING` and `DIARIZATION_MODEL_MISSING` must stay visible until local dependencies and any required model/license path are documented.

Restore audio is a future pre-processing option, not transcription proof and not AI stem-separation proof.

## Export Policy

TXT and JSON are the safest first native exports.

PDF, DOCX, SRT, VTT, CSV, and HTML remain Planned / Not active until local writers and output verification exist.

PDF completion requires:

- file exists,
- file size is greater than 0,
- expected path matches output,
- generator returned success.

SRT and VTT require segment timestamps. CSV should contain structured segment rows. JSON should include backend, model, timestamps, warnings, errors, and verified output metadata.

## Document Import And Export

OpenStem also exposes a flexible document import/export policy for transcripts and prompt outputs. The separate document lane covers TXT, VTT, SRT, JSON transcript, PDF, DOCX, ODT, RTF, HTML, and MD import visibility, plus TXT, PDF, DOCX, ODT, RTF, HTML, JSON, SRT, and VTT export visibility.

The first honest import path is TXT/VTT local-first. PDF and DOCX require a reviewed local parser dependency before support can be claimed. ODT requires a validated external converter or a future local parser. No document parser uploads user files by default.

The first honest export path remains native TXT/JSON/VTT after file writing is wired. PDF and DOCX require local generators. ODT remains converter-gated. Every document export stays `DOCUMENT_OUTPUT_NOT_VERIFIED` until the file exists, size is greater than 0, extension matches, output folder policy passes, and overwrite policy allows the write.

Document import/export does not approve Beta Candidate and does not satisfy stem-separation proof.

## Automation Modes

Local Transcription supports three automation modes:

- Automatic: Run the full workflow with defaults.
- Manual: Let me confirm each step.
- Automatic then Review: Process now, edit title/speakers/export later.

Default mode: Automatic then Review.

Automatic work must remain reversible. The user can reopen an intake record and edit title, session number, date, speaker names, speaker map, transcript text, output filename template, export formats, destination folder, and overwrite policy.

The compact stage order is:

Source -> Intake -> Clean/Normalize -> Transcribe/Parse -> Edit Speakers/Title -> Export/Archive -> Done

Every stage must be pending, ready, running, complete, failed, or skipped.

Default overwrite policy: Ask before overwrite. Auto-overwrite remains off. Original VTT/audio files are not overwritten by default.

Auto-export settings are conservative: auto-create history record is on for metadata preview, TXT is the first intended export once native writers exist, PDF/DOCX remain off until stable local exporters are implemented, and final plain-text clipboard copy is off by default.

## Automation Checkpoints

Local Transcription also exposes checkpoint-based automation controls:

- Start automation
- Continue from here
- Stop after this step
- Run selected steps
- Rerun this step
- Skip this step
- Manual review required
- Open output
- Regenerate downstream outputs

The checkpoint stage list is:

Source Intake -> Recording Complete -> Audio Saved -> Audio Normalized -> Transcription Ready -> Whisper Transcription Complete -> Transcript Preview -> Speaker Review -> Title / Filename Review -> Transcript Archive Saved -> Transcript Export Saved -> Prompt Library Selected -> Prompt Workflow Complete -> Prompt Output Review -> Prompt Output Export Saved -> Workflow Complete

Default stop point: Transcript Preview.

Automation presets:

- Full Auto
- Stop at Transcript
- Stop at Rename
- Export Only
- Prompt Only
- Manual Review

Start-from-source options include recorded audio, imported audio, imported VTT, imported TXT, imported SRT, pasted transcript, and existing history item.

Transcript Preview Box is scrollable and editable. Prompt Output Box is scrollable and line-break oriented. Editing transcript text, speaker names, title, session number, date, or filename template marks downstream exports or prompt outputs `Regenerate recommended` until the user chooses regenerate.

Metadata-only history must not store transcript text.

File-writing checkpoints remain `Output Not Verified` until native Electron verifies file existence, nonzero size, expected extension, selected output folder, and overwrite policy.

## Timestamp And Diarization Policy

Segment timestamps can be shown only if a backend returns segment timing.

Word timestamps can be shown only if a backend returns word timing.

Diarization is optional and must be honest. WhisperX plus pyannote or similar systems may require extra model weights, license acceptance, or a Hugging Face token. Do not silently download gated models.

Speaker labels should be marked estimated unless there is stronger verified evidence.

## Privacy Rules

- Keep processing local.
- Do not upload source audio.
- Do not upload transcripts.
- Do not log transcript text by default.
- Do not use telemetry for file paths or transcript content.
- Let the user choose output location.
- Let the user delete local history entries without deleting source files.
- Keep cloud connectors out of the default transcription path.

## Proof Boundaries

Transcription is not stem separation proof.

Whisper transcription does not prove OpenStem separator models.

PDF export does not prove stem separation.

Release state remains Hardened Functional Alpha.

Local transcription does not approve Beta Candidate. Beta status is governed by separator proof evidence and final release checklist review.

## Future Work

Safe next implementation order:

1. Add a native probe for FFmpeg, Python, and selected Whisper backend.
2. Add single-file local transcription using TXT and JSON output first.
3. Verify output files by path and nonzero size.
4. Add PDF export after TXT/JSON are stable.
5. Add directory queue only after single-file cancellation and failure handling are proven.
6. Add history persistence with transcript-text logging disabled by default.
