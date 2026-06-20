# OpenStem Update Strategy

Release state: Hardened Functional Alpha.

Beta Candidate is not approved by update plumbing. Current Beta status is governed by separator proof evidence, packaged-app checks, and final release checklist review.

## Purpose

OpenStem needs a future update path that feels familiar to desktop users without pretending updates are active today. The safe target is an Update Center with clear lanes:

1. Program updates.
2. Model catalog metadata updates.
3. Model weight replacement.

Each lane has its own trust checks. Passing one lane must not imply another lane is ready.

## Current State

- Windows packaging works.
- Packaged runtime diagnostics have passed in prior local verification.
- No app-update feed is configured.
- No signed update manifest is configured.
- No automatic update installer is wired.
- No model-catalog refresh feed is configured.
- No model weight should be replaced without source/license metadata and SHA-256 verification.

The current UI should therefore say manual updates only, no silent installs, and no update check has run.

## Security And Trust Boundary

OpenStem should learn from mature local-AI apps without inheriting unsafe update assumptions. A visible update center is acceptable only when it reports current blocked state honestly.

Before any updater package or remote app-update check is enabled, OpenStem needs:

- signed release artifacts or a documented trusted digest policy,
- remote update manifest,
- version and channel policy,
- rollback or manual failure recovery,
- user-visible update consent,
- documented Windows signing and future macOS notarization strategy,
- dependency/security audit process,
- release checklist update gate,
- no auto-run of downloaded executables outside an installer/updater trust path.

`docs/SECURITY_POLICY_DRAFT.md` is the current security-policy placeholder. It must be replaced or promoted before a public updater or security response process is claimed.

## Program Update Lane

Before app update checks are enabled, OpenStem needs:

- HTTPS release feed or app-update manifest.
- Signed manifest or documented trusted digest policy.
- Installed version comparison.
- Installer artifact SHA-256 verification.
- User-visible prompt before install.
- Packaged-app launch test after update.
- Manual recovery or rollback instructions.

Recommended later implementation:

- Add an updater only after the release feed and signing or digest policy are documented.
- Keep `electron-updater` or any similar package optional until that backend exists.
- Verify installer artifacts with `npm.cmd run verify:artifacts`.
- Keep build outputs, installers, logs, downloaded assets, and temp files out of source control unless explicitly approved.
- Do not auto-run downloaded executables outside a documented installer/updater trust path.

## Model Catalog Update Lane

Before catalog refresh is enabled, OpenStem needs a versioned manifest that includes:

- model id,
- display name,
- model family and architecture,
- backend,
- source project,
- source URL,
- source status,
- expected filename,
- expected size when known,
- expected SHA-256,
- license,
- compatibility metadata.

Catalog metadata alone cannot make a model proof-eligible.

Remote catalog metadata is untrusted until validated. Catalog refresh may show new entries or source status, but it must not mark a model verified, mark a model proof-eligible, replace expected hashes silently, install model weights silently, or run downloaded files.

## Model Weight Replacement Lane

Before replacing local model weights, OpenStem must verify:

- native Electron bridge is available,
- source access is allowed,
- expected SHA-256 exists,
- download writes to a partial temp file first,
- actual SHA-256 matches expected SHA-256,
- local model index records the verification status.

Download completion is not verification. Filename matches are candidates only. Hash mismatch remains blocked.

## User Workflow

Keep the basic OpenStem/UVR-style path dominant:

Select input -> select output -> choose model -> check readiness -> run -> show progress -> show real outputs.

Update surfaces should support that path, not compete with it. If a model update is needed, the UI should explain the exact blocker and recovery action:

- open source page,
- import metadata JSON,
- reconnect local file,
- search selected folder,
- download only when source and SHA-256 rules allow it,
- verify SHA-256 before use.

## Verification Commands

For update-related code or UI changes:

```powershell
npm.cmd run lint -- --pretty false
npm.cmd run lint:eslint
npm.cmd run format:check
npm.cmd run build
npm.cmd run test
```

For packaging or release-status changes:

```powershell
npm.cmd run release:check
```

`release:check` passing is release-readiness evidence only. It does not satisfy AI proof and does not approve Beta Candidate.
