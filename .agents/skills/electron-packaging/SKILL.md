---
name: electron-packaging
description: Use for OpenStem Electron, electron-builder, Windows EXE, app.asar, packaged resources, installer outputs, runtime diagnostics, Linux AppImage or deb, and macOS dmg app zip planning.
---

# Electron Packaging

Use this skill for packaging and packaged-runtime questions.

## Packaging Architecture

- Electron is the desktop packaging layer.
- Preserve this architecture: React UI -> Electron shell -> native backend bridge -> packaged installers.
- Windows EXE and NSIS are first priority.
- Linux AppImage and deb are second priority.
- macOS dmg, app, and zip are third priority after signing and notarization planning.

## Boundaries

- Electron packaging does not solve Python, FFmpeg, PyTorch, audio-separator, models, CUDA, DirectML, or AI proof.
- Do not bundle model weights.
- Do not bundle Python, FFmpeg, PyTorch, or audio-separator unless licensing and distribution strategy are explicitly documented.
- No Python, FFmpeg, model files, or model weights should be bundled unless explicitly approved and legally documented.

## Verification

Packaging is not verified until the packaged renderer can pass `checkPackagedRuntime()`. Windows packaging was previously verified, but do not claim Linux or macOS readiness unless each platform is actually built and launched on the relevant OS or CI.
