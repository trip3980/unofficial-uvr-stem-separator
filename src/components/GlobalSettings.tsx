import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Cpu,
  Volume2,
  Save,
  TerminalSquare,
  Shield,
  FolderOpen,
  AlertTriangle,
  Music,
  Undo,
  Workflow,
  Sliders,
  ChevronDown,
  ChevronUp,
  FileCode,
  XCircle,
  Info,
  CheckCircle2,
  Play,
  Sparkles,
} from "lucide-react";
import { HelpToggle, HelpText, HelpTooltipIcon, AccessibleTooltipWrapper } from "./HelpSystem";
import { APP_NAME, APP_SHORT_NAME } from "../config/branding";
import { OPENSTEM_UPDATE_PRINCIPLE, UPDATE_READINESS_LANES } from "../services/updatePolicy";

// Global custom settings changed event name
const GLOBAL_SETTINGS_EVENT = "uvr6_global_settings_changed";

// Types matching the centralized AppState
type OutputFormat = "WAV" | "FLAC" | "MP3";

interface GlobalWiredState {
  processMethodId: string;
  selectedModelId: string;
  selectedEnsembleId: string;
  outputFormat: OutputFormat;
  chunks: string;
  noiseReduction: string;
  executionDevice: "cpu" | "cuda" | "directml" | "auto" | "mps" | "dml";
  cpuThreads: number;
  segmentSize: string;
  ttaActive: boolean;
  postProcessActive: boolean;
  saveVocalsOnly: boolean;
  saveInstrumentalOnly: boolean;
  splitMode: boolean;
  saveAllOutputs: boolean;
  modelTestMode: boolean;
  saveNoisyOutput: boolean;
  saveNoiseyOutput: boolean; // Backward compatibility with legacy spelling typo
  highPrecisionWeights: boolean;
  sameAsInputFolder: boolean;
  createFolderPerTrack: boolean;
  customPythonPath: string;
  customFFmpegPath: string;
  selectedOutputFolder: string;
}

// ==========================================
// SAFE STORAGE HELPER FUNCTIONS (Rule 4)
// ==========================================

function safeReadSavedState(): any {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const item = localStorage.getItem("uvr6_saved_app_state");
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch (e) {
    console.warn("Storage read error for uvr6_saved_app_state:", e);
    return null;
  }
}

function safeWriteSavedState(payload: any): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    localStorage.setItem("uvr6_saved_app_state", JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error("Storage write error for uvr6_saved_app_state:", e);
    return false;
  }
}

function safeReadCustomPythonPath(): string {
  try {
    if (typeof window === "undefined" || !window.localStorage) return "";
    return localStorage.getItem("customPythonPath") || "";
  } catch (e) {
    console.warn("Python path storage read error:", e);
    return "";
  }
}

function safeWriteCustomPythonPath(path: string): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    localStorage.setItem("customPythonPath", path);
    return true;
  } catch (e) {
    console.error("Python path storage write error:", e);
    return false;
  }
}

function safeReadCustomFFmpegPath(): string {
  try {
    if (typeof window === "undefined" || !window.localStorage) return "";
    return localStorage.getItem("customFFmpegPath") || "";
  } catch (e) {
    console.warn("FFmpeg path storage read error:", e);
    return "";
  }
}

function safeWriteCustomFFmpegPath(path: string): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    if (path) {
      localStorage.setItem("customFFmpegPath", path);
    } else {
      localStorage.removeItem("customFFmpegPath");
    }
    return true;
  } catch (e) {
    console.error("FFmpeg path storage write error:", e);
    return false;
  }
}

// ==========================================
// SETTINGS SCHEMA VALIDATION (Rule 5)
// ==========================================

interface ValidationResult {
  valid: boolean;
  category: "valid" | "ignored_keys" | "blocked";
  error?: string;
  cleanedPayload?: any;
}

function validateSettingsSchema(parsed: any): ValidationResult {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { valid: false, category: "blocked", error: "Settings must be a JSON object structure" };
  }

  const ALLOWED_FORMATS = ["WAV", "FLAC", "MP3"];
  const ALLOWED_DEVICES = ["cpu", "cuda", "mps", "directml", "dml", "auto"];
  const ALLOWED_METHODS = ["vr", "mdx", "demucs", "bs_roformer", "ensemble"];

  // Critical values checks
  if (parsed.outputFormat !== undefined && !ALLOWED_FORMATS.includes(parsed.outputFormat)) {
    return {
      valid: false,
      category: "blocked",
      error: `Invalid outputFormat: "${parsed.outputFormat}". Allowed formats: WAV, FLAC, MP3.`,
    };
  }

  if (parsed.processMethodId !== undefined && !ALLOWED_METHODS.includes(parsed.processMethodId)) {
    return {
      valid: false,
      category: "blocked",
      error: `Invalid processMethodId: "${parsed.processMethodId}". Allowed values: vr, mdx, demucs, bs_roformer, ensemble.`,
    };
  }

  if (
    parsed.dropdownSettings?.executionDevice !== undefined &&
    !ALLOWED_DEVICES.includes(parsed.dropdownSettings.executionDevice)
  ) {
    return {
      valid: false,
      category: "blocked",
      error: `Invalid executionDevice: "${parsed.dropdownSettings.executionDevice}". Allowed devices: cpu, cuda, mps, directml, auto.`,
    };
  }

  if (parsed.customPythonPath !== undefined && typeof parsed.customPythonPath !== "string") {
    return { valid: false, category: "blocked", error: "customPythonPath must be a string path." };
  }

  if (parsed.customFFmpegPath !== undefined && typeof parsed.customFFmpegPath !== "string") {
    return { valid: false, category: "blocked", error: "customFFmpegPath must be a string path." };
  }

  // Schema extraction with arbitrary keys filtering
  const ALLOWED_ROOT_KEYS = [
    "selectedOutputFolder",
    "processMethodId",
    "selectedModelId",
    "selectedEnsembleId",
    "outputFormat",
    "dropdownSettings",
    "checkboxSettings",
    "customPythonPath",
    "customFFmpegPath",
    "note",
  ];

  let hasUnknownKeys = false;
  const cleaned: any = {};

  for (const key of Object.keys(parsed)) {
    if (ALLOWED_ROOT_KEYS.includes(key)) {
      cleaned[key] = parsed[key];
    } else {
      hasUnknownKeys = true;
    }
  }

  // Filter dropdownSettings keys
  const ALLOWED_DROPDOWN_KEYS = ["chunks", "noiseReduction", "executionDevice", "cpuThreads", "segmentSize"];
  if (
    parsed.dropdownSettings &&
    typeof parsed.dropdownSettings === "object" &&
    !Array.isArray(parsed.dropdownSettings)
  ) {
    cleaned.dropdownSettings = {};
    for (const key of Object.keys(parsed.dropdownSettings)) {
      if (ALLOWED_DROPDOWN_KEYS.includes(key)) {
        cleaned.dropdownSettings[key] = parsed.dropdownSettings[key];
      } else {
        hasUnknownKeys = true;
      }
    }
  }

  // Filter checkboxSettings keys
  const ALLOWED_CHECKBOX_KEYS = [
    "ttaActive",
    "postProcessActive",
    "saveVocalsOnly",
    "saveInstrumentalOnly",
    "splitMode",
    "saveAllOutputs",
    "modelTestMode",
    "saveNoiseyOutput",
    "saveNoisyOutput",
    "highPrecisionWeights",
    "sameAsInputFolder",
    "createFolderPerTrack",
  ];
  if (
    parsed.checkboxSettings &&
    typeof parsed.checkboxSettings === "object" &&
    !Array.isArray(parsed.checkboxSettings)
  ) {
    cleaned.checkboxSettings = {};
    for (const key of Object.keys(parsed.checkboxSettings)) {
      if (ALLOWED_CHECKBOX_KEYS.includes(key)) {
        cleaned.checkboxSettings[key] = parsed.checkboxSettings[key];
      } else {
        hasUnknownKeys = true;
      }
    }
  }

  // Migrate 'dml' to 'directml' (Rule 14)
  if (cleaned.dropdownSettings && cleaned.dropdownSettings.executionDevice === "dml") {
    cleaned.dropdownSettings.executionDevice = "directml";
  }

  const category = hasUnknownKeys ? "ignored_keys" : "valid";
  return { valid: true, category, cleanedPayload: cleaned };
}

