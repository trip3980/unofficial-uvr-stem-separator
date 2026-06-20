import type {
  ClinicalPromptReadinessCode,
  ClinicalPromptSectionResult,
  ClinicalPromptWorkflowTemplate,
} from "../types";

export interface ClinicalWorkflowReadinessItem {
  code: ClinicalPromptReadinessCode;
  label: string;
  state: "blocked" | "warning" | "ready" | "info";
  message: string;
}

export const CLINICAL_DRAFT_DISCLAIMER =
  "Draft only - clinician review required before EHR entry.";

export const DEFAULT_CLINICAL_PROMPT_TEMPLATE: ClinicalPromptWorkflowTemplate = {
  id: "session-clinical-summary-client-lines",
  name: "Session Clinical Summary - Client-Focused Lines",
  description:
    "Five-section draft note workflow for turning a transcript into clinician-reviewed summary text.",
  clinicianReviewRequired: true,
  sections: [
    {
      id: "psychoeducation-topics",
      title: "Psychoeducation Topics Reviewed",
      requiredPrefix: "The client",
      outputStatus: "LOCAL_LLM_NOT_CONFIGURED",
      prompt:
        "Analyze the transcript and identify psychoeducation topics reviewed. Write a concise clinical line for each topic. Begin with the phrase The client. Do not identify the counselor by name or role unless the transcript makes that clinically necessary.",
    },
    {
      id: "benefit-from-techniques",
      title: "Benefit From Techniques",
      requiredPrefix: "The client",
      outputStatus: "LOCAL_LLM_NOT_CONFIGURED",
      prompt:
        "Analyze the transcript and identify how the client may benefit from techniques discussed during the session. Begin with the phrase The client. Use only transcript-supported evidence and avoid diagnostic claims.",
    },
    {
      id: "risk-intervention-response",
      title: "Response to Risk Interventions",
      requiredPrefix: "The client",
      outputStatus: "LOCAL_LLM_NOT_CONFIGURED",
      prompt:
        "Analyze the transcript for any risk-related interventions and the client's response. Begin with the phrase The client. If the transcript does not support a risk intervention, state Insufficient evidence rather than inventing content.",
    },
    {
      id: "plan-for-next-session",
      title: "Plan for Next Session",
      requiredPrefix: "The client",
      outputStatus: "LOCAL_LLM_NOT_CONFIGURED",
      prompt:
        "Analyze the transcript and draft the plan for next session. Begin with the phrase The client. Keep it brief, client-focused, and supported by the transcript.",
    },
    {
      id: "talking-points-summary",
      title: "Talking Points Summary",
      requiredPrefix: "Review",
      outputStatus: "LOCAL_LLM_NOT_CONFIGURED",
      prompt:
        "Create a talking-points summary for clinician review. Include only points that are supported by the transcript. If evidence is missing, write Insufficient evidence.",
    },
  ],
};

export function getDefaultClinicalWorkflowReadiness(): ClinicalWorkflowReadinessItem[] {
  return [
    {
      code: "CLINICAL_BROWSER_PREVIEW_ONLY",
      label: "Browser Preview / Manual Paste Only",
      state: "blocked",
      message: "No native transcript importer or local LLM runner is active.",
    },
    {
      code: "CLINICAL_TRANSCRIPT_INPUT_MISSING",
      label: "Transcript input missing",
      state: "blocked",
      message: "Paste or import a verified local transcript before a draft can be prepared.",
    },
    {
      code: "LOCAL_LLM_NOT_CONFIGURED",
      label: "Local LLM not configured",
      state: "blocked",
      message: "Clinical drafting stays disabled until a local model endpoint is configured and verified.",
    },
    {
      code: "CLINICAL_LLM_NOT_CONFIGURED",
      label: "Clinical local model not configured",
      state: "blocked",
      message: "Choose a curated local drafting model and verify the provider before running section prompts.",
    },
    {
      code: "CLOUD_LLM_DISABLED",
      label: "Cloud model disabled",
      state: "info",
      message: "Cloud PHI processing is off by default and requires documented safeguards before use.",
    },
    {
      code: "CLINICAL_OUTPUT_DRAFT_ONLY",
      label: "Draft-only output",
      state: "warning",
      message: CLINICAL_DRAFT_DISCLAIMER,
    },
    {
      code: "CLINICAL_HISTORY_METADATA_ONLY",
      label: "History disabled / metadata-only",
      state: "info",
      message: "Transcript text and generated clinical text are not stored in history by default.",
    },
  ];
}

export function buildPendingClinicalSectionResults(): ClinicalPromptSectionResult[] {
  return DEFAULT_CLINICAL_PROMPT_TEMPLATE.sections.map((section) => ({
    sectionId: section.id,
    status: "LOCAL_LLM_NOT_CONFIGURED",
    text: "Section output pending - local LLM not configured.",
    verified: false,
  }));
}

export function getClinicalDraftDisclaimer(): string {
  return CLINICAL_DRAFT_DISCLAIMER;
}

export function clinicalWorkflowDoesNotAffectReleaseGate(): string {
  return "Clinical prompt workflow is documentation support only and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.";
}
