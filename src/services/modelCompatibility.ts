import { ModelRegistryEntry, ModelSourceStatus } from "../types";
import { normalizeSha256 } from "./modelSourceDiagnostics";

export type ModelCompatibilityBlockerReason =
  | "unsupported_backend"
  | "source_missing"
  | "missing_license"
  | "missing_hash"
  | "invalid_metadata"
  | "broken_link"
  | "auth_required"
  | "hash_mismatch"
  | "manual_import_required"
  | "incompatible_architecture";

export type ModelCompatibilityStatus =
  | "compatible"
  | "compatible_needs_metadata"
  | "blocked_integrity"
  | "blocked_backend"
  | "invalid_metadata";

export type HardwareFit =
  | "good_fit"
  | "usable_but_slow"
  | "gpu_recommended"
  | "likely_too_large"
  | "unknown";

export type HardwareWarningLevel = "none" | "info" | "warning" | "severe";
export type RecommendedDevice = "cpu" | "cuda" | "mps" | "directml" | "unknown";

export interface ModelCompatibilityGateResult {
  modelId: string;
  modelName: string;
  status: ModelCompatibilityStatus;
  allowedInLibrary: boolean;
  canAttemptDownload: boolean;
  canAttemptManualImport: boolean;
  blocksExecution: boolean;
  blockers: ModelCompatibilityBlockerReason[];
  warnings: string[];
  label: string;
  userMessage: string;
}

export interface HardwareEnvironmentSnapshot {
  checked: boolean;
  systemRamBytes?: number;
  cudaAvailable?: boolean;
  mpsAvailable?: boolean;
  directmlAvailable?: boolean;
  totalVramBytes?: number;
  canRunCpuAISeparation?: boolean;
  torchInstalled?: boolean;
  audioSeparatorInstalled?: boolean;
  source?: "backend_diagnostics" | "static_only";
}

export interface ModelHardwareFitResult {
  modelId: string;
  modelName: string;
  modelSizeBytes?: number;
  estimatedRamRequiredGb?: number;
  estimatedVramRequiredGb?: number;
  recommendedDevice: RecommendedDevice;
  cpuUsable: boolean | "unknown";
  gpuRecommended: boolean;
  fit: HardwareFit;
  warningLevel: HardwareWarningLevel;
  userMessage: string;
  estimateBasis: "Static estimate / Not live benchmark";
  hardwareChecked: boolean;
}

const SUPPORTED_BACKENDS = new Set(["python-pytorch", "onnxruntime", "audio-separator", "cpu-dsp"]);
const SUPPORTED_ARCHITECTURES = new Set(["VR", "MDX-Net", "Demucs", "RoFormer", "MDXC", "Custom"]);
const SOURCE_BLOCKS_DOWNLOAD = new Set<ModelSourceStatus>([
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
]);

const ARCHITECTURE_EXTENSIONS: Record<string, string[]> = {
  VR: [".pth", ".ckpt"],
  "MDX-Net": [".onnx"],
  Demucs: [".yaml", ".yml", ".th", ".ckpt", ".pth"],
  RoFormer: [".onnx", ".ckpt", ".pth"],
  MDXC: [".onnx"],
  Custom: [".onnx", ".pth", ".pt", ".ckpt", ".yaml", ".yml", ".safetensors"],
};

