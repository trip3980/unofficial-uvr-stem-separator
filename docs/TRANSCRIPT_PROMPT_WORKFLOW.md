# Transcript Prompt Workflow

## Purpose

The Transcript Workflow Builder is an any-industry prompt workflow workspace for turning verified transcript text into reusable section outputs.

It is not stem separation. It does not approve Beta Candidate. It does not satisfy OpenStem AI stem-separation proof.

## User Path

Transcript Input -> Prompt Library -> Prompt Sections -> Model -> Run -> Results -> Final Output

The Prompt Library lets users quickly switch saved prompt workflows from inside the submenu without rebuilding repeated prompt sections.

Prompt Library edits auto-save locally. In Electron, custom templates are stored in the app user data file `openstem-prompt-library.json`; browser preview storage is labeled as preview-only. Built-in templates stay protected, and edits create a custom copy before saving.

## Checkpoint Handoff

Transcript Workflow Builder can consume checkpoint history from Local Transcription after a VTT import, imported audio run, pasted transcript, or existing history item. It should not rerun intake just to run prompt steps.

Prompt-specific checkpoints are:

- Prompt Library Selected
- Prompt Workflow Complete
- Prompt Output Review
- Prompt Output Export Saved

The user can stop before the prompt library, stop after prompt output, rerun only the prompt workflow, or export prompt output later. Prompt Output Box content remains editable, line-break oriented, and free of bullets or tables by default.

Prompt output export remains `Output Not Verified` until native write verification proves a real nonzero output file.

## Workflow Run Ledger Handoff

Transcript Workflow Builder uses the Workflow Run Ledger to keep selected prompt library, selected template name, selected local model, prompt outputs, current checkpoint, failed checkpoint, and export artifacts connected to the originating transcription run.

Changing transcript text or prompt library marks prompt outputs `REGENERATE_RECOMMENDED`. Changing prompt output marks prompt output exports `REGENERATE_RECOMMENDED`. The user can rerun one failed prompt stage, regenerate prompt output, export again, or continue automation without losing earlier verified artifacts.

The ledger stores metadata-only history by default. Prompt templates must not store transcript text or PHI.

## Document Import And Export Handoff

Transcript Workflow Builder may accept imported transcript documents after Local Transcription or a user-selected local document path verifies the file. TXT and VTT are the first supported local import lanes. PDF and DOCX require reviewed local parser dependencies. ODT requires a validated external converter unless a local parser is added later.

Prompt output export can target TXT, JSON, PDF, DOCX, ODT, RTF, HTML, SRT, and VTT in the document policy matrix, but only TXT/JSON/VTT are first native writer targets. PDF and DOCX remain dependency-gated, and ODT remains converter-gated.

No prompt-output export is complete until a real file exists, has nonzero size, has the expected extension, is inside the selected output folder unless the user chose otherwise, and passes overwrite policy.

## Modes

### Quick Mode

Use for short transcripts and simple prompts. Quick Mode does not claim Deep Read, local vector indexing, or evidence retrieval.

### Deep Read Mode

Use for long transcripts. It builds a whole-document context map before section answering.

### SubQ + Evidence Mode

Use for very long or complex workflows. It follows:

Deep Read -> SubQ Planning -> Evidence Retrieval -> Section Answering -> Output Verification -> Plain Text Assembly

SubQ + Evidence Mode breaks each workflow prompt into smaller questions, checks transcript evidence, then writes each answer separately. This helps reduce shallow or keyword-only answers.

## Plain Text Output Rule

Final output is plain text by default. Each enabled section response is separated by line breaks.

No bullets or tables by default. No markdown table. No model commentary. No hidden chain-of-thought.

## Privacy

Transcript text is not logged by default. Cloud RAG, cloud embeddings, cloud vector databases, and cloud LLM calls are disabled by default.

Prompt templates are local-first. They must not store transcript text or PHI inside reusable templates.

## Proof Boundary

Transcript workflows, prompt templates, Deep Read, SubQ, RAG, local LLM readiness, and output assembly do not satisfy `proof:check`.

Transcript prompt workflows do not approve Beta Candidate. Beta status is governed by separator proof evidence and final release checklist review.
