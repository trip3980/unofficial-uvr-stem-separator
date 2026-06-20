import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileAudio,
  FolderOpen,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Waves,
} from "lucide-react";
import {
  WEB_AUDIO_MASTERING_REFERENCE,
  buildMasteringBeforeAfterReport,
  buildMasteringFilename,
  createMasteringHistoryRecord,
  createUnmeasuredMasteringAnalysis,
  evaluateMasteringReadiness,
  getDefaultMasteringSettings,
  getMasteringMode,
  getUnmeasuredMasteringReport,
  masteringDoesNotAffectReleaseGate,
  verifyMasteringOutput,
  type MasteringFileAnalysis,
  type MasteringHistoryRecord,
  type MasteringIntensity,
  type MasteringModeId,
  type MasteringOutputFormat,
  type MasteringOutputVerification,
} from "../services/masteringWorkflow";
import {
  BATCH_MASTERING_POLICY,
  CLOUD_MASTERING_POLICY,
  MASTERING_CHAIN_POLICIES,
  MASTERING_EXPORT_POLICIES,
  MASTERING_GOALS,
  REFERENCE_MATCH_POLICY,
  buildMasteringChainRunPlan,
  evaluateMasteringChainReadiness,
  getMasteringChainPolicy,
} from "../services/masteringChainPolicy";

type NativeFFmpegStatus = {
  ready?: boolean;
  filePath?: string;
  path?: string;
  command?: string;
  version?: string | null;
  diagnosticCode?: string;
  error?: string | null;
  userMessage?: string;
};

type NativeMasteringAnalysisResult = MasteringFileAnalysis & {
  success?: boolean;
  error?: string | null;
  ffmpeg?: NativeFFmpegStatus;
};

type NativeMasteringProcessResult = {
  success: boolean;
  diagnosticCode: string;
  inputPath?: string;
  outputPath?: string;
  outputFolder?: string;
  outputFormat?: string;
  outputSizeBytes?: number;
  nativeWriteVerified?: boolean;
  processingReturnedSuccess?: boolean;
  savedAsNewCopy?: boolean;
  backend?: "ffmpeg";
  ffmpeg?: NativeFFmpegStatus;
  afterAnalysis?: NativeMasteringAnalysisResult | null;
  error?: string | null;
  userMessage?: string;
};

type MasteringBridge = {
  selectMasteringInputFile?: () => Promise<string | null>;
  selectInputFiles?: (options?: unknown) => Promise<string[]>;
  selectOutputFolder?: () => Promise<string | null>;
  selectFFmpegPath?: () => Promise<NativeFFmpegStatus & { success?: boolean }>;
  checkFFmpegReady?: (ffmpegPath?: string) => Promise<NativeFFmpegStatus>;
  verifyOutputFolder?: (folderPath: string) => Promise<{ success?: boolean; ok?: boolean; error?: string }>;
  analyzeMasteringAudio?: (request: {
    inputPath: string;
    ffmpegPath?: string;
  }) => Promise<NativeMasteringAnalysisResult>;
  runMasteringFfmpeg?: (request: {
    inputPath: string;
    outputFolder: string;
    outputFilename: string;
    outputFormat: MasteringOutputFormat;
    modeId: MasteringModeId;
    targetLufs: number | null;
    peakCeilingDb: number;
    preserveDynamics: boolean;
    overwritePolicy: string;
    ffmpegPath?: string;
  }) => Promise<NativeMasteringProcessResult>;
  openOutputFolder?: (folderPath: string) => Promise<boolean>;
  openMasteringAudioFile?: (filePath: string) => Promise<{ success: boolean; error?: string | null }>;
};

const OUTPUT_FORMATS: MasteringOutputFormat[] = ["wav", "flac"];
const INTENSITIES: MasteringIntensity[] = ["low", "medium", "high"];

function getMasteringBridge(): MasteringBridge | null {
  if (typeof window === "undefined") return null;
  return ((window as Window & { uvr?: MasteringBridge }).uvr ?? null) as MasteringBridge | null;
}

function pathBasename(filePath: string | null): string {
  if (!filePath) return "selected_audio.wav";
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || "selected_audio.wav";
}

