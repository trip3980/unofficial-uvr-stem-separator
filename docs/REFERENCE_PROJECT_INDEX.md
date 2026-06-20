# Reference Project Index

This index lists projects OpenStem has studied for workflow, architecture, or compatibility lessons. Reference status does not mean code, binaries, assets, models, weights, cloud services, or trademarks are bundled.

Release state: Hardened Functional Alpha.

One local CPU separator proof lane has passed. Beta Candidate still requires final release checklist review, packaged-app review, and user approval.

| Project                                  | Reference area                                                                                                                             | Status                                                                | License result                                                      | OpenStem boundary                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Voicebox                                 | Local-first voice I/O, captures, STT ladder, local LLM refinement, queue/retry/recovery, post-processing presets, Tauri separation lessons | Reference only; no code bundled                                       | MIT License verified from reference checkout                        | OpenStem is not affiliated with or endorsed by Voicebox. Voicebox-style features do not satisfy stem-separation proof. |
| TurboScribe                              | Transcription workspace UX and intake flow                                                                                                 | Reference only; no code bundled                                       | Proprietary / not copied                                            | No TurboScribe branding, endpoints, accounts, cookies, HAR secrets, or cloud upload behavior.                          |
| GPT4All / Ollama                         | Local model library and local-chat workflow                                                                                                | Reference only / optional external tools                              | Needs verification per runtime/model                                | Local chat readiness does not verify separator models.                                                                 |
| Audacity                                 | Recording, import/export, effect chains, macros, analysis, FFmpeg-extension, project/history, recovery                                     | Reference only; no code bundled                                       | GPL-family project; direct reuse requires explicit license decision | No source code, documentation text, UI assets, icons, branding, or binaries copied.                                    |
| Web-Audio-Mastering                      | Mastering Lab workflow and DSP architecture                                                                                                | Reference only / concept-adapted; no code bundled in the current pass | ISC License                                                         | Mastering is not stem-separation proof and does not approve Beta Candidate.                                            |
| Apache OpenOffice / LibreOffice / Pandoc | Document import/export and conversion strategy                                                                                             | Reference only / user-configured external converters later            | Needs verification before bundling                                  | No office suite or converter is bundled by default.                                                                    |
| LANDR / DistroKid Mixea                  | Commercial mastering UX comparison                                                                                                         | Reference only; no code bundled                                       | Proprietary / not copied                                            | No branding or professional-equivalent claim.                                                                          |

## Reference Rules

- Do not copy code without license review.
- Do not copy branding, icons, UI assets, proprietary text, private endpoints, or account flows.
- Do not bundle model weights, Python runtimes, FFmpeg, office suites, or external converters without a documented release strategy.
- Do not treat reference workflows as AI stem-separation proof.
- Keep About/Legal and Third-Party Notices accurate when a reference is studied or a dependency is added.
