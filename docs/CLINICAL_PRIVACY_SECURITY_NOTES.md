# Clinical Privacy And Security Notes

## Position

OpenStem treats HIPAA as a workable privacy/security operating model for clinical workflows, not as a badge claim. The app can be HIPAA-aware, privacy-sensitive, and local-first while still requiring organizational policies, configuration, and review outside the codebase.

OpenStem should say:

- HIPAA-aware
- privacy-sensitive
- local-first
- BAA required for cloud PHI processing
- clinician review required
- not automatic HIPAA compliance

OpenStem should not claim certification, risk-free security, medical-device status, or automated care decisions.

## Practical Safeguards

- Keep clinical processing local by default.
- Keep cloud model processing disabled by default.
- Do not upload PHI by default.
- Do not log transcript text, generated clinical text, names, or local paths by default.
- Store history as disabled or metadata-only until local storage controls exist.
- Require user-selected output folders.
- Verify exported files by path and nonzero size.
- Show draft-only and clinician-review warnings before EHR use.

## Cloud PHI Boundary

Cloud model processing can be considered only after:

1. the user explicitly enables it,
2. the destination is documented,
3. safeguards are documented,
4. BAA-required processing is documented,
5. logs and telemetry avoid PHI,
6. the user can disable it,
7. the UI explains the boundary.

Until those conditions exist, OpenStem should show `CLOUD_LLM_DISABLED` or `CLOUD_LLM_REQUIRES_EXPLICIT_CONSENT`.

## Reference Notes

The HHS HIPAA Security Rule summary describes administrative, physical, and technical safeguards for electronic protected health information: [HHS Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html).

Microsoft's HIPAA/HITECH documentation states that a BAA can support covered entity and business associate customers for in-scope services, but use of a service alone does not make an organization compliant: [Microsoft HIPAA/HITECH](https://learn.microsoft.com/en-us/compliance/regulatory/offering-hipaa-hitech).

## OpenStem Interpretation

These references support conservative product behavior:

- local-first defaults,
- explicit cloud gates,
- BAA-required wording for cloud PHI processing,
- no automatic compliance claims,
- clinician review before EHR entry.
