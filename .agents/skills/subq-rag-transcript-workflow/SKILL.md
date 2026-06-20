---
name: subq-rag-transcript-workflow
description: Use when modifying sub-question decomposition, transcript prompt planning, RAG/evidence retrieval, long-transcript chunking, context maps, local vector indexes, section answering, or final plain-text assembly.
---

# SubQ RAG Transcript Workflow

Use this skill for long-transcript prompt workflows that need staged reading, sub-question planning, evidence retrieval, and simple final text assembly.

## Core Rules

- SubQ means sub-question or sub-query decomposition.
- RAG means retrieval-augmented generation.
- SubQ and RAG should work together.
- Use Deep Read first for long transcripts.
- Do not answer global transcript prompts from keyword chunks only.
- Split complex prompt workflows into smaller section prompts.
- Retrieve supporting transcript evidence for each section.
- Preserve global transcript context.
- Do not invent facts.
- If evidence is insufficient, say `Insufficient evidence`.
- Do not expose hidden chain-of-thought.
- Show section plans only as optional diagnostics, never private reasoning.
- Final output should be plain text.
- Final output should use line breaks between responses.
- No bullets or tables by default.
- Browser mode cannot claim local vector index or local model execution unless native support exists.
- Cloud is disabled by default.
- The feature does not approve Beta Candidate.
- The feature does not satisfy stem-separation proof.

## Preferred Architecture

Use this staged path:

Deep Read -> SubQ Planning -> Evidence Retrieval -> Section Answering -> Output Verification -> Plain Text Assembly

## First-Pass Implementation

Prefer OpenStem-native services before heavy external frameworks:

- deterministic chunking,
- context map JSON,
- sub-question planning,
- local keyword/evidence index,
- optional local embeddings later,
- no cloud embeddings by default,
- no cloud vector database by default.

## Output Rules

- Keep each section answer concise and usable.
- Respect required prefixes, word limits, no-bullets, and no-tables rules.
- Preserve completed section outputs if one section fails.
- Mark weak evidence as `SECTION_EVIDENCE_INSUFFICIENT` or equivalent.
