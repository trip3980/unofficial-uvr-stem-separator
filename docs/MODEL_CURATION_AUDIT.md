# OpenStem Model Curation Audit

Current release state: Hardened Functional Alpha.

Current proof note: one local CPU separator proof lane has passed with non-empty AI-generated stems; Beta Candidate still needs final release checklist review, packaged-app review, and user approval.

## Current Model Catalog

OpenStem currently has a static curated registry in `src/services/audioEngine.ts`. The registry defines model id, filename, architecture, stem type, memory risk, source URL, license, backend, supported extensions, checksum, and source status. This is the Curated OpenStem Catalog lane.

The catalog is mostly hardcoded today. That is useful for UVR5-style simplicity because the app can present known model families and process-method defaults without asking the user to understand every backend detail first. It becomes confusing when blocked source states, auth-required sources, and proof-gate warnings are exposed without a simple recovery layer.

Custom model logic exists, but until this pass it was not a first-class persistent lane. Manual import could copy a model into the local model library and hash-check it, and moved files could be reconnected through native Electron IPC. Custom metadata JSON validation existed in service tests, but the UI did not expose a durable custom metadata lane.

## Model Lanes

Lane 1 - Curated OpenStem Catalog:

- known model entry
- known model family
- known architecture/backend
- source URL and source project when known
- license metadata
- expected filename
- expected SHA-256
- expected file size when available
- compatibility notes
- source status and proof eligibility

Lane 2 - User Custom Model Library:

- user-added metadata and local files
- optional source URL and source project
- optional expected SHA-256 until supplied
- computed actual SHA-256 when a local file is inspected
- user notes
- persisted metadata in Electron user data, not in the packaged app
- never proof-eligible until expected SHA-256 exists and matches the local file

## Current User Blockers

- No verified weight file exists in the current project state.
- The curated direct source audit reports 22 HTTP 401 auth-required sources and 2 HTTP 404 broken links.
- Hugging Face authentication remains Planned / Not active.
- Custom models without expected SHA-256 remain Custom / Hash unavailable.
- Custom metadata without a matching local file remains Custom / Not verified.
- Filename-only reconnect candidates remain blocked until SHA-256 matches.

## Where The UI Was Too Harsh

The Model Manager correctly said sources were blocked, but it did not clearly separate curated catalog problems from user custom-library actions. That made a recoverable missing-resource flow feel like a dead end. The updated UI adds a two-lane summary, recommended actions, metadata import, reconnect, local-folder search, model-library search, and metadata-only custom removal.

## Classic UVR5 Model Workflow Comparison

| UVR5-style pattern that worked                          | Current OpenStem pattern                                                                                        | Desired OpenStem pattern                                          | Fix type                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------- |
| Curated model list                                      | Static curated registry with strict source statuses                                                             | Curated default lane with visible source/proof status             | UI structure / state model    |
| Model download/settings center                          | Model Manager shows source, hash, proof, and recovery states                                                    | Keep Model Manager as the single model curation surface           | UI structure                  |
| Simple model selection                                  | Classic Console model dropdown is tied to process method, but blocked models can feel like unexplained failures | Dropdown stays simple; Model Manager explains repair/reconnect    | Wording / state model         |
| Simple process method selection                         | Process methods exist and choose default model ids                                                              | Keep UVR5-style process method first, advanced custom lane second | UI structure                  |
| User does not manage every internal dependency manually | OpenStem exposes backend, source, hash, and proof gates directly                                                | Show verification as readiness, not as a maze                     | Wording / workflow            |
| Missing resources can be relinked                       | Reconnect exists through native IPC                                                                             | Reconnect plus folder search plus custom metadata library         | Backend wiring / UI structure |

The issue is not that React, Electron, or TypeScript are bad. The issue is that OpenStem exposes low-level model-integrity failures without enough UVR5-style recovery and curation layering. The fix is a clean curated/custom model workflow that keeps verification strict.

## Proof Rules

OpenStem may let users keep custom models for experimentation only when clearly labeled. Proof eligibility still requires:

- expected SHA-256 exists
- local file exists
- actual SHA-256 matches expected SHA-256
- source/license metadata is documented
- backend supports the model
- CPU proof creates non-empty stems

No curated or custom model can become proof eligible from filename match alone.