function getFileExtension(filename?: string): string {
  if (!filename || !filename.includes(".")) return "";
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

function parseSizeLabelToBytes(sizeLabel?: string): number | undefined {
  const match = String(sizeLabel || "").match(/([\d.]+)\s*(KB|MB|GB)/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const unit = match[2].toUpperCase();
  if (unit === "GB") return Math.round(value * 1024 * 1024 * 1024);
  if (unit === "MB") return Math.round(value * 1024 * 1024);
  return Math.round(value * 1024);
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

function hasLicenseOrNeedsVerification(model: Partial<ModelRegistryEntry>): boolean {
  const license = String(model.license || "").trim().toLowerCase();
  return !!license && license !== "unknown";
}

function isSupportedFilename(model: Partial<ModelRegistryEntry>): boolean {
  const name = String(model.name || "").trim();
  if (!name || name.includes("/") || name.includes("\\")) return false;
  const ext = getFileExtension(name);
  const supported = model.supportedExtensions?.length
    ? model.supportedExtensions.map((value) => value.toLowerCase())
    : ARCHITECTURE_EXTENSIONS[model.architecture || ""] || [];
  return !!ext && supported.includes(ext);
}

function estimateModelSizeBytes(model: Partial<ModelRegistryEntry>): number | undefined {
  return model.expectedSizeBytes || parseSizeLabelToBytes(model.fileSize);
}

function memoryRiskBaseGb(model: Partial<ModelRegistryEntry>): number {
  if (model.memoryRisk === "high") return 16;
  if (model.memoryRisk === "med") return 8;
  return 4;
}

function architectureRamFloorGb(model: Partial<ModelRegistryEntry>): number {
  if (model.architecture === "Demucs") return 16;
  if (model.architecture === "RoFormer") return 12;
  if (model.architecture === "MDXC") return 8;
  if (model.architecture === "Custom") return 8;
  return 4;
}

export function getModelCompatibilityGate(model: ModelRegistryEntry): ModelCompatibilityGateResult {
  const blockers: ModelCompatibilityBlockerReason[] = [];
  const warnings: string[] = [];
  const architecture = model.architecture;
  const backend = model.requiredBackend;
  const sourceStatus = model.verifiedStatus;
  const hasRemoteSource = !!(model.downloadUrl || model.sourceUrl);
  const isManual = model.sourceType === "manual_import" || architecture === "Custom";

  if (!SUPPORTED_ARCHITECTURES.has(architecture)) blockers.push("incompatible_architecture");
  if (backend && !SUPPORTED_BACKENDS.has(backend)) blockers.push("unsupported_backend");
  if (!isSupportedFilename(model)) blockers.push("invalid_metadata");
  if (!hasLicenseOrNeedsVerification(model)) blockers.push("missing_license");

  if (!isManual && !hasRemoteSource) blockers.push("source_missing");
  if (!isManual && hasRemoteSource && !getSourceProject(model)) blockers.push("source_missing");
  if (!normalizeSha256(model.checksum || null)) warnings.push("Hash required for proof.");
  if (sourceStatus === "missing_hash" || (!model.checksum && model.sourceType !== "manual_import")) blockers.push("missing_hash");
  if (sourceStatus === "hash_mismatch") blockers.push("hash_mismatch");
  if (sourceStatus === "broken_link") blockers.push("broken_link");
  if (sourceStatus === "auth_required" || sourceStatus === "access_denied" || sourceStatus === "gated_or_private") blockers.push("auth_required");
  if (model.sourceType === "manual_import" && !model.checksum) blockers.push("manual_import_required");

  const structuralBlockers = blockers.filter((blocker) =>
    ["unsupported_backend", "incompatible_architecture", "invalid_metadata", "missing_license", "source_missing"].includes(blocker),
  );
  const integrityBlockers = blockers.filter((blocker) =>
    ["missing_hash", "hash_mismatch", "broken_link", "auth_required", "manual_import_required"].includes(blocker),
  );

  const allowedInLibrary = structuralBlockers.length === 0;
  const sourceBlocksDownload = !!sourceStatus && SOURCE_BLOCKS_DOWNLOAD.has(sourceStatus);
  const canAttemptDownload =
    allowedInLibrary &&
    !!model.downloadUrl &&
    !sourceBlocksDownload &&
    model.sourceType !== "manual_import" &&
    model.sourceType !== "unknown";
  const canAttemptManualImport = structuralBlockers.filter((blocker) => blocker !== "source_missing").length === 0;
  const status: ModelCompatibilityStatus = !allowedInLibrary
    ? structuralBlockers.includes("unsupported_backend")
      ? "blocked_backend"
      : "invalid_metadata"
    : integrityBlockers.length > 0
      ? "blocked_integrity"
      : model.checksum
        ? "compatible"
        : "compatible_needs_metadata";

  const label =
    status === "compatible"
      ? "Compatible with OpenStem"
      : status === "compatible_needs_metadata"
        ? "Source metadata incomplete"
        : status === "blocked_backend"
          ? "Unsupported backend"
          : status === "invalid_metadata"
            ? "Invalid metadata"
            : sourceStatus === "auth_required"
              ? "Auth required"
              : sourceStatus === "broken_link"
                ? "Broken link"
                : "Integrity blocked";

  return {
    modelId: model.id,
    modelName: model.name,
    status,
    allowedInLibrary,
    canAttemptDownload,
    canAttemptManualImport,
    blocksExecution: blockers.length > 0,
    blockers,
    warnings,
    label,
    userMessage: allowedInLibrary
      ? "Compatibility gate passed for library management. Proof still requires source integrity and local SHA-256 verification."
      : "Compatibility gate failed. Correct backend, architecture, filename, source, or license metadata before using this model.",
  };
}

export function getModelHardwareFit(
  model: ModelRegistryEntry,
  hardware?: HardwareEnvironmentSnapshot,
): ModelHardwareFitResult {
  const sizeBytes = estimateModelSizeBytes(model);
  const sizeGb = sizeBytes ? sizeBytes / 1024 / 1024 / 1024 : 0;
  const estimatedRamRequiredGb = Math.max(architectureRamFloorGb(model), memoryRiskBaseGb(model), Math.ceil(sizeGb * 3 + 4));
  const estimatedVramRequiredGb = model.gpuSupport
    ? Math.max(model.memoryRisk === "high" ? 8 : model.memoryRisk === "med" ? 4 : 2, Math.ceil(sizeGb * 1.5 + 2))
    : undefined;
  const gpuRecommended = model.gpuSupport && (model.memoryRisk === "high" || model.architecture === "Demucs" || model.architecture === "RoFormer" || estimatedRamRequiredGb >= 12);
  const recommendedDevice: RecommendedDevice = gpuRecommended
    ? hardware?.mpsAvailable
      ? "mps"
      : hardware?.cudaAvailable
        ? "cuda"
        : "cuda"
    : "cpu";
  const systemRamGb = hardware?.systemRamBytes ? hardware.systemRamBytes / 1024 / 1024 / 1024 : undefined;
  const totalVramGb = hardware?.totalVramBytes ? hardware.totalVramBytes / 1024 / 1024 / 1024 : undefined;
  const hardwareChecked = !!hardware?.checked;

  let fit: HardwareFit = "unknown";
  let warningLevel: HardwareWarningLevel = "info";
  let cpuUsable: boolean | "unknown" = model.requiredBackend === "audio-separator" || model.requiredBackend === "python-pytorch" || model.requiredBackend === "onnxruntime";

  if (hardwareChecked && systemRamGb && systemRamGb < estimatedRamRequiredGb * 0.75) {
    fit = "likely_too_large";
    warningLevel = "severe";
  } else if (gpuRecommended && hardwareChecked && estimatedVramRequiredGb && totalVramGb && totalVramGb < estimatedVramRequiredGb) {
    fit = "likely_too_large";
    warningLevel = "severe";
  } else if (gpuRecommended) {
    fit = hardwareChecked && (hardware?.cudaAvailable || hardware?.mpsAvailable || hardware?.directmlAvailable) ? "gpu_recommended" : "usable_but_slow";
    warningLevel = "warning";
  } else if (model.memoryRisk === "med") {
    fit = "usable_but_slow";
    warningLevel = "info";
  } else if (model.memoryRisk === "low") {
    fit = "good_fit";
    warningLevel = "none";
  }

  if (!hardwareChecked) {
    fit = gpuRecommended ? "gpu_recommended" : model.memoryRisk === "low" ? "good_fit" : "usable_but_slow";
    warningLevel = gpuRecommended ? "warning" : model.memoryRisk === "low" ? "info" : "warning";
    cpuUsable = model.memoryRisk === "high" ? true : cpuUsable;
  }

  const userMessage =
    fit === "likely_too_large"
      ? "Large model warning: This model may be slow or unstable on this system. GPU or more RAM/VRAM may be recommended."
      : fit === "gpu_recommended"
        ? "GPU recommended. CUDA, DirectML, or MPS behavior is backend-dependent and not proof until a real E2E run passes."
        : fit === "usable_but_slow"
          ? "CPU usable but slow. This is a hardware-fit warning, not a compatibility blocker."
          : fit === "good_fit"
            ? "Compatible model size estimate. This does not prove separation quality or proof eligibility."
            : "Hardware fit not checked. Static estimate only.";

  return {
    modelId: model.id,
    modelName: model.name,
    modelSizeBytes: sizeBytes,
    estimatedRamRequiredGb,
    estimatedVramRequiredGb,
    recommendedDevice,
    cpuUsable,
    gpuRecommended,
    fit,
    warningLevel,
    userMessage,
    estimateBasis: "Static estimate / Not live benchmark",
    hardwareChecked,
  };
}

export function getHardwareFitBadgeLabel(result: ModelHardwareFitResult): string {
  if (!result.hardwareChecked) return "Hardware fit not checked";
  if (result.fit === "likely_too_large") return "Likely too large for this machine";
  if (result.fit === "gpu_recommended") return "GPU recommended";
  if (result.fit === "usable_but_slow") return "CPU usable but slow";
  if (result.fit === "good_fit") return "Good fit estimate";
  return "Hardware fit unknown";
}
