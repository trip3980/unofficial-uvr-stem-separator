# Document Format Reference Audit

Release state remains Hardened Functional Alpha. Document import/export does not satisfy AI stem-separation proof and does not approve Beta Candidate.

## Summary

OpenStem should study office-suite projects for format expectations, but it should not embed a full office suite by default. The smallest stable strategy is:

1. Native TXT, JSON, and VTT parsing/writing first.
2. Add local PDF generation after choosing a small JavaScript library and verifying output files.
3. Add local DOCX generation after choosing a small JavaScript library and verifying output files.
4. Keep ODT and broad Office conversion behind an optional user-configured external converter such as LibreOffice/OpenOffice `soffice` or Pandoc.
5. Do not upload user transcripts/documents to cloud conversion services by default.

## Reference Matrix

| Project              | Purpose                                                  | License                         | Dependency size                          | Platform support                              | Local | External executable                 | Practical for Electron                               | Decision             |
| -------------------- | -------------------------------------------------------- | ------------------------------- | ---------------------------------------- | --------------------------------------------- | ----- | ----------------------------------- | ---------------------------------------------------- | -------------------- |
| Apache OpenOffice    | Full office suite and ODF/Office compatibility reference | Apache-2.0                      | Very large                               | Windows, macOS, Linux, FreeBSD, OS/2 variants | Yes   | Yes, if used as installed app       | Too heavy to embed                                   | Reference only       |
| LibreOffice headless | Office-suite conversion and PDF export through `soffice` | MPL-2.0 plus other OSS licenses | Very large                               | Windows, macOS, Linux                         | Yes   | Yes                                 | Practical only as user-configured external converter | Optional later       |
| Apache POI           | Java APIs for Microsoft Office formats                   | Apache-2.0                      | Large Java runtime/tooling               | Java platforms                                | Yes   | Requires Java runtime               | Too heavy for default Electron app                   | Rejected for default |
| mammoth.js           | DOCX to HTML/text extraction                             | BSD-2-Clause                    | Small JS library                         | Node/browser                                  | Yes   | No                                  | Practical candidate for DOCX import                  | Optional later       |
| docx.js              | DOCX generation/modification                             | MIT                             | Small JS/TS library                      | Node/browser                                  | Yes   | No                                  | Practical candidate for DOCX export                  | Optional later       |
| pdf-lib              | PDF creation/modification                                | MIT                             | Small JS library                         | Node/browser/Deno/React Native                | Yes   | No                                  | Practical candidate for simple PDF output            | Optional later       |
| PDFKit               | PDF generation                                           | MIT                             | Small/medium JS library                  | Node/browser                                  | Yes   | No                                  | Practical candidate for styled PDF output            | Optional later       |
| Pandoc               | Universal markup/document converter                      | GPL-2.0-or-later                | Large executable/runtime                 | Windows, macOS, Linux                         | Yes   | Yes                                 | Useful only when user configures it                  | Optional external    |
| unoconv              | LibreOffice/OpenOffice UNO-backed conversion             | GPL-2.0                         | Depends on office suite and UNO bindings | Windows/macOS/Linux where LibreOffice works   | Yes   | Yes                                 | Adds brittle external stack                          | Rejected for default |
| officeParser         | Node/browser parser for Office/PDF/text-like formats     | MIT                             | Medium broad parser                      | Node/browser                                  | Yes   | Some formats may need deeper review | Interesting broad parser, needs security review      | Optional later       |
| textract             | Text extraction wrapper                                  | MIT                             | Small wrapper, many external tools       | Node plus platform tools                      | Yes   | Yes, for many formats               | Too many implicit external dependencies              | Rejected for default |

## Findings

### Apache OpenOffice

Apache OpenOffice is a full-featured office suite with a large multi-language codebase. It is useful as a reference for ODF concepts, compatibility expectations, file import/export behavior, and cross-platform office workflow. It is not a reasonable dependency to embed casually in a focused Electron audio/transcript app.

Decision: Reference only.

### LibreOffice Headless

LibreOffice can run local command-line conversions, including PDF export options. This is useful for users who already have LibreOffice installed, but bundling it would add major size, license, update, and support complexity.

Decision: Optional user-configured external converter later.

### Apache POI

Apache POI can read and write Microsoft Office formats, but it brings a Java runtime/tooling lane into a TypeScript/Electron app. That is the wrong first move for OpenStem.

Decision: Rejected for default runtime.

### Smaller JavaScript Libraries

- mammoth.js is a practical DOCX import candidate, but complex Word formatting can be lossy.
- docx.js is a practical DOCX export candidate once native writing and verification are ready.
- pdf-lib and PDFKit are practical PDF output candidates. The choice should be made after deciding whether OpenStem needs simple transcript PDFs or styled multi-page document layout.

Decision: Optional later, one small library at a time.

### Converter Tools

Pandoc and LibreOffice/OpenOffice `soffice` are powerful, but they should remain user-configured external tools. OpenStem should validate paths, use safe argument arrays, and verify output files.

unoconv and textract add too many implicit dependencies for the default runtime.

Decision: Optional converter policy, not bundled.

## Security Risks

- Malformed office files can be parser attack surfaces.
- HTML import requires sanitization.
- PDF extraction can be lossy or incomplete.
- External converter paths can become command-injection risk if shell strings are used.
- Document text can include private or clinical content; do not log it by default.
- Conversion success must not be inferred from a process exit alone.

## Recommended OpenStem Strategy

Use OpenOffice/LibreOffice as reference projects, not bundled dependencies. Implement a small pipeline:

- TXT and VTT import first.
- JSON transcript import only with schema validation.
- TXT, JSON, and renamed VTT export first after native writer verification.
- PDF export after selecting a local JS PDF library.
- DOCX export after selecting a local JS DOCX library.
- ODT/Pandoc/LibreOffice/OpenOffice conversion only after user configures a validated local executable.

This keeps document handling flexible without weakening OpenStem's honesty rules.
