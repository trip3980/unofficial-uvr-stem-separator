# OpenStem AI Audio Workstation

> **Independent AI audio workstation for local stem separation and audio workflow tools.**

OpenStem AI Audio Workstation is an independent desktop audio workstation for local AI-assisted stem separation, model management, post-separation review, MIDI transcription workflows, and experimental generation loopback tools. Current status: Hardened Functional Alpha. Beta Candidate remains blocked until verified local UVR AI E2E stem-separation proof passes.

---

### Independent Project Notice & Disclaimer

> ⚠️ **IMPORTANT**: **OpenStem AI Audio Workstation is an independent audio-separation workstation. It is not the official Ultimate Vocal Remover project and does not claim affiliation, certification, or endorsement by the original UVR project.**

This workspace is designed to help users configure and run independent local source-separation workflows using tools, models, and weights they acquire and manage themselves. Use of phrases like "UVR-compatible" and "UVR-style" refers strictly to workflow compatibility, reference model standards, and command-line structures. 

This project does not claim ownership over any upstream separation engines, deep learning models, weights, or associated scientific research projects. We respect all upstream creators and strongly encourage supporting their work directly.

---

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

---

## Technical Credits & Upstream Attribution

This project functions as an integrator and credits the following upstream projects for their foundation, engines, or design reference:
- **OpenStem AI Audio Workstation**: Main application shell and workflow integrator. (Author: Robert Sawin / Trip3980)
- **Ultimate Vocal Remover GUI / UVR**: Historical workflow inspiration and compatibility reference for UVR-style source separation. OpenStem is not an official UVR product.
- **audio-separator**: The Python CLI and library providing the backbone for executing Demucs and MDX-Net pipelines robustly on diverse local hardware setups.
- **Demucs / facebookresearch**: Multi-stem audio source separation neural networks.
- **FFmpeg**: Transcoding, fallback static DSP filter separations, and audio operations. FFmpeg fallback is non-AI FFmpeg-based processing and does not count as neural source-separation proof.
- **Basic Pitch (Spotify)**: Automated audio-to-MIDI transcription models for pitch tracking.
- **PyTorch / ONNX Runtime**: Underlying machine learning inference execution backends.

---

## License

This UI shell and configuration is licensed under the MIT License. See the `LICENSE` file for details. 
Please read `THIRD_PARTY_NOTICES.md` for full attribution, license details of upstream projects, and model weight redistribution terms. You must comply with the licenses of any third-party binaries, libraries, or model weights that you run or integrate.
