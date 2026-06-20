# GPT4All Reference Audit

Release state: Hardened Functional Alpha.

Current proof note: one local CPU separator proof lane has passed; Beta Candidate still needs final release checklist review, packaged-app review, and user approval.

Reference repository: https://github.com/nomic-ai/gpt4all

Reference checkout inspected: local external reference checkout, not committed to OpenStem.

Reference commit inspected: `b666d16db5aeab8b91aaf7963adcee9c643734d7`

## Scope And Boundary

GPT4All is a local LLM/chat application. OpenStem is a local audio stem-separation workstation. This audit does not recommend importing GPT4All LLM inference code, chat UI logic, GPT4All branding, or GPT4All model entries.

The useful reference pattern is the mature local-AI desktop behavior:

- one installable desktop shell,
- a visible model catalog,
- a local model folder,
- download and resume states,
- local model discovery,
- custom or remote provider entries,
- hardware-fit warnings,
- model metadata caching,
- update/release metadata,
- clear local/private messaging when network features are optional.

OpenStem should adapt those ideas for audio models while keeping stricter source, license, SHA-256, backend, and proof gates.

## GPT4All Files And Areas Inspected

- `LICENSE.txt`
- `gpt4all-chat/LICENSE`
- `gpt4all-chat/metadata/models3.json`
- `gpt4all-chat/metadata/models.json`
- `gpt4all-chat/metadata/models2.json`
- `gpt4all-chat/metadata/release.json`
- `gpt4all-chat/metadata/latestnews.md`
- `gpt4all-chat/src/modellist.h`
- `gpt4all-chat/src/modellist.cpp`
- `gpt4all-chat/src/download.h`
- `gpt4all-chat/src/download.cpp`
- `gpt4all-chat/src/mysettings.h`
- `gpt4all-chat/src/mysettings.cpp`
- `gpt4all-chat/qml/AddModelView.qml`
- `gpt4all-chat/qml/AddGPT4AllModelView.qml`
- `gpt4all-chat/qml/AddHFModelView.qml`
- `gpt4all-chat/qml/AddRemoteModelView.qml`
- `gpt4all-chat/qml/ModelsView.qml`
- `gpt4all-chat/qml/ApplicationSettings.qml`
- `gpt4all-chat/qml/NetworkDialog.qml`
- `gpt4all-chat/qml/StartupDialog.qml`
- `gpt4all-chat/CMakeLists.txt`
- `gpt4all-chat/flatpak-manifest/io.gpt4all.gpt4all.appdata.xml`

No GPT4All source files were copied into OpenStem.

## License Finding

GPT4All application code is MIT licensed. The `gpt4all-chat/LICENSE` file includes an addendum stating that loaded LLM models are separate from the application software license.

OpenStem adaptation:

- GPT4All code concepts may be used as reference, but copied code would require preserving MIT notices.
- GPT4All model metadata and linked model weights are separate legal objects.
- GPT4All LLM entries must not become OpenStem audio model entries.
- OpenStem model metadata must document each audio model source, license, expected filename, expected size when known, and expected SHA-256 independently.

## What GPT4All Does Well

1. It makes local model management feel like part of one desktop product.
2. It separates installed models from downloadable catalog models.
3. It stores user model files in an app data model path rather than in source code.
4. It exposes a model path setting with browse support.
5. It parses a remote model catalog into UI roles such as name, filename, file size, URL, RAM required, parameters, quant, type, installed, incomplete, downloading, and download error.
6. It supports resumable downloads through an `incomplete-` temp file.
7. It hashes the completed temp file before moving it into the final model path.
8. It shows download progress, speed, cancel, resume, remove, and error states.
9. It displays hardware warnings before model use when system RAM is below the model requirement.
10. It uses cache fallback for catalog metadata if the network request fails.
11. It supports discovered Hugging Face GGUF models while warning that discovered models may need extra configuration.
12. It separates release/update metadata from model download state.
13. It tells users when network/datalake features change privacy expectations.

## What Should Be Adapted Into OpenStem

### Model Library / Explore Models

OpenStem should keep the main UVR-style separator workflow dominant, but the Model Manager can use a GPT4All-style explorer:

- Curated Audio Model Library,
- Installed Local Weights,
- Custom Imported Models,
- Reconnected Local Files,
- Proof Eligible Models,
- Blocked / Needs Metadata,
- Auth Required,
- Broken Link,
- Source Unavailable,
- Hash Mismatch.

