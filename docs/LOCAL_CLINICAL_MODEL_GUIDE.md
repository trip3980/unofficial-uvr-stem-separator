# Local Clinical Model Guide

## Purpose

The Clinical Workflow Builder can use a curated local chat-model lane for transcript-to-clinical-draft prompts. This lane is for short structured draft sections, not stem separation.

A working local chat model does not approve Beta Candidate, prove stem separation, or verify separator model weights.

## Why Small Models Can Work

The workflow asks small, repeated prompt sections:

- identify transcript-supported topics,
- write one client-focused line,
- preserve a required prefix,
- avoid counselor identification,
- avoid invented facts,
- keep draft text consistent.

That does not require a huge frontier model by default. A practical 3B to 4B local model can be enough for a proof-of-concept if it passes the synthetic prompt test and quality checks.

## Recommended Laptop Tier

Default proof-of-concept recommendation:

- Qwen3 4B Instruct 2507 Q4_K_M
- Provider target: Ollama first, llama.cpp/GGUF later
- License: Apache-2.0 from the upstream model card
- Source: https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507
- Ollama lane: https://ollama.com/library/qwen3:4b-instruct-2507-q4_K_M

Optional laptop-tier candidates:

- Phi-3.5 Mini Instruct, MIT license, https://huggingface.co/microsoft/Phi-3.5-mini-instruct
- Gemma 3 4B IT, Gemma terms, https://huggingface.co/google/gemma-3-4b-it
- Qwen2.5 3B Instruct, Qwen Research License, https://huggingface.co/Qwen/Qwen2.5-3B-Instruct

Gemma and Qwen2.5 license terms require review before default use.

## Recommended Balanced Tier

Balanced quality candidates:

- Qwen3 8B, Apache-2.0, https://huggingface.co/Qwen/Qwen3-8B
- Mistral 7B Instruct v0.3, Apache-2.0, https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3
- Qwen2.5 7B Instruct, Qwen Research License, https://huggingface.co/Qwen/Qwen2.5-7B-Instruct

Use this tier when the machine has more RAM and the user accepts slower local responses.

## Medical Model Caution

Clinical or biomedical model names do not automatically make a model safer.

Optional review-only candidates:

- BioMistral 7B, Apache-2.0, https://huggingface.co/BioMistral/BioMistral-7B
- BioMistral Clinical 7B, MIT, https://huggingface.co/ZiweiChen/BioMistral-Clinical-7B
- MedGemma 1.5 4B IT, Health AI Developer Foundations terms, https://huggingface.co/google/medgemma-1.5-4b-it

Medical-domain models may still hallucinate, may have intended-use restrictions, and do not remove clinician review.

## Ollama Setup Option

Ollama is the first runtime target because it can run local models through `http://localhost:11434/api`.

OpenStem provider states:

- `OLLAMA_NOT_INSTALLED`
- `OLLAMA_NOT_RUNNING`
- `OLLAMA_READY`
- `OLLAMA_MODEL_MISSING`
- `OLLAMA_MODEL_READY`
- `OLLAMA_MODEL_PULL_REQUIRED`
- `OLLAMA_RUN_FAILED`

If Ollama pull is used, it is provider-managed. OpenStem must not treat an Ollama pull as OpenStem SHA-256 proof unless OpenStem has digest verification metadata.

## llama.cpp And GGUF Future Option

llama.cpp is a future target for manually verified GGUF files. The workflow requires:

- local executable configured,
- GGUF file selected,
- file exists,
- actual hash computed,
- expected SHA-256 documented before verified state,
- no weights committed.

States:

- `LLAMA_CPP_NOT_CONFIGURED`
- `LLAMA_CPP_READY`
- `GGUF_MODEL_MISSING`
- `GGUF_MODEL_READY`

## GPT4All Reference Pattern

GPT4All is useful as a model-management reference because it presents local model downloads and hardware fit clearly. It is not added as an OpenStem dependency in this pass.

States:

- `GPT4ALL_REFERENCE_ONLY`
- `GPT4ALL_RUNTIME_NOT_CONFIGURED`
- `GPT4ALL_RUNTIME_READY`

## Cloud Disabled By Default

Cloud model processing stays off by default.

States:

- `CLOUD_LLM_DISABLED`
- `CLOUD_LLM_REQUIRES_EXPLICIT_CONSENT`
- `CLOUD_LLM_BAA_REQUIRED`

BAA required for cloud PHI processing. Do not store cloud provider keys in plain text.

## Hardware Guidance

These are estimates, not promises:

- Surface Pro 3 or higher: smallest laptop tier only; may be slow.
- Modern 8 GB RAM laptop: laptop tier only.
- Modern 16 GB RAM laptop: laptop or balanced tier.
- Modern 32 GB RAM laptop/desktop: balanced tier, possibly clinical 7B if runtime supports it.
- GPU optional, but helpful for 7B to 9B models.

Slower answers are acceptable if quality is better and the user understands the wait.

## Proof-Of-Concept Clinical Prompt Test

Synthetic non-PHI transcript:

`The client discussed sleep disruption, anxiety before work, use of paced breathing, and interest in practicing grounding skills before the next appointment.`

Test prompts:

1. In one line, what were the Psychoeducation Topics Reviewed? Begin with the phrase The client.
2. In one line, how did the client benefit from the techniques used, as evidenced by the transcript? Begin with the phrase The client.
3. In one line, what is the plan for the next session? Begin with the phrase The client.

Pass criteria:

- response is non-empty,
- response starts with `The client` when required,
- response is draft-only,
- no counselor identity,
- no invented facts beyond the synthetic transcript,
- output can be placed into the section result box.

## Limits

- Clinical model readiness is separate from separator model readiness.
- Clinical proof-of-concept does not satisfy `proof:check`.
- Provider-managed downloads are not OpenStem file-hash verification.
- Missing expected checksum means no hash-verified state.
- Draft only - clinician review required before EHR entry.
