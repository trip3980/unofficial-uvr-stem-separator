import React, { useState, useEffect, useRef } from "react";
import {
  DownloadCloud,
  Database,
  HardDrive,
  RefreshCw,
  FileCode,
  Check,
  Globe,
  Server,
  Filter,
  ArrowUpDown,
  FolderOpen,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Github,
} from "lucide-react";
import { motion } from "motion/react";
import { MODEL_REGISTRY, addModelToRegistry } from "../services/audioEngine";
import { getDiagnosticCodeForSourceStatus } from "../services/diagnosticCodes";
import { buildSourceResolutionWorkflow, validateImportedModelMetadata } from "../services/modelSourceDiagnostics";
import { getModelProofEligibility } from "../services/modelProofEligibility";
import {
  createCustomModelEntryFromMetadata,
  customModelEntryToRegistryEntry,
  getModelCatalogLane,
  getRecommendedModelAction,
  isCustomModel,
  modelRegistryEntryToCustomModelEntry,
  summarizeModelLibrary,
} from "../services/modelLibrary";
import {
  getHardwareFitBadgeLabel,
  getModelCompatibilityGate,
  getModelHardwareFit,
  HardwareEnvironmentSnapshot,
  ModelCompatibilityGateResult,
  ModelHardwareFitResult,
} from "../services/modelCompatibility";
import { getOpenStemModelLibraryState, OpenStemLocalModelIndexEntry } from "../services/modelManifest";
import { OPENSTEM_UPDATE_PRINCIPLE, UPDATE_READINESS_LANES, UPDATE_TRUST_REQUIREMENTS } from "../services/updatePolicy";
import { ModelRegistryEntry } from "../types";
import { HelpToggle, HelpText, AccessibleTooltipWrapper } from "./HelpSystem";

// Static constant for free space (Matches the 4.8 GB from initial system specs)
const FREE_SPACE_MB = 4.8 * 1024; // 4915.2 MB

type NativeVerificationStatus =
  | "not_checked"
  | "missing"
  | "installed_not_checked"
  | "installed_hash_unavailable"
  | "hash_verified"
  | "hash_mismatch"
  | "size_mismatch"
  | "manual_import_required"
  | "source_missing"
  | "browser_preview"
  | "verifying"
  | "error";

interface NativeVerifyResult {
  ok: boolean;
  exists: boolean;
  sizeMatches?: boolean;
  hashChecked: boolean;
  hashMatches?: boolean;
  actualSha256?: string;
  expectedSha256?: string;
  fileSizeBytes?: number;
  expectedSizeBytes?: number;
  localPath?: string;
  status:
    | "missing"
    | "installed_not_checked"
    | "installed_hash_unavailable"
    | "hash_verified"
    | "hash_mismatch"
    | "size_mismatch"
    | "error";
  error?: string;
  proofEligibility?: {
    proofEligible: boolean;
    reason: string;
    displayMessage: string;
  };
}

type ModelDownloadStatus = "idle" | "downloading" | "verifying" | "failed";

interface RecoveryCandidate {
  sourcePath: string;
  expectedFileName?: string;
  selectedFileName?: string;
  filenameCompatible?: boolean;
  extensionAllowed?: boolean;
  actualSha256?: string;
  expectedSha256?: string;
  fileSizeBytes?: number;
  expectedSizeBytes?: number;
  status: NativeVerificationStatus | "candidates_found";
  hashChecked?: boolean;
  hashMatches?: boolean;
  proofEligible?: boolean;
  diagnosticCode?: string;
  error?: string;
  message?: string;
}

interface ModelReconnectResult {
  success: boolean;
  ok?: boolean;
  exists?: boolean;
  status?: NativeVerificationStatus | "cancelled";
  verified?: boolean;
  proofEligible?: boolean;
  absolutePath?: string;
  sourcePath?: string;
  name?: string;
  size?: number;
  fileSize?: string;
  actualSha256?: string;
  expectedSha256?: string;
  selectedFileName?: string;
  expectedFileName?: string;
  filenameCompatible?: boolean;
  diagnosticCode?: string;
  verification?: NativeVerifyResult;
  proofEligibility?: {
    proofEligible: boolean;
    reason: string;
    displayMessage: string;
    diagnosticCode?: string;
  };
  message?: string;
  error?: string;
}

interface ModelCandidateSearchResult {
  success: boolean;
  ok?: boolean;
  status?: string;
  rootPath?: string;
  expectedFileName?: string;
  candidates: RecoveryCandidate[];
  verifiedCandidates?: number;
  diagnosticCode?: string;
  message?: string;
  error?: string;
}

const modelBridgeUnavailableStatus: NativeVerificationStatus = "browser_preview";

type SourceStatusUi = {
  label: string;
  message: string;
  diagnosticCode: string;
  badgeTone: "warning" | "blocked" | "neutral";
};

function getSourceStatusUi(status?: ModelRegistryEntry["verifiedStatus"]): SourceStatusUi {
  const diagnosticCode = getDiagnosticCodeForSourceStatus(status);
  switch (status) {
    case "verified_local":
      return {
        label: "Custom / Hash verified",
        diagnosticCode,
        message:
          "A user-added local model file has matched expected SHA-256 metadata. It can proceed to the remaining proof gates.",
        badgeTone: "neutral",
      };
    case "custom_unverified":
      return {
        label: "Custom / Not verified",
        diagnosticCode,
        message: "Custom metadata is registered, but no local file has matched expected SHA-256 yet.",
        badgeTone: "warning",
      };
    case "custom_hash_unavailable":
      return {
        label: "Custom / Hash unavailable",
        diagnosticCode,
        message:
          "Custom model metadata is missing expected SHA-256. It can be tracked locally, but it is not proof-eligible.",
        badgeTone: "warning",
      };
    case "auth_required":
      return {
        label: "Auth Required",
        diagnosticCode,
        message:
          "This source returned HTTP 401. The server was reached, so this is not a no-internet result. It may require Hugging Face authentication, approved access, or corrected source metadata. OpenStem will not download or use this model for proof until the source is legitimately accessible and the local file passes SHA-256 verification.",
        badgeTone: "blocked",
      };
    case "access_denied":
    case "gated_or_private":
      return {
        label: "Access Denied / Gated",
        diagnosticCode,
        message:
          "This source returned HTTP 403. Access is denied or gated. OpenStem will not download or use this model until legitimate access and verification are available.",
        badgeTone: "blocked",
      };
    case "broken_link":
      return {
        label: "Broken Link",
        diagnosticCode,
        message:
          "This source returned HTTP 404 / Not Found. The file may have moved or the metadata may be stale. Repair source metadata only with a legitimate source, usable license, expected SHA-256, and matching local hash.",
        badgeTone: "blocked",
      };
    case "rate_limited":
      return {
        label: "Rate Limited",
        diagnosticCode,
        message:
          "This source returned HTTP 429. OpenStem will keep this model blocked until source access can be checked without rate limiting and local SHA-256 verification passes.",
        badgeTone: "warning",
      };
    case "source_unavailable":
      return {
        label: "Source Unavailable",
        diagnosticCode,
        message:
          "The source could not be reached. OpenStem will keep this model blocked until source metadata and access are verified.",
        badgeTone: "blocked",
      };
    case "network_unavailable":
      return {
        label: "Network Unavailable",
        diagnosticCode,
        message:
          "No HTTP response was received. Check internet, proxy, firewall, or offline state before changing model source metadata.",
        badgeTone: "warning",
      };
    case "dns_failed":
      return {
        label: "DNS Failed",
        diagnosticCode,
        message:
          "DNS lookup failed for this model source. This is a connectivity or domain-resolution problem, not a verified broken model file.",
        badgeTone: "warning",
      };
    case "timeout":
      return {
        label: "Source Timeout",
        diagnosticCode,
        message:
          "The source check timed out. Retry diagnostics before treating this source as broken, repaired, or proof-eligible.",
        badgeTone: "warning",
      };
    case "missing_hash":
      return {
        label: "Hash Missing",
        diagnosticCode,
        message:
          "The source may be reachable, but expected SHA-256 metadata is missing. Candidate files are not trusted or proof-eligible without expected hash, license, and local hash match.",
        badgeTone: "blocked",
      };
    case "hash_mismatch":
      return {
        label: "Hash Mismatch",
        diagnosticCode,
        message: "Block: hash mismatch on target weights.",
        badgeTone: "blocked",
      };
    case "unsupported_backend":
      return {
        label: "Unsupported Backend",
        diagnosticCode,
        message: "Block: target engine backend not supported.",
        badgeTone: "blocked",
      };
    case "manual_import_required":
      return {
        label: "Manual Import Required",
        diagnosticCode,
        message: "Manual import requires expected SHA-256 metadata and a matching local file before proof.",
        badgeTone: "neutral",
      };
    case "needs_verification":
      return {
        label: "Needs Verification",
        diagnosticCode,
        message:
          "Verification is pending. Strict metadata import stays Needs Verification until a local file SHA-256 matches the expected value.",
        badgeTone: "warning",
      };
    case "reachable":
      return {
        label: "Reachable / Not Verified",
        diagnosticCode,
        message:
          "The endpoint responded, but proof still requires expected SHA-256 metadata and a matching local file.",
        badgeTone: "warning",
      };
    case "download_available":
      return {
        label: "Download Available",
        diagnosticCode,
        message: "Source metadata is reachable, but proof still requires local SHA-256 verification.",
        badgeTone: "warning",
      };
    case "configured_not_checked":
      return {
        label: "Configured / Not Checked",
        diagnosticCode,
        message: "Source metadata is configured but has not been audited in this session.",
        badgeTone: "neutral",
      };
    case "experimental":
      return {
        label: "Experimental",
        diagnosticCode,
        message: "Experimental build: source not audited.",
        badgeTone: "warning",
      };
    case "unavailable":
      return {
        label: "Unavailable",
        diagnosticCode,
        message: "Direct download is currently disabled.",
        badgeTone: "blocked",
      };
    default:
      return {
        label: "Unavailable",
        diagnosticCode,
        message: "Unavailable for direct download.",
        badgeTone: "blocked",
      };
  }
}

function getSourceResolutionCopy(item: ModelRegistryEntry): { label: string; message: string; authNote?: string } {
  const workflow = buildSourceResolutionWorkflow(item);
  const allowedSources = workflow.candidateSourcesAllowed.join(", ");
  const authNote = (item.downloadUrl || item.sourceUrl || "").includes("huggingface.co")
    ? "Hugging Face authentication: Planned / Not active."
    : undefined;
  return {
    label: workflow.title,
    message: `Allowed repair path: retry the current URL, inspect only allowed sources (${allowedSources}), import strict metadata JSON, or reconnect one local file by SHA-256. Candidate sources remain unverified until expected SHA-256, license, and local hash match.`,
    authNote,
  };
}

function getSourceStatusButtonClasses(status?: ModelRegistryEntry["verifiedStatus"]): string {
  const tone = getSourceStatusUi(status).badgeTone;
  if (tone === "warning") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (tone === "neutral") return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
  return "bg-rose-500/10 text-rose-400 border-rose-500/20";
}

