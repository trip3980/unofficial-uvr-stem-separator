import type {
  ClinicalLocalModelInstallState,
  ClinicalLocalModelProvider,
  ClinicalLocalModelProviderState,
  ClinicalLocalModelTier,
  ClinicalPromptReadinessCode,
} from "../types";

export interface LocalClinicalModelEntry {
  id: string;
  displayName: string;
  provider: ClinicalLocalModelProvider;
  providerModelName: string;
  tier: ClinicalLocalModelTier;
  tierLabel: "Laptop Fast" | "Balanced Quality" | "Clinical Language Review" | "Custom Local Model";
  modelFamily: string;
  parameterSize: string;
  quantization: string;
  sourceUrl: string;
  providerUrl?: string;
  license: string;
  licenseStatus: "documented" | "license-review-required" | "unknown";
  intendedWorkflowFit: string;
  ramEstimate: string;
  vramEstimate: string;
  cpuUsable: boolean;
  gpuRecommended: boolean;
  contextLength: string;
  localInstalledState: ClinicalLocalModelInstallState;
  expectedChecksum: string | null;
  proofTaskStatus: ClinicalPromptReadinessCode;
  safetyNotes: string[];
  clinicalCautionNotes: string[];
  defaultEnabled: boolean;
  recommendedForProofOfConcept: boolean;
  speedEstimate: string;
  qualityEstimate: string;
}

export interface LocalClinicalProviderStrategy {
  provider: ClinicalLocalModelProvider;
  label: string;
  priority: number;
  defaultState: ClinicalLocalModelProviderState;
  states: ClinicalLocalModelProviderState[];
  note: string;
}

export interface ClinicalPromptProofTest {
  id: string;
  sectionTitle: string;
  prompt: string;
  requiredPrefix: string;
}

export interface ClinicalDraftQualityCheck {
  id: string;
  label: string;
  failureCode: ClinicalPromptReadinessCode;
  rule: string;
}

export interface ClinicalDraftOutputReview {
  ok: boolean;
  status: ClinicalPromptReadinessCode;
  issues: string[];
}

export interface RejectedClinicalModelCandidate {
  label: string;
  reason: string;
}

export const CLINICAL_SYNTHETIC_NON_PHI_TRANSCRIPT =
  "The client discussed sleep disruption, anxiety before work, use of paced breathing, and interest in practicing grounding skills before the next appointment.";

export const CLINICAL_LOCAL_MODEL_PROVIDER_STRATEGY: LocalClinicalProviderStrategy[] = [
  {
    provider: "ollama",
    label: "Ollama local server",
    priority: 1,
    defaultState: "OLLAMA_NOT_RUNNING",
    states: [
      "OLLAMA_NOT_INSTALLED",
      "OLLAMA_NOT_RUNNING",
      "OLLAMA_READY",
      "OLLAMA_MODEL_MISSING",
      "OLLAMA_MODEL_READY",
      "OLLAMA_MODEL_PULL_REQUIRED",
      "OLLAMA_RUN_FAILED",
    ],
    note: "Best first target because users can pull and run local chat models without OpenStem bundling weights.",
  },
  {
    provider: "llama.cpp",
    label: "llama.cpp / GGUF executable",
    priority: 2,
    defaultState: "LLAMA_CPP_NOT_CONFIGURED",
    states: ["LLAMA_CPP_NOT_CONFIGURED", "LLAMA_CPP_READY", "GGUF_MODEL_MISSING", "GGUF_MODEL_READY"],
    note: "Good future target for manually verified GGUF files after native executable and hash policy exist.",
  },
  {
    provider: "gpt4all",
    label: "GPT4All local runtime",
    priority: 3,
    defaultState: "GPT4ALL_REFERENCE_ONLY",
    states: ["GPT4ALL_REFERENCE_ONLY", "GPT4ALL_RUNTIME_NOT_CONFIGURED", "GPT4ALL_RUNTIME_READY"],
    note: "Reference pattern for local model catalog UX. Do not add as a dependency without approval.",
  },
  {
    provider: "cloud",
    label: "Cloud model",
    priority: 4,
    defaultState: "CLOUD_LLM_DISABLED",
    states: ["CLOUD_LLM_DISABLED", "CLOUD_LLM_REQUIRES_EXPLICIT_CONSENT", "CLOUD_LLM_BAA_REQUIRED"],
    note: "Disabled by default. Cloud PHI processing requires explicit user action and documented safeguards.",
  },
];

