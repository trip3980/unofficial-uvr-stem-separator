# Clinical Workflow Reference Audit

## Scope

This audit looks at local transcription and local summarization patterns that can inform OpenStem's Clinical Workflow Builder. It does not copy code, branding, prompts, or cloud behavior from reference projects.

## References

| Reference                                                   | Useful pattern                                                                          | OpenStem adaptation                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| local-whisper, https://github.com/luisalima/local-whisper   | Local Whisper dictation without cloud upload.                                           | Reinforces local-first transcription and no cloud upload by default.                             |
| Trail of Bits Scribe, https://github.com/trailofbits/scribe | Local transcription, FFmpeg conversion, and speaker-attributed transcript concepts.     | Treat diarization as optional and dependency-backed, never guessed.                              |
| ownscribe, https://github.com/paberr/ownscribe              | Local-first transcription and local LLM summary templates with optional model backends. | Useful model for template-driven local summaries, but OpenStem keeps clinical output draft-only. |
| Pensieve, https://github.com/lukasbach/pensieve             | Local Whisper with optional local or cloud summaries.                                   | Reinforces that cloud summary lanes must be explicit and disabled by default.                    |
| FLWhisper, https://github.com/leestott/FLWhisper            | Medical transcription prototype with local Whisper-style processing.                    | Reinforces privacy-sensitive medical transcription wording without importing compliance claims.  |
| Meetily, https://github.com/Zackriya-Solutions/meetily      | Local meeting transcription with privacy posture.                                       | Supports local history and export ideas after native verification exists.                        |

## Patterns To Adapt

- Local-first transcription and summary generation.
- Visible backend/model readiness.
- Template-driven summary sections.
- Separate outputs before a unified document.
- Local export with verification.
- History disabled or metadata-only by default for sensitive content.

## Patterns To Avoid

- Do not claim that local processing alone proves compliance.
- Do not enable cloud processing by default.
- Do not summarize transcript text into logs.
- Do not fake local model output.
- Do not let a successful clinical draft affect OpenStem Beta status.

## OpenStem First Slice

1. Show Clinical Workflow Builder in the app.
2. Provide transcript input scaffold.
3. Provide default five-section prompt template.
4. Show local LLM readiness as blocked.
5. Keep cloud model disabled.
6. Show separate section outputs as pending.
7. Keep unified EHR text box empty and review-gated.
8. Add tests that reject overclaims and fake success states.
