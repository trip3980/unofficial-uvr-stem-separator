# OpenStem AI Audio Workstation

> Independent AI audio workstation for local stem separation and audio workflow tools.

OpenStem AI Audio Workstation is an independent desktop audio workstation for local AI-assisted stem separation, model management, post-separation review, MIDI transcription workflows, and experimental generation loopback tools.

Current status: Hardened Functional Alpha. A verified local UVR-style CPU E2E stem-separation proof completed on June 19, 2026 local time (June 20, 2026 UTC) for one `audio-separator` / `1_HP-UVR.pth` proof lane with non-empty AI-generated output stems.

`release:check` verifies application tooling, packaging, and registry safety. Passing it does not by itself approve Beta Candidate status; the proof evidence must still be reviewed with the release checklist.

## Project Documentation Map

- `CONTRIBUTING.md`: contributor rules, development checks, and proof-boundary expectations.
- `SECURITY.md`: vulnerability reporting rules and artifact/privacy boundaries.
- `CHANGELOG.md`: pre-release project history.
- `docs/ROADMAP.md`: Windows, Linux, macOS, model-library, and release-candidate roadmap.
- `docs/RELEASE_CHECKLIST.md`: release gates, proof gates, GitHub source-control checks, and platform packaging checks.

## Independent Project Notice

OpenStem AI Audio Workstation is an independent audio-separation workstation. It is not the official Ultimate Vocal Remover project and does not claim affiliation, certification, or endorsement by the original UVR project.

This workspace helps users configure and run independent local source-separation workflows using tools, models, and weights they acquire and manage themselves. Phrases like "UVR-compatible" and "UVR-style" refer strictly to workflow compatibility, reference model standards, and command-line structures.

## How To Run

Install dependencies:

```sh
npm install
```

Run the Vite/dev server:

```sh
npm run dev
```

Run the Electron desktop shell in development mode:

```sh
npm run electron:dev
```

Build the production renderer and dev/server bundle:

```sh
npm run build
```

Run the local app validation suite:

```sh
npm run test
npm run validate-registry
```

## Build Commands

```sh
npm run lint
npm run build
npm run test
npm run validate-registry
npm run electron:build
npm run electron:build:dir
npm run electron:build:win
npm run electron:build:linux
npm run electron:build:mac
npm run make
```

`npm run make` delegates to `npm run electron:build`.

## Desktop Packaging Strategy

Electron is the desktop packaging layer for OpenStem. It provides the installable app shell and native bridge, but it does not automatically provide Python, FFmpeg, model files, CUDA, PyTorch, audio-separator, or verified AI proof. Those remain runtime dependencies or separately documented packaged resources.

Intended architecture:

```text
React UI -> Electron desktop shell -> native backend bridge -> packaged installers
```

Current electron-builder identity:

| Setting                | Current value                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `appId`                | `com.trip3980.openstem-ai-audio-workstation`                                               |
| `productName`          | `OpenStem AI Audio Workstation`                                                            |
| Output directory       | `dist-electron`                                                                            |
| Windows target         | NSIS `.exe`, x64                                                                           |
| Linux targets          | AppImage and deb, x64                                                                      |
| macOS targets          | dmg and zip; the `.app` bundle is produced as part of macOS packaging                      |
| ASAR                   | enabled with `resources/app.asar`                                                          |
| Packaged files         | `dist`, `electron-shell`, `package.json`, `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md` |
| Extra resources        | `scripts`, `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`                                |
| Icon paths             | not configured yet; no icon asset is present in this repo                                  |
| Windows installer name | `OpenStem AI Audio Workstation Setup 1.0.0.exe`                                            |

The package identity is independent and does not imply official UVR affiliation.

Windows `.exe` packaging can be considered packaging-verified only after the generated app launches and `checkPackagedRuntime()` passes inside the packaged Electron renderer.

## Release Plan

1. Windows `.exe` first.
2. Linux AppImage/deb second.
3. macOS dmg/app third after signing/notarization planning.

Packaging matrix:

| Platform | Target                          | Status                                                                                                                               | Needs                                                                                                   |
| -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Windows  | NSIS `.exe` plus `win-unpacked` | First priority. Packaged app has launched locally; runtime diagnostics passed; packaged bridge detected the CPU backend environment; one local CPU proof lane has completed. | Final release checklist review; model weights remain external and must not be bundled without a documented license/release plan. |
| Linux    | AppImage and deb                | Second priority. Targets are configured.                                                                                             | Linux build verification on Linux or CI, dependency notes, executable permission/AppImage verification. |
| macOS    | dmg, zip, `.app` bundle         | Third priority. Targets are configured/documented.                                                                                   | macOS build host or CI, code signing, notarization, dependency notes.                                   |

