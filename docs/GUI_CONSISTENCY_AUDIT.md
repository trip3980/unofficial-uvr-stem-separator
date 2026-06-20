# GUI Consistency Audit

Status: Hardened Functional Alpha.

Current proof note: one local CPU separator proof lane has passed; Beta Candidate still needs final release checklist review, packaged-app review, and user approval.

## Sections Inspected

- Audio Separator / Classic Console
- Model Manager
- Local Transcription Workspace
- Transcript Workflow Builder / Prompt Library
- Clinical Workflow Builder
- Batch Encoder
- Mastering Lab
- Stem Mixer
- Ensemble Manager
- Basic Pitch MIDI Lab
- Generative AI Music Lab
- Global Settings
- Host Setup Guide
- Legal/About
- Submenu Manual system

## Existing Consistency

- Major tabs use the shared dark OpenStem visual language, status badges, blocked/readiness panels, and local/native/browser wording.
- Major tabs render a collapsible `SubmenuManual` helper where a manual exists.
- New transcription, prompt, document, clinical, and mastering surfaces are labeled as local-first, draft-only, planned, or native-backend-gated rather than complete.
- Mastering Lab is separate from Batch Encoder, preserving the difference between audio finalization and format conversion.

## Issues Found

- Legal/About did not yet list Local Transcription, Transcript Workflows, Clinical Workflow, Mastering Lab, and document export as first-class boundary areas.
- Legal/About did not explicitly name key reference-only projects now informing the app: TurboScribe, Whisper-family tools, GPT4All, Ollama, OpenOffice/LibreOffice/Pandoc, LANDR, DistroKid Mixea, and Web-Audio-Mastering.
- No app-level renderer error boundary existed, so a tab crash could take down the entire app shell.

## Fixes Applied

- Added an app-level recoverable UI error boundary around tab content.
- Expanded Legal/About with local-tool, draft-workflow, mastering, document-export, update, privacy, and non-affiliation boundaries.
- Added module-status entries for Local Transcription, Transcript Workflows, Clinical Workflow, and Mastering Lab.
- Added package and artifact-exclusion checks for recordings, transcripts, prompt outputs, document exports, archive exports, and mastering outputs.

## Remaining GUI Risks

- Some large legacy panels still have a dense layout and should be simplified only through focused future tasks.
- Basic Pitch and Generative Music retain older wording in some internal status labels, but regression tests verify they do not approve proof or Beta.
- Prompt Library and VTT/archive workflows currently live inside Local Transcription and Transcript Workflow rather than separate top-level tabs.
