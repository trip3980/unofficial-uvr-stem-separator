# TurboScribe HAR Reference Audit

## Scope

OpenStem inspected a local TurboScribe HAR capture as a sanitized product-behavior reference for the Local Transcription workspace. HAR files are sensitive and must not be committed.

This audit does not copy branding, code, private data, account data, transcript identifiers, endpoint implementations, cookies, or headers. It extracts safe workflow patterns that can be adapted locally.

## Sanitized HAR Handling

- No cookies were copied.
- No auth headers were copied.
- No raw request bodies were copied.
- No raw response bodies were copied.
- No session IDs, transcript IDs, account identifiers, private transcript names, or private file names were copied.
- No transcript IDs were copied.
- No TurboScribe endpoints are reused.
- No cloud upload behavior, scraper, or browser automation was added.
- `.gitignore` excludes `*.har` so capture files stay out of source control.

## Safe Observations

The sanitized inspection found a web-dashboard pattern with recent-work activity, upload/status feedback, table-like file rows, export actions, move actions, language and mode concepts, and third-party analytics traffic.

Safe file metadata observed:

- HAR path inspected: local sensitive HAR capture, not committed to OpenStem.
- Entries: 219
- Pages: 3
- Start timestamp: `2026-06-19T17:43:44.176Z`
- Safe label scan confirmed text such as `Export`, `Move`, `Uploaded`, `Duration`, `Mode`, `Status`, and `Uploading`.

Safe host-level observation:

- Primary traffic was to the product site.
- Analytics and ad-network hosts were present.
- OpenStem should not copy analytics behavior into the local transcription workflow.

## Useful Patterns To Adapt

- Recent Files area with empty state.
- Folders with `Uncategorized` default.
- Bulk actions shown but blocked until native jobs exist.
- Simple language selector.
- Simple mode selector using OpenStem labels: Fast, Balanced, Accurate, Maximum Accuracy.
- Speaker recognition as a planned option, not a fake result.
- Export settings that remain blocked until local output verification passes.
- Status language that separates uploaded, queued, running, complete, failed, and not checked states.

## Patterns To Avoid

- Do not present web upload as local native execution.
- Do not use TurboScribe naming in runtime UI.
- Do not copy cloud-service traffic, endpoints, hidden identifiers, or product branding.
- Do not mark a transcript complete without a real local output file.
- Do not store transcript text in logs by default.
- Do not use third-party analytics for audio, transcript text, paths, or PHI.

## OpenStem Adaptation

OpenStem adapts the dashboard idea as a local-first scaffold:

1. Recent Files starts empty.
2. Folders are local metadata only.
3. Bulk Export, Bulk Move, and Verify Outputs are disabled until native execution exists.
4. Mode and language settings are visible but do not run a backend in browser preview.
5. Speaker recognition stays Planned / Requires diarization backend.
6. Export completion requires verified local files.
7. Transcription remains separate from stem-separation proof.

## Release Boundary

This HAR reference does not unblock Beta Candidate. Release state remains Hardened Functional Alpha until verified local AI E2E stem-separation proof passes with a verified separator model and non-empty stems.
