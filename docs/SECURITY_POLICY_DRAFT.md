# OpenStem Security Policy Draft

Release state: Hardened Functional Alpha.

Beta Candidate is not approved by security policy text. Current Beta status is governed by separator proof evidence, packaged-app checks, and final release checklist review.

This is a draft policy for project hardening. It is not a claim that OpenStem has a public vulnerability response program, signed update feed, or production auto-update system today.

## Reporting Vulnerabilities

Until a public security contact is configured, report suspected vulnerabilities privately to the project maintainer before posting exploit details publicly.

Do not include secrets, private audio files, private model weights, API keys, `.env` files, local access tokens, crash dumps containing personal paths, or proprietary project files in bug reports.

Useful reports include:

- OpenStem version and commit,
- operating system,
- packaged or development mode,
- exact diagnostic code or console error,
- reproduction steps,
- whether the issue involves renderer UI, Electron IPC, Python subprocesses, FFmpeg, model import/download, update checks, or output file handling.

## Supported Versions

Current supported development line:

- Hardened Functional Alpha on `main`.

No Beta Candidate, stable, or production channel is approved yet.

## Security Review Cadence

Before release checkpoints:

- run `npm.cmd run audit:moderate`,
- run `npm.cmd run lint:eslint`,
- run `npm.cmd run test`,
- run `npm.cmd run release:check`,
- record known blocked proof state separately from security/tooling results.

Dependency updates that affect Electron, Vite, React, TypeScript, `tsx`, packaging, or native IPC should get a focused smoke test before release.

## Local File Privacy Boundary

OpenStem is designed around local audio workflows:

- input audio files stay local,
- output stems are written only to user-selected output paths,
- model weights stay local after install/import,
- browser preview cannot write verified files,
- Electron native mode is required for real local execution.

No remote upload of user audio, stems, model files, or project files is allowed unless a future feature explicitly documents the destination, purpose, retention behavior, and user consent.

## Executable Path Trust Rules

OpenStem may detect or ask the user to select tools such as Python or FFmpeg. Those paths must be treated as executable trust boundaries.

Required before use:

- path exists,
- path points to the expected executable kind,
- diagnostics confirm the tool can run,
- subprocess invocation uses argument arrays,
- renderer code cannot execute arbitrary commands,
- failures return structured diagnostic codes rather than fake success.

Do not auto-download or run helper executables until licensing, source, signature or digest verification, and user consent are documented.

## Model Weight Trust Rules

A model file is proof-eligible only when:

- local file exists,
- expected SHA-256 exists,
- actual SHA-256 matches,
- source and license metadata are documented,
- backend supports the model,
- a later proof run creates non-empty stems.

Blocked states remain blocked:

- missing expected SHA-256,
- hash mismatch,
- auth-required source,
- broken source,
- unavailable source,
- unsupported backend,
- missing local file,
- filename-only match.

Remote metadata, source reachability, catalog visibility, download completion, and matching filenames do not verify a model.

## App Update Trust Rules

OpenStem must not add app auto-update until all of these exist:

- signed release artifacts or documented trusted digest policy,
- remote update manifest,
- version and channel policy,
- rollback or manual failure recovery,
- user-visible update consent,
- documented package signing and future notarization strategy,
- dependency/security audit process,
- release checklist update gate,
- no auto-run of downloaded executables outside an installer/updater trust path.

Passing an app update check is not AI proof.

## Model Catalog Update Rules

Model catalog updates are metadata refreshes only.

They must not:

- mark a model verified,
- mark a model proof-eligible,
- bypass source/license checks,
- bypass SHA-256 checks,
- silently replace expected hashes,
- silently install model weights,
- silently run downloaded files.

They may:

- refresh source status,
- refresh model metadata,
- show new catalog entries,
- show auth-required, broken-link, rate-limited, or source-unavailable status,
- recommend manual recovery actions.

Passing a model catalog update is not model proof.

## Proof And Release Boundary

`release:check` passing verifies application tooling, packaging, registry safety, and artifact checks. It does not satisfy AI proof.

`proof:check` may remain blocked while no verified model asset exists. Do not weaken this blocked state to make release checks look cleaner.

Beta Candidate is not approved by this security policy draft. It requires separator proof evidence, packaged-app checks, and final release checklist review.
