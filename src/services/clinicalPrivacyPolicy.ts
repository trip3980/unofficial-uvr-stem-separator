import type { ClinicalCloudConsentState, ClinicalHistoryMode } from "../types";

export interface ClinicalPhiCloudInput {
  cloudEnabled: boolean;
  explicitConsent: boolean;
  baaDocumented: boolean;
}

export interface ClinicalPhiCloudDecision {
  allowed: boolean;
  state: ClinicalCloudConsentState;
  reason: string;
}

export interface ClinicalPrivacyMode {
  label: string;
  historyMode: ClinicalHistoryMode;
  storesTranscriptTextByDefault: boolean;
  cloudEnabledByDefault: boolean;
  logPolicy: string;
}

export const CLINICAL_PRIVACY_LANGUAGE = {
  operatingModel: "HIPAA-aware local-first operating model",
  notComplianceClaim: "HIPAA-aware workflow support; not automatic HIPAA compliance.",
  cloudWarning: "BAA required for cloud PHI processing.",
  reviewWarning: "Draft only - clinician review required before EHR entry.",
} as const;

export function getClinicalPrivacyMode(): ClinicalPrivacyMode {
  return {
    label: CLINICAL_PRIVACY_LANGUAGE.operatingModel,
    historyMode: "disabled",
    storesTranscriptTextByDefault: false,
    cloudEnabledByDefault: false,
    logPolicy: "Do not store transcript text, generated clinical text, names, or local paths in logs by default.",
  };
}

export function canSendPhiToCloud(input: ClinicalPhiCloudInput): ClinicalPhiCloudDecision {
  if (!input.cloudEnabled) {
    return {
      allowed: false,
      state: "disabled",
      reason: "Cloud model disabled by default.",
    };
  }

  if (!input.explicitConsent || !input.baaDocumented) {
    return {
      allowed: false,
      state: "requires_baa_and_consent",
      reason: "Cloud PHI processing requires explicit user action and documented safeguards.",
    };
  }

  return {
    allowed: true,
    state: "ready_with_baa",
    reason: "Cloud PHI processing may proceed only under the documented release policy.",
  };
}

export function getCloudPhiWarning(): string {
  return CLINICAL_PRIVACY_LANGUAGE.cloudWarning;
}

export function shouldStoreTranscriptText(mode: ClinicalHistoryMode): boolean {
  return mode === "full_local_opt_in";
}

export function redactTranscriptForLogs(): string {
  return "[transcript text redacted by clinical privacy policy]";
}

export function sanitizeClinicalLogEvent<T extends Record<string, unknown>>(event: T): Partial<T> {
  const redactedKeys = new Set([
    "transcriptText",
    "generatedNote",
    "clientName",
    "sessionText",
    "ehrReadyOutput",
    "sourceFilePath",
    "outputFilePath",
  ]);

  return Object.fromEntries(Object.entries(event).filter(([key]) => !redactedKeys.has(key))) as Partial<T>;
}