The GUI can show many audio models without bundling them. Catalog visibility does not imply local availability, compatibility, hash verification, or proof eligibility.

### Metadata Manifest

GPT4All's `models3.json` shows why a single catalog record is useful. OpenStem's audio manifest should keep these OpenStem-native fields:

- model id,
- display name,
- source project,
- source URL,
- source status,
- license,
- filename,
- expected size when known,
- expected SHA-256,
- backend,
- architecture,
- stem type,
- recommended use,
- CPU/GPU notes,
- RAM/VRAM estimate,
- local status,
- proof eligibility.

OpenStem should not inherit GPT4All's legacy MD5 pattern. Proof-eligible audio weights require SHA-256.

### Download Versus Sideload

GPT4All cleanly distinguishes catalog downloads, discovered models, local installed files, and remote provider records. OpenStem should use:

- curated download source,
- manual import,
- reconnect local file,
- search selected folder,
- custom model metadata import,
- source page opening,
- verification before use.

Manual imports are useful library entries, but not proof eligible until trusted expected SHA-256 metadata exists and the local file matches it.

### Hardware Fit Warning

GPT4All uses `ramrequired` and system RAM to warn before use. OpenStem should keep its stricter distinction:

- compatible but slow,
- GPU recommended,
- likely too large,
- CPU usable,
- static estimate only,
- not a benchmark,
- not proof readiness.

Hardware fit warnings should guide the user without overriding model integrity gates.

### Update And Catalog Refresh

GPT4All has release metadata and catalog metadata flows. OpenStem should preserve separate lanes:

- program updates,
- model catalog metadata refresh,
- model weight replacement.

No lane should claim success until its own signed or digest-verified manifest, source/license metadata, and SHA-256 checks pass.

### Recovery Behavior

OpenStem should adapt the mature missing-resource rhythm:

Detect -> classify -> explain -> offer recovery -> verify -> update state.

Preferred actions:

- retry source check,
- open source page,
- configure auth only if safely supported,
- reconnect local file,
- search selected folder,
- import metadata JSON,
- verify SHA-256,
- mark unavailable.

## What Should Not Be Adapted

- LLM inference code.
- Chat UI logic.
- GPT4All branding or model names in OpenStem UI.
- GPT4All LLM model entries as OpenStem audio model metadata.
- GPT4All telemetry/network behavior without separate privacy review.
- GPT4All's legacy MD5 catalog entries for proof.
- Remote provider/API-key flows unless OpenStem later adds a documented, privacy-reviewed connector.
- Large code copies from Qt/QML/C++ into React/Electron.

## Model-Library Pattern Comparison

| Pattern         | GPT4All                                                  | OpenStem adaptation                                                                  |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Main product    | Local LLM/chat desktop app                               | Local audio stem-separation workstation                                              |
| Catalog         | `models3.json` and discovered Hugging Face GGUF models   | Curated audio model manifest plus custom local metadata                              |
| Installed state | Local model path, installed/incomplete/downloading flags | Local model index, installed/verification-pending/hash-verified/hash-mismatch states |
| Hash            | MD5 and SHA-256 in current catalog                       | SHA-256 required for proof eligibility                                               |
| Hardware        | RAM required warning                                     | RAM/VRAM/static hardware-fit warning separate from proof                             |
| Sideload        | Discovered or local model metadata saved in settings     | Manual import/reconnect with SHA-256 verification and proof blocker details          |
| Updates         | Release metadata and installer repository concepts       | Program, catalog, and model-weight lanes kept separate                               |

## Custom And Sideloaded Model Comparison

GPT4All allows models that were not originally installed from the catalog to be represented in the model list and persisted through settings. OpenStem should do the same only with stronger proof rules:

- Custom model can appear in the library.
- Custom model can be inspected and kept for future use.
- Custom model can store local path and actual SHA-256.
- Custom model without expected SHA-256 remains `Custom / Hash unavailable`.
- Matching filename is not enough.
- Matching local SHA-256 against trusted metadata is required before proof eligibility.

## Hardware-Fit Warning Comparison

GPT4All shows simple RAM warnings from catalog metadata. OpenStem already has richer hardware-fit states. The useful adaptation is product clarity:

- show the warning near the model card,
- keep the warning human-readable,
- avoid treating the warning as a hard blocker unless the backend truly cannot run,
- state that hardware estimates are not live benchmarks,
- state that hardware fit does not equal proof.

## Download And Update Metadata Comparison

