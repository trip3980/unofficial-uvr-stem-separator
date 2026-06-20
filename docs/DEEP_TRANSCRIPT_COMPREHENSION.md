# Deep Transcript Comprehension

## Purpose

Deep Transcript Comprehension is the staged reading layer for long transcript workflows.

It exists because long transcripts should not be answered from shallow snippets alone. The system should first build a context map, then plan section questions, retrieve evidence, and synthesize simple outputs.

## Context Map

A context map should include:

- themes,
- repeated topics,
- timeline,
- key facts,
- actions, interventions, or decisions,
- responses,
- plans,
- concerns,
- unresolved items,
- evidence references.

The context map is not final output. It is internal workflow structure and may be shown only as optional diagnostics without hidden reasoning.

## Mode Recommendation

- Short transcript: Quick Mode is acceptable.
- Long transcript: Deep Read Mode is recommended.
- Very long transcript or complex workflow: SubQ + Evidence Mode is recommended.

## Privacy

Context maps are local artifacts. No transcript text is logged by default. Cloud analysis is disabled by default.

## Limits

Deep Read does not mean the app has proven model execution. Browser preview cannot claim a real local context map or local model output unless native execution exists.
