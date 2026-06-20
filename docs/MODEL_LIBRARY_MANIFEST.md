# OpenStem Model Library Manifest Design

Release state: Hardened Functional Alpha.

One local CPU separator proof lane has passed. Beta Candidate still requires final release checklist review, packaged-app review, and user approval.

## Current Model-System Audit

1. Current catalog structure: `src/services/audioEngine.ts` owns a static curated registry of model entries. Each entry carries id, filename, architecture, stem type, file size label, source URL, license, expected SHA-256, backend, source status, and proof-related metadata.
2. Current source fields: source data is represented by `downloadUrl`, `sourceUrl`, `sourceType`, `license`, `checksum`, `expectedSizeBytes`, `requiredBackend`, `supportedExtensions`, and `verifiedStatus`.
3. Current proof eligibility logic: `src/services/modelProofEligibility.ts` requires usable license/source metadata, expected SHA-256, local file existence, supported backend, and exact local SHA-256 match. Broken, auth-required, missing-hash, mismatched, unsupported, and manual-import states remain blocked.
4. Current local cache behavior: Electron stores local weights under the app `userData` model library, not the source repo. The native layer inventories local files and verifies hashes through `electron-shell/model-integrity.cjs`.
5. Current download behavior: downloads require native Electron. The downloader now streams into `uvr_models/temp_downloads` with an `.openstem-partial` suffix, then moves a completed file into the model library and marks verification pending. Download completion is not hash verification.
6. Current manual import behavior: manual import copies a user-selected model file into the model library, computes SHA-256, compares expected metadata when present, and blocks proof when expected hash is missing or mismatched.
7. Current repair/reconnect behavior: users can reconnect one local file, search a selected folder, search the model library, open the source page, or import strict metadata JSON. Filename matches are candidate hints only.
8. Why current links are fragile: most configured Hugging Face sources currently return HTTP 401 and two GitHub entries return HTTP 404. OpenStem therefore cannot treat those URLs as working downloads or proof-ready sources.
9. What previously prevented one clean verified model from being installed: no catalog model had both legitimately reachable source access and a verified local file whose SHA-256 matched expected metadata. The local proof lane now uses an ignored local manifest and an external model cache file.
10. What needs to become manifest-driven: catalog cards, source status, expected filename, expected size, expected SHA-256, backend compatibility, local cache entry, verification status, repair history, and proof eligibility now need one shared model-library contract.

## Manifest Format

OpenStem uses a manifest shape inspired by mature local-AI model libraries, adapted for source-separation weights:

```json
{
  "manifest_version": "1.0",
  "generated_at": "2026-06-19T00:00:00.000Z",
  "models": [
    {
      "id": "example_model_id",
      "display_name": "Example Model",
      "model_family": "MDX-Net",
      "architecture": "MDX-Net",
      "backend": "audio-separator",
      "source_project": "owner/repo",
      "source_url": "https://host/path/to/model.onnx",
      "source_status": "needs_verification",
      "repo_id": "owner/repo",
      "filename": "model.onnx",
      "expected_sha256": "64 lowercase hex characters only",
      "expected_size_bytes": 0,
      "license": "documented license",
      "tags": ["curated", "MDX-Net", "vocals"],
      "recommended_use": "short creator-facing use note",
      "compatibility": {
        "cpu": true,
        "cuda": "not_proven",
        "directml": "not_proven",
        "mps": "not_proven"
      },
      "status": "needs_verification"
    }
  ]
}
```

Manifest rules:

- Do not allow fake hashes, placeholder URLs, or path-bearing filenames.
- Do not allow missing license metadata for verified or downloadable model cards.
- Do not allow `source_url` without `source_status`.
- Do not allow manifest metadata alone to mark a model proof eligible.
- Do not allow proof eligibility without matching local SHA-256.

Implemented service: `src/services/modelManifest.ts`.

## Local Model Index

OpenStem tracks local cache state in `openstem-models.local.json`.

Location: Electron `userData` app data, or a configured model library folder in future work. It must not live in the source repo.

Tracked fields:

- model id,
- local path,
- actual SHA-256,
- expected SHA-256,
- file size,
- verification status,
- verification date,
- source manifest version,
- source metadata version,
- proof eligibility,
- last source check,
- repair/reconnect history,
- user notes.

Local index rules:

- A partial download is not installed.
- Download complete means verification pending, not hash verified.
- `proofEligible: true` requires `hash_verified` and exact expected/actual SHA-256 match.
- Hash mismatches stay recorded as blockers.
- Custom models without expected SHA-256 remain useful library entries but not proof eligible.

Native storage: `electron-shell/main.cjs` reads and writes `openstem-models.local.json` under Electron `userData`.

## Download And Verify Flow

