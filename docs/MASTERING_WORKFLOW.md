# Mastering Workflow

Mastering Lab is OpenStem's dedicated audio finalization workspace. It is separate from Audio Separator, Stem Mixer, Batch Encoder, and model proof.

Release state remains Hardened Functional Alpha. Mastering does not approve Beta Candidate and does not satisfy `proof:check`.

## User Path

The target workflow is:

Select audio -> choose output folder -> choose goal -> analyze -> process -> compare -> export -> verify -> save history.

The first stable lane is single-file local processing through FFmpeg. It creates a processed copy and never overwrites the original source file by default.

## Local-First Rules

- no cloud upload by default,
- original source audio is not overwritten,
- generated mastered files are not committed,
- output replacement requires overwrite policy,
- before/after metrics must be measured,
- browser download is not native verification,
- mastering is not stem-separation proof.

## Mastering Goals

Current goals:

1. Voice / Speech Cleanup: Make spoken audio more consistent and easier to hear.
2. Podcast / Dialogue: Level spoken audio for podcast, narration, or interview delivery.
3. Gentle Music Master: Make a music mix a little more even while preserving dynamics.
4. Balanced Master: Make a music mix louder and more even while preserving dynamics.
5. Loud Modern Master: Create a louder copy with stricter peak control.
6. Streaming Ready: Create a measured copy aimed at a common streaming loudness target.
7. Reference Match: Use another track as a rough loudness and tone reference.
8. Custom: Adjust settings manually after the single-file safe path is stable.

The FFmpeg single-file lane is available for the non-reference, non-custom goals when FFmpeg is verified. Reference Match remains planned until a verified Matchering-style backend exists.

## Analysis Stage

Mastering Lab analyzes the selected input before export.

Implemented through FFmpeg/ffprobe:

- duration,
- sample rate,
- channels,
- file format,
- file size,
- sample peak level in dBFS when FFmpeg `volumedetect` reports it,
- clipping warning when measured sample peak is near 0 dBFS.

Not measured yet:

- integrated loudness / LUFS,
- true peak / dBTP.

Unimplemented measurements must show `Not measured`; they must not use placeholder numbers.

## Processing Chain

The OpenStem-native chain policy is defined in `src/services/masteringChainPolicy.ts`.

The first real chain is:

1. Analyze input.
2. Normalize loudness with FFmpeg `loudnorm`.
3. Apply the selected peak ceiling through the FFmpeg loudnorm request.
4. Export a WAV or FLAC copy.
5. Verify the output on disk.
6. Analyze the output copy.

`src/services/audioEffectChainPolicy.ts` remains the broader planned macro/effect-chain policy used by future batch and workflow features.

## FFmpeg Export

OpenStem does not bundle FFmpeg in this pass. The app can use FFmpeg from PATH or a user-selected FFmpeg executable.

The Electron backend uses argument arrays only. It does not build shell command strings.

Current output formats:

- WAV,
- FLAC.

Compressed or container formats such as MP3, AAC/M4A, OGG/OPUS, AIFF, WMA, and MP4/MOV audio remain FFmpeg-build-dependent or planned until codec probing and output verification are added.

## Before/After Report

The before/after panel shows:

- original file,
- mastered file when one exists,
- before measurements,
- after measurements,
- processing mode,
- output path,
- output size,
- open original,
- open mastered.

The app may say `Processed copy created` after verified export. It must not claim the output is better unless measured evidence supports a specific claim.

## Output Verification

Output success requires:

- FFmpeg returned success,
- Electron native write verified,
- output file exists,
- output file size is greater than 0,
- output extension matches selected format,
- output path is inside the selected output folder,
- source file path is not overwritten.

If any condition fails, the export remains blocked or failed.

## Non-Destructive Export

Default policy: Save mastered copy.

Supported or planned export options:

- Save mastered copy,
- Save as new version,
- Overwrite previous mastered export,
- Export to new folder,
- Open output folder.

