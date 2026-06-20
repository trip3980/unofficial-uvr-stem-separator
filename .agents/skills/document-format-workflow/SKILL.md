---
name: document-format-workflow
description: Use when modifying transcript or document import, PDF/DOCX/ODT/RTF/TXT/HTML export, VTT-to-document conversion, prompt-output export, document parser dependencies, office-format workflows, archive/export behavior, or external office converter policy in OpenStem.
---

# Document Format Workflow

Use this skill for OpenStem document import/export work.

## Boundaries

- Document import/export is not stem separation proof.
- Document import/export does not approve Beta Candidate.
- Browser mode cannot claim local files were written.
- Output success requires file existence and size greater than 0.
- Do not fake PDF, DOCX, ODT, RTF, HTML, SRT, VTT, TXT, or JSON exports.
- Do not claim support for a format unless it is implemented, tested, and verified.
- Keep unsupported formats visible as Planned, Requires dependency, or Requires external converter.
- Do not upload documents or transcripts to cloud converters by default.
- Do not log document text by default.
- Do not commit imported documents, exported files, private transcripts, or generated archives.

## Required Flow

Prefer this path:

Select document -> verify local file -> parse or convert locally -> show extracted text in a scroll box -> let the user edit -> choose export format and folder -> write native output -> verify real output -> update state.

If a parser, writer, native bridge, or converter is not wired, label the action `Planned / Not active`, `Native writer required`, `Requires dependency`, or `Requires external converter`.

## Import Rules

- TXT and VTT are the safest first local imports.
- SRT is supported only after a parser exists.
- JSON transcript import requires schema validation.
- PDF and DOCX require local parsers before support can be claimed.
- ODT usually requires a user-configured LibreOffice/OpenOffice-compatible converter.
- HTML requires sanitization before extracted text can enter the prompt workflow.
- MD can be treated as plain text only when sanitization rules are clear.
- Preserve source files.
- Malformed files must return structured diagnostics, not crash the app.

## Export Rules

- TXT and JSON are the safest first native export targets.
- PDF requires a local PDF generator before support can be claimed.
- DOCX requires a stable local DOCX generator before support can be claimed.
- ODT remains planned or converter-gated until a stable local path exists.
- SRT and VTT require timestamps.
- HTML output must be escaped or sanitized.
- Speaker rename changes labels only; it is not diarization.
- Renamed speaker labels must be reflected in regenerated exports.
- Never overwrite source files by default.
- Never mark an export complete until the expected file exists, size is greater than 0, the extension matches, and the path is inside the selected output folder unless the user chose otherwise.

## External Converter Policy

Allowed future converter types:

- LibreOffice/OpenOffice `soffice` executable selected by the user.
- User-selected office converter executable.
- Pandoc executable selected by the user.

Do not bundle a full office suite or converter by default without a documented license, size, packaging, and update strategy.

If using an external converter:

- validate the configured path,
- run with safe argument arrays,
- avoid shell string concatenation,
- keep input/output folders explicit,
- verify output files after conversion,
- surface recoverable errors.

Use diagnostic codes:

- `OFFICE_CONVERTER_NOT_CONFIGURED`
- `OFFICE_CONVERTER_INVALID_PATH`
- `OFFICE_CONVERTER_READY`
- `OFFICE_CONVERSION_RUNNING`
- `OFFICE_CONVERSION_FAILED`
- `OFFICE_OUTPUT_NOT_VERIFIED`
- `DOCUMENT_FORMAT_REQUIRES_CONVERTER`

## Privacy And Proof

- Keep document text local.
- No cloud conversion by default.
- No hidden upload.
- No transcript/document text in logs by default.
- Do not claim HIPAA compliance.
- Document workflows do not satisfy `proof:check`.
- Release state remains Hardened Functional Alpha.
- Document format work does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.
