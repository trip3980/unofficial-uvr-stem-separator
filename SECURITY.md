# Security Policy

OpenStem AI Audio Workstation is a pre-release local desktop application. Security reports are welcome, but this repository is not yet a final official release channel.

## Supported Versions

| Version/branch | Status |
| -------------- | ------ |
| `main`         | Development / Hardened Functional Alpha |
| Packaged builds | Pre-release artifacts until final owner approval |

No production support window is promised yet.

## Reporting A Vulnerability

Please open a private security advisory on GitHub when available, or contact the repository owner through the GitHub profile listed in `package.json`.

Do not include:

- private audio files
- transcripts, clinical notes, prompt outputs, or user documents
- `.env` files, API keys, tokens, cookies, or credentials
- model weights, cached models, or licensed upstream assets
- local machine paths that are not needed to reproduce the issue

Useful reports include:

- affected commit or branch
- operating system and architecture
- exact command or UI action that triggered the issue
- expected behavior and actual behavior
- sanitized logs or screenshots
- whether the issue requires Electron, Python, FFmpeg, model files, or internet access

## Security Boundaries

- Renderer code must not directly access Node APIs.
- Electron must keep `contextIsolation` enabled and `nodeIntegration` disabled.
- IPC handlers must validate inputs and return structured errors.
- Python, FFmpeg, model paths, output folders, and user-selected files are untrusted until checked.
- Download completion is not model verification.
- App update checks, model catalog refreshes, and release checks do not approve AI proof or Beta Candidate status.

## Dependency And Artifact Policy

Before a release candidate, run:

```sh
npm run audit:moderate
npm run validate-registry
npm run release:check
```

Release artifacts must not include Python virtual environments, model weights, local caches, proof outputs, private recordings, transcripts, prompt outputs, document exports, `.env` files, logs, or installer scratch files.
