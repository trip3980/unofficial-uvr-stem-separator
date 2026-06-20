import { ModelProofEligibility, ModelRegistryEntry, ModelSourceStatus } from "../types";
import { getModelProofEligibility } from "./modelProofEligibility";
import { getModelCatalogLane, getRecommendedModelAction } from "./modelLibrary";
import { isValidSha256, normalizeSha256 } from "./modelSourceDiagnostics";

export type OpenStemManifestStatus =
  | "available_in_curated_catalog"
  | "source_reachable"
  | "auth_required"
  | "access_denied"
  | "gated_or_private"
  | "broken_link"
  | "source_unavailable"
  | "download_available"
  | "needs_verification"
  | "custom_model_not_verified"
  | "proof_eligible"
  | "not_proof_eligible";

export type OpenStemLocalModelStatus =
  | "not_installed"
  | "downloading"
  | "partial_download"
  | "download_complete_verification_pending"
  | "installed_hash_unavailable"
  | "installed_not_checked"
  | "hash_verified"
  | "hash_mismatch"
  | "manual_import_required"
  | "custom_unverified"
  | "custom_hash_unavailable"
  | "missing";

export interface OpenStemModelCompatibility {
  cpu: boolean;
  cuda: boolean | "not_proven";
  directml: boolean | "not_proven";
  mps: boolean | "not_proven";
}

export interface OpenStemManifestModelCard {
  id: string;
  display_name: string;
  model_family: string;
  architecture: ModelRegistryEntry["architecture"];
  backend?: ModelRegistryEntry["requiredBackend"];
  source_project?: string;
  source_url?: string;
  source_status: ModelSourceStatus;
  repo_id?: string;
  filename: string;
  expected_sha256?: string;
  expected_size_bytes?: number;
  license?: string;
  tags: string[];
  recommended_use: string;
  compatibility: OpenStemModelCompatibility;
  status: OpenStemManifestStatus;
}

export interface OpenStemModelManifest {
  manifest_version: "1.0";
  generated_at: string;
  models: OpenStemManifestModelCard[];
}

export interface OpenStemLocalModelIndexEntry {
  modelId: string;
  localPath?: string;
  actualSha256?: string;
  expectedSha256?: string;
  fileSizeBytes?: number;
  verificationStatus: OpenStemLocalModelStatus;
  verifiedAt?: string;
  sourceManifestVersion?: string;
  sourceMetadataVersion?: string;
  proofEligible: boolean;
  lastSourceCheck?: {
    sourceStatus: ModelSourceStatus;
    checkedAt: string;
    diagnosticCode?: string;
  };
  repairHistory?: Array<{
    action: "download" | "verify" | "reconnect" | "folder_search" | "metadata_import" | "mark_unavailable";
    status: OpenStemLocalModelStatus;
    at: string;
    message?: string;
  }>;
  userNotes?: string;
}

export interface OpenStemLocalModelIndex {
  schemaVersion: 1;
  indexName: "openstem-models.local.json";
  updatedAt: string;
  modelLibraryPath?: string;
  entries: OpenStemLocalModelIndexEntry[];
}

export interface ModelManifestValidationResult {
  ok: boolean;
  errors: string[];
  manifest?: OpenStemModelManifest;
}

export interface LocalModelIndexValidationResult {
  ok: boolean;
  errors: string[];
  index?: OpenStemLocalModelIndex;
}

export interface ModelLibraryDisplayState {
  manifestStatus: OpenStemManifestStatus;
  sourceStatus: ModelSourceStatus | undefined;
  localStatus: OpenStemLocalModelStatus;
  proofEligibility: ModelProofEligibility;
  proofStatus: "proof_eligible" | "not_proof_eligible";
  recommendedAction: string;
}

