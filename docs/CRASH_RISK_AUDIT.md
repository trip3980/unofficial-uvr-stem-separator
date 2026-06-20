# Crash Risk Audit

Status: Hardened Functional Alpha.

Current proof note: one local CPU separator proof lane has passed; Beta Candidate still needs final release checklist review, packaged-app review, and user approval.

## Areas Inspected

- App navigation and tab rendering
- Submenu manual storage and malformed manual fallback behavior
- Legal/About rendering
- Local Transcription and Transcript Workflow scaffold states
- Mastering Lab readiness and output-verification states
- Electron preload/main IPC surface
- Artifact verification and package exclusions

## Risks Found

- The app had no top-level renderer error boundary around major tabs.
- Legal/About did not yet make new feature boundaries visible, which could lead users to misinterpret scaffolded features as complete.
- Local recordings, transcript exports, prompt outputs, and document exports were not all listed in `.gitignore` and package artifact checks.

## Fixes Applied

- Added `AppErrorBoundary`, a recoverable tab-level renderer boundary.
- Wrapped tab content in `AppErrorBoundary` with retry and return-to-Audio-Separator actions.
- Added new ignore rules for local recordings, transcripts, transcription outputs, prompt outputs, document exports, archive exports, and imported transcript artifacts.
- Added matching electron artifact-verifier rejection rules.
- Updated Legal/About and release checklist with the new artifact and feature-boundary language.

## Existing Guardrails Confirmed

- `SubmenuManual` guards localStorage parsing and malformed manual arrays.
- Browser/native file access is guarded with `window.uvr` checks in major native workflows.
- VTT parser tests cover missing and malformed content.
- Prompt library import tests cover invalid input.
- Mastering output verification rejects browser-only output, zero-byte files, wrong folders, and missing native write confirmation.

## Remaining Crash Risks

- Long transcript and prompt-output rendering may need virtualization or pagination once real large transcripts are loaded.
- Dense legacy UI files still have many states in one component; future changes should prefer small vertical slices.
- A full formal security scan with subagent coverage was not run in this pass.
