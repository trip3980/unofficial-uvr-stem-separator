---
name: audacity-reference-workflow
description: Use when adapting Audacity-style patterns for recording, import/export, effect chains, macros, audio analysis, mastering workflows, FFmpeg integration, and recoverable audio editing.
---

# Audacity Reference Workflow

Use this skill whenever modifying OpenStem's Mastering Lab, recording, audio import/export, effect chains, macro-like batch workflows, waveform/audio analysis, plugin-like processing, FFmpeg handling, or batch audio workflows using Audacity as a reference.

## Core Rules

- Use Audacity as a reference, not branding.
- Do not copy Audacity GPL-family source code without an explicit license decision.
- Do not copy Audacity UI assets, icons, strings, or documentation text without attribution and license review.
- Do not import Audacity as a dependency.
- Do not embed Audacity binaries.
- Prefer OpenStem-native implementation.
- Keep workflows simple and non-DAW-like.
- Import/export must verify file outputs.
- Recording must verify saved file exists and size is greater than 0.
- Effects and mastering must not overwrite originals by default.
- Before/after values must be measured, not invented.
- FFmpeg extension strategy must be explicit.
- Effects chains should be reusable and recoverable.
- This workflow does not approve Beta Candidate.
- This workflow does not satisfy stem-separation proof.

## Preferred Translation Pattern

Use this simple OpenStem path:

Select input -> analyze -> choose chain -> apply chain -> export copy -> verify output -> show measured report.

Keep advanced DAW concepts out of the first pass. Prefer curated preset chains and recoverable history over arbitrary plugin racks.

## Audacity Concepts Worth Translating

- Recording flow with device selection, level monitoring, stop/save, and recoverable session state.
- Import/export expectations for common formats.
- FFmpeg as an optional extension layer for wider codec support.
- Macro/effect-chain pattern for reusable processing.
- Analysis tools that report measured values only.
- Project/history behavior that protects source files and enables recovery.
- Batch/macro behavior that skips failed files and reports each output.

## OpenStem Boundaries

- Mastering is not stem separation.
- Recording is not stem separation.
- Import/export is not stem separation.
- Effects processing is not stem-separation proof.
- FFmpeg readiness does not verify separator model weights.
- Codec support depends on the selected FFmpeg build.
- Browser previews cannot claim native file writes.
- Audacity-style mastering and editing work does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.

## Verification Requirements

For file outputs, require:

- processing returned success,
- native write verified,
- output file exists,
- output size is greater than 0,
- expected extension matches,
- output path is inside the selected output folder unless explicitly allowed.

For measurements, require:

- duration, sample rate, channels, bit depth, LUFS, peak, true peak, clipping, and file size must be measured by a real implemented path,
- otherwise show `Not measured`.

For batch/macro workflows:

- preserve source files,
- skip failed files,
- keep retry actions,
- export a report only after report file verification.
