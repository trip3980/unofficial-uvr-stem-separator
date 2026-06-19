---
name: model-integrity
description: Use for OpenStem Model Manager, model registry, manual import, SHA-256 verification, broken links, HTTP 401 or 404 sources, proof eligibility, verified model blockers, and model-source audits.
---

# Model Integrity

Use this skill whenever model source truth, local model verification, or proof eligibility is involved.

## Non-Negotiable Rules

- Never invent model URLs, hashes, file sizes, licenses, source status, or verification status.
- Do not run CPU proof with an unverified model.
- Hash mismatch blocks proof.
- Manual import without an expected SHA-256 is not verified.
- Ensemble presets are not proof-eligible model weight files.
- `proof:check` must remain blocked until at least one verified model weight file exists.

## Proof Eligibility

A model is proof-eligible only when all of these are true:

- The local file exists.
- The expected SHA-256 exists.
- The actual SHA-256 matches the expected SHA-256.
- Expected size is valid or otherwise verified.
- The backend supports the model.
- License and source status are documented.

## Current Registry Truth

- Registry entries: 28 total.
- Direct source statuses: 24 `broken_link`, 1 `unavailable`, 1 `experimental`.
- Verified ensemble presets: 2.
- Verified weight files: 0.
- Configured download URLs unavailable: 24 total, with 22 HTTP 401 and 2 HTTP 404.
- CPU AI proof was not run because no proof-eligible verified model asset exists.

Interpret HTTP 401 as inaccessible or authorization required. Interpret HTTP 404 as source not found. Preserve this honesty until a real verified model asset exists.