const PLACEHOLDER_URL_PARTS = ["example.com", "localhost", "placeholder", "fake", "dummy", "todo"];
const MANIFEST_SOURCE_STATUSES = new Set<ModelSourceStatus>([
  "verified",
  "configured_not_checked",
  "download_available",
  "reachable",
  "needs_verification",
  "auth_required",
  "gated_or_private",
  "access_denied",
  "broken_link",
  "rate_limited",
  "source_unavailable",
  "network_unavailable",
  "dns_failed",
  "timeout",
  "unavailable",
  "missing_hash",
  "manual_import_required",
  "experimental",
]);

const LOCAL_INDEX_STATUSES = new Set<OpenStemLocalModelStatus>([
  "not_installed",
  "downloading",
  "partial_download",
  "download_complete_verification_pending",
  "installed_hash_unavailable",
  "installed_not_checked",
  "hash_verified",
  "hash_mismatch",
  "manual_import_required",
  "custom_unverified",
  "custom_hash_unavailable",
  "missing",
]);

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function hasPlaceholderUrl(value?: string): boolean {
  const lower = String(value || "").toLowerCase();
  return PLACEHOLDER_URL_PARTS.some((part) => lower.includes(part));
}

function hasUsableLicense(value?: string): boolean {
  const lower = String(value || "").trim().toLowerCase();
  return !!lower && lower !== "unknown" && lower !== "needs verification" && lower !== "user-supplied / not verified";
}

function isLikelyPlaceholderSha(value?: string): boolean {
  const normalized = normalizeSha256(value || null);
  if (!normalized) return false;
  if (/^([a-f0-9])\1{63}$/i.test(normalized)) return true;
  return normalized === "deadbeef".repeat(8);
}

