---
name: transcription-automation-workflow
description: Use when modifying end-to-end transcription intake automation, VTT import automation, recording completion flows, archive/export automation, post-processing edits, speaker rename, resave/overwrite behavior, and manual/automatic workflow modes.
---

# Transcription Automation Workflow

Use this skill for OpenStem Local Transcription automation and after-the-fact cleanup workflows.

## Core Rules

- Automatic workflow should reduce friction but remain reversible.
- Manual workflow should allow the user to inspect and edit every step.
- Hybrid workflow should allow automatic processing first and cleanup later.
- Source files must not be destroyed.
- Original VTT/audio files must remain untouched unless the user explicitly chooses overwrite.
- Exports can be overwritten only if the user selects an overwrite policy.
- Speaker rename is editable after import/export.
- Title/session metadata is editable after import/export.
- Export can be regenerated after edits.
- Output verification is required after every write.
- Failed steps must be recoverable.
- Completed steps must be preserved if a later step fails.
- No fake completion states.
- No hidden cloud upload.
- No transcript text in logs by default.
- This workflow does not approve Beta.
- This workflow does not satisfy stem-separation proof.

## Modes

- `Automatic`: run the full workflow with defaults when every native dependency and writer is available.
- `Manual`: let the user confirm each step.
- `Automatic then Review`: default; process low-risk steps now, then let the user edit title, speakers, transcript, and export settings later.

## Overwrite Defaults

- Default overwrite policy: `Ask before overwrite`.
- Default auto-overwrite: off.
- Original source VTT/audio is not overwritten by default.
- Archive/export replacement requires native file write and nonzero output verification.

## Expected Flow Bar

Show this simple stage order:

Source -> Intake -> Clean/Normalize -> Transcribe/Parse -> Edit Speakers/Title -> Export/Archive -> Done.

Each stage should be one of:

- pending,
- ready,
- running,
- complete,
- failed,
- skipped.

## History Rules

History should track source type, original path, managed copy path, archive path, export paths, title, session number, speaker map, duration, created/imported date, last edited date, workflow mode, status, overwrite history, and errors.

Do not create a completed history entry unless output verification has passed. Browser preview can show a history record preview only.
