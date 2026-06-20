---
name: update-workflow
description: Use for OpenStem program updates, app-update manifests, model-catalog refreshes, model-weight replacement, update UI wording, release feeds, installer verification, and future auto-update planning.
---

# Update Workflow

Use this skill whenever OpenStem work touches application updates, model catalog updates, model-weight replacement, update checks, release feeds, installer verification, or updater UI.

## Core Rule

Program updates, model-catalog metadata updates, and model-weight replacement are separate lanes. Do not merge their status or let one lane prove another.

## Non-Negotiable Rules

- Do not approve Beta Candidate.
- Do not fake update checks.
- Do not claim no updates, current version, updated catalog, installed update, or replaced weights unless a real check or verification passed.
- Do not silently install updates.
- Do not silently replace model weights.
- Do not trust filename matches alone.
- Do not trust download completion as verification.
- Do not invent update URLs, release feeds, signatures, hashes, model licenses, model sizes, or source status.
- Do not bundle Python, FFmpeg, models, weights, or cached assets unless licensing and release strategy are documented.

## App Update Lane

Required before enabling app update checks:

- HTTPS release feed or app-update manifest.
- Signed manifest or documented trusted digest policy.
- Version comparison against the installed packaged app version.
- Installer artifact SHA-256 verification.
- User-visible prompt before install.
- Packaged-app launch test after update.
- Manual recovery or rollback path documented.

Until this exists, app update UI must say `APP_UPDATE_BACKEND_NOT_CONFIGURED`, `Planned / Not configured`, or equivalent blocked wording.

## Model Catalog Update Lane

Required before catalog refresh:

- Versioned model catalog manifest.
- Source URL, source project, expected filename, license, backend, and source status for every changed entry.
- Expected SHA-256 before proof eligibility.
- Source audit classification for auth-required, access denied, broken link, rate limited, network unavailable, DNS failed, timeout, and missing hash.
- Registry validation after manifest import.

Catalog metadata alone must never mark a model proof-eligible.

## Model Weight Replacement Lane

Required before replacing local weights:

- Native Electron bridge available.
- Allowed source status.
- Expected SHA-256 exists.
- Download writes to a partial temp file first.
- Actual SHA-256 matches expected SHA-256.
- Local model index records verification status.
- Proof remains blocked until model, backend, input, output, and E2E output checks pass.

Use `MODEL_UPDATE_HASH_REQUIRED` when a replacement cannot be trusted yet.

## UI Language

Prefer:

- `No update check has run.`
- `Program updates: Planned / Not configured.`
- `Model catalog refresh: Manifest required.`
- `Model weight replacement: Hash verification required.`
- `Manual updates only.`
- `No silent installs.`

Avoid:

- `Up to date`
- `Latest`
- `Updated successfully`
- `Ready to install`
- `Auto-updated`
- `Verified update`

unless the real update lane has passed its verification steps.

## Verification

After update-workflow changes, run:

- `npm.cmd run lint -- --pretty false`
- `npm.cmd run lint:eslint`
- `npm.cmd run format:check`
- `npm.cmd run build`
- `npm.cmd run test`

Run `npm.cmd run release:check` when packaging or release status is affected. `release:check` passing does not approve Beta Candidate.
