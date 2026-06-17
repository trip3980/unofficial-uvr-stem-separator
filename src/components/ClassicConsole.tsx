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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FourTrackMixer from "./FourTrackMixer";
import InteractiveTooltip from "./InteractiveTooltip";

// Import our decoupled types & engines (Rule 20)
import {
  PROCESS_METHODS,
  MODEL_REGISTRY,
  SETTINGS_SCHEMAS,
  buildOutputNames,
  validateState,
  getAdapterForModel,
} from "../services/audioEngine";
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
 * - Abort controllers / SIGKILL simulated hooks (Rule 13)
 * - Dynamic schemas inside Advanced settings drawers (Rule 18)
 * - Fork-specific technical inline reviews (Rule 19)
 */

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
  const [showTooltips, setShowTooltips] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ffmpegStatus, setFfmpegStatus] = useState<
    "not_checked" | "ready" | "missing"
  >("not_checked");
  const [modelFileStatus, setModelFileStatus] = useState<
    "not_checked" | "download_needed" | "ready"
  >("not_checked");
  const [backendStatus, setBackendStatus] = useState<
    "not_checked" | "ready" | "missing_env"
  >("not_checked");

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

  // Local helper states
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showStopHaltAlert, setShowStopHaltAlert] = useState(false);

  // Custom repo settings (Rule 17/18)
  const [customRepoUrl, setCustomRepoUrl] = useState(
    "https://huggingface.co/models/uvr-community-extensions",
  );
  const [sha256Strict, setSha256Strict] = useState(true);
  const [conserveVram, setConserveVram] = useState(true);
  const [doubleQuotePaths, setDoubleQuotePaths] = useState(true);

  // Model download simulation states
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

  // Interval memory reference to allow secure SIGKILL halting
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
      method: activeMethodOpt,
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
    appState.outputFormat,
    appState.checkboxSettings,
  ]);

  // --- 2. THE STRICT PRECONDITIONS VALIDATION SYSTEM (Rule 8 & 9) ---
  const handleStartProcess = () => {
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
          `[error] PRECONDIITON BLOCKED! Validation failed with following issues:`,
          ...validationErrors.map(
            (e) => `  -> Error field: [${e.field}] message: "${e.message}"`,
          ),
          `[error] Separation aborted. Correct setting parameters to release lock.`,
        ],
      }));
      setSimulationLog([
        `[error] BLOCKED: Precondition validation failed!`,
        ...validationErrors.map((e) => `✖ ${e.message}`),
      ]);
      return;
    }

    // Check if selected model is downloaded (Rule 17)
    if (!activeModel.downloaded) {
      setAppState((prev) => ({
        ...prev,
        processingStatus: "error",
        consoleLogs: [
          `[preflight-diag] BLOCKED! Selected weight file "${activeModel.name}" is not cached local.`,
          `[preflight-diag] Please click the download button (+ Click to Cache) first.`,
        ],
      }));
      setSimulationLog([
        `[error] BLOCKED: Model weights not found in sandbox cache folder.`,
        `✖ Active model "${activeModel.name}" must be downloaded to disk.`,
      ]);
      return;
    }

    // Build processing request object (Rule 4)
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
      method: activeMethodOpt,
      parameters: appState.dropdownSettings,
      options: {
        ttaActive: appState.checkboxSettings.ttaActive,
        postProcessActive: appState.checkboxSettings.postProcessActive,
        vocalsOnly: appState.checkboxSettings.saveVocalsOnly,
        instrumentalOnly: appState.checkboxSettings.saveInstrumentalOnly,
        splitMode: appState.checkboxSettings.splitMode,
        saveAllOutputs: appState.checkboxSettings.saveAllOutputs,
        modelTestMode: appState.checkboxSettings.modelTestMode,
      },
      timestamp: new Date().toISOString(),
    };

    // Serialize request in terminal to satisfy Rule 4 ("UI only produces request object")
    const serializedRequest = JSON.stringify(procRequest, null, 2);

    setAppState((prev) => ({
      ...prev,
      processingStatus: "validating",
      consoleLogs: [
        `[app-preflight] Formulated secure JSON job schema request.`,
        `[audio_engine] Created serialized processing_request:`,
        serializedRequest,
        ...prev.consoleLogs,
      ],
    }));

    // Cascade simulation validation steps
    setSimulationLog([
      `[diagnostics] Initializing preflight checklist...`,
      `[diagnostics] Spawning platform integrity checks...`,
    ]);

    setTimeout(() => {
      setFfmpegStatus("ready");
      setSimulationLog((prev) => [
        ...prev,
        `[ffmpeg] OK: Resolved static binary bin/ffmpeg.exe. Static codec support active.`,
      ]);
    }, 400);

    setTimeout(() => {
      setModelFileStatus("ready");
      setSimulationLog((prev) => [
        ...prev,
        `[model_integrity] OK: Checked SHA-256 integrity signature of [${activeModel.name}]. Matches registered hash: "${activeModel.id}"`,
      ]);
    }, 800);

    setTimeout(() => {
      setBackendStatus("ready");
      setSimulationLog((prev) => [
        ...prev,
        `[backend_adapter] OK: Hardware environment context resolved. Target device: [${appState.dropdownSettings.executionDevice.toUpperCase()}].`,
        `[preflight] -- INTEGRITY GATES CLEARED --`,
        `[preflight] Opening execution confirmation dispatch.`,
      ]);
      setShowConfirmModal(true);
    }, 1200);
  };

  // Dispatch CLI commands using backend adapters (Rule 6)
  const handleExecuteSeparation = () => {
    setShowConfirmModal(false);
    setIsSimulating(true);
    setSimProgress(0);

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
      method: activeMethodOpt,
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

    setSimulationLog((prev) => [
      ...prev,
      `[adapter] Routing weight targets to ${adapter.id}`,
      `[command] ${generatedCLI}`,
    ]);

    // Simulated step progression with delayed stream updates (Rule 12)
    let currentPct = 0;

    // Simulate output file format codecs logs (Rule 14)
    let formatCodecLog = "";
    if (procRequest.format === "WAV")
      formatCodecLog = "Linear PCM uncompressed multiplex channels";
    if (procRequest.format === "FLAC")
      formatCodecLog =
        "Free Lossless Audio Codec (Compression level 5, 24-bit PCM)";
    if (procRequest.format === "MP3")
      formatCodecLog =
        "LAME MP3 Joint-Stereo variable bit rate 320kbps encoder active";

    const logFeed = [
      `[codec_encoder] Configuring output layout as: ${procRequest.format} (${formatCodecLog})`,
      `[processor] Thread-Count limit bounds mapped: ${procRequest.parameters.cpuThreads} Cores.`,
      `[mem_alloc] VRAM conservancy switch active: Slicing matrices dynamically to prevent device crash.`,
    ];

    setTimeout(() => {
      setSimulationLog((current) => [...current, ...logFeed]);
    }, 400);

    // Dynamic steps loop
    const logEmitterInterval = setInterval(() => {
      currentPct += Math.min(
        100 - currentPct,
        Math.floor(Math.random() * 12) + 6,
      );
      setSimProgress(currentPct);

      if (currentPct >= 100) {
        clearInterval(logEmitterInterval);
        setIsSimulating(false);
        setAppState((prev) => ({
          ...prev,
          processingStatus: "completed",
          progress: 100,
          consoleLogs: [
            `[adapter] Subprocess completed with Exit Code: 0 (Successful separation).`,
            `-- JOB SUCCESSFUL --`,
            ...prev.consoleLogs,
          ],
        }));
        setSimulationLog((current) => [
          ...current,
          `[adapter] Parsing output streams into safe workspace target folder.`,
          ...predictedOutputNames.map(
            (f) => `  ---> Output compiled successfully: "${f}"`,
          ),
          `[execution] completed separation! All stems written.`,
          `-- JOB SUCCESSFUL --`,
        ]);
        return;
      }

      // Continuous telemetry progress logging
      const randomNoise = Math.random();
      let streamLine = `[progress] Model run grid frame calculation fraction... ${currentPct}%`;
      if (randomNoise < 0.25) {
        streamLine = `[telemetry] Processing attention weights... Memory: 2.1 GB | VRAM: 3.4 GB | CPU Core Load: 74%`;
      } else if (randomNoise < 0.5) {
        streamLine = `[dsp_loop] Slicing waveform spectrum channels... [${currentPct}%]`;
      } else if (randomNoise < 0.75) {
        streamLine = `[audio_separator] Completed segment transformation. Storing transient wave caches.`;
      }

      setSimulationLog((current) => [...current, streamLine]);
    }, 500);

    activeIntervalRef.current = logEmitterInterval;
  };

  // --- 3. CONFIRMED PROCESSING SHUTDOWN SWITCHS (Rule 13) ---
  const handleHaltJobConfirm = () => {
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
        `[halt] -- TERMINATE INSTRUCTION DISPATCHED --`,
        `[halt] Sent SIGKILL stream to daemon subprocess worker. Thread PID killed.`,
        `[filesystem] Ran automatic temp folder wipeout check to reclaim cached sectors.`,
        ...prev.consoleLogs,
      ],
    }));

    setSimulationLog((current) => [
      ...current,
      `[halt] -- ABORTED PROCESS --`,
      `[halt] SENT SIGKILL DISPATCH TO PROCESS BUFFER. Active subprocess terminated.`,
      `[filesystem] Swept temporary chunk caches successfully.`,
    ]);
  };

  // --- 4. DYNAMIC WEIGHT DOWNLOADING SIMULATION (Rule 17) ---
  const handleTriggerModelDownload = (modelId: string) => {
    setDownloadingModelId(modelId);
    setDownloadProgress(0);

    const targetModel = modelRegistryState.find((m) => m.id === modelId);
    if (!targetModel) return;

    setSimulationLog((current) => [
      ...current,
      `[model_downloader] Queued download request for weight: "${targetModel.name}"`,
      `[model_downloader] Target server: https://huggingface.co/models/uvr-community-extensions`,
    ]);

    let pct = 0;
    const dlInterval = setInterval(() => {
      pct += Math.floor(Math.random() * 15) + 12;
      if (pct >= 100) {
        clearInterval(dlInterval);

        // Verified checksums matching integrity logic (Rule 11)
        setTimeout(() => {
          setModelRegistryState((currentList) =>
            currentList.map((m) =>
              m.id === modelId ? { ...m, downloaded: true } : m,
            ),
          );
          setDownloadingModelId(null);
          setSimulationLog((current) => [
            ...current,
            `[model_downloader] Completed download of "${targetModel.name}" (${targetModel.fileSize})`,
            `[model_downloader] Verified integrity checksum: Valid SHA-256 signature calculated.`,
            `[model_downloader] Model registered as local-available.`,
          ]);
        }, 600);
      } else {
        setDownloadProgress(pct);
      }
    }, 180);
  };

  const handleCustomAddInputTrack = () => {
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
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold text-center absolute left-1/2 -translate-x-1/2">
                UVR Stem Separator Processor
              </span>
              <div className="flex gap-3 justify-end items-center w-[140px]">
                <button
                  onClick={() => setShowTooltips(!showTooltips)}
                  title="Toggle Help Tooltips"
                  className={`text-[9px] font-mono font-bold flex items-center gap-1 px-1.5 py-0.5 rounded transition cursor-pointer select-none ${showTooltips ? "text-indigo-300 bg-indigo-500/20" : "text-slate-500 hover:text-slate-300 bg-white/5"}`}
                >
                  <HelpCircle className="w-3 h-3" />
                  {showTooltips ? "HELP ON" : "HELP OFF"}
                </button>
                <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/40">
                  v6.0.0-Beta
                </span>
              </div>
            </div>

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
                          Simulate File Browser Choose...
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
                      onClick={() =>
                        setAppState((prev) => ({
                          ...prev,
                          selectedOutputFolder:
                            "E:\\Target_Bounces\\Master_Stems\\",
                        }))
                      }
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
                              Fetch Cache
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
                  <InteractiveTooltip
                    enabled={showTooltips}
                    content="GPU Conversion - When checked, the application will attempt to use your GPU (if you have one). If you do not have a GPU but have this checked, the application will default to your CPU."
                  >
                    <label className="flex items-center gap-2.5 select-none cursor-help text-slate-300 hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={
                          appState.dropdownSettings.executionDevice === "cuda"
                        }
                        onChange={(e) =>
                          setAppState((prev) => ({
                            ...prev,
                            dropdownSettings: {
                              ...prev.dropdownSettings,
                              executionDevice: e.target.checked
                                ? "cuda"
                                : "cpu",
                            },
                          }))
                        }
                        className="w-4 h-4 rounded border-slate-600 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>GPU Acceleration Conversion</span>
                    </label>
                  </InteractiveTooltip>

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

              {/* UNIFIED LAUNCHER BOTTOM ROW */}
              <div className="flex flex-wrap sm:flex-nowrap gap-4 items-center pt-2 w-full">
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
                  <motion.button
                    whileHover={isSimulating ? {} : { scale: 1.01 }}
                    whileTap={isSimulating ? {} : { scale: 0.99 }}
                    onClick={handleStartProcess}
                    disabled={isSimulating}
                    className={`flex-grow h-12 rounded-xl text-xs font-semibold tracking-wider transition-all duration-300 cursor-help shadow-lg flex items-center justify-center gap-2.5 focus:outline-none w-full
                      ${
                        isSimulating
                          ? "bg-blue-950/20 text-blue-400 border border-blue-500/20 cursor-not-allowed shadow-none"
                          : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 border border-blue-400/20 text-white shadow-blue-950/40"
                      }`}
                  >
                    {isSimulating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Separation Subprocess in Progress...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-blue-100 fill-current" />
                        Run Audio Separation
                      </>
                    )}
                  </motion.button>
                </InteractiveTooltip>

                {/* secure SIGKILL emergency cancellation (Rule 13) */}
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
                        UVR-6 Separation Terminal Console Feed
                      </span>
                    </InteractiveTooltip>
                    <span className="flex items-center gap-1.5 text-[8px] text-green-400 font-normal opacity-80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse drop-shadow-[0_0_5px_rgba(16,185,129,1)]"></span>
                      SYSTEM ONLINE
                    </span>
                  </div>

                  {simulationLog.length === 0 ? (
                    <div className="text-green-500/40 italic py-4 text-center font-sans text-xs">
                      No logs mapped in memory. Select input wave queues and
                      click "Run Audio Separation".
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
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#12162a] to-[#0a0c16] border border-glass-border shadow-2xl relative overflow-hidden space-y-4">
            <div className="absolute top-[-30%] right-[-20%] w-[50%] h-[50%] bg-[#06b6d4]/10 rounded-full blur-2xl pointer-events-none"></div>

            <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 font-display uppercase tracking-widest border-b border-white/5 pb-2.5">
              <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
              Windows Standard Specs
            </h4>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-black/45 border border-white/5">
                <span className="text-[10px] font-mono text-indigo-300 font-bold block mb-1">
                  Local Standalone Package NSIS
                </span>
                <p className="text-slate-400 leading-relaxed text-[11px] font-sans">
                  Designed for compilation into a clean desktop package
                  installer (under 60MB base size) using NSIS setups. Weight
                  files are fetched dynamically to a secure separate directory
                  target.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-black/45 border border-white/5">
                <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-1">
                  Dynamic Configuration Repos
                </span>
                <p className="text-slate-400 leading-relaxed text-[11px] font-sans">
                  Register custom `.onnx / .pth` models immediately without
                  rewriting the React components or modifying underlying
                  compiler adapter scripts.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-black/45 border border-white/5">
                <span className="text-[10px] font-mono text-emerald-400 font-bold block mb-1">
                  FFmpeg Isolated Engine
                </span>
                <p className="text-slate-400 leading-relaxed text-[11px] font-sans">
                  Auto-discovers static paths strictly bypassing global OS
                  workspace paths variables. Safely slice temporary wave file
                  structures without performance overhead.
                </p>
              </div>
            </div>
          </div>

          {/* System status stats panel */}
          <div className="p-5.5 rounded-2xl bg-[#090b14] border border-[#1a1f38] shadow-glass-shadow shadow-glass-inset space-y-4">
            <h4 className="text-xs uppercase font-bold text-slate-300 font-mono tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
              Environment Specs Monitor
            </h4>

            <div className="space-y-3 font-mono text-[11px]">
              <div className="p-2.5 bg-black/40 rounded-lg border border-[#ffffff]/5 flex items-center justify-between">
                <span className="text-slate-400 uppercase font-bold text-[10px]">
                  Active OS Target
                </span>
                <span className="font-bold text-indigo-400">
                  Windows 11 x64
                </span>
              </div>

              <div className="p-2.5 bg-black/40 rounded-lg border border-[#ffffff]/5 flex items-center justify-between">
                <span className="text-slate-400 uppercase font-bold text-[10px]">
                  GPU Acceleration Context
                </span>
                <span
                  className={`font-bold uppercase ${appState.dropdownSettings.executionDevice === "cpu" ? "text-slate-500" : "text-emerald-400 font-extrabold"}`}
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
            </div>
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
                                `Dynamic repository endpoint registered! Weights loaded successfully without restarting interface.`,
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
                      You are requesting to immediately terminate the background
                      vocal remover engine thread execution. Subprocesses will
                      receive a SIGKILL interrupt, halting channel splitting and
                      flushing GPU core allocations.
                    </p>

                    <div className="bg-black/35 p-3.5 rounded-lg border border-white/5 text-[11px] text-slate-400 leading-relaxed font-mono">
                      ✖ Active Spun PID: <code>PID_8102 (audio-separator)</code>
                      <br />✖ Temp Cache State:{" "}
                      <code>C:\\Temp\\_split_cache*.tmp</code> (To sweep
                      filesystem traces securely)
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
                        Yes, SIGKILL Thread
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
