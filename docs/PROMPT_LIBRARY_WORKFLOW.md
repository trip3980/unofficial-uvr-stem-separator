# Prompt Library Workflow

## Purpose

Prompt Library gives the Transcript Workflow Builder reusable prompt templates so users do not rebuild the same prompt sections for every session.

The library works across industries: clinical notes, DAP notes, assessment, summary/review, psychotherapy notes, business meetings, interviews, coaching notes, legal review, project notes, podcast notes, and custom workflows.

## Built-In Templates

- DAP Note
- Assessment
- Summary / Review
- Psychotherapy Notes
- Business Meeting Summary
- Interview Notes
- Podcast Notes
- Project Review
- Custom Blank Workflow

Clinical templates are one category, not the whole system. Clinical templates remain draft-only and require user review.

## Editing

Prompt sections are editable inline. Each section can define:

- label,
- instruction text,
- required prefix,
- word limit,
- sentence limit,
- no bullets,
- no tables,
- one-line or paragraph style,
- evidence required,
- insufficient evidence fallback,
- enabled or disabled state,
- output order.

The workspace keeps the Prompt Library in the main transcript workflow path rather than hiding it in settings:

Transcript Input -> Prompt Library -> Prompt Sections -> Model -> Run -> Results -> Final Output

The first usable slice includes the template dropdown, search, category filter, favorites, recent templates, duplicate template, rename template, add prompt section, disable/enable section, reset template, export library, and import library controls.

## Auto-Save

Small edits should auto-save after a short debounce. The first policy target is 750 ms.

Built-in templates are read-only originals. When edited, OpenStem should create a user copy such as `DAP Note - Custom`.

For user-created templates, auto-save writes to native Electron app data when the preload bridge is available. Browser preview can store only preview/local browser state and must keep that label visible.

## Storage

Preferred storage is a local JSON file named `openstem-prompt-library.json` in the Electron app user data folder.

Electron exposes a narrow prompt-library IPC bridge:

- `getPromptLibraryPath`
- `loadPromptLibrary`
- `savePromptLibrary`

The native handler validates JSON shape before writing and stores only user/custom templates. Built-in templates remain in app code so corrupted custom libraries do not erase factory defaults.

Browser preview may use preview/session/local browser storage only when labeled honestly.

Do not store transcript text inside prompt templates. Do not log prompt results by default. Cloud sync is disabled by default.

## Import Export

Prompt library import/export is user-controlled.

Imports must validate schema, reject malformed templates, avoid duplicate IDs, resolve duplicate names, and never execute code.

Exports must not include transcript text.

Imported templates cannot run commands and cannot change app settings outside the prompt library.

## Deep Read and SubQ Integration

Each template has a recommended mode:

- Quick Mode,
- Deep Read Mode,
- SubQ + Evidence Mode.

For long transcripts, OpenStem should suggest Deep Read or SubQ + Evidence instead of forcing a shallow one-shot answer.

## Output Rule

Final output is plain text by default. Each enabled section response is separated by line breaks.

No bullets or tables by default. No markdown table. No extra explanation unless the template explicitly allows it.

## Limits

Prompt Library does not run a model by itself. Prompt Library does not approve Beta Candidate. Prompt Library does not satisfy stem-separation proof.

If a workflow run fails later, completed section outputs, transcript input, and prompt edits should remain available. A failed section should be marked clearly and be rerunnable without wiping successful sections.
