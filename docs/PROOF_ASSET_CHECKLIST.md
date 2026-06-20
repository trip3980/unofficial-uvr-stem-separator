# OpenStem Proof Asset Checklist

Use this checklist before running `electron-shell/test-ai-e2e.cjs`.

Current local evidence: one CPU proof lane completed on June 19, 2026 local time (June 20, 2026 UTC) using `audio-separator` 0.44.2 and `1_HP-UVR.pth`. The proof created fresh `Instrumental` and `Vocals` WAV stems in an isolated `OpenStemProofOutput/openstem-proof-*` folder. This evidence does not bundle the model, approve Beta Candidate, prove GPU acceleration, or prove the full model catalog.

## Golden CPU Proof Model Lane

A single verified proof model may be used to validate the first CPU E2E path:

Model Manager -> model hash verification -> Audio Separator preflight -> Python/audio-separator CPU run -> non-empty output stems -> result list -> mixer handoff -> proof report.

This proves the OpenStem local AI separation pipeline for that one model/backend/device combination only. It does not prove the full model catalog, CUDA, DirectML, MPS, Linux, macOS, every architecture, or every backend.

The golden proof model metadata must include:

- model name and model family
- architecture and backend
- source project and source URL or documented manual source
- license
- expected filename
- expected size or strict size range
- expected SHA-256
- local file path outside the repo
- actual SHA-256
- backend compatibility
- CPU compatibility
- expected output stems
- supported proof command
- proof eligibility result

Model weights are not committed to source control. They must be provided as external proof assets, installed through a verified model-library workflow, or referenced by a local proof manifest such as `proof-model.local.json`. The source-controlled template is `docs/proof-model.example.json`; do not fill it with private local paths or unverified hashes.

GPT4All-style model library UX is acceptable only as a model-management pattern. OpenStem may show a catalog of many audio models inside one standalone GUI, but the installer and source tree must not bundle unverified weights. Catalog visibility, source reachability, local install, and hardware fit do not count as proof. Proof eligibility still requires trusted source/license metadata, expected SHA-256, a matching local SHA-256, backend support, and later non-empty AI stems from a real local run.

`npm.cmd run proof:input` generates a copyright-safe synthetic WAV at `tmp_test_runs/proof_input/openstem_synthetic_proof.wav` unless `--output` is supplied. It uses deterministic FFmpeg sine tones and verifies the result with FFprobe. This proves only that the proof input is local and decodable; it does not prove model execution.

`npm.cmd run proof:check` reads a local proof manifest from `OPENSTEM_PROOF_MODEL_MANIFEST`, `proof-model.local.json`, or `docs/proof-model.local.json`. It also reads optional proof runtime paths from `OPENSTEM_PROOF_PYTHON`, `OPENSTEM_PROOF_FFMPEG`, `OPENSTEM_PROOF_INPUT`, and `OPENSTEM_PROOF_OUTPUT`. If `OPENSTEM_PROOF_INPUT` is not set, it safely generates and verifies the synthetic proof WAV. If `OPENSTEM_PROOF_OUTPUT` is not set, it uses the ignored `OpenStemProofOutput` folder. The check remains blocked until the local file exists, the expected SHA-256 exists, the actual SHA-256 matches, source/license metadata is documented, size metadata matches, expected stems are declared, the backend supports the model, FFmpeg/FFprobe are available, runtime proof prerequisites are available, and a durable passing `openstem-proof-report.json` from `electron-shell/test-ai-e2e.cjs` can be re-verified from disk.

When prerequisites are ready but no passing proof report exists, `proof:check` reports `READY_TO_RUN_CPU_E2E_PROOF` and `PROOF_E2E_NOT_RUN`. That state is not proof completion. After the E2E runner writes `openstem-proof-report.json`, `proof:check` re-checks the report status, model hash, model size, input path, output folder containment, expected stem labels, output file size, output timestamps, and FFprobe decodability before reporting `CPU_E2E_PROOF_PASSED`.

`npm.cmd run proof:candidates` audits approved local model folders without downloading anything. It reports candidate path, filename, size, extension, architecture guess, actual SHA-256, matching registry metadata when available, expected SHA-256 when available, hash classification, diagnostic code, and proof eligibility. If a user wants to inspect an additional local folder, run `npm.cmd run proof:candidates -- --folder "<selected folder>"`; the folder is treated as user-selected and filename matches remain candidates only.

`npm.cmd run diagnostics:backend` is a setup diagnostic only. It reports `pythonResolved` and `pythonSource`, preferring `--python`, `OPENSTEM_BACKEND_PYTHON`, `OPENSTEM_PROOF_PYTHON`, and a project-local `.venv-openstem` before PATH discovery. Passing diagnostics does not approve proof, and failing diagnostics should remain a structured runtime recovery case.

## Required Model Evidence

- Model filename and architecture are known.
- Source URL or source provenance is known.
- License metadata is known and usable for the intended local workflow.
- Expected SHA-256 is known as a 64-character hex value.
- Expected file size is known when available.
- If exact size is not known, a strict expected size range is documented.
- Expected output stems are listed.
- Supported proof command is listed.
- The source is reachable or manually corrected with documented provenance.
- The local file SHA-256 matches the expected SHA-256.
- The local file is not the known blocked `UVR-MDX-NET-Inst_HQ_1.onnx` candidate with mismatched SHA-256.

## Curated And Custom Model Lanes

