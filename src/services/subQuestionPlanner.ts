import type { TranscriptContextMap } from "./deepTranscriptComprehension";

export type TranscriptRetrievalStrategy =
  | "direct_context"
  | "keyword_evidence"
  | "theme_and_keyword_evidence"
  | "timeline_evidence";

export interface TranscriptPromptSectionInput {
  sectionId: string;
  label: string;
  prompt: string;
  requiredPrefix?: string;
  maxWords?: number;
  noBullets?: boolean;
  noTables?: boolean;
  evidenceRequired?: boolean;
  insufficientEvidenceFallback?: string;
}

export interface SubQuestionPlan {
  sectionId: string;
  sectionLabel: string;
  originalPrompt: string;
  decomposedSubQuestions: string[];
  requiredEvidenceType: string;
  outputRules: {
    requiredPrefix?: string;
    maxWords: number;
    noBullets: boolean;
    noTables: boolean;
    finalOutputSeparator: "line_break";
    insufficientEvidenceFallback: string;
  };
  retrievalStrategy: TranscriptRetrievalStrategy;
  contextMapRequired: boolean;
  hiddenReasoningExposed: false;
}

export function buildSubQuestionPlan(section: TranscriptPromptSectionInput, contextMap?: TranscriptContextMap): SubQuestionPlan {
  const promptLower = section.prompt.toLowerCase();
  const subQuestions = [
    `What transcript evidence directly supports ${section.label}?`,
    `What response, action, decision, or plan is stated for ${section.label}?`,
    `What should be omitted because the transcript evidence is insufficient?`,
  ];

  if (promptLower.includes("benefit")) {
    subQuestions.splice(1, 0, "What technique or intervention was discussed, and what client/user response was stated?");
  }

  if (promptLower.includes("plan") || promptLower.includes("follow-up")) {
    subQuestions.splice(1, 0, "What next step or follow-up item is explicitly supported?");
  }

  const retrievalStrategy: TranscriptRetrievalStrategy =
    contextMap && contextMap.repeatedTopics.length > 0 ? "theme_and_keyword_evidence" : "keyword_evidence";

  return {
    sectionId: section.sectionId,
    sectionLabel: section.label,
    originalPrompt: section.prompt,
    decomposedSubQuestions: subQuestions,
    requiredEvidenceType: section.evidenceRequired ? "supporting transcript evidence required" : "direct context acceptable",
    outputRules: {
      requiredPrefix: section.requiredPrefix,
      maxWords: section.maxWords ?? 60,
      noBullets: section.noBullets ?? true,
      noTables: section.noTables ?? true,
      finalOutputSeparator: "line_break",
      insufficientEvidenceFallback: section.insufficientEvidenceFallback ?? "Insufficient evidence",
    },
    retrievalStrategy,
    contextMapRequired: true,
    hiddenReasoningExposed: false,
  };
}

export function buildSubQuestionPlans(
  sections: TranscriptPromptSectionInput[],
  contextMap?: TranscriptContextMap,
): SubQuestionPlan[] {
  return sections.map((section) => buildSubQuestionPlan(section, contextMap));
}

export function subQuestionPlannerDoesNotExposeChainOfThought(): boolean {
  return true;
}
