# Legal And About Update

Status: Hardened Functional Alpha.

Current proof note: one local CPU separator proof lane has passed; Beta Candidate still needs final release checklist review, packaged-app review, and user approval.

## Changes

- Legal/About now states that Local Transcription is not stem separation and does not approve Beta Candidate.
- Transcript workflow, prompt library, Deep Read, SubQ, evidence organization, and final text assembly are described as draft workflow tools, not proof.
- Clinical workflows are labeled draft-only, clinician-review-gated, HIPAA-aware, and not automatic HIPAA compliance.
- Mastering Lab is labeled as audio finalization only. It does not promise pro-grade mastering results and does not replace a human mastering engineer.
- Document exports are output-not-verified until a native writer confirms a real nonzero file at the approved path.
- Automatic updates remain disabled until signed manifests or trusted digest policies exist.

## Non-Affiliation Language Added

OpenStem is independent and does not claim official affiliation with:

- Ultimate Vocal Remover
- TurboScribe
- LANDR
- DistroKid Mixea
- Audacity
- Apache OpenOffice
- LibreOffice
- GPT4All
- Ollama
- Whisper
- Web-Audio-Mastering
- Matchering
- FFmpeg
- PyTorch
- Basic Pitch

## Data And Privacy Boundaries

- User audio, transcripts, prompt outputs, mastered exports, recordings, model weights, local caches, auth tokens, and HAR captures must not be committed or packaged.
- Cloud features are disabled by default unless explicitly configured.
- PHI and transcript text must not be uploaded or logged by default.

## Third-Party Notice Updates

- Root `THIRD_PARTY_NOTICES.md` now includes reference-only rows for Whisper-family tools, TurboScribe, GPT4All/Ollama, office/document converters, and LANDR/DistroKid Mixea.
- `docs/THIRD_PARTY_NOTICES.md` now documents the same reference-only boundaries for docs and audits.
