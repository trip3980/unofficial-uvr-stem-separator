---
name: clinical-privacy-security
description: Use when modifying OpenStem HIPAA-aware privacy/security language, clinical transcript storage, PHI handling, local-first safeguards, cloud model gates, BAA-required wording, audit logs, clinical risk registers, or privacy-sensitive export/history behavior.
---

# Clinical Privacy Security

Use this skill for privacy-sensitive clinical transcription and prompt workflows.

## Allowed Language

- `HIPAA-aware`
- `privacy-sensitive`
- `local-first`
- `BAA required for cloud PHI processing`
- `clinician review required`
- `not automatic HIPAA compliance`
- `no PHI is uploaded by default`

## Avoid

- Do not claim certification, compliance, risk-free security, medical-device status, or automated care decisions.
- Do not use security-theater wording.
- Do not say a UI checkbox makes an organization compliant.
- Do not send PHI to cloud services by default.
- Keep cloud PHI processing disabled by default.
- Do not log transcript text, generated clinical text, client names, local paths, or PHI by default.

## Practical Safeguards

Use a workable privacy/security operating model:

1. Minimize data: store metadata only by default.
2. Keep processing local by default.
3. Gate cloud PHI processing behind explicit user action, documented safeguards, and a BAA-required path.
4. Redact logs.
5. Require user-selected output folders.
6. Verify exported files by path and nonzero size.
7. Keep history disabled or metadata-only until local storage controls exist.
8. Make clinician review visible before EHR use.

## Cloud Gate

Cloud PHI processing can be considered only when:

- the user explicitly enables it,
- the destination is documented,
- safeguards are documented,
- BAA-required processing is documented,
- logs and telemetry avoid PHI,
- the user can cancel or disable it,
- the UI shows the privacy boundary clearly.

If these are not true, show `CLOUD_LLM_DISABLED` or `CLOUD_LLM_REQUIRES_EXPLICIT_CONSENT`.

## Verification

- Tests should reject overclaims.
- Tests should confirm cloud processing is disabled by default.
- Tests should confirm transcript text is not stored in logs by default.
- Tests should confirm draft output remains clinician-review gated.
