# Workflow Run Ledger

The Workflow Run Ledger is the recovery layer for Local Transcription and Transcript Workflow Builder. It records workflow metadata, verified artifacts, prompt output state, failed stages, and user edits so the app can continue, rerun, regenerate, or recover without pretending an output exists.

Release state remains Hardened Functional Alpha. The ledger is not stem-separation proof and does not approve Beta Candidate.

## Workflow Run Record

Each workflow run record tracks:

- workflowRunId
- sourceType: recording, imported_audio, imported_vtt, pasted_text, or existing_history
- sourceOriginalPath
- sourceManagedPath
- sourceDuration
- sourceSize
- sourceFormat
- transcriptTextPath
- transcriptPreviewText
- parsedSegmentsPath
- speakerMap
- title
- sessionNumber
- date
- selectedPromptLibraryId
- selectedPromptTemplateName
- selectedModelId
- workflowMode: automatic, manual, or automatic_then_review
- checkpointStatuses
- generatedFiles
- exportFiles
- promptOutputs
- lastCompletedStage
- currentStage
- failedStage
- errorCode
- createdAt
- updatedAt
- reviewedByUser
- notes

Metadata-only history is the default. It can save source paths, artifact paths, speaker maps, selected prompt library, checkpoint statuses, and export state without saving full transcript text. Full-history mode is opt-in.

## Artifact Records

Each artifact record tracks:

- artifactId
- artifactType: recording, normalized_audio, imported_copy, parsed_transcript, renamed_vtt, txt_export, pdf_export, docx_export, json_export, or prompt_output
- path
- format
- sizeBytes
- createdAt
- verified
- verificationError
- sourceStage
- overwrittenPreviousFile
- previousVersionPath when applicable

Output success requires a real file, size greater than zero, the expected extension, and a recorded verification result. Filename matches alone are not enough.

## Checkpoint States

The ledger stores checkpointStatuses for every shared checkpoint in the transcription-to-prompt pipeline:

- Source Intake
- Recording Complete
- Audio Saved
- Audio Normalized
- Transcription Ready
- Whisper Transcription Complete
- Transcript Preview
- Speaker Review
- Title / Filename Review
- Transcript Archive Saved
- Transcript Export Saved
- Prompt Library Selected
- Prompt Workflow Complete
- Prompt Output Review
- Prompt Output Export Saved
- Workflow Complete

Checkpoint states can be Ready, Running, Complete, Needs Review, Failed, Output Not Verified, Blocked, Skipped, Waiting, or Not Started. File-writing checkpoints remain Output Not Verified until artifact verification passes.

## Resume Behavior

The ledger supports:

- continue from last completed stage
- rerun failed stage
- rerun one selected stage
- regenerate exports after edits
- regenerate prompt output after prompt-template changes
- restore previous export if overwrite failed
- save as new copy
- overwrite previous export only when policy allows
- clear failed stage and retry

Failed later stages must not erase completed earlier outputs, parsed transcript text, speaker maps, prompt edits, or user metadata.

## Regenerate Recommended Behavior

User edits are versioned so downstream work can be flagged without overwriting prior results:

- transcript text marks prompt outputs and transcript exports `REGENERATE_RECOMMENDED`
- speaker names mark archive, PDF, DOCX, TXT, JSON, and renamed VTT outputs `REGENERATE_RECOMMENDED`
- title, session number, date, or filename template marks export filenames `REGENERATE_RECOMMENDED`
- prompt library or prompt template changes mark prompt output `REGENERATE_RECOMMENDED`
- prompt output edits mark prompt output exports `REGENERATE_RECOMMENDED`

The app should recommend regeneration, not automatically overwrite old outputs.

## Overwrite Policy

Original source files are never overwritten by default. Imported files are copied only if the user chooses copy-to-library. Exports overwrite only when the selected overwrite policy allows it.

Prior successful export remains until a replacement is verified. If a replacement export fails, the previous successful artifact stays recorded and recoverable.

## Workflow Status Panel

The first UI layer should use simple labels:

- Ready
- Running
- Complete
- Needs Review
- Failed
- Regenerate Recommended
- Output Verified
- Output Missing

The panel should show current stage, last completed stage, next recommended action, completed artifacts, failed artifacts, regenerate recommended artifacts, open output folder, continue automation, rerun failed step, edit title or speakers, and export again.

## Voicebox Capture Ledger Mapping

OpenStem inspected Voicebox's capture workflow as a reference for local recording/import/transcription history. No Voicebox source code was copied.

The Workflow Run Ledger should map capture/intake records into the same recovery layer:

- capture id maps to `workflowRunId`,
- source type maps to `sourceType`,
- original file path maps to `sourceOriginalPath`,
- managed local path maps to `sourceManagedPath`,
- transcript path maps to `transcriptTextPath` or `parsedSegmentsPath`,
- duration maps to `sourceDuration`,
- language and model used map to workflow notes or selected model metadata until first-class fields are added,
- status maps to `checkpointStatuses`, `currentStage`, `failedStage`, and simple status labels,
- retries and errors map to failed-stage recovery metadata,
- linked exports map to `exportFiles`,
- linked prompt outputs map to `promptOutputs`.

Capture actions should route through ledger controls: replay source audio, re-transcribe, edit transcript inline, rename speakers, rename title/session, send to prompt workflow, export/archive, regenerate output, and open folder.

Completion still requires artifact verification. Filename matches, queue completion, and optimistic status labels are not enough.

## Workflow Presets

Presets only change checkboxes, stage behavior, stop points, and default export formats. The user can customize them.

Required presets:

1. Fast Transcript Only
2. Archive Transcript
3. Prompt Output Only
4. Full Auto then Review
5. Manual Step-by-Step

## Privacy And Proof Boundary

Transcript text is not logged by default. Workflow metadata can be saved without transcript content. Cloud processing is disabled by default.

The Workflow Run Ledger does not satisfy `proof:check`. It does not prove local AI stem separation, model integrity, FFmpeg readiness, or backend readiness. It does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.
