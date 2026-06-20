---
name: transcription-intake-workflow
description: Use when modifying recording, microphone input, imported audio sessions, VTT/Zoom transcript import, speaker renaming, transcript file renaming, archive/export folders, one-click export, and local transcription intake.
---

# Transcription Intake Workflow

Use this skill for OpenStem recording, transcript import, speaker-label cleanup, and archive/export work.

## Core Boundaries

- Recording/import/export is not stem separation.
- Recording/import/export does not approve Beta Candidate.
- Browser mode cannot claim durable local file creation unless native save succeeds.
- Native Electron mode is required for verified file writes.
- VTT import must parse timestamps and text locally.
- Speaker rename must be editable and reversible.
- Speaker labels must not be treated as diarization unless diarization actually ran.
- Imported files must not be deleted or overwritten by default.
- Export success requires output file existence and nonzero size.
- Archive/export folders must be user-visible and user-controlled.
- Do not upload audio or transcript text by default.
- Do not log transcript text by default.
- Do not copy third-party transcript-service branding.
- Do not satisfy stem-separation proof.

## Preferred User Flow

Prefer this local-first path:

Record or import -> rename -> verify -> transcribe or parse -> rename speakers -> export/archive -> history.

If any native writer, recorder, parser, or exporter is missing, label it `Native required`, `Planned / Not active`, or the exact structured diagnostic code.

## Required States

- Recording: `MIC_PERMISSION_NEEDED`, `MIC_PERMISSION_DENIED`, `MIC_INPUT_NOT_SELECTED`, `RECORDING_OUTPUT_NOT_VERIFIED`.
- Normalizer: `NORMALIZER_FFMPEG_MISSING`, `NORMALIZED_OUTPUT_NOT_VERIFIED`.
- VTT: `VTT_FILE_MISSING`, `VTT_PARSE_FAILED`, `VTT_IMPORTED`, `VTT_SPEAKERS_DETECTED`, `VTT_NO_SPEAKERS_DETECTED`.
- Speaker labels: `SPEAKER_LABELS_DETECTED`, `SPEAKER_RENAME_READY`, `SPEAKER_RENAME_APPLIED`, `SPEAKER_LABELS_NOT_FOUND`.
- Archive/export: `ARCHIVE_EXPORT_READY`, `ARCHIVE_EXPORT_FAILED`, `EXPORT_OUTPUT_NOT_VERIFIED`, `EXPORT_OUTPUT_ZERO_BYTES`.

## Folder Rules

- Use platform-safe app data paths or user-selected folders.
- Show source folders separately from archive/export folders.
- Do not hardcode personal user folders.
- Do not hide surprise output folders.
- Do not overwrite exports without a policy.
- Do not delete source files by default.

## Export Rules

- TXT, JSON, and renamed VTT are the safest first native writers.
- PDF and DOCX remain `Planned / Not active` unless implemented with local writers and output verification.
- A filename preview is not a completed export.
- A native write result is not enough by itself; verify path existence and nonzero size.

## Privacy Rules

- Use synthetic fixtures for tests.
- Do not commit recordings, transcripts, exports, HAR files, or private paths.
- Do not log transcript text by default.
- Keep cloud upload disabled by default.