Do not claim standalone release readiness until a real packaged app opens, packaged runtime diagnostics pass, and the AI backend proof gate is satisfied with real non-empty output stems.

## Runtime Dependency Strategy

| Item                          | Classification                       | Current release handling                                                                    |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| React/Vite renderer           | Bundled                              | Built into `dist` and packaged into ASAR.                                                   |
| Electron shell and IPC bridge | Bundled                              | Packaged through `electron-shell`.                                                          |
| Helper scripts                | Bundled packaged resources           | `scripts/basic_pitch_probe.py` and `scripts/yue_probe.py` are copied to Electron resources. |
| Python                        | External dependency, user-configured | Not bundled. The user selects/configures a Python executable.                               |
| FFmpeg CLI                    | External dependency                  | Not bundled. The Chromium/Electron `ffmpeg.dll` is not a user FFmpeg CLI replacement.       |
| PyTorch                       | External/local runtime dependency    | Not bundled. Installed in a local Python environment when used.                             |
| audio-separator               | External/local runtime dependency    | Not bundled. Installed in a local Python environment when used.                             |
| ONNX Runtime                  | External/local runtime dependency    | Required by the current `audio-separator` separator import path; not bundled unless a future packaging plan documents license/runtime handling. |
| CUDA                          | Optional backend accelerator         | Not bundled and not assumed.                                                                |
| MPS                           | Optional macOS backend accelerator   | Backend-dependent and not locally proven here.                                              |
| DirectML                      | Planned/not active                   | Not bundled.                                                                                |
| Basic Pitch                   | Optional backend/module              | UI and helper probes exist; backend dependencies remain user-managed.                       |
| YuE                           | Optional/planned backend/module      | UI and helper probes exist; backend dependencies and weights remain user-managed.           |
| Model files                   | User-configured, not bundled         | No model weights are included in releases.                                                  |
| Model hashes                  | Source-integrity metadata            | Used to block mismatches; a mismatch must not be treated as verified.                       |
| Model licenses                | User/upstream responsibility         | Must be verified before redistribution or bundling.                                         |

The local CPU backend environment has been detected by the packaged bridge. A local proof model was configured outside source control and verified with SHA-256 before the CPU E2E proof run.

CPU AI proof has completed for one local proof lane only. This does not prove the full catalog, GPU acceleration, CUDA, DirectML, MPS, Linux, macOS, all model architectures, or bundled standalone model distribution.

Current local backend status:

- Python path: `.venv-openstem\Scripts\python.exe`
- Python version: `3.11.9`
- `audio_separator` import: detected
- PyTorch: detected, `2.12.1+cpu`
- CUDA: `False`, not used for the current CPU proof path
- FFmpeg: detected from the host system
- `.venv-openstem`: external/local runtime only, not bundled

## Verified Model Blocker

A local model with a hash mismatch must not be used for proof, release claims, or verified status.

## Golden CPU Proof Model Lane

OpenStem may use one verified proof model to validate the first CPU E2E path:

Model Manager -> model hash verification -> Audio Separator preflight -> Python/audio-separator CPU run -> non-empty output stems -> result list -> mixer handoff -> proof report.

This proves only that one model/backend/device/input/output vertical slice. It does not prove the full catalog, GPU acceleration, CUDA, DirectML, MPS, Linux, macOS, all model architectures, or every backend.

Golden proof model criteria:

- model name, model family, architecture, backend, source project, source URL or documented manual source, license, expected filename, expected size when known, expected SHA-256, local file path, actual SHA-256, backend compatibility, CPU compatibility, and proof eligibility result
- local file exists
- expected SHA-256 exists
- actual SHA-256 matches expected SHA-256
- source/license metadata is documented
- backend supports the model
- the later CPU proof run creates non-empty AI-generated stems

Model weights are not committed to source control. They must be provided as external proof assets, installed through a verified model-library workflow, or referenced by a local manifest. The source-controlled template is `docs/proof-model.example.json`; real local proof manifests must stay outside source control as `proof-model.local.json`, `docs/proof-model.local.json`, or a path referenced by `OPENSTEM_PROOF_MODEL_MANIFEST`.

`npm.cmd run proof:check` reports whether a golden proof model is configured, whether the local file exists, whether expected SHA-256 is present, whether actual SHA-256 matches, whether the backend is available, whether input audio exists, whether the output folder is writable, and whether CPU proof is ready. It does not run proof by itself and does not approve Beta Candidate. If the model/backend/input are ready but no durable E2E proof report exists, it reports `READY_TO_RUN_CPU_E2E_PROOF` with `PROOF_E2E_NOT_RUN` and a nonzero exit. After `electron-shell/test-ai-e2e.cjs` writes `openstem-proof-report.json`, `proof:check` re-verifies the report, model hash, input path, output folder, non-empty stem files, FFprobe decodability, expected stem labels, and output timestamps before reporting `CPU_E2E_PROOF_PASSED`.

