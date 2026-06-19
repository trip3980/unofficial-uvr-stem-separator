# OpenStem Release Checklist

Status boundary: Hardened Functional Alpha. Do not approve Beta Candidate until verified local CPU AI E2E proof passes with real non-empty output stems.

## Before Packaging

- Run `npm install`.
- Run `npm run lint`.
- Run `npm run lint:eslint`.
- Run `npm run build`.
- Run `npm run test`.
- Run `npm run validate-registry`.
- Run `npm run audit:moderate`.
- Run `npm run audit:model-sources`.
- Run `npm run proof:check` and confirm whether it is blocked or metadata-ready.

`npm run proof:check` is allowed to return blocked while no verified model asset exists. That blocked result must not be reworded as release readiness.

## Package Build

- Run `npm run electron:build`.
- Run `npm run verify:artifacts`.
- Confirm the generated installer is nonzero and has a matching blockmap.
- Confirm `win-unpacked/resources` contains `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, and helper scripts.
- Confirm packaged resources do not contain Python environments, model weights, model caches, proof outputs, logs, or `.env` files.

## Packaged App Check

- Launch the packaged Windows app.
- Run packaged runtime diagnostics through the UI.
- Confirm `checkPackagedRuntime()` reports required resources present.
- Confirm Browser Preview wording is not shown inside packaged runtime for native-only operations.
- Confirm Python, FFmpeg, audio-separator, PyTorch, and model checks still report their real status.

## Release Boundaries

- Do not bundle Python, FFmpeg, PyTorch, audio-separator, model weights, or downloaded caches unless a separate license and release plan is documented.
- Do not claim CUDA/MPS/DirectML proof from CPU-only tests.
- Do not use FFmpeg fallback as AI proof.
- Do not use a model with a missing or mismatched SHA-256 for proof, release claims, or verified status.
- Do not approve Beta Candidate without verified local CPU AI E2E proof output files.