function formatDateToken(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${mm}-${dd}-${yyyy}`;
}

function formatTimeToken(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "Not measured";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "Not measured";
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatNumber(value: number | null | undefined, suffix: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not measured";
  return `${value.toFixed(1)} ${suffix}`;
}

function isAnalysisComplete(analysis: NativeMasteringAnalysisResult | null): boolean {
  return !!analysis && analysis.success !== false && analysis.diagnosticCode !== "MASTERING_ANALYSIS_FAILED";
}

export default function MasteringLab() {
  const bridge = getMasteringBridge();
  const [modeId, setModeId] = useState<MasteringModeId>("balanced_master");
  const [intensity, setIntensity] = useState<MasteringIntensity>("medium");
  const [outputFormat, setOutputFormat] = useState<MasteringOutputFormat>("wav");
  const [inputPath, setInputPath] = useState<string | null>(null);
  const [outputFolder, setOutputFolder] = useState<string | null>(null);
  const [outputFolderWritable, setOutputFolderWritable] = useState(false);
  const [ffmpegPath, setFfmpegPath] = useState<string | undefined>(undefined);
  const [ffmpegStatus, setFfmpegStatus] = useState<NativeFFmpegStatus | null>(null);
  const [inputAnalysis, setInputAnalysis] = useState<NativeMasteringAnalysisResult | null>(null);
  const [outputAnalysis, setOutputAnalysis] = useState<NativeMasteringAnalysisResult | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState("MASTERING_ANALYSIS_NOT_STARTED");
  const [processingStatus, setProcessingStatus] = useState("MASTERING_EXPORT_READY");
  const [lastOutputPath, setLastOutputPath] = useState<string | null>(null);
  const [lastVerification, setLastVerification] = useState<MasteringOutputVerification | null>(null);
  const [historyRecords, setHistoryRecords] = useState<MasteringHistoryRecord[]>([]);
  const [filenameTimestamp, setFilenameTimestamp] = useState(() => new Date());
  const [statusMessage, setStatusMessage] = useState(
    "Select audio -> choose goal -> analyze -> process -> compare -> export -> verify.",
  );

  const selectedMode = getMasteringMode(modeId);
  const selectedChain = getMasteringChainPolicy(modeId);
  const chainRunPlan = useMemo(() => buildMasteringChainRunPlan(modeId), [modeId]);
  const settings = useMemo(
    () => ({
      ...getDefaultMasteringSettings(modeId),
      intensity,
      outputFormat,
      overwritePolicy: "save_new_copy_with_suffix" as const,
    }),
    [modeId, intensity, outputFormat],
  );
  const filenamePreview = useMemo(
    () =>
      buildMasteringFilename({
        sourceBasename: pathBasename(inputPath),
        date: formatDateToken(filenameTimestamp),
        time: formatTimeToken(filenameTimestamp),
        mode: modeId,
        intensity,
        format: outputFormat,
      }),
    [filenameTimestamp, inputPath, intensity, modeId, outputFormat],
  );
  const ffmpegReady = !!ffmpegStatus?.ready;
  const analysisComplete = isAnalysisComplete(inputAnalysis);
  const backendReady = ffmpegReady && selectedMode.backendStatus === "ffmpeg_single_file_ready";
  const readiness = useMemo(
    () =>
      evaluateMasteringReadiness({
        inputPath,
        outputFolder,
        processingBackendReady: backendReady,
        ffmpegReady,
        modeId,
      }),
    [backendReady, ffmpegReady, inputPath, modeId, outputFolder],
  );
  const chainReadiness = useMemo(
    () =>
      evaluateMasteringChainReadiness({
        modeId,
        inputFileSelected: !!inputPath,
        outputFolderSelected: !!outputFolder,
        outputFolderWritable,
        ffmpegReady,
        analysisComplete,
        referenceFileSelected: false,
      }),
    [analysisComplete, ffmpegReady, inputPath, modeId, outputFolder, outputFolderWritable],
  );
  const beforeAfterReport = useMemo(
    () =>
      outputAnalysis
        ? buildMasteringBeforeAfterReport({ beforeAnalysis: inputAnalysis, afterAnalysis: outputAnalysis })
        : getUnmeasuredMasteringReport(),
    [inputAnalysis, outputAnalysis],
  );
  const unmeasuredInput = useMemo(() => createUnmeasuredMasteringAnalysis(inputPath ?? "", pathBasename(inputPath)), [
    inputPath,
  ]);
  const displayedInputAnalysis = inputAnalysis ?? unmeasuredInput;
  const runDisabled =
    !inputPath ||
    !outputFolder ||
    !outputFolderWritable ||
    !backendReady ||
    !analysisComplete ||
    modeId === "reference_match" ||
    modeId === "custom" ||
    processingStatus === "MASTERING_EXPORT_RUNNING";

  useEffect(() => {
    let active = true;
    if (!bridge?.checkFFmpegReady) return;
    bridge
      .checkFFmpegReady()
      .then((status) => {
        if (active) setFfmpegStatus(status);
      })
      .catch((error: Error) => {
        if (active) {
          setFfmpegStatus({
            ready: false,
            diagnosticCode: "RUNTIME_FFMPEG_MISSING",
            error: error.message,
            userMessage: "FFmpeg status could not be checked.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [bridge]);

  async function selectInputAudio() {
    if (!bridge) {
      setStatusMessage("Browser mode cannot prove native file paths. Use the Electron app for mastering.");
      return;
    }
    const selected = bridge.selectMasteringInputFile
      ? await bridge.selectMasteringInputFile()
      : (await bridge.selectInputFiles?.({ single: true }))?.[0];
    if (!selected) {
      setStatusMessage("Input selection cancelled.");
      return;
    }
    setInputPath(selected);
    setInputAnalysis(null);
    setOutputAnalysis(null);
    setLastOutputPath(null);
    setLastVerification(null);
    setFilenameTimestamp(new Date());
    setAnalysisStatus("MASTERING_ANALYSIS_NOT_STARTED");
    setStatusMessage("Input selected. Run analysis before mastering.");
  }

  async function selectOutputFolder() {
    if (!bridge?.selectOutputFolder) {
      setStatusMessage("Output folder selection requires the Electron native bridge.");
      return;
    }
    const selected = await bridge.selectOutputFolder();
    if (!selected) {
      setStatusMessage("Output folder selection cancelled.");
      return;
    }
    setOutputFolder(selected);
    const verification = bridge.verifyOutputFolder ? await bridge.verifyOutputFolder(selected) : { success: true };
    const writable = verification.success === true || verification.ok === true;
    setOutputFolderWritable(writable);
    setStatusMessage(writable ? "Output folder verified as writable." : verification.error || "Output folder is not writable.");
  }

  async function selectFfmpeg() {
    if (!bridge?.selectFFmpegPath) {
      setStatusMessage("FFmpeg selection requires the Electron native bridge.");
      return;
    }
    const selected = await bridge.selectFFmpegPath();
    const selectedPath = selected.filePath || selected.path || selected.command;
    if (selectedPath) setFfmpegPath(selectedPath);
    setFfmpegStatus(selected);
    setStatusMessage(selected.userMessage || (selected.ready ? "FFmpeg ready." : "FFmpeg is not ready."));
  }

  async function analyzeInput() {
    if (!bridge?.analyzeMasteringAudio || !inputPath) {
      setStatusMessage("Select a local input file before analysis.");
      return;
    }
    setAnalysisStatus("MASTERING_ANALYSIS_RUNNING");
    setStatusMessage("Analyzing input with FFmpeg metadata probe.");
    const result = await bridge.analyzeMasteringAudio({ inputPath, ffmpegPath });
    setInputAnalysis(result);
    setAnalysisStatus(result.diagnosticCode || (result.success === false ? "MASTERING_ANALYSIS_FAILED" : "MASTERING_ANALYSIS_COMPLETE"));
    if (result.ffmpeg) setFfmpegStatus(result.ffmpeg);
    setStatusMessage(result.userMessage || result.error || "Analysis complete.");
  }

  async function runMastering() {
    if (!bridge?.runMasteringFfmpeg || !inputPath || !outputFolder || runDisabled) {
      setStatusMessage("Run Mastering is blocked until input, output folder, analysis, and FFmpeg are ready.");
      return;
    }
    setProcessingStatus("MASTERING_EXPORT_RUNNING");
    setStatusMessage("Running FFmpeg mastering export as a non-destructive copy.");
    const result = await bridge.runMasteringFfmpeg({
      inputPath,
      outputFolder,
      outputFilename: filenamePreview,
      outputFormat,
      modeId,
      targetLufs: selectedMode.targetLufs,
      peakCeilingDb: selectedMode.peakCeilingDb,
      preserveDynamics: selectedMode.preserveDynamics,
      overwritePolicy: settings.overwritePolicy,
      ffmpegPath,
    });

    setProcessingStatus(result.diagnosticCode || (result.success ? "MASTERING_EXPORT_COMPLETE" : "MASTERING_EXPORT_FAILED"));
    if (result.ffmpeg) setFfmpegStatus(result.ffmpeg);
    if (result.outputPath) setLastOutputPath(result.outputPath);
    if (result.afterAnalysis && result.afterAnalysis.success !== false) setOutputAnalysis(result.afterAnalysis);

    const verification =
      result.outputPath && result.outputFolder
        ? verifyMasteringOutput({
            outputPath: result.outputPath,
            selectedOutputFolder: result.outputFolder,
            expectedExtension: `.${outputFormat}`,
            fileExists: result.success,
            sizeBytes: result.outputSizeBytes ?? 0,
            nativeWriteVerified: !!result.nativeWriteVerified,
            processingReturnedSuccess: !!result.processingReturnedSuccess,
          })
        : null;
    if (verification) {
      setLastVerification(verification);
      const report = buildMasteringBeforeAfterReport({
        beforeAnalysis: inputAnalysis,
        afterAnalysis: result.afterAnalysis && result.afterAnalysis.success !== false ? result.afterAnalysis : null,
      });
      setHistoryRecords((records) => [
        createMasteringHistoryRecord({
          historyId: `mastering-${Date.now()}`,
          sourceFile: inputPath,
          sourceDuration: formatDuration(inputAnalysis?.durationSeconds),
          outputFile: result.outputPath ?? null,
          settings,
          processingBackend: "ffmpeg",
          outputVerification: verification,
          beforeAfterReport: report,
          createdDate: new Date().toISOString(),
          errorCode: verification.ok ? null : verification.diagnosticCode,
        }),
        ...records,
      ]);
    }
    setStatusMessage(result.userMessage || result.error || "Mastering export finished.");
  }

  async function openFolder() {
    if (bridge?.openOutputFolder && outputFolder) await bridge.openOutputFolder(outputFolder);
  }

  async function openAudioFile(filePath: string | null) {
    if (!filePath || !bridge?.openMasteringAudioFile) return;
    const result = await bridge.openMasteringAudioFile(filePath);
    if (!result.success) setStatusMessage(result.error || "Could not open audio file.");
  }

  const summaryCards = [
    ["Input", inputPath ? pathBasename(inputPath) : "No input selected", inputPath ? "Selected" : "MASTERING_INPUT_MISSING"],
    ["Readiness", readiness.userMessage, readiness.diagnosticCode],
    ["Chain", chainReadiness.userMessage, chainReadiness.diagnosticCode],
    [
      "Verification",
      lastVerification?.message ?? "No mastered output has been verified yet.",
      lastVerification?.diagnosticCode ?? "MASTERING_OUTPUT_NOT_VERIFIED",
    ],
    ["Release Boundary", masteringDoesNotAffectReleaseGate(), "Not AI proof"],
  ];

  const analysisRows = [
    ["Duration", formatDuration(displayedInputAnalysis.durationSeconds)],
    ["Sample rate", displayedInputAnalysis.sampleRate ? `${displayedInputAnalysis.sampleRate} Hz` : "Not measured"],
    ["Channels", displayedInputAnalysis.channels ? String(displayedInputAnalysis.channels) : "Not measured"],
    ["Format", displayedInputAnalysis.formatName ?? "Not measured"],
    ["File size", formatBytes(displayedInputAnalysis.sizeBytes)],
    ["Peak level", formatNumber(displayedInputAnalysis.peakDbfs, "dBFS")],
    ["Integrated loudness", formatNumber(displayedInputAnalysis.integratedLufs, "LUFS")],
    ["True peak", formatNumber(displayedInputAnalysis.truePeakDbtp, "dBTP")],
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-emerald-500/15 bg-black/35 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-emerald-200">
              <Sparkles className="h-5 w-5" />
              <h2 className="font-display text-2xl font-bold">Mastering Lab</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Finalize local audio without uploading it: select a file, choose a goal, analyze it, create a processed
              copy, compare measured values, verify the output, and keep a short history.
            </p>
          </div>
          <span className="rounded border border-emerald-400/20 bg-emerald-950/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            Local FFmpeg single-file lane
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-5">
          {summaryCards.map(([title, body, code]) => (
            <div key={title} className="rounded-lg border border-white/10 bg-[#07080c] p-4">
              <div className="text-xs font-bold text-slate-100">{title}</div>
              <p className="mt-2 min-h-12 text-xs leading-5 text-slate-400">{body}</p>
              <div className="mt-3 font-mono text-[9px] uppercase tracking-wider text-amber-200">{code}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs leading-5 text-slate-300">
          {statusMessage}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-xl border border-white/10 bg-black/35 p-5">
          <div className="flex items-center gap-2 text-cyan-100">
            <FileAudio className="h-4 w-4" />
            <h3 className="font-display text-lg font-bold">Input Audio</h3>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-cyan-400/20 bg-cyan-950/10 p-5 text-sm text-cyan-100">
            {inputPath ? inputPath : "Select a local WAV, MP3, FLAC, M4A, AAC, OGG, OPUS, or AIFF file through Electron."}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectInputAudio}
              className="rounded-lg border border-cyan-400/30 bg-cyan-950/25 px-3 py-2 text-xs font-bold text-cyan-100"
            >
              Select Audio
            </button>
            <button
              type="button"
              onClick={() => {
                setInputPath(null);
                setInputAnalysis(null);
                setOutputAnalysis(null);
                setLastOutputPath(null);
                setLastVerification(null);
              }}
              className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-300"
            >
              Clear Audio
            </button>
            <button
              type="button"
              onClick={analyzeInput}
              disabled={!inputPath || !ffmpegReady || analysisStatus === "MASTERING_ANALYSIS_RUNNING"}
              className="rounded-lg border border-emerald-400/30 bg-emerald-950/25 px-3 py-2 text-xs font-bold text-emerald-100 disabled:border-slate-600/50 disabled:bg-slate-900/50 disabled:text-slate-500"
            >
              Analyze Input
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {analysisRows.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-bold text-slate-100">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 p-5">
          <div className="flex items-center gap-2 text-emerald-100">
            <SlidersHorizontal className="h-4 w-4" />
            <h3 className="font-display text-lg font-bold">Mastering Preset / Style</h3>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {MASTERING_GOALS.map((goal) => (
              <button
                key={goal.modeId}
                type="button"
                onClick={() => {
                  setModeId(goal.modeId);
                  setIntensity(getMasteringMode(goal.modeId).defaultIntensity);
                  setOutputAnalysis(null);
                  setLastVerification(null);
                }}
                className={`rounded-lg border p-3 text-left transition ${
                  goal.modeId === modeId
                    ? "border-emerald-400/40 bg-emerald-950/25 text-emerald-100"
                    : "border-white/10 bg-[#07080c] text-slate-300 hover:border-emerald-400/20"
                }`}
              >
                <div className="text-sm font-bold">{goal.displayName}</div>
                <p className="mt-1 text-xs leading-5 text-slate-400">{goal.plainLanguagePurpose}</p>
                <div className="mt-2 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                  {goal.userFacingStatus}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/35 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-100">
              <SlidersHorizontal className="h-4 w-4" />
              <h3 className="font-display text-lg font-bold">Effects Chain / Macro</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Reusable OpenStem-native chains keep the workflow simple: input audio, analyze, apply, export copy, verify
              output, then show a measured report. Batch macros remain planned until the single-file lane is stable.
            </p>
          </div>
          <span className="rounded border border-amber-400/20 bg-amber-950/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
            {selectedChain.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {MASTERING_CHAIN_POLICIES.map((chain) => (
            <button
              key={chain.chainId}
              type="button"
              onClick={() => setModeId(chain.chainId)}
              className={`rounded-lg border p-3 text-left transition ${
                chain.chainId === modeId
                  ? "border-teal-400/40 bg-teal-950/25 text-teal-100"
                  : "border-white/10 bg-[#07080c] text-slate-300 hover:border-teal-400/20"
              }`}
            >
              <div className="text-sm font-bold">{chain.displayName}</div>
              <p className="mt-1 text-xs leading-5 text-slate-400">{chain.purpose}</p>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                Non-destructive copy / output verification required
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-white/10 bg-[#07080c] p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Selected chain</div>
            <div className="mt-2 text-sm font-bold text-slate-100">{selectedChain.displayName}</div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{selectedChain.proofBoundary}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#07080c] p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Run path</div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
              {chainRunPlan.map((stage) => (
                <div
                  key={stage}
                  className="rounded border border-white/10 bg-black/35 px-3 py-2 text-xs text-slate-300"
                >
                  {stage}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/35 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-100">
              <Waves className="h-4 w-4" />
              <h3 className="font-display text-lg font-bold">Processing Controls</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              The first backend uses local FFmpeg loudnorm into a new WAV or FLAC copy. It does not upload audio or
              claim professional mastering results.
            </p>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-200">
            Reference commit {WEB_AUDIO_MASTERING_REFERENCE.inspectedCommit.slice(0, 12)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="rounded-lg border border-white/10 bg-[#07080c] p-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Intensity</span>
            <select
              value={intensity}
              onChange={(event) => setIntensity(event.target.value as MasteringIntensity)}
              className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
            >
              {INTENSITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Target Loudness</div>
            <div className="mt-2 text-lg font-bold text-slate-100">
              {selectedMode.targetLufs === null ? "Reference-based later" : `${selectedMode.targetLufs} LUFS`}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Peak Ceiling</div>
            <div className="mt-2 text-lg font-bold text-slate-100">{selectedMode.peakCeilingDb} dBTP</div>
          </div>
          <label className="rounded-lg border border-white/10 bg-[#07080c] p-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Output Format</span>
            <select
              value={outputFormat}
              onChange={(event) => setOutputFormat(event.target.value as MasteringOutputFormat)}
              className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
            >
              {OUTPUT_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">FFmpeg</div>
            <div className="mt-2 text-xs font-bold text-slate-100">
              {ffmpegReady ? "Ready" : ffmpegStatus?.diagnosticCode ?? "Not checked"}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectFfmpeg}
            className="rounded-lg border border-cyan-400/30 bg-cyan-950/25 px-3 py-2 text-xs font-bold text-cyan-100"
          >
            Select / Verify FFmpeg
          </button>
          <button
            type="button"
            onClick={selectOutputFolder}
            className="rounded-lg border border-blue-400/30 bg-blue-950/25 px-3 py-2 text-xs font-bold text-blue-100"
          >
            Choose Output Folder
          </button>
          <button
            type="button"
            onClick={openFolder}
            disabled={!outputFolder}
            className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-300 disabled:text-slate-500"
          >
            Open Output Folder
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/35 p-5">
          <div className="flex items-center gap-2 text-amber-100">
            <Play className="h-4 w-4" />
            <h3 className="font-display text-lg font-bold">Run Mastering</h3>
          </div>
          <div className="mt-4 rounded-lg border border-amber-400/15 bg-amber-950/10 p-4 text-sm leading-6 text-amber-100">
            {runDisabled
              ? "Run Mastering is blocked until native input, writable output folder, FFmpeg, and input analysis are ready."
              : "Ready to create a verified mastered copy. The original file will not be overwritten."}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runMastering}
              disabled={runDisabled}
              className="rounded-lg border border-emerald-400/30 bg-emerald-950/25 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-100 disabled:border-slate-600/50 disabled:bg-slate-900/50 disabled:text-slate-500"
            >
              {runDisabled ? "Run Mastering - blocked" : "Run Mastering"}
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
            >
              Cancel - not active
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 p-5">
          <div className="flex items-center gap-2 text-purple-100">
            <RefreshCw className="h-4 w-4" />
            <h3 className="font-display text-lg font-bold">Before/After Preview</h3>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              [
                "Input Loudness",
                beforeAfterReport.inputLoudness.measured
                  ? formatNumber(beforeAfterReport.inputLoudness.value, beforeAfterReport.inputLoudness.unit)
                  : "Not measured",
              ],
              [
                "Output Loudness",
                beforeAfterReport.outputLoudness.measured
                  ? formatNumber(beforeAfterReport.outputLoudness.value, beforeAfterReport.outputLoudness.unit)
                  : "Not measured",
              ],
              [
                "Input Peak",
                beforeAfterReport.inputPeak.measured
                  ? formatNumber(beforeAfterReport.inputPeak.value, beforeAfterReport.inputPeak.unit)
                  : "Not measured",
              ],
              [
                "Output Peak",
                beforeAfterReport.outputPeak.measured
                  ? formatNumber(beforeAfterReport.outputPeak.value, beforeAfterReport.outputPeak.unit)
                  : "Not measured",
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-bold text-slate-100">{value}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">{beforeAfterReport.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openAudioFile(inputPath)}
              disabled={!inputPath}
              className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-300 disabled:text-slate-500"
            >
              Open original
            </button>
            <button
              type="button"
              onClick={() => openAudioFile(lastOutputPath)}
              disabled={!lastOutputPath}
              className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-300 disabled:text-slate-500"
            >
              Open mastered
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/35 p-5">
          <div className="flex items-center gap-2 text-blue-100">
            <FolderOpen className="h-4 w-4" />
            <h3 className="font-display text-lg font-bold">Export Settings</h3>
          </div>
          <div className="mt-4 rounded-lg border border-white/10 bg-[#07080c] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Output folder</div>
            <div className="mt-2 break-all font-mono text-xs text-blue-100">{outputFolder ?? "No output folder selected"}</div>
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-[#07080c] p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Filename preview</div>
            <div className="mt-2 break-all font-mono text-xs text-blue-100">{filenamePreview}</div>
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs leading-5 text-slate-400">
            Default template: {"{source_basename}_mastered_{date}_{time}_{mode}.{ext}"}. Invalid filename characters,
            path traversal, reserved Windows names, and duplicate names are handled before export.
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MASTERING_EXPORT_POLICIES.map((policy) => (
              <div key={policy.id} className="rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs text-slate-300">
                <div className="font-bold text-slate-100">{policy.label}</div>
                <p className="mt-1 leading-5 text-slate-400">{policy.userMessage}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 p-5">
          <div className="flex items-center gap-2 text-rose-100">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="font-display text-lg font-bold">Output Verification</h3>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {selectedChain.verificationRequirements.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className={`h-3.5 w-3.5 ${lastVerification?.ok ? "text-emerald-300" : "text-slate-500"}`} />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs leading-5 text-slate-400">
            {lastVerification?.message ?? "No output is marked complete until Electron verifies a real non-empty file."}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/35 p-5">
          <h3 className="font-display text-lg font-bold text-slate-100">Reference Match / Batch</h3>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs leading-5 text-slate-400">
              <div className="font-bold text-slate-100">Reference Match</div>
              {REFERENCE_MATCH_POLICY.userMessage}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs leading-5 text-slate-400">
              <div className="font-bold text-slate-100">Batch mastering</div>
              {BATCH_MASTERING_POLICY.status.replace(/_/g, " ")}. Failed files must be skipped and reported; originals
              stay untouched.
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs leading-5 text-slate-400">
              <div className="font-bold text-slate-100">Cloud mastering</div>
              {CLOUD_MASTERING_POLICY.userMessage}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 p-5">
          <h3 className="font-display text-lg font-bold text-slate-100">History / Recent Masters</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            History tracks source file, output file, mastering goal, settings, backend, measured analysis when available,
            output verification, created date, status, and error code.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3">
            {(historyRecords.length > 0
              ? historyRecords.slice(0, 3)
              : [
                  createMasteringHistoryRecord({
                    historyId: "mastering-history-empty",
                    sourceFile: inputPath,
                    sourceDuration: formatDuration(inputAnalysis?.durationSeconds),
                    outputFile: lastOutputPath,
                    settings,
                    processingBackend: "not_configured",
                    outputVerification:
                      lastVerification ??
                      verifyMasteringOutput({
                        outputPath: `${outputFolder ?? "C:/OpenStem/Masters"}/${filenamePreview}`,
                        selectedOutputFolder: outputFolder ?? "C:/OpenStem/Masters",
                        expectedExtension: `.${outputFormat}`,
                        fileExists: false,
                        sizeBytes: 0,
                        nativeWriteVerified: false,
                        processingReturnedSuccess: false,
                      }),
                    beforeAfterReport,
                  }),
                ]).map((record) => (
              <div key={record.historyId} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{record.exportStatus}</div>
                <div className="mt-1 break-all text-xs font-bold text-slate-100">
                  {record.outputFile ?? "Output Missing"}
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-400">
                  Backend: {record.processingBackend}. Error: {record.errorCode ?? "none"}.
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Open output folder", "Replay before/after", "Rerun mastering", "Export as new copy"].map((action) => (
              <button
                key={action}
                type="button"
                disabled={action !== "Open output folder" || !outputFolder}
                onClick={action === "Open output folder" ? openFolder : undefined}
                className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 disabled:text-slate-600"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