export default function GlobalSettings() {
  // Toast notifications state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning" | "error" | "info">("success");

  // Destructive confirmations
  const [modalType, setModalType] = useState<
    "reset" | "restore_safe" | "clear_temp" | "clear_failed" | "reset_cache" | "import_export" | null
  >(null);
  const [modalSubTab, setModalSubTab] = useState<"export" | "import">("export");
  const [importText, setImportText] = useState("");
  const [importFeedback, setImportFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [validatedCleanPayload, setValidatedCleanPayload] = useState<any | null>(null);

  // Verification states for async checks
  const [pythonVerification, setPythonVerification] = useState<
    "idle" | "verifying" | "valid" | "invalid" | "unverified_browser"
  >("idle");
  const [pythonVersion, setPythonVersion] = useState<string>("");
  const [outputFolderVerification, setOutputFolderVerification] = useState<
    "idle" | "verifying" | "writable" | "missing" | "unverified_browser"
  >("idle");

  // Master local state
  const [state, setState] = useState<GlobalWiredState>({
    processMethodId: "bs_roformer",
    selectedModelId: "mel_band_roformer_karaoke",
    selectedEnsembleId: "multi_ai_ensemble_preset",
    outputFormat: "WAV",
    chunks: "12",
    noiseReduction: "4",
    executionDevice: "cpu",
    cpuThreads: 4,
    segmentSize: "1024",
    ttaActive: false,
    postProcessActive: true,
    saveVocalsOnly: false,
    saveInstrumentalOnly: false,
    splitMode: true,
    saveAllOutputs: false,
    modelTestMode: false,
    saveNoisyOutput: false,
    saveNoiseyOutput: false,
    highPrecisionWeights: true,
    sameAsInputFolder: false,
    createFolderPerTrack: false,
    customPythonPath: "",
    customFFmpegPath: "",
    selectedOutputFolder: "",
  });

  // Verify custom Python environment asynchronously (Rule 35)
  const verifyPythonPath = async (pathToCheck: string) => {
    const uvr = (window as any).uvr;
    if (!pathToCheck) {
      setPythonVerification("idle");
      setPythonVersion("");
      return;
    }
    if (!uvr) {
      setPythonVerification("idle");
      return;
    }
    setPythonVerification("verifying");
    try {
      const res = await uvr.verifyPythonPath(pathToCheck);
      if (res && res.success) {
        setPythonVerification("valid");
        setPythonVersion(res.version || "Python 3.x");
      } else {
        setPythonVerification("invalid");
        setPythonVersion("");
      }
    } catch {
      setPythonVerification("invalid");
      setPythonVersion("");
    }
  };

  // Verify output folder location asynchronously (Rule 3)
  const verifyOutputFolder = async (pathToCheck: string) => {
    const uvr = (window as any).uvr;
    if (!pathToCheck) {
      setOutputFolderVerification("idle");
      return;
    }
    if (!uvr) {
      setOutputFolderVerification("unverified_browser");
      return;
    }
    setOutputFolderVerification("verifying");
    try {
      const res = await uvr.verifyOutputFolder(pathToCheck);
      if (res && res.success) {
        setOutputFolderVerification("writable");
      } else {
        setOutputFolderVerification("missing");
      }
    } catch {
      setOutputFolderVerification("missing");
    }
  };

  // Trigger verifications on mount or state changes
  useEffect(() => {
    if (state.customPythonPath) {
      verifyPythonPath(state.customPythonPath);
    }
  }, []);

  useEffect(() => {
    verifyOutputFolder(state.selectedOutputFolder);
  }, [state.selectedOutputFolder]);

  // Load from local storage on mount (guarded carefully - Rule 4)
  useEffect(() => {
    const parsed = safeReadSavedState();
    const savedPath = safeReadCustomPythonPath();
    const savedFFmpegPath = safeReadCustomFFmpegPath();

    if (parsed) {
      const legacyNoisy = parsed.checkboxSettings?.saveNoiseyOutput || false;
      const canonicalNoisy = parsed.checkboxSettings?.saveNoisyOutput ?? legacyNoisy;
      let dev = parsed.dropdownSettings?.executionDevice || "cpu";
      if (dev === "dml") dev = "directml";

      setState({
        processMethodId: parsed.processMethodId || "bs_roformer",
        selectedModelId: parsed.selectedModelId || "mel_band_roformer_karaoke",
        selectedEnsembleId: parsed.selectedEnsembleId || "multi_ai_ensemble_preset",
        outputFormat: parsed.outputFormat || "WAV",
        chunks: parsed.dropdownSettings?.chunks || "12",
        noiseReduction: parsed.dropdownSettings?.noiseReduction || "4",
        executionDevice: dev,
        cpuThreads: parsed.dropdownSettings?.cpuThreads || 4,
        segmentSize: parsed.dropdownSettings?.segmentSize || "1024",
        ttaActive: parsed.checkboxSettings?.ttaActive || false,
        postProcessActive: parsed.checkboxSettings?.postProcessActive ?? true,
        saveVocalsOnly: parsed.checkboxSettings?.saveVocalsOnly || false,
        saveInstrumentalOnly: parsed.checkboxSettings?.saveInstrumentalOnly || false,
        splitMode: parsed.checkboxSettings?.splitMode ?? true,
        saveAllOutputs: parsed.checkboxSettings?.saveAllOutputs || false,
        modelTestMode: parsed.checkboxSettings?.modelTestMode || false,
        saveNoisyOutput: canonicalNoisy,
        saveNoiseyOutput: canonicalNoisy,
        highPrecisionWeights: parsed.checkboxSettings?.highPrecisionWeights ?? true,
        sameAsInputFolder: parsed.checkboxSettings?.sameAsInputFolder || false,
        createFolderPerTrack: parsed.checkboxSettings?.createFolderPerTrack || false,
        customPythonPath: savedPath,
        customFFmpegPath: savedFFmpegPath,
        selectedOutputFolder: parsed.selectedOutputFolder || "",
      });
    } else if (localStorage.getItem("uvr6_saved_app_state") !== null) {
      // Storage item was present but malformed
      triggerToast(
        "Stored preferences were found to be corrupt. Safe factory defaults have been loaded instead.",
        "warning",
      );
    }
  }, []);

  function triggerToast(msg: string, type: "success" | "warning" | "error" | "info" = "success") {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Browse output repository target folder using native electron IPC (Rule 1 & 3)
  const handleBrowseOutputFolder = async () => {
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.selectOutputFolder === "function") {
      try {
        const folder = await uvr.selectOutputFolder();
        if (folder) {
          setState((prev) => ({ ...prev, selectedOutputFolder: folder }));
          triggerToast(`Output target folder updated to ${folder}`, "success");
        }
      } catch (err: any) {
        triggerToast(`Folder selector error: ${err.message}`, "error");
      }
    } else {
      triggerToast("Browser Preview: Native Folder Dialog is unavailable in Web sandbox.", "info");
    }
  };

  // Browse python path custom file using native electron IPC (Rule 3)
  const handleBrowsePythonPath = async () => {
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.selectPythonPath === "function") {
      try {
        const path = await uvr.selectPythonPath();
        if (path) {
          setState((prev) => ({ ...prev, customPythonPath: path }));
          verifyPythonPath(path);
          triggerToast(`Custom Python path set to ${path}`, "success");
        }
      } catch (err: any) {
        triggerToast(`File selector error: ${err.message}`, "error");
      }
    } else {
      triggerToast("Browser Preview: Native File Dialog is unavailable in Web sandbox.", "info");
    }
  };

  const handleBrowseFFmpegPath = async () => {
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.selectFFmpegPath === "function") {
      try {
        const result = await uvr.selectFFmpegPath();
        const filePath = typeof result === "string" ? result : result?.filePath;
        if (filePath) {
          setState((prev) => ({ ...prev, customFFmpegPath: filePath }));
          safeWriteCustomFFmpegPath(filePath);
          const message = result?.ready
            ? "FFmpeg executable verified. This resolves only the FFmpeg runtime blocker."
            : result?.userMessage || "FFmpeg path selected. Run diagnostics to verify it.";
          triggerToast(message, result?.ready ? "success" : "warning");
        }
      } catch (err: any) {
        triggerToast(`FFmpeg selector error: ${err.message}`, "error");
      }
    } else {
      triggerToast("Browser Preview: Native FFmpeg file dialog is unavailable in Web sandbox.", "info");
    }
  };

  // Save changes
  const saveGlobalPreferences = () => {
    // 1. Save Python Path
    safeWriteCustomPythonPath(state.customPythonPath);
    safeWriteCustomFFmpegPath(state.customFFmpegPath);

    // 2. Save App State
    const payload = {
      selectedOutputFolder: state.selectedOutputFolder,
      processMethodId: state.processMethodId,
      selectedModelId: state.selectedModelId,
      selectedEnsembleId: state.selectedEnsembleId,
      outputFormat: state.outputFormat,
      dropdownSettings: {
        chunks: state.chunks,
        noiseReduction: state.noiseReduction,
        executionDevice: state.executionDevice,
        cpuThreads: state.cpuThreads,
        segmentSize: state.segmentSize,
      },
      checkboxSettings: {
        ttaActive: state.ttaActive,
        postProcessActive: state.postProcessActive,
        saveVocalsOnly: state.saveVocalsOnly,
        saveInstrumentalOnly: state.saveInstrumentalOnly,
        splitMode: state.splitMode,
        saveAllOutputs: state.saveAllOutputs,
        modelTestMode: state.modelTestMode,
        saveNoisyOutput: state.saveNoisyOutput,
        saveNoiseyOutput: state.saveNoisyOutput, // Backward compatible legacy property
        highPrecisionWeights: state.highPrecisionWeights,
        sameAsInputFolder: state.sameAsInputFolder,
        createFolderPerTrack: state.createFolderPerTrack,
      },
    };

    // Load any existing to preserve details
    const existing = safeReadSavedState() || {};

    const fullyWiredPayload = { ...existing, ...payload };
    safeWriteSavedState(fullyWiredPayload);

    triggerToast(
      "Global preferences saved to local app storage. Defaults apply to newly initialized jobs only.",
      "success",
    );

    // Dispatch a custom event so the UI updates any local active selections immediately (Rule 9)
    window.dispatchEvent(new CustomEvent(GLOBAL_SETTINGS_EVENT, { detail: fullyWiredPayload }));
  };

  // Clean resets (avoid page reload, update inline React state smoothly - Rule 23)
  const handleHardReset = () => {
    localStorage.removeItem("uvr6_saved_app_state");
    localStorage.removeItem("customPythonPath");
    localStorage.removeItem("customFFmpegPath");
    setModalType(null);

    const factoryValues: GlobalWiredState = {
      processMethodId: "bs_roformer",
      selectedModelId: "mel_band_roformer_karaoke",
      selectedEnsembleId: "multi_ai_ensemble_preset",
      outputFormat: "WAV",
      chunks: "12",
      noiseReduction: "4",
      executionDevice: "cpu",
      cpuThreads: 4,
      segmentSize: "1024",
      ttaActive: false,
      postProcessActive: true,
      saveVocalsOnly: false,
      saveInstrumentalOnly: false,
      splitMode: true,
      saveAllOutputs: false,
      modelTestMode: false,
      saveNoisyOutput: false,
      saveNoiseyOutput: false,
      highPrecisionWeights: true,
      sameAsInputFolder: false,
      createFolderPerTrack: false,
      customPythonPath: "",
      customFFmpegPath: "",
      selectedOutputFolder: "",
    };

    setState(factoryValues);
    setPythonVerification("idle");
    setPythonVersion("");
    setOutputFolderVerification("idle");

    triggerToast("All configurations flushed. Defaults restored inline smoothly.", "warning");
    window.dispatchEvent(new CustomEvent(GLOBAL_SETTINGS_EVENT, { detail: factoryValues }));
  };

  const handleRestoreSafeDefaults = () => {
    const safeDefaults = {
      selectedOutputFolder: "", // Safe, dynamic, unassigned environment path (Rule 2)
      processMethodId: "bs_roformer",
      selectedModelId: "mel_band_roformer_karaoke",
      selectedEnsembleId: "multi_ai_ensemble_preset",
      outputFormat: "WAV",
      dropdownSettings: {
        chunks: "12",
        noiseReduction: "4",
        executionDevice: "cpu" as const, // CPU safe fallback
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
        saveNoisyOutput: false,
        saveNoiseyOutput: false,
        highPrecisionWeights: true,
        sameAsInputFolder: false,
        createFolderPerTrack: false,
      },
    };

    safeWriteCustomPythonPath("");
    safeWriteCustomFFmpegPath("");
    safeWriteSavedState(safeDefaults);
    setModalType(null);

    setState({
      processMethodId: "bs_roformer",
      selectedModelId: "mel_band_roformer_karaoke",
      selectedEnsembleId: "multi_ai_ensemble_preset",
      outputFormat: "WAV",
      chunks: "12",
      noiseReduction: "4",
      executionDevice: "cpu",
      cpuThreads: 4,
      segmentSize: "1024",
      ttaActive: false,
      postProcessActive: true,
      saveVocalsOnly: false,
      saveInstrumentalOnly: false,
      splitMode: true,
      saveAllOutputs: false,
      modelTestMode: false,
      saveNoisyOutput: false,
      saveNoiseyOutput: false,
      highPrecisionWeights: true,
      sameAsInputFolder: false,
      createFolderPerTrack: false,
      customPythonPath: "",
      customFFmpegPath: "",
      selectedOutputFolder: "",
    });
    setPythonVerification("idle");
    setPythonVersion("");
    setOutputFolderVerification("idle");

    triggerToast(
      "Restored local safe environments (CPU Execution, zero-auto downloads). No reboot required.",
      "success",
    );
    window.dispatchEvent(new CustomEvent(GLOBAL_SETTINGS_EVENT, { detail: safeDefaults }));
  };

  const handleClearTempFiles = async () => {
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.clearTempFiles === "function") {
      try {
        const res = await uvr.clearTempFiles();
        if (res && res.success) {
          triggerToast("All process runtime temporary directories wiped clean!", "success");
        } else {
          triggerToast(`Failed flushing temp directories: ${res?.error || "unknown directory error"}`, "error");
        }
      } catch (e: any) {
        triggerToast(`Error flushing files: ${e.message}`, "error");
      }
    } else {
      triggerToast(
        "Browser Preview Mode: cleanup preview only. Native Electron is required to delete temp files.",
        "info",
      );
    }
    setModalType(null);
  };

  const handleClearFailedDownloads = async () => {
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.clearFailedDownloads === "function") {
      try {
        const res = await uvr.clearFailedDownloads();
        if (res && res.success) {
          triggerToast("Purged corrupt partial download registers successfully.", "success");
        } else {
          triggerToast(`Failed clean: ${res?.error || "unknown registers error"}`, "error");
        }
      } catch (e: any) {
        triggerToast(`Error purging files: ${e.message}`, "error");
      }
    } else {
      triggerToast("Browser Preview Mode: failed-download cleanup preview only. Native Electron is required.", "info");
    }
    setModalType(null);
  };

  const handleResetWeightsCache = async () => {
    const uvr = (window as any).uvr;
    if (uvr && typeof uvr.resetWeightsCache === "function") {
      try {
        const res = await uvr.resetWeightsCache();
        if (res && res.success) {
          triggerToast("Model registry download verification flags cleared.", "success");
        } else {
          triggerToast(`Failed reset: ${res?.error || "unknown weights registry error"}`, "error");
        }
      } catch (e: any) {
        triggerToast(`Error resetting weights: ${e.message}`, "error");
      }
    } else {
      triggerToast("Browser Preview Mode: model cache reset preview only. Native Electron is required.", "info");
    }
    setModalType(null);
  };

  const handleImportSettings = () => {
    if (!validatedCleanPayload) {
      triggerToast("Please run validation on pasted configuration JSON before importing.", "warning");
      return;
    }
    const res = safeWriteSavedState(validatedCleanPayload);
    if (validatedCleanPayload.customPythonPath !== undefined) {
      safeWriteCustomPythonPath(validatedCleanPayload.customPythonPath);
    }
    if (validatedCleanPayload.customFFmpegPath !== undefined) {
      safeWriteCustomFFmpegPath(validatedCleanPayload.customFFmpegPath);
    }
    if (res) {
      // Sync React state directly
      const dropdown = validatedCleanPayload.dropdownSettings || {};
      const checkbox = validatedCleanPayload.checkboxSettings || {};

      setState({
        processMethodId: validatedCleanPayload.processMethodId || "bs_roformer",
        selectedModelId: validatedCleanPayload.selectedModelId || "mel_band_roformer_karaoke",
        selectedEnsembleId: validatedCleanPayload.selectedEnsembleId || "multi_ai_ensemble_preset",
        outputFormat: validatedCleanPayload.outputFormat || "WAV",
        chunks: dropdown.chunks || "12",
        noiseReduction: dropdown.noiseReduction || "4",
        executionDevice: dropdown.executionDevice || "cpu",
        cpuThreads: dropdown.cpuThreads || 4,
        segmentSize: dropdown.segmentSize || "1024",
        ttaActive: checkbox.ttaActive || false,
        postProcessActive: checkbox.postProcessActive ?? true,
        saveVocalsOnly: checkbox.saveVocalsOnly || false,
        saveInstrumentalOnly: checkbox.saveInstrumentalOnly || false,
        splitMode: checkbox.splitMode ?? true,
        saveAllOutputs: checkbox.saveAllOutputs || false,
        modelTestMode: checkbox.modelTestMode || false,
        saveNoisyOutput: checkbox.saveNoisyOutput || checkbox.saveNoiseyOutput || false,
        saveNoiseyOutput: checkbox.saveNoisyOutput || checkbox.saveNoiseyOutput || false,
        highPrecisionWeights: checkbox.highPrecisionWeights ?? true,
        sameAsInputFolder: checkbox.sameAsInputFolder || false,
        createFolderPerTrack: checkbox.createFolderPerTrack || false,
        customPythonPath: validatedCleanPayload.customPythonPath || "",
        customFFmpegPath: validatedCleanPayload.customFFmpegPath || "",
        selectedOutputFolder: validatedCleanPayload.selectedOutputFolder || "",
      });

      triggerToast("Custom diagnostic configurations imported successfully!", "success");
      setModalType(null);
      // Dispatch immediately (Rule 9)
      window.dispatchEvent(new CustomEvent(GLOBAL_SETTINGS_EVENT, { detail: validatedCleanPayload }));
    }
  };

  const runImportTextValidation = () => {
    try {
      const parsed = JSON.parse(importText);
      const verifyRes = validateSettingsSchema(parsed);
      if (verifyRes.valid) {
        setValidatedCleanPayload(verifyRes.cleanedPayload);
        if (verifyRes.category === "ignored_keys") {
          setImportFeedback({
            type: "warning",
            message:
              "Import mapping verified: arbitrary unknown properties were safely stripped/ignored. Ready to apply.",
          });
        } else {
          setImportFeedback({
            type: "success",
            message: "Import mapping verified: strict clean settings schema passed. Ready to apply.",
          });
        }
      } else {
        setValidatedCleanPayload(null);
        setImportFeedback({
          type: "error",
          message: `Blocked invalid schema: ${verifyRes.error || "failed structure parsing"}`,
        });
      }
    } catch (e: any) {
      setValidatedCleanPayload(null);
      setImportFeedback({
        type: "error",
        message: `Import blocked: JSON Syntax Error - ${e.message}`,
      });
    }
  };

  const handleExportClick = () => {
    // Pre-populate with currently staged preferences
    const currentPayload = {
      selectedOutputFolder: state.selectedOutputFolder,
      processMethodId: state.processMethodId,
      selectedModelId: state.selectedModelId,
      selectedEnsembleId: state.selectedEnsembleId,
      outputFormat: state.outputFormat,
      dropdownSettings: {
        chunks: state.chunks,
        noiseReduction: state.noiseReduction,
        executionDevice: state.executionDevice,
        cpuThreads: state.cpuThreads,
        segmentSize: state.segmentSize,
      },
      checkboxSettings: {
        ttaActive: state.ttaActive,
        postProcessActive: state.postProcessActive,
        saveVocalsOnly: state.saveVocalsOnly,
        saveInstrumentalOnly: state.saveInstrumentalOnly,
        splitMode: state.splitMode,
        saveAllOutputs: state.saveAllOutputs,
        modelTestMode: state.modelTestMode,
        saveNoisyOutput: state.saveNoisyOutput,
        highPrecisionWeights: state.highPrecisionWeights,
        sameAsInputFolder: state.sameAsInputFolder,
        createFolderPerTrack: state.createFolderPerTrack,
      },
      customPythonPath: state.customPythonPath,
      customFFmpegPath: state.customFFmpegPath,
    };

    setImportText(JSON.stringify(currentPayload, null, 2));
    setModalSubTab("export");
    setImportFeedback(null);
    setValidatedCleanPayload(null);
    setModalType("import_export");
  };

  const handleDownloadSettingsFile = () => {
    try {
      const currentPayload = {
        selectedOutputFolder: state.selectedOutputFolder,
        processMethodId: state.processMethodId,
        selectedModelId: state.selectedModelId,
        selectedEnsembleId: state.selectedEnsembleId,
        outputFormat: state.outputFormat,
        dropdownSettings: {
          chunks: state.chunks,
          noiseReduction: state.noiseReduction,
          executionDevice: state.executionDevice,
          cpuThreads: state.cpuThreads,
          segmentSize: state.segmentSize,
        },
        checkboxSettings: {
          ttaActive: state.ttaActive,
          postProcessActive: state.postProcessActive,
          saveVocalsOnly: state.saveVocalsOnly,
          saveInstrumentalOnly: state.saveInstrumentalOnly,
          splitMode: state.splitMode,
          saveAllOutputs: state.saveAllOutputs,
          modelTestMode: state.modelTestMode,
          saveNoisyOutput: state.saveNoisyOutput,
          highPrecisionWeights: state.highPrecisionWeights,
          sameAsInputFolder: state.sameAsInputFolder,
          createFolderPerTrack: state.createFolderPerTrack,
        },
        customPythonPath: state.customPythonPath,
        customFFmpegPath: state.customFFmpegPath,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "openstem_settings_profile.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast("Downloaded settings schema profile file locally.", "success");
    } catch (e: any) {
      triggerToast("File creation error: " + e.message, "error");
    }
  };

  const handleCopySettingsToClipboard = () => {
    navigator.clipboard
      .writeText(importText)
      .then(() => {
        triggerToast("Settings JSON copied to clipboard successfully!", "success");
      })
      .catch((e: any) => {
        triggerToast("Clipboard access blocked by browser options.", "error");
      });
  };

  // State to track accordion expansion (index-based)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({
    0: true, // General Process Defaults
    7: true, // Hardware & Performance Defaults
    8: true, // Paths Defaults
  });

  const toggleSection = (idx: number) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Clean objective model names and formats (Rule 18)
  const VR_MODEL_OPTIONS = [
    { id: "vr_5_hp_karaoke", label: "5_HP-Karaoke-UVR.pth" },
    { id: "vr_de_echo_normal", label: "UVR-De-Echo-Normal.pth" },
  ];

  const MDX_MODEL_OPTIONS = [
    { id: "kim_vocal_2_mdx", label: "Kim_Vocal_2.onnx" },
    { id: "mdx_de_reverb", label: "MDX_DeReverb.onnx" },
  ];

  const DEMUCS_MODEL_OPTIONS = [
    { id: "htdemucs_v4_pt", label: "htdemucs.pt" },
    { id: "htdemucs_ft_ft", label: "htdemucs_ft.pt" },
  ];

  const ROFORMER_MODEL_OPTIONS = [
    { id: "mel_band_roformer_karaoke", label: "mel_band_roformer_karaoke.onnx" },
    { id: "roformer_vocals", label: "vocal_roformer_model.ckpt" },
  ];

  const ENSEMBLE_PRESETS = [
    { id: "multi_ai_ensemble_preset", label: "Multi-AI Fusion Ensemble Preset" },
    { id: "basic_vr_ensemble", label: "VR Architecture Double-Pass Matcher" },
    { id: "basic_mdx_ensemble", label: "MDX Spectrogram Average Preset" },
  ];

  // Helper to compile Collateral Staged Modifications (collapsible preview card)
  const stagedChanges = React.useMemo(() => {
    const list: string[] = [];
    if (state.processMethodId !== "bs_roformer") list.push(`Default Process: ${state.processMethodId.toUpperCase()}`);
    if (state.outputFormat !== "WAV") list.push(`Save Format: ${state.outputFormat}`);
    if (state.chunks !== "12") list.push(`MDX Chunk Size: ${state.chunks}`);
    if (state.noiseReduction !== "4") list.push(`MDX NR Strength: ${state.noiseReduction}`);
    if (state.executionDevice !== "cpu") list.push(`Execution Device: ${state.executionDevice.toUpperCase()}`);
    if (state.cpuThreads !== 4) list.push(`CPU Thread Count: ${state.cpuThreads} cores`);
    if (state.segmentSize !== "1024") list.push(`VR Window Size: ${state.segmentSize}`);
    if (state.sameAsInputFolder) list.push("Force: Output inside source folders");
    if (state.saveVocalsOnly) list.push("Extract: Save Vocals Stem Only");
    if (state.saveInstrumentalOnly) list.push("Extract: Save Instrumental Stem Only");
    if (!state.postProcessActive) list.push("Process: Disable residue filtering limit");
    if (state.customPythonPath) list.push(`Python Overrides: ${state.customPythonPath}`);
    if (state.customFFmpegPath) list.push(`FFmpeg Override: ${state.customFFmpegPath}`);
    if (state.selectedOutputFolder) list.push(`Output Folder: ${state.selectedOutputFolder}`);
    return list;
  }, [state]);

  return (
    <div className="w-full max-w-full space-y-6 animate-fade-in relative z-10 min-w-0 box-border pb-10">
      {/* Dynamic Action Success Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border flex items-center gap-3 shadow-2xl animate-fade-in ${
            toastType === "success"
              ? "bg-[#0b1c12] border-emerald-500/40 text-emerald-300"
              : toastType === "warning"
                ? "bg-[#21180b] border-amber-500/40 text-amber-300"
                : toastType === "error"
                  ? "bg-[#240b0f] border-rose-500/40 text-rose-300"
                  : "bg-[#0e1629] border-blue-500/45 text-blue-300"
          }`}
        >
          {toastType === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastType === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
          {toastType === "error" && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toastType === "info" && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          <div className="text-xs font-mono font-bold whitespace-normal leading-normal">{toastMessage}</div>
        </div>
      )}

      {/* Primary Container card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#090b14]/90 border border-green-500/15 shadow-2xl relative overflow-hidden w-full min-w-0 box-border">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/40 to-transparent"></div>

        {/* Global Configuration Title bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-green-500/10 pb-5 mb-5 w-full min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 bg-green-500/10 rounded-xl border border-green-500/20 shrink-0">
              <Settings className="w-5 h-5 text-green-400 animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-display font-bold text-green-300 whitespace-normal break-words">
                OpenStem Global Settings Hub
              </h2>
              <p className="text-2xs sm:text-xs font-mono text-green-500/70 tracking-wider uppercase mt-0.5 whitespace-normal">
                Defaults for new jobs
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <HelpToggle
              sectionId="global_settings"
              label="Show Help"
              className="flex-1 sm:flex-none justify-center px-3 py-1.5"
            />
            <button
              onClick={handleExportClick}
              className="flex-1 sm:flex-none justify-center px-3 py-1.5 rounded bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 hover:text-white font-mono text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5" />
              Import/Export
            </button>
            <button
              onClick={() => setModalType("restore_safe")}
              className="flex-1 sm:flex-none justify-center px-3 py-1.5 rounded bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 text-amber-300 font-mono text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5"
            >
              <Undo className="w-3.5 h-3.5" />
              Restore Safe Defaults
            </button>
          </div>
        </div>

        <HelpText
          sectionId="global_settings"
          text="Help: Global calibrations map defaults directly to active neural runs. Hover over any parameter name, selector dropdown, or checkbox control to check if the option is active/wired and view execution hints."
        />

        {/* Informative Sub-header banner */}
        <div className="p-3.5 bg-black/40 border border-white/5 rounded-xl text-xs text-slate-400 space-y-1 mb-6 whitespace-normal break-words">
          <div className="flex items-center gap-2 text-green-400 font-bold font-mono">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Honesty & Safe Sandbox Restrictions Policy</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300 pb-1">
            {APP_SHORT_NAME} isolates execution logic safely. Settings labeled as{" "}
            <span className="text-emerald-400 font-bold">Wired / Active</span> apply immediately to new jobs. Unwired
            legacy configurations are rendered with a strict{" "}
            <span className="text-purple-400 font-bold font-mono">Legacy reference / Not wired</span> anchor so they
            remain visible for architectural compatibility mappings but do not emit mock state values.
          </p>
        </div>

        <div className="p-3.5 bg-emerald-500/[0.03] border border-emerald-500/15 rounded-xl text-xs text-slate-300 space-y-3 mb-6 whitespace-normal break-words">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-300 font-bold font-mono">
                <Info className="w-4 h-4 shrink-0" />
                <span>Program & Model Update Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">{OPENSTEM_UPDATE_PRINCIPLE}</p>
              <p className="text-[10px] leading-relaxed text-slate-500">
                No automatic background downloads, silent installs, or model-weight replacement are active. Program
                updates require a signed release manifest; model updates require source/license metadata and expected
                SHA-256 before any local file can become usable.
              </p>
            </div>
            <div className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-mono font-bold uppercase text-amber-300 shrink-0">
              Manual updates only
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 font-mono text-[10px]">
            {UPDATE_READINESS_LANES.map((lane) => (
              <div key={lane.id} className="rounded border border-white/5 bg-black/25 p-2 space-y-1">
                <div className="text-slate-200 font-bold">{lane.title}</div>
                <div className="text-amber-300">{lane.statusLabel}</div>
                <div className="text-slate-500">Code: {lane.diagnosticCode}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 11 ACCORDION SECTIONS GRID */}
        <div className="space-y-4 w-full min-w-0">
          {/* SECTION 1: General Process Defaults */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(0)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  1. General Process Defaults
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                  Wired Defaults
                </span>
              </div>
              {expanded[0] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[0] && (
              <div className="p-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 1 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec1" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec1"
                  text="Help: General parameters configured here apply across all future runs. Choose the default audio format, processing backend, and input structure. Legacy UVR5 Reference / Not wired controls indicate options that do not influence active runs."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3.5">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-400/80 font-bold">
                        Default Process Method
                      </span>
                      <select
                        value={state.processMethodId}
                        onChange={(e) => setState((prev) => ({ ...prev, processMethodId: e.target.value }))}
                        className="w-full bg-black/65 border border-green-500/25 rounded-lg px-3 py-2 text-xs text-green-300 focus:outline-none focus:border-green-400 font-mono"
                      >
                        <option value="vr">VR Architecture (Vocal Remover)</option>
                        <option value="mdx">MDX-Net Engine</option>
                        <option value="demucs">Demucs v3 / v4 (Hybrid Stems)</option>
                        <option value="bs_roformer">BS-RoFormer (Neural Transformer)</option>
                        <option value="ensemble">Ensemble Mode (Multi-AI Fusion)</option>
                      </select>
                    </label>

                    <div className="space-y-2 border-t border-white/5 pt-2">
                      <span className="text-[10px] font-mono uppercase text-[#9e76fa] font-bold block">
                        Input Behavior
                      </span>
                      <label className="flex items-center gap-3 p-2 rounded bg-black/30 border border-purple-500/10 cursor-not-allowed opacity-60">
                        <input
                          type="checkbox"
                          disabled
                          checked={false}
                          className="w-4 h-4 rounded border-purple-500/20 bg-black text-purple-500"
                        />
                        <div className="text-2xs font-mono text-purple-400">
                          <span>Remember last input folder</span>
                          <span className="block text-[9px] text-slate-500 italic">
                            Legacy UVR5 Reference / Not wired
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded bg-black/40 border border-green-500/15 cursor-default">
                        <input
                          type="checkbox"
                          checked={true}
                          readOnly
                          className="w-4 h-4 rounded border-emerald-500 bg-black text-emerald-500 accent-emerald-500"
                        />
                        <div className="text-2xs font-mono text-emerald-300">
                          <span>Allow Multiple Input Files</span>
                          <span className="block text-[9px] text-[#55f28c]/60 italic font-sans font-bold">
                            Active default • Fully wired
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded bg-black/40 border border-green-500/15 cursor-default">
                        <input
                          type="checkbox"
                          checked={true}
                          readOnly
                          className="w-4 h-4 rounded border-emerald-500 bg-black text-emerald-500 accent-emerald-500"
                        />
                        <div className="text-2xs font-mono text-emerald-300">
                          <span>Enforce minimum 2 files for Ensemble mode</span>
                          <span className="block text-[9px] text-[#55f28c]/60 italic font-sans font-bold">
                            Active block logic • Wired
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-400/80 font-bold">
                        Default Save Format
                      </span>
                      <select
                        value={state.outputFormat}
                        onChange={(e) =>
                          setState((prev) => ({ ...prev, outputFormat: e.target.value as OutputFormat }))
                        }
                        className="w-full bg-black/65 border border-green-500/25 rounded-lg px-3 py-2 text-xs text-green-300 focus:outline-none focus:border-green-400 font-mono"
                      >
                        <option value="WAV">WAV (Linear PCM - 16/24/32-bit)</option>
                        <option value="FLAC">FLAC (Lossless compression - 24-bit)</option>
                        <option value="MP3">MP3 (Variable Bit Rate 320k)</option>
                      </select>
                    </label>

                    <div className="space-y-2 border-t border-white/5 pt-2">
                      <span className="text-[10px] font-mono uppercase text-emerald-400/80 font-bold block">
                        Output Behavior
                      </span>
                      <label className="flex items-center gap-3 p-2 rounded bg-black/40 border border-green-500/15 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={state.sameAsInputFolder}
                          onChange={(e) => setState((prev) => ({ ...prev, sameAsInputFolder: e.target.checked }))}
                          className="w-4 h-4 rounded border-emerald-500 bg-black text-emerald-500 accent-emerald-400"
                        />
                        <div className="text-2xs font-mono text-emerald-300">
                          <span>Save outputs in input directory</span>
                          <span className="block text-[9px] text-[#55f28c]/60 italic">Default fallback • Wired</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded bg-black/30 border border-purple-500/10 cursor-not-allowed opacity-60">
                        <input
                          type="checkbox"
                          disabled
                          checked={false}
                          className="w-4 h-4 rounded border-purple-500/20"
                        />
                        <div className="text-2xs font-mono text-purple-400">
                          <span>Open output folder automatically after job completion</span>
                          <span className="block text-[9px] text-slate-500 italic">
                            Legacy UVR5 Reference / Not wired
                          </span>
                        </div>
                      </label>

                      <div className="p-2 border-t border-white/5 space-y-1.5 opacity-60">
                        <span className="text-[9px] font-mono uppercase text-purple-400 font-bold block">
                          Stop/Cancel Subspace
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          {["Confirm Stop", "Kill Process Tree", "Partial Kept"].map((n, i) => (
                            <div
                              key={i}
                              className="bg-black/40 border border-purple-500/15 py-1.5 px-2 rounded text-[8px] font-mono text-[#9b76fa] text-center select-none"
                              title="UVR5 process management adapter is delegated. Not wired to direct JS execution."
                            >
                              {n}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Default VR Architecture Settings */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(1)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Sliders className="w-4 h-4 text-[#8a72e2] shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  2. Default VR Architecture Settings
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-indigo-950/40 text-indigo-400 border border-indigo-500/20">
                  Parameters
                </span>
              </div>
              {expanded[1] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[1] && (
              <div className="p-4 border-t border-white/5 space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 2 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec2" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec2"
                  text="Help: Adjust segment configurations for vocal extraction pipelines. Aggression and TTA are marked as Legacy UVR5 Reference / Not wired and are not active, while Window size and Post-Process are active."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-400/80 font-bold">
                        Default VR Mode Model Selection
                      </span>
                      <select
                        value={state.selectedModelId}
                        onChange={(e) => setState((prev) => ({ ...prev, selectedModelId: e.target.value }))}
                        className="w-full bg-black/65 border border-green-500/25 rounded-lg px-3 py-2 text-xs text-green-300 font-mono focus:outline-none"
                      >
                        {VR_MODEL_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-300 font-bold">
                        Window (Segment) Size
                      </span>
                      <select
                        value={state.segmentSize}
                        onChange={(e) => setState((prev) => ({ ...prev, segmentSize: e.target.value }))}
                        className="w-full bg-black/65 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
                      >
                        <option value="320">320 [Lightweight CPU]</option>
                        <option value="512">512 [Balanced]</option>
                        <option value="1024">1024 [Fidelity / Slow]</option>
                      </select>
                    </label>

                    <div className="p-2 bg-black/30 border border-purple-500/10 rounded opacity-60">
                      <div className="flex justify-between items-center text-[10px] text-purple-400 font-mono font-bold uppercase mb-1">
                        <span>Aggression Setting</span>
                        <span>10 (Default)</span>
                      </div>
                      <input
                        type="range"
                        disabled
                        min="0"
                        max="100"
                        value="10"
                        className="w-full h-1 bg-purple-950/20 outline-none"
                      />
                      <div className="text-[9px] text-slate-500 italic mt-1 leading-normal font-sans">
                        <b>Aggression:</b> Higher values increase vocal removal strength but may damage instrumentals.{" "}
                        <span className="font-mono text-purple-400">(Legacy UVR5 Reference / Not wired)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1.5 justify-between p-2.5 rounded bg-black/40 border border-emerald-500/15 cursor-pointer">
                        <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold">
                          Save Vocals Only
                        </span>
                        <input
                          type="checkbox"
                          checked={state.saveVocalsOnly}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              saveVocalsOnly: e.target.checked,
                              saveInstrumentalOnly: e.target.checked ? false : prev.saveInstrumentalOnly,
                            }))
                          }
                          className="w-4 h-4 rounded border-emerald-500 text-emerald-500 accent-emerald-500 mt-1"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 justify-between p-2.5 rounded bg-black/40 border border-emerald-500/15 cursor-pointer">
                        <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold">
                          Save Instrumental Only
                        </span>
                        <input
                          type="checkbox"
                          checked={state.saveInstrumentalOnly}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              saveInstrumentalOnly: e.target.checked,
                              saveVocalsOnly: e.target.checked ? false : prev.saveVocalsOnly,
                            }))
                          }
                          className="w-4 h-4 rounded border-emerald-500 text-emerald-500 accent-emerald-500 mt-1"
                        />
                      </label>
                    </div>

                    <label className="flex items-center gap-3 p-2 rounded bg-black/30 border border-purple-500/10 cursor-not-allowed opacity-60">
                      <input
                        type="checkbox"
                        disabled
                        checked={false}
                        className="w-4 h-4 rounded border-purple-500/20 bg-black text-purple-500"
                      />
                      <div className="text-2xs font-mono text-purple-400">
                        <span>Test Time Augmentation (TTA)</span>
                        <span className="block text-[9px] text-slate-500 italic font-sans leading-normal">
                          <b>TTA:</b> Runs additional predictions to improve quality but increases processing time.{" "}
                          <span className="font-mono text-purple-400">(Legacy UVR5 Reference)</span>
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2 rounded bg-black/40 border border-green-500/15 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.postProcessActive}
                        onChange={(e) => setState((prev) => ({ ...prev, postProcessActive: e.target.checked }))}
                        className="w-4 h-4 rounded border-emerald-500 text-emerald-500 accent-emerald-500"
                      />
                      <div className="text-2xs font-mono text-emerald-300">
                        <span>Post-Process Residue Isolation filter</span>
                        <span className="block text-[9px] text-[#55f28c]/60 italic font-sans leading-snug">
                          Subtracts residuals from vocals to clean bleed in instrumentals.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2 rounded bg-black/30 border border-purple-500/10 cursor-not-allowed opacity-60">
                      <input
                        type="checkbox"
                        disabled
                        checked={state.highPrecisionWeights}
                        className="w-4 h-4 rounded border-purple-500/20 bg-black text-purple-500"
                      />
                      <div className="text-2xs font-mono text-purple-400">
                        <span>High Precision Weights (FP32 precision mode)</span>
                        <span className="block text-[9px] text-slate-500 italic font-sans leading-normal">
                          Preserves raw weight scales for high precision runtime prediction.{" "}
                          <span className="font-mono text-purple-400">(Legacy UVR5 Reference / Not wired)</span>
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Default MDX-Net Settings */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(2)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Sliders className="w-4 h-4 text-[#bf82e2] shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  3. Default MDX-Net Settings
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-fuchsia-950/40 text-fuchsia-400 border border-fuchsia-500/20">
                  Chunks
                </span>
              </div>
              {expanded[2] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[2] && (
              <div className="p-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 3 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec3" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec3"
                  text="Help: Configure model, chunk, and denoising variables for MDX-Net neural networks. Demucs secondary pass is marked as Legacy UVR5 Reference / Not wired. Smaller chunks decrease memory usage."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-400/80 font-bold">
                        Default MDX Model Selection
                      </span>
                      <select
                        value={state.selectedModelId}
                        onChange={(e) => setState((prev) => ({ ...prev, selectedModelId: e.target.value }))}
                        className="w-full bg-black/65 border border-green-500/25 rounded-lg px-3 py-2 text-xs text-green-300 font-mono focus:outline-none"
                      >
                        {MDX_MODEL_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-300 font-bold">
                        Active Chunk Size
                      </span>
                      <select
                        value={state.chunks}
                        onChange={(e) => setState((prev) => ({ ...prev, chunks: e.target.value }))}
                        className="w-full bg-black/65 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
                      >
                        <option value="auto">Auto-Chunk Allocation</option>
                        <option value="10">10 Chunks [Minimal VRAM]</option>
                        <option value="12">12 Chunks [Balanced]</option>
                        <option value="15">15 Chunks [Higher Precision]</option>
                        <option value="full">Full Track [Maximum VRAM / GPU]</option>
                      </select>
                      <span className="text-[10px] text-slate-400 italic font-sans leading-relaxed">
                        <b>Chunks:</b> Smaller chunks use less RAM/VRAM but may increase processing time. Larger chunks
                        may process faster but use more memory.
                      </span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-350 font-bold">
                        Noise Reduction Strength
                      </span>
                      <select
                        value={state.noiseReduction}
                        onChange={(e) => setState((prev) => ({ ...prev, noiseReduction: e.target.value }))}
                        className="w-full bg-black/65 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-slate-300 font-mono focus:outline-none"
                      >
                        <option value="0">0 [No Filtering]</option>
                        <option value="3">3 [Light Denoising]</option>
                        <option value="4">4 [Default MDX]</option>
                        <option value="8">8 [Aggressive Shield]</option>
                      </select>
                      <span className="text-[10px] text-slate-400 italic font-sans leading-relaxed">
                        <b>Noise Reduction:</b> Higher values reduce model noise more aggressively but can affect output
                        quality.
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="flex flex-col gap-1.5 justify-between p-2 rounded bg-black/40 border border-emerald-500/15">
                        <span className="text-[9px] font-mono text-emerald-300 font-bold">Save Noisy Output</span>
                        <input
                          type="checkbox"
                          checked={state.saveNoisyOutput}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              saveNoisyOutput: e.target.checked,
                              saveNoiseyOutput: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 rounded border-emerald-500 text-emerald-500 accent-emerald-500 mt-1"
                        />
                      </label>

                      <div className="flex flex-col justify-between p-2 rounded bg-black/30 border border-purple-500/10 opacity-60">
                        <span className="text-[9px] font-mono text-purple-400 font-bold uppercase">
                          Demucs secondary pass
                        </span>
                        <span className="text-[8px] text-slate-500 shrink-0 select-none">Planned / Not active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Default Demucs Settings */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(3)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Sliders className="w-4 h-4 text-[#bf82e2] shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  4. Default Demucs Settings
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-[#38104c]/40 text-[#ce91fa] border border-[#a24ce0]/20">
                  Stems
                </span>
              </div>
              {expanded[3] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[3] && (
              <div className="p-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 4 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec4" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec4"
                  text="Help: Configure Demucs neural network parameters. Split Mode is active. Settings for target stems, segments, shifts, and overlaps are Legacy UVR5 Reference / Not wired."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-400/80 font-bold">
                        Default Demucs Model
                      </span>
                      <select
                        value={state.selectedModelId}
                        onChange={(e) => setState((prev) => ({ ...prev, selectedModelId: e.target.value }))}
                        className="w-full bg-black/65 border border-green-500/25 rounded-lg px-3 py-2 text-xs text-green-300 font-mono focus:outline-none"
                      >
                        {DEMUCS_MODEL_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-3 p-2 rounded bg-[#0b0c16] border border-green-500/15">
                      <input
                        type="checkbox"
                        checked={state.splitMode}
                        onChange={(e) => setState((prev) => ({ ...prev, splitMode: e.target.checked }))}
                        className="w-4 h-4 rounded border-emerald-500 text-emerald-500 accent-emerald-500"
                      />
                      <span className="text-2xs font-mono text-emerald-300">
                        Split Mode (Enable continuous overlapping chunk stitching)
                      </span>
                    </label>
                  </div>

                  <div className="space-y-2 opacity-65">
                    <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">
                      Legacy Demucs Pass-Throughs
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-black/35 border border-purple-500/10 p-2 rounded font-mono text-purple-400">
                        <span>Stem Targets: All Stems</span>
                        <span className="block text-[8px] text-slate-500 italic mt-0.5">
                          UVR5 Reference / Not wired
                        </span>
                      </div>
                      <div className="bg-black/35 border border-purple-500/10 p-2 rounded font-mono text-purple-400">
                        <span>Segments: None (Auto)</span>
                        <span className="block text-[8px] text-slate-500 italic mt-0.5">
                          UVR5 Reference / Not wired
                        </span>
                      </div>
                      <div className="bg-black/35 border border-purple-500/10 p-2 rounded font-mono text-purple-400">
                        <span>Shifts: 2 (Default)</span>
                        <span className="block text-[8px] text-slate-500 italic mt-0.5">
                          UVR5 Reference / Not wired
                        </span>
                      </div>
                      <div className="bg-black/35 border border-purple-500/10 p-2 rounded font-mono text-purple-400">
                        <span>Overlap: 0.25 (Default)</span>
                        <span className="block text-[8px] text-slate-500 italic mt-0.5">
                          UVR5 Reference / Not wired
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: Default Ensemble Settings */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(4)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Workflow className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  5. Default Ensemble Settings
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-[#43230b]/40 text-amber-400 border border-amber-500/20">
                  Fusions
                </span>
              </div>
              {expanded[4] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[4] && (
              <div className="p-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 5 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec5" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec5"
                  text="Help: Setup fusions combining predictions from multiple algorithms. Savable intermediate weights is active. Min/max specifications and custom templates are Legacy UVR5 Reference / Not wired."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-emerald-400/80 font-bold">
                        Default Ensemble Preset
                      </span>
                      <select
                        value={state.selectedEnsembleId}
                        onChange={(e) => setState((prev) => ({ ...prev, selectedEnsembleId: e.target.value }))}
                        className="w-full bg-black/65 border border-green-500/25 rounded-lg px-3 py-2 text-xs text-green-300 font-mono focus:outline-none"
                      >
                        {ENSEMBLE_PRESETS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-3 p-2 rounded bg-[#0b0c16] border border-green-500/15">
                      <input
                        type="checkbox"
                        checked={state.saveAllOutputs}
                        onChange={(e) => setState((prev) => ({ ...prev, saveAllOutputs: e.target.checked }))}
                        className="w-4 h-4 rounded border-emerald-500 text-emerald-500 accent-emerald-500"
                      />
                      <span className="text-2xs font-mono text-emerald-300">
                        Save all intermediate model outputs (Do not clean scratch weights)
                      </span>
                    </label>
                  </div>

                  <div className="space-y-2 opacity-65">
                    <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">
                      Ensemble Advanced Alignments
                    </span>
                    <div className="p-3 bg-black/40 border border-purple-500/1 y-2 rounded space-y-1 text-2xs text-[#a277fa] font-mono">
                      <div>
                        • Algorithm focus: Instrumental [Min Spec] / Vocals [Max Spec]{" "}
                        <span className="block text-[8px] text-slate-500 italic mt-0.5">
                          UVR5 Reference / Not wired
                        </span>
                      </div>
                      <div>
                        • Minimum track requirements: Enforced strictly in pipeline state (Requires &ge; 2 tracks)
                      </div>
                      <div>
                        • Custom templates: Locked to official model manifest{" "}
                        <span className="block text-[8px] text-slate-500 italic mt-0.5">Planned / Not active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: Model Test Mode Defaults */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(5)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Play className="w-4 h-4 text-[#84cca2] shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  6. Model Test Mode Defaults
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-[#142d1e]/40 text-[#49dd86] border border-[#1b5833]/20">
                  Active Evaluation
                </span>
              </div>
              {expanded[5] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[5] && (
              <div className="p-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 6 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec6" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec6"
                  text="Help: Enable model comparison workflows. Custom model identifier names and isolated evaluation subdirectories are active. This facilitates comparison runs during Hardened Functional Alpha state."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3.5">
                    <label className="flex items-center gap-3 p-3 rounded bg-black/40 border border-green-500/15 justify-between">
                      <div className="text-2xs font-mono text-emerald-300">
                        <span>Append active model identifier to output name</span>
                        <span className="block text-[9px] text-[#55f28c]/60 italic font-sans mt-0.5">
                          Prevents identical files from overwriting during comparison
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={state.modelTestMode}
                        onChange={(e) => setState((prev) => ({ ...prev, modelTestMode: e.target.checked }))}
                        className="w-4.5 h-4.5 rounded border-emerald-500 text-emerald-500 accent-emerald-500 shrink-0"
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded bg-black/40 border border-green-500/15 justify-between">
                      <div className="text-2xs font-mono text-emerald-300">
                        <span>Create isolated folder per model test run</span>
                        <span className="block text-[9px] text-[#55f28c]/60 italic font-sans mt-0.5">
                          Places each stem structure in isolated subdirectory per test
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={state.createFolderPerTrack}
                        onChange={(e) => setState((prev) => ({ ...prev, createFolderPerTrack: e.target.checked }))}
                        className="w-4.5 h-4.5 rounded border-emerald-500 text-emerald-500 accent-emerald-500 shrink-0"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 7: Output Stem Defaults */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(6)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Music className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  7. Output Stem Defaults
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-green-950/40 text-green-400 border border-green-500/20">
                  Stems Only
                </span>
              </div>
              {expanded[6] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[6] && (
              <div className="p-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 7 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec7" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec7"
                  text="Help: Restrict active save outputs to either vocals or instrumentals, cleaning buffer allocations automatically. Silent squelchers and output collision rules are Legacy UVR5 Reference / Not wired."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-3 p-2.5 rounded bg-black/40 border border-green-500/15 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.saveVocalsOnly}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            saveVocalsOnly: e.target.checked,
                            saveInstrumentalOnly: e.target.checked ? false : prev.saveInstrumentalOnly,
                          }))
                        }
                        className="w-4 h-4 rounded border-emerald-500 text-emerald-500 accent-emerald-500"
                      />
                      <div className="text-2xs font-mono text-emerald-300">
                        <span>Save Vocals Stem Only</span>
                        <span className="block text-[9px] text-[#55f28c]/60 italic font-sans leading-tight">
                          Cleans Instrumental traces from RAM immediately • Sync Mirror
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2.5 rounded bg-black/40 border border-green-500/15 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.saveInstrumentalOnly}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            saveInstrumentalOnly: e.target.checked,
                            saveVocalsOnly: e.target.checked ? false : prev.saveVocalsOnly,
                          }))
                        }
                        className="w-4 h-4 rounded border-emerald-500 text-emerald-500 accent-emerald-500"
                      />
                      <div className="text-2xs font-mono text-emerald-300">
                        <span>Save Instrumental Stem Only</span>
                        <span className="block text-[9px] text-[#55f28c]/60 italic font-sans leading-tight">
                          Saves drive space by immediately discarding vocal temporary tracks • Sync Mirror
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2.5 opacity-65">
                    <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">
                      Legacy Squelch / Silent Gates
                    </span>
                    <div className="p-2.5 bg-black/35 border border-purple-500/10 rounded space-y-1 text-2xs text-[#a277fa] font-mono">
                      <div>
                        • Output collision: Ask User / Never Overwrite / Replace{" "}
                        <span className="block text-[8px] text-[indigo-300]/50 italic">UVR5 Reference / Not wired</span>
                      </div>
                      <div>
                        • Silent Squelching: Mute empty stems{" "}
                        <span className="block text-[8px] text-[indigo-300]/50 italic">UVR5 Reference / Not wired</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 8: Hardware and Performance Defaults */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(7)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  8. Hardware and Performance Defaults
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-[#153123]/40 text-[#4ddd91] border border-[#1b5835]/20">
                  Execution
                </span>
              </div>
              {expanded[7] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[7] && (
              <div className="p-4 border-t border-white/5 space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 8 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec8" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec8"
                  text="Help: Standardize local execution targets. Compute devices include x86 CPU, CUDA GPU, or DirectML. DirectML is experimental, and GPU devices are structurally supported / Not locally proven. Core multi-threading is active."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase text-emerald-400 font-bold">
                        Default Compute Device Selection
                      </span>
                      <select
                        value={state.executionDevice}
                        onChange={(e) => setState((prev) => ({ ...prev, executionDevice: e.target.value as any }))}
                        className="w-full bg-black/65 border border-green-500/25 rounded-lg px-3 py-2 text-xs text-green-300 focus:outline-none"
                      >
                        <option value="cpu">Basic Windows/Mac/Linux CPU (Conservative Fallback)</option>
                        <option value="cuda">
                          NVIDIA CUDA GPU Accelerator (Supported / Requires custom host dependencies)
                        </option>
                        <option value="mps">
                          Apple Silicon MPS Accelerator (Supported / macOS Apple Silicon only)
                        </option>
                        <option value="directml">DirectML GPU (Windows AMD/Intel/NVIDIA Accelerator)</option>
                        <option value="auto">
                          Dynamic Platform Auto-Selection (Bypasses active overrides if unavailable)
                        </option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold uppercase">
                        <span>CPU Render Threads</span>
                        <span>{state.cpuThreads} Cores</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="16"
                        value={state.cpuThreads}
                        onChange={(e) => setState((prev) => ({ ...prev, cpuThreads: parseInt(e.target.value) }))}
                        className="w-full h-1 bg-black/60 border border-green-500/20 rounded accent-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 italic font-sans leading-relaxed block">
                        Configures thread locks on the active CPU core scheduler, limiting host performance footprints
                        during high-intensity separation tasks.
                      </span>
                    </label>
                  </div>

                  <div className="space-y-2 opacity-65">
                    <span className="text-[10px] uppercase text-purple-400 font-bold block">
                      Engine Resource Throttling
                    </span>
                    <div className="p-3 bg-black/40 border border-purple-500/10 rounded space-y-1 text-2xs text-[#9d74f8]">
                      <div>
                        • VRAM Safe Mode: Disables aggressive weight pre-allocation{" "}
                        <span className="block text-[8px] text-slate-500 italic">UVR5 Reference / Not wired</span>
                      </div>
                      <div>
                        • Process priority: Normal (Delegated){" "}
                        <span className="block text-[8px] text-slate-500 italic">UVR5 Reference / Not wired</span>
                      </div>
                      <div>• Max concurrent separation threads: 1 (Sequential)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 9: Paths and Runtime Defaults */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(8)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  9. Paths and Runtime Defaults
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-[#142d20]/40 text-[#4add8e] border border-[#235837]/20">
                  Paths configuration
                </span>
              </div>
              {expanded[8] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[8] && (
              <div className="p-4 border-t border-white/5 space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 9 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec9" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec9"
                  text="Help: Bind paths for separate engines. Custom Python setups and native output repositories are fully active. FFmpeg DSP fallback remains a Non-AI static DSP filter instead of AI-based separation."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3.5">
                    <div className="space-y-1.5 p-3 rounded-lg bg-black/45 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-[10px] uppercase text-emerald-400 font-bold">
                        <span>Custom Python Environment (Safe Mode)</span>
                        {state.customPythonPath ? (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              pythonVerification === "valid"
                                ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                                : pythonVerification === "invalid"
                                  ? "bg-rose-950/40 text-rose-400 border border-rose-500/20"
                                  : pythonVerification === "verifying"
                                    ? "bg-amber-950/40 text-amber-400 border border-amber-500/20 animate-pulse"
                                    : "bg-slate-850/40 text-slate-400 border border-slate-700/20"
                            }`}
                          >
                            {pythonVerification === "valid" && `Validated: ${pythonVersion}`}
                            {pythonVerification === "invalid" && "Invalid Binary"}
                            {pythonVerification === "verifying" && "Scanning..."}
                            {pythonVerification === "idle" && "Idle"}
                            {pythonVerification === "unverified_browser" && "Web Sandbox"}
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-500 font-bold">System Default</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={state.customPythonPath}
                          onChange={(e) => {
                            const val = e.target.value;
                            setState((prev) => ({ ...prev, customPythonPath: val }));
                            verifyPythonPath(val);
                          }}
                          placeholder="/usr/bin/python3, python.exe, or empty to select system global packages"
                          className="flex-grow bg-black/65 border border-green-500/20 rounded-lg px-3 py-2 text-xs text-green-300 placeholder-slate-600 focus:outline-none focus:border-green-400"
                        />
                        <button
                          onClick={handleBrowsePythonPath}
                          className="px-3 py-2 bg-black hover:bg-slate-900 border border-slate-700 rounded text-2xs text-slate-300 transition-all font-mono hover:text-white"
                        >
                          Browse...
                        </button>
                        {state.customPythonPath && (
                          <button
                            onClick={() => {
                              setState((prev) => ({ ...prev, customPythonPath: "" }));
                              setPythonVerification("idle");
                              setPythonVersion("");
                            }}
                            className="px-2 py-2 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-800/30 text-rose-400 rounded text-2xs transition-all font-mono"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans italic leading-relaxed block">
                        Input absolute binary path to override embedded Python instance for high precision environments.
                      </p>
                    </div>

                    <div className="space-y-1.5 p-3 rounded-lg bg-black/45 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase text-emerald-400 font-bold block">
                          Active Output Repository
                        </span>
                        <span
                          className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                            outputFolderVerification === "writable"
                              ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                              : outputFolderVerification === "missing"
                                ? "bg-rose-950/40 text-rose-400 border border-rose-500/20"
                                : outputFolderVerification === "verifying"
                                  ? "bg-amber-950/40 text-amber-400 border border-amber-500/20 animate-pulse"
                                  : "bg-slate-800/40 text-slate-400 border border-slate-700/20"
                          }`}
                        >
                          {outputFolderVerification === "writable" && "Writable"}
                          {outputFolderVerification === "missing" && "Access Denied / Missing"}
                          {outputFolderVerification === "verifying" && "Checking Access..."}
                          {outputFolderVerification === "idle" && "Default Fallback"}
                          {outputFolderVerification === "unverified_browser" && "Simulator Mode"}
                        </span>
                      </div>
                      <div className="flex gap-2 min-w-0">
                        <div className="flex-grow bg-black/65 border border-green-500/20 rounded-lg px-3 py-2 text-xs text-green-300 placeholder-slate-600 truncate flex items-center min-w-0">
                          <span className="truncate font-mono">
                            {state.selectedOutputFolder || "Source Folder (Deed fallback)"}
                          </span>
                        </div>
                        <button
                          onClick={handleBrowseOutputFolder}
                          className="px-3 py-2 bg-black hover:bg-slate-900 border border-slate-700 rounded text-2xs text-slate-300 transition-all font-mono hover:text-white shrink-0"
                        >
                          Select Folder...
                        </button>
                        {state.selectedOutputFolder && (
                          <button
                            onClick={() => {
                              setState((prev) => ({ ...prev, selectedOutputFolder: "" }));
                              setOutputFolderVerification("idle");
                            }}
                            className="px-2 py-2 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-800/30 text-rose-400 rounded text-2xs transition-all font-mono shrink-0"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans italic leading-relaxed block">
                        Select an alternate destination folder for written stems. Unassigned defaults automatically to
                        directory of processing audio track inputs.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase text-purple-400 font-bold block">
                      Environmental Decoupled Paths
                    </span>

                    <div className="p-2.5 bg-black/35 border border-purple-500/10 rounded space-y-2 text-2xs text-[#9c72f7]">
                      <div className="space-y-2">
                        <div className="flex justify-between gap-2">
                          <span>FFmpeg executable path:</span>
                          <span
                            className="font-bold text-slate-400 truncate max-w-[55%]"
                            title={state.customFFmpegPath || "PATH discovery"}
                          >
                            {state.customFFmpegPath ? state.customFFmpegPath : "PATH discovery"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleBrowseFFmpegPath}
                            className="px-2 py-1 bg-black hover:bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-300 transition-all font-mono hover:text-white"
                          >
                            Select FFmpeg Executable
                          </button>
                          {state.customFFmpegPath && (
                            <button
                              type="button"
                              onClick={() => {
                                setState((prev) => ({ ...prev, customFFmpegPath: "" }));
                                safeWriteCustomFFmpegPath("");
                              }}
                              className="px-2 py-1 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-800/30 text-rose-400 rounded text-[9px] transition-all font-mono"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-500 italic leading-normal font-sans pt-0.5">
                          FFmpeg may be installed on PATH or selected locally. OpenStem does not bundle FFmpeg in this
                          build; FFmpeg readiness is not model proof.
                        </div>
                      </div>
                      <div className="border-t border-white/5 pt-1.5">
                        <span>Model cache folder: </span>
                        <span className="text-slate-500 font-bold">System Default (~/.audio-separator)</span>
                        <span className="block text-[8px] text-slate-500 italic mt-0.5">
                          UVR5 Reference / Not wired
                        </span>
                      </div>
                      <div className="border-t border-white/5 pt-1.5">
                        <span>Temporary directories: </span>
                        <span className="text-slate-500 font-bold">In-process system temp lock</span>
                        <span className="block text-[8px] text-slate-500 italic">UVR5 Reference / Not wired</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 10: Logging and Troubleshooting */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(9)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3 opacity-80 hover:opacity-100"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <TerminalSquare className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wider font-mono">
                  10. Logging and Troubleshooting
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-[#291740]/40 text-purple-400 border border-purple-500/20">
                  Reference
                </span>
              </div>
              {expanded[9] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[9] && (
              <div className="p-4 border-t border-white/5 text-xs text-purple-400 font-mono space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap text-slate-200">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 10 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec10" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec10"
                  text="Help: Diagnostic logging configurations are Legacy UVR5 Reference / Not wired and not active. Standard logs and dumps are delegated to active host systems."
                />
                <span className="text-[10px] uppercase font-bold text-purple-400 block pb-1 border-b border-purple-500/10 opacity-65 cursor-not-allowed">
                  Legacy Diagnostics Suite [Not active]
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      • Active Logger State: Disabled{" "}
                      <span className="block text-[8px] text-slate-500 italic">UVR5 Reference / Not wired</span>
                    </div>
                    <div>
                      • Clean Logs Schedule: 7 Days{" "}
                      <span className="block text-[8px] text-slate-500 italic">UVR5 Reference / Not wired</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <button
                      disabled
                      className="w-full py-1.5 px-3 bg-[#1d0e33] border border-purple-500/20 rounded text-center text-purple-400 hover:text-purple-300 text-[10px] cursor-not-allowed select-none"
                    >
                      Export Detailed Diagnostic dump
                    </button>
                    <button
                      disabled
                      className="w-full py-1.5 px-3 bg-[#1d0e33] border border-purple-500/20 rounded text-center text-purple-400 hover:text-purple-300 text-[10px] cursor-not-allowed select-none"
                    >
                      Copy Host StdErr Console Errors
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 11: Reset and Safety Controls */}
          <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
            <button
              onClick={() => toggleSection(10)}
              className="w-full flex items-center justify-between p-4 bg-black/35 hover:bg-black/50 transition-colors text-left gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Shield className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  11. Reset and Safety Controls
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono leading-none font-bold bg-[#431418]/40 text-rose-400 border border-rose-500/20">
                  Wired Actions
                </span>
              </div>
              {expanded[10] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded[10] && (
              <div className="p-4 border-t border-white/5 space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase text-slate-500">Section 11 Help Controls</span>
                  <HelpToggle sectionId="global_settings_sec11" label="Section Help" className="px-2 py-0.5" />
                </div>
                <HelpText
                  sectionId="global_settings_sec11"
                  text="Help: Standard flush procedures wipe temporary directories and clear cached data structures. Standard local preferences can be reset safely to native defaults."
                />
                <p className="text-[11px] font-sans text-slate-400 leading-relaxed max-w-2xl whitespace-normal break-words">
                  Destructive operations require explicit local confirmations. Executing standard flushes cleans
                  isolated temporary files and clears corrupt download caches safely.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <button
                    onClick={() => setModalType("clear_temp")}
                    className="py-2.5 px-3 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold uppercase transition-all"
                  >
                    Clear Temp Files
                  </button>
                  <button
                    onClick={() => setModalType("clear_failed")}
                    className="py-2.5 px-3 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold uppercase transition-all"
                  >
                    Clean Failed Downloads
                  </button>
                  <button
                    onClick={() => setModalType("reset_cache")}
                    className="py-2.5 px-3 rounded bg-[#351515] hover:bg-[#4d1919] border border-rose-500/30 text-rose-300 font-bold uppercase transition-all"
                  >
                    Flush Weights Cache
                  </button>
                  <button
                    onClick={() => setModalType("reset")}
                    className="py-2.5 px-3 rounded bg-rose-950/40 hover:bg-rose-900/50 border border-rose-600/50 text-rose-200 font-bold uppercase transition-all"
                  >
                    Reset Global Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Staged Changes preview card */}
        {stagedChanges.length > 0 && (
          <div className="mt-6 p-4 rounded-xl border border-purple-500/30 bg-purple-950/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 font-mono">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Staged Preferences Preview ({stagedChanges.length} modified settings)</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
              {stagedChanges.map((change, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 bg-black/40 p-1.5 rounded border border-white/5 truncate"
                  title={change}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
                  <span className="truncate">{change}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Master save button */}
        <div className="mt-8 pt-5 border-t border-green-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-2xs text-slate-400 font-sans italic whitespace-normal max-w-sm sm:max-w-md">
            Global defaults apply to newly initialized jobs unless the user manually overrides the current job settings.
            Doing so prevents unexpectedly overwriting an active job, active processing state, or per-job selections
            already made in the console. Preferences are stored in local app storage using the Electron/browser
            localStorage keys <code className="text-emerald-400 font-mono">uvr6_saved_app_state</code> (for
            dropdownSettings and checkboxSettings), <code className="text-emerald-400 font-mono">customPythonPath</code>
            , and <code className="text-emerald-400 font-mono">customFFmpegPath</code>.
          </div>
          <button
            onClick={saveGlobalPreferences}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)] shrink-0"
          >
            <Save className="w-4 h-4 shrink-0" />
            Save Global Preferences
          </button>
        </div>
      </div>

      {/* CONFIRMATION OVERLAY MODALS */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="p-6 rounded-2xl bg-[#0b0f19] border border-slate-800 shadow-2xl max-w-md w-full relative space-y-4 text-slate-200 font-sans leading-relaxed">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-slate-100 uppercase font-display">
                  {modalType === "reset" && "Confirm Reset Global Preferences"}
                  {modalType === "restore_safe" && "Confirm Restore Safe Defaults"}
                  {modalType === "clear_temp" && "Clear Temporary Stems"}
                  {modalType === "clear_failed" && "Clean Stalled Transfers"}
                  {modalType === "reset_cache" && "Flush Weight Registry Cache"}
                  {modalType === "import_export" && "Configuration Import/Export Portal"}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 whitespace-normal break-words leading-relaxed">
                  {modalType === "reset" &&
                    "This process will flush all written local state preferences, cache flags, paths configuration, and parameters back to factory values immediately."}
                  {modalType === "restore_safe" &&
                    "This action restores conservative CPU defaults and disables automatic weight downloads. It reduces common third party execution issues without proving backend readiness."}
                  {modalType === "clear_temp" &&
                    "Are you sure you want to flush local cached temporary vocal and instrumental separator stems? This acts as a physical cleanup of isolated directories."}
                  {modalType === "clear_failed" &&
                    "Instantly cancels and purges incomplete or corrupted download segments from local registers."}
                  {modalType === "reset_cache" &&
                    "Cleans and resets any stored verification checksum states in the model registry cache."}
                  {modalType === "import_export" &&
                    "Review or import global preferences JSON configuration map below. Copy and paste direct JSON properties safely."}
                </p>
              </div>
            </div>

            {/* Content area based on Modal */}
            {modalType === "import_export" && (
              <div className="space-y-3">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-44 bg-black/60 border border-slate-700/60 rounded p-2.5 font-mono text-[10px] text-slate-300 focus:outline-none"
                  placeholder="Paste JSON settings map output here..."
                />
                <div className="text-[10px] font-mono text-slate-400 italic">
                  * Note: Only format-validated JSON matching correct schemas can be synced.
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2 text-xs font-mono">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded bg-black/40 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>

              {modalType === "reset" && (
                <button
                  onClick={handleHardReset}
                  className="px-4 py-2 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500 text-rose-200 font-bold"
                >
                  Reset Global Preferences
                </button>
              )}
              {modalType === "restore_safe" && (
                <button
                  onClick={handleRestoreSafeDefaults}
                  className="px-4 py-2 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500 text-emerald-200 font-bold"
                >
                  Restore Safe Defaults
                </button>
              )}
              {modalType === "clear_temp" && (
                <button
                  onClick={handleClearTempFiles}
                  className="px-4 py-2 rounded bg-amber-950 hover:bg-amber-900 border border-amber-600 text-amber-200 font-bold"
                >
                  Confirm cleanup
                </button>
              )}
              {modalType === "clear_failed" && (
                <button
                  onClick={handleClearFailedDownloads}
                  className="px-4 py-2 rounded bg-amber-950 hover:bg-amber-900 border border-amber-600 text-amber-200 font-bold"
                >
                  Clean transfer registers
                </button>
              )}
              {modalType === "reset_cache" && (
                <button
                  onClick={handleResetWeightsCache}
                  className="px-4 py-2 rounded bg-rose-950 hover:bg-rose-900 border border-rose-600 text-rose-200 font-bold"
                >
                  Reset Checksums
                </button>
              )}
              {modalType === "import_export" && (
                <button
                  onClick={handleImportSettings}
                  className="px-4 py-2 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500 text-emerald-200 font-bold"
                >
                  Import Map
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
