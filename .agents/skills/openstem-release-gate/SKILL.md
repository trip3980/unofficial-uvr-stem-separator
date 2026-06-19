---
name: openstem-release-gate
description: Use for OpenStem release-readiness checks, Beta gate decisions, proof boundaries, final status reports, and any task asking whether OpenStem AI Audio Workstation is ready.
---

# OpenStem Release Gate

Use this skill to keep release status honest.

## Current Gate

- Keep release state at Hardened Functional Alpha.
- Keep Beta Candidate blocked until verified local AI E2E stem-separation proof passes.
- Do not approve Beta, production readiness, or official UVR status without proof.

## What Does Not Count As AI Proof

- FFmpeg fallback; it is non-AI.
- Model downloads.
- Settings changes.
- Mixer preview.
- Ensemble planning.
- Basic Pitch MIDI output.
- YuE or other music-generation experiments.
- Developer tooling passing.
- `release:check` passing.

## Required Proof Boundary

Verified AI proof requires a real verified model weight file, local SHA-256 match, supported backend, real input audio, backend execution, exit code 0, and non-empty AI-generated stems on disk.

Until that exists, report that OpenStem remains Hardened Functional Alpha and Beta Candidate remains blocked.
