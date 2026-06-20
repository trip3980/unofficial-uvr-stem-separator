---
name: local-transcription-workflow
description: Use when modifying the Local Transcription workspace, Whisper model management, timestamp handling, diarization, PDF/DOCX/TXT/SRT/VTT export, directory transcription, transcript history, or TurboScribe-style local dashboard behavior.
---

# Local Transcription Workflow

Use this skill for OpenStem speech-to-text work.

## Boundaries

- Transcription is not stem separation.
- Transcription does not approve Beta Candidate.
- Whisper model readiness is separate from separator model readiness.
- PDF export is not AI proof.
- Browser mode cannot claim local files were written.
- Local transcription requires native backend execution.
- Output success requires file existence and nonzero size.
- Whisper weights must not be committed.
- Model downloads/imports need source, license, and hash metadata when used as verified assets.
- Directory mode must not destructively alter source files.
- History must be local and privacy-aware.
- Timestamps and diarization must not be faked.
- HAR captures are sensitive reference artifacts. Do not commit HAR files, copy cookies, auth headers, session IDs, transcript IDs, private file names, raw request bodies, raw response bodies, or proprietary endpoints into OpenStem.

## Required Flow

Prefer this path:

Select input -> select output -> choose Whisper model -> check readiness -> run native backend -> show progress -> verify real outputs -> add local history.

If a native runner is not wired, label the workflow `Planned / Not active` or `Browser Preview / Not runnable`.

## Readiness Checks

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
- `TRANSCRIPTION_BROWSER_PREVIEW_ONLY`
- `TRANSCRIPTION_CANCELED`
- `DIARIZATION_BACKEND_MISSING`
- `DIARIZATION_MODEL_MISSING`
- `PDF_EXPORT_NOT_READY`
- `PDF_EXPORT_COMPLETE`
- `PDF_OUTPUT_NOT_VERIFIED`
- `TRANSCRIPT_OUTPUT_NOT_VERIFIED`

Keep these separate from OpenStem separator model and proof states.

## Export Rules

- TXT and JSON are the safest first native exports.
- PDF, DOCX, HTML, SRT, VTT, and CSV remain Planned / Not active until local writers and output verification are implemented.
- SRT, VTT, and CSV require backend timestamps.
- PDF completion requires a real file, size greater than 0, and expected path match.
- Never show predicted filenames as completed exports.
- Filename templates may use `{folder}` and `{status}` only as local metadata tokens. They do not prove folder moves, processing status, or output completion.

## Privacy Rules

- Do not upload user audio or transcripts.
- Do not store transcript text in logs by default.
- Keep transcript history local.
- Do not expose private local paths in exported files unless the user chooses that behavior.
- Deleting a history entry must not delete source audio unless explicitly designed and confirmed.
