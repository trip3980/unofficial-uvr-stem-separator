# OpenStem Beta Proof Chain Audit

Status boundary: Hardened Functional Alpha.

This note records the proof chain before tightening `proof:check` from a readiness check into a completed-proof verifier.

## Current Proof Chain

1. `proof-model.local.json` or `OPENSTEM_PROOF_MODEL_MANIFEST` points to one local proof model manifest.
2. `src/scripts/check-proof-readiness.ts` reads the manifest, resolves the local model path, computes SHA-256, checks size metadata, verifies source/license metadata, checks backend support, generates or verifies the synthetic proof input, checks backend diagnostics, and verifies that the output root is writable.
3. `src/services/proofModel.ts` evaluates whether the model is proof-eligible and whether runtime prerequisites are ready.
4. `src/scripts/generate-proof-input.ts` / `src/services/proofInput.ts` create a deterministic synthetic WAV fixture and verify decodability with FFprobe.
5. `electron-shell/test-ai-e2e.cjs` runs the real CPU proof command with `audio-separator`.
6. `electron-shell/ai-separation.cjs` verifies the selected model hash, forces CPU mode, launches the `audio-separator` CLI, snapshots the output folder before execution, and only counts new or changed non-empty decodable output stems.
7. `docs/PROOF_ASSET_CHECKLIST.md` and `docs/RELEASE_CHECKLIST.md` explain that the proof covers one model/backend/device lane only and does not approve Beta Candidate by itself.

## Why `PROOF_MODEL_MISSING` Happened

`PROOF_MODEL_MISSING` occurs when no configured local golden proof model manifest exists, or when the manifest cannot point to a real local model file that passes strict metadata checks. The source-controlled registry still has zero verified single-weight model metadata candidates; the working proof lane depends on an ignored local manifest and a model weight stored outside the repository.

In this checkout, the local proof blocker has been resolved by `proof-model.local.json` pointing to `1_HP-UVR.pth` under the OpenStem user-data model cache, with matching SHA-256 and size metadata.

## Remaining Gap Before Tightening

Before this pass, `npm.cmd run proof:check` could return `READY_TO_RUN_CPU_E2E_PROOF` after model/backend/input/output readiness checks. It did not re-verify a durable report from a completed E2E run, so readiness could be mistaken for completed Beta proof evidence.

The safe fix is to keep readiness checks intact, add a proof report written by the real E2E runner, and make `proof:check` verify that report and its output files before reporting completed proof.

## Proof Boundary

Passing the proof means local end-to-end execution worked for one verified model, one backend, one device mode, one generated proof input, and one isolated output folder. It does not prove professional stem quality, the full model catalog, GPU acceleration, cross-platform behavior, packaged runtime proof, or production readiness.