Rules:

- never overwrite the original source file,
- save a new version when a mastered filename already exists,
- only replace a previous mastered export when an explicit overwrite policy is added,
- preserve prior successful exports if a later run fails.

Default template:

`{source_basename}_mastered_{date}_{time}_{mode}.{ext}`

Supported tokens:

- `{source_basename}`,
- `{safe_title}`,
- `{date}`,
- `{time}`,
- `{mode}`,
- `{target_lufs}`,
- `{format}`,
- `{version}`.

Filenames are sanitized for invalid characters, path traversal, reserved Windows names, duplicate names, and source-overwrite attempts.

## Reference Match

Reference Match is planned. It requires:

- input target track,
- reference track,
- output folder,
- FFmpeg ready,
- verified Matchering-style backend,
- output verification.

Required states include `MATCHERING_REFERENCE_MISSING`, `MATCHERING_BACKEND_NOT_CONFIGURED`, `MATCHERING_READY`, `MATCHERING_RUNNING`, `MATCHERING_COMPLETE`, `MATCHERING_FAILED`, and `MATCHERING_OUTPUT_NOT_VERIFIED`.

Do not fake reference matching.

## Batch Lane

Batch mastering remains planned until the single-file path is stable.

Batch rules:

- apply the same mastering goal to selected files,
- verify each output,
- skip failed files,
- preserve originals,
- export a per-file report,
- allow retry failed.

## History

Mastering history tracks:

- source file path,
- output file path,
- mastering goal,
- settings,
- backend used,
- before measurements,
- after measurements,
- output verification,
- created date,
- status,
- error code.

History actions should include open output folder, replay before/after, rerun mastering, export as new copy, and delete mastered export with confirmation.

## Audacity Reference Translation Layer

OpenStem inspected Audacity as a mature cross-platform audio editor and recorder. Audacity is used only as a reference for workflow discipline:

- recording/import/export as visible workflows,
- FFmpeg as an optional format-extension layer,
- macro/effect-chain concepts,
- measured analysis before reporting values,
- project/history/recovery patterns that protect source audio.

No Audacity source code, binaries, UI assets, branding, icons, or documentation text were copied. Audacity is GPL-family licensed, so any future direct source adaptation requires an explicit license decision before merge.

OpenStem adaptation:

Select input -> analyze -> choose chain -> apply chain -> export copy -> verify output -> show measured report.

## Web-Audio-Mastering Reference

OpenStem inspected Web-Audio-Mastering at commit `a71d08b9da51488d90899ebdea17e15d19f73eae`.

Useful reference ideas:

- Web Audio preview and export workflow,
- worker-based DSP rendering,
- export parity between preview and mastered file,
- LUFS normalization,
- true-peak limiting,
- before/after comparison,
- WAV export.

OpenStem did not copy source files in this pass.

## Voicebox Post-Processing Reference

OpenStem inspected Voicebox at commit `b35b90961d5bc83a8b4e96e8b6ccde2a03152ff9` as a local-first voice I/O and post-processing reference. No Voicebox source files were copied.

Useful adaptation for Mastering Lab:

- effects chain presets should be reusable profiles, not one-off hidden settings,
- Voice Cleanup and Podcast / Dialogue should remain speech-focused and conservative,
- Gentle Mastering and AI Music Cleanup should create new verified copies, not overwrite originals,
- creative effects such as reverb, delay, chorus, and pitch shift must be labeled as creative effects, not corrective mastering,
- queue completion does not prove output; output verification still requires file existence and nonzero size.

Pedalboard note: Voicebox uses Python `pedalboard`, which is useful as an effects reference but is not added to OpenStem in this pass. It has GPL/native packaging implications and requires a separate license/release decision before any dependency use.

## Proof Boundary

Mastering is not source separation. It does not verify model weights, does not run the audio-separator proof path, and does not unblock Beta Candidate.
