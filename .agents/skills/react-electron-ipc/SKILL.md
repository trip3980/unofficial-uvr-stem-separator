---
name: react-electron-ipc
description: Use for OpenStem preload, main, and renderer API contracts, window.uvr methods, IPC calls, structured return shapes, native filesystem access, and safe deletion.
---

# React Electron IPC

Use this skill for renderer-to-native contracts.

## IPC Contract Rules

- Renderer code must not directly assume filesystem access.
- Preload must expose narrow, explicit APIs.
- Main process must validate paths before native operations.
- IPC return shapes must include success and error states.
- Frontend state must not mark native operations successful unless IPC confirms success.

## Filesystem Safety

- Do not allow arbitrary file deletion.
- Prevent path traversal.
- Delete or purge only approved model and cache locations.
- Use structured errors for rejected paths and failed native actions.

Prefer a vertical slice: user action, frontend state, preload API, main handler, native result, error/log reporting, and verification.
