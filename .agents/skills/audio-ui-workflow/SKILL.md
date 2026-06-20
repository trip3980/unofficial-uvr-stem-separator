---
name: audio-ui-workflow
description: Use for OpenStem Classic Console, Stem Mixer, Ensemble Manager, Batch Encoder, Basic Pitch, Generative Lab, Host Setup Guide, Global Settings UI behavior, and release-gate panels.
---

# Audio UI Workflow

Use this skill to preserve the OpenStem and UVR-style workflow.

## Workflow Shape

- Preserve input, output, model, backend/device, progress/logs, and results.
- Do not redesign unless explicitly asked.
- Show blockers together.
- Separate blockers from warnings.
- Do not show predicted output names as real stems.

## Feature Boundaries

- Mixer loads only verified output stems.
- Ensemble Manager is planner/reference unless a real backend exists.
- Batch Encoder and FFmpeg workflows are non-AI.
- Basic Pitch is audio-to-MIDI only.
- Generative tools are experimental or connector-dependent.
- Global Settings define defaults for new jobs, not active running jobs unless explicitly designed.

Host Setup and release-gate UI must report the current proof state honestly: missing model, ready-but-not-run, completed local CPU proof, or final-review pending.
