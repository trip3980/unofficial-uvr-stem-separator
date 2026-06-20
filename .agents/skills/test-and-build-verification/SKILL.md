---
name: test-and-build-verification
description: Use after OpenStem code changes and before final reports to choose and report validation commands, build checks, proof readiness, package verification, and Beta-blocker status.
---

# Test and Build Verification

Use this skill after code changes and before final reports.

## Relevant Commands

Run the commands relevant to the task:

- `npm.cmd install`
- `npm.cmd run lint -- --pretty false`
- `npm.cmd run build`
- `npm.cmd run test`
- `npm.cmd run validate-registry`
- `npm.cmd run electron:build` when packaging or Electron behavior changes
- `npm run release:check` when validating the full release workflow
- `npm run proof:check` when checking proof readiness

## Current Toolchain Status

- `release:check` previously passed end-to-end, including fresh Electron build and artifact verification.
- `proof:check` reports missing model, ready-but-not-run, or completed proof based on real local evidence. It must not pass completed proof unless a durable E2E proof report and verified non-empty stems can be re-checked from disk.
- `lint:strict` is intentionally non-blocking and exposes existing strict-mode type debt.
- ESLint passes with warnings, not errors.
- Model-source audit confirms no configured direct source is falsely marked verified.
- No Python, FFmpeg, models, or weights were bundled.

## Report Requirements

Report commands run, pass/fail result, exact failures, large warnings that remain, whether packaged app was launched if relevant, whether `proof:check` is blocked, ready-but-not-run, or completed-proof pass, and whether Beta is approved or still pending final review.
