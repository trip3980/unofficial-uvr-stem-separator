import { ModelRegistryEntry, ModelSourceStatus } from "../types";
import { getDiagnosticCodeForSourceStatus } from "./diagnosticCodes";

const SHA256_RE = /^[a-f0-9]{64}$/i;
const PLACEHOLDER_URL_PARTS = ["example.com", "localhost", "placeholder", "fake", "dummy", "todo"];

export interface ModelSourceDiagnosticResult {
  url: string;
  statusCode?: number;
  sourceStatus: ModelSourceStatus;
  reachable: boolean;
  requiresAuth: boolean;
  downloadableWithoutAuth: boolean;
  checkedAt: string;
  diagnosticCode: string;
  error?: string;
}

export interface ImportedModelMetadata {
  id?: string;
  name: string;
  architecture: ModelRegistryEntry["architecture"];
  fileName: string;
  sourceUrl: string;
  sourceProject: string;
  license: string;
  expectedSha256: string;
  expectedSizeBytes?: number;
  requiredBackend?: ModelRegistryEntry["requiredBackend"];
  sourceType?: ModelRegistryEntry["sourceType"];
  verifiedStatus: "needs_verification";
}

export interface ImportedMetadataValidationResult {
  ok: boolean;
  metadata?: ImportedModelMetadata;
  errors: string[];
}

export interface ManualReconnectResult {
  status: "hash_verified" | "hash_mismatch" | "installed_hash_unavailable" | "needs_verification";
  proofEligible: boolean;
  hashMatches: boolean;
  sourceStatus: ModelSourceStatus;
  displayMessage: string;
}

export interface SourceResolutionWorkflow {
  title: "Resolve Source" | "Repair Source Metadata";
  sourceStatus: ModelSourceStatus | undefined;
  hfAuthentication: "Planned / Not active";
  candidateSearchTrust: "candidate_only_needs_hash_and_license";
  candidateSourcesAllowed: string[];
  manualMetadataImport: "strict_json_needs_verification";
  manualReconnect: "sha256_match_required";
  actions: string[];
}

export function isValidSha256(value?: string | null): boolean {
  return !!value && SHA256_RE.test(value.trim());
}

export function normalizeSha256(value?: string | null): string | null {
  if (!value) return null;
  const normalized = String(value).trim().replace(/^sha256[:_]/i, "").toLowerCase();
  return isValidSha256(normalized) ? normalized : null;
}

export function classifyNetworkError(error?: string): ModelSourceStatus {
  const normalized = String(error || "").toLowerCase();
  if (!normalized) return "source_unavailable";
  if (normalized.includes("timeout") || normalized.includes("aborterror") || normalized.includes("aborted")) {
    return "timeout";
  }
  if (
    normalized.includes("enotfound") ||
    normalized.includes("eai_again") ||
    normalized.includes("getaddrinfo") ||
    normalized.includes("dns")
  ) {
    return "dns_failed";
  }
  if (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("econnrefused") ||
    normalized.includes("econnreset") ||
    normalized.includes("socket")
  ) {
    return "network_unavailable";
  }
  return "source_unavailable";
}

export function classifySourceStatus(
  statusCode?: number,
  hasExpectedHash = true,
  error?: string,
  hashMismatch = false,
): ModelSourceStatus {
  if (hashMismatch) return "hash_mismatch";
  if (statusCode === 200 || statusCode === 206) return hasExpectedHash ? "reachable" : "missing_hash";
  if (statusCode === 401) return "auth_required";
  if (statusCode === 403) return "access_denied";
  if (statusCode === 404) return "broken_link";
  if (statusCode === 429) return "rate_limited";
  if (typeof statusCode === "number" && statusCode >= 500) return "source_unavailable";
  if (error || typeof statusCode !== "number") return classifyNetworkError(error);
  return "source_unavailable";
}

