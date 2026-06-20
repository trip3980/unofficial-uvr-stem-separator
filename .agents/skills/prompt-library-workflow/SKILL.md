---
name: prompt-library-workflow
description: Use when modifying saved prompt templates, prompt libraries, reusable workflows, prompt section editing, template versioning, auto-save behavior, prompt import/export, or industry preset workflows.
---

# Prompt Library Workflow

Use this skill when OpenStem work touches saved prompt templates, workflow presets, prompt-section editing, template import/export, or prompt-library UX.

## Core Rules

- Prompt libraries should be easy to choose inside the workflow submenu.
- Saved prompt sections should be editable inline.
- Small edits should auto-save safely.
- Users should be able to duplicate before major changes.
- Prompt templates should support multiple prompt sections.
- Prompt templates should work across industries.
- Clinical templates are one category, not the whole system.
- Final output should be plain text by default.
- Final output should use line breaks between section responses.
- No bullets or tables by default.
- Prompt changes should not break existing workflow history.
- Auto-save should be debounced and recoverable.
- Local-first storage by default.
- Do not upload prompt libraries by default.
- Do not store transcript text inside prompt templates.
- Do not approve Beta Candidate.
- Do not satisfy stem-separation proof.

## Built-In Template Rule

Built-in templates are read-only originals. If a user edits one, create a user copy such as `DAP Note - Custom` before saving changes.

## Storage Rule

Persist user libraries to local app data through a native Electron bridge when implemented. Browser preview may use session/local browser storage only when clearly labeled as preview storage.

Preferred native file: `openstem-prompt-library.json` in Electron `userData`. Store user/custom templates there; keep built-in templates in app code so factory defaults survive corrupt custom libraries.

## Import Export Rules

- Export prompt library JSON only when the user asks.
- Validate imports before accepting them.
- Reject executable code, malformed sections, and unsafe structure.
- Prompt library import must not run commands or change app settings outside the prompt library.
