# Unofficial UVR Stem Separator

An unofficial Windows desktop stem-separation application inspired by UVR-style workflows, designed around a React/Electron desktop interface, safe local processing architecture, model registry planning, backend adapter separation, FFmpeg readiness checks, and future support for VR, MDX, MDX23C, Demucs, RoFormer, Mel-Band RoFormer, BS-RoFormer, and user-imported models.

**Created by Robert Sawin (GitHub: Trip3980)**

**Disclaimer**: This project is not affiliated with, endorsed by, or maintained by the Ultimate Vocal Remover developers. UVR language refers only to workflow inspiration and source-separation interface patterns. The project is not trying to replace Ultimate Vocal Remover or claim official UVR succession. It is an unofficial classic-style desktop stem separator built around safer packaging, readiness checks, model registry planning, backend adapters, and future model support.

Unofficial UVR Stem Separator exists for two reasons:
1. To future-proof the classic UVR-style workflow so newer models, model categories, and backend libraries can be added through adapters instead of rewrites.
2. To preserve the familiar standalone desktop experience of the older UVR-style app while supporting newer separation technology inside a modern executable Windows shell.

## Building Desktop Executable

This project is configured to be packaged as a standalone desktop application using Electron. To build the desktop executable on your local Windows (or Mac/Linux) machine:

1. **Install dependencies**:
   ```sh
   npm install
   ```

2. **Build the React interface**:
   ```sh
   npm run build
   ```

3. **Test the Electron desktop wrapper locally (optional)**:
   ```sh
   npm run electron:dev
   ```

4. **Package the executable**:
   ```sh
   npm run make
   ```
   *Note: This command uses `electron-builder` to package the app into an installer or executable. The final distributable will be output to the `dist-electron` folder.*

## Architecture Notes

- The React SPA serves as the Electron renderer.
- `electron-shell/main.cjs` coordinates the main process.
- `electron-shell/preload.cjs` safely exposes IPC handlers (select files, trigger separation) via `contextBridge` to the `window.uvr` object without exposing raw Node APIs.
- The `type` field in `package.json` is set to `module`, but Electron's main process scripts use `.cjs` extensions.

## Acknowledgments & References

This project is a modern, independent UI reimplementation and architecture planner inspired by the incredible work done by the **Ultimate Vocal Remover (UVR)** community.

- **Original UVR GUI Project**: Big thanks to [Anjok07 and the UVR team](https://github.com/Anjok07/ultimatevocalremovergui) for their foundational work in making audio separation accessible.
- **Model Architectures**: This application acts as a front-end shell intended to support backend execution of world-class separation models such as [Demucs](https://github.com/facebookresearch/demucs) (Facebook Research), [RoFormer](https://github.com/lucidrains/roformer-pytorch), Mel-Band RoFormer, and MDX-Net.
- **Audio-Separator**: Planned backend integration utilizing libraries inspired by or directly interfacing with [audio-separator](https://github.com/nomadkaraoke/python-audio-separator).

## License

This UI shell and configuration is open-source (MIT License). See the `LICENSE` file for details. Please ensure you comply with the respective licenses of any models, backend execution scripts, or external binaries (like FFmpeg) you use alongside this software.
