# Transcription Automation Workflow

OpenStem Local Transcription supports three user-facing workflow modes so the app can handle routine steps without trapping the user in a fragile wizard.

Release state remains Hardened Functional Alpha. Automated transcription intake, VTT parsing, recording, export/archive, and history records are not stem-separation proof and do not approve Beta Candidate.

## Modes

Automatic:

- User label: Run the full workflow with defaults.
- Purpose: OpenStem advances through every step that has real native support and verification.
- Boundary: native recording, transcription, and export writers must pass before completion can be shown.

Manual:

- User label: Let me confirm each step.
- Purpose: user confirms source, title, speaker names, transcript text, export formats, folders, and overwrite policy before continuing.
- Boundary: no step is skipped silently.

Automatic then Review:

- User label: Process now, edit title/speakers/export later.
- Purpose: default mode. OpenStem does the low-risk work first, then lets the user clean up session metadata, speaker labels, transcript text, filename, export format, and destination later.
- Boundary: automatic work remains recoverable and editable.

Default mode: Automatic then Review.

## Voicebox-Informed Queue And Recovery

OpenStem inspected Voicebox as a reference for serialized local job queues, retry behavior, cancel behavior, and stale task recovery. No Voicebox code was copied.

OpenStem should apply the pattern to:

- transcription jobs,
- normalization jobs,
- VTT parsing jobs,
- export jobs,
- prompt workflow jobs,
- mastering jobs.

Required job diagnostics:

- `JOB_QUEUED`
- `JOB_RUNNING`
- `JOB_COMPLETE`
- `JOB_FAILED`
- `JOB_CANCELED`
- `JOB_RETRY_READY`
- `JOB_STALE_RECOVERED`
- `JOB_OUTPUT_NOT_VERIFIED`

Queue completion is not output verification. A job can finish and still remain `JOB_OUTPUT_NOT_VERIFIED` until the output path exists, file size is greater than 0, extension matches, and overwrite/folder policy passes.

## Flow Bar

Show a compact flow bar near the top of Local Transcription:

Source -> Intake -> Clean/Normalize -> Transcribe/Parse -> Edit Speakers/Title -> Export/Archive -> Done

Each stage can be:

- pending,
- ready,
- running,
- complete,
- failed,
- skipped.

The UI should show the next obvious action without making the user understand backend details.

## Checkpoint Automation

The detailed checkpoint layer expands the compact flow into a resumable pipeline:

Source Intake -> Recording Complete -> Audio Saved -> Audio Normalized -> Transcription Ready -> Whisper Transcription Complete -> Transcript Preview -> Speaker Review -> Title / Filename Review -> Transcript Archive Saved -> Transcript Export Saved -> Prompt Library Selected -> Prompt Workflow Complete -> Prompt Output Review -> Prompt Output Export Saved -> Workflow Complete

Each stage exposes include-in-automation, stop-after-stage, status, review/edit, rerun, and safe skip behavior.

Default stop point: Transcript Preview.

The user can start from recorded audio, imported audio, imported VTT, imported TXT, imported SRT, pasted transcript, or an existing history item. Continue from here resumes from the last completed checkpoint. Run selected steps and Rerun this step must not rerun earlier successful stages unless the user chooses that.

Manual transcript or speaker edits mark downstream stages `Regenerate recommended`; they do not automatically overwrite prior exports.

## VTT Automation Pipeline

1. Select VTT file or source VTT folder.
2. Verify file exists and extension is `.vtt`.
3. Parse VTT locally.
4. Detect timestamps.
5. Detect speaker labels if present.
6. Generate default session title from filename.
7. Generate default session number if configured.
8. Generate safe renamed archive filename.
9. Save a renamed archive copy only when native writer support is available and automatic export is enabled.
10. Export selected formats only when local writers are implemented.
11. Verify every output file exists and size is greater than 0.
12. Create a history entry only after verified output exists; browser preview may show metadata preview.
13. Allow edit of title, speaker names, session number, transcript text, and export settings later.
14. Allow regenerate export.

If parsing fails:

- keep original file,
- show `VTT_PARSE_FAILED`,
- allow retry,
- allow manual text import,
- preserve completed earlier steps.

## Recording Automation Pipeline

1. Select microphone input.
2. Select recording quality: Low / Medium / High.
3. Choose normalizer on/off.
4. Start recording.
5. Stop recording.
6. Save recording to In-Session Recordings folder.
7. Verify recording file exists and size is greater than 0.
8. Normalize audio copy if enabled and FFmpeg is ready.
9. Verify normalized output if created.
10. Send recording or normalized copy to transcription queue if auto-transcribe is enabled.
11. Transcribe only if local backend is ready.
12. Save transcript outputs.
13. Create history entry.
14. Allow later edits and regenerated exports.

