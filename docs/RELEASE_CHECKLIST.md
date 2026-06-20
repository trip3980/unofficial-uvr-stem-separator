# OpenStem Release Checklist

Status boundary: Hardened Functional Alpha. A verified local CPU AI E2E proof has completed for one `audio-separator` / `1_HP-UVR.pth` lane, but Beta Candidate is not automatically approved. Final release review must confirm the proof evidence, packaged-app state, safety checks, and model distribution boundaries.

## Before Packaging

- Run `npm install`.
- Run `npm run lint`.
- Run `npm run lint:eslint`.
- Run `npm run build`.
- Run `npm run test`.
- Run `npm run validate-registry`.
- Run `npm run audit:moderate`.
- Run `npm run audit:model-sources`.
- Run `npm run diagnostics:backend` and record `pythonResolved`, `pythonSource`, FFmpeg, PyTorch, and audio-separator status. This is setup evidence only, not AI proof.
- Run `npm run proof:candidates` and record whether any approved local model candidate has an expected SHA-256 match. No candidates or hash-unavailable candidates keep future proof lanes blocked.
- Run `npm run proof:check` and confirm whether it is blocked, ready-but-not-run, or re-verified from a completed CPU E2E proof report.
- If `proof:check` reports `READY_TO_RUN_CPU_E2E_PROOF` with `PROOF_E2E_NOT_RUN`, run the suggested `electron-shell/test-ai-e2e.cjs` command and record the isolated output folder, `openstem-proof-report.json`, output filenames, byte sizes, FFprobe decodability, exit code, and proof status. Rerun `proof:check` and require `CPU_E2E_PROOF_PASSED`.
- Confirm source diagnostics distinguish HTTP 401 auth-required, HTTP 404 broken-link, no-network, DNS, timeout, and missing-hash states.

`npm run proof:check` is allowed to return blocked while no verified model asset exists or while no completed proof report exists. That blocked or ready-but-not-run result must not be reworded as release readiness. A ready result is still not a proof pass until `test-ai-e2e.cjs` creates verified non-empty stems and `proof:check` re-verifies the durable report.

## GitHub Source-Control Gate

- Confirm `.gitignore` excludes `node_modules`, Python virtual environments, generated build output, Electron installers, local caches, model weights, proof outputs, logs, `.env` files, private audio, transcripts, prompt outputs, document exports, archive exports, and local machine artifacts.
- Confirm `git status --short --ignored` shows generated artifacts only as ignored, not staged.
- Confirm no `.pth`, `.onnx`, `.ckpt`, `.pt`, `.safetensors`, `.gguf`, private audio, local proof reports, `.env`, or packaged installers are staged.
- Confirm `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/ROADMAP.md`, issue templates, PR template, and CI workflow are current before inviting outside contributors.
- Confirm GitHub Actions run source checks only. CI must not publish releases, upload installers, download model weights, or approve Beta Candidate.
- Treat GitHub as an ongoing source-control checkpoint, not a final release destination.

## Golden Proof Model Gate

- A single verified proof model may be used to validate the first CPU E2E path only.
- That proof covers the selected model, backend, input, output folder, and CPU device path used in the run.
- It does not prove the full model catalog, GPU acceleration, cross-platform packaging, all model architectures, CUDA, DirectML, MPS, Linux, or macOS.
- Golden proof model metadata may be templated in `docs/proof-model.example.json`, but the local configured manifest must stay outside source control as `proof-model.local.json` or another path referenced by `OPENSTEM_PROOF_MODEL_MANIFEST`.
- Model weights are not committed to source control. They must be provided as external proof assets or installed through a verified model-library workflow.
- `proof:check` must report proof model configured, local file exists, expected SHA-256 present, actual SHA-256 matches, backend available, input audio available, output folder writable, proof ready, proof report path, verified output file count, and completed proof status.
- CPU E2E proof must not be attempted unless the golden proof model is hash verified and proof ready.

## Package Build

