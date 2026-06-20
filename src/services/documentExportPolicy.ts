import {
  getDocumentOutputPolicy,
  type DocumentDiagnosticCode,
  type DocumentOutputFormatId,
} from "./documentFormatPolicy";

export type DocumentExternalConverterType = "soffice" | "custom" | "pandoc";

export interface DocumentExportVerificationInput {
  outputPath?: string;
  exists?: boolean;
  sizeBytes?: number;
  extensionMatches?: boolean;
  insideSelectedFolder?: boolean;
  overwritePolicyAllows?: boolean;
}

export interface DocumentExportPlanInput extends DocumentExportVerificationInput {
  formatId?: DocumentOutputFormatId;
  nativeWriteVerified?: boolean;
  dependencyAvailable?: boolean;
  converterReady?: boolean;
  timestampsAvailable?: boolean;
  speakerRenameApplied?: boolean;
}

export interface DocumentExportPlan {
  formatId: DocumentOutputFormatId;
  status: string;
  canStartExport: boolean;
  isVerifiedComplete: boolean;
  requiresNativeWriter: boolean;
  requiresDependency: boolean;
  requiresExternalConverter: boolean;
  diagnosticCode: DocumentDiagnosticCode;
  userMessage: string;
  completionState: "DOCUMENT_OUTPUT_NOT_VERIFIED" | "DOCUMENT_OUTPUT_VERIFIED";
  speakerRenameAppliedToOutput: boolean;
  cloudUploadDefault: false;
}

export interface OfficeConverterPlan {
  converterType: DocumentExternalConverterType;
  status:
    | "OFFICE_CONVERTER_NOT_CONFIGURED"
    | "OFFICE_CONVERTER_INVALID_PATH"
    | "OFFICE_CONVERTER_READY";
  canConvert: boolean;
  bundledByDefault: false;
  safeArgumentArraysRequired: true;
  userMessage: string;
}

export const DOCUMENT_EXPORT_FILENAME_TEMPLATES = {
  txt: "{safe_title}_{date}_{time}.txt",
  pdf: "{safe_title}_session_{session_number}_{date}_{duration_min}_min.pdf",
  docx: "{safe_title}_prompt_output_{date}_{time}.docx",
  json: "{safe_title}_transcript_archive_{date}.json",
} as const;

export const DOCUMENT_EXPORT_RULES = {
  exportSuccessRequiresExistingFile: true,
  exportSuccessRequiresNonzeroSize: true,
  exportSuccessRequiresExtensionMatch: true,
  exportSuccessRequiresSelectedFolder: true,
  preventOverwriteByDefault: true,
  noCloudConversionByDefault: true,
  transcriptTextLoggedByDefault: false,
  sourceFilesModified: false,
} as const;

export const DOCUMENT_EXTERNAL_CONVERTER_TYPES: DocumentExternalConverterType[] = [
  "soffice",
  "custom",
  "pandoc",
];

export const DOCUMENT_OFFICE_CONVERTER_DIAGNOSTIC_CODES = [
  "OFFICE_CONVERTER_NOT_CONFIGURED",
  "OFFICE_CONVERTER_INVALID_PATH",
  "OFFICE_CONVERTER_READY",
  "OFFICE_CONVERSION_RUNNING",
  "OFFICE_CONVERSION_FAILED",
  "OFFICE_OUTPUT_NOT_VERIFIED",
  "DOCUMENT_FORMAT_REQUIRES_CONVERTER",
] as const;

