# OpenStem Stability Release Audit

Status boundary: Hardened Functional Alpha. One local CPU `audio-separator` / `1_HP-UVR.pth` proof lane has passed and is re-verified by `proof:check`; Beta Candidate still requires final release checklist review, packaged-app review, and user approval.

## Current Improvements

- `open-output-folder` now opens only directories directly. File paths are revealed in their containing folder instead of launched.
- `open-mastering-audio-file` now rejects non-audio extensions before calling the OS opener.
- Unused preload APIs for arbitrary model-path verification and directory reads were removed instead of exposing ghost native APIs.
- YuE and Basic Pitch IPC handlers now tolerate malformed `config` payloads and return structured errors instead of throwing during destructuring.
- YuE and Basic Pitch proof-report readers now require an explicit existing output folder instead of silently reading from the process working directory.

## Remaining Known Issues

- ESLint still passes with warnings, including existing unused imports/variables and React hook warnings.
- The Vite production bundle still emits a large chunk warning; this is not a runtime failure but should be addressed with later code splitting.
- The source-controlled model registry still has zero verified single-weight model entries; the working CPU proof lane depends on an ignored local manifest and external model cache.
- Registry source audit still reports auth-required and broken-link model sources; these must remain blocked until repaired with real source metadata and matching SHA-256.
- Only Windows packaging is locally verified. Linux and macOS release builds are not proven in this checkout.
- The packaged app resource lookup is verified from `app.asar`; a full interactive installer launch walkthrough is still a separate human release-check step.

## Next Best Task

Perform a final human release review: inspect the rebuilt Windows installer, run the packaged app interactively, confirm native diagnostics from the UI, then decide whether to promote from Hardened Functional Alpha to Beta Candidate.
