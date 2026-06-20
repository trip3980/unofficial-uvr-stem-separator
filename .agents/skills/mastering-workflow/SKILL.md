---
name: mastering-workflow
description: Use when modifying Mastering Lab, Web Audio mastering, loudness normalization, automatic mastering, reference matching, final audio export, before/after analysis, FFmpeg mastering chains, limiter behavior, mastering filename policy, or mastering history.
---

# Mastering Workflow

Use this skill for OpenStem Mastering Lab and final-audio export work.

## Core Rules

- Mastering is not stem separation.
- Mastering does not approve Beta Candidate.
- Mastering does not satisfy AI stem-separation proof.
- Mastering does not verify separator model weights.
- Local mastering is preferred by default.
- Do not copy proprietary branding.
- Do not claim professional mastering quality is guaranteed.
- Do not fake output files.
- Do not fake loudness or true-peak measurements.
- Before/after values must be measured, not invented.
- Output success requires file existence and nonzero size.
- Original audio is not overwritten by default.
- Export overwrite requires explicit policy.
- FFmpeg readiness is required for FFmpeg-based processing.
- Web Audio processing must not block the app or fake completion.

## Preferred User Flow

Use the simple mastering path:

Select audio -> choose output folder -> choose mastering mode -> adjust simple controls -> check readiness -> run local processing -> preview before/after -> export -> verify output.

Keep Mastering Lab separate from Batch Encoder. Batch Encoder converts formats; Mastering Lab finalizes audio.

## Readiness States

Use or preserve these diagnostic codes:

- `MASTERING_INPUT_MISSING`
- `MASTERING_OUTPUT_FOLDER_MISSING`
- `MASTERING_ANALYSIS_NOT_STARTED`
- `MASTERING_ANALYSIS_RUNNING`
- `MASTERING_ANALYSIS_COMPLETE`
- `MASTERING_ANALYSIS_FAILED`
- `MASTERING_LOUDNESS_NOT_MEASURED`
- `MASTERING_CLIPPING_WARNING`
- `MASTERING_READY`
- `MASTERING_RUNNING`
- `MASTERING_COMPLETE`
- `MASTERING_FAILED`
- `MASTERING_OUTPUT_NOT_VERIFIED`
- `MASTERING_EXPORT_READY`
- `MASTERING_EXPORT_RUNNING`
- `MASTERING_EXPORT_COMPLETE`
- `MASTERING_EXPORT_FAILED`
- `MASTERING_OVERWRITE_BLOCKED`
- `MASTERING_SAVED_AS_NEW_COPY`
- `WEB_AUDIO_PROCESSING_READY`
- `WEB_AUDIO_PROCESSING_FAILED`
- `MASTERING_FFMPEG_REQUIRED`
- `MASTERING_FFMPEG_MISSING`
- `MASTERING_BACKEND_NOT_IMPLEMENTED`
- `MATCHERING_REFERENCE_MISSING`
- `MATCHERING_BACKEND_NOT_CONFIGURED`
- `MATCHERING_READY`
- `MATCHERING_RUNNING`
- `MATCHERING_COMPLETE`
- `MATCHERING_FAILED`
- `MATCHERING_OUTPUT_NOT_VERIFIED`

## Verification Rules

- Browser downloads are not native output verification.
- Electron/native writes must confirm the output path.
- Verified output requires file exists, size greater than 0, expected extension, approved output folder, and successful processing.
- Do not show LUFS, true peak, or before/after differences unless measured.
- Preserve prior successful exports until a replacement is verified.

## Reference Policy

Web-Audio-Mastering can be used as a reference for Web Audio worker rendering, export parity, FX bypass, LUFS/true-peak measurement, WAV export, and AI-music cleanup workflow. Preserve license notices if source code is copied. Prefer OpenStem-native services and UI unless direct code adaptation has clear license, dependency, and verification coverage.

Audacity can be used as a reference for recording, import/export, effect-chain, macro, analysis, FFmpeg-extension, project/history, and recovery workflow patterns. Do not copy Audacity GPL-family source code, UI assets, branding, icons, strings, binaries, or documentation text without an explicit license decision. Prefer OpenStem-native chain policy and output verification.