GPT4All downloads to an incomplete temp path, supports resume, then hashes and saves. OpenStem should keep and expand its equivalent:

- download only from allowed source status,
- stream into `.openstem-partial`,
- compute SHA-256,
- compare expected SHA-256,
- write verified local index state only after match,
- never treat source reachability or download completion as proof.

Catalog refresh should be metadata-only until the manifest is trusted and validated.

## Local-First And Offline Behavior Comparison

GPT4All's local model path makes downloaded models feel integrated into the app. OpenStem should use the same product illusion carefully:

- audio files remain local,
- model weights live outside source control and outside the installer,
- native Electron mode is required for real local execution,
- browser preview cannot write verified files,
- offline catalog cache may describe previously known entries but must not claim current source status,
- proof requires actual local non-empty output stems.

## Error And Recovery Workflow Comparison

GPT4All shows download errors, network errors, incomplete downloads, and install/remove controls. OpenStem should keep richer diagnostic codes:

- `MODEL_SOURCE_AUTH_REQUIRED`,
- `MODEL_SOURCE_BROKEN_LINK`,
- `MODEL_SOURCE_UNAVAILABLE`,
- `MODEL_SOURCE_RATE_LIMITED`,
- `MODEL_METADATA_MISSING_HASH`,
- `MODEL_LOCAL_FILE_MISSING`,
- `MODEL_LOCAL_HASH_MISMATCH`,
- `MODEL_MANUAL_IMPORT_REQUIRED`.

OpenStem should show a simple user message first, then optional diagnostic details.

## How GPT4All Makes Many Models Feel Built Into One App

GPT4All feels like one standalone app that contains many models because the installer ships the GUI, local runtime, model list UI, catalog loader, download manager, model path setting, and local loader. It does not need to bundle every model weight.

The app contains the GUI and runtime, not all model weights.

The model list/catalog makes many models visible.

Downloads and sideloads populate the local model folder.

The GUI treats local model storage as part of the product experience.

Hardware warnings guide the user before download or use.

OpenStem should copy this pattern for audio models, but with stricter SHA-256 proof gates.

OpenStem should feel like it contains a full audio-model workstation, but technically it should manage models through a catalog, local cache, manual import, reconnect tools, and proof eligibility checks. The installer should contain the application and runtime helpers, not unverified model weights.

## Security, Vulnerability, and Remote Update Lessons from GPT4All

Inspection date: 2026-06-19.

Reference sources inspected:

- GitHub Security tab: `https://github.com/nomic-ai/gpt4all/security`
- GitHub releases: `https://github.com/nomic-ai/gpt4all/releases`
- Open update RFC: `https://github.com/nomic-ai/gpt4all/issues/2878`
- Open checksum/signing request: `https://github.com/nomic-ai/gpt4all/issues/3653`
- Open security PR: `https://github.com/nomic-ai/gpt4all/pull/3647`
- Current reference checkout files:
  - `.circleci/continue_config.yml`
  - `.github/workflows/codespell.yml`
  - `gpt4all-chat/CMakeLists.txt`
  - `gpt4all-chat/src/llm.cpp`
  - `gpt4all-chat/src/download.cpp`
  - `gpt4all-chat/src/modellist.cpp`
  - `gpt4all-chat/qml/ApplicationSettings.qml`
  - `gpt4all-bindings/python/docs/gpt4all_api_server/home.md`
  - `gpt4all-bindings/python/docs/gpt4all_desktop/settings.md`

### GPT4All Security Policy Finding

The GitHub Security tab currently reports no repository `SECURITY.md` and no published security advisories. The local reference checkout also has no root `SECURITY.md`.

OpenStem adaptation:

- Add a local draft security policy before adding any app auto-update path.
- Keep vulnerability reporting, supported versions, update trust, model-weight trust, and executable-path trust documented separately from marketing or release-readiness language.
- Do not treat the absence of GPT4All advisories as proof that its dependency or updater surface is risk-free.

### GPT4All Published Advisory Finding

No published GitHub security advisories were visible for the inspected GPT4All repository.

OpenStem adaptation:

- Use `npm audit`, dependency review, and release checklist gates as OpenStem's own security process.
- Do not wait for upstream advisories before addressing OpenStem dependency or subprocess risks.

### GPT4All Vulnerability And PR Finding

The inspected GitHub search found an open PR titled `[Security] Fix HIGH vulnerability: CVE-2024-21538` against GPT4All TypeScript binding dependency metadata. It also found an open issue asking for checksums or signatures for release files.

