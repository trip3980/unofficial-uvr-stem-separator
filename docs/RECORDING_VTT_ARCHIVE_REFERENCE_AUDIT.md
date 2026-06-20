# Recording, VTT, and Archive Reference Audit

OpenStem inspected recording, WebVTT, and transcript-editor references before adding the local intake workflow. The goal is to copy useful patterns, not branding, cloud behavior, or proof claims.

Release state remains Hardened Functional Alpha. This work does not satisfy AI stem-separation proof and does not approve Beta Candidate.

## Projects Inspected

| Project                                                           | License                                                         | Useful idea                                                                                                    | Risks / why not adopted directly                                                                                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DeltaCircuit/react-media-recorder`                               | MIT                                                             | Small React wrapper around the browser MediaRecorder API with hooks/render-prop flow.                          | Open issues include cross-browser recording concerns. OpenStem does not need the dependency until native save and permission handling are wired.              |
| `samhirtarif/react-audio-recorder` / `react-audio-voice-recorder` | MIT                                                             | Simple React audio recorder API and download-oriented voice recording flow.                                    | Issues mention dynamic-eval/runtime problems and external-device recording problems. Adds UI/dependency surface before OpenStem has native save verification. |
| `renanmakoto/voice-recorder-app`                                  | Not adopted                                                     | Demonstrates the common simple recorder mental model: record, stop, review.                                    | Not a direct Electron/OpenStem dependency; no reason to inherit app structure.                                                                                |
| `ishandeveloper/Recordify`                                        | Not adopted                                                     | Reinforces the same minimal voice-recorder controls.                                                           | Project-specific app behavior is not needed; license/maintenance must be rechecked before code reuse.                                                         |
| `youngerheart/electron-recorder`                                  | MIT-style project page / needs full license review before reuse | Electron screen/window/audio capture pattern and save-to-WebM style.                                           | Screen-recorder scope is broader than speech intake. Desktop/system audio capture can behave differently across platforms.                                    |
| `O4FDev/electron-system-audio-recorder`                           | MIT                                                             | Native macOS system-audio capture reference.                                                                   | macOS-specific system-audio approach; README warns support is unlikely. Not appropriate for first cross-platform microphone lane.                             |
| `osk/node-webvtt`                                                 | MIT                                                             | WebVTT parser/compiler/segmenter and HLS playlist support.                                                     | Extra dependency is unnecessary for OpenStem's first simple VTT intake slice. Issues show edge-case parser/metadata work remains.                             |
| `webvtt-parser` / `annevk/webvtt`                                 | CC0-1.0                                                         | Spec-aligned WebVTT parser/validator and serializer reference.                                                 | Browser/NPM package is useful later if OpenStem needs full WebVTT validation; first slice only needs local timestamp/cue/speaker-label parsing.               |
| Simple VTT-to-text converters                                     | Varies                                                          | Useful plain-text conversion pattern: read cues, remove timing markup, emit human-readable transcript.         | Gists/scripts are not enough for archive/export integrity or speaker rename metadata.                                                                         |
| `octimot/StoryToolkitAI`                                          | License must be reviewed before code reuse                      | Mature local transcript-editor patterns: transcript ingest, speaker rename, timecode-oriented export requests. | Larger AI editing application; OpenStem should adapt workflow ideas only and must not copy branding, endpoints, or cloud behavior.                            |

## Dependency Recommendations

No new dependency is recommended now.

OpenStem should start with a native TypeScript VTT parser for the narrow first slice:

- validate `WEBVTT` signature,
- parse cue timestamps,
- preserve cue order,
- detect simple speaker labels,
- support reversible speaker rename,
- generate clean transcript text and safe filename previews.

`react-media-recorder` can be reconsidered later if OpenStem implements real microphone capture and the dependency still has acceptable Electron behavior. A custom minimal MediaRecorder wrapper may be better because OpenStem needs explicit native write verification.

`webvtt-parser` can be reconsidered later if OpenStem needs stricter WebVTT validation, regions, cue settings, or serialization beyond the simple archive use case.

## Dependencies Rejected For This Pass

- Recorder packages: rejected for now because OpenStem cannot claim durable recording until Electron native save is wired and verified.
- Electron screen/system recorder packages: rejected for now because they target screen or system-audio capture rather than first-class microphone intake.
- VTT parser packages: rejected for now because the first slice is small enough to implement locally with tests and no package churn.
- PDF/DOCX exporter packages: rejected for now because PDF/DOCX success would require local writer implementation, output verification, and license review.

## OpenStem-Native Implementation Plan

1. Add a top-level `Record or Import` section to Local Transcription.
2. Keep recording buttons disabled until microphone permissions, native save path, timer, and output verification are wired.
3. Add folder policy for in-session recordings, imported audio, imported VTT, renamed archive, and exports.
4. Parse VTT locally in `src/services/vttTranscriptImport.ts`.
5. Rename speaker labels without claiming diarization.
6. Generate safe filename previews with `{speaker_count}`.
7. Keep auto-export off by default.
8. Mark TXT/JSON/VTT writers as native-writer-required until Electron write IPC verifies nonzero files.
9. Keep PDF and DOCX Planned / Not active until real local exporters exist.

## Proof And Privacy Boundaries

- Recording, VTT import, speaker rename, and transcript export are not stem-separation proof.
- No audio or transcript text is uploaded by default.
- Transcript text must not be written to logs by default.
- Source recordings, VTT files, exports, and archives must not be committed.
- Export success requires a real output file, expected path, and nonzero size.
