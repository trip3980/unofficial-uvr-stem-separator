---
name: music-midi-workflow
description: Use when modifying Basic Pitch, MIDI export, YuE, Suno, generative music lab, generated-audio handoff, browser/native file-writing boundaries, MIDI output verification, or music-generation diagnostics.
---

# Music and MIDI Workflow

Use this skill whenever OpenStem work touches Basic Pitch, MIDI export, YuE, Suno, generative music connectors, generated audio handoff to the separator, browser/native file-writing boundaries, MIDI output verification, or music-generation diagnostics.

## Core Rules

- Basic Pitch is audio-to-MIDI only.
- Basic Pitch does not separate stems.
- Browser Basic Pitch is dry-run/preview only unless native Electron IPC proves real execution.
- MIDI files are real only when a native path exists and the file exists on disk with nonzero size.
- YuE generation is local only when local engine readiness, required weights, input/output paths, and output-file verification pass.
- Suno is connector-dependent and must not claim generation when no supported user-authorized connector is configured.
- Demo tracks must be labeled Demo / No local file / Not proof.
- Generated audio can be sent to the separator only after it exists as a real local file.
- MIDI, YuE, Suno, and generation never satisfy stem-separation proof.
- MIDI, YuE, Suno, and generation never approve Beta Candidate.
- Browser mode must not claim native file writing, local generation, MIDI export, or proof.

## Diagnostic Codes

Preserve or use these diagnostic codes when applicable:

- `BASIC_PITCH_DRY_RUN_ONLY`
- `BASIC_PITCH_NATIVE_NOT_READY`
- `BASIC_PITCH_OUTPUT_MISSING`
- `MIDI_OUTPUT_NOT_VERIFIED`
- `GENERATIVE_CONNECTOR_NOT_CONFIGURED`
- `YUE_LOCAL_ENGINE_NOT_WIRED`
- `YUE_MODEL_WEIGHTS_MISSING`
- `YUE_OUTPUT_NOT_VERIFIED`
- `DEMO_AUDIO_NOT_LOCAL_FILE`
- `GENERATED_AUDIO_NOT_READY_FOR_SEPARATOR`

## Verification

- Basic Pitch output is verified only by real native execution plus non-empty `.mid` / `.midi` files on disk.
- Sonified WAV, CSV, and NPZ outputs are verified only by real file existence and nonzero size.
- YuE output is reusable only after a real local audio file exists and the native verifier confirms it.
- Suno output is reusable only after a supported connector returns a legitimate result that is downloaded or otherwise verified as a real local file.
- None of these workflows change `proof:check` stem-separation proof status.
