# Web Audio Mastering Integration

Reference repo inspected: https://github.com/entrepeneur4lyf/Web-Audio-Mastering

Reference checkout: local external reference checkout, not committed to OpenStem.

Reference commit inspected: `a71d08b9da51488d90899ebdea17e15d19f73eae`

Release boundary: OpenStem remains Hardened Functional Alpha. Mastering Lab is not stem separation, does not approve Beta Candidate, and does not satisfy `proof:check`.

## License

The inspected repo declares ISC in `package.json` and includes an ISC `LICENSE` file:

- Copyright holder in license file: SUP3RMASS1VE
- Upstream acknowledgement in README: based on Suno-Song-Remaster by SUP3RMASS1VE
- OpenStem integration status: referenced and concept-adapted only in this pass
- Direct files copied: none

If OpenStem later copies source files from Web-Audio-Mastering, preserve the ISC copyright and permission notice in the copied source and third-party notices.

## Dependency Audit

Reference runtime dependencies:

- `fft.js`
- `wavesurfer.js`

Reference development/build dependencies:

- Electron
- electron-builder
- Vite
- vite-plugin-electron
- vite-plugin-electron-renderer
- Vitest

OpenStem dependency decision for this pass:

- No new dependency was added.
- `fft.js` and `wavesurfer.js` remain reference-only until DSP and waveform integration are intentionally wired and tested.
- FFmpeg remains external/user-provided unless a separate licensing and release strategy is documented.

## Useful Reference Concepts

Useful concepts adapted into OpenStem-native policy and UI:

- dedicated audio mastering workflow
- input audio intake
- mastering mode selection
- simple loudness/ceiling/dynamics controls
- before/after comparison
- Web Worker processing as a future heavy-DSP path
- export parity between preview and rendered output
- LUFS and true-peak measurement only when actually measured
- WAV export concept with OpenStem-native output verification added
- non-destructive output naming
- AI-music cleanup mode as a local mastering preset

## Integration Strategy

Chosen approach: OpenStem-native rewrite/scaffold.

Reason:

- The reference app is a standalone DOM/Vite app with browser download export.
- OpenStem needs React/Electron state discipline, native path selection, output folder verification, and release-gate wording.
- Browser download completion is not enough to prove an output file exists at a native path.
- Directly copying the worker/DSP stack would be larger than the safe first vertical slice.

Implemented now:

- `Mastering Lab` submenu
- mastering policy service
- mastering diagnostic codes
- mastering modes
- filename policy
- output verification policy
- before/after unmeasured state
- mastering history record shape
- docs, skill, and regression tests

Not implemented yet:

- active Web Audio DSP rendering
- native Electron file write bridge for mastered audio
- FFmpeg mastering/export bridge
- real LUFS/true-peak measurement in OpenStem
- waveform/spectrogram preview

## Local Processing Behavior

Mastering Lab is local-first. It does not upload audio by default.

Web Audio processing may later run in the renderer or worker. Heavy rendering should move off the main UI thread when practical. Long files need memory limits, progress, cancellation, and clear failure states.

FFmpeg may later be used for format conversion, loudness analysis, final export, or metadata, but only through validated executable paths and safe argument arrays.

## Output Verification

Mastered output is complete only when:

- processing returned success,
- Electron/native write verification passed,
- file exists,
- file size is greater than 0,
- extension matches expected output format,
- output path is inside the selected/default output folder unless the user explicitly chose otherwise.

Browser/Web Audio blobs and downloads are not treated as verified native files by themselves.

## Known Limitations

- Mastering Lab is an honest scaffold in this pass.
- No mastered file is created yet.
- No before/after loudness or true-peak number is shown until measured.
- No source audio is overwritten by default.
- No user audio, mastered exports, model weights, or proof outputs are committed.

## Future Work

1. Add native input and output folder pickers.
2. Add Web Audio decode/analyze path with cancellation and measured LUFS/peak.
3. Port or adapt the smallest audited DSP slice, preserving ISC notices if source is copied.
4. Add Electron native write verification for WAV export.
5. Add FFmpeg conversion/export bridge for FLAC/MP3 where codec support is verified.
6. Add packaged-app launch smoke test for Mastering Lab.