- Run `npm run electron:build`.
- Run `npm run verify:artifacts`.
- Confirm the generated installer is nonzero and has a matching blockmap.
- Confirm `win-unpacked/resources` contains `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, and helper scripts.
- Confirm packaged resources do not contain Python environments, model weights, model caches, proof outputs, logs, or `.env` files.
- Confirm packaged resources do not contain generated mastered audio outputs, private user audio, or mastering export folders.
- Confirm packaged resources do not contain local recordings, imported VTT/transcript archives, transcript exports, prompt outputs, document exports, archive exports, HAR files, or private clinical/transcription artifacts.

## Update Readiness Gate

- Confirm app update UI says manual updates only until a signed release manifest or documented trusted digest policy exists.
- Confirm no silent install, background installer replacement, or automatic app update claim is enabled without installer SHA-256 verification and a user-visible install prompt.
- Confirm model catalog refresh remains manifest-required and metadata-only until a versioned catalog manifest validates.
- Confirm model weight replacement requires source/license metadata, expected SHA-256, native download or reconnect, and matching actual SHA-256.
- Confirm download completion is not treated as model verification.
- Confirm `docs/UPDATE_STRATEGY.md` matches the current release policy before enabling any future updater package.
- Confirm no updater package, remote update feed, or executable auto-run path is added before the signed-manifest or trusted-digest policy exists.
- Confirm a model catalog metadata refresh cannot mark a model verified, proof-eligible, installed, or usable by itself.

## Security Policy Gate

- Confirm `docs/SECURITY_POLICY_DRAFT.md` exists until a real public security policy replaces it.
- Confirm vulnerability reports ask users not to include secrets, private audio, model weights, `.env` files, or local access tokens.
- Confirm dependency/security audit cadence is documented.
- Confirm Python, FFmpeg, and other executable paths remain validated before use.
- Confirm renderer code cannot execute arbitrary commands through Electron IPC.
- Confirm remote metadata is treated as untrusted until schema, source, license, and SHA-256 validation pass.
- Confirm app update checks, model catalog updates, and release checks do not approve AI proof or Beta Candidate status.

## Packaged App Check

- Launch the packaged Windows app.
- Run packaged runtime diagnostics through the UI.
- Confirm `checkPackagedRuntime()` reports required resources present.
- Confirm Browser Preview wording is not shown inside packaged runtime for native-only operations.
- Confirm Python, FFmpeg, audio-separator, PyTorch, and model checks still report their real status.

## Cross-Platform Packaging Gate

Windows:

- Run `npm run electron:build:win` or `npm run electron:build` on Windows.
- Launch the generated Windows app and verify packaged runtime diagnostics.
- Confirm installer, blockmap, unpacked executable, ASAR, packaged README, license, third-party notices, and helper scripts exist.
- Confirm the package excludes forbidden local/runtime/model/proof artifacts.

Linux:

- Run `npm run electron:build:linux` on Linux or Linux CI.
- Launch the AppImage and install/test the deb package on Linux.
- Verify executable permissions, desktop integration, local file picker behavior, FFmpeg discovery, Python discovery, and external model cache paths.
- Do not claim Linux release support from a Windows-only build.

macOS:

- Run `npm run electron:build:mac` on macOS or macOS CI.
- Launch the `.app` bundle and verify dmg/zip output on macOS.
- Plan signing, hardened runtime, notarization, and quarantine behavior before public release.
- Verify FFmpeg/Python discovery, external model paths, MPS wording, and packaged diagnostics on macOS.
- Do not claim macOS release support from a Windows-only build.

## Release Boundaries

- Do not bundle Python, FFmpeg, PyTorch, audio-separator, model weights, or downloaded caches unless a separate license and release plan is documented.
- Do not bundle user audio, recordings, transcripts, mastered exports, prompt outputs, document exports, generated mastering output folders, or private reference audio.
- Do not claim CUDA/MPS/DirectML proof from CPU-only tests.
- Do not use FFmpeg fallback as AI proof.
- Do not use a model with a missing or mismatched SHA-256 for proof, release claims, or verified status.
- Do not treat source-resolution candidates as verified. Metadata repair requires a legitimate source, usable license, expected SHA-256, and matching local file hash.
- Do not bypass Hugging Face auth, private repositories, gated models, terms, license restrictions, or source-integrity checks.
- Do not approve Beta Candidate without verified local CPU AI E2E proof output files and final release checklist review.
