export type DocumentFormatStatus =
  | "supported"
  | "planned"
  | "requires external converter"
  | "requires dependency"
  | "unsupported"
  | "experimental";

export type DocumentInputFormatId =
  | "txt"
  | "vtt"
  | "srt"
  | "json_transcript"
  | "pdf"
  | "docx"
  | "odt"
  | "rtf"
  | "html"
  | "md";

export type DocumentOutputFormatId =
  | "txt"
  | "pdf"
  | "docx"
  | "odt"
  | "rtf"
  | "html"
  | "json"
  | "srt"
  | "vtt";

export type DocumentDiagnosticCode =
  | "DOCUMENT_IMPORT_SUPPORTED"
  | "DOCUMENT_IMPORT_PLANNED"
  | "DOCUMENT_IMPORT_REQUIRES_DEPENDENCY"
  | "DOCUMENT_IMPORT_REQUIRES_CONVERTER"
  | "DOCUMENT_IMPORT_SCHEMA_INVALID"
  | "DOCUMENT_IMPORT_SANITIZATION_REQUIRED"
  | "DOCUMENT_EXPORT_PLANNED"
  | "DOCUMENT_EXPORT_REQUIRES_DEPENDENCY"
  | "DOCUMENT_EXPORT_REQUIRES_CONVERTER"
  | "DOCUMENT_OUTPUT_NOT_VERIFIED"
  | "DOCUMENT_OUTPUT_VERIFIED"
  | "DOCUMENT_FORMAT_UNSUPPORTED";

export interface DocumentFormatPolicyBase {
  id: string;
  label: string;
  extension: string;
  status: DocumentFormatStatus;
  userMessage: string;
  diagnosticCode: DocumentDiagnosticCode;
  localOnly: true;
  cloudUploadDefault: false;
  proofBoundary: string;
}

export interface DocumentImportFormatPolicy extends DocumentFormatPolicyBase {
  id: DocumentInputFormatId;
  parserState: string;
  requiresNativePath: boolean;
  requiresDependency: boolean;
  requiresExternalConverter: boolean;
  requiresSanitization: boolean;
}

export interface DocumentOutputFormatPolicy extends DocumentFormatPolicyBase {
  id: DocumentOutputFormatId;
  writerState: string;
  requiresNativeWriter: boolean;
  requiresDependency: boolean;
  requiresExternalConverter: boolean;
  requiresTimestamps: boolean;
}

export const DOCUMENT_FORMAT_DIAGNOSTIC_CODES: DocumentDiagnosticCode[] = [
  "DOCUMENT_IMPORT_SUPPORTED",
  "DOCUMENT_IMPORT_PLANNED",
  "DOCUMENT_IMPORT_REQUIRES_DEPENDENCY",
  "DOCUMENT_IMPORT_REQUIRES_CONVERTER",
  "DOCUMENT_IMPORT_SCHEMA_INVALID",
  "DOCUMENT_IMPORT_SANITIZATION_REQUIRED",
  "DOCUMENT_EXPORT_PLANNED",
  "DOCUMENT_EXPORT_REQUIRES_DEPENDENCY",
  "DOCUMENT_EXPORT_REQUIRES_CONVERTER",
  "DOCUMENT_OUTPUT_NOT_VERIFIED",
  "DOCUMENT_OUTPUT_VERIFIED",
  "DOCUMENT_FORMAT_UNSUPPORTED",
];

const DOCUMENT_PROOF_BOUNDARY =
  "Document import/export is not stem separation proof and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.";