`npm.cmd run proof:candidates` searches only approved local model locations, including the OpenStem Electron user-data model library, the legacy migration model folder, repo-local ignored `uvr_models` / `models` folders when present, a configured proof manifest folder, or a user-supplied `--folder`. It does not search the internet, does not download model weights, and treats filename matches as candidates only. A candidate remains `Installed / Hash unavailable` without expected SHA-256 metadata, `MODEL_LOCAL_HASH_MISMATCH` when the local hash differs, or `Hash verified` only when the actual SHA-256 matches expected metadata.

`npm.cmd run diagnostics:backend` is a runtime dependency diagnostic, not AI proof. It accepts `--python <path>`, then checks `OPENSTEM_BACKEND_PYTHON`, then `OPENSTEM_PROOF_PYTHON`, then a project-local `.venv-openstem` Python when present, before falling back to PATH discovery. Its JSON output reports the resolved Python path and source so backend setup mismatches are visible instead of vague.

## Model Library Philosophy

Classic UVR5 made model selection simple through curation: users chose an input, output folder, process method, and model without manually reasoning through every backend or path. OpenStem keeps that goal with two explicit model lanes and a managed local model index.

OpenStem follows the mature local-AI model-library pattern used by apps like GPT4All and Ollama, but adapts it for audio model integrity and proof-gated source separation:

model card -> source metadata -> license -> expected filename -> expected size -> expected SHA-256 -> backend compatibility -> local cache path -> verification status -> repair/reconnect options

- Curated OpenStem Catalog: known model family, backend, source project, source URL, filename, license, expected SHA-256, compatibility notes, source status, and proof eligibility.
- User Custom Model Library: user-added metadata and local files stored outside the packaged app in Electron user data. Custom entries can keep local notes, source metadata, expected SHA-256, actual SHA-256, backend choice, and reconnect state.
- Managed Local Model Index: Electron stores `openstem-models.local.json` in app data to track local path, actual SHA-256, file size, verification date, last source check, proof eligibility, and repair history. This file is local machine state and must not be committed to the source repo.

OpenStem separates model compatibility from hardware fit. A model may be valid but demanding. Large or GPU-heavy models should produce warnings, not automatic rejection, unless they fail backend compatibility, source metadata, or SHA-256 verification.

Hardware estimates are guidance, not proof. A model becomes proof-eligible only after source integrity and local SHA-256 verification pass, and AI proof passes only after a real local run creates non-empty stems. CUDA, DirectML, and MPS fit labels remain backend-dependent / not locally proven until E2E proof exists.

Custom models are allowed, but they are not proof-eligible until verification passes. A custom model with no expected SHA-256 is `Custom / Hash unavailable`. A custom model with metadata but no matching local file is `Custom / Not verified`. A custom model with a mismatched local hash is blocked. Only a local file whose SHA-256 matches documented expected metadata can become `Custom / Hash verified` and proceed to the remaining proof gates.

Model source status is classified by observed HTTP/access behavior:

- `reachable`: source returned HTTP 200 or 206. This only means the endpoint responded; proof still requires expected SHA-256 metadata and a matching local file.
- `auth_required`: source returned HTTP 401 and may require Hugging Face login, token access, approved gated-model access, or corrected source metadata. The server was reached, so this is not a no-internet result.
- `access_denied`: source returned HTTP 403 and is denied or gated.
- `broken_link`: source returned HTTP 404 / Not Found. The file may have moved or the registry metadata may be stale.
- `rate_limited`: source returned HTTP 429 and must be retried later without treating the model as verified.
- `network_unavailable`: no HTTP response was received because internet, proxy, firewall, or offline state blocked the check.
- `dns_failed`: DNS lookup failed while resolving the source host.
- `timeout`: the source check timed out.
- `source_unavailable`: the source returned another unavailable or server-side failure.
- `missing_hash`: a source may be reachable, but expected SHA-256 metadata is missing.
- `hash_mismatch`: a local file was checked and did not match expected SHA-256 metadata.
- `custom_unverified`: custom metadata exists, but a local file has not matched expected SHA-256.
- `custom_hash_unavailable`: a custom local file exists or is tracked, but expected SHA-256 metadata is missing.
- `verified_local`: a local custom model file matched expected SHA-256 and can proceed to remaining proof gates.

OpenStem does not bypass authentication, private repositories, gated models, license restrictions, or source-integrity checks. A model remains blocked until source integrity and local SHA-256 verification pass.

Safe source repair is metadata repair, not a trust shortcut. Allowed candidate checks are limited to the current URL, the same public or user-authorized Hugging Face repository file tree/API, configured GitHub releases, the local model library, a user-selected local file, or user-provided metadata JSON. Candidate sources are not trusted until they include a usable license, expected SHA-256, and a matching local file hash.