- Curated OpenStem Catalog entries are developer-curated references with known family, backend, source project, source URL, filename, license, expected SHA-256, compatibility notes, source status, and proof eligibility.
- User Custom Model Library entries are user-managed metadata records stored outside the packaged app. They may include local notes, local path, actual SHA-256, expected SHA-256, architecture, backend, source URL, source project, and license.
- A custom entry with no expected SHA-256 is `Custom / Hash unavailable` and must not count as proof.
- A custom entry with expected metadata but no matching local file is `Custom / Not verified`.
- A custom entry with mismatched SHA-256 is blocked.
- A custom entry can proceed to proof only when the expected SHA-256 exists, the local file exists, and the actual SHA-256 matches.
- Removing a custom metadata entry must not delete the local model file.

## Managed Local Model Index

- OpenStem uses `openstem-models.local.json` in Electron app data to track local cache state.
- The local index records model id, local path, actual SHA-256, expected SHA-256, file size, verification status, verification date, source metadata version, last source check, proof eligibility, repair history, and user notes.
- The local index must not live in the source repo.
- Download complete means verification pending, not hash verified.
- A partial download is not installed.
- `proofEligible: true` requires `hash_verified` and exact expected/actual SHA-256 match.
- Hash mismatch, missing expected hash, unknown license, auth-required source, broken source, or unsupported backend remain proof blockers.

## Compatibility And Hardware Fit

- OpenStem separates the compatibility / integrity gate from hardware fit / performance warnings.
- Compatible large models are allowed to remain selectable, downloadable, or importable when source and integrity rules allow it.
- Large model warning: This model may be slow or unstable on this system. GPU or more RAM/VRAM may be recommended.
- CPU usable but slow is a warning, not an automatic rejection.
- GPU recommended is a warning, not proof that CUDA, DirectML, or MPS is locally proven.
- Unsupported backend, incompatible architecture, invalid filename, missing source metadata, missing license metadata, missing expected SHA-256, hash mismatch, auth-required source, and broken source remain blockers for proof or normal download as appropriate.
- Hardware estimates are guidance, not proof. A model becomes proof-eligible only after source integrity and local SHA-256 verification pass, and AI proof passes only after a real local run creates non-empty stems.

## Missing-Resource Recovery

- Use Model Manager recovery when a model is missing, moved, auth-required, source-blocked, or hash-mismatched.
- Use `npm.cmd run proof:candidates` before creating a local proof manifest from existing local files.
- Confirm the recovery panel shows the model name, expected filename, expected SHA-256, expected size, source URL/project, license, current local path, source status, proof status, and diagnostic code.
- Manual reconnect must inspect a user-selected local file and compute SHA-256 before any local reference is updated.
- Folder search must search only the user-selected folder or configured model library folders and treat matching filenames as candidates only.
- A matching filename is not enough.
- A copied file is not enough.
- A reachable source page is not enough.
- Only a matching local SHA-256 against expected metadata can make the local model verified.
- If expected SHA-256 is missing, label the model Imported / Hash unavailable and keep proof blocked.
- If SHA-256 mismatches, reject the file for proof and show the actual hash for diagnostics.

## Required Proof Command Inputs

- `--python` points to a real local Python executable.
- `--model` points to the verified local model file.
- `--expected-sha256` matches the verified source metadata.
- `--expected-size-bytes` or `--expected-size-min-bytes` / `--expected-size-max-bytes` matches the verified model metadata.
- `--expected-stems` lists the expected stem labels for the selected proof model.
- `--input` points to a real local audio file.
- `--output` points to an existing writable output folder.
- `--device cpu` is used for the current proof path.

## Required Proof Result

- `test-ai-e2e.cjs` exits with code `0`.
- `test-ai-e2e.cjs` writes `openstem-proof-report.json` in the isolated proof run folder.
- The backend used `audio-separator` CPU execution.
- The run uses a fresh isolated `openstem-proof-*` output folder inside the selected output root.
- Output stems exist on disk inside the proof output folder.
- Output stems are newer than the current proof run and cannot be stale files.
- Output stems are greater than 0 bytes.
- Output stems are decodable by FFprobe.
- Expected stem labels are present when supplied by the proof manifest.
- `proof:check` can later re-verify the proof report and files from disk.
- The result is not FFmpeg fallback output.
- The result is not Browser Preview output.
- Logs and UI both keep the proof source clear.

## What This Proof Does Not Prove

Passing this proof confirms local end-to-end execution for one verified model, one backend, one device mode, one generated/local input, and one output folder. It does not prove professional stem quality, the full model catalog, GPU acceleration, CUDA, DirectML, MPS, Linux, macOS, every model family, every source, or production readiness.

## Remaining Boundaries

- Each new CPU AI proof lane is blocked until at least one model has verified source integrity and a matching local SHA-256.
- A local model with a hash mismatch must not be used for proof, release claims, or verified status.
- A model source returning HTTP 401 must be classified as `auth_required`, not `broken_link`.
- HTTP 401 means the server was reached and access/authentication is required; it must not be reported as a no-internet failure.
- A model source returning HTTP 404 / Not Found must remain classified as `broken_link`.
- No HTTP response must be classified separately as `network_unavailable`, `dns_failed`, or `timeout`.
- A moved source can only be repaired with verified metadata: legitimate source, usable license, expected SHA-256, and matching local file hash.
- OpenStem does not bypass authentication, private repositories, gated models, license restrictions, or source-integrity checks.
- Manual imports are proof-eligible only when source metadata and expected SHA-256 are supplied and match the local file.
- Candidate source search is limited to the current URL, same public or user-authorized Hugging Face repo/API, configured GitHub releases, local model library, user local file, or user metadata JSON.
- Candidate sources are not trusted without expected SHA-256, usable license, source provenance, and local SHA-256 match.
