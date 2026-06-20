# Clinical Prompt Workflow

## Purpose

Clinical Workflow Builder is a HIPAA-aware local-first draft workflow for turning a verified local transcript into clinician-reviewed note sections.

It is not a medical device, not automatic HIPAA compliance, and not source-separation proof.

## Current Status

- Transcript input: Browser Preview / Manual Paste Only.
- Local LLM runner: `LOCAL_LLM_NOT_CONFIGURED`.
- Cloud model: `CLOUD_LLM_DISABLED`.
- Section outputs: pending.
- Unified EHR text box: empty until local draft generation and clinician review.
- Export: `CLINICAL_EXPORT_NOT_VERIFIED`.
- History: `CLINICAL_HISTORY_METADATA_ONLY` or disabled.

## Default Template

Template name: `Session Clinical Summary - Client-Focused Lines`

Default sections:

1. Psychoeducation Topics Reviewed
2. Benefit From Techniques
3. Response to Risk Interventions
4. Plan for Next Session
5. Talking Points Summary

Rules:

- Begin client-focused sections with `The client`.
- Do not identify the counselor by name or role unless clinically necessary and transcript-supported.
- Use only transcript-supported evidence.
- If evidence is missing, write `Insufficient evidence`.
- Draft only - clinician review required before EHR entry.

## Required Future Flow

Select or paste verified transcript -> choose prompt template -> check local LLM readiness -> run local draft generation -> show separate section outputs -> require clinician review -> assemble unified EHR text -> export only after local file verification.

## Local Model Candidates

OpenStem now has a curated Clinical Local Model lane for draft prompting. The default proof-of-concept recommendation is Qwen3 4B Instruct 2507 Q4_K_M through Ollama if the provider is installed and running.

This lane may later support local model runners such as:

- Ollama
- llama.cpp
- GPT4All
- LM Studio

Adding a runner requires:

- configured endpoint or binary,
- documented model source and license,
- local health check,
- context-window fit check,
- cancellation handling,
- no PHI in logs by default,
- section-output verification,
- clinician-review gate.

Clinical local model proof-of-concept is not OpenStem separator proof. It uses a synthetic non-PHI transcript, required-prefix checks, counselor-mention checks, insufficient-evidence fallback, and draft-only warnings.

See `docs/LOCAL_CLINICAL_MODEL_GUIDE.md` and `docs/LOCAL_CLINICAL_MODEL_REFERENCE_AUDIT.md`.

## Release Boundary

Clinical Workflow Builder does not affect or approve Beta Candidate. Beta status is governed by separator proof evidence and final release checklist review.
