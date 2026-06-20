import { ModelProofEligibility, ModelRegistryEntry, ModelSourceStatus } from "../types";
import { getModelProofEligibility } from "./modelProofEligibility";

export type ModelCatalogLane = "curated" | "custom";

export interface CuratedModelEntry {
  id: string;
  displayName: string;
  modelFamily: ModelRegistryEntry["architecture"];
  architecture: ModelRegistryEntry["architecture"];
  backend?: ModelRegistryEntry["requiredBackend"];
  sourceProject?: string;
  sourceUrl?: string;
  repoId?: string;
  filename: string;
  expectedSha256?: string;
  expectedSizeBytes?: number;
  license?: string;
  status?: ModelSourceStatus;
  notes?: string;
  compatibility?: string;
  proofEligibility: ModelProofEligibility;
}

export interface CustomModelEntry {
  id: string;
  displayName: string;
  userProvidedName: string;
  localPath?: string;
  filename: string;
  actualSha256?: string;
  expectedSha256?: string;
  sizeBytes?: number;
  architecture: ModelRegistryEntry["architecture"];
  backend?: ModelRegistryEntry["requiredBackend"];
  sourceUrl?: string;
  sourceProject?: string;
  license?: string;
  verificationStatus: Extract<
    ModelSourceStatus,
    "custom_unverified" | "custom_hash_unavailable" | "hash_mismatch" | "verified_local" | "unsupported_backend"
  >;
  proofEligibility: ModelProofEligibility;
  userNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelLibrarySummary {
  curatedTotal: number;
  customTotal: number;
  curatedBlocked: number;
  customProofEligible: number;
  customNeedsMetadata: number;
}

function getSourceProject(model: Partial<ModelRegistryEntry>): string | undefined {
  const source = model.downloadUrl || model.sourceUrl || "";
  if (!source) return undefined;
  try {
    const url = new URL(source);
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.hostname.includes("huggingface.co")) {
      return parts[0] && parts[1] ? `${parts[0]}/${parts[1]}` : "Hugging Face";
    }
    if (url.hostname.includes("github.com")) {
      return parts[0] && parts[1] ? `${parts[0]}/${parts[1]}` : "GitHub";
    }
    return url.hostname;
  } catch {
    return undefined;
  }
}

function getRepoId(model: Partial<ModelRegistryEntry>): string | undefined {
  return getSourceProject(model);
}

function isCustomId(id?: string): boolean {
  return !!id && /^custom[_-]/.test(id);
}

export function getModelCatalogLane(model: Partial<ModelRegistryEntry>): ModelCatalogLane {
  if (model.catalogLane === "custom") return "custom";
  if (model.catalogLane === "curated") return "curated";
  if (isCustomId(model.id)) return "custom";
  return "curated";
}

export function isCustomModel(model: Partial<ModelRegistryEntry>): boolean {
  return getModelCatalogLane(model) === "custom";
}

export function getCustomVerificationStatus(input: {
  expectedSha256?: string;
  actualSha256?: string;
  backend?: ModelRegistryEntry["requiredBackend"];
  proofEligible?: boolean;
}): CustomModelEntry["verificationStatus"] {
  if (input.backend && !["python-pytorch", "onnxruntime", "audio-separator", "cpu-dsp"].includes(input.backend)) {
    return "unsupported_backend";
  }
  if (!input.expectedSha256) return "custom_hash_unavailable";
  if (!input.actualSha256) return "custom_unverified";
  return input.actualSha256.toLowerCase() === input.expectedSha256.toLowerCase() || input.proofEligible
    ? "verified_local"
    : "hash_mismatch";
}

export function toCuratedModelEntry(model: ModelRegistryEntry, proofEligibility?: ModelProofEligibility): CuratedModelEntry {
  return {
    id: model.id,
    displayName: model.name,
    modelFamily: model.architecture,
    architecture: model.architecture,
    backend: model.requiredBackend,
    sourceProject: getSourceProject(model),
    sourceUrl: model.downloadUrl || model.sourceUrl,
    repoId: getRepoId(model),
    filename: model.name,
    expectedSha256: model.checksum,
    expectedSizeBytes: model.expectedSizeBytes,
    license: model.license,
    status: model.verifiedStatus,
    notes: model.description,
    compatibility: model.requiredBackend || model.architecture,
    proofEligibility: proofEligibility || getModelProofEligibility(model, {
      exists: model.downloaded,
      status: model.verifiedStatus,
      hashChecked: false,
      hashMatches: false,
    }),
  };
}

export function modelRegistryEntryToCustomModelEntry(
  model: ModelRegistryEntry,
  verification?: {
    actualSha256?: string;
    expectedSha256?: string;
    fileSizeBytes?: number;
    hashMatches?: boolean;
    status?: string;
  },
): CustomModelEntry {
  const now = new Date().toISOString();
  const expectedSha256 = verification?.expectedSha256 || model.checksum || undefined;
  const actualSha256 = verification?.actualSha256 || model.actualSha256 || undefined;
  const proofEligibility = getModelProofEligibility(model, {
    exists: !!model.filePath && model.downloaded !== false,
    status: verification?.status || model.verifiedStatus,
    hashChecked: !!actualSha256 && !!expectedSha256,
    hashMatches: verification?.hashMatches || (!!actualSha256 && !!expectedSha256 && actualSha256.toLowerCase() === expectedSha256.toLowerCase()),
  });

  return {
    id: model.id,
    displayName: model.name,
    userProvidedName: model.name,
    localPath: model.filePath,
    filename: model.name,
    actualSha256,
    expectedSha256,
    sizeBytes: verification?.fileSizeBytes || model.expectedSizeBytes,
    architecture: model.architecture,
    backend: model.requiredBackend,
    sourceUrl: model.sourceUrl || model.downloadUrl,
    sourceProject: getSourceProject(model),
    license: model.license,
    verificationStatus: getCustomVerificationStatus({
      expectedSha256,
      actualSha256,
      backend: model.requiredBackend,
      proofEligible: proofEligibility.proofEligible,
    }),
    proofEligibility,
    userNotes: model.userNotes,
    createdAt: model.createdAt || now,
    updatedAt: now,
  };
}

