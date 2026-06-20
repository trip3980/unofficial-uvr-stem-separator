---
name: missing-resource-recovery
description: Use when OpenStem reports Missing, Blocked, Broken Link, Auth Required, Source Unavailable, Not Checked, Hash Mismatch, Native Backend Required, Output Folder Missing, Model Missing, FFmpeg Missing, Python Missing, unavailable resources, or related diagnostic states. Turns vague blocked states into structured recovery paths without weakening proof, source integrity, native execution, or Beta gates.
---

# Missing Resource Recovery

Use this skill whenever OpenStem reports a missing, blocked, unavailable, not checked, auth-required, broken-link, hash-mismatch, native-backend-required, or related diagnostic state.

## Core Principle

Treat every blocked or missing state as a structured recovery case, not a vague failure.

Answer these questions before changing UI, runtime logic, docs, or final reports:

1. What resource is missing or blocked?
2. Is this an expected proof gate or a possible bug?
3. What system owns the problem?
4. What diagnostic code identifies it?
5. What caused it?
6. What can the user do next?
7. What can the developer fix?
8. What verification proves it is resolved?

Use this recovery flow:

`Detect -> classify -> explain -> offer recovery -> verify -> update state`

## Non-Negotiable Rules

- Do not approve Beta Candidate.
- Do not fake proof.
- Do not fake model verification.
- Do not bypass hash mismatch.
- Do not trust filename matches alone.
- Do not invent URLs, hashes, licenses, file sizes, or source classifications.
- Do not mark a resource resolved unless the real verification passes.
- Do not hide blockers.
- Keep release state at Hardened Functional Alpha unless the user explicitly changes project policy and proof exists.

## Product Model

Follow mature creative-app missing-resource behavior:

- Missing file: offer reconnect.
- Moved file: offer locate/search.
- Broken source: show exact source problem.
- Auth-required source: say Auth Required, not Broken Link.
- Local replacement: verify with SHA-256, not filename alone.
- Resolved resource: become usable only after verification.

Show a simple user message first, then optional diagnostic details.

Example:

`Auth Required - OpenStem reached Hugging Face, but this source requires access. Open source page, configure auth if safely supported, or manually reconnect a verified local file.`

## Recovery Case Shape

Use this structure in code, UI copy, tests, docs, or final reports:

- `resource`: model source, local model file, Python runtime, FFmpeg, output folder, input file, native bridge, connector, mixer session, ensemble backend, or proof asset.
- `state`: missing, blocked, auth_required, broken_link, source_unavailable, rate_limited, not_checked, hash_mismatch, dry_run_only, not_implemented.
- `diagnosticCode`: one explicit code from the OpenStem catalog.
- `owner`: user setup, model registry, native runtime, Electron bridge, backend dependency, output filesystem, source host, or developer implementation.
- `cause`: concrete observed cause, not a guess.
- `userAction`: safe recovery step the user can perform.
- `developerAction`: code/data/config fix if the issue is app-owned.
- `verification`: exact check that proves the resource is resolved.

## Diagnostic Categories

Use these OpenStem recovery categories when applicable:

