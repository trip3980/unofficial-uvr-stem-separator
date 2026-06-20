---
name: openstem-release-gate
description: Use for OpenStem release-readiness checks, Beta gate decisions, proof boundaries, final status reports, and any task asking whether OpenStem AI Audio Workstation is ready.
---

# OpenStem Release Gate

Use this skill to keep release status honest.

## Current Gate

- Keep release state at Hardened Functional Alpha.
- One verified local CPU AI E2E stem-separation proof lane has completed for `audio-separator` / `1_HP-UVR.pth`.
- Do not approve Beta, production readiness, or official UVR status automatically from one proof lane.
- Beta Candidate requires final release checklist review, packaged-app checks, and user decision.

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

After one proof lane exists, report that OpenStem remains Hardened Functional Alpha and that Beta Candidate is pending final release review. Do not claim production readiness, full catalog proof, GPU proof, or official UVR status.
