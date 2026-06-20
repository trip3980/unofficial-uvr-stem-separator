# Mastering Backend Policy

Release state remains Hardened Functional Alpha.

Mastering does not approve Beta Candidate, does not satisfy `proof:check`, and does not verify separator model weights.

## Backend Scope

Mastering Lab is a local-first audio finalization workflow.

Current backend lanes:

- FFmpeg local processing: first real single-file backend.
- Web Audio processing: reference/planned unless implemented with worker safety and native output verification.
- Matchering-style reference match: planned until dependency, license, runtime, and verification are documented.
- Cloud mastering: disabled by default.

## FFmpeg Local Processing

OpenStem does not bundle FFmpeg in this pass.

The app can use:

- FFmpeg from PATH,
- a user-selected FFmpeg executable.

The Electron backend must:

- execute FFmpeg with argument arrays,
- avoid shell string concatenation,
- validate the input file exists,
- validate the output folder exists and is writable,
- write only inside the selected output folder,
- refuse to overwrite the source file,
- create a new version when a mastered export name already exists,
- verify output file existence and nonzero size,
- analyze the output copy after processing when possible.

Current processing:

- FFmpeg `loudnorm`,
- WAV output,
- FLAC output,
- metadata analysis through ffprobe,
- sample peak analysis through FFmpeg `volumedetect`.

Not currently claimed:

- professional mastering quality,
- integrated LUFS measurement,
- true peak measurement,
- reference matching,
- batch mastering completion.

## Measurement Rules

Show only measured values.

Implemented:

- duration,
- sample rate,
- channels,
- file format,
- file size,
- sample peak dBFS if FFmpeg reports it.

Not implemented:

- integrated loudness / LUFS,
- true peak / dBTP.

Unimplemented values must display `Not measured`.

## Output Verification Rules

Output success requires:

- processing returned success,
- native Electron write verified,
- output file exists,
- output file size is greater than 0,
- expected extension matches,
- output path is inside the selected output folder,
- source file was not overwritten.

If verification fails, do not mark the export complete.

## Matchering Optional Backend

Reference Match remains planned.

Before adding it:

- document dependency license,
- document package size and runtime requirements,
- verify local-only operation,
- require input track and reference track,
- require output verification,
- add tests for failed reference/backend/output states.

Required states:

- `MATCHERING_REFERENCE_MISSING`,
- `MATCHERING_BACKEND_NOT_CONFIGURED`,
- `MATCHERING_READY`,
- `MATCHERING_RUNNING`,
- `MATCHERING_COMPLETE`,
- `MATCHERING_FAILED`,
- `MATCHERING_OUTPUT_NOT_VERIFIED`.

Do not fake a reference match.

## Web Audio Processing

Web Audio can be used later for preview or worker-backed processing.

Before activating it:

- confirm long-file memory behavior,
- use a worker for heavy DSP,
- keep preview and export paths consistent,
- require native output verification after export,
- do not treat browser download as proof of saved output.

## Audacity Reference Concepts

Audacity may be used only as a workflow reference:

- visible import/export,
- FFmpeg extension concept,
- effect-chain/macro discipline,
- measured analysis,
- history and recovery.

Do not copy Audacity GPL-family source, UI assets, branding, icons, binaries, or documentation text without an explicit license decision.

## Cloud Mastering

Cloud mastering is disabled by default.

Do not upload user audio unless a future feature has:

- explicit user consent,
- privacy policy coverage,
- service provider documentation,
- local/offline alternative preserved,
- clear output verification rules.

## Release Boundary

Mastering is audio finalization, not AI stem separation.

This feature can improve usability in Hardened Functional Alpha, but it does not affect Beta Candidate status. Beta is governed by separator proof evidence and final release checklist review.
