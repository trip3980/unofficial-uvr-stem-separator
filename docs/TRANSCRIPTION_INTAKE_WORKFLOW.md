# Transcription Intake Workflow

This document defines the OpenStem Local Transcription intake path for recording, imported audio, VTT transcript import, speaker-label rename, and archive/export planning.

Release state remains Hardened Functional Alpha. This workflow is not AI stem-separation proof and does not approve Beta Candidate.

## Product Principle

Prefer the simple path:

Record or import -> rename -> verify -> transcribe or parse -> rename speakers -> export/archive -> history.

For the main separator workflow, continue to prefer:

Select input -> select output -> choose model -> check readiness -> run -> show progress -> show real outputs.

## Top-Level UI

The Local Transcription workspace should show `Record or Import` before Whisper model choices. It has three visible lanes:

1. In-Session Recording
2. Imported Audio Sessions
3. Transcript/VTT Intake

These lanes must not be hidden in settings.

## Automation Modes

Show a workflow mode selector near the top of Local Transcription:

- Automatic: Run the full workflow with defaults.
- Manual: Let me confirm each step.
- Automatic then Review: Process now, edit title/speakers/export later.

Default: Automatic then Review.

Automation is allowed to reduce friction, but every step must remain recoverable and editable. Native file writes, recording outputs, and exports still require verification before completion.

## In-Session Recording

Required controls:

- microphone input selector,
- refresh input devices,
- input status,
- Low / Medium / High recording quality,
- Make speech louder for transcription,
- Start Recording,
- Stop Recording,
- Pause if safe,
- timer,
- file name preview,
- recordings folder selector,
- open recordings folder.

Current status:

- Recording is an honest scaffold.
- Browser preview must not claim durable files.
- Native Electron mode is required before recording output can be verified.
- Do not promise WAV unless FFmpeg conversion and output verification pass.

Diagnostic states:

- `MIC_PERMISSION_NEEDED`
- `MIC_PERMISSION_DENIED`
- `MIC_INPUT_NOT_SELECTED`
- `RECORDING_OUTPUT_NOT_VERIFIED`
- `RECORDING_FOLDER_MISSING`
- `RECORDING_FOLDER_NOT_WRITABLE`

Audacity reference translation:

- Treat recording as its own visible workflow, not a hidden side effect.
- Device selection, quality preset, timer, save location, and recovery state should be visible.
- A saved recording is complete only after the native file exists and size is greater than 0.
- Recording can be sent to transcription or Mastering Lab only after source preservation and output verification.
- OpenStem should not become a full multitrack editor.

## Imported Audio Sessions

Required controls:

- import audio/video file,
- import folder,
- include subfolders toggle,
- copy into Imported Audio Sessions folder toggle,
- keep original location toggle,
- imported audio folder selector,
- verify files,
- open imported audio folder.

Rules:

- Source files are not deleted by default.
- Source files are not moved by default.
- Copy success requires native write verification.
- Audio import does not create transcript output by itself.

## Transcript/VTT Intake

Required controls:

- import VTT file,
- import transcript TXT,
- import SRT if supported,
- import folder of VTT files,
- source VTT folder selector,
- parsed transcript preview,
- rename session,
- rename speakers,
- export/archive folder selector,
- one-click export after rename.

Current implementation:

- VTT text parsing exists in `src/services/vttTranscriptImport.ts`.
- The parser validates the `WEBVTT` signature.
- The parser preserves timestamp order and cue text.
- Speaker-label detection supports simple `Speaker 1: text` and WebVTT voice-tag style cues.
- Speaker rename changes labels only and does not claim diarization.
- Native file writes are still required for real archive/export completion.

## Default Folder Policy

Use platform-safe app-data paths or user-selected paths:

- `{userData}/OpenStem/Transcription/In-Session Recordings`
- `{userData}/OpenStem/Transcription/Imported Audio Sessions`
- `{userData}/OpenStem/Transcription/Imported VTT Transcripts`
- `{userData}/OpenStem/Transcription/Renamed Transcript Archive`
- `{userData}/OpenStem/Transcription/Exports/PDF`
- `{userData}/OpenStem/Transcription/Exports/DOCX`
- `{userData}/OpenStem/Transcription/Exports/TXT-JSON-SRT-VTT`

Rules:

- no hardcoded personal user folders,
- folder path must be visible,
- user can change folder,
- user can reset to default later,
- folder creation failure must be clear,
- no hidden surprise output folders.

## Normalizer

User-facing label:

Make speech louder for transcription

Rules:

- If FFmpeg is available, normalization should create a copy.
- Do not replace the original by default.
- Output file must be verified.
- If FFmpeg is missing, show `NORMALIZER_FFMPEG_MISSING`.
- If not implemented, show `NORMALIZER_NOT_AVAILABLE` or Planned / Not active.

This aligns with the shared audio effect-chain policy: normalization creates a copy, keeps the original, depends on real backend readiness, and never counts as stem-separation proof.

## Filename Templates

Supported tokens include:

- `{safe_title}`
- `{title}`
- `{source_basename}`
- `{session_number}`
- `{date}`
- `{time}`
- `{duration_min}`
- `{duration_hhmmss}`
- `{speaker_count}`
- `{transcript_id}`
- `{folder}`

Default templates:

- VTT archive: `{safe_title}_session_{session_number}_{date}_{duration_min}_min_renamed.vtt`
- PDF export: `{safe_title}_session_{session_number}_{date}_{duration_min}_min.pdf`
- DOCX export: `{safe_title}_session_{session_number}_{date}_{duration_min}_min.docx`
- TXT export: `{safe_title}_session_{session_number}_{date}_{duration_min}_min.txt`

Filename preview is not export success.

## Privacy

- Do not upload audio or transcript text by default.
- Do not log transcript text by default.
- Use synthetic fixtures in tests.
- HAR files, recordings, transcripts, and exports must not be committed.
- Cloud PHI processing remains disabled by default and requires explicit consent plus a BAA-required path.

## Browser / Native Boundary

Browser preview can show planned paths, filename previews, and parsed synthetic VTT text.

Native Electron mode is required for:

- durable recording output,
- reading arbitrary local VTT files by path,
- copying imported audio,
- writing archive files,
- writing TXT/JSON/VTT/PDF/DOCX exports,
- verifying output path and nonzero size.

## Post-Processing And Regeneration

After import, parse, or transcription, the user should be able to edit title, session number, date, speaker labels, transcript text, filename template, export formats, destination folder, and overwrite policy.

Actions should include Save changes, Regenerate exports, Export to same folder, Export to new folder, Overwrite previous export, Save as new export, Open export folder, Reset speaker names, and Restore original transcript.

Default overwrite policy: Ask before overwrite. Auto-overwrite remains off.
