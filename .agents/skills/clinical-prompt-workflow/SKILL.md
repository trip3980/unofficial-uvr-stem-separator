---
name: clinical-prompt-workflow
description: Use when modifying OpenStem Clinical Workflow Builder, transcript-to-clinical-prompt scaffolds, local LLM readiness, section outputs, unified EHR text boxes, clinician-review gates, clinical export/history, or draft-only prompt workflow behavior.
---

# Clinical Prompt Workflow

Use this skill for OpenStem transcript-to-clinical-draft work.

## Boundaries

- Clinical workflow is documentation support, not source separation.
- Clinical workflow does not approve Beta Candidate.
- Draft output requires clinician review before EHR entry.
- Do not make diagnosis, treatment, medical-device, billing, compliance, or autonomous clinical claims.
- Do not fake local LLM output.
- Do not enable cloud PHI processing by default.
- Do not store transcript text, generated note text, names, local paths, or PHI in logs by default.
- Local LLM readiness requires a real configured local model, context limits, backend health, and a verified run path.
- Browser preview cannot claim it imported local transcript files, wrote exports, or ran a model.
- Clinical local/chat model readiness is separate from OpenStem stem-separation proof.
- Provider-managed pulls, such as Ollama pulls, are not OpenStem SHA-256 proof unless OpenStem has digest verification metadata.
- Do not make huge models the default; prefer a curated laptop proof-of-concept lane first.

## Required Flow

Prefer this path:

Select or paste verified transcript -> choose prompt template -> check local LLM readiness -> run local draft generation -> show separate section outputs -> require clinician review -> assemble unified EHR text -> export only after local file verification.

If any part is not wired, label it `Planned / Not active`, `Browser Preview / Manual Paste Only`, or the specific blocker code.

## Required Default Sections

- Psychoeducation Topics Reviewed
- Benefit From Techniques
- Response to Risk Interventions
- Plan for Next Session
- Talking Points Summary

Each generated section must stay separate before the unified EHR text box. If transcript evidence is missing, write `Insufficient evidence` instead of inventing content.

## Readiness Codes

Use clinical-specific states:

- `CLINICAL_BROWSER_PREVIEW_ONLY`
- `CLINICAL_TRANSCRIPT_INPUT_MISSING`
- `LOCAL_LLM_NOT_CONFIGURED`
- `LOCAL_LLM_READY`
- `LOCAL_LLM_MODEL_MISSING`
- `LOCAL_LLM_CONTEXT_TOO_SMALL`
- `LOCAL_LLM_RUN_FAILED`
- `LOCAL_LLM_OUTPUT_NOT_VERIFIED`
- `CLOUD_LLM_DISABLED`
- `CLOUD_LLM_REQUIRES_EXPLICIT_CONSENT`
- `CLINICAL_OUTPUT_DRAFT_ONLY`
- `CLINICAL_INSUFFICIENT_EVIDENCE`
- `CLINICAL_HISTORY_METADATA_ONLY`
- `CLINICAL_EXPORT_NOT_VERIFIED`
- `CLINICAL_LLM_NOT_CONFIGURED`
- `CLINICAL_LLM_PROVIDER_NOT_RUNNING`
- `CLINICAL_LLM_MODEL_MISSING`
- `CLINICAL_LLM_MODEL_READY`
- `CLINICAL_LLM_PROOF_RUNNING`
- `CLINICAL_LLM_PROOF_PASSED`
- `CLINICAL_LLM_PROOF_FAILED`
- `CLINICAL_LLM_OUTPUT_EMPTY`
- `CLINICAL_LLM_OUTPUT_FORMAT_FAILED`
- `CLINICAL_LLM_INSUFFICIENT_EVIDENCE`
- `CLINICAL_LLM_DRAFT_ONLY`

## Verification Rules

- A section is usable only after a real local model run produces draft text and the clinician reviews it.
- Copy/export stays disabled until the output is generated, reviewed, and verified.
- History is disabled or metadata-only unless explicit local storage settings exist.
- Export completion requires the expected local file path and nonzero file size.

## Local Model Lane

Prefer a curated model catalog:

- Laptop Fast: 3B to 4B local instruct models.
- Balanced Quality: 7B to 9B local instruct models.
- Clinical Language Review: optional medical-language models after license, safety, and workflow review.
- Custom Local Model: manual setup only, never trusted by filename alone.

Default proof-of-concept target may be Qwen3 4B Instruct 2507 Q4_K_M through Ollama when the provider is installed and running. If the provider is not checked, show `CLINICAL_LLM_NOT_CONFIGURED` or provider-specific blocked states.
