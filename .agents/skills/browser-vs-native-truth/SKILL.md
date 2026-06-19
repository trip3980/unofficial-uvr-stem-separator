---
name: browser-vs-native-truth
description: Use when OpenStem browser mode, Electron mode, local paths, drag and drop, file selection, or native execution boundaries are involved.
---

# Browser vs Native Truth

Use this skill when deciding whether a workflow is browser-preview-only or native Electron execution.

## Browser Mode

- Browser mode is Browser Preview / Not runnable unless a real browser implementation exists.
- Browser-selected file names are not native paths.
- Drag and drop in browser mode does not prove file-system access.

## Native Mode

- Native separation requires the Electron bridge and verified local paths.
- Do not report backend readiness, model verification, progress, output stems, packaged diagnostics, or AI proof from browser-only state.
- Frontend labels must make the boundary clear when a workflow is preview-only.