export function buildSourceDiagnosticResult(input: {
  url: string;
  statusCode?: number;
  error?: string;
  hasExpectedHash?: boolean;
  hashMismatch?: boolean;
  checkedAt?: string;
}): ModelSourceDiagnosticResult {
  const sourceStatus = classifySourceStatus(
    input.statusCode,
    input.hasExpectedHash !== false,
    input.error,
    input.hashMismatch === true,
  );
  const reachable = input.statusCode === 200 || input.statusCode === 206 || sourceStatus === "missing_hash";
  const requiresAuth = sourceStatus === "auth_required" || sourceStatus === "access_denied" || sourceStatus === "gated_or_private";

  return {
    url: input.url,
    statusCode: input.statusCode,
    sourceStatus,
    reachable,
    requiresAuth,
    downloadableWithoutAuth: reachable && sourceStatus === "reachable",
    checkedAt: input.checkedAt || new Date().toISOString(),
    diagnosticCode: getDiagnosticCodeForSourceStatus(sourceStatus),
    error: input.error,
  };
}

function readTextField(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isPlaceholderUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return PLACEHOLDER_URL_PARTS.some((part) => lower.includes(part));
}

function isUsableLicense(license: string): boolean {
  const normalized = license.trim().toLowerCase();
  return !!normalized && normalized !== "unknown" && normalized !== "needs verification" && normalized !== "user-supplied / not verified";
}

function isSupportedArchitecture(value: string): value is ModelRegistryEntry["architecture"] {
  return ["VR", "MDX-Net", "Demucs", "RoFormer", "MDXC", "Ensemble", "Custom"].includes(value);
}

function isSupportedBackend(value: string): value is NonNullable<ModelRegistryEntry["requiredBackend"]> {
  return ["python-pytorch", "onnxruntime", "audio-separator", "cpu-dsp"].includes(value);
}

function isSupportedSourceType(value: string): value is NonNullable<ModelRegistryEntry["sourceType"]> {
  return ["hugging_face_repo", "hugging_face_space", "github_release", "github_raw", "manual_import", "unknown"].includes(value);
}

export function validateImportedModelMetadata(input: unknown): ImportedMetadataValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Metadata JSON must be an object."] };
  }

  const source = input as Record<string, unknown>;
  const name = readTextField(source, ["name", "model_name", "modelName"]);
  const fileName = readTextField(source, ["fileName", "filename", "file_name"]) || name;
  const architectureRaw = readTextField(source, ["architecture"]);
  const sourceUrl = readTextField(source, ["sourceUrl", "source_url", "downloadUrl", "download_url"]);
  const sourceProject = readTextField(source, ["sourceProject", "source_project", "project"]);
  const license = readTextField(source, ["license"]);
  const expectedSha256Raw = readTextField(source, ["expectedSha256", "expected_sha256", "sha256", "checksum"]);
  const expectedSha256 = normalizeSha256(expectedSha256Raw);
  const requiredBackendRaw = readTextField(source, ["requiredBackend", "required_backend"]);
  const sourceTypeRaw = readTextField(source, ["sourceType", "source_type"]);
  const expectedSizeRaw = source.expectedSizeBytes ?? source.expected_size_bytes ?? source.sizeBytes;

  if (!name) errors.push("Metadata must include name or model_name.");
  if (!fileName) errors.push("Metadata must include filename or fileName.");
  if (!architectureRaw || !isSupportedArchitecture(architectureRaw)) {
    errors.push("Metadata must include a supported architecture.");
  }
  if (!sourceUrl) {
    errors.push("Metadata must include sourceUrl or downloadUrl.");
  } else {
    try {
      const parsed = new URL(sourceUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) errors.push("Metadata source URL must use http or https.");
      if (isPlaceholderUrl(sourceUrl)) errors.push("Metadata source URL must not be a placeholder URL.");
    } catch {
      errors.push("Metadata source URL is malformed.");
    }
  }
  if (!sourceProject) errors.push("Metadata must include sourceProject or source_project.");
  if (!isUsableLicense(license)) errors.push("Metadata must include a usable license.");
  if (!expectedSha256Raw) {
    errors.push("Metadata must include expected_sha256, expectedSha256, sha256, or checksum.");
  } else if (!expectedSha256) {
    errors.push("Metadata expected SHA-256 must be exactly 64 hexadecimal characters.");
  }
  if (requiredBackendRaw && !isSupportedBackend(requiredBackendRaw)) {
    errors.push("Metadata requiredBackend is unsupported.");
  }
  if (sourceTypeRaw && !isSupportedSourceType(sourceTypeRaw)) {
    errors.push("Metadata sourceType is unsupported.");
  }

  let expectedSizeBytes: number | undefined;
  if (expectedSizeRaw !== undefined && expectedSizeRaw !== null && expectedSizeRaw !== "") {
    const parsedSize = Number(expectedSizeRaw);
    if (!Number.isFinite(parsedSize) || parsedSize <= 0) {
      errors.push("Metadata expected size must be a positive number when provided.");
    } else {
      expectedSizeBytes = parsedSize;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    metadata: {
      id: readTextField(source, ["id"]) || undefined,
      name,
      architecture: architectureRaw as ModelRegistryEntry["architecture"],
      fileName,
      sourceUrl,
      sourceProject,
      license,
      expectedSha256: expectedSha256 as string,
      expectedSizeBytes,
      requiredBackend: requiredBackendRaw ? (requiredBackendRaw as ModelRegistryEntry["requiredBackend"]) : undefined,
      sourceType: sourceTypeRaw ? (sourceTypeRaw as ModelRegistryEntry["sourceType"]) : undefined,
      verifiedStatus: "needs_verification",
    },
  };
}

