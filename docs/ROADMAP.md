# OpenStem Roadmap

Status boundary: Hardened Functional Alpha. This roadmap prepares the project for eventual standalone desktop release, but it does not approve a final official release.

## Guiding Workflow

Prefer the classic UVR-style path:

Select input -> select output -> choose model -> check readiness -> run -> show progress -> show real outputs.

Advanced panels should not obscure the basic separator workflow.

## Phase 1: GitHub-Ready Alpha

- Keep generated artifacts, model weights, proof outputs, virtual environments, caches, logs, and secrets out of source control.
- Keep README, release checklist, security policy, contribution rules, changelog, and roadmap current.
- Keep CI focused on install, typecheck, lint, formatting, build, tests, registry validation, and dependency audit.
- Keep release status language honest: pre-release, development build, experimental, not final.

## Phase 2: Windows Pre-Release Packaging

- Keep Windows NSIS packaging as the first practical target.
- Run `npm run release:check` before any release candidate discussion.
- Launch the packaged Windows app manually and verify packaged runtime diagnostics from the UI.
- Confirm the package excludes Python environments, FFmpeg binaries, model weights, proof outputs, private audio, transcripts, prompt outputs, document exports, `.env` files, and logs.
- Confirm one verified local CPU proof report is still re-checkable from disk before any Beta Candidate discussion.

## Phase 3: Linux Packaging

- Build and test AppImage and deb on Linux or Linux CI.
- Verify executable permissions, desktop entry behavior, sandbox/path behavior, FFmpeg discovery, Python discovery, and external model paths.
- Confirm Linux packages exclude local runtimes, model weights, caches, and proof outputs.
- Do not claim Linux release support until a Linux package launches and diagnostics pass on Linux.

## Phase 4: macOS Packaging

- Build and test dmg, zip, and `.app` output on macOS or macOS CI.
- Plan signing, hardened runtime, notarization, and quarantine behavior before public distribution.
- Verify macOS file picker behavior, FFmpeg/Python discovery, MPS wording, external model paths, and packaged runtime diagnostics.
- Do not claim macOS release support until a macOS package launches and diagnostics pass on macOS.

## Phase 5: Model Library And Updates

- Keep model catalog refresh metadata-only until signed or trusted manifest validation exists.
- Require source/license metadata, expected SHA-256, local file existence, actual SHA-256 match, backend compatibility, and proof-run output verification.
- Do not bundle model weights unless licensing and distribution strategy are documented and approved.
- Keep manual reconnect/search workflows honest: filename candidates are not verification.

## Phase 6: Release Candidate Review

Before Beta Candidate, require:

- clean source-control scope
- passing local release checks
- passing dependency audit
- passing artifact verification
- packaged app launch review
- proof evidence review
- owner approval

Before any final official release, require Windows, Linux, and macOS platform-specific launch checks, legal review, signing/notarization strategy where applicable, and an approved model/runtime distribution policy.
