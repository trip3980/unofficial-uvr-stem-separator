# Audio Format Workflow

Release boundary: import/export and FFmpeg conversion do not approve Beta Candidate and do not satisfy `proof:check`.

## Purpose

OpenStem should provide creator-friendly audio import/export without pretending every codec is available. Audacity is useful as a reference because it treats import/export as a mature workflow and uses FFmpeg-style extension concepts for broader format coverage.

OpenStem implementation must remain native to OpenStem:

- no Audacity code copied,
- no Audacity binary embedded,
- no FFmpeg bundled unless licensing and release strategy are documented,
- no codec support claimed until the selected backend verifies it.

## Format Status Labels

Use these labels:

- `supported`: proven by the selected backend in the current environment.
- `FFmpeg-dependent`: requires selected/system FFmpeg and codec probing.
- `planned`: intended, but not active.
- `unsupported`: not accepted by the current workflow.
- `not checked`: no backend probe has run.

## Input Format Matrix

| Format        | Status           | Notes                                                          |
| ------------- | ---------------- | -------------------------------------------------------------- |
| WAV           | not checked      | First expected local input lane; decoder probe still required. |
| FLAC          | FFmpeg-dependent | Depends on selected FFmpeg decode support.                     |
| MP3           | FFmpeg-dependent | Lossy format; decode support is not assumed.                   |
| M4A/AAC       | FFmpeg-dependent | Depends on selected FFmpeg build.                              |
| OGG/OPUS      | FFmpeg-dependent | Depends on selected FFmpeg build.                              |
| AIFF          | FFmpeg-dependent | Depends on selected FFmpeg build.                              |
| WMA           | FFmpeg-dependent | Import only; may not exist in every FFmpeg build.              |
| MP4/MOV audio | FFmpeg-dependent | Requires stream probing and audio decode support.              |

## Output Format Matrix

| Format   | Status           | Notes                                                                   |
| -------- | ---------------- | ----------------------------------------------------------------------- |
| WAV      | planned          | First planned native output target; requires native write verification. |
| FLAC     | FFmpeg-dependent | Requires selected FFmpeg encode support.                                |
| MP3      | FFmpeg-dependent | Lossy output; requires selected FFmpeg encode support.                  |
| AAC/M4A  | FFmpeg-dependent | Requires selected FFmpeg encode support.                                |
| OGG/OPUS | FFmpeg-dependent | Requires selected FFmpeg encode support.                                |
| AIFF     | FFmpeg-dependent | Requires selected FFmpeg encode support.                                |

## FFmpeg Extension Strategy

FFmpeg should be treated as an external extension layer:

- user-installed or user-selected,
- path validated before use,
- `ffmpeg -version` checked through argument arrays,
- codec probing added before claiming a format is supported,
- missing FFmpeg produces actionable recovery,
- output verification still required after FFmpeg succeeds.

Required UI labels:

- FFmpeg required for this format,
- FFmpeg ready,
- FFmpeg missing,
- Codec support unverified,
- Output verified.

## Import/Export Safety

Rules:

- Source files are not overwritten by default.
- Export should create a copy.
- Browser preview cannot claim native file writes.
- Filename preview is not export success.
- Real export success requires existing output file, nonzero size, expected extension, and approved output folder.
- Codec readiness is separate from separator model readiness.

## Batch Encoder Relationship

Batch Encoder remains the future home for repeated format conversion. Mastering Lab should only expose final-audio output choices needed for that workflow.

Batch/macro conversion should remain planned until:

- single-file conversion is verified,
- item-level errors are recoverable,
- failed files can be retried,
- source files are preserved,
- output reports are verified.

## Proof Boundary

Audio format conversion is not stem separation. FFmpeg readiness does not verify model weights and does not unblock Beta Candidate.