export const CLINICAL_LOCAL_MODEL_CATALOG: LocalClinicalModelEntry[] = [
  {
    id: "qwen3-4b-instruct-2507-q4km-ollama",
    displayName: "Qwen3 4B Instruct 2507 Q4_K_M",
    provider: "ollama",
    providerModelName: "qwen3:4b-instruct-2507-q4_K_M",
    tier: "laptop_fast",
    tierLabel: "Laptop Fast",
    modelFamily: "Qwen3",
    parameterSize: "4.0B",
    quantization: "Q4_K_M provider-managed",
    sourceUrl: "https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507",
    providerUrl: "https://ollama.com/library/qwen3:4b-instruct-2507-q4_K_M",
    license: "Apache-2.0",
    licenseStatus: "documented",
    intendedWorkflowFit:
      "Recommended proof-of-concept model for short structured clinical draft sections and prefix-following tests.",
    ramEstimate: "8 GB minimum target, 16 GB recommended for smoother local use",
    vramEstimate: "GPU optional; CPU usable with slower responses",
    cpuUsable: true,
    gpuRecommended: false,
    contextLength: "262,144 tokens upstream; OpenStem should use a smaller safe local context by default",
    localInstalledState: "provider-managed",
    expectedChecksum: null,
    proofTaskStatus: "CLINICAL_LLM_NOT_CONFIGURED",
    safetyNotes: [
      "Provider-managed pull is not OpenStem SHA-256 proof.",
      "A working chat model does not verify separator model weights.",
      "Run section prompts separately and keep draft-only review gates.",
    ],
    clinicalCautionNotes: [
      "Not for diagnosis.",
      "May hallucinate or overgeneralize from sparse transcript evidence.",
      "Clinician review required before EHR entry.",
    ],
    defaultEnabled: true,
    recommendedForProofOfConcept: true,
    speedEstimate: "Fastest practical curated lane; longer transcript sections may still take time.",
    qualityEstimate: "Good first pass for structured prompts and one-line outputs.",
  },
  {
    id: "phi-3-5-mini-instruct-local",
    displayName: "Phi-3.5 Mini Instruct",
    provider: "ollama",
    providerModelName: "phi3.5",
    tier: "laptop_fast",
    tierLabel: "Laptop Fast",
    modelFamily: "Phi",
    parameterSize: "3.8B",
    quantization: "Provider-managed or GGUF quantized",
    sourceUrl: "https://huggingface.co/microsoft/Phi-3.5-mini-instruct",
    providerUrl: "https://ollama.com/library/phi3.5",
    license: "MIT",
    licenseStatus: "documented",
    intendedWorkflowFit: "Useful optional small model for short clinical wording and long-context transcript snippets.",
    ramEstimate: "8 GB minimum target, 16 GB recommended",
    vramEstimate: "GPU optional; CPU usable with quantized runtime",
    cpuUsable: true,
    gpuRecommended: false,
    contextLength: "128K tokens upstream",
    localInstalledState: "provider-managed",
    expectedChecksum: null,
    proofTaskStatus: "CLINICAL_LLM_NOT_CONFIGURED",
    safetyNotes: [
      "Local runtime behavior must be tested before enabling output copy.",
      "Provider-managed model pull is not OpenStem file-hash verification.",
    ],
    clinicalCautionNotes: [
      "General-purpose model, not clinical-specialized.",
      "Must fall back to Insufficient evidence when transcript support is missing.",
    ],
    defaultEnabled: false,
    recommendedForProofOfConcept: false,
    speedEstimate: "Laptop-friendly, usually practical for short prompts.",
    qualityEstimate: "Good small-model candidate; verify section formatting before use.",
  },
  {
    id: "gemma-3-4b-it-local",
    displayName: "Gemma 3 4B IT",
    provider: "ollama",
    providerModelName: "gemma3:4b",
    tier: "laptop_fast",
    tierLabel: "Laptop Fast",
    modelFamily: "Gemma",
    parameterSize: "4B",
    quantization: "Provider-managed or GGUF quantized",
    sourceUrl: "https://huggingface.co/google/gemma-3-4b-it",
    providerUrl: "https://ollama.com/library/gemma3:4b",
    license: "Gemma terms",
    licenseStatus: "license-review-required",
    intendedWorkflowFit: "Optional laptop model after license terms and runtime behavior are reviewed.",
    ramEstimate: "8 GB minimum target, 16 GB recommended",
    vramEstimate: "GPU optional; CPU usable with quantized runtime",
    cpuUsable: true,
    gpuRecommended: false,
    contextLength: "128K tokens upstream",
    localInstalledState: "provider-managed",
    expectedChecksum: null,
    proofTaskStatus: "CLINICAL_LLM_NOT_CONFIGURED",
    safetyNotes: ["License terms require review before this becomes a default recommendation."],
    clinicalCautionNotes: ["General-purpose model; clinical drafting still requires clinician review."],
    defaultEnabled: false,
    recommendedForProofOfConcept: false,
    speedEstimate: "Laptop-friendly but runtime/version dependent.",
    qualityEstimate: "Potentially strong small-model option after license review.",
  },
  {
    id: "qwen2-5-7b-instruct-local",
    displayName: "Qwen2.5 7B Instruct",
    provider: "ollama",
    providerModelName: "qwen2.5:7b",
    tier: "balanced_quality",
    tierLabel: "Balanced Quality",
    modelFamily: "Qwen2.5",
    parameterSize: "7.61B",
    quantization: "Provider-managed Q4 class recommended",
    sourceUrl: "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct",
    providerUrl: "https://ollama.com/library/qwen2.5:7b",
    license: "Qwen Research License",
    licenseStatus: "license-review-required",
    intendedWorkflowFit: "Better quality lane for summaries when the user accepts slower local responses.",
    ramEstimate: "16 GB recommended",
    vramEstimate: "GPU helpful but not required with quantization",
    cpuUsable: true,
    gpuRecommended: true,
    contextLength: "131,072 tokens upstream",
    localInstalledState: "provider-managed",
    expectedChecksum: null,
    proofTaskStatus: "CLINICAL_LLM_NOT_CONFIGURED",
    safetyNotes: ["License review required before default use.", "Not a stem-separation proof asset."],
    clinicalCautionNotes: ["Can still invent unsupported details; evidence checks remain required."],
    defaultEnabled: false,
    recommendedForProofOfConcept: false,
    speedEstimate: "Slower on CPU; acceptable for quality-focused sections.",
    qualityEstimate: "Stronger summary quality than small models, but not required for proof-of-concept.",
  },
  {
    id: "qwen3-8b-local",
    displayName: "Qwen3 8B",
    provider: "ollama",
    providerModelName: "qwen3:8b",
    tier: "balanced_quality",
    tierLabel: "Balanced Quality",
    modelFamily: "Qwen3",
    parameterSize: "8.2B",
    quantization: "Provider-managed Q4 class recommended",
    sourceUrl: "https://huggingface.co/Qwen/Qwen3-8B",
    providerUrl: "https://ollama.com/library/qwen3:8b",
    license: "Apache-2.0",
    licenseStatus: "documented",
    intendedWorkflowFit: "Balanced local model when the user wants stronger instruction following and has more RAM.",
    ramEstimate: "16 GB recommended, 32 GB smoother for longer context",
    vramEstimate: "GPU helpful but optional with quantized runtime",
    cpuUsable: true,
    gpuRecommended: true,
    contextLength: "32,768 tokens native; 131,072 with YaRN in supported runtimes",
    localInstalledState: "provider-managed",
    expectedChecksum: null,
    proofTaskStatus: "CLINICAL_LLM_NOT_CONFIGURED",
    safetyNotes: ["Disable or manage thinking output for concise clinical sections.", "Not a separator model."],
    clinicalCautionNotes: ["Needs output-format checks to avoid reasoning text leaking into section output."],
    defaultEnabled: false,
    recommendedForProofOfConcept: false,
    speedEstimate: "Moderate to slow on CPU.",
    qualityEstimate: "Good balanced candidate after local provider check passes.",
  },
  {
    id: "mistral-7b-instruct-v0-3-local",
    displayName: "Mistral 7B Instruct v0.3",
    provider: "ollama",
    providerModelName: "mistral:7b-instruct",
    tier: "balanced_quality",
    tierLabel: "Balanced Quality",
    modelFamily: "Mistral",
    parameterSize: "7B",
    quantization: "Provider-managed Q4/Q5 class recommended",
    sourceUrl: "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3",
    providerUrl: "https://ollama.com/library/mistral:7b-instruct",
    license: "Apache-2.0",
    licenseStatus: "documented",
    intendedWorkflowFit: "Stable balanced option for concise summaries and instruction following.",
    ramEstimate: "16 GB recommended",
    vramEstimate: "GPU helpful but optional with quantized runtime",
    cpuUsable: true,
    gpuRecommended: true,
    contextLength: "32K class context in common local runtimes",
    localInstalledState: "provider-managed",
    expectedChecksum: null,
    proofTaskStatus: "CLINICAL_LLM_NOT_CONFIGURED",
    safetyNotes: ["No moderation mechanism should be assumed.", "Not a proof model for audio separation."],
    clinicalCautionNotes: ["General-purpose model; keep clinician review and evidence checks."],
    defaultEnabled: false,
    recommendedForProofOfConcept: false,
    speedEstimate: "Moderate to slow on CPU.",
    qualityEstimate: "Useful fallback balanced model with clear Apache-2.0 licensing.",
  },
  {
    id: "biomistral-7b-review-only",
    displayName: "BioMistral 7B",
    provider: "llama.cpp",
    providerModelName: "manual GGUF required",
    tier: "clinical_language_review",
    tierLabel: "Clinical Language Review",
    modelFamily: "BioMistral",
    parameterSize: "7B",
    quantization: "Manual GGUF required",
    sourceUrl: "https://huggingface.co/BioMistral/BioMistral-7B",
    license: "Apache-2.0",
    licenseStatus: "documented",
    intendedWorkflowFit: "Optional clinical-language review lane after safety and workflow testing.",
    ramEstimate: "16 GB recommended, 32 GB smoother",
    vramEstimate: "GPU helpful for acceptable speed",
    cpuUsable: true,
    gpuRecommended: true,
    contextLength: "Runtime dependent",
    localInstalledState: "manually-imported",
    expectedChecksum: null,
    proofTaskStatus: "CLINICAL_LLM_NOT_CONFIGURED",
    safetyNotes: ["Medical-domain model is not automatically safer.", "Manual GGUF hash metadata required for verified state."],
    clinicalCautionNotes: [
      "May still hallucinate.",
      "Does not remove clinician review.",
      "Use only after clinical prompt test passes.",
    ],
    defaultEnabled: false,
    recommendedForProofOfConcept: false,
    speedEstimate: "Slow on CPU; better with GPU or optimized GGUF.",
    qualityEstimate: "Optional clinical-language candidate, not default.",
  },
  {
    id: "medgemma-1-5-4b-it-review-only",
    displayName: "MedGemma 1.5 4B IT",
    provider: "llama.cpp",
    providerModelName: "manual compatible runtime required",
    tier: "clinical_language_review",
    tierLabel: "Clinical Language Review",
    modelFamily: "MedGemma",
    parameterSize: "4B",
    quantization: "Manual compatible runtime required",
    sourceUrl: "https://huggingface.co/google/medgemma-1.5-4b-it",
    license: "Health AI Developer Foundations terms",
    licenseStatus: "license-review-required",
    intendedWorkflowFit: "Optional medical-language review after terms, safety, and runtime support are reviewed.",
    ramEstimate: "16 GB recommended",
    vramEstimate: "GPU helpful; runtime support must be validated",
    cpuUsable: true,
    gpuRecommended: true,
    contextLength: "Runtime dependent",
    localInstalledState: "manually-imported",
    expectedChecksum: null,
    proofTaskStatus: "CLINICAL_LLM_NOT_CONFIGURED",
    safetyNotes: [
      "Terms and intended-use review required before enabling.",
      "Medical specialization does not make the app compliant or review-free.",
    ],
    clinicalCautionNotes: ["May be prompt-sensitive.", "Not a replacement for clinician judgment."],
    defaultEnabled: false,
    recommendedForProofOfConcept: false,
    speedEstimate: "Runtime dependent.",
    qualityEstimate: "Review-only medical-language candidate, not default.",
  },
];