export function evaluateManualReconnect(input: {
  expectedSha256?: string | null;
  actualSha256?: string | null;
}): ManualReconnectResult {
  const expectedSha256 = normalizeSha256(input.expectedSha256 || null);
  const actualSha256 = normalizeSha256(input.actualSha256 || null);

  if (!expectedSha256) {
    return {
      status: "installed_hash_unavailable",
      proofEligible: false,
      hashMatches: false,
      sourceStatus: "missing_hash",
      displayMessage: "Imported / Hash unavailable. Add expected SHA-256 metadata before this local file can be proof-eligible.",
    };
  }

  if (!actualSha256) {
    return {
      status: "needs_verification",
      proofEligible: false,
      hashMatches: false,
      sourceStatus: "needs_verification",
      displayMessage: "Manual reconnect still needs a computed local SHA-256 before proof eligibility can be evaluated.",
    };
  }

  if (actualSha256 !== expectedSha256) {
    return {
      status: "hash_mismatch",
      proofEligible: false,
      hashMatches: false,
      sourceStatus: "hash_mismatch",
      displayMessage: "Selected local file SHA-256 does not match expected metadata. This file is blocked.",
    };
  }

  return {
    status: "hash_verified",
    proofEligible: true,
    hashMatches: true,
    sourceStatus: "verified",
    displayMessage: "Local SHA-256 matches expected metadata. This model can proceed to the remaining proof gates.",
  };
}

export function buildSourceResolutionWorkflow(model: Pick<ModelRegistryEntry, "downloadUrl" | "sourceUrl" | "sourceType" | "verifiedStatus">): SourceResolutionWorkflow {
  const url = model.downloadUrl || model.sourceUrl || "";
  const actions: string[] = [];
  const candidateSourcesAllowed = ["current configured URL", "local model library", "user-selected local file", "user-selected folder", "user metadata JSON"];

  if (url) actions.push("Retry source diagnostics without downloading model weights");
  if (url.includes("huggingface.co")) {
    candidateSourcesAllowed.push("same public or authorized Hugging Face repo file tree", "Hugging Face API if accessible");
    actions.push("Inspect same Hugging Face repo only when public or user-authorized");
  }
  if (model.sourceType === "github_release" || url.includes("github.com")) {
    candidateSourcesAllowed.push("configured GitHub releases");
    actions.push("Inspect configured GitHub release assets only");
  }

  actions.push("Import strict metadata JSON");
  actions.push("Reconnect one local file and compare SHA-256");
  actions.push("Search selected folder for expected filename candidates");
  actions.push("Search configured model library folders for expected filename candidates");
  actions.push("Keep all candidate sources unverified until expected SHA-256, license, and local hash match");

  return {
    title: url ? "Resolve Source" : "Repair Source Metadata",
    sourceStatus: model.verifiedStatus,
    hfAuthentication: "Planned / Not active",
    candidateSearchTrust: "candidate_only_needs_hash_and_license",
    candidateSourcesAllowed,
    manualMetadataImport: "strict_json_needs_verification",
    manualReconnect: "sha256_match_required",
    actions,
  };
}