function normalizePathText(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

function isPathInsideText(parent: string, child: string): boolean {
  const normalizedParent = normalizePathText(parent);
  const normalizedChild = normalizePathText(child);
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}/`);
}

function getSourceProject(model: Partial<ModelRegistryEntry>): string | undefined {
  const source = model.downloadUrl || model.sourceUrl || "";
  if (!source) return undefined;
  try {
    const url = new URL(source);
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.hostname.includes("huggingface.co")) return parts[0] && parts[1] ? `${parts[0]}/${parts[1]}` : "Hugging Face";
    if (url.hostname.includes("github.com")) return parts[0] && parts[1] ? `${parts[0]}/${parts[1]}` : "GitHub";
    return url.hostname;
  } catch {
    return undefined;
  }
}

function mapSourceStatusToManifestStatus(sourceStatus?: ModelSourceStatus): OpenStemManifestStatus {
  if (sourceStatus === "verified" || sourceStatus === "download_available" || sourceStatus === "reachable") {
    return "download_available";
  }
  if (sourceStatus === "auth_required") return "auth_required";
  if (sourceStatus === "access_denied") return "access_denied";
  if (sourceStatus === "gated_or_private") return "gated_or_private";
  if (sourceStatus === "broken_link") return "broken_link";
  if (
    sourceStatus === "source_unavailable" ||
    sourceStatus === "network_unavailable" ||
    sourceStatus === "dns_failed" ||
    sourceStatus === "timeout" ||
    sourceStatus === "unavailable" ||
    sourceStatus === "rate_limited"
  ) {
    return "source_unavailable";
  }
  if (sourceStatus === "custom_unverified" || sourceStatus === "custom_hash_unavailable") {
    return "custom_model_not_verified";
  }
  return "available_in_curated_catalog";
}

export function registryEntryToManifestModel(model: ModelRegistryEntry): OpenStemManifestModelCard {
  const sourceUrl = model.downloadUrl || model.sourceUrl;
  const proofEligibility = getModelProofEligibility(model, {
    exists: model.downloaded,
    status: model.verifiedStatus,
    hashChecked: !!model.actualSha256 && !!model.checksum,
    hashMatches: !!model.actualSha256 && !!model.checksum && model.actualSha256.toLowerCase() === model.checksum.toLowerCase(),
  });
  return {
    id: model.id,
    display_name: model.name,
    model_family: model.architecture,
    architecture: model.architecture,
    backend: model.requiredBackend,
    source_project: getSourceProject(model),
    source_url: sourceUrl,
    source_status: model.verifiedStatus || (sourceUrl ? "configured_not_checked" : "manual_import_required"),
    repo_id: getSourceProject(model),
    filename: model.name,
    expected_sha256: model.checksum,
    expected_size_bytes: model.expectedSizeBytes,
    license: model.license,
    tags: [getModelCatalogLane(model), model.architecture, model.stemType].filter(Boolean),
    recommended_use: model.description,
    compatibility: {
      cpu: true,
      cuda: model.gpuSupport ? "not_proven" : false,
      directml: "not_proven",
      mps: "not_proven",
    },
    status: proofEligibility.proofEligible ? "proof_eligible" : mapSourceStatusToManifestStatus(model.verifiedStatus),
  };
}

export function buildOpenStemModelManifest(models: ModelRegistryEntry[], generatedAt = new Date().toISOString()): OpenStemModelManifest {
  return {
    manifest_version: "1.0",
    generated_at: generatedAt,
    models: models.map(registryEntryToManifestModel),
  };
}

export function validateOpenStemModelManifest(input: unknown): ModelManifestValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Manifest must be an object."] };
  }

  const manifest = input as Record<string, unknown>;
  if (manifest.manifest_version !== "1.0") errors.push("Manifest version must be 1.0.");
  if (typeof manifest.generated_at !== "string" || !manifest.generated_at.trim()) {
    errors.push("Manifest must include generated_at.");
  }
  if (!Array.isArray(manifest.models)) errors.push("Manifest must include a models array.");

  const models = Array.isArray(manifest.models) ? manifest.models : [];
  models.forEach((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push(`Manifest model ${index} must be an object.`);
      return;
    }
    const model = raw as Record<string, unknown>;
    const id = readString(model, "id");
    const filename = readString(model, "filename");
    const sourceUrl = readString(model, "source_url");
    const sourceStatus = readString(model, "source_status") as ModelSourceStatus | undefined;
    const expectedSha = readString(model, "expected_sha256");
    const license = readString(model, "license");
    const status = readString(model, "status") as OpenStemManifestStatus | undefined;

    if (!id) errors.push(`Manifest model ${index} is missing id.`);
    if (!readString(model, "display_name")) errors.push(`Manifest model ${id || index} is missing display_name.`);
    if (!filename) errors.push(`Manifest model ${id || index} is missing filename.`);
    if (filename && filename.includes("/") || filename && filename.includes("\\")) {
      errors.push(`Manifest model ${id || index} filename must not include path segments.`);
    }
    if (sourceUrl) {
      try {
        const parsed = new URL(sourceUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          errors.push(`Manifest model ${id || index} source_url must use http or https.`);
        }
      } catch {
        errors.push(`Manifest model ${id || index} source_url is malformed.`);
      }
      if (hasPlaceholderUrl(sourceUrl)) errors.push(`Manifest model ${id || index} source_url must not be a placeholder.`);
      if (!sourceStatus || !MANIFEST_SOURCE_STATUSES.has(sourceStatus)) {
        errors.push(`Manifest model ${id || index} source_url requires a valid source_status.`);
      }
    }
    if (expectedSha && (!isValidSha256(expectedSha) || isLikelyPlaceholderSha(expectedSha))) {
      errors.push(`Manifest model ${id || index} expected_sha256 is malformed or placeholder-like.`);
    }
    if ((sourceStatus === "verified" || status === "proof_eligible" || status === "download_available") && !hasUsableLicense(license)) {
      errors.push(`Manifest model ${id || index} requires usable license metadata before verified/downloadable status.`);
    }
    if (status === "proof_eligible") {
      errors.push(`Manifest model ${id || index} cannot be proof_eligible from manifest metadata alone.`);
    }
    if (typeof model.expected_size_bytes === "number" && (!Number.isFinite(model.expected_size_bytes) || model.expected_size_bytes <= 0)) {
      errors.push(`Manifest model ${id || index} expected_size_bytes must be positive when provided.`);
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], manifest: input as OpenStemModelManifest };
}

export function createEmptyLocalModelIndex(modelLibraryPath?: string, updatedAt = new Date().toISOString()): OpenStemLocalModelIndex {
  return {
    schemaVersion: 1,
    indexName: "openstem-models.local.json",
    updatedAt,
    modelLibraryPath,
    entries: [],
  };
}

export function validateLocalModelIndexDocument(input: unknown): LocalModelIndexValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Local model index must be an object."] };
  }
  const index = input as Record<string, unknown>;
  if (index.schemaVersion !== 1) errors.push("Local model index schemaVersion must be 1.");
  if (index.indexName !== "openstem-models.local.json") errors.push("Local model indexName must be openstem-models.local.json.");
  if (!Array.isArray(index.entries)) errors.push("Local model index entries must be an array.");

  const entries = Array.isArray(index.entries) ? index.entries : [];
  entries.forEach((raw, entryIndex) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push(`Local index entry ${entryIndex} must be an object.`);
      return;
    }
    const entry = raw as Record<string, unknown>;
    const modelId = readString(entry, "modelId");
    const actualSha = readString(entry, "actualSha256");
    const expectedSha = readString(entry, "expectedSha256");
    const verificationStatus = readString(entry, "verificationStatus") as OpenStemLocalModelStatus | undefined;
    const proofEligible = entry.proofEligible === true;

    if (!modelId) errors.push(`Local index entry ${entryIndex} is missing modelId.`);
    if (!verificationStatus || !LOCAL_INDEX_STATUSES.has(verificationStatus)) {
      errors.push(`Local index entry ${modelId || entryIndex} has unsupported verificationStatus.`);
    }
    if (actualSha && !isValidSha256(actualSha)) errors.push(`Local index entry ${modelId || entryIndex} actualSha256 is malformed.`);
    if (expectedSha && !isValidSha256(expectedSha)) errors.push(`Local index entry ${modelId || entryIndex} expectedSha256 is malformed.`);
    if (typeof entry.fileSizeBytes === "number" && (!Number.isFinite(entry.fileSizeBytes) || entry.fileSizeBytes < 0)) {
      errors.push(`Local index entry ${modelId || entryIndex} fileSizeBytes must be non-negative.`);
    }
    if (proofEligible && (verificationStatus !== "hash_verified" || !actualSha || !expectedSha || actualSha.toLowerCase() !== expectedSha.toLowerCase())) {
      errors.push(`Local index entry ${modelId || entryIndex} cannot be proofEligible without exact SHA-256 match.`);
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], index: input as OpenStemLocalModelIndex };
}

export function validateLocalModelIndexLocation(input: {
  indexPath: string;
  sourceRepoPath: string;
  modelLibraryPath?: string;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.indexPath || !input.sourceRepoPath) {
    return { ok: false, errors: ["Index path and source repo path are required."] };
  }
  if (isPathInsideText(input.sourceRepoPath, input.indexPath)) {
    errors.push("openstem-models.local.json must live in app data or a configured model library folder, not the source repo.");
  }
  if (input.modelLibraryPath && input.indexPath && !isPathInsideText(input.modelLibraryPath, input.indexPath)) {
    const indexName = normalizePathText(input.indexPath).split("/").pop();
    if (indexName !== "openstem-models.local.json") {
      errors.push("Local model index path must resolve to openstem-models.local.json.");
    }
  }
  return { ok: errors.length === 0, errors };
}

export function isInstalledLocalModelStatus(status: OpenStemLocalModelStatus): boolean {
  return !["not_installed", "downloading", "partial_download", "download_complete_verification_pending", "missing"].includes(status);
}

export function deriveLocalModelIndexEntry(input: {
  model: ModelRegistryEntry;
  localPath?: string;
  actualSha256?: string;
  fileSizeBytes?: number;
  verificationStatus: OpenStemLocalModelStatus;
  sourceStatus?: ModelSourceStatus;
  diagnosticCode?: string;
  proofEligibility?: ModelProofEligibility;
  message?: string;
  now?: string;
}): OpenStemLocalModelIndexEntry {
  const now = input.now || new Date().toISOString();
  const expectedSha256 = normalizeSha256(input.model.checksum || null) || undefined;
  const actualSha256 = normalizeSha256(input.actualSha256 || null) || undefined;
  const proofEligibility =
    input.proofEligibility ||
    getModelProofEligibility(input.model, {
      exists: !!input.localPath,
      status: input.verificationStatus,
      hashChecked: !!actualSha256 && !!expectedSha256,
      hashMatches: !!actualSha256 && !!expectedSha256 && actualSha256 === expectedSha256,
    });

  return {
    modelId: input.model.id,
    localPath: input.localPath,
    actualSha256,
    expectedSha256,
    fileSizeBytes: input.fileSizeBytes,
    verificationStatus: input.verificationStatus,
    verifiedAt: input.verificationStatus === "hash_verified" ? now : undefined,
    sourceManifestVersion: "1.0",
    sourceMetadataVersion: input.model.updatedAt || input.model.createdAt,
    proofEligible: proofEligibility.proofEligible,
    lastSourceCheck: input.sourceStatus
      ? {
          sourceStatus: input.sourceStatus,
          checkedAt: now,
          diagnosticCode: input.diagnosticCode,
        }
      : undefined,
    repairHistory: [
      {
        action: input.verificationStatus === "download_complete_verification_pending" ? "download" : "verify",
        status: input.verificationStatus,
        at: now,
        message: input.message,
      },
    ],
    userNotes: input.model.userNotes,
  };
}

export function getOpenStemModelLibraryState(
  model: ModelRegistryEntry,
  localIndexEntry?: OpenStemLocalModelIndexEntry,
): ModelLibraryDisplayState {
  const localStatus =
    localIndexEntry?.verificationStatus ||
    (model.downloaded
      ? model.actualSha256 && model.checksum && model.actualSha256.toLowerCase() === model.checksum.toLowerCase()
        ? "hash_verified"
        : model.checksum
          ? "installed_not_checked"
          : "installed_hash_unavailable"
      : "not_installed");
  const proofEligibility = getModelProofEligibility(model, {
    exists: isInstalledLocalModelStatus(localStatus),
    status: localStatus === "hash_verified" ? "hash_verified" : model.verifiedStatus || localStatus,
    hashChecked: !!localIndexEntry?.actualSha256 && !!(localIndexEntry.expectedSha256 || model.checksum),
    hashMatches:
      !!localIndexEntry?.actualSha256 &&
      !!(localIndexEntry.expectedSha256 || model.checksum) &&
      localIndexEntry.actualSha256.toLowerCase() === String(localIndexEntry.expectedSha256 || model.checksum).toLowerCase(),
  });

  return {
    manifestStatus: proofEligibility.proofEligible ? "proof_eligible" : mapSourceStatusToManifestStatus(model.verifiedStatus),
    sourceStatus: model.verifiedStatus,
    localStatus,
    proofEligibility,
    proofStatus: proofEligibility.proofEligible ? "proof_eligible" : "not_proof_eligible",
    recommendedAction: getRecommendedModelAction(model, proofEligibility),
  };
}

export function getDownloadVerifyFlow(): string[] {
  return [
    "Select model card",
    "Check source status before downloading",
    "Block 401, 403, 404, unavailable, and unknown sources",
    "Stream download to temp file",
    "Mark download complete as verification pending only",
    "Compute SHA-256",
    "Compare expected SHA-256",
    "Move verified or pending file into model library only after completed download",
    "Delete or quarantine mismatched temp file",
    "Update openstem-models.local.json",
    "Mark proof eligible only after exact local SHA-256 match and remaining proof gates pass",
  ];
}

export function getRepairReconnectFlow(): string[] {
  return [
    "Resolve Source",
    "Retry source check",
    "Open source page",
    "Search selected local folder",
    "Search configured model library",
    "Reconnect local file",
    "Import strict metadata JSON",
    "Compute local SHA-256",
    "Accept only matching expected SHA-256 for proof eligibility",
  ];
}