export const REJECTED_CLINICAL_MODEL_CANDIDATES: RejectedClinicalModelCandidate[] = [
  {
    label: "0.5B to 1B novelty chat models",
    reason:
      "Rejected as defaults because they are likely too weak for stable clinical wording and transcript-evidence discipline.",
  },
  {
    label: "70B, 72B, 235B, and similar heavyweight models",
    reason: "Rejected as defaults because they create a heavyweight local-runtime burden that does not fit the workflow.",
  },
  {
    label: "Uncensored or abliterated variants",
    reason: "Rejected because the clinical workflow needs conservative instruction following and safety boundaries.",
  },
  {
    label: "Embedding-only models",
    reason: "Rejected because they do not generate section drafts.",
  },
  {
    label: "Cloud-only model endpoints",
    reason: "Rejected for default use because cloud PHI processing is disabled until explicit user action and documented safeguards exist.",
  },
];

export const CLINICAL_PROMPT_PROOF_TESTS: ClinicalPromptProofTest[] = [
  {
    id: "psychoeducation-one-line",
    sectionTitle: "Psychoeducation Topics Reviewed",
    requiredPrefix: "The client",
    prompt:
      "In one line, what were the Psychoeducation Topics Reviewed? Begin with the phrase The client.",
  },
  {
    id: "benefit-one-line",
    sectionTitle: "Benefit From Techniques",
    requiredPrefix: "The client",
    prompt:
      "In one line, how did the client benefit from the techniques used, as evidenced by the transcript? Begin with the phrase The client.",
  },
  {
    id: "plan-one-line",
    sectionTitle: "Plan for Next Session",
    requiredPrefix: "The client",
    prompt:
      "In one line, what is the plan for the next session? Begin with the phrase The client.",
  },
];