1. User selects model.
2. App checks source status.
3. HTTP 401 shows Auth Required.
4. HTTP 403 shows Access Denied / gated.
5. HTTP 404 shows Broken Link.
6. Reachable source may start native download.
7. Download streams to an `.openstem-partial` temp file.
8. Completed temp file moves into the model library.
9. Local index marks `download_complete_verification_pending`.
10. App computes SHA-256.
11. App compares expected SHA-256.
12. Exact match marks hash verified.
13. Mismatch blocks proof and records hash mismatch.
14. Proof eligibility is true only when all proof requirements pass.

## Compatibility And Hardware Fit Gate

OpenStem uses two separate model-library decisions:

1. Compatibility / integrity gate: determines whether the model is structurally usable in OpenStem model management.
2. Hardware fit / performance warning: estimates whether the current machine is likely to run the model comfortably.

A model can be valid but too demanding, valid but slow on CPU, valid but GPU recommended, valid but not proof-eligible yet, or invalid because metadata/hash/source/backend rules fail.

Compatibility / integrity blockers:

- unsupported backend,
- incompatible architecture,
- invalid filename or unsupported extension,
- missing source metadata,
- missing or unknown license metadata,
- missing expected SHA-256 when proof is required,
- hash mismatch,
- auth-required or broken source for normal download,
- manual import without proof metadata.

Hardware-fit labels:

- Good fit estimate,
- CPU usable but slow,
- GPU recommended,
- Likely too large for this machine,
- Hardware fit not checked.

Hardware estimates are static guidance unless backend diagnostics have actually run. They are not live benchmarks and do not prove CUDA, DirectML, MPS, output quality, or proof eligibility.

## Repair And Reconnect Flow

Model missing:

- Resolve Source.
- Retry source check.
- Open source page.
- Search local model folders.
- Reconnect local file.
- Import metadata JSON.
- Mark unavailable.

Moved local file:

- Locate file.
- Search selected folder.
- Compute hash.
- Relink only if SHA-256 matches expected metadata.

Custom model:

- Add custom model.
- Compute hash.
- Add metadata.
- Keep blocked until expected hash, source, license, and backend metadata are valid and local SHA-256 matches.

## Model Library Pattern Comparison

GPT4All-style pattern:

- Presents a model explorer.
- Downloads local/private models.
- Displays metadata before use.
- Keeps local model state separate from remote catalog state.
- Makes many models feel like part of one standalone app by shipping the desktop shell, model catalog, download manager, model path setting, local loader, and metadata cache instead of bundling every model weight.
- Uses catalog fields such as filename, URL, file size, RAM requirement, installed state, incomplete download state, download error, and hash metadata to drive the GUI.

Ollama-style pattern:

- Uses a model library.
- Provides a pull flow.
- Tracks manifests and digests.
- Keeps local cache state.
- Supports custom model blueprints.

OpenStem adaptation:

- Uses an audio model catalog rather than an LLM catalog.
- Tracks verified source metadata, expected filename, expected size, expected SHA-256, backend compatibility, and license.
- Separates curated catalog, custom model library, installed local weights, and proof eligibility.
- Provides reconnect and repair tools because audio model files are often moved manually.
- Makes the audio model library feel integrated into the desktop app while keeping weights outside the installer, outside source control, and outside proof claims until verified.
- Uses only SHA-256 for proof eligibility. Legacy MD5-style catalog hashes are not acceptable for OpenStem proof.

Key difference:

OpenStem must be stricter because model verification controls AI proof. A model can be present, downloaded, or custom-imported and still not be proof eligible.

## GPT4All Reference Adaptation

OpenStem can borrow GPT4All's standalone shell pattern without copying its domain:

- The application installer should contain the OpenStem GUI, Electron shell, IPC bridge, runtime helpers, docs, and validation scripts.
- The installer should not contain unverified separator model weights.
- The model catalog can show many available audio models as catalog-visible entries.
- Download, import, and reconnect actions should populate a local model library folder under app data or a user-selected library path.
- Local model storage may feel like part of the product experience, but the files remain external assets with their own source, license, hash, and proof state.
- Source reachability, local install, hardware fit, hash verification, and proof eligibility are separate states.
- Catalog metadata refresh must not mark weights verified.
- Model weight replacement must not happen silently.
- A model is proof eligible only after trusted metadata and local SHA-256 verification pass.

OpenStem should avoid adapting:

- GPT4All branding,
- GPT4All LLM model entries,
- LLM prompt/template/runtime fields,
- telemetry or remote-provider patterns without a separate privacy and security review,
- catalog hash behavior that accepts MD5 for proof.

## Product Principle

When in doubt, prefer the classic UVR5 user path:

Select input -> select output -> choose model -> check readiness -> run -> show progress -> show real outputs.

Only add advanced model-library panels after that basic path remains clear.
