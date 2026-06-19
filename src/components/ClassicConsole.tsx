import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Folder,
  File,
  Music,
  Settings,
  HelpCircle,
  Activity,
  Play,
  Square,
  Info,
  CheckCircle,
  AlertTriangle,
  Shield,
  Check,
  RefreshCw,
  Layers,
  Cpu,
  Code2,
  Trash2,
  Sliders,
  ChevronRight,
  ArrowUpRight,
  Plus,
  ExternalLink,
  DownloadCloud,
  X,
  FileCheck,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FourTrackMixer, { LoadedStem } from "./FourTrackMixer";
import InteractiveTooltip from "./InteractiveTooltip";
import { useHelp, HelpToggle, HelpText, HelpTooltipIcon, AccessibleTooltipWrapper } from "./HelpSystem";
import { ModelCompatibilityWizard } from "./ModelCompatibilityWizard";
import { HostSetupGuide } from "./HostSetupGuide";
import {
  APP_NAME,
  APP_SHORT_NAME,
  APP_PACKAGE_NAME,
  RELEASE_STATE,
  BETA_STATUS,
  INDEPENDENT_PROJECT_NOTICE
} from "../config/branding";

// Import our decoupled types & engines (Rule 20)
import {
  PROCESS_METHODS,
  MODEL_REGISTRY,
  SETTINGS_SCHEMAS,
  buildOutputNames,
  validateState,
  getAdapterForModel,
} from "../services/audioEngine";
import { getModelProofEligibility } from "../services/modelProofEligibility";
import {
  AppState,
  OutputFormat,
  ProcessingStatus,
  ModelRegistryEntry,
  ProcessingRequest,
} from "../types";

/**
 * UVR CLASSIC CONSOLE IMPLEMENTATION
 * Faithfully satisfies the 20 scope disciplines for modernising the vocal remover GUI.
 * Incorporates:
 * - One centralized AppState model (Rule 2)
 * - Configuration-driven menus (Rule 3)
 * - Separate UI / Audio Engine adapter dispatcher (Rule 4 & 6)
 * - Model download managers / verified status badges (Rule 5 & 17)
 * - Strict interactive validations (Rule 8 & 9)
 * - Dependency checkbox overrides (Rule 10)
 * - Pre-flight filename projections (Rule 11)
 * - Abort controllers / native cancellation hooks (Rule 13)
 * - Dynamic schemas inside Advanced settings drawers (Rule 18)
 * - Fork-specific technical inline reviews (Rule 19)
 */

export interface BackendDeviceCapability {
  backendType: string;
  supportedExtensions: string[];
  cpuSupport: boolean;
  cudaSupport: boolean;
  mpsSupport: boolean;
  dmlSupport: boolean;
  requiredPythonPackages: string[];
  requiredCommandFlags: string[];
  gpuExecutionState: "supported" | "partial" | "missing";
}

