# Third-Party Notices For Docs

This document supplements the root `THIRD_PARTY_NOTICES.md` for reference audits and documentation-only integrations.

## Web-Audio-Mastering

- Project: Web-Audio-Mastering
- Source: https://github.com/entrepeneur4lyf/Web-Audio-Mastering
- Reference commit inspected: `a71d08b9da51488d90899ebdea17e15d19f73eae`
- License declared by reference repo: ISC
- Reference status in OpenStem: referenced and concept-adapted only
- Direct source files copied into OpenStem: none
- Attribution requirement if source is copied later: preserve ISC copyright and license notice

OpenStem's Mastering Lab is an independent OpenStem-native workflow. It does not use Web-Audio-Mastering branding as the feature name and does not claim official affiliation.

## Transcription, Prompt, Document, And Mastering References

- TurboScribe is referenced only as a workflow UX comparison. OpenStem does not use TurboScribe branding, endpoints, account access, cookies, raw HAR data, or cloud upload behavior.
- Whisper-family speech-to-text tools are optional external/local backend references. OpenStem does not bundle Whisper weights and transcription is not stem-separation proof.
- GPT4All and Ollama are referenced only for local model-library and local-chat workflow ideas. Local chat readiness does not verify separator models.
- Voicebox is referenced only as a local-first voice I/O workflow reference for captures, STT model selection, local LLM refinement, queue/retry/recovery, recording UX, and post-processing presets. OpenStem does not copy Voicebox code or branding and is not affiliated with or endorsed by Voicebox.
- Apache OpenOffice, LibreOffice, and Pandoc are referenced as possible user-configured document conversion tools. No office suite or converter is bundled by default.
- LANDR and DistroKid Mixea are proprietary commercial mastering references only. OpenStem Mastering Lab does not use their branding or claim professional-equivalent mastering results.
- Audacity is referenced only for mature recording, import/export, effect-chain, macro, analysis, FFmpeg-extension, project/history, and recovery workflow patterns. OpenStem does not copy Audacity source code, documentation text, UI assets, branding, icons, or binaries. Audacity is GPL-family licensed; direct source reuse requires an explicit license decision before merge.

Referenced projects are inspiration, interoperability targets, optional dependencies, or local backend candidates only. This does not imply official affiliation, endorsement, formal approval, or bundled release rights.
