---
name: final-polish-and-handoff
description: Use when OpenStem is near handoff, release candidate review, packaging pass, cleanup pass, final stabilization, installer artifact review, documentation closure, or final blocker reporting.
---

# Final Polish and Handoff

Use this skill to gather the project into one final release-readiness pass before sharing, uploading, or treating a build as a serious standalone alpha.

## Release Truth

- Release state remains Hardened Functional Alpha unless proof requirements are actually met.
- One verified local CPU AI E2E stem-separation proof lane has completed; Beta Candidate still requires final release checklist review.
- Do not approve Beta.
- Do not claim production readiness.
- Do not fake proof.
- Do not fake model verification.
- Do not bypass hash mismatch.
- Do not fake cross-platform build success.
- Do not treat toolchain passing or `release:check` passing as AI proof or Beta readiness.
- Do not treat ensemble presets as verified model weight files.

## Use For

- Final cleanup before handing the repo to another coding agent.
- Final build/package review.
- README and release-note cleanup.
- Installer artifact review.
- Checking stale files, old project names, fake/demo paths, proof blockers, Electron packaging status, backend/runtime status, third-party notices, test/build status, developer tooling status, and `proof:check` status.

## Required Checklist

1. Confirm app name is OpenStem AI Audio Workstation.
2. Confirm release state is Hardened Functional Alpha.
3. Confirm Beta Candidate is not automatically approved and remains pending final release review.
4. Confirm Windows installer builds.
5. Confirm packaged runtime diagnostics pass if previously verified.
6. Confirm Linux/macOS are not claimed verified unless actually built/launched.
7. Confirm no model weights are bundled.
8. Confirm no `.venv`, `.env`, logs, proof outputs, model caches, or installer junk are source-controlled.
9. Confirm Model Manager has no fake verified model states.
10. Confirm broken links and HTTP 401/404 sources remain blocked.
11. Confirm hash-mismatch models remain blocked.
12. Confirm no CPU AI proof is claimed unless a verified model produced non-empty stems.
13. Confirm FFmpeg fallback is labeled non-AI.
14. Confirm browser mode is Browser Preview / Not runnable.
15. Confirm README and THIRD_PARTY_NOTICES are current.
16. Confirm package.json build scripts are correct.
17. Confirm Electron packaging config is correct.
18. Confirm `npm.cmd run lint -- --pretty false` passes.
19. Confirm `npm.cmd run build` passes.
20. Confirm `npm.cmd run test` passes.
21. Confirm `npm.cmd run validate-registry` passes.
22. Confirm `npm.cmd run electron:build` passes when packaging is relevant.
23. Confirm `npm run release:check` passes when doing a release workflow check.
24. Confirm `npm run proof:check` reports missing model, ready-but-not-run, or completed-proof pass from durable evidence only.
25. List remaining blockers in priority order.
26. Provide the safest next Codex task.
27. End with one of: Working, Partially working, Blocked, Needs user decision.
