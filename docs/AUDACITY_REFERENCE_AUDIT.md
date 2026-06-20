# Audacity Reference Audit

Release boundary: this audit does not approve Beta Candidate. Recording, import/export, effects, macros, and mastering are not AI stem-separation proof.

## Repo Inspected

- Reference project: https://github.com/audacity/audacity
- Local checkout: local external reference checkout, not committed to OpenStem.
- Branch inspected: `master`
- Commit inspected: `747072739466770b3fc4bf4ecf3e196675a08885`
- Commit summary: `fix: Use MUSE_COMPILE_ASAN in ASAN preset for cross-platform support (#11210)`
- Inspected date in repo history: 2026-06-18

OpenStem did not modify the Audacity checkout and did not copy Audacity source files.

## License Summary

Audacity's root license file says the project is released under GPLv3, many source files are GPLv2-or-later unless otherwise specified, and documentation is CC-BY 3.0 unless otherwise noted.

OpenStem decision:

- Treat direct Audacity source copying as high-risk until a GPL-compatible release strategy is explicitly accepted.
- Do not copy Audacity UI assets, branding, icons, strings, or documentation text without a specific license review.
- Do not embed Audacity.
- Do not import Audacity as a dependency.
- Use conceptual adaptation only.

## Stable Branch Recommendation

Audacity's README says `master` is undergoing Audacity 4 structural change and is not especially friendly to new contributors. It recommends branching from `audacity3` for Audacity 3.x patches.

Remote branch pointers checked:

- `master`: `747072739466770b3fc4bf4ecf3e196675a08885`
- `audacity3`: `2cbd4c41c646d765fe2a177eec9f5232fdb550cf`
- `release-3.7.0`: `72fc2e05fb7db01eee2bf056a9566b9be559ae2b`

Recommendation for OpenStem reference work:

- Use `audacity3` or a tagged/release branch for stable classic workflow research.
- Use `master` only for high-level Audacity 4 architecture trends.
- Do not rely on unstable Audacity 4 UI structure as an OpenStem product target.

## Source Tree Patterns Observed

Useful organization points:

- `au3/src/import`: import format classification and raw/multiformat reader concepts.
- `au3/src/export`: export dialogs, export file panels, mixer/export options.
- `au3/src/effects`: built-in effects, plugin families, analysis/effects UI.
- `au3/src/BatchCommands.*` and command files: macro/batch-command concepts.
- `au3/src/Project*`, `HistoryWindow.*`, `AutoRecoveryDialog.*`: project, recovery, and history concepts.
- `src/importexport`, `src/record`, `src/effects`, `src/project`: Audacity 4 reorganized modules.
- `src/au3audio/internal`: recording device settings, audio engine, playback/recording listener patterns.

## Useful Workflow Patterns

1. Recording is treated as a first-class flow with input device state, start/stop behavior, and committed recording state.
2. Import/export is not hidden inside effects. It has explicit format handling, user choices, and output behavior.
3. Effects are organized as repeatable units with parameters and UI boundaries.
4. Macro/batch processing is a separate concept from single-file editing.
5. Project/history/recovery behavior protects user work and makes failed operations recoverable.
6. Analysis tools are separate from processing and should report measured values only.
7. Broad codec support is an extension problem, not a reason to hardcode false support.

## Useful Audio-Processing Concepts

- Normalize, limiter, compressor, loudness, clipping analysis, and export verification are separate concerns.
- Effects chains should be reusable and inspectable before running.
- Batch/macros should skip failed files, preserve sources, and report per-file status.
- Recording and imported audio should create recoverable session history.
- Output files should be verified before they appear complete.
- FFmpeg can expand import/export reach, but codec support depends on the selected build.

## What Not To Copy

- Do not copy Audacity source code into OpenStem.
- Do not copy GPL effect implementations.
- Do not copy Audacity UI assets or branding.
- Do not copy Audacity documentation text into OpenStem help content.
- Do not turn OpenStem into a full DAW or multitrack editor.
- Do not add arbitrary plugin racks before the basic OpenStem path is stable.
- Do not import Audacity binaries or package Audacity as a backend.

## Licensing Risks

- GPL-family source reuse could impose distribution obligations that OpenStem has not accepted.
- Audacity documentation is CC-BY 3.0, so copied wording would need attribution and compatibility review.
- Plugins and third-party libraries inside Audacity may have their own licenses.
- Any future direct adaptation must record exact source files, licenses, copied sections, and required notices before merge.

## OpenStem Adaptation Plan

Translate concepts, not code:

1. Keep the core OpenStem path simple: select input -> select output -> choose model or chain -> check readiness -> run -> show progress -> show real outputs.
2. Add a small effect-chain policy before adding a plugin rack.
3. Keep mastering/export non-destructive by default.
4. Keep FFmpeg as user-installed or user-selected until bundling is legally documented.
5. Require output file existence and size checks before completion.
6. Use `Not measured` for loudness, peak, duration, bit depth, clipping, and true peak until a real analyzer supplies values.
7. Add batch/macro only after a single-file path has real processing and output verification.
8. Keep recording local-first and verify saved recordings before handoff to transcription or mastering.

## Recommended Mastering Lab Changes

Implemented in this pass:

- Add OpenStem-native effect-chain policy.
- Expose chain selection in Mastering Lab.
- Show the chain path: input audio -> analyze -> apply chain -> export copy -> verify output -> show report.
- Preserve non-destructive output and output-verification rules.
- Document Audacity as reference-only with GPL guardrails.
- Add tests proving no Audacity code is copied or bundled.

Still later:

- Native input/output picker wiring for Mastering Lab.
- Measured audio analysis.
- Verified WAV writer.
- FFmpeg codec probing for compressed output.
- Single-file real processing before batch/macro execution.
- Recording save verification before transcription/mastering handoff.