export function customModelEntryToRegistryEntry(entry: CustomModelEntry): ModelRegistryEntry {
  return {
    id: entry.id,
    name: entry.filename || entry.displayName,
    architecture: entry.architecture,
    filePath: entry.localPath || "",
    stemType: "variable",
    gpuSupport: false,
    gpuSupportStatus: "unknown",
    memoryRisk: "med",
    downloaded: !!entry.localPath,
    description:
      entry.userNotes ||
      "User custom model. Not proof-eligible until source metadata, license, expected SHA-256, and local hash verification pass.",
    fileSize: entry.sizeBytes ? `${(entry.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : "Unknown",
    sourceType: "manual_import",
    sourceUrl: entry.sourceUrl,
    checksum: entry.expectedSha256,
    expectedSizeBytes: entry.sizeBytes,
    requiredBackend: entry.backend,
    supportedExtensions: [entry.filename.includes(".") ? entry.filename.slice(entry.filename.lastIndexOf(".")) : ""].filter(Boolean),
    license: entry.license || "User-supplied / not verified",
    verifiedStatus: entry.verificationStatus,
    catalogLane: "custom",
    userNotes: entry.userNotes,
    actualSha256: entry.actualSha256,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function createCustomModelEntryFromMetadata(input: {
  id?: string;
  displayName: string;
  filename: string;
  architecture: ModelRegistryEntry["architecture"];
  backend?: ModelRegistryEntry["requiredBackend"];
  expectedSha256?: string;
  expectedSizeBytes?: number;
  sourceUrl?: string;
  sourceProject?: string;
  license?: string;
  userNotes?: string;
}): CustomModelEntry {
  const now = new Date().toISOString();
  const model = customModelEntryToRegistryEntry({
    id: input.id || `custom_metadata_${Date.now()}`,
    displayName: input.displayName,
    userProvidedName: input.displayName,
    filename: input.filename,
    expectedSha256: input.expectedSha256,
    sizeBytes: input.expectedSizeBytes,
    architecture: input.architecture,
    backend: input.backend,
    sourceUrl: input.sourceUrl,
    sourceProject: input.sourceProject,
    license: input.license,
    verificationStatus: input.expectedSha256 ? "custom_unverified" : "custom_hash_unavailable",
    proofEligibility: {
      proofEligible: false,
      reason: input.expectedSha256 ? "missing_file" : "hash_missing",
      displayMessage: input.expectedSha256
        ? "Custom metadata is registered, but no local file has matched the expected SHA-256 yet."
        : "Custom model metadata is missing expected SHA-256.",
    },
    userNotes: input.userNotes,
    createdAt: now,
    updatedAt: now,
  });

  return modelRegistryEntryToCustomModelEntry(model);
}

export function getRecommendedModelAction(model: ModelRegistryEntry, proofEligibility?: ModelProofEligibility): string {
  const lane = getModelCatalogLane(model);
  const proof = proofEligibility || getModelProofEligibility(model, {
    exists: model.downloaded,
    status: model.verifiedStatus,
    hashChecked: false,
    hashMatches: false,
  });

  if (proof.proofEligible) return "Ready for proof gate; run only after backend/input/output checks also pass.";
  if (lane === "custom") {
    if (!model.checksum) return "Import metadata with expected SHA-256 and license, then reconnect the local file.";
    if (!model.downloaded) return "Reconnect the local file or search the model library for a matching SHA-256.";
    if (model.verifiedStatus === "hash_mismatch") return "Reject this file for proof; locate the correct model or repair independently verified metadata.";
    return "Verify the local custom file against expected SHA-256.";
  }

  if (model.verifiedStatus === "auth_required") return "Open the source page or reconnect a local copy; Hugging Face auth is planned / not active.";
  if (model.verifiedStatus === "broken_link") return "Repair source metadata only with legitimate source, license, expected SHA-256, and matching local file.";
  if (model.verifiedStatus === "unavailable" || model.verifiedStatus === "source_unavailable") return "Retry source diagnostics or reconnect a verified local file.";
  if (!model.downloaded) return "Reconnect local file, search local folder, or wait for verified source access.";
  return "Inspect proof blocker and keep model blocked until SHA-256 verification passes.";
}

export function summarizeModelLibrary(models: ModelRegistryEntry[]): ModelLibrarySummary {
  const customModels = models.filter(isCustomModel);
  const curatedModels = models.filter((model) => !isCustomModel(model));
  return {
    curatedTotal: curatedModels.length,
    customTotal: customModels.length,
    curatedBlocked: curatedModels.filter((model) => model.architecture !== "Ensemble" && model.verifiedStatus !== "verified").length,
    customProofEligible: customModels.filter((model) =>
      getModelProofEligibility(model, {
        exists: model.downloaded,
        status: model.verifiedStatus === "verified_local" ? "hash_verified" : model.verifiedStatus,
        hashChecked: !!model.actualSha256 && !!model.checksum,
        hashMatches: !!model.actualSha256 && !!model.checksum && model.actualSha256.toLowerCase() === model.checksum.toLowerCase(),
      }).proofEligible,
    ).length,
    customNeedsMetadata: customModels.filter((model) => !model.checksum).length,
  };
}