OpenStem adaptation:

- Treat open vulnerability and checksum/signing requests as evidence that update and dependency hygiene must be explicit.
- Keep dependency audit output in release notes or internal release evidence.
- Do not claim update trust until the artifact and dependency evidence is documented.

### GPT4All Installer And Update Mechanism Finding

GPT4All currently uses Qt Installer Framework concepts, installer repositories, and a `MaintenanceTool` update/repair path. The app exposes a manual `Check For Updates` action that starts the maintenance tool when it exists. The update RFC proposes replacing this with a custom updater and manifest flow, but that proposal is not the same as a fully implemented, audited, signed updater.

The reference CI contains macOS code-signing and notarization jobs, Windows AzureSignTool signing jobs, and installer smoke tests for selected builds. The latest GitHub release assets inspected through the GitHub API did not expose release asset digests in the `digest` field.

OpenStem adaptation:

- Do not add `electron-updater`, a custom updater, or remote installer execution until OpenStem has a signed release manifest or documented trusted digest policy.
- Program updates must remain manual until installer SHA-256 verification, version/channel policy, user consent, failure handling, and packaged-app launch verification exist.
- Passing an app update check must never count as AI proof.

### GPT4All Remote Update Manifest, Digest, And Signature Finding

GPT4All's current installer repository flow uses Qt IFW repository metadata. The RFC proposes a future manifest with fields such as installer URI, SHA-256, signed status, release type, compatibility metadata, and SBOM manifest. That is useful design input, but it is not enough to prove a production-grade updater for OpenStem.

OpenStem adaptation:

- Minimum app-update requirements before any auto-update:
  - signed release artifacts or trusted digest policy,
  - remote update manifest,
  - stable/beta channel and version policy,
  - rollback or manual failure recovery,
  - user-visible update consent,
  - documented Windows signing and future macOS notarization strategy,
  - dependency/security audit process,
  - release checklist update gate,
  - no auto-run of downloaded executables outside an installer/updater trust path.

### GPT4All Model Catalog Trust Finding

GPT4All downloads model catalog metadata from a remote `models3.json` flow and falls back to cached catalog data when the network fetch fails. The catalog supports MD5 and SHA-256 fields and uses metadata to drive model-list UI state.

OpenStem adaptation:

- A remote model catalog refresh may only update metadata.
- Remote metadata must be schema-validated and treated as untrusted until it passes source, license, backend, filename, size, and SHA-256 rules.
- Catalog visibility, source reachability, and cached metadata must not imply local availability, verification, or proof eligibility.
- Remote metadata must not silently replace expected hashes.

### GPT4All Model Download Verification Finding

GPT4All downloads model files into incomplete temporary files, computes the catalog hash, rejects mismatches, and only then moves or copies the file into the model path. Current catalog data still includes many MD5 entries, with some SHA-256 entries.

OpenStem adaptation:

- Keep the temporary-file download pattern.
- Use SHA-256 only for OpenStem proof eligibility.
- A model is proof eligible only when local file exists, expected SHA-256 exists, actual SHA-256 matches, source/license metadata is documented, the backend supports the model, and a later proof run creates non-empty stems.
- Filename matches and download completion are candidates only.

### GPT4All Network And Privacy Boundary Finding

GPT4All frames local desktop use as private and local-first. Its docs also expose optional network features: Datalake opt-in, remote model providers, optional Nomic Embed API, and a local HTTP API server that listens on localhost by default. The inspected source disables TLS peer verification for some metadata and download requests.

OpenStem adaptation:

- Audio files stay local unless a future remote feature is explicitly documented and user-consented.
- Model weights stay local after install/import.
- Browser mode cannot write verified files.
- Electron native mode is required for local execution.
- FFmpeg, Python, and model executable paths must be user-selected or detected and validated before use.
- Subprocess calls must use argument arrays, not shell strings.
- Renderer code must not gain an arbitrary executable bridge.
- OpenStem should not copy disabled TLS verification behavior.

### What OpenStem Should Adopt

- One desktop app shell with local asset management.
- Clear separation between program update, model catalog metadata refresh, and model weight replacement.
- Manual update checks until trust infrastructure exists.
- Installer artifact signing and digest verification as release evidence.
- Catalog cache fallback wording that says cached metadata, not current source status.
- Temporary downloads, local hashing, and blocked mismatch states.
- User-visible update consent before install or replacement.
- A vulnerability reporting and dependency audit cadence.

