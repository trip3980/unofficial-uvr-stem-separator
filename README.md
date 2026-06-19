# OpenStem AI Audio Workstation

> Independent AI audio workstation for local stem separation and audio workflow tools.

OpenStem AI Audio Workstation is an independent desktop audio workstation for local AI-assisted stem separation, model management, post-separation review, MIDI transcription workflows, and experimental generation loopback tools.

Current status: Hardened Functional Alpha. Beta Candidate remains blocked until verified local UVR-style AI E2E stem-separation proof passes with non-empty AI-generated output stems.

`release:check` verifies application tooling, packaging, and registry safety. Passing it does not satisfy AI proof or unblock Beta Candidate status.

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

| Setting | Current value |
| --- | --- |
| `appId` | `com.trip3980.openstem-ai-audio-workstation` |
| `productName` | `OpenStem AI Audio Workstation` |
| Output directory | `dist-electron` |
| Windows target | NSIS `.exe`, x64 |
| Linux targets | AppImage and deb, x64 |
| macOS targets | dmg and zip; the `.app` bundle is produced as part of macOS packaging |
| ASAR | enabled with `resources/app.asar` |
| Packaged files | `dist`, `electron-shell`, `package.json`, `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md` |
| Extra resources | `scripts`, `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md` |
| Icon paths | not configured yet; no icon asset is present in this repo |
| Windows installer name | `OpenStem AI Audio Workstation Setup 1.0.0.exe` |

The package identity is independent and does not imply official UVR affiliation.

Windows `.exe` packaging can be considered packaging-verified only after the generated app launches and `checkPackagedRuntime()` passes inside the packaged Electron renderer.

## Release Plan

1. Windows `.exe` first.
2. Linux AppImage/deb second.
3. macOS dmg/app third after signing/notarization planning.

Packaging matrix:

| Platform | Target | Status | Needs |
| --- | --- | --- | --- |
| Windows | NSIS `.exe` plus `win-unpacked` | First priority. Packaged app has launched locally; runtime diagnostics passed; packaged bridge detected the CPU backend environment. | Verified model asset and CPU AI proof. |
| Linux | AppImage and deb | Second priority. Targets are configured. | Linux build verification on Linux or CI, dependency notes, executable permission/AppImage verification. |
| macOS | dmg, zip, `.app` bundle | Third priority. Targets are configured/documented. | macOS build host or CI, code signing, notarization, dependency notes. |

Do not claim standalone release readiness until a real packaged app opens, packaged runtime diagnostics pass, and the AI backend proof gate is satisfied with real non-empty output stems.

## Runtime Dependency Strategy

| Item | Classification | Current release handling |
| --- | --- | --- |
| React/Vite renderer | Bundled | Built into `dist` and packaged into ASAR. |
| Electron shell and IPC bridge | Bundled | Packaged through `electron-shell`. |
| Helper scripts | Bundled packaged resources | `scripts/basic_pitch_probe.py` and `scripts/yue_probe.py` are copied to Electron resources. |
| Python | External dependency, user-configured | Not bundled. The user selects/configures a Python executable. |
| FFmpeg CLI | External dependency | Not bundled. The Chromium/Electron `ffmpeg.dll` is not a user FFmpeg CLI replacement. |
| PyTorch | External/local runtime dependency | Not bundled. Installed in a local Python environment when used. |
| audio-separator | External/local runtime dependency | Not bundled. Installed in a local Python environment when used. |
| ONNX Runtime | Optional backend dependency | Not bundled unless a future packaging plan documents license/runtime handling. |
| CUDA | Optional backend accelerator | Not bundled and not assumed. |
| MPS | Optional macOS backend accelerator | Backend-dependent and not locally proven here. |
| DirectML | Planned/not active | Not bundled. |
| Basic Pitch | Optional backend/module | UI and helper probes exist; backend dependencies remain user-managed. |
| YuE | Optional/planned backend/module | UI and helper probes exist; backend dependencies and weights remain user-managed. |
| Model files | User-configured, not bundled | No model weights are included in releases. |
| Model hashes | Source-integrity metadata | Used to block mismatches; a mismatch must not be treated as verified. |
| Model licenses | User/upstream responsibility | Must be verified before redistribution or bundling. |

The local CPU backend environment has been detected by the packaged bridge, but CPU AI proof remains blocked until a verified model asset is available.

CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.

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

A model source returning HTTP 401 must be treated as unavailable or requiring manual source correction.

Current blocker notes:

- Verified model required before CPU proof can run.
- The local `UVR-MDX-NET-Inst_HQ_1.onnx` candidate remains blocked because its SHA-256 does not match the registry checksum.
- Expected checksum: `aa301a2eb34d193d9ceb997d988b43ecf8e910243e8a75e2bd3104e1ac3e99344`
- Actual checksum observed locally: `38a045c4ded87e3bf97b609ec5be7910e8a7cecec455f507227ab12b5e29f7f9`
- Do not use this model for proof.
- The checked `5_HP-Karaoke-UVR.pth` registry source returned HTTP 401 Unauthorized and is documented as inaccessible/unavailable.
- Manual import is only proof-eligible when the user supplies a model with verifiable source metadata and matching integrity values.
- Manual CPU proof must include `--expected-sha256 <64-hex-sha256>`; the proof script blocks execution when the expected hash is missing or invalid.

Beta Candidate remains blocked until verified local AI E2E stem-separation proof passes with non-empty AI-generated output stems.

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