export const DOCUMENT_IMPORT_FORMAT_POLICIES: DocumentImportFormatPolicy[] = [
  {
    id: "txt",
    label: "TXT",
    extension: ".txt",
    status: "supported",
    parserState: "Plain text parser available after native file verification.",
    requiresNativePath: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresSanitization: false,
    userMessage: "TXT import is the first local document import lane.",
    diagnosticCode: "DOCUMENT_IMPORT_SUPPORTED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "vtt",
    label: "VTT",
    extension: ".vtt",
    status: "supported",
    parserState: "Local WEBVTT parser exists in vttTranscriptImport.",
    requiresNativePath: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresSanitization: false,
    userMessage: "VTT import can parse transcript cues locally after file verification.",
    diagnosticCode: "DOCUMENT_IMPORT_SUPPORTED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "srt",
    label: "SRT",
    extension: ".srt",
    status: "planned",
    parserState: "SRT parser is not implemented yet.",
    requiresNativePath: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresSanitization: false,
    userMessage: "SRT import remains planned until a parser exists.",
    diagnosticCode: "DOCUMENT_IMPORT_PLANNED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "json_transcript",
    label: "JSON transcript",
    extension: ".json",
    status: "supported",
    parserState: "Schema validation is required before import.",
    requiresNativePath: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresSanitization: false,
    userMessage: "JSON transcript import is supported only when the schema validates.",
    diagnosticCode: "DOCUMENT_IMPORT_SUPPORTED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "pdf",
    label: "PDF",
    extension: ".pdf",
    status: "requires dependency",
    parserState: "No local PDF text parser is bundled.",
    requiresNativePath: true,
    requiresDependency: true,
    requiresExternalConverter: false,
    requiresSanitization: false,
    userMessage: "PDF import is planned until a local parser dependency is chosen and verified.",
    diagnosticCode: "DOCUMENT_IMPORT_REQUIRES_DEPENDENCY",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "docx",
    label: "DOCX",
    extension: ".docx",
    status: "requires dependency",
    parserState: "No DOCX parser is bundled.",
    requiresNativePath: true,
    requiresDependency: true,
    requiresExternalConverter: false,
    requiresSanitization: false,
    userMessage: "DOCX import is planned until a local parser dependency is chosen and verified.",
    diagnosticCode: "DOCUMENT_IMPORT_REQUIRES_DEPENDENCY",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "odt",
    label: "ODT",
    extension: ".odt",
    status: "requires external converter",
    parserState: "ODT import is converter-gated.",
    requiresNativePath: true,
    requiresDependency: false,
    requiresExternalConverter: true,
    requiresSanitization: false,
    userMessage: "ODT requires a validated local office converter or a future ODT parser.",
    diagnosticCode: "DOCUMENT_IMPORT_REQUIRES_CONVERTER",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "rtf",
    label: "RTF",
    extension: ".rtf",
    status: "planned",
    parserState: "RTF parser is not implemented yet.",
    requiresNativePath: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresSanitization: false,
    userMessage: "RTF import remains planned until local parsing is implemented.",
    diagnosticCode: "DOCUMENT_IMPORT_PLANNED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "html",
    label: "HTML",
    extension: ".html",
    status: "experimental",
    parserState: "HTML requires sanitization before review or prompt handoff.",
    requiresNativePath: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresSanitization: true,
    userMessage: "HTML import must sanitize markup locally before extracted text is used.",
    diagnosticCode: "DOCUMENT_IMPORT_SANITIZATION_REQUIRED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "md",
    label: "MD",
    extension: ".md",
    status: "supported",
    parserState: "Markdown is treated as plain text with local sanitization rules.",
    requiresNativePath: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresSanitization: true,
    userMessage: "Markdown import is local plain-text import, not rich document conversion.",
    diagnosticCode: "DOCUMENT_IMPORT_SUPPORTED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
];

export const DOCUMENT_OUTPUT_FORMAT_POLICIES: DocumentOutputFormatPolicy[] = [
  {
    id: "txt",
    label: "TXT",
    extension: ".txt",
    status: "planned",
    writerState: "First native writer target; not complete until a real file is verified.",
    requiresNativeWriter: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresTimestamps: false,
    userMessage: "TXT export is the safest first output lane after native writing is wired.",
    diagnosticCode: "DOCUMENT_EXPORT_PLANNED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "pdf",
    label: "PDF",
    extension: ".pdf",
    status: "requires dependency",
    writerState: "No local PDF writer dependency is bundled.",
    requiresNativeWriter: true,
    requiresDependency: true,
    requiresExternalConverter: false,
    requiresTimestamps: false,
    userMessage: "PDF export requires a local generator and output verification.",
    diagnosticCode: "DOCUMENT_EXPORT_REQUIRES_DEPENDENCY",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "docx",
    label: "DOCX",
    extension: ".docx",
    status: "requires dependency",
    writerState: "No DOCX writer dependency is bundled.",
    requiresNativeWriter: true,
    requiresDependency: true,
    requiresExternalConverter: false,
    requiresTimestamps: false,
    userMessage: "DOCX export requires a stable local writer and output verification.",
    diagnosticCode: "DOCUMENT_EXPORT_REQUIRES_DEPENDENCY",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "odt",
    label: "ODT",
    extension: ".odt",
    status: "requires external converter",
    writerState: "ODT export is converter-gated.",
    requiresNativeWriter: true,
    requiresDependency: false,
    requiresExternalConverter: true,
    requiresTimestamps: false,
    userMessage: "ODT export requires a validated local office converter or future ODT writer.",
    diagnosticCode: "DOCUMENT_EXPORT_REQUIRES_CONVERTER",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "rtf",
    label: "RTF",
    extension: ".rtf",
    status: "planned",
    writerState: "Simple RTF writer is not implemented yet.",
    requiresNativeWriter: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresTimestamps: false,
    userMessage: "RTF export remains planned until a local writer exists.",
    diagnosticCode: "DOCUMENT_EXPORT_PLANNED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "html",
    label: "HTML",
    extension: ".html",
    status: "planned",
    writerState: "HTML writer must escape or sanitize content before output.",
    requiresNativeWriter: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresTimestamps: false,
    userMessage: "HTML export requires safe escaped output and output verification.",
    diagnosticCode: "DOCUMENT_EXPORT_PLANNED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "json",
    label: "JSON",
    extension: ".json",
    status: "planned",
    writerState: "Metadata archive writer target; not complete until native output is verified.",
    requiresNativeWriter: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresTimestamps: false,
    userMessage: "JSON export should include metadata, transcript, prompt outputs, and verification results.",
    diagnosticCode: "DOCUMENT_EXPORT_PLANNED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "srt",
    label: "SRT",
    extension: ".srt",
    status: "planned",
    writerState: "SRT requires timestamped segments and a converter.",
    requiresNativeWriter: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresTimestamps: true,
    userMessage: "SRT export remains planned until timestamp conversion is implemented.",
    diagnosticCode: "DOCUMENT_EXPORT_PLANNED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
  {
    id: "vtt",
    label: "VTT",
    extension: ".vtt",
    status: "planned",
    writerState: "Renamed VTT content can be generated, but native write verification is still required.",
    requiresNativeWriter: true,
    requiresDependency: false,
    requiresExternalConverter: false,
    requiresTimestamps: true,
    userMessage: "VTT export requires timestamped segments and a verified native output file.",
    diagnosticCode: "DOCUMENT_EXPORT_PLANNED",
    localOnly: true,
    cloudUploadDefault: false,
    proofBoundary: DOCUMENT_PROOF_BOUNDARY,
  },
];

export const DOCUMENT_FORMAT_REFERENCE_STRATEGY = {
  referenceOnly: ["Apache OpenOffice"],
  optionalExternalConverters: ["LibreOffice/OpenOffice soffice", "Pandoc"],
  smallestFirstLane: ["TXT", "JSON", "VTT", "PDF after dependency review", "DOCX after dependency review"],
  notBundledByDefault: ["Apache OpenOffice", "LibreOffice", "Pandoc", "unoconv"],
  summary:
    "Study office-suite compatibility expectations, but keep OpenStem's default document pipeline local, small, and output-verified.",
} as const;

export const DOCUMENT_FORMAT_DEPENDENCY_RECOMMENDATIONS = [
  {
    name: "pdf-lib or PDFKit",
    decision: "optional later",
    reason: "Local PDF generation without a full office suite, after output verification is wired.",
  },
  {
    name: "docx.js",
    decision: "optional later",
    reason: "Local DOCX generation in TypeScript after filename, folder, and native writer verification are stable.",
  },
  {
    name: "mammoth.js",
    decision: "optional later",
    reason: "DOCX-to-HTML/text import candidate; requires security and formatting-loss review.",
  },
  {
    name: "LibreOffice/OpenOffice soffice",
    decision: "external user-configured only",
    reason: "Useful conversion fallback, but too large and release-sensitive to bundle by default.",
  },
  {
    name: "Apache OpenOffice",
    decision: "reference only",
    reason: "Useful for ODF concepts and compatibility expectations; too large to embed casually.",
  },
  {
    name: "Apache POI",
    decision: "rejected for default Electron runtime",
    reason: "Java dependency is heavy for this TypeScript/Electron app.",
  },
  {
    name: "unoconv",
    decision: "rejected for default runtime",
    reason: "Depends on LibreOffice/OpenOffice UNO bindings and is not the smallest stable default.",
  },
  {
    name: "textract",
    decision: "rejected for default runtime",
    reason: "Relies on multiple external executables and would make support ambiguous.",
  },
] as const;

export function getDocumentInputPolicy(formatId: DocumentInputFormatId): DocumentImportFormatPolicy {
  return (
    DOCUMENT_IMPORT_FORMAT_POLICIES.find((policy) => policy.id === formatId) ??
    DOCUMENT_IMPORT_FORMAT_POLICIES[0]
  );
}

export function getDocumentOutputPolicy(formatId: DocumentOutputFormatId): DocumentOutputFormatPolicy {
  return (
    DOCUMENT_OUTPUT_FORMAT_POLICIES.find((policy) => policy.id === formatId) ??
    DOCUMENT_OUTPUT_FORMAT_POLICIES[0]
  );
}

export function documentFormatsDoNotAffectReleaseGate(): string {
  return DOCUMENT_PROOF_BOUNDARY;
}
