# Audio Effect Chain Workflow

Release boundary: audio effect chains do not approve Beta Candidate and do not satisfy `proof:check`.

## Purpose

OpenStem should use a small, recoverable chain model for Mastering Lab and future batch audio processing.

The target path is:

Select input -> analyze -> choose chain -> apply chain -> export copy -> verify output -> show measured report.

This is inspired by mature audio-editor macro/effect-chain workflows, including Audacity, but implemented as OpenStem-native policy. No Audacity source code is copied.

## Current Status

- Service added: `src/services/audioEffectChainPolicy.ts`
- UI connection: Mastering Lab can select a chain and show the planned run path.
- Real processing: planned / not active.
- Output writing: native writer required.
- Analysis values: not measured until a real analyzer is implemented.

## Chain Presets

Current policy chains:

1. Voice Cleanup
2. Gentle Master
3. Streaming Ready
4. Podcast Normalize
5. Reference Match Prep
6. Transcription Prep
7. Custom Chain

Each chain defines:

- chain id,
- name,
- purpose,
- steps,
- required backend,
- parameters,
- input requirements,
- output artifact type,
- verification requirements,
- destructive flag,
- proof boundary.

All current chains are non-destructive. Source audio is not overwritten by default.

## Step Types

Allowed first-pass step concepts:

- analyze loudness,
- normalize loudness,
- peak limit,
- trim silence if implemented,
- convert sample rate,
- convert mono/stereo,
- create mastered copy,
- analyze reference,
- export report,
- export format.

Do not implement a massive plugin rack in the first pass. A curated chain is easier to test than arbitrary user-configurable plugins.

## Output Verification

Every processed output requires:

- processing returned success,
- native write verified,
- output file exists,
- output size is greater than 0,
- expected extension matches,
- output path is inside the selected output folder unless explicitly allowed,
- before/after values are measured or shown as `Not measured`.

`Output verified` must not appear from filename preview, browser blob creation, or a successful UI state alone.

## Analysis Values

Allowed labels before implementation:

- Not measured,
- Measurement backend required,
- FFmpeg required for this analysis,
- Native analysis not implemented.

Do not invent:

- duration,
- sample rate,
- channels,
- bit depth,
- integrated loudness,
- peak level,
- true peak,
- clipping counts,
- output file size.

## Batch/Macro Policy

Batch effect chains are planned only.

Before batch mode becomes active:

- single-file chain must create one verified output,
- each batch item must have its own status,
- failed items must be skipped or retryable,
- source files must be preserved,
- output report must be verified on disk.

## Proof Boundary

Effect chains, mastering, recording, and import/export are not AI stem-separation proof and do not approve Beta Candidate.
