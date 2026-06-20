---
name: ai-backend-proof
description: Use for OpenStem Python discovery, FFmpeg detection, PyTorch or audio-separator detection, CPU proof, subprocess execution, cancellation, output-file verification, and E2E proof interpretation.
---

# AI Backend Proof

Use this skill for backend execution and proof-readiness work.

## Proof Order

- CPU proof comes before CUDA proof.
- Do not implement or claim CUDA proof until CPU proof passes.
- FFmpeg fallback cannot satisfy AI proof.

## Valid AI Proof

Valid local AI proof requires:

- Real Python discovery.
- Real FFmpeg detection.
- Real backend dependencies such as PyTorch and audio-separator when used.
- A proof-eligible verified model weight file.
- Real input audio.
- Real output folder.
- Real backend execution.
- Exit code 0.
- Non-empty AI-generated stems on disk.

## Honesty Rules

- Do not fabricate progress percentages.
- Do not emit fake `JOB SUCCESSFUL.` messages.
- Output files must exist and be larger than 0 bytes before reporting success.
- Keep `proof:check` blocked until a verified model asset exists and a durable real E2E proof report can be re-verified from disk.