### What OpenStem Should Avoid

- Adding auto-update because GPT4All has a maintenance tool or proposed updater.
- Treating a release page, catalog refresh, or source URL as trust.
- Silent model updates, silent app installs, or silent executable replacement.
- Accepting remote metadata as verified.
- Allowing remote metadata to replace expected SHA-256 silently.
- Running downloaded executables outside a documented installer/updater trust path.
- Copying GPT4All branding, LLM metadata, chat UI behavior, or disabled TLS verification behavior.

### OpenStem Security Policy Recommendations

OpenStem should keep `docs/SECURITY_POLICY_DRAFT.md` until a real public security policy is ready. It should define:

- how to report vulnerabilities,
- supported versions,
- dependency audit cadence,
- no secrets in bug reports,
- model-weight trust rules,
- executable path trust rules,
- app-update signing or digest policy before auto-update,
- model catalog update limits,
- Beta Candidate proof boundary.

### OpenStem App-Update Recommendations

OpenStem app updates remain manual. Before adding auto-update, OpenStem needs:

- a signed release manifest or trusted digest policy,
- per-platform installer artifact SHA-256,
- version and release channel rules,
- user-visible consent,
- failure handling and manual recovery,
- packaged-app launch verification after update,
- Windows signing evidence and future macOS notarization plan,
- dependency/security audit evidence in the release checklist.

No updater package was added in this audit. That is intentional.

### OpenStem Model-Update Recommendations

Model catalog updates may refresh metadata only. They must not:

- mark a model verified,
- mark a model proof-eligible,
- bypass source/license checks,
- bypass SHA-256 checks,
- silently replace expected hashes,
- silently install model weights,
- silently run downloaded files.

They may:

- refresh source status,
- refresh model metadata,
- show new catalog entries,
- show auth-required, broken-link, or source-unavailable status,
- show update readiness,
- recommend manual action.

Passing a model catalog update is not model proof. Passing `release:check` is not AI proof.

## Specific OpenStem Implementation Recommendations

1. Keep the classic path dominant: Select input -> select output -> choose model -> check readiness -> run -> show progress -> show real outputs.
2. Keep Model Manager as the place for catalog exploration, import, reconnect, source checks, and hash diagnostics.
3. Make model cards show separate badges for catalog-visible, source status, installed, hash verified, compatible, hardware warning, and proof eligible.
4. Keep custom/imported models visible but blocked from proof until expected SHA-256 exists and matches.
5. Keep program updates, catalog updates, and model-weight updates in separate lanes.
6. Add catalog refresh only after a trusted manifest and validation workflow exist.
7. Preserve source audits that distinguish HTTP 401 auth required, HTTP 403 gated/access denied, HTTP 404 broken link, HTTP 429 rate limited, and network errors.
8. Preserve local-first wording: local files remain local; browser preview is not native execution.

## Risks

- Too many model badges can recreate the confusion OpenStem has been reducing.
- Model catalog visibility can be mistaken for availability if wording is loose.
- Download completion can be mistaken for verification if progress UI is over-celebratory.
- Hardware-fit warnings can be mistaken for proof readiness.
- Catalog refresh can accidentally look like a working updater before trust policy exists.
- LLM reference metadata can leak into audio model docs if not explicitly blocked.
- Copying GPT4All code would require notice handling and is unnecessary for the current React/Electron architecture.

## Proposed Follow-Up Tasks

1. Add an OpenStem model-card state table that maps catalog, source, local, hash, hardware, and proof states to exact UI labels.
2. Add a model catalog manifest validator that refuses placeholder hashes, missing licenses, path-bearing filenames, and unknown source status.
3. Add a local model folder settings panel that explains where weights live without implying bundled weights.
4. Add catalog-cache wording for offline mode: previously cached metadata only, not current source status.
5. Add a packaged-app smoke test that opens Model Manager and verifies no model weights are bundled.
6. Add a future catalog refresh manifest design with signed or digest-verified metadata.

## Final Recommendation

Use GPT4All's standalone shell plus model-catalog pattern, not its LLM domain behavior. OpenStem should look like a complete audio-model workstation while technically shipping the app shell, runtime helpers, source-integrity tools, and model-management workflow. Model weights remain external until downloaded, imported, reconnected, verified by SHA-256, and later proven by a real local stem-separation run.

Release state remains Hardened Functional Alpha.

Beta Candidate still needs final release checklist review, packaged-app review, and user approval.