| Diagnostic code | Resource | Preferred recovery |
| --- | --- | --- |
| `MODEL_SOURCE_AUTH_REQUIRED` | Remote model source | Open source page, configure auth if safely supported, or reconnect verified local file. |
| `MODEL_SOURCE_BROKEN_LINK` | Remote model source | Open source page, update source metadata, or mark unavailable. |
| `MODEL_SOURCE_UNAVAILABLE` | Remote model source/network | Retry check, inspect network/DNS/host state, keep blocked until source is reachable. |
| `MODEL_SOURCE_RATE_LIMITED` | Remote model source | Retry later; do not treat as verified. |
| `MODEL_METADATA_MISSING_HASH` | Model metadata | Import metadata JSON with expected SHA-256, license, source, and size if known. |
| `MODEL_LOCAL_FILE_MISSING` | Local model file | Reconnect local file or search selected folder. |
| `MODEL_LOCAL_HASH_MISMATCH` | Local model file | Block proof; redownload/reimport and verify SHA-256. |
| `MODEL_MANUAL_IMPORT_REQUIRED` | Model library | Import metadata JSON, then reconnect local file and verify SHA-256. |
| `RUNTIME_PYTHON_MISSING` | Python runtime | Select Python executable or install supported Python. |
| `RUNTIME_FFMPEG_MISSING` | FFmpeg runtime | Verify FFmpeg path or install/configure FFmpeg. |
| `RUNTIME_AUDIO_SEPARATOR_MISSING` | AI backend package | Install/repair `audio-separator` in the selected Python environment. |
| `RUNTIME_PYTORCH_MISSING` | AI backend package | Install/repair PyTorch in the selected Python environment. |
| `RUNTIME_NATIVE_BACKEND_REQUIRED` | Electron/native bridge | Use packaged Electron app or native dev mode; browser preview cannot run native separation. |
| `OUTPUT_FOLDER_MISSING` | Output filesystem | Choose output folder. |
| `OUTPUT_FOLDER_NOT_WRITABLE` | Output filesystem | Choose a writable output folder or repair permissions. |
| `INPUT_FILE_MISSING` | Input filesystem | Select/reconnect local input file. |
| `MIXER_NO_VERIFIED_SESSION` | Stem Mixer session | Run verified separation first or load verified stems. |
| `ENSEMBLE_BACKEND_NOT_IMPLEMENTED` | Ensemble runner | Keep planner-only; developer must implement backend runner before execution. |
| `BASIC_PITCH_DRY_RUN_ONLY` | Basic Pitch native execution | Use Electron/native backend for real local MIDI generation; browser preview writes no files. |
| `GENERATIVE_CONNECTOR_NOT_CONFIGURED` | Generative connector | Configure a supported user-authorized connector, or keep generation blocked. |

## Source Classification

Classify source checks by observed response:

- HTTP 401 -> Auth Required.
- HTTP 403 -> Access Denied / Gated.
- HTTP 404 -> Broken Link.
- HTTP 429 -> Rate Limited.
- DNS failure, timeout, no internet, or no HTTP response -> Network or Source Unavailable.

Do not collapse 401, 403, 404, 429, DNS, timeout, and offline states into the same message.

## Model File Rules

A model is proof-eligible only when all are true:

- Local file exists.
- Expected SHA-256 exists.
- Actual SHA-256 matches expected SHA-256.
- Source/license metadata is documented.
- Backend supports the model.
- A later proof run creates non-empty AI-separated stems.

Filename matches are candidates only. A candidate can become usable only after expected SHA-256 matches the local file.

## Recovery Actions To Prefer

Prefer these actions when they match the diagnostic:

- Retry check.
- Open source page.
- Configure auth if safely supported.
- Reconnect local file.
- Search selected folder.
- Import metadata JSON.
- Choose output folder.
- Select Python executable.
- Verify FFmpeg.
- Run backend diagnostics.
- Mark unavailable.
- Explain proof blocker.

## User Message Pattern

Use plain, short first-layer copy:

`<State> - <What OpenStem observed>. <Safe next action>.`

Examples:

- `Broken Link - The source returned HTTP 404. Open the source page, update metadata, or keep this model unavailable.`
- `Hash Mismatch - The local file does not match the expected SHA-256. OpenStem will not use it for proof.`
- `Native Backend Required - Browser Preview cannot run local separation. Use the Electron desktop app.`
- `Output Folder Missing - Choose a writable output folder before starting separation.`

Put diagnostics, exact codes, URLs, local paths, and stack traces in expandable details or logs.

## Verification

Match verification to the resource:

- Model source: source audit or source check returns the correct classified status.
- Local model: SHA-256 verification returns matching expected hash.
- Runtime: backend diagnostics confirms Python, FFmpeg, audio-separator, and PyTorch as required.
- Output folder: filesystem check confirms path exists and is writable.
- Input file: native path exists and is readable.
- Mixer session: verified local AI stem files exist and are non-empty.
- Browser/native boundary: Electron bridge is present before native actions are enabled.
- Proof: real local AI run exits cleanly and produces non-empty stems.

Only update UI/state from blocked to usable after the matching verification passes.
