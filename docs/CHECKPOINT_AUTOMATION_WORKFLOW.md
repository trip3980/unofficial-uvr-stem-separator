# Checkpoint Automation Workflow

OpenStem checkpoint automation lets a user automate transcription, transcript cleanup, export, and prompt workflow stages without losing control. The user can stop after any stage, review or edit the result, resume from a completed checkpoint, or rerun one step without restarting the whole workflow.

Release state remains Hardened Functional Alpha. Checkpoint automation is not stem separation proof and does not approve Beta Candidate.

## Stage List

The shared checkpoint pipeline is:

1. Source Intake
2. Recording Complete
3. Audio Saved
4. Audio Normalized
5. Transcription Ready
6. Whisper Transcription Complete
7. Transcript Preview
8. Speaker Review
9. Title / Filename Review
10. Transcript Archive Saved
11. Transcript Export Saved
12. Prompt Library Selected
13. Prompt Workflow Complete
14. Prompt Output Review
15. Prompt Output Export Saved
16. Workflow Complete

Each stage tracks id, label, description, input requirements, output artifacts, automation enabled, stop-after-stage, rerun ability, skip ability, status, error code, user message, timestamps, and verification result.

## Modes

Automatic runs enabled stages as far as real native support and verification allow.

Manual stops at major checkpoints so the user can inspect title, speakers, transcript text, prompt choices, folders, and exports.

Automatic then Review is the default. It runs low-risk stages first, then stops at Transcript Preview for new users so transcript text, title, speakers, and exports can be cleaned up later.

Default stop point: Transcript Preview.

## Checkpoint Toggles

Each visible row should expose:

- include in automation,
- stop after this stage,
- status badge,
- review or edit action when relevant,
- rerun this step after completion or failure,
- skip this step only when the step is safe to skip.

Presets simply set these toggles:

- Full Auto
- Stop at Transcript
- Stop at Rename
- Export Only
- Prompt Only
- Manual Review

The user can customize the toggles after choosing a preset.

## Start From Source

Recorded audio starts after recording stops, then requires verified audio save before normalization, transcription, preview, export, or prompts can continue.

Imported audio starts after native file verification. Copy-to-library and normalization are optional, non-destructive, and require output verification.

Imported VTT starts from local VTT verification and parsing, then continues to transcript preview, speaker review, archive/export, and prompt stages.

Pasted transcript starts from a non-empty text validation, then can continue to prompt library or export.

Existing history items reload saved checkpoint state and can resume from the last completed checkpoint or rerun a failed/export/prompt step.

## Review Boxes

Transcript Preview uses a scrolling text box for parsed VTT text, pasted transcript text, or future Whisper output. Editing transcript text marks downstream exports and prompt outputs `Regenerate recommended`.

Prompt Output Review uses scrolling section output boxes separated by line breaks. Editing prompt output does not rerun a local model unless the user chooses rerun.

## Stop, Resume, And Rerun

Stop-after-stage pauses automation after the selected checkpoint and marks the next step ready or waiting.

Continue from here resumes from a selected completed checkpoint.

Run selected steps runs only checked stages.

Rerun this step reruns one completed or failed stage without rerunning earlier successful checkpoints.

Failed later stages must preserve earlier verified outputs, parsed transcript text, speaker maps, prompt edits, and user metadata.

## Downstream Regeneration

Editing transcript text marks transcript exports and prompt outputs `Regenerate recommended`.

Editing speaker names marks transcript archive and export outputs `Regenerate recommended`.

Editing title, session number, date, or filename template marks archive/export filenames `Regenerate recommended`.

Manual edits update downstream outputs only after the user chooses regenerate.

## Overwrite And Resave

Default overwrite policy is Ask before overwrite.

Original imported VTT/audio is never overwritten by default. Managed archive copies and export files can be overwritten only when policy allows it. Previous good exports should remain in place until replacement output is verified.

## History And Resume

History state should include source type, source path, managed source path, normalized path, transcript text path, parsed segments path, speaker map, title/session metadata, selected prompt library, section outputs, export paths, checkpoint statuses, last completed stage, failed stage, overwrite history, and user edits.

Metadata-only history must not store transcript text.

The Workflow Run Ledger is the shared recovery record for this history state. It keeps current stage, last completed stage, failed stage, verified artifacts, regenerate-recommended artifacts, prompt outputs, selected prompt library, and user edits together so the app can continue automation, rerun a failed stage, rerun one selected stage, regenerate exports, or regenerate prompt output without restarting the whole workflow.

## File Verification

File-writing stages require:

- file exists,
- size is greater than 0,
- extension matches expected,
- path is inside the selected/default output folder unless the user chose another folder,
- no overwrite occurred unless policy allowed it.

Stages requiring verification include recorded audio save, normalized audio save, copied imported audio, renamed VTT archive, TXT export, PDF export, DOCX export, JSON export, and prompt output export.

Browser preview can show planned paths only. Native Electron mode is required for durable writes and verification.

Document import/export checkpoints use the same rule. PDF, DOCX, ODT, RTF, HTML, TXT, JSON, SRT, and VTT rows may be visible, but they remain `DOCUMENT_OUTPUT_NOT_VERIFIED` until the native or validated converter path proves a real nonzero output file. External office converters must be user-configured, path-validated, and run with safe argument arrays.

Ledger artifact records must preserve previous successful exports until the replacement file is verified. Failed later stages must not erase earlier verified artifacts. Output success requires file exists, size greater than 0, expected extension, and recorded verification.

## Privacy And Proof Boundaries

Do not upload audio or transcript text by default.

Do not log transcript text by default.

Checkpoint automation does not satisfy `proof:check`.

Checkpoint automation does not approve Beta Candidate. Beta status is governed by separator proof evidence and final release checklist review.
