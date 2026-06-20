# OpenStem Ponytail-Style Coherence Audit

Status boundary: Hardened Functional Alpha. One local CPU `audio-separator` / `1_HP-UVR.pth` proof lane has passed and is re-verified by `proof:check`; Beta Candidate is still pending final release checklist review, packaged-app review, and user approval.

## Delete / Consolidate List Before Changes

- Keep historical reference audits, but do not use them as current release-state sources when they predate the completed proof lane.
- Do not delete duplicate third-party notices: the root notice is packaged, while `docs/THIRD_PARTY_NOTICES.md` supports audit context.
- Do not remove workflow scaffolds in this pass because many are covered by regression tests and the worktree already has broad uncommitted feature additions.
- Consolidate current proof truth into `README.md`, `docs/PROOF_ASSET_CHECKLIST.md`, `docs/RELEASE_CHECKLIST.md`, and `docs/BETA_PROOF_CHAIN_AUDIT.md`.
- Rewrite active UI/manual strings that say Beta is still blocked only because proof has not run.
- Keep `Planned / Not active`, `Reference only`, `Not measured`, `Requires local backend`, and `Diagnostics only, not proof` as the shared status vocabulary.
- Defer dependency cleanup: `npm.cmd ls --depth=0` shows no obvious newly unnecessary package to remove safely during this polish pass.

## Duplicate Patterns Found

- Proof boundary language appears in README, release checklist, proof checklist, About, Host Setup, Model Manager, manuals, and multiple historical audits.
- Reference-project docs repeat the same no-copy/no-branding/no-proof rules.
- Transcription, document, prompt-library, ledger, mastering, and clinical workflow docs all restate that they do not approve Beta Candidate.
- Several active UI labels still said `Beta Candidate Blocked` or `Beta Candidate remains strictly blocked` after the CPU proof lane had passed.
- Multiple workflow services use separate `doesNotAffectReleaseGate()` helpers with similar text; this is safe but should eventually become a shared copy helper.
- Planned workspaces have many honest `Planned / Not active` labels; the risk is volume, not fake success.

## Safe Simplifications Applied

- Active Beta wording now distinguishes completed local proof from final Beta approval.
- Host Setup and Model Compatibility status badges now say Beta review is pending instead of proof-blocked.
- Generative Music and manuals now say these workflows do not affect Beta status instead of claiming Beta is globally proof-blocked.
- Proof docs now point to durable proof-report verification rather than treating readiness as proof.
- Skills now reflect the current proof-report gate and final-review boundary.

## Deferred Cleanup

- Historical audit files can be archived or marked as snapshots later, but deleting them now would risk losing rationale used by tests and handoff docs.
- Large UI scaffold pruning should be a separate task with screenshots and explicit user review.
- Shared status-copy helpers could reduce duplication, but adding abstraction during a cleanup pass would work against the smallest-change goal.
- ESLint warning cleanup remains useful, but it is broad and unrelated to the current coherence fixes.

## Current First-Run Story

OpenStem should present the app as a local-first workstation where:

- Audio Separator is the primary working path.
- FFmpeg/backend diagnostics are setup checks, not proof.
- Model Manager requires local SHA-256 verification before model use.
- One CPU proof lane has passed locally, but Beta Candidate still needs final review.
- Mastering, transcription, prompts, document export, generative music, and ensemble planning are secondary workflows with their own planned/blocked/reference states.
- Output files only count when they are written, non-empty, decodable, and verified in the expected folder.
