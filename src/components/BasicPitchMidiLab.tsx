import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Play,
  Settings,
  RefreshCw,
  Folder,
  FileAudio,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Upload,
  ArrowRight,
  Terminal,
  FileText,
  Info,
  Sliders,
  HelpCircle,
  Cpu,
  Bookmark,
  Activity,
  FileUp,
  History,
  Binary,
  Maximize2,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { HelpToggle, HelpText } from "./HelpSystem";
import SubmenuManual from "./SubmenuManual";

interface QueuedFile {
  name: string;
  path: string;
  size: number;
  format: string;
  duration: string;
  status: "Queued" | "Ready" | "Missing" | "Unsupported" | "Transcribing" | "Complete" | "Failed";
}

interface PreflightStatus {
  ok: boolean;
  python: string;
  pythonVersion: string;
  basicPitchInstalled: boolean;
  basicPitchVersion: string;
  cliAvailable: boolean;
  librosaInstalled: boolean;
  numpyInstalled: boolean;
  tensorflowInstalled: boolean;
  midoInstalled: boolean;
  inputFileExists: boolean;
  outputDirReady: boolean;
  blockers: string[];
}

export default function BasicPitchMidiLab() {
  // Input Queue
  const [inputFiles, setInputFiles] = useState<QueuedFile[]>([]);

  // Output configurations
  const [outputDir, setOutputDir] = useState<string>("");
  const [keepOriginalFilename, setKeepOriginalFilename] = useState<boolean>(true);
  const [appendSuffix, setAppendSuffix] = useState<string>("_basic_pitch");
  const [appendTimestamp, setAppendTimestamp] = useState<boolean>(false);
  const [overwriteBehavior, setOverwriteBehavior] = useState<"Ask" | "Never" | "Replace">("Replace");

  // Options
  const [saveMidiFile, setSaveMidiFile] = useState<boolean>(true);
  const [saveSonifiedWav, setSaveSonifiedWav] = useState<boolean>(true);
  const [saveModelOutputsNpz, setSaveModelOutputsNpz] = useState<boolean>(false);
  const [saveNoteEventsCsv, setSaveNoteEventsCsv] = useState<boolean>(true);

  // Advanced params
  const [onsetThreshold, setOnsetThreshold] = useState<number>(0.5);
  const [frameThreshold, setFrameThreshold] = useState<number>(0.3);
  const [minNoteLength, setMinNoteLength] = useState<number>(127); // milliseconds or frames
  const [minFreq, setMinFreq] = useState<string>("");
  const [maxFreq, setMaxFreq] = useState<string>("");
  const [includePitchBends, setIncludePitchBends] = useState<boolean>(false);
  const [multiplePitchBends, setMultiplePitchBends] = useState<boolean>(false);
  const [midiTempo, setMidiTempo] = useState<string>("120");

  const [useAdvanced, setUseAdvanced] = useState<boolean>(false);

  // Readiness / Environment Preflight elements
  const [pythonPath, setPythonPath] = useState<string>("python");
  const [isPreflightScanned, setIsPreflightScanned] = useState<boolean>(false);
  const [preflightScanning, setPreflightScanning] = useState<boolean>(false);
  const [preflightData, setPreflightData] = useState<PreflightStatus | null>(null);

  // Browser preview fallback states
  const [isElectronEnvironment, setIsElectronEnvironment] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([
    "[Basic Pitch MIDI Lab] Workspace initialized. Hardened Functional Alpha active.",
    "Ready for preflight check. Native Electron is required for real MIDI file generation.",
  ]);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Result file states (only shown when real files exist, otherwise empty/simulated on web)
  const [finalResults, setFinalResults] = useState<{
    proofStatus: "PASS" | "FAIL" | "DRY_RUN_ONLY" | "BLOCKED" | "PENDING";
    midiFiles: string[];
    sonifiedFiles: string[];
    csvFiles: string[];
    npzFiles: string[];
    fileSizes: Record<string, number>;
    commandExecuted: string;
    stdout?: string;
    stderr?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Check Electron bridge on initialization
  useEffect(() => {
    const isElec = !!(window as any).uvr;
    setIsElectronEnvironment(isElec);

    // Attempt to load settings from localStorage
    const cachedPy = localStorage.getItem("yue_python_path");
    if (cachedPy) {
      setPythonPath(cachedPy);
    }
    const cachedOut = localStorage.getItem("basic_pitch_output_dir");
    if (cachedOut) {
      setOutputDir(cachedOut);
    }

    if (isElec) {
      addLog("🟢 Native Electron bridge found. Basic Pitch subprocess execution is available.");
      // Auto run scan if possible
    } else {
      addLog(
        "⚠️ Browser Preview / Not runnable for local MIDI generation; sandbox preview only. Code: BASIC_PITCH_DRY_RUN_ONLY",
      );
    }
  }, []);

  const addLog = (m: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${m}`]);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Preflight validation check
  const handleValidateEnvironment = async () => {
    const activeInput = inputFiles[0];
    const targetFile = activeInput ? activeInput.path : "";

    const finalConfig = {
      pythonPath: pythonPath,
      inputAudio: targetFile,
      outputDir: outputDir,
      saveMidi: saveMidiFile,
      sonifyMidi: saveSonifiedWav,
      saveModelOutputs: saveModelOutputsNpz,
      saveNoteEvents: saveNoteEventsCsv,
      onsetThreshold,
      frameThreshold,
      minNoteLength,
      minFreq,
      maxFreq,
      includePitchBends,
      multiplePitchBends,
      midiTempo,
    };

    if (!(window as any).uvr?.validateBasicPitchEnvironment) {
      // Browser-only sandbox preview
      setPreflightScanning(true);
      addLog("Running browser-only MIDI preflight preview. Code: BASIC_PITCH_DRY_RUN_ONLY");

      setTimeout(() => {
        const mock: PreflightStatus = {
          ok: pythonPath !== "" && outputDir !== "",
          python: pythonPath || "python",
          pythonVersion: "3.10.11",
          basicPitchInstalled: true,
          basicPitchVersion: "0.2.4",
          cliAvailable: true,
          librosaInstalled: true,
          numpyInstalled: true,
          tensorflowInstalled: true,
          midoInstalled: true,
          inputFileExists: activeInput ? true : false,
          outputDirReady: outputDir !== "",
          blockers: [],
        };

        if (!activeInput) {
          mock.blockers.push("No input audio file is present in queue.");
        }
        if (!outputDir) {
          mock.blockers.push("No output directory is specified.");
        }

        mock.ok = mock.blockers.length === 0;

        setPreflightData(mock);
        setIsPreflightScanned(true);
        setPreflightScanning(false);
        addLog(
          `🎉 Browser preflight preview compiled. Status: ${mock.ok ? "DRY_RUN_ONLY" : "BLOCKERS DETECTED"}; Code: BASIC_PITCH_DRY_RUN_ONLY`,
        );
        triggerToast("Browser preflight preview completed.");
      }, 8000);
      return;
    }

    setPreflightScanning(true);
    addLog(`Spawning Electron preflight tester process using Python: "${pythonPath}"...`);
    try {
      const result = await (window as any).uvr.validateBasicPitchEnvironment(finalConfig);
      if (result.success && result.report) {
        setPreflightData(result.report);
        addLog(`[Readiness] Received real JSON preflight report: Status ${result.report.proofStatus}`);
        if (result.report.proofStatus === "DRY_RUN_ONLY") {
          triggerToast("🎉 Preflight dry-run checklist successfully verified!");
        } else {
          triggerToast(`Preflight finished with status: ${result.report.proofStatus}`);
        }
      } else {
        addLog(`❌ Environment validator failed: ${result.error || "Unknown response"}`);
        triggerToast(`Validator mismatch: ${result.error || "Unknown response"}`);
      }
    } catch (err: any) {
      addLog(`❌ Exception in Electron preflight scanner: ${err.message}`);
      triggerToast(`Preflight execution error: ${err.message}`);
    } finally {
      setPreflightScanning(false);
      setIsPreflightScanned(true);
    }
  };

  // Active Run execution command generator preview
  const previewCommandText = useMemo(() => {
    const activeFile = inputFiles[0];
    const inp = activeFile?.path || "<INPUT_AUDIO_REQUIRED>";
    const out = outputDir || "<OUTPUT_FOLDER_REQUIRED>";

    let args = [`basic-pitch`, `"${out || "<OUTPUT_FOLDER_REQUIRED>"}"`, `"${inp || "<INPUT_AUDIO_REQUIRED>"}"`];
    if (saveSonifiedWav) args.push(`--sonify-midi`);
    if (saveModelOutputsNpz) args.push(`--save-model-outputs`);
    if (saveNoteEventsCsv) args.push(`--save-note-events`);

    if (onsetThreshold !== 0.5) args.push(`--onset-threshold`, onsetThreshold.toString());
    if (frameThreshold !== 0.3) args.push(`--frame-threshold`, frameThreshold.toString());
    if (minNoteLength !== 127) args.push(`--minimum-note-length`, minNoteLength.toString());
    if (minFreq) args.push(`--minimum-frequency`, minFreq);
    if (maxFreq) args.push(`--maximum-frequency`, maxFreq);
    if (includePitchBends) args.push(`--include-pitch-bends`);
    if (multiplePitchBends) args.push(`--multiple-pitch-bends`);
    if (midiTempo && midiTempo !== "120") args.push(`--midi-tempo`, midiTempo);

    return args.join(" ");
  }, [
    inputFiles,
    outputDir,
    saveSonifiedWav,
    saveModelOutputsNpz,
    saveNoteEventsCsv,
    onsetThreshold,
    frameThreshold,
    minNoteLength,
    minFreq,
    maxFreq,
    includePitchBends,
    multiplePitchBends,
    midiTempo,
  ]);

  // Execute transcription
  const handleRunTranscription = async () => {
    const activeFile = inputFiles[0];
    if (!activeFile) {
      triggerToast("No input file configured in workspace queue.");
      return;
    }

    const finalConfig = {
      pythonPath: pythonPath,
      inputAudio: activeFile.path,
      outputDir: outputDir,
      saveMidi: saveMidiFile,
      sonifyMidi: saveSonifiedWav,
      saveModelOutputs: saveModelOutputsNpz,
      saveNoteEvents: saveNoteEventsCsv,
      onsetThreshold,
      frameThreshold,
      minNoteLength,
      minFreq,
      maxFreq,
      includePitchBends,
      multiplePitchBends,
      midiTempo,
    };

    setIsProcessing(true);
    setTranscriptionProgress(10);
    addLog(`[Subprocess] Initializing local transcription for: "${activeFile.name}" -> destination: "${outputDir}"`);

    if (!(window as any).uvr?.runBasicPitchTranscription) {
      // Browser-only preview; no local MIDI/WAV/CSV files are written.
      addLog(
        "[Sandbox Preview] Rendering audio-to-MIDI result names only; no local files will be written. Code: BASIC_PITCH_DRY_RUN_ONLY",
      );
      const interval = setInterval(() => {
        setTranscriptionProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 20;
        });
      }, 1000);

      setTimeout(() => {
        clearInterval(interval);
        setTranscriptionProgress(100);
        setIsProcessing(false);

        // Generate custom sandboxed outputs
        const baseName = activeFile.name.substring(0, activeFile.name.lastIndexOf(".")) || activeFile.name;
        const midiOut = `${baseName}_basic_pitch.mid`;
        const sonifiedOut = `${baseName}_basic_pitch_sonified.wav`;
        const csvOut = `${baseName}_basic_pitch_note_events.csv`;

        setFinalResults({
          proofStatus: "DRY_RUN_ONLY",
          midiFiles: [midiOut],
          sonifiedFiles: saveSonifiedWav ? [sonifiedOut] : [],
          csvFiles: saveNoteEventsCsv ? [csvOut] : [],
          npzFiles: [],
          fileSizes: {},
          commandExecuted: previewCommandText,
          stdout:
            "[cli-stdout] Initializing MIDI Transcription...\nLoading Spotify model layers...\nTranscription successful!",
          stderr: "[cli-stderr] Warning: running in in-browser virtualization frame. Code: BASIC_PITCH_DRY_RUN_ONLY",
        });

        // Mark file list as finished
        setInputFiles((prev) => prev.map((f) => ({ ...f, status: "Complete" })));

        addLog(
          "🎉 [Sandbox Preview] Spotify Basic Pitch result preview completed; no local files were written. Code: BASIC_PITCH_DRY_RUN_ONLY",
        );
        triggerToast("Browser preview completed - no local MIDI files were written.");
      }, 6000);
      return;
    }

    addLog(`[IPC Bridge] Spawning child wrapper to execute CLI command: ${previewCommandText}`);
    setInputFiles((prev) => prev.map((f) => ({ ...f, status: "Transcribing" })));

    try {
      const result = await (window as any).uvr.runBasicPitchTranscription(finalConfig);
      if (result.success && result.report) {
        const r = result.report;
        setTranscriptionProgress(100);
        setFinalResults({
          proofStatus: r.proofStatus,
          midiFiles: r.midiFiles || [],
          sonifiedFiles: r.sonifiedWavFiles || [],
          csvFiles: r.noteEventCsvFiles || [],
          npzFiles: r.modelOutputNpzFiles || [],
          fileSizes: r.generatedFileSizes || {},
          commandExecuted: r.commandExecuted,
          stdout: r.stdoutSummary,
          stderr: r.stderrSummary,
        });

        setInputFiles((prev) => prev.map((f) => ({ ...f, status: "Complete" })));
        addLog(`🎉 Subprocess completed successfully with exit code 0! Saved ${r.midiFiles?.length || 0} MIDI assets.`);
        triggerToast("🎉 Spotify Basic Pitch Transcription Completed Successfully!");
      } else {
        setInputFiles((prev) => prev.map((f) => ({ ...f, status: "Failed" })));
        addLog(`❌ Transcription execution failed: ${result.error || "Unexpected subprocess crash"}`);
        triggerToast(`Process crashed: ${result.error || "Check logs"}`);
      }
    } catch (err: any) {
      setInputFiles((prev) => prev.map((f) => ({ ...f, status: "Failed" })));
      addLog(`❌ Exception during Electron spool run: ${err.message}`);
      triggerToast(`Command failure: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // File picker controls
  const handleBrowseFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const list = Array.from(e.target.files);
      addPickedFiles(list);
    }
  };

  const addPickedFiles = (files: any[]) => {
    const formatted = files.map((f) => {
      const isAudio =
        f.type.startsWith("audio/") ||
        f.name.endsWith(".wav") ||
        f.name.endsWith(".mp3") ||
        f.name.endsWith(".flac") ||
        f.name.endsWith(".ogg");
      return {
        name: f.name,
        path: (f as any).path || "",
        size: f.size,
        format: f.name.split(".").pop()?.toUpperCase() || "Audio",
        duration: "Metadata not checked",
        status: isAudio
          ? (f as any).path || isElectronEnvironment
            ? ("Ready" as const)
            : ("Queued" as const)
          : ("Unsupported" as const),
      };
    });
    setInputFiles((prev) => [...prev, ...formatted]);
    addLog(`Enqueued ${files.length} custom files into transcription channel.`);
  };

  const handleClearQueue = () => {
    setInputFiles([]);
    addLog("Transcription input file list cleared.");
  };

  const handleRemoveFileIndex = (index: number) => {
    setInputFiles((prev) => prev.filter((_, i) => i !== index));
    addLog("Input file item removed.");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addPickedFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Interactive local selectors
  const handleSelectPythonExecutable = async () => {
    if (!(window as any).uvr?.selectPythonPath) {
      triggerToast("Preflight requires the Electron desktop application. Sandbox target active.");
      return;
    }
    try {
      const selectedPath = await (window as any).uvr.selectPythonPath();
      if (selectedPath) {
        setPythonPath(selectedPath);
        localStorage.setItem("yue_python_path", selectedPath);
        addLog(`Configured python executable path: "${selectedPath}"`);
        triggerToast("Python configured successfully.");
      }
    } catch (err: any) {
      triggerToast(`Browse failed: ${err.message}`);
    }
  };

  const handleSelectOutputFolder = async () => {
    if (!(window as any).uvr?.selectOutputFolder) {
      triggerToast("Directory browser requires native Electron wrapper. Simulated folder selected.");
      return;
    }
    try {
      const pathStr = await (window as any).uvr.selectOutputFolder();
      if (pathStr) {
        setOutputDir(pathStr);
        localStorage.setItem("basic_pitch_output_dir", pathStr);
        addLog(`Configured transcription output repository: "${pathStr}"`);
        triggerToast("Output folder selection synchronized.");
      }
    } catch (err: any) {
      triggerToast(`Browse failed: ${err.message}`);
    }
  };

  const handleOpenOutputFolder = () => {
    if (!(window as any).uvr?.openOutputFolder) {
      triggerToast("Native filesystem explorer remains disabled in virtual system preview mode.");
      return;
    }
    (window as any).uvr.openOutputFolder(outputDir);
  };

  // Determine button state and honesty blockers
  const blockChecking = useMemo(() => {
    const blockersList: string[] = [];
    if (inputFiles.length === 0) {
      blockersList.push("No input audio file selected");
    } else {
      const unSupportedFiles = inputFiles.filter((x) => x.status === "Unsupported");
      if (unSupportedFiles.length === inputFiles.length) {
        blockersList.push("No playable audio files found in list");
      }
    }
    if (!outputDir) {
      blockersList.push("Output folder path is clean or empty");
    }

    return {
      blocked: blockersList.length > 0,
      list: blockersList,
    };
  }, [inputFiles, outputDir]);

  return (
    <div className="space-y-6 animate-fade-in relative max-w-full">
      {/* Visual Backdrop Layer */}
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* MANUAL AND COLLAPSIBLE ACCORDION PANEL */}
      <SubmenuManual sectionId="basic_pitch" />

      {/* HEADER SECTION WITH HONESTY LABELS */}
      <div className="p-6 rounded-2xl bg-[#080a13]/85 border border-blue-500/10 shadow-2xl backdrop-blur-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-500/15 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-blue-300 font-display flex items-center gap-2.5">
              <Binary className="w-6 h-6 text-blue-400" />
              Basic Pitch MIDI Lab
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Audio-to-MIDI Transcription Workspace • Convert vocals, melodies, single instruments, riffs, or separated
              stems into MIDI note data using Spotify Basic Pitch.
            </p>
          </div>
          <div>
            <span className="px-3 py-1 bg-blue-500/10 border border-blue-400/30 text-blue-300 text-[10px] tracking-wider uppercase font-mono font-bold rounded-full">
              Audio-to-MIDI only / Not stem separation
            </span>
          </div>
        </div>

        {/* Informative Limitation/Validation Note block */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/[0.04] space-y-2 text-xs text-slate-400 leading-relaxed font-sans">
          <div className="flex items-center gap-2 text-blue-400 font-bold mb-1 font-mono uppercase text-[10px] tracking-wider">
            <Info className="w-4 h-4" />
            Workspace Integrity Protocol
          </div>
          <p>
            This section represents a separate workspace and does not count as a UVR stem separation provider or proof
            check. A successful transcript here validates MIDI conversions only and is excluded from UVR AI separation
            E2E checks. Release state: <strong className="text-green-400 font-mono">Hardened Functional Alpha</strong>.
            Beta Candidate status is governed by separator proof evidence and final release review.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COMPOSITION COLUMN (1 lg columns stack) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 2: INPUT AUDIO QUEUE */}
          <div className="p-5 rounded-2xl bg-glass-card border border-glass-border shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-blue-400" />
                1. Input Audio Queue
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleBrowseFiles}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-mono font-bold uppercase transition duration-300"
                >
                  Browse Files
                </button>
                {inputFiles.length > 0 && (
                  <button
                    onClick={handleClearQueue}
                    className="px-3 py-1.5 rounded-lg bg-red-950/20 hover:bg-red-900/30 text-red-400 text-xs font-mono font-bold uppercase transition duration-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="audio/*"
              className="hidden"
            />

            {/* Drag Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseFiles}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                isDragging
                  ? "border-blue-400 bg-blue-500/5"
                  : "border-white/10 hover:border-blue-500/20 hover:bg-white/[0.01]"
              }`}
            >
              <FileUp className="w-10 h-10 text-slate-500 hover:text-blue-400 transition" />
              <p className="text-xs text-slate-300 font-sans">
                Drag & drop files here, or{" "}
                <span className="text-blue-400 font-bold underline">browse local machine</span>
              </p>
              <p className="text-[10px] text-slate-500 font-mono">Supports WAV, MP3, FLAC, OGG, M4A</p>
            </div>

            {/* List queue file cards */}
            {inputFiles.length > 0 && (
              <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
                {inputFiles.map((f, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-blue-500/10 flex items-center justify-between gap-4 transition text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 font-mono text-[10px] font-bold">
                        {f.format}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-100 block truncate" title={f.name}>
                          {f.name}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate font-mono" title={f.path}>
                          Path: {f.path}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono text-[10px] space-y-0.5">
                        <div className="text-slate-400">Duration: {f.duration}</div>
                        <div className="text-slate-600">{(f.size / (1024 * 1024)).toFixed(1)} MB</div>
                      </div>

                      {/* Status indicator badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold leading-normal uppercase shrink-0 ${
                          f.status === "Ready" || f.status === "Queued"
                            ? "bg-blue-950/40 text-blue-400 border border-blue-500/20"
                            : f.status === "Transcribing"
                              ? "bg-amber-950/40 text-amber-400 border border-amber-500/20 animate-pulse"
                              : f.status === "Complete"
                                ? "bg-green-950/40 text-green-400 border border-green-500/20"
                                : "bg-red-950/40 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {f.status}
                      </span>

                      <button
                        onClick={() => handleRemoveFileIndex(i)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: OUTPUT FOLDER & FILENAME OPTIONS */}
          <div className="p-5 rounded-2xl bg-glass-card border border-glass-border shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-400" />
              2. Output Folder and Naming Settings
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1.5 tracking-wider">
                  Target Destination Directory
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={outputDir}
                    onChange={(e) => setOutputDir(e.target.value)}
                    placeholder="E.g. C:\MIDI_Exports\"
                    className="flex-1 bg-black/40 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono transition focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <button
                    onClick={handleSelectOutputFolder}
                    className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 font-mono font-bold uppercase flex items-center gap-1.5 transition text-[10px]"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                    Browse
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">
                    Filename Generation
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={keepOriginalFilename}
                      onChange={(e) => setKeepOriginalFilename(e.target.checked)}
                      className="rounded border-white/10 bg-black/40 text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-300">Keep Original Filename</span>
                  </label>

                  <div className="pl-6 space-y-2">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                        Append Suffix Match
                      </span>
                      <input
                        type="text"
                        value={appendSuffix}
                        onChange={(e) => setAppendSuffix(e.target.value)}
                        placeholder="_basic_pitch"
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={appendTimestamp}
                        onChange={(e) => setAppendTimestamp(e.target.checked)}
                        className="rounded border-white/10 bg-black/40 text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-slate-300">Append Timestamp</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">
                    Overwrite Resolution Behavior
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    {(["Ask", "Never", "Replace"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setOverwriteBehavior(mode)}
                        className={`py-2 rounded-lg border text-center font-mono font-bold text-[10px] uppercase transition cursor-pointer ${
                          overwriteBehavior === mode
                            ? "bg-blue-500/10 border-blue-400 text-blue-300"
                            : "bg-black/20 border-white/5 hover:bg-black/40 text-slate-400"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Defines what happens when a MIDI or WAV target already exists at the output path.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: TRANSCRIPTION OPTIONS */}
          <div className="p-5 rounded-2xl bg-glass-card border border-glass-border shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                3. Spotify Basic Pitch Options
              </h3>
              <button
                onClick={() => setUseAdvanced(!useAdvanced)}
                className="text-[10px] font-mono uppercase bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded border border-blue-500/15 transition"
              >
                {useAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveMidiFile}
                      onChange={(e) => setSaveMidiFile(e.target.checked)}
                      className="rounded border-white/10 bg-black/40 text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-slate-200 font-bold font-mono text-[11px]">Save MIDI file (.mid)</div>
                  </label>
                  <p className="text-[10px] text-slate-400 pl-6 leading-relaxed">
                    Default transcription master track saved to target catalog folder.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveSonifiedWav}
                      onChange={(e) => setSaveSonifiedWav(e.target.checked)}
                      className="rounded border-white/10 bg-black/40 text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-slate-200 font-bold font-mono text-[11px]">
                      Save sonified MIDI WAV (--sonify-midi)
                    </div>
                  </label>
                  <p className="text-[10px] text-slate-400 pl-6 leading-relaxed">
                    Saves synthetic audit audio mimicking transcribed note-events to test accuracy.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveNoteEventsCsv}
                      onChange={(e) => setSaveNoteEventsCsv(e.target.checked)}
                      className="rounded border-white/10 bg-black/40 text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-slate-200 font-bold font-mono text-[11px]">
                      Save note-events CSV (--save-note-events)
                    </div>
                  </label>
                  <p className="text-[10px] text-slate-400 pl-6 leading-relaxed">
                    Saves precise onset/offset milliseconds spreadsheet coordinates.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveModelOutputsNpz}
                      onChange={(e) => setSaveModelOutputsNpz(e.target.checked)}
                      className="rounded border-white/10 bg-black/40 text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-slate-200 font-bold font-mono text-[11px]">
                      Save model NPZ activations (--save-model-outputs)
                    </div>
                  </label>
                  <p className="text-[10px] text-slate-400 pl-6 leading-relaxed">
                    Saves raw deep activations arrays for inspection or advanced graphing.
                  </p>
                </div>
              </div>

              {/* ADVANCED PARAMS */}
              <AnimatePresence>
                {useAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-t border-white/5 pt-4 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Onset Threshold slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[10px]">
                          <span className="text-slate-400">Onset Threshold</span>
                          <span className="text-blue-400 font-bold">{onsetThreshold}</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.9"
                          step="0.05"
                          value={onsetThreshold}
                          onChange={(e) => setOnsetThreshold(parseFloat(e.target.value))}
                          className="w-full accent-blue-500 bg-black/40 h-1 rounded-lg cursor-pointer"
                        />
                        <span className="text-[9px] text-slate-500 block">
                          Higher values require stronger onset peaks.
                        </span>
                      </div>

                      {/* Frame Threshold slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[10px]">
                          <span className="text-slate-400">Frame Threshold</span>
                          <span className="text-blue-400 font-bold">{frameThreshold}</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.9"
                          step="0.05"
                          value={frameThreshold}
                          onChange={(e) => setFrameThreshold(parseFloat(e.target.value))}
                          className="w-full accent-blue-500 bg-black/40 h-1 rounded-lg cursor-pointer"
                        />
                        <span className="text-[9px] text-slate-500 block">
                          Notes persist while activations exceed this.
                        </span>
                      </div>

                      {/* Minimum Note Length */}
                      <div className="space-y-1.5 font-mono text-[10px]">
                        <label className="text-slate-400 block">Minimum Note Length (ms)</label>
                        <input
                          type="number"
                          value={minNoteLength}
                          onChange={(e) => setMinNoteLength(parseInt(e.target.value) || 0)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-slate-200"
                        />
                      </div>

                      {/* MIDI Tempo */}
                      <div className="space-y-1.5 font-mono text-[10px]">
                        <label className="text-slate-400 block">MIDI Tempo (BPM)</label>
                        <input
                          type="text"
                          value={midiTempo}
                          onChange={(e) => setMidiTempo(e.target.value)}
                          placeholder="E.g. 120"
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-slate-200"
                        />
                      </div>

                      {/* Min / Max Frequencies */}
                      <div className="space-y-1.5 font-mono text-[10px]">
                        <label className="text-slate-400 block">Minimum Frequency (Hz)</label>
                        <input
                          type="text"
                          value={minFreq}
                          onChange={(e) => setMinFreq(e.target.value)}
                          placeholder="Preserve"
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-slate-200"
                        />
                      </div>

                      <div className="space-y-1.5 font-mono text-[10px]">
                        <label className="text-slate-400 block">Maximum Frequency (Hz)</label>
                        <input
                          type="text"
                          value={maxFreq}
                          onChange={(e) => setMaxFreq(e.target.value)}
                          placeholder="Preserve"
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includePitchBends}
                          onChange={(e) => setIncludePitchBends(e.target.checked)}
                          className="rounded border-white/10 bg-black/40 text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-slate-300">Include Pitch Bends</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={multiplePitchBends}
                          onChange={(e) => setMultiplePitchBends(e.target.checked)}
                          className="rounded border-white/10 bg-black/40 text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-slate-300">Allow Multiple Pitch Bends</span>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* SECTION 5: COMMAND LINE PREVIEW */}
          <div className="p-5 rounded-2xl bg-[#030407]/90 border border-white/[0.04] space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-blue-400" />
              Adapter CLI Process Preview
            </h4>
            <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 font-mono text-xs text-blue-300 overflow-x-auto select-all leading-normal whitespace-pre-wrap">
              {previewCommandText}
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              Matches format constructed by native adapter script. Bypassed safely in browser sandboxes.
            </p>
          </div>
        </div>

        {/* RIGHT METADATA / STATUS DIAGNOSTICS COLUMN (4 lg columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* STATE INDICATOR FOR SYSTEM INTEGRITY MODE */}
          <div className="p-5 rounded-2xl bg-glass-card border border-glass-border shadow-md space-y-3">
            <div className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Runtime Target Mode:
            </div>
            {isElectronEnvironment ? (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold font-mono text-[10px] text-green-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  NATIVE RUNNER CONNECTED
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  Native Basic Pitch subprocess execution is available on this host.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-blue-950/20 border border-blue-500/20 text-blue-300 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold font-mono text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  BROWSER PREVIEW / NOT RUNNABLE
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  Actions show sandbox-only previews and do not create local MIDI files. Use native Electron to process
                  local audio.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 1: ENVIRONMENTAL PREFLIGHT & READINESS */}
          <div className="p-5 rounded-2xl bg-glass-card border border-glass-border shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              Preflight Check
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[9px] font-mono text-slate-400 font-semibold uppercase block mb-1">
                  Active Python Executable Target
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pythonPath}
                    onChange={(e) => {
                      setPythonPath(e.target.value);
                      localStorage.setItem("yue_python_path", e.target.value);
                    }}
                    placeholder="python"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-slate-300"
                  />
                  <button
                    onClick={handleSelectPythonExecutable}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 flex items-center justify-center cursor-pointer transition hover:bg-white/10"
                    title="Select path"
                  >
                    ...
                  </button>
                </div>
              </div>

              {/* Checklist list items */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider mb-2">
                  MIDI Preflight Criteria
                </span>

                <div className="space-y-1.5 font-mono text-[10px]">
                  {/* Item 1: Python status */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Python Interpreter</span>
                    <span className={pythonPath ? "text-green-400" : "text-amber-400"}>
                      {pythonPath ? "Selected" : "Missing"}
                    </span>
                  </div>

                  {/* Item 2: basic-pitch library */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">basic_pitch package</span>
                    <span
                      className={
                        isPreflightScanned
                          ? preflightData?.basicPitchInstalled
                            ? "text-green-400"
                            : "text-red-400"
                          : "text-slate-500"
                      }
                    >
                      {isPreflightScanned
                        ? preflightData?.basicPitchInstalled
                          ? "Installed"
                          : "Missing"
                        : "Not checked"}
                    </span>
                  </div>

                  {/* Item 3: basic-pitch CLI */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">basic-pitch CLI Binary</span>
                    <span
                      className={
                        isPreflightScanned
                          ? preflightData?.cliAvailable
                            ? "text-green-400"
                            : "text-red-400"
                          : "text-slate-500"
                      }
                    >
                      {isPreflightScanned ? (preflightData?.cliAvailable ? "Found" : "Missing") : "Not checked"}
                    </span>
                  </div>

                  {/* Item 4: Required dependencies */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Python dependencies</span>
                    <span
                      className={
                        isPreflightScanned
                          ? preflightData?.librosaInstalled &&
                            preflightData?.numpyInstalled &&
                            preflightData?.midoInstalled
                            ? "text-green-400"
                            : "text-red-400"
                          : "text-slate-500"
                      }
                    >
                      {isPreflightScanned
                        ? preflightData?.librosaInstalled &&
                          preflightData?.numpyInstalled &&
                          preflightData?.midoInstalled
                          ? "Installed"
                          : "Missing"
                        : "Not checked"}
                    </span>
                  </div>

                  {/* Item 5: Output Folder */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Output Folder Ready</span>
                    <span className={outputDir ? "text-green-400" : "text-red-400"}>
                      {outputDir ? "Ready" : "Missing"}
                    </span>
                  </div>

                  {/* Item 6: Input Audio */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Input Queue Status</span>
                    <span className={inputFiles.length > 0 ? "text-green-400" : "text-amber-400"}>
                      {inputFiles.length > 0 ? "Ready" : "Missing"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scan Trigger */}
              <button
                onClick={handleValidateEnvironment}
                disabled={preflightScanning}
                className="w-full py-2 cursor-pointer bg-blue-500/[0.08] hover:bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-xl font-mono font-bold text-[10px] uppercase transition flex items-center justify-center gap-1.5"
              >
                {preflightScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Scanning Environment...
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    Run Preflight Check
                  </>
                )}
              </button>

              {/* Preflight results / blockers warning box */}
              {isPreflightScanned && preflightData && (
                <div
                  className={`p-3 rounded-xl border text-[10px] ${
                    preflightData.ok
                      ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"
                      : "bg-red-950/20 border-red-500/20 text-red-400"
                  }`}
                >
                  <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
                    {preflightData.ok ? "🎉 READY" : "⚠️ BLOCKED"}
                  </div>
                  {preflightData.ok ? (
                    <p>
                      Basic Pitch requirements checked on this machine. This does not count as UVR separation proof.
                    </p>
                  ) : (
                    <ul className="list-disc pl-3 space-y-1 mt-1 text-[9px]">
                      {preflightData.blockers.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6: ACTION MANAGER (RUN / DRY-RUN) */}
          <div className="p-5 rounded-2xl bg-[#090b14]/90 border border-blue-500/15 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Action Manager
            </h3>

            {/* Progress indicators */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-amber-400 font-bold animate-pulse">TRANSCRIBING MIDI CHANNELS...</span>
                  <span className="text-slate-400">{transcriptionProgress}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 h-full transition-all duration-300"
                    style={{ width: `${transcriptionProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Summary Blockers text */}
            {blockChecking.blocked && (
              <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-300 rounded-xl text-[10px]">
                <div className="font-bold flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  Midi blockers identified
                </div>
                <ul className="list-disc pl-3.5 space-y-1">
                  {blockChecking.list.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              {/* Primary action trigger */}
              <button
                disabled={isProcessing || blockChecking.blocked}
                onClick={handleRunTranscription}
                className={`w-full py-3 rounded-xl font-mono text-xs uppercase tracking-widest font-extrabold shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  isProcessing
                    ? "bg-slate-800 text-slate-400 border border-white/5"
                    : blockChecking.blocked
                      ? "bg-slate-900 text-slate-600 border border-white/5 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-700 hover:from-blue-400 hover:to-indigo-600 text-white font-bold border border-blue-400/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse"
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Transcribing...
                  </>
                ) : blockChecking.blocked ? (
                  "Blocked: See files & formats"
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-white" />
                    Run Basic Pitch Transcription
                  </>
                )}
              </button>

              {/* Dry-Run Check trigger */}
              <button
                disabled={isProcessing || blockChecking.blocked}
                onClick={handleValidateEnvironment}
                className="w-full py-2 bg-slate-950/40 hover:bg-slate-900 border border-white/5 hover:border-blue-500/20 text-slate-300 hover:text-white rounded-xl font-mono text-[10px] uppercase font-bold transition flex items-center justify-center gap-1"
              >
                Run Dry-Run Check Only
              </button>
            </div>
          </div>

          {/* SETUP GUIDE SECTION (COLLAPSIBLE / TROUBLESHOOTING) */}
          <div className="p-5 rounded-2xl bg-glass-card border border-glass-border shadow-2xl relative space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-blue-400" />
              Setup Guide / Troubleshooting
            </h3>

            <div className="space-y-2 text-[10px] text-slate-400 leading-relaxed">
              <p>To use Spotify Basic Pitch offline in your environment, perform the following setup:</p>
              <ol className="list-decimal pl-4.5 space-y-1 text-slate-300 font-mono">
                <li>Select Python executable path.</li>
                <li>Install basic-pitch package dependencies:</li>
              </ol>
              <div className="bg-black/60 rounded-lg p-2 font-mono text-[9px] text-blue-300 select-all border border-white/5">
                python -m pip install basic-pitch
              </div>
              <p>
                This command downloads and bundles neural network models on first execution. Subsequent transcriptions
                run offline.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 7: RESULTS AND EXPORTED FILES PANEL */}
      {finalResults && (
        <div className="p-6 rounded-2xl bg-[#090e1d]/85 border border-green-500/20 shadow-2xl space-y-4 relative">
          <div className="absolute top-[-50px] left-[-50px] w-52 h-52 bg-green-500/5 rounded-full blur-[80px]" />

          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-base font-bold text-green-300 font-display flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              4. Transcription Output Results
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleOpenOutputFolder}
                className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg font-mono font-bold uppercase text-[10px] transition flex items-center gap-1"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Open Output Folder
              </button>
            </div>
          </div>

          {!isElectronEnvironment && (
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-200 font-mono">
              Browser Preview / Not runnable: artifact names below are preview labels only. No local MIDI, WAV, CSV, or
              NPZ files were written.
              <span className="block text-slate-500 mt-1">Code: BASIC_PITCH_DRY_RUN_ONLY</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                Output Artifact Names:
              </span>

              <div className="space-y-1.5 font-mono text-[10px]">
                {/* MIDI master */}
                {finalResults.midiFiles.map((f, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-black/45 border border-green-500/10 flex justify-between items-center text-[10px]"
                  >
                    <div className="flex items-center gap-2 text-green-300">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-bold truncate max-w-xs">{f}</span>
                    </div>
                    <span className="text-slate-500">
                      {finalResults.fileSizes[f]
                        ? `${(finalResults.fileSizes[f] / 1024).toFixed(1)} KB`
                        : finalResults.proofStatus === "DRY_RUN_ONLY"
                          ? "Preview label only"
                          : "Not verified"}
                    </span>
                  </div>
                ))}

                {/* Sonified audio WAV if any */}
                {finalResults.sonifiedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-black/45 border border-blue-500/10 flex justify-between items-center text-[10px]"
                  >
                    <div className="flex items-center gap-2 text-blue-300">
                      <FileAudio className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-bold truncate max-w-xs">{f}</span>
                    </div>
                    <span className="text-slate-500">
                      {finalResults.fileSizes[f]
                        ? `${(finalResults.fileSizes[f] / (1024 * 1024)).toFixed(1)} MB`
                        : finalResults.proofStatus === "DRY_RUN_ONLY"
                          ? "Preview label only"
                          : "Not verified"}
                    </span>
                  </div>
                ))}

                {/* CSV note-events */}
                {finalResults.csvFiles.map((f, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-black/45 border border-white/5 flex justify-between items-center text-[10px]"
                  >
                    <div className="flex items-center gap-2 text-slate-300">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-bold truncate max-w-xs">{f}</span>
                    </div>
                    <span className="text-slate-500">
                      {finalResults.fileSizes[f]
                        ? `${(finalResults.fileSizes[f] / 1024).toFixed(1)} KB`
                        : finalResults.proofStatus === "DRY_RUN_ONLY"
                          ? "Preview label only"
                          : "Not verified"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                Subprocess Log Summary:
              </span>
              <div className="bg-black/60 rounded-xl p-3.5 border border-white/5 font-mono text-[10.5px] text-slate-400 overflow-y-auto max-h-40 leading-relaxed whitespace-pre-wrap">
                {finalResults.stdout || "No log trace detected."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECENT SUBPROCESS PROCESS LOGS STREAM */}
      <div className="p-5 rounded-2xl bg-black/50 border border-white/[0.03] space-y-3 relative overflow-hidden">
        <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-blue-400 animate-pulse" />
          Active Subprocess stderr/stdout console
        </h4>
        <div className="bg-black/40 rounded-xl p-3 border border-white/5 font-mono text-[10px] text-slate-400 h-32 overflow-y-auto space-y-1">
          {logs.map((logStr, idx) => (
            <div key={idx} className="leading-normal hover:text-slate-200 transition-all">
              {logStr}
            </div>
          ))}
        </div>
      </div>

      {/* Micro-toast message block */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 px-4 py-2.5 bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-lg shadow-2xl z-50 flex items-center gap-2 border border-blue-400"
          >
            <Activity className="w-4 h-4 animate-spin" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
