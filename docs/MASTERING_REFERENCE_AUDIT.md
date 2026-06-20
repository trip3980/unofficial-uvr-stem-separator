# Mastering Reference Audit

Release boundary: reference research and Mastering Lab scaffolding do not approve Beta Candidate.

## Web-Audio-Mastering Findings

Reference repo: https://github.com/entrepeneur4lyf/Web-Audio-Mastering

Reference checkout: local external reference checkout, not committed to OpenStem.

Reference commit inspected: `a71d08b9da51488d90899ebdea17e15d19f73eae`

License result: ISC.

Build system:

- Vite
- Electron
- electron-builder
- Vitest

Dependency list:

- `fft.js`
- `wavesurfer.js`
- Electron/Vite build dependencies

Main audio processing modules:

- `web/lib/dsp/lufs.js`
- `web/lib/dsp/true-peak.js`
- `web/lib/dsp/normalizer.js`
- `web/lib/dsp/limiter.js`
- `web/lib/dsp/soft-clipper.js`
- `web/lib/dsp/dynamic-processor.js`
- `web/lib/dsp/final-filters.js`
- `web/lib/dsp/stereo.js`
- `web/workers/dsp-worker.js`
- `web/ui/encoder.js`

UI modules:

- `web/app.js`
- `web/ui/controls.js`
- `web/ui/waveform.js`
- `web/ui/meters.js`
- `web/ui/spectrogram.js`
- `web/components/Fader.js`

Export path:

- full-chain render,
- optional worker path,
- WAV encode,
- browser download.

OpenStem adaptation:

- adapt workflow concepts,
- rewrite service/UI OpenStem-native,
- require native output verification before completion,
- do not import dependencies yet,
- do not copy source files in this pass.

Risks:

- long-file memory pressure in browser/Web Audio processing,
- UI blocking if worker path is not used,
- browser download cannot prove native output path,
- DSP code is large enough to need focused tests before direct copy,
- waveform dependency adds runtime surface.

## DistroKid Mixea Findings

No current repo-local prior audit was found in this pass. Mixea is treated as proprietary reference only. Do not use DistroKid or Mixea branding as an OpenStem feature name.

## LANDR Findings

No current repo-local prior audit was found in this pass. LANDR is treated as proprietary reference only. Do not use LANDR branding as an OpenStem feature name.

## Matchering Findings

Matchering is an open-source audio matching and mastering reference that focuses on matching a target track to a reference track. It is useful for the future Reference Match mode, but it is not integrated in this pass.

OpenStem decision:

- reference only,
- no dependency added,
- do not claim reference matching until implemented and verified.

## ffmpeg-normalize Findings

`ffmpeg-normalize` is a Python utility for loudness normalization through FFmpeg, including EBU R128 style workflows. It is useful as a reference for future FFmpeg-backed normalization.

OpenStem decision:

- reference only,
- no dependency added,
- require user/system FFmpeg readiness and output verification before any FFmpeg mastering export can complete.

## pyloudnorm Findings

`pyloudnorm` is a Python loudness meter implementing ITU-R BS.1770-4 style measurement. It is useful as a reference for future local loudness analysis.

OpenStem decision:

- reference only,
- no Python dependency added,
- no loudness values shown until measured by an implemented path.

## phaselimiter Findings

`phaselimiter` is a C++ limiter and automatic mastering reference. It is useful for future limiter strategy research but not appropriate to bundle without build, license, runtime, and cross-platform planning.

OpenStem decision:

- reference only,
- no binary or library added,
- no limiter quality claim made.

## Voicebox Post-Processing Findings

Reference repo: https://github.com/jamiepine/voicebox

Reference checkout: local external reference checkout, not committed to OpenStem.

Reference commit inspected: `b35b90961d5bc83a8b4e96e8b6ccde2a03152ff9`

License result: MIT License.

OpenStem decision:

- reference only,
- no Voicebox source files copied,
- no Voicebox branding or affiliation claim,
- no voice cloning default feature,
- no global hotkeys or OS paste automation,
- no cloud upload by default,
- no Tauri migration in this task.

Useful mastering/post-processing lessons:

- reusable preset model for Voice Cleanup, Podcast / Dialogue, Gentle Mastering, AI Music Cleanup, and Custom Preset,
- non-destructive processing by default,
- output-copy verification before completion,
- queue/retry recovery for long-running local audio tasks,
- local profile/preset storage for repeatable workflows.

Pedalboard review:

- package: `pedalboard`,
- upstream: https://github.com/spotify/pedalboard,
- latest checked version: `0.9.23`,
- license finding: GPL-3.0 with statically included third-party components documented upstream,
- package size finding: PyPI wheels for `0.9.23` are roughly 2.4 MB to 5.2 MB per wheel depending on platform/Python tag,
- usefulness: gain, compressor, high-pass, low-pass, limiter, reverb, delay, chorus, pitch shift, and file I/O patterns,
- risk: native Python dependency plus GPL/release implications,
- decision: do not add now; optional future candidate only after explicit license, packaging, and release review.

## Recommended OpenStem Strategy

1. Keep Mastering Lab as a dedicated submenu.
2. Use OpenStem-native state, diagnostics, filename policy, and output verification.
3. Add native input and output folder IPC before real export.
4. Add the smallest Web Audio DSP slice first: decode, measure, no-output analysis.
5. Add worker-based render only after cancellation/progress and memory limits are designed.
6. Add native verified WAV write before showing complete.
7. Add FFmpeg bridge for FLAC/MP3 after selected-path support and codec checks are reused.
8. Keep mastering separate from separator proof and Beta Candidate.
