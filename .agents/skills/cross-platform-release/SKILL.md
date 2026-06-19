---
name: cross-platform-release
description: Use for later OpenStem Linux and macOS release work, platform-specific package verification, launch checks, signing and notarization planning, and cross-platform readiness claims.
---

# Cross Platform Release

Use this skill for Linux and macOS release planning or verification.

## Platform Order

- Windows EXE first.
- Linux AppImage and deb second.
- macOS dmg, app, and zip third.

## Verification Rules

- Do not fake Linux or macOS success from Windows.
- Linux AppImage and deb must be build-verified on Linux or appropriate CI.
- macOS dmg, app, and zip must be build-verified on macOS or macOS CI.
- macOS public release needs signing and notarization planning.
- OS-specific backend detection must be tested.
- Do not claim cross-platform readiness until each platform is actually built and launched.
