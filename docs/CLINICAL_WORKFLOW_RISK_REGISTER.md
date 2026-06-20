# Clinical Workflow Risk Register

## Current Risks

| Risk                                                       | Current control                                                               | Verification                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| User treats draft text as reviewed documentation.          | UI says Draft only - clinician review required before EHR entry.              | Tests check the warning appears in UI, docs, and service constants. |
| Cloud model receives PHI without safeguards.               | Cloud model disabled by default; BAA required for cloud PHI processing.       | Tests check `CLOUD_LLM_DISABLED` and cloud gate helper behavior.    |
| Transcript text appears in logs.                           | Privacy service removes transcript and generated-note fields from log events. | Tests call `sanitizeClinicalLogEvent`.                              |
| Local LLM output is faked.                                 | Section outputs say local LLM is not configured.                              | Tests check pending section output wording.                         |
| Clinical workflow is mistaken for source-separation proof. | Docs and UI state it does not affect Beta Candidate.                          | Release-gate tests still require separator proof.                   |
| Export appears complete without a file.                    | Export requires user-selected output path and output-file verification.       | Future native export tests must check path and nonzero size.        |
| History stores PHI by default.                             | History disabled / metadata-only by default.                                  | Tests check history wording and privacy mode.                       |

## Required Before Real Clinical Drafting

- Native transcript import or verified paste workflow.
- Local LLM runner probe.
- Local model source/license documentation.
- Context-window fit check.
- Prompt injection and transcript boundary handling.
- Cancellation and failure states.
- No PHI in logs by default.
- Separate section-output verification.
- Clinician-review gate before copy/export.
- User-selected output folder and nonzero file verification.

## Release Boundary

Clinical workflow readiness is separate from OpenStem release proof. It can improve usefulness, but it cannot approve Beta Candidate.
