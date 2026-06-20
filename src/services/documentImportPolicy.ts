import {
  getDocumentInputPolicy,
  type DocumentDiagnosticCode,
  type DocumentInputFormatId,
} from "./documentFormatPolicy";

export interface DocumentImportPlanInput {
  formatId?: DocumentInputFormatId;
  nativeFileVerified?: boolean;
  parserDependencyAvailable?: boolean;
  converterReady?: boolean;
  schemaValid?: boolean;
  sanitized?: boolean;
  textNonEmpty?: boolean;
}

export interface DocumentImportPlan {
  formatId: DocumentInputFormatId;
  status: string;
  canImport: boolean;
  requiresNativePath: boolean;
  requiresDependency: boolean;
  requiresExternalConverter: boolean;
  diagnosticCode: DocumentDiagnosticCode;
  userMessage: string;
  sourcePreserved: true;
  cloudUploadDefault: false;
  textLoggedByDefault: false;
  reviewBoxRequired: true;
  editBeforePromptWorkflow: true;
}

export const DOCUMENT_IMPORT_RULES = {
  noCloudParsing: true,
  noHiddenUpload: true,
  textLoggedByDefault: false,
  sourceFilesModified: false,
  malformedFilesCrashApp: false,
  reviewBoxRequired: true,
  userCanEditExtractedText: true,
  supportedFirstFormats: ["txt", "vtt"],
} as const;

export const DOCUMENT_IMPORT_WORKFLOW_STEPS = [
  "Select local document",
  "Verify extension and native path",
  "Parse locally or require a validated converter",
  "Show extracted text in scroll box",
  "Let user edit before prompt workflow",
  "Preserve source file",
] as const;

export function buildDocumentImportPlan(input: DocumentImportPlanInput = {}): DocumentImportPlan {
  const formatId = input.formatId ?? "txt";
  const policy = getDocumentInputPolicy(formatId);
  const nativeFileVerified = input.nativeFileVerified === true;
  const dependencyReady = !policy.requiresDependency || input.parserDependencyAvailable === true;
  const converterReady = !policy.requiresExternalConverter || input.converterReady === true;
  const sanitizationReady = !policy.requiresSanitization || input.sanitized === true;
  const schemaReady = formatId !== "json_transcript" || input.schemaValid === true;
  const textReady = input.textNonEmpty !== false;
  const canImport =
    nativeFileVerified &&
    dependencyReady &&
    converterReady &&
    sanitizationReady &&
    schemaReady &&
    textReady &&
    policy.status !== "planned" &&
    policy.status !== "unsupported";

  let diagnosticCode = policy.diagnosticCode;
  if (formatId === "json_transcript" && !schemaReady) {
    diagnosticCode = "DOCUMENT_IMPORT_SCHEMA_INVALID";
  } else if (policy.requiresSanitization && !sanitizationReady) {
    diagnosticCode = "DOCUMENT_IMPORT_SANITIZATION_REQUIRED";
  }

  return {
    formatId,
    status: policy.status,
    canImport,
    requiresNativePath: policy.requiresNativePath && !nativeFileVerified,
    requiresDependency: policy.requiresDependency && !dependencyReady,
    requiresExternalConverter: policy.requiresExternalConverter && !converterReady,
    diagnosticCode,
    userMessage: canImport
      ? `${policy.label} import can proceed locally and still requires user review.`
      : policy.userMessage,
    sourcePreserved: true,
    cloudUploadDefault: false,
    textLoggedByDefault: false,
    reviewBoxRequired: true,
    editBeforePromptWorkflow: true,
  };
}

export function validateDocumentImportSchema(input: unknown): { ok: boolean; reason: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, reason: "JSON transcript import requires an object." };
  }

  const value = input as { schemaVersion?: unknown; transcriptText?: unknown; segments?: unknown };
  const hasTranscriptText = typeof value.transcriptText === "string" && value.transcriptText.trim().length > 0;
  const hasSegments = Array.isArray(value.segments);
  const hasSchema = typeof value.schemaVersion === "number";

  if (!hasSchema) {
    return { ok: false, reason: "JSON transcript import requires numeric schemaVersion." };
  }

  if (!hasTranscriptText && !hasSegments) {
    return { ok: false, reason: "JSON transcript import requires transcriptText or segments." };
  }

  return { ok: true, reason: "JSON transcript schema is valid for local review." };
}

export function documentImportDoesNotAffectReleaseGate(): string {
  return "Document import is not stem separation proof and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.";
}