export const BACKEND_COMPATIBILITY_MAP: Record<string, BackendDeviceCapability> = {
  "VR": {
    backendType: "audio-separator (VR/MDX/RoFormer)",
    supportedExtensions: [".onnx", ".pth"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: true,
    requiredPythonPackages: ["audio-separator", "onnxruntime-gpu", "torch"],
    requiredCommandFlags: ["--device cuda", "--device mps", "--device dml"],
    gpuExecutionState: "supported"
  },
  "MDX-Net": {
    backendType: "audio-separator (MDX)",
    supportedExtensions: [".onnx"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: true,
    requiredPythonPackages: ["audio-separator", "onnxruntime-gpu", "torch"],
    requiredCommandFlags: ["--device cuda", "--device mps", "--device dml"],
    gpuExecutionState: "supported"
  },
  "Demucs": {
    backendType: "audio-separator (Demucs)",
    supportedExtensions: [".yaml", ".pt"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: false,
    dmlSupport: false,
    requiredPythonPackages: ["audio-separator", "torch"],
    requiredCommandFlags: ["--device cuda"],
    gpuExecutionState: "partial"
  },
  "RoFormer": {
    backendType: "audio-separator (RoFormer)",
    supportedExtensions: [".onnx", ".pth"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: true,
    requiredPythonPackages: ["audio-separator", "onnxruntime-gpu", "torch"],
    requiredCommandFlags: ["--device cuda", "--device mps", "--device dml"],
    gpuExecutionState: "supported"
  },
  "MDXC": {
    backendType: "audio-separator (MDXC)",
    supportedExtensions: [".onnx"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: true,
    requiredPythonPackages: ["audio-separator", "onnxruntime-gpu", "torch"],
    requiredCommandFlags: ["--device cuda", "--device mps", "--device dml"],
    gpuExecutionState: "supported"
  },
  "Custom": {
    backendType: "custom-adapter",
    supportedExtensions: ["*"],
    cpuSupport: true,
    cudaSupport: false,
    mpsSupport: false,
    dmlSupport: false,
    requiredPythonPackages: ["torch"],
    requiredCommandFlags: [],
    gpuExecutionState: "missing"
  }
};

interface ClassicConsoleProps {
  selectedInputs: string[];
  setSelectedInputs: (val: string[]) => void;
  selectedOutput: string;
  setSelectedOutput: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  selectedModelName: string;
  setSelectedModelName: (val: string) => void;
  dropdownSettings: any;
  setDropdownSettings: (val: any) => void;
  checkboxSettings: any;
  setCheckboxSettings: (val: any) => void;
}

interface PointerAnnotation {
  id: string;
  title: string;
  desc: string;
  coords: { x: number; y: number };
}

function getLocalFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}

function inferStemTypeFromPath(filePath: string): LoadedStem["stemType"] {
  const lower = getLocalFileName(filePath).toLowerCase();
  if (lower.includes("vocal")) return "vocals";
  if (lower.includes("drum")) return "drums";
  if (lower.includes("bass")) return "bass";
  if (lower.includes("instrumental") || lower.includes("inst")) return "instrumental";
  if (lower.includes("other")) return "other";
  return "custom";
}

function normalizeVerifiedOutputFiles(outputFiles: any[]): LoadedStem[] {
  return outputFiles
    .filter((file) => file && file.verified === true && Number(file.sizeBytes) > 0 && typeof file.path === "string")
    .map((file, index) => {
      const name = getLocalFileName(file.path);
      return {
        id: `real-stem-${index}-${name}`,
        name,
        stemType: inferStemTypeFromPath(file.path),
        filePath: file.path,
        fileExists: true,
        fileSizeBytes: Number(file.sizeBytes),
        sourceModel: "Verified local AI output",
        sourceEngine: "audio-separator CPU",
        peakDataSource: "not_loaded",
        isDemo: false,
        canPlay: true,
        canExport: true,
        proofSource: "real_separation_output",
      };
    });
}

export default function ClassicConsole({
  selectedInputs,
  setSelectedInputs,
  selectedOutput,
  setSelectedOutput,
  selectedCategory,
  setSelectedCategory,
  selectedModelName,
  setSelectedModelName,
  dropdownSettings,
  setDropdownSettings,
  checkboxSettings,
  setCheckboxSettings,
}: ClassicConsoleProps) {
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const { showHelp: showTooltips, toggleSection: toggleHelpSection } = useHelp("classic_console");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ffmpegStatus, setFfmpegStatus] = useState<
    "not_checked" | "ready" | "missing"
  >("not_checked");
  const [modelFileStatus, setModelFileStatus] = useState<
    "not_checked" | "missing" | "exists_hash_not_checked" | "hash_verified" | "hash_unavailable" | "hash_mismatch" | "manual_import_required" | "source_missing" | "download_needed"
  >("not_checked");
  const [backendStatus, setBackendStatus] = useState<
    "not_checked" | "ready" | "missing_env"
  >("not_checked");
  const [userSelectedMode, setUserSelectedMode] = useState<"ai" | "ffmpeg">("ai");
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showSystemNotes, setShowSystemNotes] = useState(false);
  const [realLoadedStems, setRealLoadedStems] = useState<LoadedStem[]>([]);
  const [verifiedModelLocalPath, setVerifiedModelLocalPath] = useState<string>("");
  const [outputFolderVerifyStatus, setOutputFolderVerifyStatus] = useState<
    "not_selected" | "selected_not_verified" | "verified_writable" | "missing" | "not_writable" | "browser_preview"
  >("not_selected");
  const [outputFolderError, setOutputFolderError] = useState<string>("");
  const [customPythonPath, setCustomPythonPathState] = useState<string>(() => {
    return localStorage.getItem("customPythonPath") || "";
  });

  const updateCustomPythonPath = (pathStr: string) => {
    setCustomPythonPathState(pathStr);
    localStorage.setItem("customPythonPath", pathStr);
    // Restart diagnostics with the new custom python path immediately
    runBackendDiagnostics(pathStr);
  };
  
  const [backendSpecs, setBackendSpecs] = useState<{
    pythonFound: boolean;
    pythonPath: string;
    pythonVersion: string;
    audioSeparatorInstalled: boolean;
    audioSeparatorCliReady?: boolean;
    torchInstalled: boolean;
    torchVersion?: string;
    isCpuOnlyPytorch?: boolean;
    cudaAvailable: boolean;
    cudaVersion?: string;
    cudaDeviceCount?: number;
    gpuDeviceName?: string;
    totalVramBytes?: number;
    vramDisplay?: string;
    mpsAvailable: boolean;
    ffmpegReady?: boolean;
    canRunAISeparation: boolean;
  } | null>(null);

  const clearLogsAndState = () => {
    setSimulationLog([]);
    setFfmpegStatus("not_checked");
    setModelFileStatus("not_checked");
    setBackendStatus("not_checked");
    setSimProgress(0);
    setAppState((prev) => ({
      ...prev,
      processingStatus: "idle",
      consoleLogs: [],
      progress: 0,
    }));
  };

  // --- 1. THE CENTRALIZED MASTER APPSTATE OBJECT (Rule 2) ---
  const [appState, setAppState] = useState<AppState>(() => {
    const savedState = localStorage.getItem("uvr6_saved_app_state");
    const defaultState = {
      selectedInputs:
        selectedInputs && selectedInputs.length > 0
          ? selectedInputs
          : ["tracking_demo_44k.wav"],
      selectedOutputFolder:
        selectedOutput || "C:\\Users\\Consumer\\Music_Stems\\",
      processMethodId: "bs_roformer", // default method
      selectedModelId: "mel_band_roformer_karaoke", // default model
      selectedEnsembleId: "multi_ai_ensemble_preset",
      outputFormat: "WAV",

      dropdownSettings: {
        chunks: "12", // Map default parameter based on method
        noiseReduction: "4",
        executionDevice: "cpu",
        cpuThreads: 4,
        segmentSize: "1024",
      },

      checkboxSettings: {
        ttaActive: false,
        postProcessActive: true,
        saveVocalsOnly: false,
        saveInstrumentalOnly: false,
        splitMode: true,
        saveAllOutputs: false,
        modelTestMode: false,
        saveNoiseyOutput: false,
        highPrecisionWeights: true,
        sameAsInputFolder: false,
        createFolderPerTrack: false,
      },

      processingStatus: "idle" as ProcessingStatus,
      progress: 0,
      consoleLogs: [],
    };

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return {
          ...defaultState,
          ...parsed,
          checkboxSettings: {
            ...defaultState.checkboxSettings,
            ...(parsed.checkboxSettings || {}),
          },
          dropdownSettings: {
            ...defaultState.dropdownSettings,
            ...(parsed.dropdownSettings || {}),
          },
          processingStatus: "idle",
          progress: 0,
          consoleLogs: [],
          selectedInputs: defaultState.selectedInputs, // don't persist files between reloads
        };
      } catch (e) {
        return defaultState;
      }
    }
    return defaultState;
  });

  // Persist appState to localStorage (fixes common UVR5 complaint about not remembering settings)
  useEffect(() => {
    localStorage.setItem(
      "uvr6_saved_app_state",
      JSON.stringify({
        selectedOutputFolder: appState.selectedOutputFolder,
        processMethodId: appState.processMethodId,
        selectedModelId: appState.selectedModelId,
        selectedEnsembleId: appState.selectedEnsembleId,
        outputFormat: appState.outputFormat,
        dropdownSettings: appState.dropdownSettings,
        checkboxSettings: appState.checkboxSettings,
      }),
    );
  }, [
    appState.selectedOutputFolder,
    appState.processMethodId,
    appState.selectedModelId,
    appState.selectedEnsembleId,
    appState.outputFormat,
    appState.dropdownSettings,
    appState.checkboxSettings,
  ]);

  // Sync state from ClassicConsole for tabs sharing
  // Local helper states
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showStopHaltAlert, setShowStopHaltAlert] = useState(false);

  const runBackendDiagnostics = async (pythonPath: string = customPythonPath) => {
    const uvr = (window as any).uvr;
    if (uvr) {
      if (typeof uvr.checkBackendDetails === "function") {
        try {
          const specs = await uvr.checkBackendDetails(pythonPath || undefined);
          setBackendSpecs(specs);
          if (specs.canRunAISeparation) {
            setBackendStatus("ready");
          } else {
            setBackendStatus("missing_env");
          }
        } catch (err) {
          console.error("Failed to run backend specs diagnostics check:", err);
        }
      }
      if (typeof uvr.checkFFmpegReady === "function") {
        try {
          const ffRes = await uvr.checkFFmpegReady();
          if (ffRes && ffRes.ready) {
            setFfmpegStatus("ready");
          } else {
            setFfmpegStatus("missing");
          }
        } catch (e) {
          console.error("Failed FFmpeg check:", e);
          setFfmpegStatus("missing");
        }
      }
    }
  };

  const handleBrowsePythonPath = async () => {
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.selectPythonPath === "function") {
      try {
        const res = await uvr.selectPythonPath();
        if (res && typeof res === "string") {
          updateCustomPythonPath(res);
        } else if (res && res.filePath) {
          updateCustomPythonPath(res.filePath);
        }
      } catch (err) {
        console.error("Failed to browse for Python executable path:", err);
      }
    } else {
      const pathInput = prompt("Enter full path to native Python executable:", customPythonPath);
      if (pathInput !== null) {
        updateCustomPythonPath(pathInput.trim());
      }
    }
  };

  useEffect(() => {
    const isElectron = !!(window as any).uvr;
    if (isElectron) {
      runBackendDiagnostics();
      setAppState((prev) => {
        let updatedInputs = prev.selectedInputs;
        if (updatedInputs.includes("tracking_demo_44k.wav")) {
          updatedInputs = updatedInputs.filter(f => f !== "tracking_demo_44k.wav");
        }
        let updatedOutput = prev.selectedOutputFolder;
        if (updatedOutput === "C:\\Users\\Consumer\\Music_Stems\\") {
          updatedOutput = "";
        }
        return {
          ...prev,
          selectedInputs: updatedInputs,
          selectedOutputFolder: updatedOutput,
        };
      });
    }

    const uvr = (window as any).uvr;
    let unsubscribe: any = null;
    if (uvr && typeof uvr.onBackendProgress === "function") {
      unsubscribe = uvr.onBackendProgress((update: any) => {
        if (!update) return;

        if (update.type === "log" && update.message) {
          setSimulationLog((current) => [...current, update.message]);
          setAppState((prev) => ({
            ...prev,
            consoleLogs: [update.message, ...prev.consoleLogs],
          }));
          return;
        }
        
        if (update.type === "process") {
          const { progress, status, log, outputFiles, error } = update;
          
          if (progress !== undefined) {
            setSimProgress(progress);
          }
          
          if (log) {
            setSimulationLog((current) => [...current, log]);
            setAppState((prev) => ({
              ...prev,
              consoleLogs: [log, ...prev.consoleLogs],
            }));
          }
          
          if (status === "completed") {
            const verifiedStems = normalizeVerifiedOutputFiles(Array.isArray(outputFiles) ? outputFiles : []);
            if (verifiedStems.length === 0) {
              setIsSimulating(false);
              setRealLoadedStems([]);
              setAppState((prev) => ({
                ...prev,
                processingStatus: "error",
                consoleLogs: [
                  `[error] Backend reported completion without verified non-empty output stems.`,
                  ...prev.consoleLogs,
                ],
              }));
              setSimulationLog((current) => [
                ...current,
                `[error] Completion rejected: no verified non-empty AI output files were returned by backend.`,
              ]);
              return;
            }

            setIsSimulating(false);
            setSimProgress(100);
            setRealLoadedStems(verifiedStems);
            setAppState((prev) => ({
              ...prev,
              processingStatus: "completed",
              progress: 100,
              consoleLogs: [
                `[backend] CPU AI separation completed with ${verifiedStems.length} verified output stem(s).`,
                ...prev.consoleLogs,
              ],
            }));
            
            setSimulationLog((current) => [
              ...current,
              `[filesystem] Verified AI output files:`,
              ...verifiedStems.map((stem) => `  ---> ${stem.filePath} (${stem.fileSizeBytes || 0} bytes)`),
            ]);
          } else if (status === "failed" || status === "error") {
            setIsSimulating(false);
            setRealLoadedStems([]);
            setAppState((prev) => ({
              ...prev,
              processingStatus: "error",
              consoleLogs: [
                `[error] Separation failed: ${error || "Subprocess returned an error."}`,
                ...prev.consoleLogs,
              ],
            }));
            setSimulationLog((current) => [
              ...current,
              `[error] Real sub-process aborted. Details: ${error || "Exception during DSP execution."}`,
            ]);
          } else if (status === "cancelled") {
            setIsSimulating(false);
            setRealLoadedStems([]);
            setAppState((prev) => ({
              ...prev,
              processingStatus: "cancelled",
              consoleLogs: [
                `[cancelled] Separation process terminated by user.`,
                ...prev.consoleLogs,
              ],
            }));
          }
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Custom repo settings (Rule 17/18)
  const [customRepoUrl, setCustomRepoUrl] = useState(
    "https://huggingface.co/models/uvr-community-extensions",
  );
  const [sha256Strict, setSha256Strict] = useState(true);
  const [conserveVram, setConserveVram] = useState(true);
  const [doubleQuotePaths, setDoubleQuotePaths] = useState(true);

  // Native quick-download UI state. Success is only set after native SHA-256 verification.
  const [modelRegistryState, setModelRegistryState] =
    useState<ModelRegistryEntry[]>(MODEL_REGISTRY);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(
    null,
  );
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    const handler = () => setModelRegistryState([...MODEL_REGISTRY]);
    window.addEventListener("modelRegistryChanged", handler);
    return () => window.removeEventListener("modelRegistryChanged", handler);
  }, []);

  // Interval memory reference for cancelling active UI progress state
  const activeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state upward to parent props for compatibility representation (tabs context)
  useEffect(() => {
    setSelectedInputs(appState.selectedInputs);
    setSelectedOutput(appState.selectedOutputFolder);
    setSelectedCategory(appState.processMethodId);
    setDropdownSettings(appState.dropdownSettings);
    setCheckboxSettings(appState.checkboxSettings);
  }, [
    appState.selectedInputs,
    appState.selectedOutputFolder,
    appState.processMethodId,
    appState.dropdownSettings,
    appState.checkboxSettings,
  ]);

  // Synchronize category-to-model changes based on configuration blueprints (Rule 3 & 5)
  useEffect(() => {
    const selectedMethod = PROCESS_METHODS.find(
      (m) => m.id === appState.processMethodId,
    );
    if (selectedMethod) {
      const relatedModel = modelRegistryState.find(
        (m) =>
          m.id === selectedMethod.defaultModelId ||
          m.architecture.toLowerCase() === selectedMethod.id.toLowerCase(),
      );

      const relatedModels = modelRegistryState.filter((m) => {
        if (selectedMethod.id === "ensemble")
          return m.architecture === "Ensemble";
        if (selectedMethod.id === "bs_roformer")
          return m.architecture === "RoFormer";
        if (selectedMethod.id === "vr") return m.architecture === "VR";
        if (selectedMethod.id === "mdx") return m.architecture === "MDX-Net";
        if (selectedMethod.id === "demucs") return m.architecture === "Demucs";
        if (selectedMethod.id === "custom") return m.architecture === "Custom";
        return false;
      });

      const chosenModelId = relatedModel
        ? relatedModel.id
        : relatedModels[0]?.id || "";
      const chosenModelName = relatedModel
        ? relatedModel.name
        : relatedModels[0]?.name || "";

      setAppState((prev) => ({
        ...prev,
        selectedModelId: chosenModelId,
        // Sync default settings matching dynamic schemas (Rule 18)
        dropdownSettings: {
          ...prev.dropdownSettings,
          chunks:
            SETTINGS_SCHEMAS[selectedMethod.id]?.[0]?.defaultValue?.toString() ||
            "Auto",
          noiseReduction:
            SETTINGS_SCHEMAS[selectedMethod.id]?.[1]?.defaultValue?.toString() ||
            "Standard",
        },
      }));
      setSelectedModelName(chosenModelName);
    }
  }, [appState.processMethodId, modelRegistryState]);

  // Get active model object
  const activeModel = useMemo(() => {
    return (
      modelRegistryState.find((m) => m.id === appState.selectedModelId) ||
      modelRegistryState[0]
    );
  }, [appState.selectedModelId, modelRegistryState]);

  const modelProofEligibility = useMemo(() => {
    const installedStatuses = new Set([
      "exists_hash_not_checked",
      "hash_verified",
      "hash_unavailable",
      "hash_mismatch",
    ]);
    const verificationStatus =
      modelFileStatus === "hash_verified"
        ? "hash_verified"
        : modelFileStatus === "hash_mismatch"
          ? "hash_mismatch"
          : modelFileStatus === "hash_unavailable"
            ? "installed_hash_unavailable"
            : modelFileStatus === "exists_hash_not_checked"
              ? "installed_not_checked"
              : modelFileStatus === "missing" || modelFileStatus === "download_needed"
                ? "missing"
                : modelFileStatus;

    return getModelProofEligibility(activeModel, {
      exists: installedStatuses.has(modelFileStatus) && !!verifiedModelLocalPath,
      status: verificationStatus,
      hashChecked: modelFileStatus === "hash_verified" || modelFileStatus === "hash_mismatch",
      hashMatches: modelFileStatus === "hash_verified",
    });
  }, [activeModel, modelFileStatus, verifiedModelLocalPath]);

  // Map selected inputs with accurate metadata (Rule 24)
  const selectedInputFiles = useMemo(() => {
    const isElectron = !!(window as any).uvr;
    return appState.selectedInputs.map((input) => {
      const isPath = input.includes("/") || input.includes("\\");
      if (isPath) {
        return {
          displayName: input.split(/[/\\]/).pop() || input,
          path: input,
          source: "electron_path" as const,
          verifiedOnDisk: isElectron,
          sizeBytes: 15 * 1024 * 1024,
        };
      } else {
        return {
          displayName: input,
          source: input === "tracking_demo_44k.wav" ? ("demo" as const) : ("browser_file" as const),
          verifiedOnDisk: false,
        };
      }
    });
  }, [appState.selectedInputs]);

  // Aggregate requirements blockers and warnings (Rule 12 & 13)
  const blockersAndWarnings = useMemo(() => {
    const list: {
      id: string;
      label: string;
      severity: "required" | "warning";
      source: string;
      fixLabel?: string;
    }[] = [];
    const isElectron = !!(window as any).uvr;

    if (!isElectron) {
      list.push({
        id: "browser_sandbox",
        label: "Browser sandbox mode cannot execute native separation",
        severity: "required",
        source: "backend",
        fixLabel: "Use Electron desktop build"
      });
    }

    const hasInputs = appState.selectedInputs && appState.selectedInputs.length > 0;
    if (!hasInputs) {
      list.push({
        id: "no_inputs",
        label: "No input files selected",
        severity: "required",
        source: "input",
        fixLabel: "Browse for input files"
      });
    } else {
      const hasPreviewInputsOnly = selectedInputFiles.some(f => f.source !== "electron_path");
      if (hasPreviewInputsOnly) {
        list.push({
          id: "inputs_not_verified",
          label: "One or more selected inputs are not verified local files",
          severity: "required",
          source: "input",
          fixLabel: "Re-add files using native browser button in Electron"
        });
      }
    }

    if (appState.checkboxSettings.sameAsInputFolder) {
      const hasNonNative = selectedInputFiles.some(f => f.source !== "electron_path");
      if (hasNonNative || !hasInputs) {
        list.push({
          id: "same_as_input_requires_native",
          label: "Same as Input Folder requires verified native input paths",
          severity: "required",
          source: "output",
          fixLabel: "Select a custom output folder or use native inputs"
        });
      }
    } else {
      if (!appState.selectedOutputFolder) {
        list.push({
          id: "output_missing",
          label: "Output folder not selected",
          severity: "required",
          source: "output",
          fixLabel: "Choose output folder"
        });
      } else if (outputFolderVerifyStatus === "missing") {
        list.push({
          id: "output_not_exists",
          label: "Output folder missing",
          severity: "required",
          source: "output",
          fixLabel: "Select an existing folder on disk"
        });
      } else if (outputFolderVerifyStatus === "not_writable") {
        list.push({
          id: "output_not_writable",
          label: "Output folder not writable",
          severity: "required",
          source: "output",
          fixLabel: "Choose a writable directory"
        });
      } else if (outputFolderVerifyStatus === "browser_preview" || !isElectron) {
        list.push({
          id: "output_browser_preview",
          label: "Browser preview output folder",
          severity: "required",
          source: "output",
          fixLabel: "Use native select in Electron build"
        });
      }
    }

    if (!activeModel) {
      list.push({
        id: "model_missing",
        label: "Selected model missing",
        severity: "required",
        source: "model",
        fixLabel: "Please download or choose a valid model"
      });
    } else {
      const installedLike = modelFileStatus === "hash_verified" || modelFileStatus === "exists_hash_not_checked" || modelFileStatus === "hash_unavailable" || modelFileStatus === "hash_mismatch";
      if (!activeModel.downloaded && !installedLike) {
        list.push({
          id: "model_not_installed",
          label: "Selected model file not installed",
          severity: "required",
          source: "model",
          fixLabel: "Download model weights via Model Downloader"
        });
      }

      const isModelSupported = ['VR', 'MDX-Net', 'Demucs', 'RoFormer', 'MDXC', 'Custom', 'Ensemble'].includes(activeModel.architecture || '');
      if (!isModelSupported) {
        list.push({
          id: "unsupported_architecture",
          label: `Unsupported model architecture: ${activeModel.architecture}`,
          severity: "required",
          source: "model",
          fixLabel: "Switch model method"
        });
      }

      if (modelFileStatus === "hash_mismatch") {
        list.push({
          id: "model_hash_mismatch",
          label: "Selected model weight checksum mismatch",
          severity: "required",
          source: "model",
          fixLabel: "Redownload or reimport the model file"
        });
      } else if (!modelProofEligibility.proofEligible) {
        list.push({
          id: "model_proof_not_eligible",
          label: modelProofEligibility.displayMessage,
          severity: "required",
          source: "model",
          fixLabel: "Use a model with verified source integrity and matching SHA-256"
        });
      }
    }

    if (appState.processMethodId === "ensemble" && (!appState.selectedInputs || appState.selectedInputs.length < 2)) {
      list.push({
        id: "ensemble_insufficient_inputs",
        label: "Ensemble requires at least 2 inputs or model outputs",
        severity: "required",
        source: "model",
        fixLabel: "Add more input tracks to queue"
      });
    }

    if (ffmpegStatus !== "ready" && isElectron) {
      list.push({
        id: "ffmpeg_missing",
        label: "FFmpeg missing on native host path",
        severity: "required",
        source: "ffmpeg",
        fixLabel: "Install FFmpeg or check PATH environment variables"
      });
    }

    if (userSelectedMode === "ai" && isElectron) {
      if (!backendSpecs?.pythonFound) {
        list.push({
          id: "python_missing",
          label: "Python missing for AI mode",
          severity: "required",
          source: "python",
          fixLabel: "Install Python 3.10+ and add to custom path"
        });
      }
      if (backendSpecs?.pythonFound && !backendSpecs?.audioSeparatorInstalled) {
        list.push({
          id: "audio_separator_missing",
          label: "audio-separator missing for AI mode",
          severity: "required",
          source: "backend",
          fixLabel: "Run pip install audio-separator"
        });
      }
      if (backendSpecs?.pythonFound && backendSpecs?.audioSeparatorInstalled && backendSpecs?.audioSeparatorCliReady === false) {
        list.push({
          id: "audio_separator_cli_missing",
          label: "audio-separator CLI help could not be inspected",
          severity: "required",
          source: "backend",
          fixLabel: "Repair or reinstall audio-separator in the selected Python environment"
        });
      }
      if (backendSpecs?.pythonFound && !backendSpecs?.torchInstalled) {
        list.push({
          id: "torch_missing",
          label: "PyTorch missing for AI mode",
          severity: "required",
          source: "backend",
          fixLabel: "Install torch via python pip installer"
        });
      }
    }

    if (userSelectedMode === "ai" && isElectron) {
      const dev = appState.dropdownSettings.executionDevice;
      if (dev !== "cpu") {
        list.push({
          id: "cpu_mode_required",
          label: "CPU mode is required for the first local AI proof slice",
          severity: "required",
          source: "device",
          fixLabel: "Switch execution device to CPU"
        });
      }
      if (dev === "cuda" && backendSpecs && !backendSpecs.cudaAvailable) {
        list.push({
          id: "cuda_missing",
          label: "CUDA requested but not available, PyTorch is using CPU",
          severity: "required",
          source: "device",
          fixLabel: "Install CUDA toolkit or switch target device to CPU"
        });
      }
      if (dev === "mps" && backendSpecs && !backendSpecs.mpsAvailable) {
        list.push({
          id: "mps_missing",
          label: "MPS requested but not available on this chipset hardware",
          severity: "required",
          source: "device",
          fixLabel: "Use CPU or auto device selection mode"
        });
      }
    }

    if (userSelectedMode === "ai" && appState.dropdownSettings.executionDevice === "cuda" && backendSpecs?.cudaAvailable) {
      list.push({
        id: "cuda_not_proven",
        label: "CUDA not locally proven with dynamic end-to-end split benchmark",
        severity: "warning",
        source: "device"
      });
    }

    if (appState.dropdownSettings.executionDevice === "directml") {
      list.push({
        id: "directml_experimental",
        label: "DirectML selected: DirectML is experimental, delegated, and not locally proven",
        severity: "warning",
        source: "device"
      });
    }

    if (appState.dropdownSettings.executionDevice === "cpu" && backendSpecs?.cudaAvailable) {
      list.push({
        id: "gpu_unused",
        label: "CUDA is available on host but CPU threads are selected for execution",
        severity: "warning",
        source: "device"
      });
    }

    if (userSelectedMode === "ffmpeg") {
      list.push({
        id: "ffmpeg_fallback_blocked",
        label: "FFmpeg fallback is non-AI and cannot satisfy CPU AI proof",
        severity: "required",
        source: "mode"
      });
    }

    if (!isElectron) {
      list.push({
        id: "browser_preview_mode",
        label: "Running in browser preview mode - UI testing available only",
        severity: "warning",
        source: "mode"
      });
    }

    return list;
  }, [appState.selectedInputs, appState.selectedOutputFolder, appState.checkboxSettings.sameAsInputFolder, appState.dropdownSettings.executionDevice, appState.processMethodId, selectedInputFiles, activeModel, ffmpegStatus, backendSpecs, userSelectedMode, outputFolderVerifyStatus, modelFileStatus, modelProofEligibility]);

  const requiredBlockers = useMemo(() => {
    return blockersAndWarnings.filter(item => item.severity === "required");
  }, [blockersAndWarnings]);

  const warningBlockers = useMemo(() => {
    return blockersAndWarnings.filter(item => item.severity === "warning");
  }, [blockersAndWarnings]);

  const blockedReason = useMemo(() => {
    return requiredBlockers.length > 0 ? requiredBlockers[0].label : null;
  }, [requiredBlockers]);

  const computedPipelineMode = useMemo(() => {
    const isElectron = !!(window as any).uvr;
    if (!isElectron) {
      return "browser_preview" as const;
    }

    if (requiredBlockers.length > 0) {
      if (userSelectedMode === "ai") {
        return "ai_backend_missing_requirements" as const;
      } else {
        return "ffmpeg_fallback_blocked" as const;
      }
    }

    if (userSelectedMode === "ai") {
      return "ai_backend_ready" as const;
    }

    return "ffmpeg_fallback_blocked" as const;
  }, [requiredBlockers, userSelectedMode]);

  // Dynamic model file verification hook (Rule 17)
  useEffect(() => {
    const checkActiveModelFile = async () => {
      const isElectron = !!(window as any).uvr;
      if (!isElectron) {
        if (activeModel) {
          setModelFileStatus("not_checked");
        } else {
          setModelFileStatus("missing");
        }
        return;
      }

      if (!activeModel) {
        setModelFileStatus("missing");
        setVerifiedModelLocalPath("");
        return;
      }

      const uvr = (window as any).uvr;
      if (uvr && typeof uvr.verifyModelHash === "function") {
        try {
          const res = await uvr.verifyModelHash(activeModel);
          if (res && res.exists) {
            setVerifiedModelLocalPath(res.localPath || "");
            setModelRegistryState((currentList) =>
              currentList.map((m) =>
                m.id === activeModel.id
                  ? (m.downloaded && (!res.localPath || m.filePath === res.localPath)
                    ? m
                    : { ...m, downloaded: true, filePath: res.localPath || m.filePath })
                  : m,
              ),
            );
            if (res.status === "hash_verified") {
              setModelFileStatus("hash_verified");
            } else if (res.status === "installed_hash_unavailable") {
              setModelFileStatus("hash_unavailable");
            } else if (res.status === "hash_mismatch" || res.status === "size_mismatch") {
              setModelFileStatus("hash_mismatch");
            } else {
              setModelFileStatus("exists_hash_not_checked");
            }
          } else {
            setVerifiedModelLocalPath("");
            if (activeModel.downloadUrl) {
              setModelFileStatus("missing");
            } else {
              setModelFileStatus("manual_import_required");
            }
          }
          return;
        } catch (e) {
          console.error("Failed to verify model hash:", e);
          setVerifiedModelLocalPath("");
          setModelFileStatus("not_checked");
          return;
        }
      }

      if (uvr && typeof uvr.checkModelFileExists === "function") {
        try {
          const res = await uvr.checkModelFileExists(activeModel.architecture, activeModel.name);
          if (res && res.exists) {
            setVerifiedModelLocalPath(res.absolutePath || "");
            if (activeModel.checksum) {
              setModelFileStatus("exists_hash_not_checked");
            } else {
              setModelFileStatus("hash_unavailable");
            }
          } else {
            setVerifiedModelLocalPath("");
            if (activeModel.downloadUrl) {
              setModelFileStatus("missing");
            } else {
              setModelFileStatus("manual_import_required");
            }
          }
        } catch (e) {
          console.error("Failed to check model file existence:", e);
          setVerifiedModelLocalPath("");
          setModelFileStatus("not_checked");
        }
      }
    };

    checkActiveModelFile();
  }, [appState.selectedModelId, activeModel]);

  // Dynamic output folder verification hook (Rule 7)
  useEffect(() => {
    const verifyOutputFolderOnChanges = async () => {
      const isElectron = !!(window as any).uvr;
      if (appState.checkboxSettings.sameAsInputFolder) {
        setOutputFolderVerifyStatus("verified_writable");
        setOutputFolderError("");
        return;
      }

      if (!appState.selectedOutputFolder) {
        setOutputFolderVerifyStatus("not_selected");
        setOutputFolderError("");
        return;
      }

      if (appState.selectedOutputFolder.includes("[Browser Directory:")) {
        setOutputFolderVerifyStatus("browser_preview");
        setOutputFolderError("");
        return;
      }

      if (!isElectron) {
        setOutputFolderVerifyStatus("browser_preview");
        setOutputFolderError("");
        return;
      }

      const uvr = (window as any).uvr;
      if (uvr && typeof uvr.verifyOutputFolder === "function") {
        try {
          const res = await uvr.verifyOutputFolder(appState.selectedOutputFolder);
          if (res && res.exists) {
            if (res.writable) {
              setOutputFolderVerifyStatus("verified_writable");
              setOutputFolderError("");
            } else {
              setOutputFolderVerifyStatus("not_writable");
              setOutputFolderError(res.error || "No write permissions.");
            }
          } else {
            setOutputFolderVerifyStatus("missing");
            setOutputFolderError("Path does not exist on local disk.");
          }
        } catch (err: any) {
          console.error("verifyOutputFolder exception:", err);
          setOutputFolderVerifyStatus("selected_not_verified");
          setOutputFolderError(err.message);
        }
      } else {
        setOutputFolderVerifyStatus("selected_not_verified");
        setOutputFolderError("");
      }
    };

    verifyOutputFolderOnChanges();
  }, [appState.selectedOutputFolder, appState.checkboxSettings.sameAsInputFolder, appState.selectedInputs]);

  // Generate dynamic live output filename predictions (Rule 11)
  const predictedOutputNames = useMemo(() => {
    const activeMethodOpt =
      PROCESS_METHODS.find((m) => m.id === appState.processMethodId) ||
      PROCESS_METHODS[0];
    const dummyReq: ProcessingRequest = {
      inputs: appState.selectedInputs,
      outputFolder: appState.checkboxSettings.sameAsInputFolder
        ? "(Same as Input)"
        : appState.selectedOutputFolder,
      format: appState.outputFormat,
      model: activeModel,
      verifiedModelLocalPath,
      method: activeMethodOpt,
      processMethod: activeMethodOpt.id,
      selectedDevice: "cpu",
      customPythonPath: customPythonPath,
      parameters: appState.dropdownSettings,
      options: {
        ttaActive: appState.checkboxSettings.ttaActive,
        postProcessActive: appState.checkboxSettings.postProcessActive,
        vocalsOnly: appState.checkboxSettings.saveVocalsOnly,
        instrumentalOnly: appState.checkboxSettings.saveInstrumentalOnly,
        splitMode: appState.checkboxSettings.splitMode,
        saveAllOutputs: appState.checkboxSettings.saveAllOutputs,
        modelTestMode: appState.checkboxSettings.modelTestMode,
        createFolderPerTrack: appState.checkboxSettings.createFolderPerTrack,
      },
      timestamp: new Date().toISOString(),
    };
    return buildOutputNames(dummyReq);
  }, [
    appState.selectedInputs,
    appState.selectedOutputFolder,
    appState.processMethodId,
    activeModel,
    verifiedModelLocalPath,
    appState.outputFormat,
    appState.checkboxSettings,
  ]);

  // --- 2. THE STRICT PRECONDITIONS VALIDATION SYSTEM (Rule 8 & 9) ---
  const handleStartProcess = async () => {
    const validationErrors = validateState({
      selectedInputs: appState.selectedInputs,
      selectedOutputFolder: appState.selectedOutputFolder,
      processMethodId: appState.processMethodId,
      selectedModelId: appState.selectedModelId,
      outputFormat: appState.outputFormat,
      checkboxSettings: {
        saveVocalsOnly: appState.checkboxSettings.saveVocalsOnly,
        saveInstrumentalOnly: appState.checkboxSettings.saveInstrumentalOnly,
      },
    });

    if (validationErrors.length > 0) {
      // Dump errors directly into our live progress console service (Rule 12)
      setAppState((prev) => ({
        ...prev,
        processingStatus: "error",
        consoleLogs: [
          `[preflight-diag] INITIALIZING CRITICAL VALIDATION CHECK...`,
          `[error] PRECONDITION BLOCKED! Validation failed with following issues:`,
          ...validationErrors.map(
            (e) => `  -> Error field: [${e.field}] message: "${e.message}"`,
          ),
          `[error] Separation aborted. Correct setting parameters to release lock.`,
          ...prev.consoleLogs,
        ],
      }));
      setSimulationLog([
        `[error] BLOCKED: Precondition validation failed!`,
        ...validationErrors.map((e) => `✖ ${e.message}`),
      ]);
      return;
    }

    const modelReadyForNativeRun = modelProofEligibility.proofEligible && modelFileStatus === "hash_verified";

    // Check if selected model is verified on disk (Rule 17)
    if (!modelReadyForNativeRun || !verifiedModelLocalPath) {
      setAppState((prev) => ({
        ...prev,
        processingStatus: "error",
        consoleLogs: [
          `[preflight-diag] BLOCKED! Selected weight file "${activeModel.name}" is not verified on local disk.`,
          `[preflight-diag] Proof gate: ${modelProofEligibility.displayMessage}`,
          `[preflight-diag] Open Model Downloader to download, import, or repair this model before running AI separation.`,
          ...prev.consoleLogs,
        ],
      }));
      setSimulationLog([
        `[error] BLOCKED: Model weights are not verified for local AI execution.`,
        `Proof gate: ${modelProofEligibility.displayMessage}`,
        `Active model "${activeModel.name}" status: ${modelFileStatus}.`,
      ]);
      return;
    }

    // Electron environment: verify dependencies (FFmpeg, Python) interactively
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.checkFFmpegReady === "function") {
      setAppState((prev) => ({
        ...prev,
        processingStatus: "validating",
        consoleLogs: [
          `[diagnostics] Spawning platform integrity checks...`,
          `[ffmpeg] Querying native OS for FFmpeg system paths...`,
          ...prev.consoleLogs,
        ],
      }));
      setSimulationLog([
        `[diagnostics] Initializing preflight checklist...`,
        `[diagnostics] Spawning platform integrity checks...`,
      ]);

      try {
        const res = await uvr.checkFFmpegReady();
        if (res.ready) {
          setFfmpegStatus("ready");
          setSimulationLog((prevLog) => [
            ...prevLog,
            `[ffmpeg] OK: Resolved native FFmpeg binary in system path. Dynamic decoding codecs supported.`,
          ]);
        } else {
          setFfmpegStatus("missing");
          setAppState((prev) => ({
            ...prev,
            processingStatus: "error",
            consoleLogs: [
              `[ffmpeg] FAILED: Could not locate FFmpeg in path.`,
              `[error] FFmpeg is missing! Please install or add "ffmpeg" to path variables.`,
              ...prev.consoleLogs,
            ],
          }));
          setSimulationLog([
            `[error] BLOCKED: FFmpeg system binary is missing!`,
            `✖ FFmpeg must be installed and added to your system PATH to run local audio separation decode/encode formats.`,
          ]);
          return;
        }
      } catch (e: any) {
        setFfmpegStatus("missing");
        setAppState((prev) => ({
          ...prev,
          processingStatus: "error",
          consoleLogs: [
            `[ffmpeg] FAILED checking pathway: ${e.message}`,
            ...prev.consoleLogs,
          ],
        }));
        return;
      }

      try {
        const specs = await uvr.checkBackendDetails(customPythonPath || undefined);
        setBackendSpecs(specs);
        if (!specs.canRunAISeparation) {
          setBackendStatus("missing_env");
          const nativeBlockers = Array.isArray(specs.blockers) && specs.blockers.length > 0
            ? specs.blockers.map((b: any) => `${b.id}: ${b.label}`)
            : ["Python, audio-separator CLI, or PyTorch is not ready."];
          setAppState((prev) => ({
            ...prev,
            processingStatus: "error",
            consoleLogs: [
              `[backend_adapter] BLOCKED: Native AI backend is not ready.`,
              ...nativeBlockers.map((b: string) => `  -> ${b}`),
              ...prev.consoleLogs,
            ],
          }));
          setSimulationLog((prevLog) => [
            ...prevLog,
            `[error] BLOCKED: Native AI backend is not ready.`,
            ...nativeBlockers,
          ]);
          return;
        }
      } catch (e: any) {
        setBackendStatus("missing_env");
        setAppState((prev) => ({
          ...prev,
          processingStatus: "error",
          consoleLogs: [
            `[backend_adapter] FAILED checking backend details: ${e.message}`,
            ...prev.consoleLogs,
          ],
        }));
        return;
      }

      setBackendStatus("ready");
      setSimulationLog((prevLog) => [
        ...prevLog,
        `[model_integrity] OK: Native model path verified: ${verifiedModelLocalPath}`,
        `[backend_adapter] OK: Python, audio-separator CLI, PyTorch, and FFmpeg checks passed for CPU AI mode.`,
        `[preflight] Opening execution confirmation dispatch.`,
      ]);

      setShowConfirmModal(true);
      return;
    }

    setAppState((prev) => ({
      ...prev,
      processingStatus: "error",
      consoleLogs: [
        `[error] Browser Preview / Not runnable for native AI separation.`,
        `[error] Use the Electron desktop build to run local Python/audio-separator jobs.`,
        ...prev.consoleLogs,
      ],
    }));
    setSimulationLog([
      `[error] Browser Preview / Not runnable.`,
      `[error] Native Electron bridge is required for CPU AI separation proof.`,
    ]);
  };

  // Dispatch CLI commands using backend adapters (Rule 6)
  const handleExecuteSeparation = async () => {
    setShowConfirmModal(false);
    setIsSimulating(true);
    setSimProgress(0);

    if (!modelProofEligibility.proofEligible || modelFileStatus !== "hash_verified") {
      setIsSimulating(false);
      setAppState((prev) => ({
        ...prev,
        processingStatus: "error",
        consoleLogs: [
          `[preflight-diag] BLOCKED: ${modelProofEligibility.displayMessage}`,
          ...prev.consoleLogs,
        ],
      }));
      setSimulationLog([
        `[error] BLOCKED: CPU AI proof requires a model with matching local SHA-256.`,
        modelProofEligibility.displayMessage,
      ]);
      return;
    }

    const activeMethodOpt =
      PROCESS_METHODS.find((m) => m.id === appState.processMethodId) ||
      PROCESS_METHODS[0];
    const procRequest: ProcessingRequest = {
      inputs: appState.selectedInputs,
      outputFolder: appState.checkboxSettings.sameAsInputFolder
        ? "(Same as Input)"
        : appState.selectedOutputFolder,
      format: appState.outputFormat,
      model: activeModel,
      verifiedModelLocalPath,
      method: activeMethodOpt,
      processMethod: activeMethodOpt.id,
      userSelectedMode: userSelectedMode,
      selectedDevice: "cpu",
      customPythonPath: customPythonPath,
      parameters: {
        ...appState.dropdownSettings,
        executionDevice: "cpu",
      },
      options: {
        ttaActive: appState.checkboxSettings.ttaActive,
        postProcessActive: appState.checkboxSettings.postProcessActive,
        vocalsOnly: appState.checkboxSettings.saveVocalsOnly,
        instrumentalOnly: appState.checkboxSettings.saveInstrumentalOnly,
        splitMode: appState.checkboxSettings.splitMode,
        saveAllOutputs: appState.checkboxSettings.saveAllOutputs,
        modelTestMode: appState.checkboxSettings.modelTestMode,
        createFolderPerTrack: appState.checkboxSettings.createFolderPerTrack,
      },
      timestamp: new Date().toISOString(),
    };

    // Get specific pipeline adapter (Rule 6)
    const adapter = getAdapterForModel(activeModel);
    const generatedCLI = adapter.buildCLICommand(procRequest);

    setAppState((prev) => ({
      ...prev,
      processingStatus: "running",
      consoleLogs: [
        `[diagnostics] Spawning CLI execution wrapper under ${adapter.name}`,
        `[shell_command] executing: $ ${generatedCLI}`,
        ...prev.consoleLogs,
      ],
    }));

    setSimulationLog([
      `[adapter] Routing weight targets to ${adapter.id}`,
      `[command] ${generatedCLI}`,
    ]);

    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.startProcessing === "function") {
      try {
        const res = await uvr.startProcessing(procRequest);
        if (res.success) {
          // Native completion events will stream into the global uvr.onBackendProgress subscriber
        } else {
          setIsSimulating(false);
          setAppState((prev) => ({
            ...prev,
            processingStatus: "error",
            consoleLogs: [
              `[error] Local execution returned non-zero code: ${res.error || "Subprocess exited unexpectedly."}`,
              ...prev.consoleLogs,
            ],
          }));
          setSimulationLog((current) => [
            ...current,
            `[error] Separation failed: ${res.error}`,
          ]);
        }
      } catch (e: any) {
        setIsSimulating(false);
        setAppState((prev) => ({
          ...prev,
          processingStatus: "error",
          consoleLogs: [
            `[error] Local executing trigger exception: ${e.message}`,
            ...prev.consoleLogs,
          ],
        }));
        setSimulationLog((current) => [
          ...current,
          `[error] Execution trigger error: ${e.message}`,
        ]);
      }
      return;
    }

    // Direct Web/Browser Blocker: Simulation is removed as per Rule 10 & 8
    setIsSimulating(false);
    setAppState((prev) => ({
      ...prev,
      processingStatus: "error",
      consoleLogs: [
        `[error] Execution blocked! Native backend bridge is unavailable in the current environment.`,
        `[error] OpenStem AI Audio Workstation requires the native desktop container shell.`,
        `[error] Interactive sandbox elements are restricted to preflight configuration. Model downloads require the native Model Manager bridge.`,
        ...prev.consoleLogs,
      ],
    }));
    setSimulationLog((current) => [
      ...current,
      `[error] Native backend Unavailable. Browser simulation is blocked.`,
    ]);
  };

  // --- 3. CONFIRMED PROCESSING SHUTDOWN SWITCHS (Rule 13) ---
  const handleHaltJobConfirm = async () => {
    const uvr = (window as any).uvr;
    let haltResult: any = { ok: false, status: "error", error: "Native bridge unavailable." };
    if (uvr && typeof uvr.haltProcessing === "function") {
      try {
        haltResult = await uvr.haltProcessing();
      } catch (e: any) {
        haltResult = { ok: false, status: "error", error: e.message };
      }
    }

    if (activeIntervalRef.current) {
      clearInterval(activeIntervalRef.current);
      activeIntervalRef.current = null;
    }

    setIsSimulating(false);
    setSimProgress(0);
    setShowStopHaltAlert(false);

    setAppState((prev) => ({
      ...prev,
      processingStatus: "cancelled",
      progress: 0,
      consoleLogs: [
        `[halt] Native cancellation request status: ${haltResult.status}.`,
        ...(haltResult.error ? [`[halt] Error: ${haltResult.error}`] : []),
        ...prev.consoleLogs,
      ],
    }));

    setSimulationLog((current) => [
      ...current,
      `[halt] Native cancellation request status: ${haltResult.status}.`,
      ...(haltResult.error ? [`[halt] Error: ${haltResult.error}`] : []),
    ]);
  };

  // --- 4. NATIVE WEIGHT DOWNLOAD BRIDGE (no simulated cache success) ---
  const handleTriggerModelDownload = async (modelId: string) => {
    const targetModel = modelRegistryState.find((m) => m.id === modelId);
    if (!targetModel) return;

    const appendLogs = (logs: string[]) => {
      setSimulationLog((current) => [...current, ...logs]);
      setAppState((prev) => ({
        ...prev,
        consoleLogs: [...logs, ...prev.consoleLogs],
      }));
    };

    if (targetModel.verifiedStatus !== "verified" || !targetModel.checksum) {
      appendLogs([
        `[model_downloader] Download blocked for "${targetModel.name}". Source integrity is not verified.`,
        `[model_downloader] Open Model Manager to import with an expected SHA-256 or repair source metadata before downloading.`,
      ]);
      return;
    }

    if (!targetModel.downloadUrl) {
      appendLogs([
        `[model_downloader] Download blocked for "${targetModel.name}". No direct source URL is registered.`,
      ]);
      return;
    }

    const uvr = (window as any).uvr;
    if (!uvr || typeof uvr.downloadModel !== "function" || typeof uvr.verifyModelHash !== "function") {
      appendLogs([
        `[model_downloader] Download blocked for "${targetModel.name}". Native Electron downloader/verifier is unavailable.`,
        `[model_downloader] Browser Preview / Not runnable for model downloads or SHA-256 verification.`,
      ]);
      return;
    }

    setDownloadingModelId(modelId);
    setDownloadProgress(0);
    appendLogs([
      `[model_downloader] Native download requested for "${targetModel.name}".`,
      `[model_downloader] Source URL: ${targetModel.downloadUrl}`,
    ]);

    try {
      const res = await uvr.downloadModel(targetModel.id, targetModel.downloadUrl, targetModel.architecture, targetModel.name);
      if (!res?.success) {
        appendLogs([`[model_downloader] Download failed: ${res?.error || "Unknown downloader error."}`]);
        return;
      }

      setDownloadProgress(100);
      const verification = await uvr.verifyModelHash({
        ...targetModel,
        filePath: res.absolutePath || targetModel.filePath,
        downloaded: false,
      });

      if (verification?.status !== "hash_verified") {
        appendLogs([
          `[model_downloader] Downloaded file is not proof-eligible: ${verification?.status || "verification_failed"}.`,
          `[model_downloader] Model remains unavailable for AI proof until SHA-256 verification passes.`,
        ]);
        return;
      }

      setModelRegistryState((currentList) =>
        currentList.map((m) =>
          m.id === modelId ? { ...m, downloaded: true, filePath: verification.localPath || res.absolutePath || m.filePath } : m,
        ),
      );
      setModelFileStatus("hash_verified");
      setVerifiedModelLocalPath(verification.localPath || res.absolutePath || "");
      appendLogs([
        `[model_downloader] Download complete for "${targetModel.name}".`,
        `[model_downloader] SHA-256 verification passed through native integrity check.`,
      ]);
    } catch (e: any) {
      appendLogs([`[model_downloader] Download error: ${e.message || "Unknown error."}`]);
    } finally {
      setDownloadingModelId(null);
    }
  };

  const handleCustomAddInputTrack = async () => {
    // Elegant native Electron integration fallbacks for production-grade builds
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.selectInputFiles === "function") {
      try {
        const filePaths: string[] = await uvr.selectInputFiles();
        if (filePaths && filePaths.length > 0) {
          setAppState((prev) => ({
            ...prev,
            selectedInputs: [...prev.selectedInputs, ...filePaths],
            consoleLogs: [
              `[filesystem] Imported native file tracks: ${filePaths.join(", ")}`,
              ...prev.consoleLogs,
            ],
          }));
          setSimulationLog((current) => [
            ...current,
            `[filesystem] Selected local system file queue targets: ${filePaths.join(", ")}`,
          ]);
          return;
        }
      } catch (err) {
        console.error("Error accessing native selectInputFiles:", err);
      }
    }

    // Standard browser file picker fallback
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "audio/*";
      input.multiple = true;
      input.onchange = (e: any) => {
        const files: FileList = e.target.files;
        if (files && files.length > 0) {
          const fileNames = Array.from(files).map((f) => f.name);
          setAppState((prev) => ({
            ...prev,
            selectedInputs: [...prev.selectedInputs, ...fileNames],
            consoleLogs: [
              `[filesystem] Imported local audio tracks: ${fileNames.join(", ")}`,
              ...prev.consoleLogs,
            ],
          }));
          setSimulationLog((current) => [
            ...current,
            `[filesystem] Selected browser file queue targets: ${fileNames.join(", ")}`,
          ]);
        }
      };
      input.click();
    } catch (e) {
      // Emergency sandbox mockup fallback if file API fails
      const defaultTrackSuggestions = [
        "heavy_guitar_solo_dry.wav",
        "backing_vocals_reverb_split.mp3",
        "studio_live_drums.flac",
        "synths_arpeggios_mono.wav",
      ];
      const item =
        defaultTrackSuggestions[
          Math.floor(Math.random() * defaultTrackSuggestions.length)
        ];
      const uniqueName = `${item.split(".")[0]}_${Math.floor(Math.random() * 1000)}.${item.split(".")[1]}`;

      setAppState((prev) => ({
        ...prev,
        selectedInputs: [...prev.selectedInputs, uniqueName],
        consoleLogs: [
          `[filesystem] Added custom file queue track: "${uniqueName}"`,
          ...prev.consoleLogs,
        ],
      }));

      setSimulationLog((current) => [
        ...current,
        `[filesystem] Added input track to ensembler heap: "${uniqueName}"`,
      ]);
    }
  };

  const handleRemoveInputTrack = (idx: number) => {
    setAppState((prev) => {
      const copy = [...prev.selectedInputs];
      const removed = copy.splice(idx, 1);
      return {
        ...prev,
        selectedInputs: copy,
        consoleLogs: [
          `[filesystem] Removed input index target: "${removed[0]}"`,
          ...prev.consoleLogs,
        ],
      };
    });
  };

  // Handle drag/drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const namesList = Array.from(files).map((f: any) => f.name);
      setAppState((prev) => ({
        ...prev,
        selectedInputs: [...prev.selectedInputs, ...namesList],
        consoleLogs: [
          `[filesystem] Draged and dropped ${namesList.length} files successfully into active list buffers.`,
          ...prev.consoleLogs,
        ],
      }));
      setSimulationLog((prev) => [
        ...prev,
        `[filesystem] Dropped files: ${namesList.join(", ")} successfully imported.`,
      ]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative min-w-0 w-full box-border">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative min-w-0 w-full box-border">
        {/* LEFT COLUMN: THE SIMULATED DESKTOP WINDOW SHELL (faithful layout) */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-6 relative min-w-0 w-full box-border">
          {/* FAITHFUL RECREATION CARD DESKTOP FRAME */}
          <div className="p-6 rounded-2xl bg-[#080a13]/85 border border-glass-border shadow-2xl relative space-y-5.5 backdrop-blur-3xl overflow-hidden shadow-glass-inset">
            {/* Window chrome header buttons */}
            <div className="flex justify-between items-center bg-[#0d0f20]/60 -mx-6 -mt-6 px-6 py-3 border-b border-white/5 relative">
              <div className="flex gap-1.5 w-[140px]">
                <span className="w-3 h-3 rounded-full bg-rose-500/30 border border-rose-500/40"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/30 border border-yellow-500/40"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/40"></span>
              </div>
              <span className="hidden sm:block text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold text-center absolute left-1/2 -translate-x-1/2">
                {APP_SHORT_NAME} AI Engine Console
              </span>
              <div className="flex gap-3 justify-end items-center w-[140px]">
                <button
                  onClick={() => toggleHelpSection()}
                  title="Toggle Help Tooltips"
                  className={`text-[9px] font-mono font-bold flex items-center gap-1 px-1.5 py-0.5 rounded transition cursor-pointer select-none ${showTooltips ? "text-indigo-300 bg-indigo-500/20" : "text-slate-500 hover:text-slate-300 bg-white/5"}`}
                >
                  <HelpCircle className="w-3 h-3" />
                  {showTooltips ? "HELP ON" : "HELP OFF"}
                </button>
                <span className="text-[10px] font-mono text-cyan-405 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/10">
                  {RELEASE_STATE}
                </span>
              </div>
            </div>

            <HelpText
              sectionId="classic_console"
              text="Help: Drag and drop files or folders directly into the window, configure your preferred audio-separation model constraints, choose your execution backend, and click 'Run Stem Extraction'."
            />

            <div className="space-y-4">
              {/* FILE QUEUE ZONE: MULTIPLE FILES HANDLING */}
              <div className="space-y-2">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`p-4 rounded-xl border transition-all duration-300 relative ${
                    isDragOver
                      ? "bg-blue-600/10 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] ring-1 ring-cyan-500/30"
                      : "bg-black/35 border-white/5 hover:border-white/12"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <InteractiveTooltip
                        enabled={showTooltips}
                        content="Select Input - Here is where you select the audio files(s) you wish to process."
                      >
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono flex items-center gap-1.5 cursor-help">
                          <Music className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                          Selected Input Tracks Queue (
                          {appState.selectedInputs.length})
                        </label>
                      </InteractiveTooltip>
                      <span className="text-[8px] font-mono text-cyan-500 uppercase font-extrabold bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/10">
                        MULTI-SELECTION / DRAG TARGET
                      </span>
                    </div>

                    {/* Track items chip container */}
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1.5 bg-black/25 rounded-lg border border-white/5">
                      {appState.selectedInputs.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-[#121625] px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 transition-all text-xs font-mono text-slate-200 shadow-sm"
                        >
                          <File className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          <span className="max-w-[150px] truncate">{file}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInputTrack(idx)}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer ml-1 text-[11px]"
                            title="Remove file from separation heap"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {appState.selectedInputs.length === 0 && (
                        <span className="text-[11px] font-sans text-slate-500 italic p-1">
                          No inputs specified. Drop waves here or click Browse.
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                      {/* Manual adding track trigger */}
                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={handleCustomAddInputTrack}
                          className="px-3 bg-[#11242c] hover:bg-cyan-900/40 border border-cyan-700/20 text-cyan-400 hover:text-cyan-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer py-2"
                        >
                          <Plus className="w-4 h-4" />
                          Browse Inputs...
                        </button>
                      </div>

                      {/* Export Pill Format buttons */}
                      <div className="flex items-center gap-2.5">
                        <InteractiveTooltip
                          enabled={showTooltips}
                          content="Save Format - Decide to export output as WAV, FLAC or MP3 format."
                        >
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase cursor-help">
                            Export:
                          </span>
                        </InteractiveTooltip>
                        <div className="flex bg-[#070913] p-1 rounded-xl border border-white/10 font-sans relative w-48">
                          {(["WAV", "FLAC", "MP3"] as OutputFormat[]).map(
                            (fmt) => {
                              const isSelected = appState.outputFormat === fmt;
                              return (
                                <button
                                  key={fmt}
                                  onClick={() =>
                                    setAppState((prev) => ({
                                      ...prev,
                                      outputFormat: fmt,
                                    }))
                                  }
                                  className={`flex-grow relative py-1 rounded-lg text-[10px] font-bold select-none transition-all duration-300 cursor-pointer text-center outline-none ${
                                    isSelected
                                      ? "text-white"
                                      : "text-slate-500 hover:text-slate-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <motion.div
                                      layoutId="activeFormatPill"
                                      className="absolute inset-0 bg-white/10 shadow-[inset_0_1px_0_1px_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.5)] rounded-lg border border-white/10"
                                      transition={{
                                        type: "spring",
                                        stiffness: 380,
                                        damping: 28,
                                      }}
                                    />
                                  )}
                                  <span className="relative z-10">{fmt}</span>
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* OUTPUT PATH SELECTOR ZONE */}
              <div className="p-4 rounded-xl bg-black/25 border border-white/5 hover:border-white/10 transition-colors">
                <div className="space-y-1.5 flex flex-col">
                  <div className="flex justify-between items-center w-full">
                    <InteractiveTooltip
                      enabled={showTooltips}
                      content="Select Output - Here is where you select the directory where your processed files are to be saved."
                    >
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono flex items-center gap-1.5 cursor-help">
                        <Folder className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                        Select Output Workspace Directory (C:\\...)
                      </label>
                    </InteractiveTooltip>
                    <div className="flex items-center gap-4">
                      <label
                        className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono text-slate-400 hover:text-white transition-colors"
                        title="Creates a separate subfolder for each track"
                      >
                        <input
                          type="checkbox"
                          checked={
                            appState.checkboxSettings.createFolderPerTrack ||
                            false
                          }
                          onChange={(e) =>
                            setAppState((prev) => ({
                              ...prev,
                              checkboxSettings: {
                                ...prev.checkboxSettings,
                                createFolderPerTrack: e.target.checked,
                              },
                            }))
                          }
                          className="w-3 h-3 rounded bg-black/50 border-slate-600 text-indigo-500 focus:ring-0 cursor-pointer"
                        />
                        Create Folder per Track
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono text-slate-400 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={
                            appState.checkboxSettings.sameAsInputFolder || false
                          }
                          onChange={(e) =>
                            setAppState((prev) => ({
                              ...prev,
                              checkboxSettings: {
                                ...prev.checkboxSettings,
                                sameAsInputFolder: e.target.checked,
                              },
                            }))
                          }
                          className="w-3 h-3 rounded bg-black/50 border-slate-600 text-indigo-500 focus:ring-0 cursor-pointer"
                        />
                        Same as Input Folder
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={appState.checkboxSettings.sameAsInputFolder}
                      value={
                        appState.checkboxSettings.sameAsInputFolder
                          ? "[ SAME AS INPUT FOLDER ]"
                          : appState.selectedOutputFolder
                      }
                      onChange={(e) =>
                        setAppState((prev) => ({
                          ...prev,
                          selectedOutputFolder: e.target.value,
                        }))
                      }
                      className="flex-grow bg-black/45 border border-[#ffffff]/10 px-3 py-2 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500/40 disabled:opacity-50 disabled:text-slate-500"
                      placeholder="Configure separation output destination folder..."
                    />
                    <button
                      disabled={appState.checkboxSettings.sameAsInputFolder}
                      onClick={async () => {
                        const uvr = (window as any).uvr;
                        if (uvr && typeof uvr.selectOutputFolder === "function") {
                          try {
                            const folder = await uvr.selectOutputFolder();
                            if (folder) {
                              setAppState((prev) => ({
                                ...prev,
                                selectedOutputFolder: folder,
                                consoleLogs: [
                                  `[filesystem] Native output destination mapped: "${folder}"`,
                                  ...prev.consoleLogs,
                                ],
                              }));
                              return;
                            }
                          } catch (err) {
                            console.error("Error accessing native selectOutputFolder:", err);
                          }
                        }

                        // Standard browser folder picker fallback
                        try {
                          const input = document.createElement("input");
                          input.type = "file";
                          (input as any).webkitdirectory = true;
                          (input as any).directory = true;
                          input.onchange = (e: any) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              const firstFile = files[0];
                              const relativePath = firstFile.webkitRelativePath;
                              // Approximate folder name
                              const folderName = relativePath ? relativePath.split('/')[0] : "Selected Folder";
                              setAppState((prev) => ({
                                ...prev,
                                selectedOutputFolder: `[Browser Directory: ${folderName}]`,
                                consoleLogs: [
                                  `[filesystem] Mapped browser file-origin folder: "${folderName}"`,
                                  ...prev.consoleLogs,
                                ],
                              }));
                            }
                          };
                          input.click();
                        } catch (e) {
                          setAppState((prev) => ({
                            ...prev,
                            selectedOutputFolder: "",
                            consoleLogs: [
                              "[filesystem] Browser sandbox does not support direct directory picking. Please type your desired local directory manually.",
                              ...prev.consoleLogs,
                            ],
                          }));
                        }
                      }}
                      className="px-3 bg-[#161a2e] hover:bg-[#202747] border border-[#ffffff]/10 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Select standard outputs folder mapping"
                    >
                      <Folder className="w-4 h-4" />
                      Browse Output
                    </button>
                  </div>
                </div>
              </div>

              {/* PROCESS METHODS SELECT GRID */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 bg-white/[0.02] p-4.5 rounded-xl border border-white/5 shadow-inner">
                {/* Process Method / Options Section */}
                <div className="grid gap-4 xl:col-span-2 min-w-0 w-full box-border" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
                  {/* Choose Process Category Options (Rule 3 & 7) */}
                  <div className="space-y-1.5 flex flex-col font-medium">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono inline-block min-h-[32px] flex items-end pb-1">
                      Process Method
                    </span>
                    <InteractiveTooltip
                      enabled={showTooltips}
                      content="Choose Process Method - Here is where you choose between different AI networks and algorithms to process your track."
                      position="top"
                      className="w-full"
                    >
                      <div className="relative w-full">
                        <select
                          value={appState.processMethodId}
                          onChange={(e) =>
                            setAppState((prev) => ({
                              ...prev,
                              processMethodId: e.target.value,
                            }))
                          }
                          className="w-full bg-[#0a0c14]/40 border border-[#ffffff]/10 hover:border-white/20 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer uppercase font-mono font-bold transition-all appearance-none truncate"
                        >
                          {PROCESS_METHODS.map((m) => (
                            <option
                              key={m.id}
                              value={m.id}
                              className="bg-[#0e111d] text-slate-200"
                            >
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500 text-[10px]">
                          ▼
                        </div>
                      </div>
                    </InteractiveTooltip>
                  </div>

                  {/* Dynamic Settings Fields (Rule 18) - Render BOTH options next to each other */}
                  <div className="grid gap-3 min-w-0 w-full box-border" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
                    {(() => {
                      const firstOptionSetting =
                        SETTINGS_SCHEMAS[appState.processMethodId]?.[0];
                      const secondOptionSetting =
                        SETTINGS_SCHEMAS[appState.processMethodId]?.[1];

                      const renderSetting = (setting: any) => {
                        if (!setting) return null;
                        const isDisabled =
                          setting.utilityRule === "split_mode_dependent" &&
                          appState.checkboxSettings.splitMode;
                        const stateValue =
                          setting.key === "noiseReduction"
                            ? appState.dropdownSettings.noiseReduction
                            : appState.dropdownSettings.chunks;

                        return (
                          <div
                            className="space-y-1.5 flex flex-col font-medium"
                            key={setting.key}
                          >
                            <span className="text-[10px] uppercase font-bold tracking-wider text-green-500/80 font-mono block whitespace-normal break-words min-h-[32px] flex items-end pb-1 leading-tight">
                              {setting.label}
                            </span>
                            <InteractiveTooltip
                              enabled={showTooltips}
                              content={`${setting.label} - ${setting.helpText}`}
                              position="top"
                              className="w-full"
                            >
                              <div className="relative w-full">
                                {setting.type === "select" ? (
                                  <select
                                    value={stateValue}
                                    disabled={isDisabled}
                                    onChange={(e) =>
                                      setAppState((prev) => ({
                                        ...prev,
                                        dropdownSettings: {
                                          ...prev.dropdownSettings,
                                          [setting.key]: e.target.value,
                                        },
                                      }))
                                    }
                                    className={`w-full bg-[#0a0c14]/40 border border-[#ffffff]/10 hover:border-white/20 rounded-lg pl-3 pr-8 py-2 text-xs font-mono font-bold cursor-pointer transition-all appearance-none select-none truncate ${
                                      isDisabled
                                        ? "opacity-40 cursor-not-allowed text-slate-500 border-white/5"
                                        : "text-slate-200"
                                    }`}
                                  >
                                    {setting.allowedValues?.map(
                                      (val: string) => (
                                        <option
                                          key={val}
                                          value={val}
                                          className="bg-[#0e111d] text-slate-200"
                                        >
                                          {val}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                ) : (
                                  <div className="flex gap-2 items-center px-1">
                                    <input
                                      type="range"
                                      min={setting.min || 1}
                                      max={setting.max || 10}
                                      step={setting.step || 1}
                                      value={isNaN(Number(stateValue)) ? setting.defaultValue : stateValue}
                                      disabled={isDisabled}
                                      onChange={(e) =>
                                        setAppState((prev) => ({
                                          ...prev,
                                          dropdownSettings: {
                                            ...prev.dropdownSettings,
                                            [setting.key]: e.target.value,
                                          },
                                        }))
                                      }
                                      className={`flex-grow h-1 accent-cyan-500 cursor-pointer ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                                    />
                                    <span className="text-xs font-mono text-cyan-400 font-bold min-w-[20px] max-w-[60px] truncate text-right shrink-0 block">
                                      {isNaN(Number(stateValue)) ? setting.defaultValue : stateValue}
                                    </span>
                                  </div>
                                )}
                                {!isDisabled && setting.type === "select" && (
                                  <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500 text-[10px]">
                                    ▼
                                  </div>
                                )}
                              </div>
                            </InteractiveTooltip>
                          </div>
                        );
                      };

                      return (
                        <>
                          {renderSetting(firstOptionSetting)}
                          {renderSetting(secondOptionSetting)}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Model Selector Dropdown Filter (Rule 5 & 17) */}
                <div className="space-y-1.5 flex flex-col font-medium">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono flex flex-wrap justify-between items-end min-h-[32px] pb-1 gap-1">
                    <span>Choose Model Weight</span>
                    <span className="text-[9px] text-[#34d399] font-normal lowercase tracking-normal bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 leading-none">
                      Hash verify auto
                    </span>
                  </span>
                  <InteractiveTooltip
                    enabled={showTooltips}
                    content="Choose Model - Each process method comes with its own set of options and models. Here is where you choose the model associated with the selected process method."
                    position="top"
                    className="w-full"
                  >
                    <div className="relative flex gap-2 w-full">
                      <select
                        value={appState.selectedModelId}
                        onChange={(e) =>
                          setAppState((prev) => ({
                            ...prev,
                            selectedModelId: e.target.value,
                          }))
                        }
                        className="flex-grow w-full bg-[#0a0c14]/40 border border-[#ffffff]/10 hover:border-white/20 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-mono transition-all appearance-none truncate relative"
                      >
                        {modelRegistryState
                          .filter((m) => {
                            const method = PROCESS_METHODS.find(
                              (pr) => pr.id === appState.processMethodId,
                            );
                            if (!method) return false;
                            if (method.id === "ensemble")
                              return m.architecture === "Ensemble";
                            if (method.id === "bs_roformer")
                              return m.architecture === "RoFormer";
                            if (method.id === "vr")
                              return m.architecture === "VR";
                            if (method.id === "mdx")
                              return m.architecture === "MDX-Net";
                            if (method.id === "demucs")
                              return m.architecture === "Demucs";
                            if (method.id === "custom")
                              return m.architecture === "Custom";
                            return false;
                          })
                          .map((m) => (
                            <option
                              key={m.id}
                              value={m.id}
                              className="bg-[#0e111d] text-slate-200 font-mono"
                            >
                              {m.name} {!m.downloaded ? " (Unavailable)" : ""}
                            </option>
                          ))}
                      </select>
                      <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500 text-[10px]">
                        ▼
                      </div>

                      {/* Quick Cache Status download trigger trigger button (Rule 17) */}
                      {!activeModel.downloaded && (
                        <button
                          onClick={() =>
                            handleTriggerModelDownload(activeModel.id)
                          }
                          disabled={downloadingModelId !== null}
                          className="px-3.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer min-w-[130px]"
                          title="Download model weights to safe local cache folder"
                        >
                          {downloadingModelId === activeModel.id ? (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-300">
                              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                              {downloadProgress}%
                            </div>
                          ) : (
                            <>
                              <DownloadCloud className="w-3.5 h-3.5 mr-1" />
                              Verify / Download
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </InteractiveTooltip>
                  {activeModel?.description && (
                    <div className="mt-1 text-xs text-slate-400 bg-white/5 border border-white/5 p-2 rounded line-clamp-2" title={activeModel.description}>
                      {activeModel.description}
                    </div>
                  )}
                </div>
              </div>

              {/* DYNAMIC CHECKBOX SETTINGS LIST */}
              <div className="p-4.5 bg-black/20 rounded-xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    Separation Checkbox Flags
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 font-extrabold uppercase bg-cyan-950/45 px-2 py-0.5 rounded border border-cyan-950">
                    Engine constraints matched
                  </span>
                </div>

                <div className="grid gap-3.5 text-xs min-w-0" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
                  {/* Common GPU/CPU Mapping */}
                  <div className="flex flex-col gap-2 p-3.5 bg-black/30 rounded-xl border border-white/5 col-span-full">
                    <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                        Hardware Execution Device
                      </span>
                      <span className="text-[9px] font-mono text-cyan-400 font-extrabold uppercase bg-[#001f3f]/50 px-2 py-0.5 rounded border border-cyan-500/20">
                        Diagnostics Active
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-1.5">
                      {/* Left: Device selection select */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Device Mode</label>
                        <select
                          value={appState.dropdownSettings.executionDevice || "cpu"}
                          onChange={(e) =>
                            setAppState((prev) => ({
                              ...prev,
                              dropdownSettings: {
                                ...prev.dropdownSettings,
                                executionDevice: e.target.value as any,
                              },
                            }))
                          }
                          className="w-full bg-[#0a0c14]/40 border border-[#ffffff]/10 hover:border-white/20 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 cursor-pointer uppercase font-mono font-bold transition-all appearance-none truncate"
                        >
                          <option value="auto" className="bg-[#0e111d] text-slate-200">Auto Detect</option>
                          <option value="cpu" className="bg-[#0e111d] text-slate-200">CPU Only</option>
                          <option value="cuda" className="bg-[#0e111d] text-slate-200">NVIDIA CUDA</option>
                          <option value="mps" className="bg-[#0e111d] text-slate-200">Apple MPS</option>
                          <option value="dml" className="bg-[#0e111d] text-slate-200">DirectML (Experimental / Delegated / Not locally proven)</option>
                        </select>
                      </div>

                      {/* Right: Device status badge */}
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Device Status</label>
                        <div className="p-2 rounded-lg bg-black/50 border border-white/10 flex flex-col justify-center min-h-[34px]">
                          {(() => {
                            const devMode = appState.dropdownSettings.executionDevice || "cpu";
                            
                            // Check compatibility map
                            const capability = BACKEND_COMPATIBILITY_MAP[activeModel?.architecture || "VR"];
                            
                            if (!(window as any).uvr) {
                              return (
                                <span className="text-yellow-400 text-xs font-mono font-bold uppercase truncate">
                                  ● Browser Sandbox
                                </span>
                              );
                            }
                            
                            if (!backendSpecs) {
                              return (
                                <span className="text-slate-400 text-xs font-mono font-bold uppercase animate-pulse truncate">
                                  ● Detecting...
                                </span>
                              );
                            }

                            // Model capability override check
                            if (devMode !== "cpu" && capability && capability.gpuExecutionState === "missing") {
                              return (
                                <span className="text-red-400 text-xs font-mono font-bold uppercase truncate" title="Model architecture does not support GPU acceleration.">
                                  ● Backend Does Not Support Selected Device
                                </span>
                              );
                            }

                            if (devMode === "cpu") {
                              return (
                                <span className="text-slate-400 text-xs font-mono font-bold uppercase truncate">
                                  ● CPU Only
                                </span>
                              );
                            }

                            if (devMode === "cuda") {
                              if (!backendSpecs.torchInstalled) {
                                return (
                                  <span className="text-red-400 text-xs font-mono font-bold uppercase truncate" title="NVIDIA driver may be present, but PyTorch and compatible Python backend are not fully installed.">
                                    ● GPU Blocked: Missing compatible backend
                                  </span>
                                );
                              }
                              if (!backendSpecs.cudaAvailable) {
                                return (
                                  <span className="text-orange-400 text-xs font-mono font-bold uppercase truncate" title="NVIDIA CUDA toolkit or CUDA-enabled PyTorch build is missing.">
                                    ● GPU Blocked: Missing CUDA PyTorch
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-col">
                                  <span className="text-green-400 text-xs font-mono font-bold uppercase truncate">
                                    ● CUDA Available
                                  </span>
                                  {backendSpecs.gpuDeviceName && backendSpecs.gpuDeviceName !== "None" && (
                                    <span className="text-[9px] text-slate-400 uppercase font-mono truncate">
                                      {backendSpecs.gpuDeviceName} {backendSpecs.vramDisplay !== 'None' ? `(${backendSpecs.vramDisplay})` : ''}
                                    </span>
                                  )}
                                </div>
                              );
                            }

                            if (devMode === "mps") {
                              if (!backendSpecs.mpsAvailable) {
                                return (
                                  <span className="text-orange-400 text-xs font-mono font-bold uppercase truncate" title="Apple Metal Performance Shaders are not available on this platform.">
                                    ● MPS Not Available
                                  </span>
                                );
                              }
                              return (
                                <span className="text-green-400 text-xs font-mono font-bold uppercase truncate">
                                  ● MPS Available
                                </span>
                              );
                            }

                            if (devMode === "dml") {
                              return (
                                <span className="text-cyan-400 text-[10px] font-mono font-bold uppercase truncate" title="DirectML conversion mode will be dispatched.">
                                  ● GPU (DML - Delegated / Not proven)
                                </span>
                              );
                            }

                            if (devMode === "auto") {
                              if (backendSpecs.cudaAvailable) {
                                return (
                                  <div className="flex flex-col">
                                    <span className="text-green-400 text-xs font-mono font-bold uppercase truncate">
                                      ● GPU Available (CUDA Auto)
                                    </span>
                                    {backendSpecs.gpuDeviceName && backendSpecs.gpuDeviceName !== "None" && (
                                      <span className="text-[9px] text-slate-400 uppercase font-mono truncate font-semibold">
                                        Active: {backendSpecs.gpuDeviceName}
                                      </span>
                                    )}
                                  </div>
                                );
                              } else if (backendSpecs.mpsAvailable) {
                                return (
                                  <span className="text-green-400 text-xs font-mono font-bold uppercase truncate">
                                    ● GPU Available (MPS Auto)
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="text-slate-400 text-xs font-mono font-bold uppercase truncate">
                                    ● CPU Only (Auto Fallback)
                                  </span>
                                );
                              }
                            }

                            return (
                              <span className="text-slate-400 text-xs font-mono font-semibold uppercase truncate">
                                ● CPU Only
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mutually exclusive stem selectors (Rule 10) */}
                  {(appState.processMethodId === "vr" ||
                    appState.processMethodId === "mdx") && (
                    <>
                      <InteractiveTooltip
                        enabled={showTooltips}
                        content="Save Vocals Only - Allows the user to save only the vocal stem."
                      >
                        <label
                          className={`flex items-center gap-2.5 select-none cursor-help transition-colors ${
                            appState.checkboxSettings.saveInstrumentalOnly
                              ? "opacity-45 text-slate-500 line-through"
                              : "text-slate-300 hover:text-white"
                          }`}
                          title="Vocal isolation stem output compilation focus"
                        >
                          <input
                            type="checkbox"
                            disabled={
                              appState.checkboxSettings.saveInstrumentalOnly
                            }
                            checked={appState.checkboxSettings.saveVocalsOnly}
                            onChange={(e) =>
                              setAppState((prev) => ({
                                ...prev,
                                checkboxSettings: {
                                  ...prev.checkboxSettings,
                                  saveVocalsOnly: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                          />
                          <span>Save Vocals Only</span>
                        </label>
                      </InteractiveTooltip>

                      <InteractiveTooltip
                        enabled={showTooltips}
                        content="Save Instrumental Only - Allows the user to only save the instrumental stem."
                      >
                        <label
                          className={`flex items-center gap-2.5 select-none cursor-help transition-colors ${
                            appState.checkboxSettings.saveVocalsOnly
                              ? "opacity-45 text-slate-500 line-through"
                              : "text-slate-300 hover:text-white"
                          }`}
                          title="Instrumental extraction stem output compilation focus"
                        >
                          <input
                            type="checkbox"
                            disabled={appState.checkboxSettings.saveVocalsOnly}
                            checked={
                              appState.checkboxSettings.saveInstrumentalOnly
                            }
                            onChange={(e) =>
                              setAppState((prev) => ({
                                ...prev,
                                checkboxSettings: {
                                  ...prev.checkboxSettings,
                                  saveInstrumentalOnly: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                          />
                          <span>Save Instrumental Only</span>
                        </label>
                      </InteractiveTooltip>
                    </>
                  )}

                  {/* Advanced MDX Net checkboxes */}
                  {appState.processMethodId === "mdx" && (
                    <InteractiveTooltip
                      enabled={showTooltips}
                      content="Save Noisey Output - Allows the user to save an additional stem without the applied noise reduction."
                    >
                      <label className="flex items-center gap-2.5 select-none cursor-help text-slate-300 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={appState.checkboxSettings.saveNoiseyOutput}
                          onChange={(e) =>
                            setAppState((prev) => ({
                              ...prev,
                              checkboxSettings: {
                                ...prev.checkboxSettings,
                                saveNoiseyOutput: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <span>Save Noisey Residual</span>
                      </label>
                    </InteractiveTooltip>
                  )}

                  {/* Advanced VR checklist */}
                  {appState.processMethodId === "vr" && (
                    <label
                      className="flex items-center gap-2.5 select-none cursor-pointer text-slate-300 hover:text-white transition-colors"
                      title="Test Time Augmentations"
                    >
                      <input
                        type="checkbox"
                        checked={appState.checkboxSettings.ttaActive}
                        onChange={(e) =>
                          setAppState((prev) => ({
                            ...prev,
                            checkboxSettings: {
                              ...prev.checkboxSettings,
                              ttaActive: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Test-Time Augmentations (TTA)</span>
                    </label>
                  )}

                  {/* Demucs split blocks toggle (Rule 10) */}
                  {appState.processMethodId === "demucs" && (
                    <InteractiveTooltip
                      enabled={showTooltips}
                      content="Split Mode - Uses Demucs v3 original chunking method. Selecting this will automatically disable Chunks."
                    >
                      <label
                        className="flex items-center gap-2.5 select-none cursor-help text-slate-300 hover:text-white transition-colors"
                        title="Bypass static segment ranges with Auto Chunks"
                      >
                        <input
                          type="checkbox"
                          checked={appState.checkboxSettings.splitMode}
                          onChange={(e) =>
                            setAppState((prev) => ({
                              ...prev,
                              checkboxSettings: {
                                ...prev.checkboxSettings,
                                splitMode: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <span>Split Mode (Auto chunks segment)</span>
                      </label>
                    </InteractiveTooltip>
                  )}

                  {/* ENSEMBLE SPECIFIC: Save All Intermediates logic (Rule 15) */}
                  {appState.processMethodId === "ensemble" &&
                    appState.selectedModelId === "multi_ai_ensemble_preset" && (
                      <label
                        className="flex items-center gap-2.5 select-none cursor-pointer text-slate-300 hover:text-white transition-colors"
                        title="Save submaster wave outputs prior to cancel averaging"
                      >
                        <input
                          type="checkbox"
                          checked={appState.checkboxSettings.saveAllOutputs}
                          onChange={(e) =>
                            setAppState((prev) => ({
                              ...prev,
                              checkboxSettings: {
                                ...prev.checkboxSettings,
                                saveAllOutputs: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="text-[#60a5fa] font-bold">
                          Save All Intermediate Outputs
                        </span>
                      </label>
                    )}

                  {/* Common Model Test Mode workflow (Rule 16) */}
                  <InteractiveTooltip
                    enabled={showTooltips}
                    content="Model Test Mode - This option makes it easier for users to test the results of different models by eliminating the hassle of manually changing filenames when processing the same track through multiple models."
                  >
                    <label
                      className="flex items-center gap-2.5 select-none cursor-help text-slate-300 hover:text-white transition-colors"
                      title="Generates side-by-side isolated comparative stems"
                    >
                      <input
                        type="checkbox"
                        checked={appState.checkboxSettings.modelTestMode}
                        onChange={(e) =>
                          setAppState((prev) => ({
                            ...prev,
                            checkboxSettings: {
                              ...prev.checkboxSettings,
                              modelTestMode: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Comparative Model Test Mode</span>
                    </label>
                  </InteractiveTooltip>
                </div>
              </div>

              {/* LIVE NAME PROJECTIONS PANEL (Rule 11) */}
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/10 space-y-2">
                <div className="flex justify-between items-center">
                  <h5 className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-indigo-400" />
                    Predictive Naming Preview (Standard Output Map)
                  </h5>
                  <span className="text-[8px] font-mono text-indigo-500 uppercase font-bold">
                    Dynamic preview update
                  </span>
                </div>

                <div className="space-y-1 text-[11px] font-mono text-slate-300 bg-black/35 px-3.5 py-2.5 rounded-lg border border-white/5 max-h-24 overflow-y-auto">
                  {predictedOutputNames.map((name, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-center text-slate-300"
                    >
                      <span className="text-[#38bdf8]">•</span>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* BACKEND PIPELINE & SETUP BLOCK */}
              {(() => {
                const hasInputs = appState.selectedInputs && appState.selectedInputs.length > 0;
                const hasOutput = appState.checkboxSettings.sameAsInputFolder || !!appState.selectedOutputFolder;
                const hasModel = !!activeModel;
                const isModelVerified = !!verifiedModelLocalPath && modelProofEligibility.proofEligible && modelFileStatus === "hash_verified";
                const isModelSupported = ['VR', 'MDX-Net', 'Demucs', 'RoFormer', 'MDXC', 'Custom', 'Ensemble'].includes(activeModel?.architecture || '');
                const isFFmpegReady = ffmpegStatus === "ready";
                const hasAIEnvironment = !!(backendSpecs?.canRunAISeparation);

                const aiBlockers: string[] = [];
                if (!hasInputs) aiBlockers.push("Track selection queue is empty");
                if (!hasOutput) aiBlockers.push("Output folder has not been configured");
                if (!hasModel) {
                  aiBlockers.push("No model selected");
                } else {
                  if (!isModelVerified) aiBlockers.push(modelProofEligibility.displayMessage);
                  if (!isModelSupported) aiBlockers.push(`Selected model architecture (${activeModel?.architecture || 'Unknown'}) is not supported`);
                }
                if (!backendSpecs?.pythonFound) aiBlockers.push("Host Python interpreter environment is missing");
                else {
                  if (!backendSpecs?.audioSeparatorInstalled) aiBlockers.push("Package Dependency `audio-separator` not found in current environment");
                  if (!backendSpecs?.torchInstalled) aiBlockers.push("Library Bundle `PyTorch` is missing from environment");
                }
                if (!isFFmpegReady) aiBlockers.push("System FFmpeg binary encoder not found on PATH");

                const ffmpegBlockers: string[] = [];
                if (!hasInputs) ffmpegBlockers.push("Track selection queue is empty");
                if (!hasOutput) ffmpegBlockers.push("Output folder has not been configured");
                if (!isFFmpegReady) ffmpegBlockers.push("System FFmpeg binary encoder not found on PATH");

                // Check pipeline status label description
                let pipelineStateBadgeLabel = "Execution Blocked";
                let pipelineBadgeColorClasses = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                if (!hasInputs || !hasOutput) {
                  pipelineStateBadgeLabel = "Blocked — Missing Input/Output Config";
                  pipelineBadgeColorClasses = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                } else if (userSelectedMode === "ai") {
                  if (computedPipelineMode === "ai_backend_ready") {
                    pipelineStateBadgeLabel = "Ready for Local Run";
                    pipelineBadgeColorClasses = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse";
                  } else {
                    pipelineStateBadgeLabel = "Blocked — AI Requirements Unmet";
                    pipelineBadgeColorClasses = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                  }
                } else if (userSelectedMode === "ffmpeg") {
                  pipelineStateBadgeLabel = "Blocked - Non-AI Mode";
                  pipelineBadgeColorClasses = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                }

                return (
                  <div className="space-y-4">
                    {/* PIPELINE MODE SELECTION CARD */}
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3.5">
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/5 pb-2.5">
                        <h5 className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                          <Sliders className="w-4 h-4 text-purple-400" />
                          Run Mode & Readiness
                        </h5>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">Status:</span>
                          <span className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded ${pipelineBadgeColorClasses}`}>
                            {pipelineStateBadgeLabel}
                          </span>
                        </div>
                      </div>

                      {/* MODE SWITCHER CARDS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* CARD 1: AI MODEL BACKEND */}
                        <button
                          type="button"
                          onClick={() => setUserSelectedMode("ai")}
                          className={`p-3.5 rounded-xl border text-left flex flex-col gap-2 cursor-pointer transition-all duration-300 relative overflow-hidden group
                            ${userSelectedMode === "ai"
                              ? "bg-[#0b0c16] border-purple-500/50 text-purple-100 shadow-md shadow-purple-950/25"
                              : "bg-black/25 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-black/35"
                            }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-xs font-mono font-bold flex items-center gap-1.5 text-purple-200">
                              🧠 AI Model Backend
                            </span>
                            <span className={`text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded-md border
                              ${hasAIEnvironment && isModelVerified
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {hasAIEnvironment && isModelVerified ? "Available" : "Blocked"}
                            </span>
                          </div>

                          <p className={`text-[11px] leading-snug font-sans ${userSelectedMode === "ai" ? "text-slate-300" : "text-slate-500"}`}>
                            Local audio-separator run using a proof-eligible model. Requires verified SHA-256, Python, PyTorch, FFmpeg, and non-empty output stems.
                          </p>

                          <div className={`space-y-1 text-[9px] font-mono pt-1.5 border-t ${userSelectedMode === "ai" ? "border-purple-500/10" : "border-white/5"}`}>
                            <div className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Prerequisites Checklist:</div>
                            <div className="flex flex-wrap gap-2 text-[8px]">
                              <span className={`flex items-center gap-1 ${hasAIEnvironment ? "text-emerald-400" : "text-slate-500"}`}>
                                <span>{hasAIEnvironment ? "●" : "○"}</span> Python & Deps {hasAIEnvironment ? "✓" : "Missing"}
                              </span>
                              <span className={`flex items-center gap-1 ${isModelVerified ? "text-emerald-400" : "text-slate-500"}`}>
                                <span>{isModelVerified ? "●" : "○"}</span> Model File {isModelVerified ? "Verified" : "Proof Blocked"}
                              </span>
                              <span className={`flex items-center gap-1 ${isFFmpegReady ? "text-emerald-400" : "text-slate-500"}`}>
                                <span>{isFFmpegReady ? "●" : "○"}</span> FFmpeg {isFFmpegReady ? "✓" : "Missing"}
                              </span>
                            </div>
                          </div>

                          {(!hasAIEnvironment || !isModelVerified || !isFFmpegReady) && (
                            <div className="text-[9px] font-mono text-amber-400 leading-snug pt-1 px-2.5 py-1.5 rounded bg-amber-500/5 border border-amber-500/10 w-full mt-1.5 font-sans">
                              <strong className="text-amber-300 uppercase text-[8px] block tracking-wide font-mono mb-0.5">Blocker reason:</strong>
                              <span className="text-slate-400 leading-snug font-sans">
                                {!hasAIEnvironment 
                                  ? "Host Python environment / audio-separator is missing." 
                                  : !isModelVerified 
                                    ? modelProofEligibility.displayMessage
                                    : "FFmpeg binary is not registered on system PATH."}
                              </span>
                            </div>
                          )}
                        </button>

                        {/* CARD 2: FFMPEG fallback */}
                        <button
                          type="button"
                          onClick={() => setUserSelectedMode("ffmpeg")}
                          className={`p-3.5 rounded-xl border text-left flex flex-col gap-2 cursor-pointer transition-all duration-300 relative overflow-hidden group
                            ${userSelectedMode === "ffmpeg"
                              ? "bg-[#0b141f] border-cyan-500/50 text-cyan-100 shadow-md shadow-cyan-950/25"
                              : "bg-black/25 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-black/35"
                            }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-xs font-mono font-bold flex items-center gap-1.5 text-cyan-200">
                              ⚡ FFmpeg DSP Fallback
                            </span>
                            <span className={`text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded-md border
                              ${isFFmpegReady
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {isFFmpegReady ? "Available" : "Blocked"}
                            </span>
                          </div>

                          <p className={`text-[11px] leading-snug font-sans ${userSelectedMode === "ffmpeg" ? "text-slate-300" : "text-slate-500"}`}>
                            <strong>FFmpeg DSP Fallback</strong> (Non-AI static DSP filtering / Not AI model separation) - Frequency-filter output designed for quick fallback baseline testing.
                          </p>

                          <div className={`space-y-1 text-[9px] font-mono pt-1.5 border-t ${userSelectedMode === "ffmpeg" ? "border-cyan-500/10" : "border-white/5"}`}>
                            <div className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Prerequisites Checklist:</div>
                            <div className="flex flex-wrap gap-2 text-[8px]">
                              <span className={`flex items-center gap-1 ${isFFmpegReady ? "text-cyan-400" : "text-slate-500"}`}>
                                <span>{isFFmpegReady ? "●" : "○"}</span> FFmpeg Binary {isFFmpegReady ? "✓" : "Missing"}
                              </span>
                            </div>
                          </div>

                          {!isFFmpegReady && (
                            <div className="text-[9px] font-mono text-[#fb7185] leading-snug pt-1 px-2.5 py-1.5 rounded bg-rose-500/5 border border-rose-500/10 w-full mt-1.5 font-sans">
                              <strong className="text-rose-300 uppercase text-[8px] block tracking-wide font-mono mb-0.5">Blocker reason:</strong>
                              <span className="text-slate-400 font-sans">FFmpeg statically compiled binary was not found. Please register bin paths globally.</span>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* COLLAPSIBLE DIAGNOSTICS & SETUP GUIDE PANEL */}
                    <div className="border border-white/5 bg-black/25 rounded-xl overflow-hidden transition-all duration-300 shadow-md">
                      <button
                        type="button"
                        onClick={() => setShowSetupGuide(!showSetupGuide)}
                        className="flex justify-between items-center w-full px-4 py-3 text-left text-xs font-mono text-slate-300 hover:text-white bg-slate-905/30 border-b border-white/5 cursor-pointer"
                      >
                        <span className="font-bold flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-[#a855f7]" />
                          AI Backend Setup Guide & Specs
                        </span>
                        <span className="text-slate-400 text-[10px] font-bold">
                          {showSetupGuide ? "COLLAPSE [▲]" : "EXPAND DETAILS [▼]"}
                        </span>
                      </button>

                      {showSetupGuide && (
                        <div className="p-4 space-y-4 text-[11px] font-normal text-slate-300 leading-relaxed font-sans bg-[#0c0d15]/50">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-mono uppercase text-slate-400">Setup Guide Help Controls</span>
                            <HelpToggle sectionId="backend_setup_guide" label="Section Help" className="px-2 py-0.5" />
                          </div>
                          <HelpText
                            sectionId="backend_setup_guide"
                            text="Help: This section allows specifying custom parameters for local machine learning model configurations. Customize the host Python path override or trigger backend environment compatibility diagnostics."
                          />
                          
                          {/* PYTHON ENVIRONMENT OVERRIDE */}
                          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/85 space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-2 text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wide">
                              <span>📁 Host Python Environment Path Override</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${customPythonPath ? "bg-purple-500/15 text-purple-300 border border-purple-500/10" : "text-slate-500 font-normal"}`}>
                                {customPythonPath ? "Custom Override Cached" : "Using System Environment Default"}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="e.g. C:\Python311\python.exe or /usr/local/bin/python3"
                                value={customPythonPath}
                                onChange={(e) => updateCustomPythonPath(e.target.value)}
                                className="bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-violet-500/50 flex-grow"
                              />
                              <button
                                type="button"
                                onClick={handleBrowsePythonPath}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-violet-500/20 rounded-lg transition cursor-pointer text-[10px] font-mono font-bold leading-tight"
                              >
                                Browse...
                              </button>
                              {customPythonPath && (
                                <button
                                  type="button"
                                  onClick={() => updateCustomPythonPath("")}
                                  className="px-2.5 py-1 bg-red-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-900/30 rounded-lg transition cursor-pointer text-[10px] font-mono"
                                  title="Reset to system default"
                                >
                                  Reset
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => runBackendDiagnostics()}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 font-mono text-slate-350 border border-slate-700 hover:text-white rounded-lg transition cursor-pointer text-[10px] flex items-center gap-1"
                                title="Refresh checks dynamically"
                              >
                                <RefreshCw className="w-3 h-3 animate-spin duration-1000" /> Refresh
                              </button>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono pt-1">
                              <span>Auto-scans dependencies on key input change events</span>
                              <span className={`font-bold px-1 py-0.5 rounded text-[8px]
                                ${backendSpecs?.pythonFound 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                                  : customPythonPath 
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/25" 
                                    : "bg-slate-800 text-slate-500"}`}>
                                Validation: {backendSpecs?.pythonFound 
                                  ? "VALID" 
                                  : customPythonPath 
                                    ? "INVALID (Path not verified)" 
                                    : "NOT CHECKED / SYSTEM DEFAULT"}
                              </span>
                            </div>
                          </div>

                          {/* SYSTEM BACKEND DIAGNOSTICS GRID */}
                          <div>
                            <span className="font-mono font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-2">
                              🧠 AI Neural Engine Diagnostics Checklist
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                              {/* 1. Python Check */}
                              <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-0.5">
                                <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase">
                                  <span>Python Path:</span>
                                  <span className={backendSpecs?.pythonFound ? "text-emerald-400 font-extrabold" : "text-rose-400 font-bold"}>
                                    {backendSpecs?.pythonFound ? "Detected" : "Missing / None"}
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-200 truncate animate-pulse" title={customPythonPath || "Using System environment default"}>
                                  {customPythonPath ? `Custom: ${customPythonPath}` : "Using System PATH default"}
                                </div>
                                <div className="text-[8px] text-slate-500">
                                  Action: Select or input valid python executable path override above.
                                </div>
                              </div>

                              {/* 2. Python Version Check */}
                              <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-0.5">
                                <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase">
                                  <span>Python Version:</span>
                                  <span className={backendSpecs?.pythonFound ? "text-emerald-400 font-extrabold" : "text-rose-400 font-bold"}>
                                    {backendSpecs?.pythonFound ? "Compatible" : "Missing / None"}
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-200">
                                  {backendSpecs?.pythonFound ? `${backendSpecs.pythonVersion}` : "Requirements: Python 3.10 / 3.11"}
                                </div>
                                <div className="text-[8px] text-slate-500">
                                  Action if Missing: Setup python installer natively.
                                </div>
                              </div>

                              {/* 3. audio-separator */}
                              <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-0.5">
                                <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase">
                                  <span>audio-separator:</span>
                                  <span className={backendSpecs?.audioSeparatorInstalled ? "text-emerald-400 font-extrabold" : "text-rose-400 font-bold"}>
                                    {backendSpecs?.audioSeparatorInstalled ? "Installed" : "Missing"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-200">
                                  {backendSpecs?.audioSeparatorInstalled ? "Framework is ready for loading models" : "Package required for execution subprocess wrapper."}
                                </div>
                                <div className="text-[8px] text-slate-500">
                                  Action if Missing: `pip install audio-separator` in environment context.
                                </div>
                              </div>

                              {/* 4. PyTorch */}
                              <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-0.5">
                                <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase">
                                  <span>PyTorch Module:</span>
                                  <span className={backendSpecs?.torchInstalled ? "text-emerald-400 font-extrabold" : "text-rose-400 font-bold"}>
                                    {backendSpecs?.torchInstalled ? "Detected" : "Missing"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-200">
                                  {backendSpecs?.torchInstalled ? `Installed (${backendSpecs.torchVersion || 'PyTorch Core'})` : "Core Deep Learning execution model library missing."}
                                </div>
                                <div className="text-[8px] text-slate-500">
                                  Action if Missing: Run torch installation setup.
                                </div>
                              </div>

                              {/* 5. CUDA / Accel */}
                              <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-0.5">
                                <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase">
                                  <span>CUDA / MPS Accel:</span>
                                  <span className="text-indigo-300 font-bold">
                                    {backendSpecs?.cudaAvailable 
                                      ? "CUDA Active" 
                                      : backendSpecs?.mpsAvailable 
                                        ? "MPS Active" 
                                        : "CPU Only Fallback"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-200 truncate">
                                  {backendSpecs?.cudaAvailable 
                                    ? `NVIDIA CUDA Device: ${backendSpecs.gpuDeviceName}` 
                                    : backendSpecs?.mpsAvailable 
                                      ? "Apple CoreML Graphics Accelerator Active" 
                                      : "No graphics acceleration - Fallback CPU processing"}
                                </div>
                                <div className="text-[8px] text-slate-500">
                                  Action if CPU Fallback: Install Nvidia CUDA toolkit drivers on host.
                                </div>
                              </div>

                              {/* 6. FFmpeg status */}
                              <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-0.5">
                                <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase">
                                  <span>FFmpeg Binary:</span>
                                  <span className={isFFmpegReady ? "text-emerald-400 font-extrabold" : "text-rose-400"}>
                                    {isFFmpegReady ? "Ready" : "Missing"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-200">
                                  {isFFmpegReady ? "FFmpeg statically compiled encoder found" : "Required to process dynamic frequency-band extraction."}
                                </div>
                                <div className="text-[8px] text-slate-500">
                                  Action if Missing: Ensure FFmpeg folders are assigned to PATH.
                                </div>
                              </div>

                              {/* 7. Model file loaded */}
                              <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-0.5">
                                <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase">
                                  <span>Model File:</span>
                                  <span className={isModelVerified ? "text-emerald-400 font-extrabold" : "text-rose-400"}>
                                    {isModelVerified ? "Verified" : "Proof Blocked"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-200 truncate font-mono">
                                  {isModelVerified ? `Weights: ${activeModel?.name}` : modelProofEligibility.displayMessage}
                                </div>
                                <div className="text-[8px] text-slate-500">
                                  Action if Missing: Download model weights in Downloader.
                                </div>
                              </div>

                              {/* 8. Architecture Support */}
                              <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-0.5">
                                <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase">
                                  <span>Architecture Support:</span>
                                  <span className={isModelSupported ? "text-emerald-400 font-extrabold" : "text-rose-400"}>
                                    {isModelSupported ? "Supported" : "Unsupported"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-200 truncate">
                                  {isModelSupported ? `Supported (${activeModel?.architecture})` : "Unsupported custom shape / profile metadata structure."}
                                </div>
                                <div className="text-[8px] text-slate-500">
                                  Explanation: Backend supports configuration but model weight is needed.
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* SETUP PROCESS GUIDANCE (DYNAMIC ACCORDION CHECKLIST) */}
                          <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl space-y-2 text-slate-300">
                            <h6 className="font-bold text-[10px] uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1.5 font-bold">
                              ⚠️ Setup Process Guidance Checklist (What to do next)
                            </h6>
                            <p className="text-slate-400 text-[10px] font-sans">
                              Satisfy these missing prerequisites to unlock dynamic AI deep learning model separations:
                            </p>
                            <ol className="list-decimal pl-4 space-y-1.5 text-[10px] leading-snug">
                              {!backendSpecs?.pythonFound && (
                                <li>
                                  <strong className="text-slate-105 font-bold">Select or install Python:</strong> Install Python 3.10 / 3.11 from the official portal and select <code className="bg-black/35 px-1 rounded text-[9px]">Add Python to PATH</code> option.
                                </li>
                              )}
                              {backendSpecs?.pythonFound && (!backendSpecs?.audioSeparatorInstalled) && (
                                <li>
                                  <strong className="text-slate-105 font-bold">Install audio-separator in target Python environment:</strong> Run the copyable CLI instructions in the setup terminal guide bottom card inside your environment session.
                                </li>
                              )}
                              {backendSpecs?.pythonFound && (!backendSpecs?.torchInstalled) && (
                                <li>
                                  <strong className="text-slate-105 font-bold">Install PyTorch CPU or CUDA build versions:</strong> Deep learning libraries require compilation bindings to map neural graphs.
                                </li>
                              )}
                              {!isFFmpegReady && (
                                <li>
                                  <strong className="text-slate-105 font-bold">Ensure FFmpeg is available on process environments:</strong> Download ffmpeg binaries and declare bin paths inside environment PATH variables.
                                </li>
                              )}
                              {!isModelVerified && (
                                <li>
                                  <strong className="text-slate-105 font-bold">Download or sideload verified model weights:</strong> Open Model Manager and use a model with verified source integrity and a matching local SHA-256.
                                </li>
                              )}
                              <li>
                                <strong className="text-slate-105 font-bold">Select & Refresh Diagnostics:</strong> After installing missing features, click the refresh checks button above to verify readiness.
                              </li>
                            </ol>
                          </div>

                          {/* WORKFLOW DETAILED GUIDES & WIZARDS */}
                          <div className="space-y-4 pt-4 border-t border-white/5">
                            <ModelCompatibilityWizard />
                            <HostSetupGuide />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* UNIFIED LAUNCHER BOTTOM ROW */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap sm:flex-nowrap gap-4 items-center w-full">
                  {/* ADVANCED DRAWER TRIGGER WRENCH */}
                  <InteractiveTooltip
                    enabled={showTooltips}
                    position="top"
                    content="Settings Button - This button spawns the settings menu with access to additional advanced settings and the help guide."
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowSettingsDrawer(true)}
                      className="w-12 h-12 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200 cursor-help shadow-glass-inset shrink-0"
                    >
                      <Settings className="w-5 h-5" />
                    </motion.button>
                  </InteractiveTooltip>

                  {/* LAUNCH ENGINE CONSOLE RUN */}
                  <InteractiveTooltip
                    className="flex-grow flex min-w-0"
                    enabled={showTooltips}
                    position="top"
                    content="Starts the audio separation processing using the defined configuration parameters."
                  >
                    {(() => {
                      const isBlocked = computedPipelineMode !== "ai_backend_ready";
                      return (
                        <motion.button
                          whileHover={isSimulating || isBlocked ? {} : { scale: 1.01 }}
                          whileTap={isSimulating || isBlocked ? {} : { scale: 0.99 }}
                          onClick={handleStartProcess}
                          disabled={isSimulating || isBlocked}
                          className={`flex-grow h-12 rounded-xl text-xs font-semibold tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5 focus:outline-none w-full
                            ${
                              isSimulating
                                ? "bg-blue-950/20 text-blue-400 border border-blue-500/20 cursor-not-allowed shadow-none"
                                : isBlocked
                                  ? "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                                  : computedPipelineMode === "ai_backend_ready"
                                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-400/20 text-white shadow-violet-950/40 cursor-pointer animate-pulse"
                                    : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/20 text-white shadow-cyan-950/40 cursor-pointer"
                            }`}
                        >
                          {isSimulating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Separation Subprocess in Progress...
                            </>
                          ) : isBlocked ? (
                            <>
                              <Lock className="w-4 h-4 text-slate-600" />
                              {blockedReason || "Blocked: Missing Prerequisites"}
                            </>
                          ) : computedPipelineMode === "ai_backend_ready" ? (
                        <>
                          <Play className="w-4 h-4 text-violet-100 fill-current" />
                          Run AI Separation
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-slate-500" />
                          CPU AI Proof Blocked
                        </>
                      )}
                        </motion.button>
                      );
                    })()}
                  </InteractiveTooltip>

                  {/* Native cancellation request (Rule 13) */}
                  <InteractiveTooltip
                    enabled={showTooltips}
                    position="top"
                    content="Stop Button - Halts any running processes. A pop-up window will ask the user to confirm the action."
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (isSimulating) {
                          setShowStopHaltAlert(true);
                        } else {
                          clearLogsAndState();
                          setAppState((prev) => ({ ...prev, consoleLogs: [] }));
                          setSimulationLog((prev) => [
                            ...prev,
                            "[diagnostics] Logs buffer reset requested by user.",
                          ]);
                        }
                      }}
                      className="w-12 h-12 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/20 text-rose-400 hover:text-rose-300 flex items-center justify-center transition-all duration-200 cursor-help shadow-glass-inset shrink-0"
                    >
                      <Square className="w-4 h-4 fill-current" />
                    </motion.button>
                  </InteractiveTooltip>
                </div>

                {/* UNIFIED STATUS SUMMARY PANEL (Rule 34) */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 space-y-3 font-mono text-[11px] text-slate-300 shadow-lg">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      Dynamic Status HUD & Verification Checklist
                    </span>
                    <div className="flex gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase border
                        ${requiredBlockers.length > 0 
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                          : warningBlockers.length > 0
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {requiredBlockers.length > 0 ? "BLOCKED" : warningBlockers.length > 0 ? "WARNINGS" : "READY"}
                      </span>
                    </div>
                  </div>

                  {/* Summary Counts */}
                  <div className="grid grid-cols-3 gap-2.5 text-center bg-black/45 p-2 rounded-lg border border-white/5">
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Checks Met</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {5 - requiredBlockers.filter(b => ["no_inputs", "inputs_not_verified", "output_missing", "output_not_exists", "output_not_writable", "output_browser_preview", "model_missing", "model_not_installed", "model_hash_mismatch", "model_proof_not_eligible", "ffmpeg_missing", "python_missing", "audio_separator_missing", "torch_missing"].includes(b.id)).length} / 5
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Blockers</div>
                      <div className={`text-sm font-bold ${requiredBlockers.length > 0 ? "text-rose-400" : "text-slate-400"}`}>
                        {requiredBlockers.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Warnings</div>
                      <div className={`text-sm font-bold ${warningBlockers.length > 0 ? "text-amber-400" : "text-slate-400"}`}>
                        {warningBlockers.length}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Checklist items */}
                  <div className="space-y-1.5 pt-1">
                    {/* 1. Input File Selected */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span>{appState.selectedInputs.length > 0 ? "●" : "○"}</span> Input Track Queue
                      </span>
                      <span className={`text-[10px] ${appState.selectedInputs.length > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {appState.selectedInputs.length === 0
                          ? "missing files"
                          : selectedInputFiles.some(f => f.source !== "electron_path")
                            ? "browser preview only"
                            : `${appState.selectedInputs.length} files verified`}
                      </span>
                    </div>

                    {/* 2. Output folder write path */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span>{appState.checkboxSettings.sameAsInputFolder || appState.selectedOutputFolder ? "●" : "○"}</span> Writing Destination
                      </span>
                      <span className={`text-[10px] 
                        ${appState.checkboxSettings.sameAsInputFolder 
                          ? "text-indigo-400" 
                          : outputFolderVerifyStatus === "verified_writable" 
                            ? "text-emerald-400" 
                            : "text-rose-400"
                        }`}
                      >
                        {appState.checkboxSettings.sameAsInputFolder 
                          ? "delegated to input" 
                          : outputFolderVerifyStatus === "verified_writable"
                            ? "verified writable"
                            : outputFolderVerifyStatus === "browser_preview"
                              ? "browser preview folder"
                              : outputFolderVerifyStatus === "missing"
                                ? "directory missing"
                                : outputFolderVerifyStatus === "not_writable"
                                  ? "not writable"
                                  : "not selected"}
                      </span>
                    </div>

                    {/* 3. Model Weights Installed */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span>{activeModel ? "●" : "○"}</span> Core Weights File
                      </span>
                      <span className={`text-[10px] 
                        ${modelFileStatus === "hash_verified"
                          ? "text-emerald-400"
                          : modelFileStatus === "exists_hash_not_checked" || modelFileStatus === "hash_unavailable"
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        {modelFileStatus === "hash_verified"
                          ? "installed & verified"
                          : modelFileStatus === "exists_hash_not_checked"
                            ? "installed / proof blocked"
                            : modelFileStatus === "hash_unavailable"
                              ? "hash unavailable / proof blocked"
                              : modelFileStatus === "hash_mismatch"
                                ? "checksum mismatch"
                                : "missing / uninstalled"}
                      </span>
                    </div>

                    {/* 4. Backend dependencies */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span>{ffmpegStatus === "ready" ? "●" : "○"}</span> Backend Dependencies
                      </span>
                      <span className={`text-[10px] 
                        ${ffmpegStatus === "ready" && userSelectedMode === "ai" && backendSpecs?.canRunAISeparation
                          ? "text-emerald-400"
                          : "text-rose-400"
                        }`}
                      >
                        {ffmpegStatus !== "ready"
                          ? "ffmpeg missing"
                          : userSelectedMode === "ffmpeg"
                            ? "blocked: non-ai mode"
                            : backendSpecs?.canRunAISeparation
                              ? "python / torch ready"
                              : "python missing or unmet"}
                      </span>
                    </div>

                    {/* 5. Hardware Device */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span>●</span> Execution Processor
                      </span>
                      <span className="text-[10px] text-pink-450 uppercase font-bold">
                        {appState.dropdownSettings.executionDevice} 
                        {backendSpecs?.cudaAvailable && appState.dropdownSettings.executionDevice === "cuda" ? " (gpu)" : ""}
                        {backendSpecs?.mpsAvailable && appState.dropdownSettings.executionDevice === "mps" ? " (apple silicon)" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic actionable warnings list */}
                  {(requiredBlockers.length > 0 || warningBlockers.length > 0) && (
                    <div className="border-t border-white/5 pt-2 space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {requiredBlockers.map(b => (
                        <div key={b.id} className="text-rose-400 text-[10px] leading-snug flex items-start gap-1">
                          <span className="text-[9px] bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/20 font-bold shrink-0">BLOCKER</span>
                          <span className="pt-0.5">{b.label} <span className="text-slate-500 font-sans italic">({b.fixLabel})</span></span>
                        </div>
                      ))}
                      {warningBlockers.map(w => (
                        <div key={w.id} className="text-amber-400 text-[10px] leading-snug flex items-start gap-1">
                          <span className="text-[9px] bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 font-bold shrink-0">WARNING</span>
                          <span className="pt-0.5">{w.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* PROGRESS LOG TERMINAL AREA (Rule 12) */}
              <div className="bg-[#020502]/90 text-green-500/70 font-mono text-[11px] p-5.5 rounded-xl border border-green-500/20 flex flex-col justify-between shadow-[inset_0_4px_24px_rgba(0,255,0,0.05),0_0_20px_rgba(0,255,0,0.1)] relative overflow-hidden group backdrop-blur-md">
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>

                <div className="space-y-1 overflow-y-auto max-h-48 custom-scrollbar pr-1">
                  <div className="text-green-500 border-b border-green-500/20 pb-1.5 flex justify-between items-center text-[9px] uppercase tracking-wider font-extrabold mb-2.5">
                    <InteractiveTooltip
                      enabled={showTooltips}
                      position="top"
                      content="Progress Console - This window provides the user with information regarding running processes."
                    >
                      <span className="flex items-center gap-1 cursor-help drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                        <Code2 className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                        {APP_SHORT_NAME} Separation Terminal Console Feed
                      </span>
                    </InteractiveTooltip>
                    <span className="flex items-center gap-1.5 text-[8px] text-green-400 font-normal opacity-80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse drop-shadow-[0_0_5px_rgba(16,185,129,1)]"></span>
                      SYSTEM ONLINE
                    </span>
                  </div>

                  {simulationLog.length === 0 ? (
                    <div className="space-y-4 py-3 font-sans text-xs text-green-500/60 leading-normal">
                      <div className="text-center italic text-green-500/40 font-mono text-[11px] pb-2 border-b border-green-500/10">
                        No run logs yet. Select input, output folder, backend, and verified model before starting local separation.
                      </div>

                      {blockedReason && (
                        <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 rounded-lg font-mono text-[10.5px] space-y-1">
                          <div className="font-bold flex items-center gap-1.5 uppercase text-red-300">
                            <span>🛑 Pipeline State: Blocked</span>
                          </div>
                          <div>
                            Current Blocker: <span className="font-bold underline">{blockedReason}</span>
                          </div>
                          <p className="text-[9.5px] text-red-400/70 leading-snug">
                            Local execution is paused until required setup is verified. Check the blockers above before starting a run.
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2 bg-[#031503]/40 p-3 rounded-lg border border-green-500/10">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-green-400 font-bold block mb-1">
                          📋 Target Subprocess Parameter Settings:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-mono">
                          <div>
                            <span className="text-green-500/40">Model Filename:</span>{" "}
                            <span className="text-green-400 font-bold">{activeModel ? activeModel.name : "No model loaded"}</span>
                          </div>
                          <div>
                            <span className="text-green-500/40">Architecture:</span>{" "}
                            <span className="text-green-400 font-bold">{activeModel ? activeModel.architecture : "None"}</span>
                          </div>
                          <div>
                            <span className="text-green-500/40">Neural Accelerator:</span>{" "}
                            <span className="text-green-400 font-bold uppercase">{appState.dropdownSettings?.executionDevice || "Auto-Detect"}</span>
                          </div>
                          <div>
                            <span className="text-green-500/40">Destination Path:</span>{" "}
                            <span className="text-green-400 font-bold truncate block" title={appState.selectedOutputFolder || (appState.checkboxSettings.sameAsInputFolder ? "Same as input folder" : "Default Output")}>
                              {appState.checkboxSettings.sameAsInputFolder ? "Same as input folder" : (appState.selectedOutputFolder || "Not specified")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-green-500/50 bg-[#061e06]/35 p-2 rounded border border-green-500/5 font-mono flex items-start gap-1.5 leading-relaxed">
                        <span className="text-green-400">ℹ</span>
                        <span>
                          <strong>Windows Standalone Service Rule:</strong> When executed on absolute Windows host systems, live subprocess stderr streams and stdout logs will write synchronously to a secure, permanent `.log` file inside the local app installation directory.
                        </span>
                      </div>
                    </div>
                  ) : (
                    simulationLog.map((log, index) => (
                      <div
                        key={index}
                        className={`leading-relaxed break-all font-mono py-0.5 ${
                          log.includes("OK") || log.includes("SUCCESSFUL")
                            ? "text-green-300 font-bold drop-shadow-[0_0_3px_rgba(16,185,129,0.5)]"
                            : log.includes("PROGRESS") || log.includes("%")
                              ? "text-emerald-400"
                              : log.includes("error") || log.includes("BLOCKED")
                                ? "text-rose-400 font-bold"
                                : log.includes("[command]")
                                  ? "text-green-300/80 text-[10px] italic bg-[#001100]/50 px-2 py-1 rounded border border-green-500/10 my-1"
                                  : "text-green-500/80"
                        }`}
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>

                {/* Progress Indicators overlay */}
                {isSimulating && (
                  <div className="pt-4 border-t border-green-500/20 space-y-2 mt-3 animate-fade-in">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-green-400 flex items-center gap-1 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Thread-Safe Separation Subprocess Active
                      </span>
                      <span className="text-green-400 font-mono drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">
                        {simProgress}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-black rounded-full overflow-hidden relative border border-green-500/20">
                      <div
                        className="bg-gradient-to-r from-green-500 via-emerald-400 to-green-300 h-full transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.8)] rounded-full animate-pulse"
                        style={{ width: `${simProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RUNTIME ENVIRONMENT SPECS DETAILS */}
        <div className="lg:col-span-12 xl:col-span-4 space-y-6 min-w-0 w-full box-border">
          {/* Windows platform description blueprint details */}
          <div className="p-5.5 rounded-2xl bg-gradient-to-br from-[#0e1222] to-[#04060d] border border-white/[0.06] shadow-2xl relative overflow-hidden space-y-4">
            <div className="absolute top-[-30%] right-[-20%] w-[50%] h-[50%] bg-[#06b6d4]/10 rounded-full blur-2xl pointer-events-none"></div>

            <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2 font-mono uppercase tracking-widest border-b border-white/5 pb-3">
              <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
              Windows Standard Specs & Manifest
            </h4>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-[#030509]/60 hover:bg-[#030509]/95 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200">
                <span className="text-[10px] font-mono text-indigo-300 font-extrabold flex items-center gap-1.5 uppercase">
                  📦 Standalone Package NSIS Target
                </span>
                <p className="text-slate-400 leading-relaxed text-[11px] font-sans mt-2">
                  Compiled and modular for native installation via <code className="bg-black/40 text-indigo-400 px-1 py-0.2 rounded font-mono text-[9px]">NSIS Installers</code> (under 60MB base engine). External weights file targets are stored securely outside the bundle.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#030509]/60 hover:bg-[#030509]/95 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200">
                <span className="text-[10px] font-mono text-cyan-400 font-extrabold flex items-center gap-1.5 uppercase">
                  🔌 Sideloadable ONNX Adapters
                </span>
                <p className="text-slate-400 leading-relaxed text-[11px] font-sans mt-2">
                  Register path models immediately by depositing weights files to your standalone directory without needing manual layout re-compilation or interface updates.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#030509]/60 hover:bg-[#030509]/95 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200">
                <span className="text-[10px] font-mono text-emerald-400 font-extrabold flex items-center gap-1.5 uppercase">
                  🛡️ Thread-Isolated Environment
                </span>
                <p className="text-slate-400 leading-relaxed text-[11px] font-sans mt-2">
                  Auto-discovers static binary dependencies and environment runtimes, preventing environment variable pollution and keeping your operating system setup clean.
                </p>
              </div>
            </div>
          </div>

          {/* System status stats panel */}
          <div className="p-5.5 rounded-2xl bg-[#090b14] border border-[#1a1f38] shadow-glass-shadow shadow-glass-inset space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs uppercase font-bold text-slate-300 font-mono tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
                Environment Specs Monitor
              </h4>
              {backendSpecs && (
                <button
                  type="button"
                  onClick={() => runBackendDiagnostics()}
                  className="p-1 px-2 border border-slate-500/25 bg-white/5 rounded text-[10px] text-indigo-300 hover:text-white font-mono hover:bg-white/10 cursor-pointer flex items-center gap-1.5"
                  title="Run real-time on-disk check"
                >
                  <RefreshCw className="w-3 h-3 animate-spin-slow" />
                  Refresh
                </button>
              )}
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              {backendSpecs ? (
                <>
                  <div className="p-2.5 bg-black/40 rounded-lg border border-[#ffffff]/5 flex items-center justify-between">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Python Environment
                    </span>
                    <span className={`font-bold ${backendSpecs.pythonFound ? "text-emerald-400" : "text-amber-500"}`}>
                      {backendSpecs.pythonFound ? `DETECTED (${backendSpecs.pythonVersion})` : "MISSING (No AI Mode)"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-[#ffffff]/5 flex items-center justify-between">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Audio-Separator CLI
                    </span>
                    <span className={`font-bold ${backendSpecs.audioSeparatorInstalled && backendSpecs.audioSeparatorCliReady !== false ? "text-emerald-400" : "text-slate-500"}`}>
                      {backendSpecs.audioSeparatorInstalled && backendSpecs.audioSeparatorCliReady !== false ? "READY" : "NOT READY"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-[#ffffff]/5 flex items-center justify-between">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      PyTorch & Engines
                    </span>
                    <span className={`font-bold ${backendSpecs.torchInstalled ? "text-emerald-400" : "text-slate-500"}`}>
                      {backendSpecs.torchInstalled ? "INSTALLED" : "NOT FOUND"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-[#ffffff]/5 flex items-center justify-between">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Hardware Acceleration
                    </span>
                    <span className="font-bold text-indigo-300">
                      {backendSpecs.cudaAvailable ? "CUDA (GPU) ACTIVE" : backendSpecs.mpsAvailable ? "MPS (Apple Silicon)" : "CPU ONLY"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#0b0f19] rounded-lg border border-indigo-500/10 flex items-center justify-between font-extrabold text-xs">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Active Subprocess
                    </span>
                    <span className={`font-bold uppercase ${backendSpecs.canRunAISeparation ? "text-violet-400 animate-pulse font-extrabold" : "text-amber-400"}`}>
                      {backendSpecs.canRunAISeparation ? "AI Model (audio-separator)" : "AI Backend Blocked"}
                    </span>
                  </div>

                  {(() => {
                    const activeModel = modelRegistryState.find(m => m.id === appState.selectedModelId);
                    const isModelVerified = !!activeModel && !!verifiedModelLocalPath && modelProofEligibility.proofEligible && modelFileStatus === "hash_verified";
                    return (
                      <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 uppercase font-bold text-[10px]">
                            Model Validation Status
                          </span>
                          <span className={`font-bold uppercase ${isModelVerified ? "text-emerald-400" : "text-rose-400 animate-pulse"}`}>
                            {activeModel ? (isModelVerified ? "VERIFIED" : "PROOF BLOCKED") : "NO MODEL"}
                          </span>
                        </div>
                        {activeModel && (
                          <div className="text-[9px] text-slate-500 leading-normal">
                            Model: <span className="text-slate-300 font-bold">{activeModel.id}</span>
                            {activeModel.verifiedStatus !== 'verified' && (
                              <span className="text-rose-400 block font-bold mt-0.5">
                                Refused: {modelProofEligibility.displayMessage}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 uppercase font-bold text-[10px]">
                        Input File Validation
                      </span>
                      <span className={`font-bold uppercase ${appState.selectedInputs.length > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {appState.selectedInputs.length > 0 ? `VALID` : "EMPTY (MISSING INPUT)"}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 leading-normal">
                      {appState.selectedInputs.length > 0 ? (
                        <>Sequence Loaded: <span className="text-slate-300 font-bold">{appState.selectedInputs.join(", ")}</span></>
                      ) : (
                        <span className="text-slate-400">✖ Please select/drag-and-drop a file to start processing.</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2.5 bg-black/40 rounded-lg border border-[#ffffff]/5 flex items-center justify-between">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Active OS Target
                    </span>
                    <span className="font-bold text-indigo-400">
                      {(window as any).uvr ? "Detecting..." : "Browser Sandbox"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-[#ffffff]/5 flex items-center justify-between">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      GPU Context
                    </span>
                    <span
                      className={`font-bold uppercase ${appState.dropdownSettings.executionDevice === "cpu" ? "text-slate-500" : "text-cyan-400 font-extrabold"}`}
                    >
                      {appState.dropdownSettings.executionDevice.toUpperCase()}{" "}
                      PROVIDER
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-[#ffffff]/5 flex items-center justify-between">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      RAM Conservancy Switch
                    </span>
                    <span className="font-bold text-purple-300">
                      SAFE ONCO-SWEEP
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-[#ffffff]/5 flex items-center justify-between">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">
                      Sandbox Space Guard
                    </span>
                    <span className="text-[#60a5fa] font-bold">
                      ACTIVE FILTER ISOLATION
                    </span>
                  </div>
                </>
              )}
            </div>
            
            {backendSpecs && !backendSpecs.canRunAISeparation && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl leading-relaxed text-[11px] text-amber-300 font-sans space-y-1">
                <p className="font-bold">⚠️ Host Setup Required for True AI Separation</p>
                <p>
                  To unlock deep-learning AI separation, verify Python 3.10+, PyTorch, and `audio-separator` are installed on your host OS.
                </p>
                <p className="font-mono text-[10px] text-slate-400 select-all p-1 bg-black/55 rounded border border-white/5">$ pip install audio-separator[cpu]</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RENDER DYNAMIC FOUR TRACK MIXER PANEL ON COMPLETED SUCCESS */}
      {appState.processingStatus === "completed" && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="pt-4"
        >
          <FourTrackMixer
            inputFileName={
              appState.selectedInputs[0] || "bounce_vocal_remover.wav"
            }
            separationGoal={
              activeModel.stemType === "4stem" ? "4stem" : "vocals"
            }
            selectedCategory={appState.processMethodId}
            selectedModelName={activeModel.name}
            parameters={`Sizing: Chunks=${appState.dropdownSettings.chunks}, Precision=Float32, Method=${appState.processMethodId.toUpperCase()}`}
            loadedStems={realLoadedStems}
          />
        </motion.div>
      )}

      {/* MODALS PORTAL TO AVOID Z-INDEX TRAPPING UNDER SIDEBAR */}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="modals-teleport-container">
            {/* MODAL CONFIG DRAWER: PROGRAM SETTINGS MENU */}
            <AnimatePresence>
              {showSettingsDrawer && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex justify-end">
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="max-w-md w-full h-full bg-[#0d0f1c] border-l border-cyan-500/20 p-6.5 space-y-5 shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-y-auto"
                  >
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <h4 className="font-bold text-white text-base font-display flex items-center gap-2">
                        <Settings className="w-5 h-5 text-cyan-400 font-bold" />
                        Program Settings
                      </h4>
                      <button
                        onClick={() => setShowSettingsDrawer(false)}
                        className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer border border-white/10 px-2 py-0.5 rounded bg-white/5"
                      >
                        ✕ Close
                      </button>
                    </div>

                    {/* DYNAMIC SCHEMA CONTROLS (Rule 18) */}
                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-[#070913] rounded-xl border border-[#ffffff]/5 space-y-3.5">
                        <div className="flex justify-between font-mono text-[10px] items-center border-b border-white/5 pb-1.5 mb-2">
                          <span className="text-cyan-400 uppercase font-extrabold flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" />
                            Additional Settings for:{" "}
                            {
                              PROCESS_METHODS.find(
                                (m) => m.id === appState.processMethodId,
                              )?.name
                            }
                          </span>
                        </div>

                        <div className="space-y-3">
                          {SETTINGS_SCHEMAS[appState.processMethodId]?.map(
                            (setting) => {
                              return (
                                <div
                                  key={setting.key}
                                  className="space-y-1.5 bg-black/40 p-3 rounded-lg border border-white/5"
                                >
                                  <label className="text-[10px] font-mono text-slate-300 font-bold uppercase block">
                                    {setting.label}
                                  </label>
                                  <p className="text-[9px] text-slate-500 font-sans leading-relaxed">
                                    {setting.helpText}
                                  </p>

                                  {setting.type === "select" ? (
                                    <select
                                      value={
                                        setting.key === "noiseReduction"
                                          ? appState.dropdownSettings
                                              .noiseReduction
                                          : appState.dropdownSettings.chunks
                                      }
                                      onChange={(e) =>
                                        setAppState((prev) => ({
                                          ...prev,
                                          dropdownSettings: {
                                            ...prev.dropdownSettings,
                                            [setting.key]: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full bg-[#0a0c14]/40 border border-[#ffffff]/10 hover:border-white/20 rounded pl-2.5 pr-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/20 font-mono transition-all aspect-none truncate"
                                    >
                                      {setting.allowedValues?.map((opt) => (
                                        <option
                                          key={opt}
                                          value={opt}
                                          className="bg-[#0e111d] text-slate-200"
                                        >
                                          {opt}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="flex gap-3 items-center">
                                      <input
                                        type="range"
                                        min={setting.min || 1}
                                        max={setting.max || 10}
                                        step={setting.step || 1}
                                        value={
                                          setting.key === "noiseReduction"
                                            ? appState.dropdownSettings
                                                .noiseReduction
                                            : appState.dropdownSettings.chunks
                                        }
                                        onChange={(e) =>
                                          setAppState((prev) => ({
                                            ...prev,
                                            dropdownSettings: {
                                              ...prev.dropdownSettings,
                                              [setting.key]: e.target.value,
                                            },
                                          }))
                                        }
                                        className="flex-grow h-1 accent-cyan-500 cursor-pointer"
                                      />
                                      <span className="text-xs font-mono text-cyan-400 font-bold min-w-8 text-right">
                                        {setting.key === "noiseReduction"
                                          ? appState.dropdownSettings
                                              .noiseReduction
                                          : appState.dropdownSettings.chunks}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>

                      {/* Custom Registry downloader repository config url input */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase block">
                          Futureproof Custom Model Repository Source Mappings:
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customRepoUrl}
                            onChange={(e) => setCustomRepoUrl(e.target.value)}
                            className="flex-grow bg-black/45 border border-[#ffffff]/10 px-3 py-2 rounded-lg font-mono text-xs text-white focus:outline-none focus:border-cyan-500/40"
                          />
                          <button
                            onClick={() => {
                              setSimulationLog((prev) => [
                                ...prev,
                                `[model_downloader] Updated custom registry mappings fetch URL: "${customRepoUrl}"`,
                              ]);
                              alert(
                              `Dynamic repository endpoint recorded for reference only. Model weights are not loaded or verified until a native download/import and SHA-256 check succeeds.`,
                              );
                            }}
                            className="px-3.5 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 font-bold rounded-lg cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                        <span className="text-[9px] text-slate-500 font-sans">
                          Allows instant updates of model weights listings
                          schemas without reinstalls of the GUI framework
                          package.
                        </span>
                      </div>

                      {/* Hardware core CPU limit ranges */}
                      <div className="grid gap-4 pt-1 min-w-0" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
                        <div className="space-y-2 p-3 bg-black/25 rounded-l border border-white/5">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="text-slate-400 font-bold uppercase animate-pulse">
                              CPU Multi-thread ceiling
                            </span>
                            <span className="text-cyan-400 font-bold">
                              {appState.dropdownSettings.cpuThreads} Cores
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="16"
                            step="1"
                            value={appState.dropdownSettings.cpuThreads}
                            onChange={(e) =>
                              setAppState((prev) => ({
                                ...prev,
                                dropdownSettings: {
                                  ...prev.dropdownSettings,
                                  cpuThreads: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full h-1 cursor-pointer accent-cyan-500"
                          />
                          <span className="text-[8px] text-slate-500 block">
                            Sets absolute processor allocation limits for local
                            ONNX inference pipelines.
                          </span>
                        </div>

                        <div className="p-3 bg-black/25 rounded-r border border-white/5 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                            Low Resource RAM Conservatory
                          </span>
                          <label className="flex items-center gap-2.5 select-none cursor-pointer text-slate-300">
                            <input
                              type="checkbox"
                              checked={conserveVram}
                              onChange={(e) =>
                                setConserveVram(e.target.checked)
                              }
                              className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span>Conserve VRAM / Memory limits</span>
                          </label>
                          <span className="text-[8px] text-slate-500 block mt-1">
                            Clears GPU cache registries dynamically after every
                            active tensor block conversion.
                          </span>
                        </div>
                      </div>

                      {/* Subprocess sanitization flags */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <h5 className="font-bold text-slate-300 font-display text-[11px] uppercase tracking-wider">
                          Windows Runtime Security Gates
                        </h5>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2.5 select-none cursor-pointer text-slate-400 hover:text-slate-200 transition-colors">
                            <input
                              type="checkbox"
                              checked={sha256Strict}
                              onChange={(e) =>
                                setSha256Strict(e.target.checked)
                              }
                              className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span>
                              Strict SHA-256 Model Integrity Verification Check
                              (Enforced)
                            </span>
                          </label>
                          <p className="text-[9px] text-slate-500 pl-6.5 leading-relaxed font-sans">
                            Verify signature hashes of caches registries files
                            against global database lock before launching
                            interpreter threads, blocking corrupted weights.
                          </p>

                          <label className="flex items-center gap-2.5 select-none cursor-pointer text-slate-400 hover:text-slate-200 transition-colors mt-2">
                            <input
                              type="checkbox"
                              checked={doubleQuotePaths}
                              onChange={(e) =>
                                setDoubleQuotePaths(e.target.checked)
                              }
                              className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span>
                              Enforce double-quoted paths split-avoidance
                              (Anti-Space Bug)
                            </span>
                          </label>
                          <p className="text-[9px] text-slate-500 pl-6.5 leading-relaxed font-sans">
                            Auto-wraps folders paths variables in literal double
                            quotations to block thread split bounds crashes.
                            Enforces security isolation.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 text-xs font-bold pt-4 border-t border-white/5 justify-end">
                      <button
                        onClick={() => {
                          setSimulationLog((prev) => [
                            ...prev,
                            `[settings] Application settings saved.`,
                          ]);
                          setShowSettingsDrawer(false);
                        }}
                        className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Save Settings
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL DIALOG 2: SECURE CONFIRMED TASK HALTING STOP ALERT (Rule 13) */}
            <AnimatePresence>
              {showStopHaltAlert && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.93, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.93, opacity: 0 }}
                    className="max-w-md w-full bg-[#120f18] border border-rose-500/25 rounded-2xl p-6.5 space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center shrink-0 border border-rose-500/20">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display">
                          Confirm Process Halt Instruction
                        </h4>
                        <p className="text-[10px] text-rose-400 font-mono uppercase tracking-wider font-extrabold1">
                          Halting active subprocess thread
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      You are requesting cancellation of the active background
                      vocal remover subprocess. The native bridge will report
                      whether a process was active and whether cancellation was requested.
                    </p>

                    <div className="bg-black/35 p-3.5 rounded-lg border border-white/5 text-[11px] text-slate-400 leading-relaxed font-mono">
                      Native response: <code>cancel_requested</code>,{" "}
                      <code>cancelled</code>, <code>no_active_process</code>, or{" "}
                      <code>error</code>.
                    </div>

                    <div className="flex gap-2.5 text-xs font-bold pt-2.5">
                      <button
                        onClick={() => setShowStopHaltAlert(false)}
                        className="flex-grow py-2 bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel, Continue job
                      </button>
                      <button
                        onClick={handleHaltJobConfirm}
                        className="flex-grow py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Yes, Request Stop
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* CONFIRM SEPARATION OPERATION PLAN MODAL */}
            <AnimatePresence>
              {showConfirmModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.93, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.93, opacity: 0 }}
                    className="max-w-lg w-full bg-[#0d0f20] border border-cyan-500/25 rounded-2xl p-6.5 space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.25)]"
                  >
                    <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                      <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center shrink-0 border border-cyan-500/20">
                        <Shield className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-100 font-display">
                          Confirm Dynamic Operational Plan
                        </h4>
                        <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider font-extrabold">
                          Locking settings to dispatcher
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <p className="text-slate-300 leading-relaxed font-sans">
                        The system formulated the following execution target
                        mappings based on model registry constraints:
                      </p>

                      <div className="space-y-2.5 bg-black/45 p-4 rounded-xl border border-white/5 font-mono text-[11px] text-slate-300">
                        <div>
                          <span className="text-slate-500 font-bold p-1">
                            Inputs:
                          </span>
                          <span className="text-cyan-400">
                            ({appState.selectedInputs.length} files queued)
                          </span>
                          <ul className="pl-4 text-[10px] text-slate-400 list-disc pt-1 font-mono">
                            {appState.selectedInputs.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <span className="text-slate-500 font-bold p-1">
                            Active Model ID:
                          </span>
                          <span className="text-slate-200">
                            {activeModel.name} [{activeModel.architecture}]
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 font-bold p-1">
                            Target Adapter:
                          </span>
                          <span className="text-slate-200">
                            {getAdapterForModel(activeModel).name}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 font-bold p-1">
                            Format / Suffixes:
                          </span>
                          <span className="text-indigo-400">
                            {appState.outputFormat} (
                            {predictedOutputNames.join(", ")})
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-[#10b981]/15 border border-[#10b981]/20 text-[#10b981] rounded-lg text-[10px] font-mono leading-relaxed leading-5">
                        <strong>Ready Status:</strong> ALL system validations
                        (FFmpeg check, Sandbox cache validation, SHA-256
                        signature confirmation) passed. OK to run thread safely.
                      </div>
                    </div>

                    <div className="flex gap-2.5 text-xs font-bold pt-2 justify-end">
                      <button
                        onClick={() => setShowConfirmModal(false)}
                        className="px-5 py-2 bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteSeparation}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white rounded-lg transition-colors cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                      >
                        Confirm & Separation Stems
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </div>
  );
}
