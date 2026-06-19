# OpenStem Proof Asset Checklist

Use this checklist before running `electron-shell/test-ai-e2e.cjs`.

## Required Model Evidence

- Model filename and architecture are known.
- Source URL or source provenance is known.
- License metadata is known and usable for the intended local workflow.
- Expected SHA-256 is known as a 64-character hex value.
- Expected file size is known when available.
- The source is reachable or manually corrected with documented provenance.
- The local file SHA-256 matches the expected SHA-256.
- The local file is not the known blocked `UVR-MDX-NET-Inst_HQ_1.onnx` candidate with mismatched SHA-256.

## Required Proof Command Inputs

- `--python` points to a real local Python executable.
- `--model` points to the verified local model file.
- `--expected-sha256` matches the verified source metadata.
- `--input` points to a real local audio file.
- `--output` points to an existing writable output folder.
- `--device cpu` is used for the current proof path.

## Required Proof Result

- `test-ai-e2e.cjs` exits with code `0`.
- The backend used `audio-separator` CPU execution.
- Output stems exist on disk.
- Output stems are greater than 0 bytes.
- The result is not FFmpeg fallback output.
- The result is not Browser Preview output.
- Logs and UI both keep the proof source clear.

## Blockers

- CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.
- A local model with a hash mismatch must not be used for proof, release claims, or verified status.
- A model source returning HTTP 401 must be treated as unavailable or requiring manual source correction.
- Manual imports are proof-eligible only when source metadata and expected SHA-256 are supplied and match the local file.
