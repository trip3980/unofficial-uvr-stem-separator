# Document Format Workflow

Release state remains Hardened Functional Alpha. Document import/export is not stem separation proof, does not satisfy `proof:check`, and does not approve Beta Candidate.

## User Path

Select document -> verify local file -> parse or convert locally -> show extracted text in a scroll box -> edit -> choose export format and folder -> write native output -> verify real output.

No cloud conversion is enabled by default.

## Import Format Matrix

| Format          | Status                      | Rule                                                            |
| --------------- | --------------------------- | --------------------------------------------------------------- |
| TXT             | supported                   | Local plain text import after native file verification.         |
| VTT             | supported                   | Local WEBVTT parser exists; source file is preserved.           |
| SRT             | planned                     | Enable only after an SRT parser exists.                         |
| JSON transcript | supported                   | Requires schema validation before import.                       |
| PDF             | requires dependency         | Planned until a local PDF parser is selected and reviewed.      |
| DOCX            | requires dependency         | Planned until a local DOCX parser is selected and reviewed.     |
| ODT             | requires external converter | Use only with a validated local converter or future ODT parser. |
| RTF             | planned                     | Enable only after a local parser exists.                        |
| HTML            | experimental                | Requires local sanitization before prompt handoff.              |
| MD              | supported                   | Treat as local plain text with sanitization rules.              |

## Export Format Matrix

| Format | Status                      | Rule                                                                                 |
| ------ | --------------------------- | ------------------------------------------------------------------------------------ |
| TXT    | planned                     | First native writer target; complete only after file verification.                   |
| JSON   | planned                     | Metadata plus transcript plus prompt outputs; complete only after file verification. |
| VTT    | planned                     | Requires timestamps and native file verification.                                    |
| SRT    | planned                     | Requires timestamps and conversion logic.                                            |
| PDF    | requires dependency         | Requires a local PDF generator and verified output.                                  |
| DOCX   | requires dependency         | Requires a local DOCX generator and verified output.                                 |
| ODT    | requires external converter | Requires validated external converter or future ODT writer.                          |
| RTF    | planned                     | Requires local writer.                                                               |
| HTML   | planned                     | Requires escaped/sanitized output and verified file.                                 |

## OpenOffice And LibreOffice Strategy

Apache OpenOffice and LibreOffice are useful references for OpenDocument expectations, office import/export behavior, and cross-platform conversion patterns. OpenStem should not embed either office suite by default because the dependency size, updater burden, license review, and support surface are too large for the first document workflow.

LibreOffice/OpenOffice-compatible `soffice` can be supported later as an optional user-selected converter path.

## Optional External Converter Policy

Supported future converter types:

- LibreOffice/OpenOffice `soffice`
- user-selected office converter executable
- Pandoc executable

Rules:

- user selects or installs the converter manually,
- path must be validated,
- process must use safe argument arrays,
- no shell string concatenation,
- no cloud upload,
- output must be verified by file existence, nonzero size, extension, selected folder, and overwrite policy.

Diagnostic codes:

- `OFFICE_CONVERTER_NOT_CONFIGURED`
- `OFFICE_CONVERTER_INVALID_PATH`
- `OFFICE_CONVERTER_READY`
- `OFFICE_CONVERSION_RUNNING`
- `OFFICE_CONVERSION_FAILED`
- `OFFICE_OUTPUT_NOT_VERIFIED`
- `DOCUMENT_FORMAT_REQUIRES_CONVERTER`

## Filename Templates

Use:

```text
{safe_title}_{date}_{time}.txt
{safe_title}_session_{session_number}_{date}_{duration_min}_min.pdf
{safe_title}_prompt_output_{date}_{time}.docx
{safe_title}_transcript_archive_{date}.json
```

Rules:

- sanitize invalid filename characters,
- prevent path traversal,
- prevent reserved Windows names,
- avoid duplicate names,
- preview before export,
- do not overwrite without policy.

## Speaker Rename Export Behavior

Speaker rename changes labels only. It does not prove diarization.

When speaker labels are renamed:

- TXT export uses display names,
- PDF export uses display names after regeneration,
- DOCX export uses display names after regeneration,
- VTT archive can preserve original labels in metadata,
- JSON archive stores original and display names.

Regenerated exports must still pass output verification.

## Privacy And Local-First Rules

- document text stays local,
- no hidden upload,
- no cloud converter by default,
- no transcript/document text in logs by default,
- user controls output folders,
- auto-export is visible and configurable,
- imported source files are preserved,
- imported/exported user files must not be committed.

Do not claim HIPAA compliance from document import/export support.

## Proof Boundaries

Document import/export does not prove separator model integrity.

PDF, DOCX, ODT, TXT, JSON, SRT, VTT, HTML, and RTF exports do not satisfy AI proof.

Document import/export does not approve Beta Candidate. Beta status is governed by separator proof evidence and final release checklist review.
