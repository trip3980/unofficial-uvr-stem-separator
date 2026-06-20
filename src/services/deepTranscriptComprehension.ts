export type TranscriptWorkflowModeId = "quick" | "deep_read" | "subq_evidence";

export type TranscriptWorkflowModeRecommendation =
  | "QUICK_MODE_OK"
  | "DEEP_READ_RECOMMENDED"
  | "SUBQ_EVIDENCE_RECOMMENDED";

export interface TranscriptWorkflowMode {
  id: TranscriptWorkflowModeId;
  label: string;
  description: string;
  recommendedFor: string;
  stageOrder: string[];
}

export interface TranscriptContextMap {
  status: "CONTEXT_MAP_NOT_BUILT" | "CONTEXT_MAP_READY" | "CONTEXT_MAP_PREVIEW_ONLY";
  transcriptLengthClass: "short" | "long" | "very_long";
  themes: string[];
  repeatedTopics: string[];
  timeline: string[];
  keyFacts: string[];
  actions: string[];
  responses: string[];
  plans: string[];
  concerns: string[];
  unresolvedItems: string[];
  evidenceReferences: string[];
  transcriptTextLogged: false;
}

export const TRANSCRIPT_WORKFLOW_MODES: TranscriptWorkflowMode[] = [
  {
    id: "quick",
    label: "Quick Mode",
    description: "For short text and simple prompts. No deep context map or evidence index is claimed.",
    recommendedFor: "Short transcripts and simple one-section prompts.",
    stageOrder: ["Prompt Sections", "Section Answering", "Plain Text Assembly"],
  },
  {
    id: "deep_read",
    label: "Deep Read Mode",
    description: "Reads the transcript in stages and builds a whole-document context map before prompts.",
    recommendedFor: "Long transcripts where global context matters.",
    stageOrder: ["Deep Read", "Context Map", "Section Answering", "Plain Text Assembly"],
  },
  {
    id: "subq_evidence",
    label: "SubQ + Evidence Mode",
    description:
      "Breaks each workflow prompt into smaller questions, checks transcript evidence, then writes each answer separately.",
    recommendedFor: "Very long transcripts or complex multi-section workflows.",
    stageOrder: [
      "Deep Read",
      "SubQ Planning",
      "Evidence Retrieval",
      "Section Answering",
      "Output Verification",
      "Plain Text Assembly",
    ],
  },
];

export const DEEP_TRANSCRIPT_PRIVACY_POLICY = {
  localOnlyByDefault: true,
  cloudEmbeddingsDefault: "disabled",
  cloudRagDefault: "disabled",
  cloudLlmDefault: "disabled",
  transcriptTextLoggedByDefault: false,
  historyModeDefault: "metadata-only or disabled",
  clearableArtifacts: ["transcript", "context map", "evidence index", "section outputs"],
};

export function classifyTranscriptLength(wordCount: number): TranscriptContextMap["transcriptLengthClass"] {
  if (wordCount >= 8000) return "very_long";
  if (wordCount >= 1800) return "long";
  return "short";
}

export function getRecommendedTranscriptWorkflowMode(args: {
  wordCount: number;
  sectionCount: number;
  evidenceRequired: boolean;
}): { modeId: TranscriptWorkflowModeId; status: TranscriptWorkflowModeRecommendation; reason: string } {
  if (args.wordCount >= 8000 || args.sectionCount >= 5 || args.evidenceRequired) {
    return {
      modeId: "subq_evidence",
      status: "SUBQ_EVIDENCE_RECOMMENDED",
      reason: "Very long or evidence-heavy workflows should build context before retrieving section evidence.",
    };
  }

  if (args.wordCount >= 1800) {
    return {
      modeId: "deep_read",
      status: "DEEP_READ_RECOMMENDED",
      reason: "Long transcripts should build a context map before answering prompts.",
    };
  }

  return {
    modeId: "quick",
    status: "QUICK_MODE_OK",
    reason: "Short transcript workflows can start in Quick Mode without claiming deep evidence retrieval.",
  };
}

export function buildPreviewContextMap(args: {
  wordCount: number;
  themes?: string[];
  repeatedTopics?: string[];
  timeline?: string[];
}): TranscriptContextMap {
  return {
    status: "CONTEXT_MAP_PREVIEW_ONLY",
    transcriptLengthClass: classifyTranscriptLength(args.wordCount),
    themes: args.themes ?? [],
    repeatedTopics: args.repeatedTopics ?? [],
    timeline: args.timeline ?? [],
    keyFacts: [],
    actions: [],
    responses: [],
    plans: [],
    concerns: [],
    unresolvedItems: [],
    evidenceReferences: [],
    transcriptTextLogged: false,
  };
}

export function deepTranscriptWorkflowDoesNotAffectReleaseGate(): string {
  return "This Transcript Deep Read, SubQ, and RAG workflow is documentation support only and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.";
}
