import type { TranscriptEvidenceResult } from "./transcriptEvidenceIndex";
import type { SubQuestionPlan } from "./subQuestionPlanner";

export type TranscriptSectionAnswerStatus =
  | "SECTION_READY"
  | "SECTION_RUNNING"
  | "SECTION_COMPLETE"
  | "SECTION_NEEDS_REVIEW"
  | "SECTION_FAILED"
  | "SECTION_EVIDENCE_INSUFFICIENT"
  | "SECTION_FORMAT_FAILED";

export interface TranscriptAnswerQualityResult {
  ok: boolean;
  status: TranscriptSectionAnswerStatus;
  warnings: string[];
}

export const TRANSCRIPT_ANSWER_SYNTHESIS_POLICY = {
  answerOnlyFromEvidence: true,
  insufficientEvidenceFallback: "Insufficient evidence",
  finalOutputSeparator: "line_break",
  noBulletsByDefault: true,
  noTablesByDefault: true,
  noHiddenChainOfThought: true,
  noCloudByDefault: true,
  noTranscriptLoggingByDefault: true,
  proofBoundary:
    "Transcript prompt output does not satisfy OpenStem stem-separation proof or approve Beta Candidate.",
};

export function buildDraftSectionAnswer(plan: SubQuestionPlan, evidence: TranscriptEvidenceResult): string {
  if (evidence.status !== "EVIDENCE_FOUND" || evidence.snippets.length === 0) {
    return plan.outputRules.insufficientEvidenceFallback;
  }

  const prefix = plan.outputRules.requiredPrefix ? `${plan.outputRules.requiredPrefix} ` : "";
  const firstSnippet = evidence.snippets[0].text.replace(/\s+/g, " ").trim();
  const words = firstSnippet.split(/\s+/).slice(0, Math.max(4, plan.outputRules.maxWords - prefix.split(/\s+/).length));
  return `${prefix}${words.join(" ")}`.trim();
}

export function evaluateTranscriptSectionAnswer(answer: string, plan: SubQuestionPlan): TranscriptAnswerQualityResult {
  const warnings: string[] = [];
  const trimmed = answer.trim();

  if (!trimmed) {
    return { ok: false, status: "SECTION_FAILED", warnings: ["empty answer"] };
  }

  if (trimmed === plan.outputRules.insufficientEvidenceFallback) {
    return { ok: false, status: "SECTION_EVIDENCE_INSUFFICIENT", warnings: ["evidence insufficient"] };
  }

  if (plan.outputRules.requiredPrefix && !trimmed.startsWith(plan.outputRules.requiredPrefix)) {
    warnings.push("prefix missing");
  }

  if (plan.outputRules.noBullets && /^\s*[-*]/m.test(trimmed)) {
    warnings.push("bullet leakage");
  }

  if (plan.outputRules.noTables && /\|.+\|/.test(trimmed)) {
    warnings.push("table leakage");
  }

  if (trimmed.split(/\s+/).length > plan.outputRules.maxWords) {
    warnings.push("too long");
  }

  return {
    ok: warnings.length === 0,
    status: warnings.length === 0 ? "SECTION_COMPLETE" : "SECTION_FORMAT_FAILED",
    warnings,
  };
}

export function assemblePlainTextOutput(sectionAnswers: string[]): string {
  return sectionAnswers.map((answer) => answer.trim()).filter(Boolean).join("\n\n");
}

export function getTranscriptAnswerSynthesisPolicy() {
  return TRANSCRIPT_ANSWER_SYNTHESIS_POLICY;
}
