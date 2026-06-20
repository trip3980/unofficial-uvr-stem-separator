---
name: checkpoint-automation-workflow
description: Use when modifying workflow checkpoints, automation toggles, stage stop/start behavior, resume behavior, review points, rerun-one-step behavior, or multi-stage transcription/prompt/export pipelines.
---

# Checkpoint Automation Workflow

Use this skill for OpenStem transcription-to-export-to-prompt pipelines where the user can automate routine stages but still stop, review, edit, resume, or rerun one step.

## Core Rules

- Each workflow stage must have a clear status.
- Each stage may be automated or manual.
- The user can stop after any stage.
- The user can resume from any completed stage.
- The user can rerun an individual stage without rerunning the entire workflow.
- Failed later stages must not destroy successful earlier outputs.
- Manual edits should update downstream outputs only when the user chooses regenerate.
- Source files are never overwritten by default.
- Export overwrite requires explicit policy.
- Every file-writing stage must verify output exists and size is greater than 0.
- Browser mode cannot claim durable local file writes.
- No transcript text is logged by default.
- This workflow does not approve Beta.
- This workflow does not satisfy stem-separation proof.

## Preferred Pattern

Use a visible checkpoint list:

Source Intake -> Recording Complete -> Audio Saved -> Audio Normalized -> Transcription Ready -> Whisper Transcription Complete -> Transcript Preview -> Speaker Review -> Title / Filename Review -> Transcript Archive Saved -> Transcript Export Saved -> Prompt Library Selected -> Prompt Workflow Complete -> Prompt Output Review -> Prompt Output Export Saved -> Workflow Complete

Each checkpoint should expose:

- include in automation,
- stop after this stage,
- status,
- review or edit affordance when relevant,
- rerun this step when completed or failed,
- skip only when safe and explicit.

## File Verification

Stages that write files must remain `Output Not Verified` or `Blocked` until verification proves:

- expected path exists,
- file size is greater than 0,
- extension matches expected,
- path is inside the selected/default output folder unless the user chose another folder,
- overwrite policy allowed the write.

## Resume And Regenerate

- A workflow state can resume from the last completed checkpoint.
- Editing transcript text marks exports and prompt outputs `Regenerate recommended`.
- Editing speaker names marks archive and transcript exports `Regenerate recommended`.
- Editing prompt output does not rerun a model automatically.
- Failed later stages preserve earlier completed outputs and user edits.

## Proof Boundary

Checkpoint automation is not stem separation, not separator model verification, and not Beta Candidate proof. Keep release state Hardened Functional Alpha unless final release checklist review and user approval explicitly promote it.
