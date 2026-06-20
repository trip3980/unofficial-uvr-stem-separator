---
name: audio-format-workflow
description: Use when modifying Batch Encoder, FFmpeg format conversion, codec readiness, output format settings, sample-rate/channel/bit-depth controls, audio or MIDI file verification, export validation, or codec/license wording.
---

# Audio Format Workflow

Use this skill whenever OpenStem work touches Batch Encoder, audio format conversion, FFmpeg codec readiness, output format settings, sample-rate conversion, channel conversion, bit-depth settings, bitrate/quality controls, audio/MIDI file verification, codec/license wording, or export validation.

## Core Rules

- Format conversion is not stem separation.
- Batch Encoder does not count as AI proof.
- Browser Batch Encoder preview is dry-run only unless native FFmpeg execution is proven.
- FFmpeg readiness is required for real conversion.
- Real conversion requires input file existence, output folder writability, safe output path construction, subprocess exit success, and output-file verification.
- Conversion success requires actual output file existence, nonzero file size, expected extension, and no failed subprocess exit.
- Codec support depends on the user's FFmpeg build.
- WAV and FLAC output should be described as lossless options.
- MP3, AAC, OGG, and OPUS should be described as lossy or codec-dependent options.
- Sample-rate, channel, and bit-depth changes are conversion/transcoding settings, not audio enhancement or AI improvement.
- Audio format conversion must not approve Beta Candidate.
- Audio format conversion must not satisfy AI stem-separation proof.
- FFmpeg fallback and non-AI DSP must not be represented as AI model separation.
- FFmpeg must not be bundled unless licensing and release strategy are documented and approved.

## Diagnostic Codes

Preserve or use these diagnostic codes when applicable:

- `BATCH_ENCODER_FFMPEG_MISSING`
- `BATCH_ENCODER_DRY_RUN_ONLY`
- `BATCH_ENCODER_INPUT_MISSING`
- `BATCH_ENCODER_OUTPUT_FOLDER_MISSING`
- `BATCH_ENCODER_OUTPUT_NOT_VERIFIED`
- `BATCH_ENCODER_CODEC_UNVERIFIED`
- `AUDIO_FORMAT_UNSUPPORTED`
- `AUDIO_CONVERSION_NOT_AI_PROOF`
- `FFMPEG_CODEC_DEPENDENT`
- `OUTPUT_FILE_ZERO_BYTES`

## Verification

- Verify input files through native file checks before conversion.
- Verify output folders through native writability checks before conversion.
- Verify FFmpeg by running `ffmpeg -version` or the selected executable with `-version` through an argument array, not a shell string.
- Verify conversion output by checking real file existence, nonzero size, expected extension, and subprocess exit code.
- Keep audio-format readiness separate from model readiness and AI proof readiness.