function getSourceStatusMessageClasses(status?: ModelRegistryEntry["verifiedStatus"]): string {
  const tone = getSourceStatusUi(status).badgeTone;
  if (tone === "warning") return "text-amber-400/80";
  if (tone === "neutral") return "text-indigo-300/80";
  return "text-rose-400/80";
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "Unknown";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

function toNativeModelPayload(item: ModelRegistryEntry) {
  const filePath = item.filePath || "";
  const isAbsoluteLocalPath =
    /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith("/") || filePath.startsWith("\\\\");
  return {
    ...item,
    expected_sha256: item.checksum || undefined,
    local_path: isAbsoluteLocalPath ? filePath : undefined,
  };
}

export default function ModelDownloader() {
  const [registryState, setRegistryState] = useState<ModelRegistryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"local" | "huggingface" | "github" | "updates">("local");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<string>("All");
  const [sortState, setSortState] = useState<"name" | "architecture" | "size" | "status" | "source">("name");

  // Selection state for batch downloader / space safety calculations
  const [selectedModels, setSelectedModels] = useState<Record<string, boolean>>({});

  // Dynamic state for verification
  const [verificationStates, setVerificationStates] = useState<Record<string, NativeVerificationStatus>>({});

  // Dynamic download state tracked only from native downloader progress events
  const [downloadStates, setDownloadStates] = useState<
    Record<
      string,
      {
        progress: number;
        speed: string;
        status: ModelDownloadStatus;
        error?: string;
      }
    >
  >({});
  const [localModelIndexEntries, setLocalModelIndexEntries] = useState<Record<string, OpenStemLocalModelIndexEntry>>(
    {},
  );
  const [hardwareEnvironment, setHardwareEnvironment] = useState<HardwareEnvironmentSnapshot | undefined>(undefined);
  const [hardwareCheckStatus, setHardwareCheckStatus] = useState<
    "not_checked" | "checking" | "checked" | "unavailable"
  >("not_checked");
  const [hardwareCheckMessage, setHardwareCheckMessage] = useState("Hardware fit not checked.");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const metadataInputRef = useRef<HTMLInputElement>(null);
  const [selectedArchForImport, setSelectedArchForImport] = useState<
    "VR" | "MDX-Net" | "Demucs" | "RoFormer" | "MDXC" | "Custom"
  >("VR");
  const [selectedImportTargetId, setSelectedImportTargetId] = useState<string>("");
  const [activeRecoveryModelId, setActiveRecoveryModelId] = useState<string>("");
  const [recoveryBusy, setRecoveryBusy] = useState<
    "manual" | "search_folder" | "search_library" | "open_source" | "retry_source" | ""
  >("");
  const [recoveryMessage, setRecoveryMessage] = useState<string>("");
  const [recoveryCandidates, setRecoveryCandidates] = useState<RecoveryCandidate[]>([]);
  const uvrBridge = typeof window !== "undefined" ? (window as any).uvr : null;
  const nativeModelBridgeReady = !!(
    uvrBridge &&
    typeof uvrBridge.verifyModelHash === "function" &&
    typeof uvrBridge.deleteModelFile === "function"
  );
  const nativeDownloadBridgeReady = !!(nativeModelBridgeReady && typeof uvrBridge.downloadModel === "function");
  const nativeImportBridgeReady = !!(nativeModelBridgeReady && typeof uvrBridge.importModelFile === "function");
  const nativeRecoveryBridgeReady = !!(
    nativeModelBridgeReady &&
    typeof uvrBridge.reconnectModelFile === "function" &&
    typeof uvrBridge.searchModelCandidates === "function"
  );
  const nativeCustomLibraryBridgeReady = !!(uvrBridge && typeof uvrBridge.saveCustomModelLibraryEntry === "function");
  const nativeLocalIndexBridgeReady = !!(uvrBridge && typeof uvrBridge.listLocalModelIndex === "function");
  const nativeHardwareBridgeReady = !!(uvrBridge && typeof uvrBridge.checkBackendDetails === "function");

  const refreshLocalModelIndex = async () => {
    const uvr = (window as any).uvr;
    if (!uvr || typeof uvr.listLocalModelIndex !== "function") return;
    try {
      const res = await uvr.listLocalModelIndex();
      if (!res?.success || !Array.isArray(res.index?.entries)) return;
      const nextEntries: Record<string, OpenStemLocalModelIndexEntry> = {};
      res.index.entries.forEach((entry: OpenStemLocalModelIndexEntry) => {
        if (entry?.modelId) nextEntries[entry.modelId] = entry;
      });
      setLocalModelIndexEntries(nextEntries);
    } catch (err) {
      console.error("Local model index load failed:", err);
    }
  };

  const handleCheckHardwareFit = async () => {
    const uvr = (window as any).uvr;
    if (!uvr || typeof uvr.checkBackendDetails !== "function") {
      setHardwareEnvironment({ checked: false, source: "static_only" });
      setHardwareCheckStatus("unavailable");
      setHardwareCheckMessage(
        "Hardware fit not checked. Native Electron backend diagnostics are required for live hardware data.",
      );
      return;
    }

    setHardwareCheckStatus("checking");
    setHardwareCheckMessage("Checking backend hardware details...");
    try {
      const details = await uvr.checkBackendDetails();
      setHardwareEnvironment({
        checked: true,
        systemRamBytes: typeof details?.systemRamBytes === "number" ? details.systemRamBytes : undefined,
        cudaAvailable: !!details?.cudaAvailable,
        mpsAvailable: !!details?.mpsAvailable,
        directmlAvailable: false,
        totalVramBytes: typeof details?.totalVramBytes === "number" ? details.totalVramBytes : undefined,
        canRunCpuAISeparation: !!details?.canRunCpuAISeparation,
        torchInstalled: !!details?.torchInstalled,
        audioSeparatorInstalled: !!details?.audioSeparatorInstalled,
        source: "backend_diagnostics",
      });
      setHardwareCheckStatus("checked");
      setHardwareCheckMessage(
        `Hardware fit checked from backend diagnostics. RAM: ${details?.systemRamDisplay || "unknown"}, VRAM: ${details?.vramDisplay || "unknown"}, CUDA: ${details?.cudaAvailable ? "available" : "not available"}, MPS: ${details?.mpsAvailable ? "available" : "not available"}.`,
      );
    } catch (err: any) {
      setHardwareEnvironment({ checked: false, source: "static_only" });
      setHardwareCheckStatus("unavailable");
      setHardwareCheckMessage(`Hardware fit not checked. Backend diagnostics failed: ${err.message}`);
    }
  };

  // Load models initially and bind listeners
  useEffect(() => {
    const mergePersistedCustomModels = async () => {
      const uvr = (window as any).uvr;
      if (!uvr || typeof uvr.listCustomModelLibrary !== "function") return;
      try {
        const res = await uvr.listCustomModelLibrary();
        if (!res?.success || !Array.isArray(res.entries)) return;
        res.entries.map(customModelEntryToRegistryEntry).forEach((entry) => addModelToRegistry(entry));
      } catch (err) {
        console.error("Custom model library load failed:", err);
      }
    };

    // Copy initially to local registryState immutably; local install state is confirmed below by native IPC only.
    const initializedRegistry = MODEL_REGISTRY.map((m) => ({
      ...m,
      downloaded: m.architecture === "Ensemble" ? m.downloaded : m.catalogLane === "custom" ? m.downloaded : false,
    }));
    setRegistryState(initializedRegistry);

    const handler = () => {
      setRegistryState(
        MODEL_REGISTRY.map((m) => ({
          ...m,
          downloaded: m.architecture === "Ensemble" ? m.downloaded : m.catalogLane === "custom" ? m.downloaded : false,
        })),
      );
    };
    window.addEventListener("modelRegistryChanged", handler);

    // Read initial local file presence and integrity from disk if Electron is active.
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.verifyModelHash === "function") {
      const initCheck = async () => {
        await mergePersistedCustomModels();
        await refreshLocalModelIndex();
        const statuses: Record<string, NativeVerificationStatus> = {};
        const checkedList = await Promise.all(
          MODEL_REGISTRY.map(async (model) => {
            if (
              model.id === "manual_ensemble_preset" ||
              model.id === "ensemble_preset_default" ||
              model.id === "multi_ai_ensemble_preset"
            ) {
              return { ...model };
            }
            try {
              const res: NativeVerifyResult = await uvr.verifyModelHash(toNativeModelPayload(model));
              statuses[model.id] = res.status as NativeVerificationStatus;
              return {
                ...model,
                downloaded: !!res.exists,
                filePath: res.localPath || model.filePath,
                fileSize: res.fileSizeBytes ? formatBytes(res.fileSizeBytes) : model.fileSize,
              };
            } catch (e) {
              statuses[model.id] = "error";
              console.error("verifyModelHash error:", e);
            }
            return { ...model, downloaded: false };
          }),
        );

        setVerificationStates((prev) => ({ ...prev, ...statuses }));
        setRegistryState(checkedList);
      };
      initCheck();
    } else {
      mergePersistedCustomModels().then(() => {
        refreshLocalModelIndex();
        setRegistryState(
          MODEL_REGISTRY.map((m) => ({
            ...m,
            downloaded:
              m.architecture === "Ensemble" ? m.downloaded : m.catalogLane === "custom" ? m.downloaded : false,
          })),
        );
      });
      const statuses: Record<string, NativeVerificationStatus> = {};
      initializedRegistry.forEach((model) => {
        if (model.architecture !== "Ensemble") {
          statuses[model.id] = modelBridgeUnavailableStatus;
        }
      });
      setVerificationStates(statuses);
    }

    // Connect to native backend progress for REAL download indicators
    let unsubscribe: any = null;
    if (uvr && typeof uvr.onBackendProgress === "function") {
      unsubscribe = uvr.onBackendProgress((update: any) => {
        if (update && update.type === "download") {
          const { modelId, progress, speed, status } = update;
          const nextStatus: ModelDownloadStatus =
            status === "downloading" || status === "verifying" || status === "failed" ? status : "idle";
          setDownloadStates((prev) => ({
            ...prev,
            [modelId]: {
              progress: progress || 0,
              speed: speed || "0 MB/s",
              status: nextStatus,
            },
          }));
        }
      });
    }

    return () => {
      window.removeEventListener("modelRegistryChanged", handler);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync checkboxes selection initially for any models that can be downloaded
  useEffect(() => {
    const initialSelection: Record<string, boolean> = {};
    registryState.forEach((m) => {
      if (m.architecture !== "Ensemble" && !m.downloaded && m.downloadUrl) {
        // Exclude manual import / unknown models from start selection
        if (m.sourceType !== "manual_import" && m.sourceType !== "unknown") {
          initialSelection[m.id] = false;
        }
      }
    });
    setSelectedModels((prev) => ({ ...initialSelection, ...prev }));
  }, [registryState]);

  // Helper: Extract details representing where model file comes from
  const getSourceDetails = (item: ModelRegistryEntry) => {
    const url = item.downloadUrl || item.sourceUrl;
    let sourceName = "Unknown/Custom";
    let locationInfo = "Manual Sideload Folder";
    let fileInfo = item.name;
    let urlStatus = url ? "configured" : "missing";
    let checksumStatus = item.checksum ? `available (Expected SHA-256)` : "Expected Expected SHA-256: Not registered";
    let isMutable = false;
    let sourceStatusLabel = "Source Missing";

    if (item.sourceType === "manual_import") {
      sourceName = "Manual Import Only";
      locationInfo = "User's Local Storage Folder";
      urlStatus = "not applicable";
      sourceStatusLabel = "Manual Import";
    } else if (item.sourceType === "unknown" && !url) {
      sourceName = "Unknown Source";
      locationInfo = "Lost or unregistered community path";
      sourceStatusLabel = "Source Missing";
    } else if (url) {
      if (url.includes("huggingface.co")) {
        sourceName = item.sourceType === "hugging_face_space" ? "Hugging Face Space" : "Hugging Face Hub";
        const repoAndFile = url.split("huggingface.co/")[1] || "";
        const parts = repoAndFile.replace("spaces/", "").split("/resolve/main/");
        locationInfo = parts[0] || "MusicSeparation/Ultimate_Vocal_Remover";
        fileInfo = parts[1] ? parts[1].split("/").pop() || item.name : item.name;
        if (url.includes("/resolve/main/")) {
          isMutable = true;
        }
      } else if (url.includes("github.com")) {
        sourceName = item.sourceType === "github_release" ? "GitHub Release" : "GitHub Raw File";
        const repoAndFile = url.split("github.com/")[1] || "";
        const parts = repoAndFile.split("/");
        locationInfo = `${parts[0] || "Anjok07"}/${parts[1] || "ultimatevocalremovergui"}`;
        fileInfo = parts[parts.length - 1] || item.name;
      }

      // Exact Logic from Requirement 9:
      if (url.includes("/resolve/main/")) {
        sourceStatusLabel = "Configured Mutable Source / Hash Required";
      } else {
        if (item.checksum) {
          sourceStatusLabel = "Configured Source / Hash Lock Available";
        } else {
          sourceStatusLabel = "Configured Source / Hash Unavailable";
        }
      }
    } else {
      sourceStatusLabel = "Source Missing";
    }

    return { sourceName, locationInfo, fileInfo, urlStatus, checksumStatus, isMutable, sourceStatusLabel };
  };

  function getProofEligibilityForModel(item: ModelRegistryEntry) {
    const status = verificationStates[item.id] || "not_checked";
    return getModelProofEligibility(item, {
      exists: item.downloaded ? true : status === "missing" ? false : undefined,
      status,
      hashChecked: status === "hash_verified" || status === "hash_mismatch",
      hashMatches: status === "hash_verified",
    });
  }

  // Helper: parse textual weights sizes into float MBs for proper disk calculation
  const parseSizeInMB = (sizeStr: string): number => {
    if (!sizeStr || sizeStr === "N/A" || sizeStr === "Unknown") return 0;
    const match = sizeStr.match(/([\d\.]+)\s*(MB|GB|KB)/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === "GB") return num * 1024;
    if (unit === "KB") return num / 1024;
    return num;
  };

  // Resolve logical card state cleanly
  const getModelState = (item: ModelRegistryEntry) => {
    // 1. Check active downloading/verifying transition states first
    const dState = downloadStates[item.id];
    if (dState) {
      if (dState.status === "downloading") return "Downloading";
      if (dState.status === "verifying") return "Verifying";
      if (dState.status === "failed") return "Download Failed";
    }

    const vState = verificationStates[item.id];
    if (vState === "browser_preview") return "Browser Preview / Not runnable";
    if (vState === "missing") return "Missing";
    if (vState === "installed_not_checked")
      return item.sourceType === "manual_import" ? "Imported / Not verified" : "Installed / Not checked";
    if (vState === "installed_hash_unavailable")
      return item.sourceType === "manual_import" ? "Imported / Hash unavailable" : "Installed / Hash unavailable";
    if (vState === "hash_verified") return "Hash verified";
    if (vState === "hash_mismatch") return "Hash mismatch";
    if (vState === "size_mismatch") return "Size mismatch";
    if (vState === "error") return "Verification error";

    if (item.verifiedStatus === "custom_unverified") return "Custom / Not verified";
    if (item.verifiedStatus === "custom_hash_unavailable") return "Custom / Hash unavailable";
    if (item.verifiedStatus === "verified_local") return "Hash verified";
    if (item.sourceType === "manual_import") {
      return isCustomModel(item) ? "Custom / Hash unavailable" : "Manual Import Required";
    }
    if (!item.downloadUrl) {
      return "Source Missing";
    }
    if (item.verifiedStatus && item.verifiedStatus !== "verified") {
      return getSourceStatusUi(item.verifiedStatus).label;
    }

    return "Missing";
  };

  // Core download trigger. Native Electron bridge is required for downloads and hash verification.
  const triggerDownload = async (item: ModelRegistryEntry) => {
    const uvr = (window as any).uvr;

    if (item.sourceType === "manual_import") {
      alert("Download blocked: weights represent a custom manual import. Direct download cannot be processed.");
      return;
    }

    if (!item.downloadUrl) {
      alert("Download blocked: source URL is missing. Direct download is not possible.");
      return;
    }

    if (item.sourceType === "unknown") {
      alert("Download blocked: unknown source type. Action rejected.");
      return;
    }

    if (item.verifiedStatus !== "verified") {
      alert(`${getSourceStatusUi(item.verifiedStatus).label}: ${getSourceStatusUi(item.verifiedStatus).message}`);
      return;
    }

    // Warnings for checksum & mutability based on Requirement 23
    const isMutable = item.downloadUrl.includes("/resolve/main/");
    if (isMutable && !item.checksum) {
      const proceed = confirm(
        "Warning: mutable source without checksum. Download allowed only as unverified local file. Continue?",
      );
      if (!proceed) return;
    } else if (!item.checksum) {
      const proceed = confirm(
        "Warning: No registered expected checksum for this source. File integrity verification will be unavailable. Continue?",
      );
      if (!proceed) return;
    }

    if (!uvr || typeof uvr.downloadModel !== "function" || typeof uvr.verifyModelHash !== "function") {
      alert(
        "Download blocked: native downloader/verifier unavailable. Browser Preview Only | Native Electron required for model download and verification.",
      );
      return;
    }

    setDownloadStates((prev) => ({
      ...prev,
      [item.id]: {
        progress: 0,
        speed: "0 MB/s",
        status: "downloading",
      },
    }));

    // Electron environment
    try {
      const res = await uvr.downloadModel(item.id, item.downloadUrl, item.architecture, item.name);
      if (res.success) {
        setDownloadStates((prev) => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            progress: 100,
            status: "verifying",
          },
        }));

        await triggerVerifyHash({
          ...item,
          filePath: res.absolutePath || item.filePath,
          downloaded: false,
        });

        window.dispatchEvent(new Event("modelRegistryChanged"));
      } else {
        setDownloadStates((prev) => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            status: "failed",
            error: res.error,
          },
        }));
        refreshLocalModelIndex();
        alert(`Download failed: ${res.error || "Check weights network paths."}`);
      }
    } catch (e: any) {
      setDownloadStates((prev) => ({
        ...prev,
        [item.id]: {
          ...prev[item.id],
          status: "failed",
          error: e.message,
        },
      }));
      refreshLocalModelIndex();
      alert(`Download error: ${e.message}`);
    }
  };

  const clearCacheItem = async (item: ModelRegistryEntry) => {
    const uvr = (window as any).uvr;

    if (!uvr || typeof uvr.deleteModelFile !== "function") {
      alert("Delete blocked: Browser Preview / Not runnable. Native Electron is required to delete local model files.");
      setVerificationStates((prev) => ({ ...prev, [item.id]: modelBridgeUnavailableStatus }));
      return;
    }

    const confirmMsg = "This removes the local model file from disk. Continue?";
    const ok = confirm(confirmMsg);
    if (!ok) return;

    try {
      const res = await uvr.deleteModelFile(toNativeModelPayload(item));
      if (!res || !res.ok) {
        alert(`Failed to delete local weights from disk: ${res?.error || "Unknown error"}`);
        return;
      }
      if (typeof uvr.removeLocalModelIndexEntry === "function") {
        await uvr.removeLocalModelIndexEntry(item.id);
      }
    } catch (err: any) {
      alert(`Failed to delete weights: ${err.message}`);
      return;
    }

    setDownloadStates((prev) => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });
    setVerificationStates((prev) => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });

    setRegistryState((prev) => prev.map((m) => (m.id === item.id ? { ...m, downloaded: false } : m)));
    await refreshLocalModelIndex();
    window.dispatchEvent(new Event("modelRegistryChanged"));
  };

  const triggerVerifyHash = async (item: ModelRegistryEntry) => {
    setVerificationStates((prev) => ({ ...prev, [item.id]: "verifying" }));

    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.verifyModelHash === "function") {
      try {
        const res: NativeVerifyResult = await uvr.verifyModelHash(toNativeModelPayload(item));
        const nextStatus = (res && res.status ? res.status : "error") as NativeVerificationStatus;

        setVerificationStates((prev) => ({ ...prev, [item.id]: nextStatus }));
        setRegistryState((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? {
                  ...m,
                  downloaded: !!res.exists,
                  filePath: res.localPath || m.filePath,
                  fileSize: res.fileSizeBytes ? formatBytes(res.fileSizeBytes) : m.fileSize,
                }
              : m,
          ),
        );
        setDownloadStates((prev) => ({
          ...prev,
          [item.id]: {
            progress: 0,
            speed: "0 MB/s",
            status: "idle",
            error: res.error,
          },
        }));
        await refreshLocalModelIndex();
      } catch (err) {
        console.error("Backend hash verification failed:", err);
        setVerificationStates((prev) => ({ ...prev, [item.id]: "error" }));
        setRegistryState((prev) => prev.map((m) => (m.id === item.id ? { ...m, downloaded: false } : m)));
        setDownloadStates((prev) => ({
          ...prev,
          [item.id]: {
            progress: 0,
            speed: "0 MB/s",
            status: "idle",
            error: err instanceof Error ? err.message : "Hash verification failed",
          },
        }));
        await refreshLocalModelIndex();
      }
    } else {
      alert(
        "Verify blocked: native hash verifier unavailable. Hash verification unavailable — native verifier missing",
      );
      setVerificationStates((prev) => ({ ...prev, [item.id]: modelBridgeUnavailableStatus }));
      setRegistryState((prev) => prev.map((m) => (m.id === item.id ? { ...m, downloaded: false } : m)));
      setDownloadStates((prev) => ({
        ...prev,
        [item.id]: {
          progress: 0,
          speed: "0 MB/s",
          status: "idle",
          error: "Native verifier missing",
        },
      }));
    }
  };

  const openRecoveryPanel = (item: ModelRegistryEntry) => {
    setActiveRecoveryModelId(item.id);
    setRecoveryCandidates([]);
    setRecoveryMessage(
      "Recovery opened. Locate or search for the exact model file; filename matches are candidates only until SHA-256 matches expected metadata.",
    );
  };

  const persistCustomModel = async (
    model: ModelRegistryEntry,
    verification?: NativeVerifyResult | ModelReconnectResult,
  ) => {
    const uvr = (window as any).uvr;
    if (!uvr || typeof uvr.saveCustomModelLibraryEntry !== "function" || !isCustomModel(model)) return;
    const fileSizeBytes =
      verification && "fileSizeBytes" in verification
        ? verification.fileSizeBytes
        : verification && "size" in verification
          ? verification.size
          : undefined;
    const hashMatches =
      verification && "hashMatches" in verification
        ? verification.hashMatches
        : verification?.proofEligibility?.proofEligible;

    const customEntry = modelRegistryEntryToCustomModelEntry(model, {
      actualSha256: verification?.actualSha256,
      expectedSha256: verification?.expectedSha256 || model.checksum,
      fileSizeBytes,
      hashMatches,
      status: verification?.status,
    });

    try {
      const res = await uvr.saveCustomModelLibraryEntry(customEntry);
      if (!res?.success) {
        setRecoveryMessage(`Custom library metadata was not saved: ${res?.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setRecoveryMessage(`Custom library metadata save failed: ${err.message}`);
    }
  };

  const applyReconnectResult = (item: ModelRegistryEntry, res: ModelReconnectResult) => {
    const rawStatus = res.verification?.status || res.status || "error";
    if (rawStatus && rawStatus !== "cancelled") {
      setVerificationStates((prev) => ({ ...prev, [item.id]: rawStatus as NativeVerificationStatus }));
    }

    if (res.success) {
      const nextPath = res.absolutePath || item.filePath;
      const nextFileSize = res.fileSize || (res.size ? formatBytes(res.size) : item.fileSize);
      const globalModel = MODEL_REGISTRY.find((model) => model.id === item.id);
      if (globalModel) {
        globalModel.downloaded = true;
        globalModel.filePath = nextPath;
        globalModel.fileSize = nextFileSize;
        if (isCustomModel(globalModel) && res.actualSha256) {
          globalModel.actualSha256 = res.actualSha256;
          globalModel.verifiedStatus = res.proofEligibility?.proofEligible ? "verified_local" : (rawStatus as any);
        }
      }
      const updatedModel = {
        ...item,
        downloaded: true,
        filePath: nextPath,
        fileSize: nextFileSize,
        actualSha256: res.actualSha256 || item.actualSha256,
        verifiedStatus:
          isCustomModel(item) && res.proofEligibility?.proofEligible ? "verified_local" : item.verifiedStatus,
      };
      setRegistryState((prev) =>
        prev.map((model) =>
          model.id === item.id
            ? {
                ...model,
                downloaded: true,
                filePath: nextPath,
                fileSize: nextFileSize,
                actualSha256: res.actualSha256 || model.actualSha256,
                verifiedStatus:
                  isCustomModel(model) && res.proofEligibility?.proofEligible ? "verified_local" : model.verifiedStatus,
              }
            : model,
        ),
      );
      persistCustomModel(updatedModel, res);
      refreshLocalModelIndex();
      setRecoveryMessage(
        res.message ||
          (res.proofEligibility?.proofEligible
            ? "Model reconnected and SHA-256 verified."
            : "Model reconnected, but proof remains blocked."),
      );
      window.dispatchEvent(new Event("modelRegistryChanged"));
      return;
    }

    setRecoveryMessage(
      res.error || res.message || "Reconnect blocked. The selected file was not accepted as a verified model.",
    );
  };

  const handleManualReconnect = async (item: ModelRegistryEntry, approvedSourcePath?: string) => {
    const uvr = (window as any).uvr;
    if (!uvr || typeof uvr.reconnectModelFile !== "function") {
      setVerificationStates((prev) => ({ ...prev, [item.id]: modelBridgeUnavailableStatus }));
      setRecoveryMessage(
        "Reconnect blocked: Browser Preview / Not runnable. Native Electron is required for local file relinking.",
      );
      return;
    }

    setRecoveryBusy("manual");
    try {
      const res: ModelReconnectResult = await uvr.reconnectModelFile(toNativeModelPayload(item), approvedSourcePath);
      if (res.status === "cancelled") {
        setRecoveryMessage(res.message || "Reconnect cancelled.");
        return;
      }
      applyReconnectResult(item, res);
    } catch (err: any) {
      setRecoveryMessage(`Reconnect failed: ${err.message}`);
    } finally {
      setRecoveryBusy("");
    }
  };

  const handleSearchCandidates = async (item: ModelRegistryEntry, mode: "select-folder" | "model-library") => {
    const uvr = (window as any).uvr;
    if (!uvr || typeof uvr.searchModelCandidates !== "function") {
      setVerificationStates((prev) => ({ ...prev, [item.id]: modelBridgeUnavailableStatus }));
      setRecoveryMessage(
        "Candidate search blocked: Browser Preview / Not runnable. Native Electron is required for folder search.",
      );
      return;
    }

    setRecoveryBusy(mode === "model-library" ? "search_library" : "search_folder");
    try {
      const res: ModelCandidateSearchResult = await uvr.searchModelCandidates(toNativeModelPayload(item), {
        mode,
        maxDepth: 4,
      });
      if (!res.success) {
        setRecoveryCandidates([]);
        setRecoveryMessage(res.error || res.message || "Candidate search cancelled or blocked.");
        return;
      }
      setRecoveryCandidates(res.candidates || []);
      setRecoveryMessage(res.message || `Searched ${res.rootPath || "selected folder"}.`);
    } catch (err: any) {
      setRecoveryMessage(`Candidate search failed: ${err.message}`);
    } finally {
      setRecoveryBusy("");
    }
  };

  const handleOpenSourcePage = async (item: ModelRegistryEntry) => {
    const url = item.downloadUrl || item.sourceUrl;
    if (!url) {
      setRecoveryMessage("No source page is configured for this model.");
      return;
    }

    const uvr = (window as any).uvr;
    setRecoveryBusy("open_source");
    try {
      if (uvr && typeof uvr.openExternalUrl === "function") {
        const res = await uvr.openExternalUrl(url);
        setRecoveryMessage(
          res?.success
            ? "Opened configured source page."
            : `Source page open blocked: ${res?.error || "Unknown error"}`,
        );
      } else if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
        setRecoveryMessage(
          "Opened source page in browser preview. This does not verify source access or download weights.",
        );
      }
    } catch (err: any) {
      setRecoveryMessage(`Source page open failed: ${err.message}`);
    } finally {
      setRecoveryBusy("");
    }
  };

  const handleRetrySourceCheck = (item: ModelRegistryEntry) => {
    setRecoveryBusy("retry_source");
    setRecoveryMessage(
      `Retry source check is not an in-app downloader shortcut yet. Use npm.cmd run audit:model-sources to reclassify ${item.id}; keep this model blocked until source integrity and local SHA-256 match.`,
    );
    setRecoveryBusy("");
  };

  const handleRemoveCustomEntry = async (item: ModelRegistryEntry) => {
    if (!isCustomModel(item)) return;
    const ok = confirm("Remove this custom model metadata entry? The local model file will not be deleted.");
    if (!ok) return;

    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.removeCustomModelLibraryEntry === "function") {
      try {
        const res = await uvr.removeCustomModelLibraryEntry(item.id);
        if (!res?.success) {
          alert(`Remove custom entry failed: ${res?.error || "Unknown error"}`);
          return;
        }
      } catch (err: any) {
        alert(`Remove custom entry failed: ${err.message}`);
        return;
      }
    }

    const index = MODEL_REGISTRY.findIndex((model) => model.id === item.id);
    if (index >= 0) MODEL_REGISTRY.splice(index, 1);
    setRegistryState((prev) => prev.filter((model) => model.id !== item.id));
    if (activeRecoveryModelId === item.id) {
      setActiveRecoveryModelId("");
      setRecoveryCandidates([]);
      setRecoveryMessage("");
    }
    window.dispatchEvent(new Event("modelRegistryChanged"));
  };

  // Custom weight upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check missing native block
    alert("Import blocked: native file import unavailable. Native Electron required for sideloading.");
    e.target.value = "";
  };

  const handleMetadataJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validation = validateImportedModelMetadata(parsed);
      if (!validation.ok || !validation.metadata) {
        alert(`Metadata import blocked:\n${validation.errors.join("\n")}`);
        return;
      }

      const customEntry = createCustomModelEntryFromMetadata({
        id: validation.metadata.id
          ? `custom_metadata_${validation.metadata.id.replace(/[^a-z0-9_-]/gi, "_")}`
          : undefined,
        displayName: validation.metadata.name,
        filename: validation.metadata.fileName,
        architecture: validation.metadata.architecture,
        backend: validation.metadata.requiredBackend,
        expectedSha256: validation.metadata.expectedSha256,
        expectedSizeBytes: validation.metadata.expectedSizeBytes,
        sourceUrl: validation.metadata.sourceUrl,
        sourceProject: validation.metadata.sourceProject,
        license: validation.metadata.license,
        userNotes: "Imported custom metadata. Reconnect a local file before proof eligibility can be evaluated.",
      });
      const registryEntry = customModelEntryToRegistryEntry(customEntry);
      addModelToRegistry(registryEntry);
      setRegistryState((prev) => {
        const withoutExisting = prev.filter((model) => model.id !== registryEntry.id);
        return [...withoutExisting, registryEntry];
      });
      setActiveRecoveryModelId(registryEntry.id);
      setRecoveryMessage(
        "Custom metadata imported. Proof remains blocked until a local file SHA-256 matches the expected value.",
      );

      const uvr = (window as any).uvr;
      if (uvr && typeof uvr.saveCustomModelLibraryEntry === "function") {
        const saveResult = await uvr.saveCustomModelLibraryEntry(customEntry);
        if (!saveResult?.success) {
          setRecoveryMessage(
            `Metadata imported into this session, but native persistence failed: ${saveResult?.error || "Unknown error"}`,
          );
        }
      }
    } catch (err: any) {
      alert(`Metadata import blocked: ${err.message}`);
    }
  };

  // Check disk calculations based on checkboxes selection
  const totalSelectedDownloadMB = Object.keys(selectedModels)
    .filter((id) => selectedModels[id])
    .reduce((acc, id) => {
      const model = registryState.find((m) => m.id === id);
      if (model && !model.downloaded) {
        return acc + parseSizeInMB(model.fileSize);
      }
      return acc;
    }, 0);

  const estimatedRemainingMB = FREE_SPACE_MB - totalSelectedDownloadMB;
  const isOutOfSpace = estimatedRemainingMB < 0;

  // Render checkbox selection for batch operations
  const handleToggleModelSelection = (id: string) => {
    setSelectedModels((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAll = (modelsToSelect: ModelRegistryEntry[]) => {
    const allSelected = modelsToSelect.every((m) => selectedModels[m.id]);
    const updated: Record<string, boolean> = { ...selectedModels };
    modelsToSelect.forEach((m) => {
      if (!m.downloaded && m.downloadUrl && m.sourceType !== "manual_import" && m.sourceType !== "unknown") {
        updated[m.id] = !allSelected;
      }
    });
    setSelectedModels(updated);
  };

  const importTargetOptions = registryState.filter((model) => model.architecture === selectedArchForImport);

  const handleBatchDownloadSelected = () => {
    if (!nativeDownloadBridgeReady) {
      alert("Batch download blocked: native downloader/verifier unavailable. Browser Preview / Not runnable.");
      return;
    }

    if (isOutOfSpace) {
      alert("Blocker Triggered: Not enough cache space available to complete batch weights pulls!");
      return;
    }

    const targets = registryState.filter((m) => selectedModels[m.id] && !m.downloaded && m.downloadUrl);
    if (targets.length === 0) {
      alert("No downloadable weight entries currently selected.");
      return;
    }

    targets.forEach((m) => triggerDownload(m));
  };

  // Base list of models (ignoring raw ensembles presets which are UI wrappers)
  const baseModels = registryState.filter((item) => item.architecture !== "Ensemble");
  const modelLibrarySummary = summarizeModelLibrary(baseModels);
  const localIndexEntryList = Object.values(localModelIndexEntries);
  const localIndexProofEligible = localIndexEntryList.filter((entry) => entry.proofEligible).length;
  const localIndexVerificationPending = localIndexEntryList.filter(
    (entry) =>
      entry.verificationStatus === "download_complete_verification_pending" ||
      entry.verificationStatus === "installed_not_checked",
  ).length;
  const localIndexPartialDownloads = localIndexEntryList.filter(
    (entry) => entry.verificationStatus === "partial_download",
  ).length;

  // Filtering Logic
  const filteredModels = baseModels.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.architecture.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filters matching requirements
    if (filterState === "All") return true;
    if (filterState === "Installed") return item.downloaded;
    if (filterState === "Missing") return !item.downloaded;
    if (filterState === "Download Available")
      return (
        !item.downloaded &&
        !!item.downloadUrl &&
        item.verifiedStatus === "verified" &&
        item.sourceType !== "manual_import" &&
        item.sourceType !== "unknown"
      );
    if (filterState === "Manual Import Required")
      return item.sourceType === "manual_import" || (!item.downloadUrl && item.sourceType === "unknown");
    if (filterState === "Update Available") return !!item.updateAvailable;

    // Architectures
    if (filterState === "VR") return item.architecture === "VR";
    if (filterState === "MDX-Net") return item.architecture === "MDX-Net";
    if (filterState === "Demucs") return item.architecture === "Demucs";
    if (filterState === "RoFormer") return item.architecture === "RoFormer";
    if (filterState === "MDXC") return item.architecture === "MDXC";
    if (filterState === "Custom") return item.architecture === "Custom";

    return true;
  });

  // Sorting Logic
  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortState === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortState === "architecture") {
      return a.architecture.localeCompare(b.architecture);
    }
    if (sortState === "size") {
      return parseSizeInMB(b.fileSize) - parseSizeInMB(a.fileSize);
    }
    if (sortState === "status") {
      const stateA = getModelState(a);
      const stateB = getModelState(b);
      return stateA.localeCompare(stateB);
    }
    if (sortState === "source") {
      const sourceA = getSourceDetails(a).sourceName;
      const sourceB = getSourceDetails(b).sourceName;
      return sourceA.localeCompare(sourceB);
    }
    return 0;
  });

  // Split sorted models by requested tab content
  const localRegistryModels = sortedModels.filter((m) => m.downloaded);
  const huggingFaceTabModels = sortedModels.filter(
    (m) =>
      m.sourceType === "hugging_face_repo" ||
      m.sourceType === "hugging_face_space" ||
      (!m.sourceType && m.downloadUrl?.includes("huggingface.co")),
  );
  const gitHubTabModels = sortedModels.filter(
    (m) =>
      m.sourceType === "github_release" ||
      m.sourceType === "github_raw" ||
      (!m.sourceType && m.downloadUrl?.includes("github.com")),
  );

  // Under the "Updates" tab, model cards are only local registry candidates.
  // A real update still requires a trusted manifest, source access, expected SHA-256, and local hash verification.
  const updatesTabModels = baseModels.filter((m) => m.downloaded && m.downloadUrl && m.updateAvailable);
  const [applicationUpdateLane, modelCatalogUpdateLane, modelWeightUpdateLane] = UPDATE_READINESS_LANES;

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "Hash verified":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "Installed / Not checked":
      case "Imported / Not verified":
        return "bg-amber-500/10 border-amber-500/30 text-amber-300";
      case "Downloading":
      case "Verifying":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse";
      case "Manual Import Required":
      case "Custom / Not verified":
        return "bg-indigo-500/15 border-indigo-500/30 text-indigo-400";
      case "Update Available":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
      case "Auth Required":
      case "Access Denied / Gated":
      case "Broken Link":
      case "Source Unavailable":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "Rate Limited":
      case "Configured / Not Checked":
      case "Download Available":
      case "Hash Missing":
      case "Installed / Hash unavailable":
      case "Imported / Hash unavailable":
      case "Custom / Hash unavailable":
      case "Browser Preview / Not runnable":
        return "bg-slate-500/10 border-white/10 text-slate-400";
      case "Hash mismatch":
      case "Size mismatch":
      case "Verification error":
      case "Download Failed":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "Source Missing":
      case "Missing":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      default:
        return "bg-white/5 border-white/5 text-slate-400";
    }
  };

  const getCompatibilityBadgeStyles = (gate: ModelCompatibilityGateResult) => {
    if (gate.status === "compatible") return "bg-emerald-500/10 border-emerald-500/25 text-emerald-300";
    if (gate.status === "compatible_needs_metadata") return "bg-amber-500/10 border-amber-500/25 text-amber-300";
    if (gate.status === "blocked_backend" || gate.status === "invalid_metadata")
      return "bg-rose-500/10 border-rose-500/25 text-rose-300";
    return "bg-orange-500/10 border-orange-500/25 text-orange-300";
  };

  const getHardwareBadgeStyles = (fit: ModelHardwareFitResult) => {
    if (fit.warningLevel === "none") return "bg-emerald-500/10 border-emerald-500/25 text-emerald-300";
    if (fit.warningLevel === "info") return "bg-sky-500/10 border-sky-500/25 text-sky-300";
    if (fit.warningLevel === "warning") return "bg-amber-500/10 border-amber-500/25 text-amber-300";
    return "bg-rose-500/10 border-rose-500/25 text-rose-300";
  };

  const renderCompatibilityHardwarePanel = (item: ModelRegistryEntry) => {
    const compatibilityGate = getModelCompatibilityGate(item);
    const hardwareFit = getModelHardwareFit(item, hardwareEnvironment);
    const supportedExtensions =
      item.supportedExtensions || [item.name.slice(item.name.lastIndexOf("."))].filter(Boolean);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px] font-mono">
        <div className="rounded-lg border border-white/5 bg-black/25 p-2.5 space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 uppercase font-bold">Compatibility</span>
            <span
              className={`border px-1.5 py-0.5 rounded font-bold ${getCompatibilityBadgeStyles(compatibilityGate)}`}
            >
              {compatibilityGate.label}
            </span>
          </div>
          <div>
            Backend: <span className="text-slate-200">{item.requiredBackend || "not declared"}</span>
          </div>
          <div>
            Architecture: <span className="text-slate-200">{item.architecture}</span>
          </div>
          <div>
            Supported file type:{" "}
            <span className="text-slate-200">
              {supportedExtensions.length ? supportedExtensions.join(", ") : "missing"}
            </span>
          </div>
          <div>
            Supported devices:{" "}
            <span className="text-slate-200">
              CPU{item.gpuSupport ? ", GPU backend-dependent / Not locally proven" : ""}
            </span>
          </div>
          {compatibilityGate.blockers.length > 0 ? (
            <div className="text-rose-300 break-words">Blockers: {compatibilityGate.blockers.join(", ")}</div>
          ) : (
            <div className="text-emerald-300">Compatible with OpenStem model-library management.</div>
          )}
          {compatibilityGate.warnings.length > 0 && (
            <div className="text-amber-300 break-words">Warnings: {compatibilityGate.warnings.join(" ")}</div>
          )}
        </div>

        <div className="rounded-lg border border-white/5 bg-black/25 p-2.5 space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 uppercase font-bold">Hardware Fit</span>
            <span className={`border px-1.5 py-0.5 rounded font-bold ${getHardwareBadgeStyles(hardwareFit)}`}>
              {getHardwareFitBadgeLabel(hardwareFit)}
            </span>
          </div>
          <div>
            Estimate: <span className="text-slate-200">{hardwareFit.estimateBasis}</span>
          </div>
          <div>
            Estimated RAM: <span className="text-slate-200">{hardwareFit.estimatedRamRequiredGb ?? "unknown"} GB</span>
          </div>
          <div>
            Estimated VRAM:{" "}
            <span className="text-slate-200">
              {hardwareFit.estimatedVramRequiredGb
                ? `${hardwareFit.estimatedVramRequiredGb} GB`
                : "not required / unknown"}
            </span>
          </div>
          <div>
            Recommended device: <span className="text-slate-200">{hardwareFit.recommendedDevice}</span>
          </div>
          <div>
            CPU usable: <span className="text-slate-200">{String(hardwareFit.cpuUsable)}</span>
          </div>
          <div
            className={
              hardwareFit.warningLevel === "severe" || hardwareFit.warningLevel === "warning"
                ? "text-amber-300 break-words"
                : "text-slate-400 break-words"
            }
          >
            {hardwareFit.userMessage}
          </div>
        </div>
      </div>
    );
  };

  const activeRecoveryModel = activeRecoveryModelId
    ? registryState.find((model) => model.id === activeRecoveryModelId)
    : undefined;
  const activeRecoverySourceInfo = activeRecoveryModel ? getSourceDetails(activeRecoveryModel) : undefined;
  const activeRecoverySourceStatusUi = activeRecoveryModel
    ? getSourceStatusUi(activeRecoveryModel.verifiedStatus)
    : undefined;
  const activeRecoveryProofEligibility = activeRecoveryModel
    ? getProofEligibilityForModel(activeRecoveryModel)
    : undefined;
  const activeRecoveryWorkflow = activeRecoveryModel ? buildSourceResolutionWorkflow(activeRecoveryModel) : undefined;

  return (
    <div className="p-6 rounded-2xl bg-[#0a0c14]/40 border border-[#ffffff]/10 shadow-glass-shadow shadow-glass-inset backdrop-blur-xl space-y-6">
      {/* Integrity Guard Header Section */}
      <div className="min-w-0 w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4 flex-wrap w-full min-w-0">
          <div className="min-w-0 flex-1 break-words">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-bold text-white font-display flex flex-wrap items-center gap-2 whitespace-normal break-words leading-tight">
                <DownloadCloud className="w-5 h-5 text-blue-400 animate-pulse shrink-0" />
                <span className="break-words">OpenStem Model Manager & Proof Gate</span>
              </h2>
              <HelpToggle sectionId="model_downloader" label="Show Help" className="px-2.5 py-1" />
            </div>
            <p className="text-xs text-slate-400 mt-1 whitespace-normal break-words">
              Install and inspect local weights without treating them as proof until SHA-256 and source metadata match a
              real local file.
            </p>
            <div className="mt-2 inline-flex max-w-full items-center rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
              Supports Audio Separator path: add or verify a model before running separation.
            </div>
            <HelpText
              sectionId="model_downloader"
              text="Help: The downloader can verify integrity only when a local file exists and a known checksum is registered. If a checksum is unavailable, the app can confirm file presence but not cryptographic integrity."
            />
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 w-full sm:w-auto bg-black/40 border border-white/5 p-3 rounded-lg text-xs font-mono min-w-0 break-words whitespace-normal border-dashed border-slate-500/20 hover:border-slate-500/40 transition-all">
            <AccessibleTooltipWrapper
              content="Static cache planning estimate / Not live disk check"
              position="top"
              className="w-full"
            >
              <div className="flex flex-col sm:items-end gap-1 text-slate-300 w-full cursor-help">
                <div className="flex items-center gap-2 text-slate-350 justify-between sm:justify-end">
                  <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="font-bold">Disk Space Estimate</span>
                </div>
                <div className="text-[11px] text-slate-400 font-bold">4.8 GB Static cache limit</div>
                <div className="text-[10px] text-slate-500 italic">Not checked / Not live drive check</div>
              </div>
            </AccessibleTooltipWrapper>
            {totalSelectedDownloadMB > 0 && (
              <div className="text-[10px] mt-1 space-y-0.5 border-t border-white/5 pt-1.5 w-full text-left sm:text-right">
                <div className="text-slate-400">
                  Selected Size: <span className="text-white font-bold">{totalSelectedDownloadMB.toFixed(1)} MB</span>
                </div>
                <div className={isOutOfSpace ? "text-rose-400 font-bold" : "text-green-400"}>
                  {isOutOfSpace ? (
                    <span className="flex items-center gap-1 justify-start sm:justify-end">
                      <AlertTriangle className="w-3 h-3 text-rose-400 inline" />
                      Not enough cache space
                    </span>
                  ) : (
                    <span>Est. Remaining: {estimatedRemainingMB.toFixed(1)} MB</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Tabs Row */}
      <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab("local");
            setFilterState("All");
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "local"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "bg-white/[0.02] text-slate-400 border border-transparent hover:bg-white/[0.05]"
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Local Weights ({baseModels.filter((m) => m.downloaded).length})
        </button>
        <button
          onClick={() => {
            setActiveTab("huggingface");
            setFilterState("All");
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "huggingface"
              ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
              : "bg-white/[0.02] text-slate-400 border border-transparent hover:bg-white/[0.05]"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Hugging Face Hub
        </button>
        <button
          onClick={() => {
            setActiveTab("github");
            setFilterState("All");
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "github"
              ? "bg-teal-600/20 text-teal-400 border border-teal-500/30"
              : "bg-white/[0.02] text-slate-400 border border-transparent hover:bg-white/[0.05]"
          }`}
        >
          <Github className="w-3.5 h-3.5" />
          GitHub / Releases
        </button>
        <button
          onClick={() => {
            setActiveTab("updates");
            setFilterState("All");
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 shrink-0  position-relative ${
            activeTab === "updates"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              : "bg-white/[0.02] text-slate-400 border border-transparent hover:bg-white/[0.05]"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Updates
          {updatesTabModels.length > 0 && (
            <span className="ml-1 bg-amber-500 text-black px-1.5 py-0.5 rounded-full text-[9px] font-bold">
              {updatesTabModels.length}
            </span>
          )}
        </button>
      </div>{" "}
      {/* Registry Status Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="p-3 bg-blue-500/[0.03] border border-blue-500/15 rounded-xl text-xs text-slate-300 font-mono space-y-1">
          <div className="text-blue-300 font-bold uppercase">Lane 1 - Curated OpenStem Catalog</div>
          <div className="text-slate-400 text-[10px]">
            UVR5-style simple path: choose a known family/model, inspect source status, reconnect or download only when
            source and SHA-256 rules allow it.
          </div>
          <div className="text-[10px] text-slate-500">
            Curated entries: {modelLibrarySummary.curatedTotal} | Blocked source/proof entries:{" "}
            {modelLibrarySummary.curatedBlocked}
          </div>
        </div>
        <div className="p-3 bg-amber-500/[0.03] border border-amber-500/15 rounded-xl text-xs text-slate-300 font-mono space-y-1">
          <div className="text-amber-300 font-bold uppercase">Lane 2 - User Custom Model Library</div>
          <div className="text-slate-400 text-[10px]">
            Advanced lane: import metadata, add a local file, reconnect moved files, and store notes. Custom models stay
            blocked until expected SHA-256 matches.
          </div>
          <div className="text-[10px] text-slate-500">
            Custom entries: {modelLibrarySummary.customTotal} | Proof eligible:{" "}
            {modelLibrarySummary.customProofEligible} | Need metadata: {modelLibrarySummary.customNeedsMetadata}
          </div>
          <div className="text-[10px] text-slate-500">
            Custom metadata persistence:{" "}
            {nativeCustomLibraryBridgeReady ? "Native userData store active" : "Browser Preview / session-only"}
          </div>
        </div>
        <div className="p-3 bg-emerald-500/[0.03] border border-emerald-500/15 rounded-xl text-xs text-slate-300 font-mono space-y-1">
          <div className="text-emerald-300 font-bold uppercase">Managed Local Model Index</div>
          <div className="text-slate-400 text-[10px]">
            Local-AI-style cache ledger: local path, actual SHA-256, file size, verification date, source check, and
            repair history.
          </div>
          <div className="text-[10px] text-slate-500">
            Index records: {localIndexEntryList.length} | Pending verification: {localIndexVerificationPending} | Proof
            eligible: {localIndexProofEligible}
          </div>
          <div className="text-[10px] text-slate-500">
            Partial downloads: {localIndexPartialDownloads} | Store:{" "}
            {nativeLocalIndexBridgeReady ? "openstem-models.local.json in app data" : "Browser Preview / session-only"}
          </div>
        </div>
      </div>
      <div className="p-4 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xl text-xs text-slate-300 font-mono space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-emerald-300 font-bold uppercase tracking-wider">Golden CPU Proof Model Lane</div>
            <div className="text-slate-400 leading-relaxed">
              Select one proof model candidate, reconnect a local proof model file, verify SHA-256, then use `npm.cmd
              run proof:check` before attempting CPU E2E proof.
            </div>
          </div>
          <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded font-bold uppercase shrink-0">
            Golden proof model not ready - expected SHA-256 match required
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[10px]">
          <div className="p-2 bg-black/25 border border-white/5 rounded">
            <div className="text-slate-200 font-bold">1. Select proof model candidate</div>
            <div className="text-slate-500">
              Use curated metadata or import metadata JSON with source, license, and expected SHA-256.
            </div>
          </div>
          <div className="p-2 bg-black/25 border border-white/5 rounded">
            <div className="text-slate-200 font-bold">2. Reconnect local proof model file</div>
            <div className="text-slate-500">
              Use one local file or search a selected folder. Filename matches are candidates only.
            </div>
          </div>
          <div className="p-2 bg-black/25 border border-white/5 rounded">
            <div className="text-slate-200 font-bold">3. Verify SHA-256</div>
            <div className="text-slate-500">
              A local file becomes usable only when actual SHA-256 matches expected SHA-256.
            </div>
          </div>
          <div className="p-2 bg-black/25 border border-white/5 rounded">
            <div className="text-slate-200 font-bold">4. CPU proof readiness</div>
            <div className="text-slate-500">
              Golden proof model ready for CPU E2E proof only after model, backend, input, and output checks pass.
            </div>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 leading-relaxed">
          Golden proof model ready for CPU E2E proof is a readiness state, not Beta approval. A proof pass still
          requires `electron-shell/test-ai-e2e.cjs` exit code 0 and verified non-empty AI output stems.
        </div>
      </div>
      <div className="p-3 bg-[#0c0f1d]/60 border border-white/5 rounded-xl text-[10px] sm:text-xs text-slate-300 flex flex-col lg:flex-row lg:items-center justify-between gap-3 font-mono">
        <div className="space-y-1 min-w-0">
          <div className="text-slate-200 font-bold uppercase">Compatibility vs Hardware Fit</div>
          <div className="text-slate-400">
            OpenStem separates model compatibility from hardware fit. Large or GPU-heavy models show warnings, not
            automatic rejection, unless backend, source metadata, or SHA-256 rules fail.
          </div>
          <div className="text-slate-500 break-words">{hardwareCheckMessage}</div>
        </div>
        <button
          onClick={handleCheckHardwareFit}
          disabled={!nativeHardwareBridgeReady || hardwareCheckStatus === "checking"}
          className={`px-3 py-1.5 border rounded text-xs font-mono transition-all shrink-0 ${
            nativeHardwareBridgeReady && hardwareCheckStatus !== "checking"
              ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-300 cursor-pointer"
              : "bg-slate-900/60 border-white/5 text-slate-500 cursor-not-allowed"
          }`}
        >
          {!nativeHardwareBridgeReady
            ? "Browser Preview / Not runnable"
            : hardwareCheckStatus === "checking"
              ? "Checking..."
              : "Check Hardware Fit"}
        </button>
      </div>
      <div className="p-3 bg-[#0c0f1d]/60 border border-white/5 rounded-xl text-[10px] sm:text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono leading-relaxed">
        <div className="space-y-1">
          <div className="text-[#38bdf8] font-bold">● Configured Source / Not Checked</div>
          <div className="text-slate-400 text-[10px]">
            URL declared in static catalog configuration (integrity and presence remain unconfirmed).
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-purple-400 font-bold">● Configured Mutable Source / Hash Required</div>
          <div className="text-slate-400 text-[10px]">
            URL points to an active main-branch endpoint (/resolve/main/). Subject to remote changes.
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sky-400 font-bold">● Configured Source / Hash Lock Available</div>
          <div className="text-slate-400 text-[10px]">
            URL points to a tagged release or stable commit. Remote content is unlikely to mutate.
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-emerald-400 font-bold">● Hash verified</div>
          <div className="text-slate-400 text-[10px]">
            Local weights file exists, SHA-256 matches exact physical checksum entry.
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-slate-500 font-bold">● Installed / Hash unavailable</div>
          <div className="text-slate-400 text-[10px]">
            Local weights file exists, but it is not proof-eligible until expected SHA-256 source metadata is registered
            and matched.
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-amber-500 font-bold">● Manual Import Required / Source Missing</div>
          <div className="text-slate-400 text-[10px]">
            No predefined remote download source registered. Safe side-loading or custom import is required.
          </div>
        </div>
      </div>
      {/* Missing-resource recovery panel */}
      {activeRecoveryModel &&
        activeRecoverySourceInfo &&
        activeRecoverySourceStatusUi &&
        activeRecoveryProofEligibility &&
        activeRecoveryWorkflow && (
          <div className="bg-black/35 border border-amber-500/20 rounded-xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-mono uppercase bg-amber-500/10 border border-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                    {activeRecoveryWorkflow.title}
                  </span>
                  <span
                    className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getSourceStatusButtonClasses(activeRecoveryModel.verifiedStatus)}`}
                  >
                    {activeRecoverySourceStatusUi.label}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    Code: {activeRecoverySourceStatusUi.diagnosticCode}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-100 font-display break-words">
                  {activeRecoveryModel.name}
                </h3>
                <p className="mt-1 text-[11px] text-slate-400 max-w-4xl">
                  Missing-resource recovery follows the creative-app relink pattern: identify the missing model, locate
                  candidates, compare filename, size, and SHA-256, then accept only verified matches for proof.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveRecoveryModelId("");
                  setRecoveryCandidates([]);
                  setRecoveryMessage("");
                }}
                className="px-2.5 py-1 border border-white/10 rounded text-[11px] font-mono text-slate-400 hover:text-white hover:border-white/20 transition-all"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-[10px] font-mono text-slate-400">
              <div className="space-y-1 bg-black/25 border border-white/5 rounded-lg p-3 min-w-0">
                <div>
                  Expected filename: <span className="text-slate-200 select-all">{activeRecoveryModel.name}</span>
                </div>
                <div className="break-all">
                  Expected SHA-256:{" "}
                  <span className={activeRecoveryModel.checksum ? "text-emerald-300 select-all" : "text-amber-300"}>
                    {activeRecoveryModel.checksum || "missing"}
                  </span>
                </div>
                <div>
                  Expected size:{" "}
                  <span className="text-slate-200">
                    {activeRecoveryModel.expectedSizeBytes
                      ? formatBytes(activeRecoveryModel.expectedSizeBytes)
                      : activeRecoveryModel.fileSize || "Unknown"}
                  </span>
                </div>
                <div>
                  Source project: <span className="text-slate-200">{activeRecoverySourceInfo.locationInfo}</span>
                </div>
                <div>
                  License: <span className="text-slate-200">{activeRecoveryModel.license || "missing"}</span>
                </div>
              </div>
              <div className="space-y-1 bg-black/25 border border-white/5 rounded-lg p-3 min-w-0">
                <div className="break-all">
                  Source URL:{" "}
                  <span className="text-slate-200 select-all">
                    {activeRecoveryModel.downloadUrl || activeRecoveryModel.sourceUrl || "missing"}
                  </span>
                </div>
                <div className="break-all">
                  Current local path:{" "}
                  <span className="text-slate-200 select-all">{activeRecoveryModel.filePath || "not connected"}</span>
                </div>
                <div>
                  Source status: <span className="text-amber-300">{activeRecoverySourceStatusUi.label}</span>
                </div>
                <div>
                  Proof gate:{" "}
                  <span
                    className={activeRecoveryProofEligibility.proofEligible ? "text-emerald-300" : "text-amber-300"}
                  >
                    {activeRecoveryProofEligibility.proofEligible
                      ? "Eligible"
                      : `Blocked / ${activeRecoveryProofEligibility.reason}`}
                  </span>
                </div>
                <div className="text-slate-500">{activeRecoveryProofEligibility.displayMessage}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              <button
                onClick={() => handleManualReconnect(activeRecoveryModel)}
                disabled={!nativeRecoveryBridgeReady || recoveryBusy !== ""}
                className={`py-2 px-3 border rounded text-[11px] font-mono font-bold uppercase transition-all ${
                  nativeRecoveryBridgeReady && recoveryBusy === ""
                    ? "bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border-emerald-500/30 cursor-pointer"
                    : "bg-slate-900/60 text-slate-500 border-white/5 cursor-not-allowed"
                }`}
              >
                {recoveryBusy === "manual" ? "Checking..." : "Reconnect Local File"}
              </button>
              <button
                onClick={() => handleSearchCandidates(activeRecoveryModel, "select-folder")}
                disabled={!nativeRecoveryBridgeReady || recoveryBusy !== ""}
                className={`py-2 px-3 border rounded text-[11px] font-mono font-bold uppercase transition-all ${
                  nativeRecoveryBridgeReady && recoveryBusy === ""
                    ? "bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border-blue-500/30 cursor-pointer"
                    : "bg-slate-900/60 text-slate-500 border-white/5 cursor-not-allowed"
                }`}
              >
                {recoveryBusy === "search_folder" ? "Searching..." : "Search Selected Folder"}
              </button>
              <button
                onClick={() => handleSearchCandidates(activeRecoveryModel, "model-library")}
                disabled={!nativeRecoveryBridgeReady || recoveryBusy !== ""}
                className={`py-2 px-3 border rounded text-[11px] font-mono font-bold uppercase transition-all ${
                  nativeRecoveryBridgeReady && recoveryBusy === ""
                    ? "bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border-indigo-500/30 cursor-pointer"
                    : "bg-slate-900/60 text-slate-500 border-white/5 cursor-not-allowed"
                }`}
              >
                {recoveryBusy === "search_library" ? "Searching..." : "Search Model Library"}
              </button>
              <button
                onClick={() => handleOpenSourcePage(activeRecoveryModel)}
                disabled={recoveryBusy !== "" || !(activeRecoveryModel.downloadUrl || activeRecoveryModel.sourceUrl)}
                className={`py-2 px-3 border rounded text-[11px] font-mono font-bold uppercase transition-all ${
                  recoveryBusy === "" && (activeRecoveryModel.downloadUrl || activeRecoveryModel.sourceUrl)
                    ? "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 cursor-pointer"
                    : "bg-slate-900/60 text-slate-500 border-white/5 cursor-not-allowed"
                }`}
              >
                Open Source Page
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] font-mono">
              <button
                onClick={() => handleRetrySourceCheck(activeRecoveryModel)}
                className="py-1.5 px-2 border border-white/10 rounded text-slate-400 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
              >
                Retry Source Check: CLI only / Not active in UI
              </button>
              <div className="py-1.5 px-2 border border-white/5 rounded text-slate-500 bg-slate-900/30">
                Configure Hugging Face auth: Planned / Not active
              </div>
              <div className="py-1.5 px-2 border border-white/5 rounded text-slate-500 bg-slate-900/30">
                Mark source unavailable: Registry metadata change required
              </div>
            </div>

            {recoveryMessage && (
              <div className="p-2 rounded bg-black/30 border border-white/5 text-[10px] text-slate-300 font-mono break-words">
                {recoveryMessage}
              </div>
            )}

            {recoveryCandidates.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                  Folder candidates ({recoveryCandidates.length})
                </div>
                {recoveryCandidates.map((candidate) => {
                  const verifiedCandidate = candidate.status === "hash_verified" && candidate.hashMatches === true;
                  return (
                    <div
                      key={`${candidate.sourcePath}-${candidate.actualSha256 || candidate.status}`}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center bg-black/25 border border-white/5 rounded-lg p-3 text-[10px] font-mono"
                    >
                      <div className="lg:col-span-8 min-w-0 space-y-1">
                        <div className="break-all text-slate-300 select-all">{candidate.sourcePath}</div>
                        <div className="flex flex-wrap gap-2 text-slate-500">
                          <span>Filename: {candidate.filenameCompatible ? "match" : "different"}</span>
                          <span>
                            Size: {candidate.fileSizeBytes ? formatBytes(candidate.fileSizeBytes) : "unknown"}
                          </span>
                          <span>
                            Status:{" "}
                            <span className={verifiedCandidate ? "text-emerald-300" : "text-amber-300"}>
                              {candidate.status}
                            </span>
                          </span>
                        </div>
                        <div className="break-all text-slate-500">
                          Actual SHA-256: {candidate.actualSha256 || "not checked"}
                        </div>
                        {candidate.error && <div className="text-rose-300">{candidate.error}</div>}
                      </div>
                      <div className="lg:col-span-4">
                        <button
                          onClick={() => handleManualReconnect(activeRecoveryModel, candidate.sourcePath)}
                          disabled={!verifiedCandidate || recoveryBusy !== ""}
                          className={`w-full py-1.5 border rounded uppercase font-bold transition-all ${
                            verifiedCandidate && recoveryBusy === ""
                              ? "bg-emerald-600/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/25 cursor-pointer"
                              : "bg-slate-900/60 text-slate-500 border-white/5 cursor-not-allowed"
                          }`}
                        >
                          {verifiedCandidate ? "Use Verified Match" : "Blocked: Hash Required"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      {/* Sideloader Panel (Local Add) */}
      {activeTab === "local" && (
        <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <FileCode className="w-3.5 h-3.5 text-purple-400" />
                Import Local Weight File
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Copy one local weights file into the OpenStem model library. It remains not proof-eligible until
                expected SHA-256 metadata is supplied and matched.
              </p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-3xl">
                Manual reconnect compares the selected local file SHA-256 against expected metadata. Strict metadata
                JSON import rejects malformed hashes or missing licenses and remains Needs Verification until the local
                hash matches.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <label className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">Target Arch:</span>
                <select
                  value={selectedArchForImport}
                  onChange={(e) => {
                    setSelectedArchForImport(e.target.value as any);
                    setSelectedImportTargetId("");
                  }}
                  className="bg-[#0c0e17] border border-white/10 hover:border-white/20 hover:cursor-pointer rounded px-2 py-1 text-[11px] text-white font-mono focus:outline-none"
                >
                  <option value="VR">VR</option>
                  <option value="MDX-Net">MDX-Net</option>
                  <option value="Demucs">Demucs</option>
                  <option value="RoFormer">RoFormer</option>
                  <option value="MDXC">MDXC</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">Verify Against:</span>
                <select
                  value={selectedImportTargetId}
                  onChange={(e) => setSelectedImportTargetId(e.target.value)}
                  className="bg-[#0c0e17] border border-white/10 hover:border-white/20 hover:cursor-pointer rounded px-2 py-1 text-[11px] text-white font-mono focus:outline-none max-w-[240px]"
                >
                  <option value="">Custom import / hash unavailable</option>
                  {importTargetOptions.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => {
                  const uvr = (window as any).uvr;
                  if (uvr && typeof uvr.importModelFile === "function" && typeof uvr.verifyModelHash === "function") {
                    const importTarget = registryState.find((model) => model.id === selectedImportTargetId);
                    uvr
                      .importModelFile(
                        selectedArchForImport,
                        importTarget ? toNativeModelPayload(importTarget) : undefined,
                      )
                      .then((res: any) => {
                        if (!res.success) {
                          if (importTarget && res.status) {
                            setVerificationStates((prev) => ({ ...prev, [importTarget.id]: res.status }));
                          }
                          alert(
                            `Import blocked: ${res.error || res.message || "Model file could not be safely imported."}`,
                          );
                          return;
                        }
                        if (res.success) {
                          if (importTarget) {
                            const nextStatus = (res.verification?.status ||
                              res.status ||
                              "error") as NativeVerificationStatus;
                            const globalModel = MODEL_REGISTRY.find((model) => model.id === importTarget.id);
                            if (globalModel) {
                              globalModel.downloaded = true;
                              globalModel.filePath = res.absolutePath || globalModel.filePath;
                              globalModel.fileSize = res.fileSize || globalModel.fileSize;
                            }
                            setVerificationStates((prev) => ({ ...prev, [importTarget.id]: nextStatus }));
                            setRegistryState((prev) =>
                              prev.map((model) =>
                                model.id === importTarget.id
                                  ? {
                                      ...model,
                                      downloaded: true,
                                      filePath: res.absolutePath || model.filePath,
                                      fileSize: res.fileSize || model.fileSize,
                                    }
                                  : model,
                              ),
                            );
                            refreshLocalModelIndex();
                            window.dispatchEvent(new Event("modelRegistryChanged"));
                            alert(
                              res.proofEligibility?.proofEligible
                                ? "Model imported and hash verified. This model is proof-eligible."
                                : `Model imported, but proof remains blocked: ${res.proofEligibility?.displayMessage || "source integrity is not proof-eligible."}`,
                            );
                            return;
                          }
                          const customModel: ModelRegistryEntry = {
                            id: `custom_${Date.now()}`,
                            name: res.name,
                            architecture: selectedArchForImport,
                            filePath: res.absolutePath,
                            stemType: "variable",
                            gpuSupport: false, // Safest boolean value
                            gpuSupportStatus: "unknown",
                            memoryRisk: "med",
                            downloaded: false,
                            description:
                              "Manually imported local weight file. Imported / Hash unavailable until source metadata and expected SHA-256 are supplied.",
                            fileSize: res.fileSize || "Unknown",
                            sourceType: "manual_import",
                            license: "User-supplied / not verified",
                            verifiedStatus: "custom_hash_unavailable",
                            catalogLane: "custom",
                            actualSha256: res.actualSha256,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          };
                          addModelToRegistry(customModel);
                          setRegistryState((prev) => [...prev.map((m) => ({ ...m })), customModel]);
                          persistCustomModel(customModel, {
                            success: true,
                            status: "installed_hash_unavailable",
                            actualSha256: res.actualSha256,
                            fileSizeBytes: res.size,
                            hashMatches: false,
                            proofEligible: false,
                          });
                          refreshLocalModelIndex();
                          triggerVerifyHash(customModel);
                          alert("Model weights imported. Hash is unavailable, so this model is not proof-eligible.");
                        }
                      })
                      .catch((err: any) => {
                        alert(`Import failed: ${err.message}`);
                      });
                  } else {
                    alert("Import blocked: native file import unavailable. Native Electron required for sideloading.");
                  }
                }}
                disabled={!nativeImportBridgeReady}
                className={`px-3 py-1.5 border rounded text-xs font-mono transition-all flex items-center gap-1.5 ${
                  nativeImportBridgeReady
                    ? "bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border-purple-500/30 hover:border-purple-400/50 cursor-pointer"
                    : "bg-slate-900/60 text-slate-500 border-white/5 cursor-not-allowed"
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Choose File
              </button>
              <button
                onClick={() => metadataInputRef.current?.click()}
                className="px-3 py-1.5 border rounded text-xs font-mono transition-all flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20 hover:border-amber-400/40 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                Import Metadata JSON
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".onnx,.pth,.pt,.yaml"
              />
              <input
                type="file"
                ref={metadataInputRef}
                onChange={handleMetadataJsonImport}
                className="hidden"
                accept=".json,application/json"
              />
            </div>
          </div>
        </div>
      )}
      {/* Shared Interactive Control Bar (Filters and Sorting) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" /> Filter:
          </span>
          <div className="flex flex-wrap gap-1">
            {["All", "Installed", "Missing", "Download Available", "Manual Import Required", "Update Available"].map(
              (pill) => (
                <button
                  key={pill}
                  onClick={() => setFilterState(pill)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                    filterState === pill
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                      : "bg-white/[0.02] text-slate-400 border border-transparent hover:bg-white/[0.04]"
                  }`}
                >
                  {pill}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-mono flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-slate-500" /> Sort:
            </span>
            <select
              value={sortState}
              onChange={(e) => setSortState(e.target.value as any)}
              className="bg-[#0c0e17] border border-white/10 hover:border-white/20 hover:cursor-pointer rounded px-2.5 py-1 text-[11px] text-slate-300 font-mono focus:outline-none"
            >
              <option value="name">Name</option>
              <option value="architecture">Architecture</option>
              <option value="size">Size</option>
              <option value="status">Status</option>
              <option value="source">Source</option>
            </select>
          </div>
        </div>
      </div>
      {/* Batch Downloader Space Safety Block (Rendered on downloadable tabs) */}
      {(activeTab === "huggingface" || activeTab === "github") && (
        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              Batch Weights Downloader
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select multiple curated source entry model weights assets to pull simultaneously with built-in cache
              memory protections.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleSelectAll(activeTab === "huggingface" ? huggingFaceTabModels : gitHubTabModels)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded text-xs font-mono transition-all hover:cursor-pointer whitespace-nowrap"
            >
              Toggle Selection
            </button>
            <button
              onClick={handleBatchDownloadSelected}
              disabled={
                !nativeDownloadBridgeReady || isOutOfSpace || Object.values(selectedModels).filter(Boolean).length === 0
              }
              className={`px-4 py-1.5 text-xs font-bold font-mono rounded transition-all whitespace-nowrap flex items-center gap-1.5 ${
                !nativeDownloadBridgeReady
                  ? "bg-slate-900 text-slate-600 border border-white/5 cursor-not-allowed"
                  : isOutOfSpace
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 cursor-not-allowed"
                    : Object.values(selectedModels).filter(Boolean).length === 0
                      ? "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              }`}
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              {!nativeDownloadBridgeReady
                ? "Browser Preview / Not runnable"
                : isOutOfSpace
                  ? "Not enough space"
                  : `Download Selected (${Object.values(selectedModels).filter(Boolean).length})`}
            </button>
          </div>
        </div>
      )}
      {/* Catalog Rendered Views Grid based on Active Tab */}
      <div className="space-y-4">
        {/* Title of Catalog Section */}
        <div className="border-b border-white/5 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] font-mono">
            {activeTab === "local" && "Configured Local Weights Registry Catalog"}
            {activeTab === "huggingface" && "Configured Hugging Face Source Entries"}
            {activeTab === "github" && "Configured GitHub Release Weights Catalog"}
            {activeTab === "updates" && "Installed Weights Pending Version Check"}
          </h3>
        </div>

        {/* 1. Local Registry View */}
        {activeTab === "local" && (
          <div className="grid grid-cols-1 gap-4">
            {localRegistryModels.map((item) => {
              const state = getModelState(item);
              const vState = verificationStates[item.id] || "not_checked";
              const sourceInfo = getSourceDetails(item);
              const libraryState = getOpenStemModelLibraryState(item, localModelIndexEntries[item.id]);
              const proofEligibility = libraryState.proofEligibility;
              const recommendedAction = libraryState.recommendedAction;
              const catalogLane = getModelCatalogLane(item);

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border bg-emerald-500/[0.02] border-emerald-500/20 hover:border-emerald-500/30 transition-all space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Model Metadata */}
                    <div className="md:col-span-8 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-mono uppercase bg-blue-500/10 border border-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
                          {item.architecture}
                        </span>
                        <span
                          className={`text-[9px] font-mono uppercase border px-1.5 py-0.5 rounded font-bold ${
                            catalogLane === "custom"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                              : "bg-sky-500/10 border-sky-500/20 text-sky-300"
                          }`}
                        >
                          {catalogLane === "custom" ? "Custom Library" : "Curated Catalog"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Size: {item.fileSize || "Unknown"}</span>
                        <span
                          className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getStatusBadgeStyles(state)}`}
                        >
                          {state}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-100 font-display truncate">{item.name}</h4>

                      <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                        <div className="truncate">
                          Local Path: <span className="text-slate-300 select-all font-bold">{item.filePath}</span>
                        </div>
                        <div>
                          Manifest State: <span className="text-sky-300 font-bold">{libraryState.manifestStatus}</span>
                        </div>
                        <div>
                          Local Index State:{" "}
                          <span className="text-emerald-300 font-bold">{libraryState.localStatus}</span>
                        </div>
                        <div>
                          Required Backend Host:{" "}
                          <span className="text-purple-300 font-bold">
                            {item.requiredBackend || "python-pytorch (PyTorch v2.3)"}
                          </span>
                        </div>
                        <div>
                          Extensions Supported:{" "}
                          <span className="text-[#3b82f6] font-bold">
                            {(item.supportedExtensions || [item.name.slice(item.name.lastIndexOf("."))]).join(", ")}
                          </span>
                        </div>
                        <div className="text-amber-300 font-bold">
                          Engine Compatibility Path: Estimated / Execution Pending
                        </div>
                      </div>
                    </div>

                    {/* Checksum Integration Card */}
                    <div className="md:col-span-4 flex flex-col justify-center items-stretch space-y-2">
                      <div className="bg-black/40 p-2.5 rounded border border-white/5 text-[10px] font-mono space-y-1">
                        <div className="text-slate-400 flex justify-between">
                          <span>SHA-256 Lock:</span>
                          <span className={item.checksum ? "text-green-400 font-bold" : "text-amber-400"}>
                            {item.checksum ? "Present" : "Unavailable"}
                          </span>
                        </div>
                        <div className="text-slate-500 select-all truncate max-w-full">
                          {item.checksum || "Unregistered weight block"}
                        </div>

                        {/* Hash status indicator based on requirement 12 */}
                        <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[9px]">
                          <span>Integrity Check:</span>
                          {vState === "hash_verified" && (
                            <span className="text-emerald-400 font-bold uppercase flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Hash Verified
                            </span>
                          )}
                          {(vState === "hash_mismatch" || vState === "size_mismatch") && (
                            <span className="text-rose-400 font-bold uppercase flex items-center gap-0.5">
                              <XCircle className="w-3 h-3" />{" "}
                              {vState === "size_mismatch" ? "Size Mismatch" : "Hash Mismatch"}
                            </span>
                          )}
                          {vState === "verifying" && (
                            <span className="text-amber-400 font-bold uppercase flex items-center gap-1 animate-pulse">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Checking...
                            </span>
                          )}
                          {(vState === "not_checked" || vState === "installed_not_checked" || vState === "missing") && (
                            <span className="text-slate-400 font-bold uppercase">
                              {vState === "missing" ? "Missing" : "Not Checked"}
                            </span>
                          )}
                          {vState === "installed_hash_unavailable" && (
                            <span className="text-slate-400 font-bold uppercase">Hash Unavailable</span>
                          )}
                        </div>
                        <div
                          className={`pt-1 border-t border-white/5 text-[9px] leading-snug ${
                            proofEligibility.proofEligible ? "text-emerald-400" : "text-amber-300"
                          }`}
                        >
                          Proof Gate:{" "}
                          <span className="font-bold uppercase">
                            {proofEligibility.proofEligible ? "Eligible" : `Blocked / ${proofEligibility.reason}`}
                          </span>
                          <div className="text-slate-500 mt-0.5">{proofEligibility.displayMessage}</div>
                          <div className="text-slate-400 mt-1">
                            Recommended action: <span className="text-slate-300">{recommendedAction}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => triggerVerifyHash(item)}
                          disabled={!nativeModelBridgeReady || vState === "verifying"}
                          className={`flex-1 py-1 px-2 border text-[11px] font-mono rounded transition-all uppercase ${
                            !nativeModelBridgeReady || vState === "verifying"
                              ? "bg-slate-900/60 border-white/5 text-slate-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border-blue-500/20 hover:border-blue-400/40 text-slate-200 cursor-pointer"
                          }`}
                        >
                          {!nativeModelBridgeReady
                            ? "Browser Preview / Not runnable"
                            : vState === "verifying"
                              ? "Analyzing..."
                              : "Verify Hash"}
                        </button>
                        {!proofEligibility.proofEligible && (
                          <button
                            onClick={() => openRecoveryPanel(item)}
                            className="py-1 px-2.5 border rounded text-[11px] font-mono transition-all uppercase bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-300 hover:text-white cursor-pointer"
                          >
                            Reconnect
                          </button>
                        )}
                        <button
                          onClick={() => clearCacheItem(item)}
                          disabled={!nativeModelBridgeReady}
                          className={`py-1 px-2.5 border rounded text-[11px] font-mono transition-all uppercase ${
                            nativeModelBridgeReady
                              ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-300 hover:text-white cursor-pointer"
                              : "bg-slate-900/60 border-white/5 text-slate-500 cursor-not-allowed"
                          }`}
                          title="Purge Weights"
                        >
                          Purge
                        </button>
                        {catalogLane === "custom" && (
                          <button
                            onClick={() => handleRemoveCustomEntry(item)}
                            className="py-1 px-2.5 border rounded text-[11px] font-mono transition-all uppercase bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 cursor-pointer"
                          >
                            Remove Entry
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderCompatibilityHardwarePanel(item)}

                  {/* Hash Missing warning notice based on Requirement 12 */}
                  {!item.checksum && (
                    <div className="p-2 rounded bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400 flex items-center gap-2 font-mono">
                      <HelpCircle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>
                        Hash unavailable — file existence can be checked, but integrity cannot be fully verified.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {localRegistryModels.length === 0 && (
              <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-xl text-slate-400 text-xs font-mono">
                {baseModels.some((m) => m.downloaded)
                  ? "No models match current search/filter."
                  : "No local model files verified yet."}
              </div>
            )}
          </div>
        )}

        {/* 2. Hugging Face Hub View */}
        {activeTab === "huggingface" && (
          <div className="grid grid-cols-1 gap-4">
            {huggingFaceTabModels.map((item) => {
              const state = getModelState(item);
              const sourceInfo = getSourceDetails(item);
              const proofEligibility = getProofEligibilityForModel(item);
              const isSelected = !!selectedModels[item.id];
              const dState = downloadStates[item.id] || { progress: 0, speed: "0 MB/s", status: "idle" };
              const sourceStatusUi = getSourceStatusUi(item.verifiedStatus);
              const sourceResolutionCopy = getSourceResolutionCopy(item);
              const recommendedAction = getRecommendedModelAction(item, proofEligibility);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-purple-500/[0.02] border-purple-500/30"
                      : "bg-white/[0.01] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start md:items-center gap-3">
                    {/* Checkbox for batch space protection */}
                    {!item.downloaded &&
                      item.downloadUrl &&
                      item.verifiedStatus === "verified" &&
                      item.sourceType !== "manual_import" &&
                      item.sourceType !== "unknown" && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleModelSelection(item.id)}
                          className="w-4 h-4 shrink-0 rounded border-white/10 text-purple-600 focus:ring-purple-500 hover:cursor-pointer mt-1 md:mt-0"
                          title="Select for batch weights pull"
                        />
                      )}

                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Name / Description Metadata */}
                      <div className="md:col-span-8 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-mono bg-purple-500/10 border border-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">
                            {sourceInfo.sourceName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Weights Size: {item.fileSize || "Unknown"}
                          </span>
                          <span
                            className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getStatusBadgeStyles(state)}`}
                          >
                            {state}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-100 font-display truncate">
                          {item.id} (<i>{item.name}</i>)
                        </h4>

                        <p className="text-xs text-slate-400 font-sans max-w-2xl">
                          {item.description || "No model summary available."}
                        </p>

                        {/* Interactive Source visibility card based on Requirement 4 */}
                        <div className="mt-2.5 p-3 bg-black/40 rounded border border-white/5 text-[10px] font-mono space-y-1 w-full min-w-0 max-w-full overflow-x-auto whitespace-normal break-words">
                          <div>
                            Source Name: <span className="text-purple-300 font-bold">{sourceInfo.sourceName}</span>
                          </div>
                          <div className="break-all">
                            Repository Location:{" "}
                            <span className="text-pink-300 select-all font-bold">{sourceInfo.locationInfo}</span>
                          </div>
                          <div className="break-all">
                            File Payload Name: <span className="text-[#a855f7] select-all">{sourceInfo.fileInfo}</span>
                          </div>
                          <div className="break-all">
                            Target Download Endpoint URL:{" "}
                            <code className="text-slate-400 select-all font-bold p-0.5 bg-black/20 rounded break-all">
                              {item.downloadUrl || "missing"}
                            </code>
                          </div>
                          <div className="break-all">
                            Checksum Definition:{" "}
                            <code className="text-slate-400 p-0.5 bg-black/20 rounded break-all">
                              {item.checksum ? `sha256:${item.checksum}` : "missing"}
                            </code>
                          </div>
                          {item.verifiedStatus !== "verified" && (
                            <div className="break-words border-t border-white/5 pt-1 text-slate-400">
                              <span className="text-amber-300 font-bold">{sourceResolutionCopy.label}: </span>
                              {sourceResolutionCopy.message}
                              <div className="mt-0.5 text-slate-500">Code: {sourceStatusUi.diagnosticCode}</div>
                              {sourceResolutionCopy.authNote && (
                                <div className="mt-0.5 text-slate-500">{sourceResolutionCopy.authNote}</div>
                              )}
                            </div>
                          )}
                          <div
                            className={`break-words border-t border-white/5 pt-1 ${proofEligibility.proofEligible ? "text-emerald-400" : "text-amber-300"}`}
                          >
                            Proof Gate:{" "}
                            <span className="font-bold uppercase">
                              {proofEligibility.proofEligible ? "Eligible" : `Blocked / ${proofEligibility.reason}`}
                            </span>
                            <div className="text-slate-500 normal-case mt-0.5">{proofEligibility.displayMessage}</div>
                            <div className="text-slate-400 normal-case mt-1">
                              Recommended action: <span className="text-slate-300">{recommendedAction}</span>
                            </div>
                          </div>
                          {sourceInfo.isMutable ? (
                            <div className="text-amber-400 font-bold mt-1 text-[9px] uppercase border-t border-white/5 pt-1 flex items-center gap-1">
                              <span>⚠</span> Configured Mutable Source / Hash Required
                            </div>
                          ) : (
                            <div className="text-blue-400 font-bold mt-1 text-[9px] uppercase border-t border-white/5 pt-1 flex items-center gap-1">
                              <span>✓</span> Configured Immutable Source / Hash Lock Available
                            </div>
                          )}
                        </div>
                        {renderCompatibilityHardwarePanel(item)}
                      </div>

                      {/* Action trigger button */}
                      <div className="md:col-span-4 flex flex-col justify-center items-stretch min-w-0">
                        {dState.status === "downloading" && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-mono leading-tight">
                              <span className="text-blue-300 font-bold">Speed: {dState.speed}</span>
                              <span className="text-slate-400">{dState.progress}%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div
                                style={{ width: `${dState.progress}%` }}
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-200"
                              />
                            </div>
                          </div>
                        )}

                        {dState.status === "verifying" && (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-mono animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            Verifying Checksum...
                          </div>
                        )}

                        {dState.status === "idle" && (
                          <div className="space-y-2">
                            {/* Actions by exact state requirements */}
                            {item.downloaded ? (
                              <button
                                onClick={() => clearCacheItem(item)}
                                disabled={!nativeModelBridgeReady}
                                className={`w-full py-1.5 border text-xs font-mono font-bold rounded transition-all uppercase ${
                                  nativeModelBridgeReady
                                    ? "bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border-white/5 hover:border-rose-500/20 cursor-pointer"
                                    : "bg-slate-900/60 text-slate-500 border-white/5 cursor-not-allowed"
                                }`}
                              >
                                Re-download (Clean Weights)
                              </button>
                            ) : !item.downloadUrl ? (
                              <div className="space-y-1">
                                <button
                                  disabled
                                  className="w-full py-1.5 bg-[#ef4444]/10 text-rose-400 border border-rose-500/20 text-xs font-mono rounded cursor-not-allowed uppercase"
                                >
                                  Source Missing
                                </button>
                                <button
                                  onClick={() => openRecoveryPanel(item)}
                                  className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-mono rounded uppercase transition-all"
                                >
                                  Resolve Source
                                </button>
                                <div className="text-[9px] text-[#ef4444] font-mono text-center font-bold">
                                  No configured Hugging Face source for this model.
                                </div>
                              </div>
                            ) : item.verifiedStatus !== "verified" ? (
                              <div className="space-y-1">
                                <button
                                  disabled
                                  className={`w-full py-1.5 ${getSourceStatusButtonClasses(item.verifiedStatus)} border text-xs font-mono rounded cursor-not-allowed uppercase font-bold`}
                                >
                                  {sourceStatusUi.label}
                                </button>
                                <div
                                  className={`text-[9px] ${getSourceStatusMessageClasses(item.verifiedStatus)} font-mono text-center leading-normal`}
                                >
                                  {sourceStatusUi.message}
                                  {item.verifiedStatus === "auth_required" && (
                                    <div className="mt-1 text-slate-500">Configure Auth: Planned / Not active.</div>
                                  )}
                                  <div className="mt-1 text-slate-500">Code: {sourceStatusUi.diagnosticCode}</div>
                                </div>
                                <button
                                  onClick={() => openRecoveryPanel(item)}
                                  className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-mono rounded uppercase transition-all"
                                >
                                  Resolve Source
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => triggerDownload(item)}
                                disabled={!nativeDownloadBridgeReady}
                                className={`w-full py-1.5 text-xs font-mono font-bold rounded shadow transition-all flex items-center justify-center gap-1.5 uppercase ${
                                  nativeDownloadBridgeReady
                                    ? "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                                    : "bg-slate-900/60 text-slate-500 cursor-not-allowed"
                                }`}
                              >
                                <DownloadCloud className="w-4 h-4 shrink-0" />
                                {nativeDownloadBridgeReady ? "Download Weights" : "Browser Preview / Not runnable"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {huggingFaceTabModels.length === 0 && (
              <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-xl text-slate-400 text-xs font-mono">
                No models match current search/filter.
              </div>
            )}
          </div>
        )}

        {/* 3. GitHub Releases View */}
        {activeTab === "github" && (
          <div className="grid grid-cols-1 gap-4">
            {gitHubTabModels.map((item) => {
              const state = getModelState(item);
              const sourceInfo = getSourceDetails(item);
              const proofEligibility = getProofEligibilityForModel(item);
              const isSelected = !!selectedModels[item.id];
              const dState = downloadStates[item.id] || { progress: 0, speed: "0 MB/s", status: "idle" };
              const sourceStatusUi = getSourceStatusUi(item.verifiedStatus);
              const sourceResolutionCopy = getSourceResolutionCopy(item);
              const recommendedAction = getRecommendedModelAction(item, proofEligibility);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-teal-500/[0.02] border-teal-500/30"
                      : "bg-white/[0.01] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start md:items-center gap-3">
                    {/* Checkbox for space protectors */}
                    {!item.downloaded &&
                      item.downloadUrl &&
                      item.verifiedStatus === "verified" &&
                      item.sourceType !== "manual_import" &&
                      item.sourceType !== "unknown" && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleModelSelection(item.id)}
                          className="w-4 h-4 shrink-0 rounded border-white/10 text-teal-600 focus:ring-teal-500 hover:cursor-pointer mt-1 md:mt-0"
                          title="Select for batch weights pull"
                        />
                      )}

                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Name / Decsription Meta */}
                      <div className="md:col-span-8 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-mono bg-teal-500/10 border border-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded font-bold">
                            {sourceInfo.sourceName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Size: {item.fileSize || "Unknown"}
                          </span>
                          <span
                            className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getStatusBadgeStyles(state)}`}
                          >
                            {state}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-100 font-display truncate">
                          {item.id} (<i>{item.name}</i>)
                        </h4>

                        <p className="text-xs text-slate-400 font-sans max-w-2xl">
                          {item.description || "No model summary available."}
                        </p>

                        {/* Interactive Source visibility card based on Requirement 4 */}
                        <div className="mt-2.5 p-3 bg-black/40 rounded border border-white/5 text-[10px] font-mono space-y-1 w-full min-w-0 max-w-full overflow-x-auto whitespace-normal break-words">
                          <div>
                            Source Name: <span className="text-teal-300 font-bold">{sourceInfo.sourceName}</span>
                          </div>
                          <div className="break-all">
                            Repository Location:{" "}
                            <span className="text-emerald-300 font-bold select-all">{sourceInfo.locationInfo}</span>
                          </div>
                          <div className="break-all">
                            GitHub Release Asset Key:{" "}
                            <span className="text-teal-400 select-all">{sourceInfo.fileInfo}</span>
                          </div>
                          <div className="break-all">
                            Target Asset Release URL:{" "}
                            <code className="text-slate-400 select-all font-bold p-0.5 bg-black/20 rounded break-all">
                              {item.downloadUrl || "missing"}
                            </code>
                          </div>
                          <div className="break-all">
                            Checksum Definition:{" "}
                            <code className="text-slate-400 p-0.5 bg-black/20 rounded break-all">
                              {item.checksum ? `sha256:${item.checksum}` : "missing"}
                            </code>
                          </div>
                          {item.verifiedStatus !== "verified" && (
                            <div className="break-words border-t border-white/5 pt-1 text-slate-400">
                              <span className="text-amber-300 font-bold">{sourceResolutionCopy.label}: </span>
                              {sourceResolutionCopy.message}
                              <div className="mt-0.5 text-slate-500">Code: {sourceStatusUi.diagnosticCode}</div>
                              {sourceResolutionCopy.authNote && (
                                <div className="mt-0.5 text-slate-500">{sourceResolutionCopy.authNote}</div>
                              )}
                            </div>
                          )}
                          <div
                            className={`break-words border-t border-white/5 pt-1 ${proofEligibility.proofEligible ? "text-emerald-400" : "text-amber-300"}`}
                          >
                            Proof Gate:{" "}
                            <span className="font-bold uppercase">
                              {proofEligibility.proofEligible ? "Eligible" : `Blocked / ${proofEligibility.reason}`}
                            </span>
                            <div className="text-slate-500 normal-case mt-0.5">{proofEligibility.displayMessage}</div>
                            <div className="text-slate-400 normal-case mt-1">
                              Recommended action: <span className="text-slate-300">{recommendedAction}</span>
                            </div>
                          </div>
                        </div>
                        {renderCompatibilityHardwarePanel(item)}
                      </div>

                      {/* Action trigger button */}
                      <div className="md:col-span-4 flex flex-col justify-center items-stretch min-w-0">
                        {dState.status === "downloading" && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-mono leading-tight">
                              <span className="text-blue-300 font-bold">Speed: {dState.speed}</span>
                              <span className="text-slate-400">{dState.progress}%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div
                                style={{ width: `${dState.progress}%` }}
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-200"
                              />
                            </div>
                          </div>
                        )}

                        {dState.status === "verifying" && (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-mono animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            Verifying Checksum...
                          </div>
                        )}

                        {dState.status === "idle" && (
                          <div className="space-y-2">
                            {/* Actions by exact state requirements */}
                            {item.downloaded ? (
                              <button
                                onClick={() => clearCacheItem(item)}
                                disabled={!nativeModelBridgeReady}
                                className={`w-full py-1.5 border text-xs font-mono font-bold rounded transition-all uppercase ${
                                  nativeModelBridgeReady
                                    ? "bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border-white/5 hover:border-rose-500/20 cursor-pointer"
                                    : "bg-slate-900/60 text-slate-500 border-white/5 cursor-not-allowed"
                                }`}
                              >
                                Re-download (Clean Weights)
                              </button>
                            ) : !item.downloadUrl ? (
                              <div className="space-y-1">
                                <button
                                  disabled
                                  className="w-full py-1.5 bg-[#ef4444]/10 text-rose-400 border border-rose-500/20 text-xs font-mono rounded cursor-not-allowed uppercase"
                                >
                                  Source Missing
                                </button>
                                <button
                                  onClick={() => openRecoveryPanel(item)}
                                  className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-mono rounded uppercase transition-all"
                                >
                                  Resolve Source
                                </button>
                                <div className="text-[9px] text-[#ef4444] font-mono text-center font-bold">
                                  GitHub source not configured.
                                </div>
                              </div>
                            ) : item.verifiedStatus !== "verified" ? (
                              <div className="space-y-1">
                                <button
                                  disabled
                                  className={`w-full py-1.5 ${getSourceStatusButtonClasses(item.verifiedStatus)} border text-xs font-mono rounded cursor-not-allowed uppercase font-bold`}
                                >
                                  {sourceStatusUi.label}
                                </button>
                                <div
                                  className={`text-[9px] ${getSourceStatusMessageClasses(item.verifiedStatus)} font-mono text-center leading-normal`}
                                >
                                  {sourceStatusUi.message}
                                  {item.verifiedStatus === "auth_required" && (
                                    <div className="mt-1 text-slate-500">Configure Auth: Planned / Not active.</div>
                                  )}
                                  <div className="mt-1 text-slate-500">Code: {sourceStatusUi.diagnosticCode}</div>
                                </div>
                                <button
                                  onClick={() => openRecoveryPanel(item)}
                                  className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-mono rounded uppercase transition-all"
                                >
                                  Resolve Source
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => triggerDownload(item)}
                                disabled={!nativeDownloadBridgeReady}
                                className={`w-full py-1.5 text-xs font-mono font-bold rounded shadow transition-all flex items-center justify-center gap-1.5 uppercase ${
                                  nativeDownloadBridgeReady
                                    ? "bg-teal-600 hover:bg-teal-500 text-white cursor-pointer"
                                    : "bg-slate-900/60 text-slate-500 cursor-not-allowed"
                                }`}
                              >
                                <DownloadCloud className="w-4 h-4 shrink-0" />
                                {nativeDownloadBridgeReady ? "Download Weights" : "Browser Preview / Not runnable"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {gitHubTabModels.length === 0 && (
              <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-xl text-slate-400 text-xs font-mono">
                No models match current search/filter.
              </div>
            )}
          </div>
        )}

        {/* 4. Updates tab view */}
        {activeTab === "updates" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] font-mono text-xs text-slate-300 leading-snug space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="text-emerald-300 font-bold uppercase">Update Readiness Center</div>
                  <p className="text-slate-400">{OPENSTEM_UPDATE_PRINCIPLE}</p>
                  <p className="text-slate-500">
                    No update check has run. OpenStem will not claim the app, catalog, or model weights are current
                    until a signed manifest or trusted digest has been fetched and verified.
                  </p>
                </div>
                <div className="shrink-0 rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase text-amber-300">
                  No silent installs
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {[applicationUpdateLane, modelCatalogUpdateLane, modelWeightUpdateLane].map((lane) => (
                  <div key={lane.id} className="rounded border border-white/5 bg-black/30 p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-slate-100 font-bold">{lane.title}</div>
                      <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                        {lane.statusLabel}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[10px] leading-relaxed">{lane.userMessage}</div>
                    <div className="text-[9px] text-slate-500">Owner: {lane.owner}</div>
                    <div className="text-[9px] text-slate-500">Code: {lane.diagnosticCode}</div>
                    <button
                      disabled
                      className="w-full rounded border border-white/5 bg-slate-900/60 px-2 py-1.5 text-[10px] font-bold uppercase text-slate-500 cursor-not-allowed"
                      title={lane.developerNextStep}
                    >
                      {lane.id === "application" && "Check Program Updates - Not configured"}
                      {lane.id === "model_catalog" && "Check Catalog Manifest - Not configured"}
                      {lane.id === "model_weights" && "Auto Replace Weights - Not allowed"}
                    </button>
                  </div>
                ))}
              </div>
              <div className="rounded border border-white/5 bg-black/25 p-3 text-[10px] text-slate-500">
                Required before enabling updates: {UPDATE_TRUST_REQUIREMENTS.join(" | ")}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {updatesTabModels.map((item) => {
                const state = getModelState(item);
                const dState = downloadStates[item.id] || { progress: 0, speed: "0 MB/s", status: "idle" };
                const modelUpdateAllowed =
                  nativeDownloadBridgeReady && item.verifiedStatus === "verified" && !!item.checksum;
                const modelUpdateBlocker = !nativeDownloadBridgeReady
                  ? "Browser Preview / Not runnable"
                  : item.verifiedStatus !== "verified"
                    ? "Blocked: source not verified"
                    : !item.checksum
                      ? "Blocked: SHA-256 required"
                      : "Download and verify replacement";

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.01] hover:border-yellow-400/40 transition-all"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono uppercase bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">
                            {item.architecture}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Installed Size: {item.fileSize || "Unknown"}
                          </span>
                          <span
                            className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getStatusBadgeStyles(state)}`}
                          >
                            {state}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 font-display truncate">
                          {item.id} (<i>{item.name}</i>)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono select-all truncate">
                          Destination Path: {item.filePath}
                        </p>
                      </div>

                      <div className="w-full md:w-48 shrink-0">
                        {dState.status === "idle" && (
                          <button
                            onClick={() => triggerDownload(item)}
                            disabled={!modelUpdateAllowed}
                            className={`w-full py-1.5 border font-bold font-mono text-xs rounded transition-all flex items-center justify-center gap-1.5 uppercase ${
                              modelUpdateAllowed
                                ? "bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border-yellow-500/30 hover:border-yellow-400/60 cursor-pointer"
                                : "bg-slate-900/60 text-slate-500 border-white/5 cursor-not-allowed"
                            }`}
                          >
                            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                            {modelUpdateBlocker}
                          </button>
                        )}

                        {dState.status === "downloading" && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-mono leading-tight">
                              <span className="text-blue-300 font-bold">Speed: {dState.speed}</span>
                              <span className="text-slate-400">{dState.progress}%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div
                                style={{ width: `${dState.progress}%` }}
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-200"
                              />
                            </div>
                          </div>
                        )}

                        {dState.status === "verifying" && (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-mono animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            Verifying Checksum...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {updatesTabModels.length === 0 && (
                <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-xl text-slate-400 text-xs font-mono space-y-2">
                  <div>
                    No installed weights currently have a trusted, registered replacement candidate in the local
                    registry schema.
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Update status remains unknown unless a local file hash, allowed source, and newer expected SHA-256
                    are all available. Catalog metadata cannot make a model proof-eligible by itself.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