export function verifyDocumentExportOutput(input: DocumentExportVerificationInput): {
  ok: boolean;
  diagnosticCode: "DOCUMENT_OUTPUT_NOT_VERIFIED" | "DOCUMENT_OUTPUT_VERIFIED";
  message: string;
} {
  if (!input.outputPath || !input.exists) {
    return {
      ok: false,
      diagnosticCode: "DOCUMENT_OUTPUT_NOT_VERIFIED",
      message: "Output file was not found.",
    };
  }

  if ((input.sizeBytes ?? 0) <= 0) {
    return {
      ok: false,
      diagnosticCode: "DOCUMENT_OUTPUT_NOT_VERIFIED",
      message: "Output file is zero bytes or size was not checked.",
    };
  }

  if (input.extensionMatches !== true) {
    return {
      ok: false,
      diagnosticCode: "DOCUMENT_OUTPUT_NOT_VERIFIED",
      message: "Output extension does not match the selected format.",
    };
  }

  if (input.insideSelectedFolder !== true) {
    return {
      ok: false,
      diagnosticCode: "DOCUMENT_OUTPUT_NOT_VERIFIED",
      message: "Output path is not inside the selected export folder.",
    };
  }

  if (input.overwritePolicyAllows !== true) {
    return {
      ok: false,
      diagnosticCode: "DOCUMENT_OUTPUT_NOT_VERIFIED",
      message: "Overwrite policy did not allow this output.",
    };
  }

  return {
    ok: true,
    diagnosticCode: "DOCUMENT_OUTPUT_VERIFIED",
    message: "Output file exists, is nonzero, has the expected extension, and matches folder/overwrite policy.",
  };
}

export function buildDocumentExportPlan(input: DocumentExportPlanInput = {}): DocumentExportPlan {
  const formatId = input.formatId ?? "txt";
  const policy = getDocumentOutputPolicy(formatId);
  const verification = verifyDocumentExportOutput(input);
  const nativeWriterReady = input.nativeWriteVerified === true;
  const dependencyReady = !policy.requiresDependency || input.dependencyAvailable === true;
  const converterReady = !policy.requiresExternalConverter || input.converterReady === true;
  const timestampsReady = !policy.requiresTimestamps || input.timestampsAvailable === true;
  const canStartExport =
    nativeWriterReady &&
    dependencyReady &&
    converterReady &&
    timestampsReady &&
    policy.status !== "unsupported";

  let diagnosticCode = policy.diagnosticCode;
  if (!verification.ok) {
    diagnosticCode = "DOCUMENT_OUTPUT_NOT_VERIFIED";
  }

  return {
    formatId,
    status: policy.status,
    canStartExport,
    isVerifiedComplete: verification.ok,
    requiresNativeWriter: policy.requiresNativeWriter && !nativeWriterReady,
    requiresDependency: policy.requiresDependency && !dependencyReady,
    requiresExternalConverter: policy.requiresExternalConverter && !converterReady,
    diagnosticCode,
    userMessage: verification.ok ? verification.message : policy.userMessage,
    completionState: verification.diagnosticCode,
    speakerRenameAppliedToOutput: input.speakerRenameApplied === true && verification.ok,
    cloudUploadDefault: false,
  };
}

export function buildExternalOfficeConverterPlan(input: {
  converterType?: DocumentExternalConverterType;
  configuredPath?: string;
  pathValid?: boolean;
} = {}): OfficeConverterPlan {
  const converterType = input.converterType ?? "soffice";

  if (!input.configuredPath) {
    return {
      converterType,
      status: "OFFICE_CONVERTER_NOT_CONFIGURED",
      canConvert: false,
      bundledByDefault: false,
      safeArgumentArraysRequired: true,
      userMessage: "No office converter is configured. Choose a local executable before using converter-gated formats.",
    };
  }

  if (input.pathValid !== true) {
    return {
      converterType,
      status: "OFFICE_CONVERTER_INVALID_PATH",
      canConvert: false,
      bundledByDefault: false,
      safeArgumentArraysRequired: true,
      userMessage: "The configured office converter path was not validated.",
    };
  }

  return {
    converterType,
    status: "OFFICE_CONVERTER_READY",
    canConvert: true,
    bundledByDefault: false,
    safeArgumentArraysRequired: true,
    userMessage: "External converter path is validated. Conversion output still requires file verification.",
  };
}

export function applySpeakerRenameToDocumentText(text: string, speakerMap: Record<string, string>): string {
  return Object.entries(speakerMap).reduce((currentText, [originalLabel, displayName]) => {
    const safeOriginal = escapeRegExp(originalLabel.trim());
    const safeDisplay = displayName.trim();
    if (!safeOriginal || !safeDisplay) return currentText;
    return currentText.replace(new RegExp(`(^|\\n)${safeOriginal}:`, "g"), `$1${safeDisplay}:`);
  }, text);
}

export function documentExportDoesNotAffectReleaseGate(): string {
  return "Document export is not stem separation proof and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