export const CLINICAL_DRAFT_QUALITY_CHECKS: ClinicalDraftQualityCheck[] = [
  {
    id: "required-prefix",
    label: "Required prefix check",
    failureCode: "CLINICAL_LLM_OUTPUT_FORMAT_FAILED",
    rule: "Output must start with The client when the section requires that prefix.",
  },
  {
    id: "word-limit",
    label: "Word limit check",
    failureCode: "CLINICAL_LLM_OUTPUT_FORMAT_FAILED",
    rule: "One-line section outputs should stay concise and avoid rambling.",
  },
  {
    id: "no-bullets",
    label: "No bullet points check",
    failureCode: "CLINICAL_LLM_OUTPUT_FORMAT_FAILED",
    rule: "One-line sections should not use bullet points unless the template asks for them.",
  },
  {
    id: "no-counselor-mention",
    label: "No counselor mention check",
    failureCode: "CLINICAL_LLM_OUTPUT_FORMAT_FAILED",
    rule: "Output must not identify the counselor when prohibited.",
  },
  {
    id: "insufficient-evidence",
    label: "Insufficient evidence fallback",
    failureCode: "CLINICAL_LLM_INSUFFICIENT_EVIDENCE",
    rule: "If transcript evidence is missing, write Insufficient evidence.",
  },
  {
    id: "no-invented-diagnosis",
    label: "No diagnosis invention",
    failureCode: "CLINICAL_LLM_OUTPUT_FORMAT_FAILED",
    rule: "Do not invent diagnoses, symptoms, risk level, or treatment facts beyond the transcript.",
  },
  {
    id: "draft-only",
    label: "Draft-only warning",
    failureCode: "CLINICAL_LLM_DRAFT_ONLY",
    rule: "Generated text remains draft-only until clinician review.",
  },
];