Manual metadata JSON import rejects malformed hashes and missing licenses. Imported metadata remains `needs_verification` until a local file SHA-256 matches the expected value. Manual local reconnect compares one selected local file against the expected SHA-256; a match can proceed to the remaining proof gates, a mismatch is blocked, and a missing expected hash stays Imported / Hash unavailable.

Model recovery follows a missing-media relink pattern: OpenStem shows the expected model filename, expected SHA-256, expected size, source URL/project, license, current local path, source status, proof status, and diagnostic code. Users may open the source page, reconnect one local file, search a selected folder, or search the configured model library. Search results are filename candidates only; a filename match, reachable URL, or copied file is not verified until the local SHA-256 matches the expected metadata.

Hugging Face token support is Planned / Not active. Future support may use an `HF_TOKEN` environment variable, a secure app setting, or documented Hugging Face CLI cache access. Tokens must never be stored in localStorage, printed in logs, committed, or included in error messages.

Current proof notes:

- A verified model remains required before any future CPU proof run.
- The first completed proof lane used a local `proof-model.local.json` manifest and an external model file in the OpenStem user-data model cache.
- If another local candidate is selected or placed in an approved folder, run `npm.cmd run proof:candidates` and require exact expected/actual SHA-256 match before proof.
- The checked Hugging Face registry sources return HTTP 401 Unauthorized and are documented as `auth_required`, not `broken_link`.
- Manual import is only proof-eligible when the user supplies a model with verifiable source metadata and matching integrity values.
- Manual CPU proof must include `--expected-sha256 <64-hex-sha256>`; the proof script blocks execution when the expected hash is missing or invalid.

Beta Candidate is not automatically approved by this proof. It is pending final release checklist review and user decision while the release state remains Hardened Functional Alpha.

## Packaging Safety

Release packages must exclude:

- `node_modules`, except anything electron-builder internally requires outside app files
- `.venv`, `.venv-openstem`, `.openstem-backend`
- downloaded models and cached model weights
- local logs and `.env` files
- release artifacts such as `dist-electron`, `release`, `out`, and installer folders
- temporary test, output, and proof folders

Release packages must include:

- `dist`
- `electron-shell`
- required runtime helper scripts from `scripts`
- packaged diagnostics via `window.uvr.checkPackagedRuntime()`
- legal/about resources
- `THIRD_PARTY_NOTICES.md`

## Packaged Runtime Resources

Electron runtime resources are resolved through `electron-shell/runtime-paths.cjs`.

- In dev mode, helper scripts are resolved from the project root, for example `scripts/yue_probe.py` and `scripts/basic_pitch_probe.py`.
- In packaged mode, helper scripts are resolved from Electron `resourcesPath`, where electron-builder copies `scripts/**/*` as external packaged resources.
- `electron-shell` files remain packaged with the app, while model weights, downloaded caches, `.venv` folders, logs, `.env` files, and release outputs are excluded from release resources.
- The desktop bridge exposes `window.uvr.checkPackagedRuntime()` to report the app path, resources path, required runtime files, and any missing required files.

Known boundary: packaged runtime diagnostics only verify resource presence and bridge wiring. They do not prove Python, model availability, CUDA readiness, YuE generation, Basic Pitch transcription, or UVR-style AI stem separation.

Server route boundary: `server.ts` is still the dev/server HTTP surface for Gemini drafting and local Suno/YuE proxy experiments. Packaged Electron does not silently start that server. Packaged local runtime paths use Electron IPC; server-proxy features are treated as dev/server-only unless a separate server target is deliberately launched.

## Technical Credits & Upstream Attribution

This project functions as an integrator and credits the following upstream projects for their foundation, engines, or design reference:

- OpenStem AI Audio Workstation: Main application shell and workflow integrator. Author: Robert Sawin / Trip3980.
- Ultimate Vocal Remover GUI / UVR: Historical workflow inspiration and compatibility reference for UVR-style source separation. OpenStem is not an official UVR product.
- audio-separator: Python CLI and library for local Demucs and MDX-Net pipeline execution.
- Demucs / facebookresearch: Multi-stem audio source separation neural networks.
- FFmpeg: Transcoding, fallback static DSP filter separations, and audio operations. FFmpeg fallback is non-AI processing and does not count as neural source-separation proof.
- Basic Pitch / Spotify: Automated audio-to-MIDI transcription models for pitch tracking.
- PyTorch / ONNX Runtime: Machine-learning inference runtimes used by local backends where installed.

## License

This UI shell and configuration is licensed under the MIT License. See `LICENSE` for details.

Read `THIRD_PARTY_NOTICES.md` for upstream attribution, license notes, and model weight redistribution boundaries. You must comply with the licenses of any third-party binaries, libraries, or model weights that you run or integrate.