Current status: recording remains Planned / Not active until native recording and file verification are implemented.

## Imported Audio Automation Pipeline

1. Select audio/video file or folder.
2. Verify file exists through native Electron.
3. Read metadata if FFmpeg is ready.
4. Let user choose copy-to-library or keep original location.
5. If copy is selected, copy to Imported Audio Sessions folder.
6. Verify copied file exists and size is greater than 0.
7. Normalize a copy if enabled.
8. Send to transcription queue if auto-transcribe is enabled.
9. Create history entry after verified outputs exist.
10. Allow edit/export later.

Rules:

- never delete imported original by default,
- never move original unless user explicitly chooses move,
- copy operation must verify output,
- failed copy must not corrupt original.

## Post-Processing Editor

The user must be able to reopen a completed or partial intake record and edit:

- title,
- session number,
- date,
- speaker names,
- speaker map,
- transcript text,
- output filename template,
- export formats,
- destination folder,
- overwrite policy.

Actions:

- Save changes
- Regenerate exports
- Export to same folder
- Export to new folder
- Overwrite previous export
- Save as new export
- Open export folder
- Reset speaker names
- Restore original transcript

Do not force the user to restart the workflow to rename a title or speaker.

## Overwrite And Resave Behavior

Options:

- Never overwrite
- Ask before overwrite
- Overwrite previous export
- Save new copy with suffix

Default: Ask before overwrite.

Rules:

- original source VTT/audio is not overwritten by default,
- archive copy can be overwritten only if user chooses,
- export files can be overwritten only if overwrite policy allows,
- history should record whether export was overwritten or saved as new copy,
- failed overwrite should preserve previous good export where possible.

## Auto-Export Settings

Defaults:

- Auto-create history record: on for metadata preview; completed history requires verified output.
- Auto-export after VTT import: off until native writers are wired.
- Auto-export after recording transcription: off until recording/transcription writes are verified.
- Auto-export after imported audio transcription: off until transcription writes are verified.
- Auto-export TXT: selected as the first intended format once implemented.
- Auto-export PDF: off until PDF exporter is stable.
- Auto-export DOCX: off until DOCX exporter is stable.
- Auto-open export folder after export: off.
- Auto-copy final plain text to clipboard: off.
- Auto-overwrite: off.

Do not enable risky automation by default.

## Folder Policy

Visible folders:

1. In-Session Recordings
2. Imported Audio Sessions
3. Imported VTT Source Folder
4. Renamed Transcript Archive
5. Transcript Export Folder
6. PDF Export Folder
7. DOCX Export Folder

Every folder should show path display, choose folder, open folder, reset to default, and status: ready, missing, or not writable.

Use platform-safe paths. Do not hardcode Windows-only paths.

## History Integration

Every intake workflow should be able to create a local history record with:

- source type: recording / imported audio / VTT,
- original file path,
- managed copy path if any,
- archive path,
- export paths,
- title,
- session number,
- speaker map,
- duration,
- created/imported date,
- last edited date,
- workflow mode,
- status,
- overwrite history,
- errors.

The Workflow Run Ledger is the concrete recovery layer for this history record. It stores metadata-only workflow runs by default, including source paths, managed paths, transcript artifact paths, parsed segment paths, speaker map, title, session number, selected prompt library, selected model, checkpoint statuses, generated files, export files, prompt outputs, last completed stage, current stage, failed stage, error code, reviewed-by-user state, and notes.

The ledger supports continue from last completed stage, rerun failed stage, rerun one selected stage, regenerate exports after edits, regenerate prompt output after prompt-template changes, restore previous export if overwrite failed, save as new copy, overwrite previous export only when policy allows, and clear failed stage and retry.

Workflow Status should show simple first-layer labels: Ready, Running, Complete, Needs Review, Failed, Regenerate Recommended, Output Verified, and Output Missing. Technical diagnostic codes stay in details.

History actions:

- reopen,
- edit metadata,
- rename speakers,
- regenerate exports,
- open source,
- open archive,
- open export folder,
- remove from history,
- delete managed copy only with confirmation.

## Privacy And Proof Boundaries

- Do not upload audio or transcript text by default.
- Do not log transcript text by default.
- Browser preview can show synthetic examples and metadata previews only.
- Native Electron mode is required for durable file writes and verification.
- Passing this workflow is not AI stem-separation proof.
- Transcription automation does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.
