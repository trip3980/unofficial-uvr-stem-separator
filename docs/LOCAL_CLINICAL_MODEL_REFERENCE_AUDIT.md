# Local Clinical Model Reference Audit

## Scope

This audit supports the Clinical Workflow Builder curated local chat-model lane. It reviews practical local text models for short structured clinical draft prompts.

This is not a stem-separation model audit. No model weights are bundled, downloaded, committed, or proof-approved by this document.

## Runtime References

| Runtime           | Source                                              | Finding                                                                        | OpenStem adaptation                                                  |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Ollama            | https://docs.ollama.com/api/introduction            | Local API is served at `http://localhost:11434/api` after installation.        | First provider target; provider check is not wired yet.              |
| Ollama qwen2.5:3b | https://ollama.com/library/qwen2.5:3b               | 3.09B Q4_K_M model shown as 1.9 GB with chat API examples.                     | Useful proof that provider-managed small models can be laptop-sized. |
| GPT4All           | https://docs.gpt4all.io/gpt4all_desktop/models.html | Optimized for 3B to 13B models on consumer hardware; downloads models locally. | Reference-only catalog pattern; no dependency added.                 |
| llama.cpp         | https://github.com/ggml-org/llama.cpp               | Uses GGUF format and local CLI workflows.                                      | Future manual-file lane with hash verification.                      |

## Candidate Audit

| Candidate                | Source                                                    | License                               | Size  | Runtime fit                     | Hardware fit       | Strengths                                                 | Weaknesses                                                      | Recommendation                          |
| ------------------------ | --------------------------------------------------------- | ------------------------------------- | ----- | ------------------------------- | ------------------ | --------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| Qwen3 4B Instruct 2507   | https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507        | Apache-2.0                            | 4.0B  | Ollama/GGUF possible            | Laptop tier        | Strong small instruct model, long context, clear license. | Provider/runtime tag must be checked locally.                   | Default proof-of-concept candidate.     |
| Phi-3.5 Mini Instruct    | https://huggingface.co/microsoft/Phi-3.5-mini-instruct    | MIT                                   | 3.8B  | Ollama/GGUF possible            | Laptop tier        | Long context, small, good reasoning for size.             | Runtime behavior and prompt format need testing.                | Optional laptop candidate.              |
| Gemma 3 4B IT            | https://huggingface.co/google/gemma-3-4b-it               | Gemma terms                           | 4B    | Ollama/GGUF possible            | Laptop tier        | Compact, long context, strong general tasks.              | License terms require review before default use.                | Optional after license review.          |
| Qwen2.5 3B Instruct      | https://huggingface.co/Qwen/Qwen2.5-3B-Instruct           | Qwen Research License                 | 3.09B | Ollama/GGUF possible            | Laptop tier        | Small, multilingual, structured-output strengths.         | License terms require review before default use.                | Optional after license review.          |
| Qwen3 8B                 | https://huggingface.co/Qwen/Qwen3-8B                      | Apache-2.0                            | 8.2B  | Ollama/GGUF possible            | 16 GB+ recommended | Better balanced quality and instruction following.        | Thinking output must be managed for concise sections.           | Balanced quality candidate.             |
| Mistral 7B Instruct v0.3 | https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3 | Apache-2.0                            | 7B    | Ollama/GGUF possible            | 16 GB+ recommended | Stable Apache-2.0 balanced option.                        | No moderation should be assumed.                                | Balanced fallback.                      |
| Qwen2.5 7B Instruct      | https://huggingface.co/Qwen/Qwen2.5-7B-Instruct           | Qwen Research License                 | 7.61B | Ollama/GGUF possible            | 16 GB+ recommended | Stronger summary quality, long context.                   | License terms require review before default use.                | Optional balanced candidate.            |
| BioMistral 7B            | https://huggingface.co/BioMistral/BioMistral-7B           | Apache-2.0                            | 7B    | Manual GGUF likely              | 16 GB+ recommended | Biomedical language exposure.                             | Medical-domain model may still hallucinate.                     | Optional clinical-language review only. |
| BioMistral Clinical 7B   | https://huggingface.co/ZiweiChen/BioMistral-Clinical-7B   | MIT                                   | 7B    | Manual runtime review required  | 16 GB+ recommended | Clinical-note fine-tuning signal.                         | Small community footprint; safety and workflow review required. | Optional review only.                   |
| MedGemma 1.5 4B IT       | https://huggingface.co/google/medgemma-1.5-4b-it          | Health AI Developer Foundations terms | 4B    | Runtime support must be checked | 16 GB recommended  | Medical text/EHR-oriented benchmarks and documentation.   | Terms and intended-use review required; prompt-sensitive.       | Optional review only.                   |

## Rejected Defaults

| Candidate class                                | Reason                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| 0.5B to 1B novelty chat models                 | Too weak for stable clinical wording and transcript-evidence discipline.      |
| 70B, 72B, 235B, and similar heavyweight models | Too heavy for the default workstation workflow.                               |
| Uncensored or abliterated variants             | Wrong safety posture for clinical draft workflow.                             |
| Embedding-only models                          | They do not generate section drafts.                                          |
| Cloud-only endpoints                           | Cloud PHI processing is disabled by default and requires explicit safeguards. |

## Selected Proof-Of-Concept Recommendation

Use Qwen3 4B Instruct 2507 Q4_K_M as the first proof-of-concept target through Ollama if the local provider is installed and running.

Reason:

- practical 4B size,
- Apache-2.0 upstream license,
- instruction-tuned,
- provider-managed local runtime path,
- suitable for the short section prompts OpenStem needs first.

The proof-of-concept must use only the synthetic non-PHI transcript from `docs/LOCAL_CLINICAL_MODEL_GUIDE.md`.

## Remaining Verification

- Ollama local provider probe is not wired.
- Model availability check is not wired.
- Section prompt execution is not wired.
- GGUF file hash verification is not wired for clinical chat models.
- Cloud remains disabled by default.
- Clinician review remains required.
