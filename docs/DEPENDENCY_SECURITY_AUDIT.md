# Dependency Security Audit

Status: Hardened Functional Alpha.

Current proof note: one local CPU separator proof lane has passed; Beta Candidate still needs final release checklist review, packaged-app review, and user approval.

## Dependency Snapshot

Runtime dependencies remain focused on the Electron/React app shell and local workflow UI:

- React, React DOM, Vite, Tailwind/Vite plugin, lucide-react, motion
- Express and dotenv for local dev/server behavior
- `@google/genai` remains an existing optional/cloud-capable dependency and must stay disabled by default for privacy-sensitive workflows unless explicitly configured by the user

Development dependencies include TypeScript, ESLint, Prettier, Electron, electron-builder, esbuild, tsx, wait-on, and related type packages.

No new dependency was added for:

- recording
- VTT parsing
- PDF export
- DOCX export
- mastering
- Web Audio DSP
- prompt workflow
- RAG/SubQ
- document conversion

## Security Checks

- `npm audit` is required before release.
- `npm run audit:moderate` remains part of `release:check`.
- Electron IPC should remain narrow and explicit.
- FFmpeg and Python execution must use safe argument arrays and validated executable paths.
- Browser preview must not claim native file writes.
- Output completion requires file existence and nonzero size.
- Model verification requires source/license metadata and SHA-256 match where proof is involved.

## Packaging Checks

The release artifact verifier rejects packaged:

- Python environments
- model weights and caches
- proof outputs
- mastered outputs
- recordings
- transcripts
- prompt outputs
- document exports
- archive exports
- local logs and `.env` files

## Remaining Risks

- Electron/React dependency versions should not be upgraded blindly. Major upgrades need focused build and packaging validation.
- `@google/genai` must remain gated from privacy-sensitive workflows and must not receive PHI or transcript text by default.
- Future PDF/DOCX/recording/mastering libraries need license, size, maintenance, telemetry, and Electron compatibility review before installation.