export function getDefaultClinicalLocalModel(): LocalClinicalModelEntry {
  return (
    CLINICAL_LOCAL_MODEL_CATALOG.find((model) => model.defaultEnabled && model.recommendedForProofOfConcept) ??
    CLINICAL_LOCAL_MODEL_CATALOG[0]
  );
}

export function getClinicalModelsByTier(tier: ClinicalLocalModelTier): LocalClinicalModelEntry[] {
  return CLINICAL_LOCAL_MODEL_CATALOG.filter((model) => model.tier === tier);
}

export function getClinicalProviderStrategy(provider: ClinicalLocalModelProvider): LocalClinicalProviderStrategy {
  return (
    CLINICAL_LOCAL_MODEL_PROVIDER_STRATEGY.find((strategy) => strategy.provider === provider) ??
    CLINICAL_LOCAL_MODEL_PROVIDER_STRATEGY[0]
  );
}

export function clinicalLocalModelDoesNotAffectReleaseGate(): string {
  return "A local clinical/chat model can support draft note workflow only. It does not approve Beta Candidate, prove stem separation, or verify separator model weights.";
}

export function getClinicalPromptTestReadiness(): ClinicalDraftOutputReview {
  return {
    ok: false,
    status: "CLINICAL_LLM_NOT_CONFIGURED",
    issues: [
      "No local provider check has passed.",
      "No selected model has completed the synthetic non-PHI prompt test.",
      "Draft output remains unavailable until a real local model run passes quality checks.",
    ],
  };
}

export function evaluateClinicalDraftOutput(
  output: string,
  options: { requiredPrefix?: string; prohibitCounselorMention?: boolean } = {},
): ClinicalDraftOutputReview {
  const text = output.trim();
  const issues: string[] = [];

  if (!text) {
    return { ok: false, status: "CLINICAL_LLM_OUTPUT_EMPTY", issues: ["Output is empty."] };
  }

  if (options.requiredPrefix && !text.toLowerCase().startsWith(options.requiredPrefix.toLowerCase())) {
    issues.push(`Output must start with ${options.requiredPrefix}.`);
  }

  if (options.prohibitCounselorMention && /\b(counselor|therapist|clinician|provider)\b/i.test(text)) {
    issues.push("Output mentions the counselor or provider when prohibited.");
  }

  if (/\b(diagnosed|diagnosis|suicidal|homicidal|psychosis|mania)\b/i.test(text)) {
    issues.push("Output may be adding unsupported clinical risk or diagnosis language.");
  }

  return issues.length === 0
    ? { ok: true, status: "CLINICAL_LLM_PROOF_PASSED", issues: [] }
    : { ok: false, status: "CLINICAL_LLM_OUTPUT_FORMAT_FAILED", issues };
}
