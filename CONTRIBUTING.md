# Contributing

OpenStem AI Audio Workstation is in Hardened Functional Alpha. Contributions should improve stability, clarity, packaging, tests, documentation, or the local separator workflow without making unsupported release claims.

## Project Rules

- Keep the main workflow simple: select input, select output, choose model, check readiness, run, show progress, show real outputs.
- Do not add fake downloads, fake model verification, fake output files, fake progress, or fake backend success.
- Do not mark Beta Candidate, production-ready, stable, official, or final without explicit owner approval after release review.
- Do not commit model weights, Python environments, FFmpeg binaries, private audio, transcripts, prompt outputs, `.env` files, generated installers, or proof outputs.
- Preserve the independent project identity. OpenStem is not the official Ultimate Vocal Remover project.

## Development Setup

```sh
npm install
npm run electron:dev
```

Useful checks:

```sh
npm run lint
npm run lint:eslint
npm run format:check
npm run build
npm run test
npm run validate-registry
npm run audit:moderate
```

Packaging checks:

```sh
npm run electron:build
npm run verify:artifacts
```

`npm run release:check` runs the full local release-readiness loop. Passing it does not approve Beta Candidate.

## Pull Request Expectations

- Explain what changed and why.
- List commands run and their results.
- Mention any commands that could not run.
- Keep changes scoped to one vertical slice when possible.
- Add or update tests for meaningful behavior changes.
- Update docs when release, model, backend, or packaging behavior changes.

## Model And Backend Changes

Model files are proof-eligible only when source/license metadata is documented and the local SHA-256 matches expected metadata. A filename match is never enough.

Backend changes should preserve structured failure states for missing Python, missing FFmpeg, missing model files, hash mismatch, unsupported inputs, output-folder errors, backend crashes, cancellation, and malformed progress.
