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
  Github
} from "lucide-react";
import { motion } from "motion/react";
import { MODEL_REGISTRY, addModelToRegistry } from "../services/audioEngine";
import { getModelProofEligibility } from "../services/modelProofEligibility";
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

const modelBridgeUnavailableStatus: NativeVerificationStatus = "browser_preview";

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "Unknown";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

function toNativeModelPayload(item: ModelRegistryEntry) {
  const filePath = item.filePath || "";
  const isAbsoluteLocalPath = /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith("/") || filePath.startsWith("\\\\");
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
  const [verificationStates, setVerificationStates] = useState<
    Record<
      string,
      NativeVerificationStatus
    >
  >({});

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedArchForImport, setSelectedArchForImport] = useState<"VR" | "MDX-Net" | "Demucs" | "RoFormer" | "MDXC" | "Custom">("VR");
  const [selectedImportTargetId, setSelectedImportTargetId] = useState<string>("");
  const uvrBridge = typeof window !== "undefined" ? (window as any).uvr : null;
  const nativeModelBridgeReady = !!(
    uvrBridge &&
    typeof uvrBridge.verifyModelHash === "function" &&
    typeof uvrBridge.deleteModelFile === "function"
  );
  const nativeDownloadBridgeReady = !!(nativeModelBridgeReady && typeof uvrBridge.downloadModel === "function");
  const nativeImportBridgeReady = !!(nativeModelBridgeReady && typeof uvrBridge.importModelFile === "function");

  // Load models initially and bind listeners
  useEffect(() => {
    // Copy initially to local registryState immutably; local install state is confirmed below by native IPC only.
    const initializedRegistry = MODEL_REGISTRY.map(m => ({
      ...m,
      downloaded: m.architecture === "Ensemble" ? m.downloaded : false,
    }));
    setRegistryState(initializedRegistry);

    const handler = () => {
      setRegistryState(MODEL_REGISTRY.map(m => ({
        ...m,
        downloaded: m.architecture === "Ensemble" ? m.downloaded : false,
      })));
    };
    window.addEventListener("modelRegistryChanged", handler);

    // Read initial local file presence and integrity from disk if Electron is active.
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.verifyModelHash === 'function') {
      const initCheck = async () => {
        const statuses: Record<string, NativeVerificationStatus> = {};
        const checkedList = await Promise.all(MODEL_REGISTRY.map(async (model) => {
          if (model.id === "manual_ensemble_preset" || model.id === "ensemble_preset_default" || model.id === "multi_ai_ensemble_preset") {
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
        }));

        setVerificationStates((prev) => ({ ...prev, ...statuses }));
        setRegistryState(checkedList);
      };
      initCheck();
    } else {
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
    if (uvr && typeof uvr.onBackendProgress === 'function') {
      unsubscribe = uvr.onBackendProgress((update: any) => {
        if (update && update.type === 'download') {
          const { modelId, progress, speed, status } = update;
          const nextStatus: ModelDownloadStatus =
            status === "downloading" || status === "verifying" || status === "failed"
              ? status
              : "idle";
          setDownloadStates((prev) => ({
            ...prev,
            [modelId]: {
              progress: progress || 0,
              speed: speed || "0 MB/s",
              status: nextStatus,
            }
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
    registryState.forEach(m => {
      if (m.architecture !== "Ensemble" && !m.downloaded && m.downloadUrl) {
        // Exclude manual import / unknown models from start selection
        if (m.sourceType !== "manual_import" && m.sourceType !== "unknown") {
          initialSelection[m.id] = false;
        }
      }
    });
    setSelectedModels(prev => ({ ...initialSelection, ...prev }));
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
    if (vState === "installed_not_checked") return item.sourceType === "manual_import" ? "Imported / Not verified" : "Installed / Not checked";
    if (vState === "installed_hash_unavailable") return item.sourceType === "manual_import" ? "Imported / Hash unavailable" : "Installed / Hash unavailable";
    if (vState === "hash_verified") return "Hash verified";
    if (vState === "hash_mismatch") return "Hash mismatch";
    if (vState === "size_mismatch") return "Size mismatch";
    if (vState === "error") return "Verification error";

    if (item.sourceType === "manual_import") {
      return "Manual Import Required";
    }
    if (!item.downloadUrl) {
      return "Source Missing";
    }
    if (!item.checksum && item.verifiedStatus === "missing_hash") {
      return "Hash Missing";
    }
    if (item.verifiedStatus === "needs_verification" || item.verifiedStatus === "experimental") {
      return "Needs Verification";
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

    // Warnings for checksum & mutability based on Requirement 23
    const isMutable = item.downloadUrl.includes("/resolve/main/");
    if (isMutable && !item.checksum) {
      const proceed = confirm("Warning: mutable source without checksum. Download allowed only as unverified local file. Continue?");
      if (!proceed) return;
    } else if (!item.checksum) {
      const proceed = confirm("Warning: No registered expected checksum for this source. File integrity verification will be unavailable. Continue?");
      if (!proceed) return;
    }

    if (!uvr || typeof uvr.downloadModel !== 'function' || typeof uvr.verifyModelHash !== 'function') {
      alert("Download blocked: native downloader/verifier unavailable. Browser Preview Only | Native Electron required for model download and verification.");
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
      alert(`Download error: ${e.message}`);
    }
  };

  const clearCacheItem = async (item: ModelRegistryEntry) => {
    const uvr = (window as any).uvr;

    if (!uvr || typeof uvr.deleteModelFile !== "function") {
      alert("Delete blocked: Browser Preview / Not runnable. Native Electron is required to delete local model files.");
      setVerificationStates(prev => ({ ...prev, [item.id]: modelBridgeUnavailableStatus }));
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
    
    setRegistryState(prev => prev.map(m => m.id === item.id ? { ...m, downloaded: false } : m));
    window.dispatchEvent(new Event("modelRegistryChanged"));
  };

  const triggerVerifyHash = async (item: ModelRegistryEntry) => {
    setVerificationStates(prev => ({ ...prev, [item.id]: "verifying" }));

    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.verifyModelHash === "function") {
      try {
        const res: NativeVerifyResult = await uvr.verifyModelHash(toNativeModelPayload(item));
        const nextStatus = (res && res.status ? res.status : "error") as NativeVerificationStatus;

        setVerificationStates(prev => ({ ...prev, [item.id]: nextStatus }));
        setRegistryState(prev => prev.map(m => m.id === item.id ? {
          ...m,
          downloaded: !!res.exists,
          filePath: res.localPath || m.filePath,
          fileSize: res.fileSizeBytes ? formatBytes(res.fileSizeBytes) : m.fileSize,
        } : m));
        setDownloadStates(prev => ({
          ...prev,
          [item.id]: {
            progress: 0,
            speed: "0 MB/s",
            status: "idle",
            error: res.error,
          },
        }));
      } catch (err) {
        console.error("Backend hash verification failed:", err);
        setVerificationStates(prev => ({ ...prev, [item.id]: "error" }));
        setRegistryState(prev => prev.map(m => m.id === item.id ? { ...m, downloaded: false } : m));
        setDownloadStates(prev => ({
          ...prev,
          [item.id]: {
            progress: 0,
            speed: "0 MB/s",
            status: "idle",
            error: err instanceof Error ? err.message : "Hash verification failed",
          },
        }));
      }
    } else {
      alert("Verify blocked: native hash verifier unavailable. Hash verification unavailable — native verifier missing");
      setVerificationStates(prev => ({ ...prev, [item.id]: modelBridgeUnavailableStatus }));
      setRegistryState(prev => prev.map(m => m.id === item.id ? { ...m, downloaded: false } : m));
      setDownloadStates(prev => ({
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

  // Custom weight upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check missing native block
    alert("Import blocked: native file import unavailable. Native Electron required for sideloading.");
    e.target.value = "";
  };

  // Check disk calculations based on checkboxes selection
  const totalSelectedDownloadMB = Object.keys(selectedModels)
    .filter(id => selectedModels[id])
    .reduce((acc, id) => {
      const model = registryState.find(m => m.id === id);
      if (model && !model.downloaded) {
        return acc + parseSizeInMB(model.fileSize);
      }
      return acc;
    }, 0);

  const estimatedRemainingMB = FREE_SPACE_MB - totalSelectedDownloadMB;
  const isOutOfSpace = estimatedRemainingMB < 0;

  // Render checkbox selection for batch operations
  const handleToggleModelSelection = (id: string) => {
    setSelectedModels(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = (modelsToSelect: ModelRegistryEntry[]) => {
    const allSelected = modelsToSelect.every(m => selectedModels[m.id]);
    const updated: Record<string, boolean> = { ...selectedModels };
    modelsToSelect.forEach(m => {
      if (!m.downloaded && m.downloadUrl && m.sourceType !== "manual_import" && m.sourceType !== "unknown") {
        updated[m.id] = !allSelected;
      }
    });
    setSelectedModels(updated);
  };

  const importTargetOptions = registryState.filter(
    model => model.architecture === selectedArchForImport
  );

  const handleBatchDownloadSelected = () => {
    if (!nativeDownloadBridgeReady) {
      alert("Batch download blocked: native downloader/verifier unavailable. Browser Preview / Not runnable.");
      return;
    }

    if (isOutOfSpace) {
      alert("Blocker Triggered: Not enough cache space available to complete batch weights pulls!");
      return;
    }

    const targets = registryState.filter(m => selectedModels[m.id] && !m.downloaded && m.downloadUrl);
    if (targets.length === 0) {
      alert("No downloadable weight entries currently selected.");
      return;
    }

    targets.forEach(m => triggerDownload(m));
  };

  // Base list of models (ignoring raw ensembles presets which are UI wrappers)
  const baseModels = registryState.filter(item => item.architecture !== "Ensemble");

  // Filtering Logic
  const filteredModels = baseModels.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.architecture.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Filters matching requirements
    if (filterState === "All") return true;
    if (filterState === "Installed") return item.downloaded;
    if (filterState === "Missing") return !item.downloaded;
    if (filterState === "Download Available") return !item.downloaded && !!item.downloadUrl && item.sourceType !== "manual_import" && item.sourceType !== "unknown";
    if (filterState === "Manual Import Required") return item.sourceType === "manual_import" || (!item.downloadUrl && item.sourceType === "unknown");
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
  const localRegistryModels = sortedModels.filter(m => m.downloaded);
  const huggingFaceTabModels = sortedModels.filter(m => m.sourceType === "hugging_face_repo" || m.sourceType === "hugging_face_space" || (!m.sourceType && m.downloadUrl?.includes("huggingface.co")));
  const gitHubTabModels = sortedModels.filter(m => m.sourceType === "github_release" || m.sourceType === "github_raw" || (!m.sourceType && m.downloadUrl?.includes("github.com")));
  
  // Under the "Updates" tab, we show ONLY installed models that meet the requirements:
  // * a source is known (downloadUrl exists)
  // * and an update is possible (updateAvailable: true)
  const updatesTabModels = baseModels.filter(m => m.downloaded && m.downloadUrl && m.updateAvailable);

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
        return "bg-indigo-500/15 border-indigo-500/30 text-indigo-400";
      case "Update Available":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
      case "Hash Missing":
      case "Installed / Hash unavailable":
      case "Imported / Hash unavailable":
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
              Install and inspect local weights without treating them as proof until SHA-256 and source metadata match a real local file.
            </p>
            <HelpText
              sectionId="model_downloader"
              text="Help: The downloader can verify integrity only when a local file exists and a known checksum is registered. If a checksum is unavailable, the app can confirm file presence but not cryptographic integrity."
            />
          </div>
          
          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 w-full sm:w-auto bg-black/40 border border-white/5 p-3 rounded-lg text-xs font-mono min-w-0 break-words whitespace-normal border-dashed border-slate-500/20 hover:border-slate-500/40 transition-all">
            <AccessibleTooltipWrapper content="Static cache planning estimate / Not live disk check" position="top" className="w-full">
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
                <div className="text-slate-400">Selected Size: <span className="text-white font-bold">{(totalSelectedDownloadMB).toFixed(1)} MB</span></div>
                <div className={isOutOfSpace ? "text-rose-400 font-bold" : "text-green-400"}>
                  {isOutOfSpace ? (
                    <span className="flex items-center gap-1 justify-start sm:justify-end">
                      <AlertTriangle className="w-3 h-3 text-rose-400 inline" />
                      Not enough cache space
                    </span>
                  ) : (
                    <span>Est. Remaining: {(estimatedRemainingMB).toFixed(1)} MB</span>
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
          onClick={() => { setActiveTab("local"); setFilterState("All"); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "local"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "bg-white/[0.02] text-slate-400 border border-transparent hover:bg-white/[0.05]"
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Local Weights ({baseModels.filter(m => m.downloaded).length})
        </button>
        <button
          onClick={() => { setActiveTab("huggingface"); setFilterState("All"); }}
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
          onClick={() => { setActiveTab("github"); setFilterState("All"); }}
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
          onClick={() => { setActiveTab("updates"); setFilterState("All"); }}
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
      </div>      {/* Registry Status Legend */}
      <div className="p-3 bg-[#0c0f1d]/60 border border-white/5 rounded-xl text-[10px] sm:text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono leading-relaxed">
        <div className="space-y-1">
          <div className="text-[#38bdf8] font-bold">● Configured Source / Not Checked</div>
          <div className="text-slate-400 text-[10px]">URL declared in static catalog configuration (integrity and presence remain unconfirmed).</div>
        </div>
        <div className="space-y-1">
          <div className="text-purple-400 font-bold">● Configured Mutable Source / Hash Required</div>
          <div className="text-slate-400 text-[10px]">URL points to an active main-branch endpoint (/resolve/main/). Subject to remote changes.</div>
        </div>
        <div className="space-y-1">
          <div className="text-sky-400 font-bold">● Configured Source / Hash Lock Available</div>
          <div className="text-slate-400 text-[10px]">URL points to a tagged release or stable commit. Remote content is unlikely to mutate.</div>
        </div>
        <div className="space-y-1">
          <div className="text-emerald-400 font-bold">● Hash verified</div>
          <div className="text-slate-400 text-[10px]">Local weights file exists, SHA-256 matches exact physical checksum entry.</div>
        </div>
        <div className="space-y-1">
          <div className="text-slate-500 font-bold">● Installed / Hash unavailable</div>
          <div className="text-slate-400 text-[10px]">Local weights file exists, but it is not proof-eligible until expected SHA-256 source metadata is registered and matched.</div>
        </div>
        <div className="space-y-1">
          <div className="text-amber-500 font-bold">● Manual Import Required / Source Missing</div>
          <div className="text-slate-400 text-[10px]">No predefined remote download source registered. Safe side-loading or custom import is required.</div>
        </div>
      </div>

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
                Copy one local weights file into the OpenStem model library. It remains not proof-eligible until expected SHA-256 metadata is supplied and matched.
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
                  if (uvr && typeof uvr.importModelFile === 'function' && typeof uvr.verifyModelHash === 'function') {
                    const importTarget = registryState.find(model => model.id === selectedImportTargetId);
                    uvr.importModelFile(selectedArchForImport, importTarget ? toNativeModelPayload(importTarget) : undefined).then((res: any) => {
                      if (!res.success) {
                        if (importTarget && res.status) {
                          setVerificationStates(prev => ({ ...prev, [importTarget.id]: res.status }));
                        }
                        alert(`Import blocked: ${res.error || res.message || "Model file could not be safely imported."}`);
                        return;
                      }
                      if (res.success) {
                        if (importTarget) {
                          const nextStatus = (res.verification?.status || res.status || "error") as NativeVerificationStatus;
                          const globalModel = MODEL_REGISTRY.find(model => model.id === importTarget.id);
                          if (globalModel) {
                            globalModel.downloaded = true;
                            globalModel.filePath = res.absolutePath || globalModel.filePath;
                            globalModel.fileSize = res.fileSize || globalModel.fileSize;
                          }
                          setVerificationStates(prev => ({ ...prev, [importTarget.id]: nextStatus }));
                          setRegistryState(prev => prev.map(model => model.id === importTarget.id ? {
                            ...model,
                            downloaded: true,
                            filePath: res.absolutePath || model.filePath,
                            fileSize: res.fileSize || model.fileSize,
                          } : model));
                          window.dispatchEvent(new Event("modelRegistryChanged"));
                          alert(res.proofEligibility?.proofEligible
                            ? "Model imported and hash verified. This model is proof-eligible."
                            : `Model imported, but proof remains blocked: ${res.proofEligibility?.displayMessage || "source integrity is not proof-eligible."}`);
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
                          description: "Manually imported local weight file. Imported / Hash unavailable until source metadata and expected SHA-256 are supplied.",
                          fileSize: res.fileSize || "Unknown",
                          sourceType: "manual_import",
                          license: "User-supplied / not verified",
                          verifiedStatus: "needs_verification"
                        };
                        addModelToRegistry(customModel);
                        setRegistryState(prev => [...prev.map(m => ({ ...m })), customModel]);
                        triggerVerifyHash(customModel);
                        alert("Model weights imported. Hash is unavailable, so this model is not proof-eligible.");
                      }
                    }).catch((err: any) => {
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
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".onnx,.pth,.pt,.yaml"
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
            {["All", "Installed", "Missing", "Download Available", "Manual Import Required", "Update Available"].map((pill) => (
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
            ))}
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
              Select multiple curated source entry model weights assets to pull simultaneously with built-in cache memory protections.
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
              disabled={!nativeDownloadBridgeReady || isOutOfSpace || Object.values(selectedModels).filter(Boolean).length === 0}
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
              {!nativeDownloadBridgeReady ? "Browser Preview / Not runnable" : isOutOfSpace ? "Not enough space" : `Download Selected (${Object.values(selectedModels).filter(Boolean).length})`}
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
            {activeTab === "huggingface" && "Trusted Hugging Face Model Library Sources"}
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
              const proofEligibility = getProofEligibilityForModel(item);

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
                        <span className="text-[10px] text-slate-500 font-mono">
                          Size: {item.fileSize || "Unknown"}
                        </span>
                        <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getStatusBadgeStyles(state)}`}>
                          {state}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-bold text-slate-100 font-display truncate">
                        {item.name}
                      </h4>
                      
                      <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                        <div className="truncate">Local Path: <span className="text-slate-300 select-all font-bold">{item.filePath}</span></div>
                        <div>Required Backend Host: <span className="text-purple-300 font-bold">{item.requiredBackend || "python-pytorch (PyTorch v2.3)"}</span></div>
                        <div>Extensions Supported: <span className="text-[#3b82f6] font-bold">{(item.supportedExtensions || [item.name.slice(item.name.lastIndexOf("."))]).join(", ")}</span></div>
                        <div className="text-amber-300 font-bold">Engine Compatibility Path: Estimated / Execution Pending</div>
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
                              <XCircle className="w-3 h-3" /> {vState === "size_mismatch" ? "Size Mismatch" : "Hash Mismatch"}
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
                            <span className="text-slate-400 font-bold uppercase">
                              Hash Unavailable
                            </span>
                          )}
                        </div>
                        <div className={`pt-1 border-t border-white/5 text-[9px] leading-snug ${
                          proofEligibility.proofEligible ? "text-emerald-400" : "text-amber-300"
                        }`}>
                          Proof Gate: <span className="font-bold uppercase">
                            {proofEligibility.proofEligible ? "Eligible" : `Blocked / ${proofEligibility.reason}`}
                          </span>
                          <div className="text-slate-500 mt-0.5">{proofEligibility.displayMessage}</div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => triggerVerifyHash(item)}
                          disabled={!nativeModelBridgeReady || vState === "verifying"}
                          className={`flex-1 py-1 px-2 border text-[11px] font-mono rounded transition-all uppercase ${
                            !nativeModelBridgeReady || vState === "verifying"
                              ? "bg-slate-900/60 border-white/5 text-slate-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border-blue-500/20 hover:border-blue-400/40 text-slate-200 cursor-pointer"
                          }`}
                        >
                          {!nativeModelBridgeReady ? "Browser Preview / Not runnable" : vState === "verifying" ? "Analyzing..." : "Verify Hash"}
                        </button>
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
                      </div>
                    </div>
                  </div>

                  {/* Hash Missing warning notice based on Requirement 12 */}
                  {!item.checksum && (
                    <div className="p-2 rounded bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400 flex items-center gap-2 font-mono">
                      <HelpCircle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>Hash unavailable — file existence can be checked, but integrity cannot be fully verified.</span>
                    </div>
                  )}
                </div>
              );
            })}

            {localRegistryModels.length === 0 && (
              <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-xl text-slate-400 text-xs font-mono">
                {baseModels.some(m => m.downloaded) ? (
                  "No models match current search/filter."
                ) : (
                  "No local model files verified yet."
                )}
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

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected ? "bg-purple-500/[0.02] border-purple-500/30" : "bg-white/[0.01] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start md:items-center gap-3">
                    
                    {/* Checkbox for batch space protection */}
                    {!item.downloaded && item.downloadUrl && item.verifiedStatus === "verified" && item.sourceType !== "manual_import" && item.sourceType !== "unknown" && (
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
                          <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getStatusBadgeStyles(state)}`}>
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
                          <div>Source Name: <span className="text-purple-300 font-bold">{sourceInfo.sourceName}</span></div>
                          <div className="break-all">Repository Location: <span className="text-pink-300 select-all font-bold">{sourceInfo.locationInfo}</span></div>
                          <div className="break-all">File Payload Name: <span className="text-[#a855f7] select-all">{sourceInfo.fileInfo}</span></div>
                          <div className="break-all">
                            Target Download Endpoint URL: <code className="text-slate-400 select-all font-bold p-0.5 bg-black/20 rounded break-all">{item.downloadUrl || "missing"}</code>
                          </div>
                          <div className="break-all">
                            Checksum Definition: <code className="text-slate-400 p-0.5 bg-black/20 rounded break-all">{item.checksum ? `sha256:${item.checksum}` : "missing"}</code>
                          </div>
                          <div className={`break-words border-t border-white/5 pt-1 ${proofEligibility.proofEligible ? "text-emerald-400" : "text-amber-300"}`}>
                            Proof Gate: <span className="font-bold uppercase">
                              {proofEligibility.proofEligible ? "Eligible" : `Blocked / ${proofEligibility.reason}`}
                            </span>
                            <div className="text-slate-500 normal-case mt-0.5">{proofEligibility.displayMessage}</div>
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
                                <div className="text-[9px] text-[#ef4444] font-mono text-center font-bold">
                                  No configured Hugging Face source for this model.
                                </div>
                              </div>
                            ) : item.verifiedStatus !== "verified" ? (
                              <div className="space-y-1">
                                <button
                                  disabled
                                  className={`w-full py-1.5 ${
                                    item.verifiedStatus === 'needs_verification'
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  } border text-xs font-mono rounded cursor-not-allowed uppercase font-bold`}
                                >
                                  {item.verifiedStatus === 'needs_verification' ? 'Needs Verification' : 
                                   item.verifiedStatus === 'unavailable' ? 'Unavailable' :
                                   item.verifiedStatus === 'broken_link' ? 'Broken Link' :
                                   item.verifiedStatus === 'missing_hash' ? 'Hash Missing' :
                                   item.verifiedStatus === 'hash_mismatch' ? 'Hash Mismatch' :
                                   item.verifiedStatus === 'unsupported_backend' ? 'Unsupported Backend' :
                                   item.verifiedStatus === 'experimental' ? 'Experimental' : 'Unavailable'}
                                </button>
                                <div className={`text-[9px] ${
                                  item.verifiedStatus === 'needs_verification' ? 'text-amber-400/80' : 'text-rose-400/80'
                                } font-mono text-center leading-normal`}>
                                  {item.verifiedStatus === 'needs_verification' ? 'Verification is pending on this model resource.' : 
                                   item.verifiedStatus === 'unavailable' ? 'Direct download is currently disabled.' :
                                   item.verifiedStatus === 'broken_link' ? 'Source returned HTTP 401/404 or is unavailable. Correct source metadata before download or proof.' :
                                   item.verifiedStatus === 'missing_hash' ? 'Block: missing required integrity checksum.' :
                                   item.verifiedStatus === 'hash_mismatch' ? 'Block: hash mismatch on target weights.' :
                                   item.verifiedStatus === 'unsupported_backend' ? 'Block: target engine backend not supported.' :
                                   item.verifiedStatus === 'experimental' ? 'Experimental build: source not audited.' : 'Unavailable for direct download.'}
                                </div>
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

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected ? "bg-teal-500/[0.02] border-teal-500/30" : "bg-white/[0.01] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start md:items-center gap-3">
                    
                    {/* Checkbox for space protectors */}
                    {!item.downloaded && item.downloadUrl && item.verifiedStatus === "verified" && item.sourceType !== "manual_import" && item.sourceType !== "unknown" && (
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
                          <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getStatusBadgeStyles(state)}`}>
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
                          <div>Source Name: <span className="text-teal-300 font-bold">{sourceInfo.sourceName}</span></div>
                          <div className="break-all">Repository Location: <span className="text-emerald-300 font-bold select-all">{sourceInfo.locationInfo}</span></div>
                          <div className="break-all">GitHub Release Asset Key: <span className="text-teal-400 select-all">{sourceInfo.fileInfo}</span></div>
                          <div className="break-all">
                            Target Asset Release URL: <code className="text-slate-400 select-all font-bold p-0.5 bg-black/20 rounded break-all">{item.downloadUrl || "missing"}</code>
                          </div>
                          <div className="break-all">
                            Checksum Definition: <code className="text-slate-400 p-0.5 bg-black/20 rounded break-all">{item.checksum ? `sha256:${item.checksum}` : "missing"}</code>
                          </div>
                          <div className={`break-words border-t border-white/5 pt-1 ${proofEligibility.proofEligible ? "text-emerald-400" : "text-amber-300"}`}>
                            Proof Gate: <span className="font-bold uppercase">
                              {proofEligibility.proofEligible ? "Eligible" : `Blocked / ${proofEligibility.reason}`}
                            </span>
                            <div className="text-slate-500 normal-case mt-0.5">{proofEligibility.displayMessage}</div>
                          </div>
                        </div>
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
                                <div className="text-[9px] text-[#ef4444] font-mono text-center font-bold">
                                  GitHub source not configured.
                                </div>
                              </div>
                            ) : item.verifiedStatus !== "verified" ? (
                              <div className="space-y-1">
                                <button
                                  disabled
                                  className={`w-full py-1.5 ${
                                    item.verifiedStatus === 'needs_verification'
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  } border text-xs font-mono rounded cursor-not-allowed uppercase font-bold`}
                                >
                                  {item.verifiedStatus === 'needs_verification' ? 'Needs Verification' : 
                                   item.verifiedStatus === 'unavailable' ? 'Unavailable' :
                                   item.verifiedStatus === 'broken_link' ? 'Broken Link' :
                                   item.verifiedStatus === 'missing_hash' ? 'Hash Missing' :
                                   item.verifiedStatus === 'hash_mismatch' ? 'Hash Mismatch' :
                                   item.verifiedStatus === 'unsupported_backend' ? 'Unsupported Backend' :
                                   item.verifiedStatus === 'experimental' ? 'Experimental' : 'Unavailable'}
                                </button>
                                <div className={`text-[9px] ${
                                  item.verifiedStatus === 'needs_verification' ? 'text-amber-400/80' : 'text-rose-400/80'
                                } font-mono text-center leading-normal`}>
                                  {item.verifiedStatus === 'needs_verification' ? 'Verification is pending on this model resource.' : 
                                   item.verifiedStatus === 'unavailable' ? 'Direct download is currently disabled.' :
                                   item.verifiedStatus === 'broken_link' ? 'Source returned HTTP 401/404 or is unavailable. Correct source metadata before download or proof.' :
                                   item.verifiedStatus === 'missing_hash' ? 'Block: missing required integrity checksum.' :
                                   item.verifiedStatus === 'hash_mismatch' ? 'Block: hash mismatch on target weights.' :
                                   item.verifiedStatus === 'unsupported_backend' ? 'Block: target engine backend not supported.' :
                                   item.verifiedStatus === 'experimental' ? 'Experimental build: source not audited.' : 'Unavailable for direct download.'}
                                </div>
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
            <div className="p-4 rounded-xl border border-white/5 bg-black/35 font-mono text-xs text-slate-400 leading-snug space-y-2">
              <p><b>Registry Integrity Rule</b>: Shows only currently installed weights where an alternative registry version or changed lock sha256 checksum is officially registered in our preflight schema.</p>
              <p>If the app cannot determine update status from active hashes, status will fall back to “Update status unknown” to protect server configurations.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {updatesTabModels.map((item) => {
                const state = getModelState(item);
                const dState = downloadStates[item.id] || { progress: 0, speed: "0 MB/s", status: "idle" };

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
                          <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getStatusBadgeStyles(state)}`}>
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
                            disabled={!nativeDownloadBridgeReady}
                            className={`w-full py-1.5 border font-bold font-mono text-xs rounded transition-all flex items-center justify-center gap-1.5 uppercase ${
                              nativeDownloadBridgeReady
                                ? "bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border-yellow-500/30 hover:border-yellow-400/60 cursor-pointer"
                                : "bg-slate-900/60 text-slate-500 border-white/5 cursor-not-allowed"
                            }`}
                          >
                            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                            {nativeDownloadBridgeReady ? "Update Weights" : "Browser Preview / Not runnable"}
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
                  <div>No installed weights currently have a registered pending update in the local registry schema.</div>
                  <div className="text-slate-500 text-[10px]">Update status unknown unless a local file hash and newer registry checksum are both available.</div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
