export type MasteringDiagnosticCode =
  | "MASTERING_INPUT_MISSING"
  | "MASTERING_OUTPUT_FOLDER_MISSING"
  | "MASTERING_ANALYSIS_NOT_STARTED"
  | "MASTERING_ANALYSIS_RUNNING"
  | "MASTERING_ANALYSIS_COMPLETE"
  | "MASTERING_ANALYSIS_FAILED"
  | "MASTERING_LOUDNESS_NOT_MEASURED"
  | "MASTERING_CLIPPING_WARNING"
  | "MASTERING_READY"
  | "MASTERING_RUNNING"
  | "MASTERING_COMPLETE"
  | "MASTERING_FAILED"
  | "MASTERING_OUTPUT_NOT_VERIFIED"
  | "MASTERING_EXPORT_READY"
  | "MASTERING_EXPORT_RUNNING"
  | "MASTERING_EXPORT_COMPLETE"
  | "MASTERING_EXPORT_FAILED"
  | "MASTERING_OVERWRITE_BLOCKED"
  | "MASTERING_SAVED_AS_NEW_COPY"
  | "WEB_AUDIO_PROCESSING_READY"
  | "WEB_AUDIO_PROCESSING_FAILED"
  | "MASTERING_FFMPEG_REQUIRED"
  | "MASTERING_FFMPEG_MISSING"
  | "MASTERING_BACKEND_NOT_IMPLEMENTED"
  | "MATCHERING_REFERENCE_MISSING"
  | "MATCHERING_BACKEND_NOT_CONFIGURED"
  | "MATCHERING_READY"
  | "MATCHERING_RUNNING"
  | "MATCHERING_COMPLETE"
  | "MATCHERING_FAILED"
  | "MATCHERING_OUTPUT_NOT_VERIFIED";

export type MasteringModeId =
  | "gentle_master"
  | "balanced_master"
  | "loud_master"
  | "streaming_ready"
  | "voice_dialogue"
  | "podcast_dialogue"
  | "reference_match"
  | "custom";

export type MasteringIntensity = "low" | "medium" | "high";
export type MasteringOutputFormat = "wav" | "flac" | "mp3";
export type MasteringProcessingBackend = "web_audio_worker" | "web_audio_renderer" | "ffmpeg" | "not_configured";
export type MasteringOverwritePolicy =
  | "never_overwrite"
  | "ask_before_overwrite"
  | "overwrite_previous_export"
  | "save_new_copy_with_suffix";

export interface MasteringMode {
  id: MasteringModeId;
  label: string;
  description: string;
  defaultIntensity: MasteringIntensity;
  targetLufs: number | null;
  peakCeilingDb: number;
  preserveDynamics: boolean;
  ffmpegRequired: boolean;
  implemented: boolean;
  backendStatus: "ffmpeg_single_file_ready" | "planned_requires_backend" | "planned_requires_matchering";
}

export interface MasteringSettings {
  modeId: MasteringModeId;
  intensity: MasteringIntensity;
  targetLufs: number | null;
  peakCeilingDb: number;
  preserveDynamics: boolean;
  outputFormat: MasteringOutputFormat;
  overwritePolicy: MasteringOverwritePolicy;
}

export interface MasteringReadinessInput {
  inputPath: string | null;
  outputFolder: string | null;
  processingBackendReady: boolean;
  ffmpegReady: boolean;
  modeId: MasteringModeId;
}

export interface MasteringReadiness {
  status: "blocked" | "ready" | "planned";
  diagnosticCode: MasteringDiagnosticCode;
  userMessage: string;
  blockers: MasteringDiagnosticCode[];
}

export interface MasteringOutputVerificationInput {
  outputPath: string;
  selectedOutputFolder: string;
  expectedExtension: string;
  fileExists: boolean;
  sizeBytes: number;
  nativeWriteVerified: boolean;
  processingReturnedSuccess: boolean;
  userChoseOutsideFolder?: boolean;
}

export interface MasteringOutputVerification {
  ok: boolean;
  diagnosticCode: MasteringDiagnosticCode;
  verified: boolean;
  message: string;
}

export interface MasteringAnalysisValue {
  measured: boolean;
  value: number | null;
  unit: "LUFS" | "dBTP" | "dBFS";
}

export interface MasteringFileAnalysis {
  path: string;
  fileName: string;
  durationSeconds: number | null;
  sampleRate: number | null;
  channels: number | null;
  formatName: string | null;
  containerFormat: string | null;
  sizeBytes: number | null;
  peakDbfs: number | null;
  peakMeasured: boolean;
  integratedLufs: number | null;
  loudnessMeasured: boolean;
  truePeakDbtp: number | null;
  truePeakMeasured: boolean;
  clippingWarning: boolean;
  diagnosticCode: MasteringDiagnosticCode;
  userMessage: string;
}

export interface MasteringBeforeAfterReport {
  inputLoudness: MasteringAnalysisValue;
  outputLoudness: MasteringAnalysisValue;
  inputPeak: MasteringAnalysisValue;
  outputPeak: MasteringAnalysisValue;
  message: string;
}

export interface MasteringHistoryRecord {
  historyId: string;
  sourceFile: string | null;
  sourceDuration: string | null;
  outputFile: string | null;
  masteringMode: MasteringModeId;
  settings: MasteringSettings;
  processingBackend: MasteringProcessingBackend;
  beforeAnalysis: MasteringBeforeAfterReport["inputLoudness"] | null;
  afterAnalysis: MasteringBeforeAfterReport["outputLoudness"] | null;
  exportStatus: MasteringDiagnosticCode;
  outputVerification: MasteringOutputVerification;
  createdDate: string;
  errorCode: MasteringDiagnosticCode | null;
}

export const WEB_AUDIO_MASTERING_REFERENCE = {
  repoUrl: "https://github.com/entrepeneur4lyf/Web-Audio-Mastering",
  inspectedCommit: "a71d08b9da51488d90899ebdea17e15d19f73eae",
  license: "ISC",
  adaptedConcepts: [
    "drag/drop-style audio intake concept",
    "FX on/off before-after comparison",
    "cached render/export parity",
    "Web Worker DSP rendering",
    "LUFS and true-peak analysis",
    "WAV export with verification requirement added by OpenStem",
  ],
  copiedSourceFiles: [] as string[],
} as const;

export const MASTERING_MODES: MasteringMode[] = [
  {
    id: "gentle_master",
    label: "Gentle Music Master",
    description: "Make a music mix a little more even while preserving dynamics.",
    defaultIntensity: "low",
    targetLufs: -16,
    peakCeilingDb: -1.5,
    preserveDynamics: true,
    ffmpegRequired: true,
    implemented: true,
    backendStatus: "ffmpeg_single_file_ready",
  },
  {
    id: "balanced_master",
    label: "Balanced Master",
    description: "Make a music mix louder and more even while preserving dynamics.",
    defaultIntensity: "medium",
    targetLufs: -14,
    peakCeilingDb: -1,
    preserveDynamics: true,
    ffmpegRequired: true,
    implemented: true,
    backendStatus: "ffmpeg_single_file_ready",
  },
  {
    id: "loud_master",
    label: "Loud Modern Master",
    description: "Create a louder copy with stricter peak control.",
    defaultIntensity: "high",
    targetLufs: -10,
    peakCeilingDb: -1,
    preserveDynamics: false,
    ffmpegRequired: true,
    implemented: true,
    backendStatus: "ffmpeg_single_file_ready",
  },
  {
    id: "streaming_ready",
    label: "Streaming Ready",
    description: "Create a measured copy aimed at a common streaming loudness target.",
    defaultIntensity: "medium",
    targetLufs: -14,
    peakCeilingDb: -1,
    preserveDynamics: true,
    ffmpegRequired: true,
    implemented: true,
    backendStatus: "ffmpeg_single_file_ready",
  },
  {
    id: "voice_dialogue",
    label: "Voice / Speech Cleanup",
    description: "Make spoken audio more consistent and easier to hear.",
    defaultIntensity: "medium",
    targetLufs: -16,
    peakCeilingDb: -2,
    preserveDynamics: true,
    ffmpegRequired: true,
    implemented: true,
    backendStatus: "ffmpeg_single_file_ready",
  },
  {
    id: "podcast_dialogue",
    label: "Podcast / Dialogue",
    description: "Level spoken audio for podcast, narration, or interview delivery.",
    defaultIntensity: "medium",
    targetLufs: -16,
    peakCeilingDb: -2,
    preserveDynamics: true,
    ffmpegRequired: true,
    implemented: true,
    backendStatus: "ffmpeg_single_file_ready",
  },
  {
    id: "reference_match",
    label: "Reference Match",
    description: "Use another track as a rough loudness and tone reference.",
    defaultIntensity: "medium",
    targetLufs: null,
    peakCeilingDb: -1,
    preserveDynamics: true,
    ffmpegRequired: true,
    implemented: false,
    backendStatus: "planned_requires_matchering",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Adjust settings manually after the single-file safe path is stable.",
    defaultIntensity: "medium",
    targetLufs: -14,
    peakCeilingDb: -1,
    preserveDynamics: true,
    ffmpegRequired: true,
    implemented: false,
    backendStatus: "planned_requires_backend",
  },
];

export const DEFAULT_MASTERING_SETTINGS: MasteringSettings = {
  modeId: "balanced_master",
  intensity: "medium",
  targetLufs: -14,
  peakCeilingDb: -1,
  preserveDynamics: true,
  outputFormat: "wav",
  overwritePolicy: "ask_before_overwrite",
};

export const MASTERING_FILENAME_TEMPLATE = "{source_basename}_mastered_{date}_{time}_{mode}.{ext}";

const RESERVED_WINDOWS_NAMES = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
]);
const INVALID_FILENAME_CHARACTERS = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);

export function getMasteringMode(modeId: MasteringModeId): MasteringMode {
  return MASTERING_MODES.find((mode) => mode.id === modeId) ?? MASTERING_MODES[1];
}

export function getDefaultMasteringSettings(modeId: MasteringModeId = "balanced_master"): MasteringSettings {
  const mode = getMasteringMode(modeId);
  return {
    ...DEFAULT_MASTERING_SETTINGS,
    modeId,
    intensity: mode.defaultIntensity,
    targetLufs: mode.targetLufs,
    peakCeilingDb: mode.peakCeilingDb,
    preserveDynamics: mode.preserveDynamics,
  };
}

export function evaluateMasteringReadiness(input: MasteringReadinessInput): MasteringReadiness {
  const blockers: MasteringDiagnosticCode[] = [];
  const mode = getMasteringMode(input.modeId);

  if (!input.inputPath) blockers.push("MASTERING_INPUT_MISSING");
  if (!input.outputFolder) blockers.push("MASTERING_OUTPUT_FOLDER_MISSING");
  if (mode.ffmpegRequired && !input.ffmpegReady) blockers.push("MASTERING_FFMPEG_MISSING");
  if (mode.backendStatus === "planned_requires_matchering") {
    blockers.push("MATCHERING_BACKEND_NOT_CONFIGURED");
  } else if (mode.backendStatus === "planned_requires_backend" || !input.processingBackendReady) {
    blockers.push("MASTERING_BACKEND_NOT_IMPLEMENTED");
  }

  if (blockers.length > 0) {
    return {
      status: input.inputPath && input.outputFolder ? "planned" : "blocked",
      diagnosticCode: blockers[0],
      userMessage:
        blockers[0] === "MATCHERING_BACKEND_NOT_CONFIGURED"
          ? "Reference Match is planned and requires a verified Matchering-style backend before it can run."
          : blockers[0] === "MASTERING_BACKEND_NOT_IMPLEMENTED"
          ? "Mastering workflow is scaffolded. Web Audio or FFmpeg processing must be wired before Run Mastering can create files."
          : blockers[0] === "MASTERING_FFMPEG_MISSING"
            ? "FFmpeg is required for this mastering goal. Select or install FFmpeg before running."
          : "Select input audio, choose an output folder, and verify the processing backend before mastering.",
      blockers,
    };
  }

  return {
    status: "ready",
    diagnosticCode: "MASTERING_READY",
    userMessage: "Mastering can run with the verified local FFmpeg path and will create a new copy.",
    blockers: [],
  };
}

export function sanitizeMasteringFilenameToken(value: string): string {
  const sanitized = value
    .split("")
    .map((char) => (INVALID_FILENAME_CHARACTERS.has(char) || char.charCodeAt(0) < 32 ? "_" : char))
    .join("")
    .replace(/\.+$/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .slice(0, 96);
  const fallback = sanitized.length > 0 ? sanitized : "audio";
  return RESERVED_WINDOWS_NAMES.has(fallback.toLowerCase()) ? `${fallback}_file` : fallback;
}

export function buildMasteringFilename(input: {
  sourceBasename: string;
  safeTitle?: string;
  date: string;
  time: string;
  mode: MasteringModeId;
  intensity: MasteringIntensity;
  format: MasteringOutputFormat;
  version?: number;
}): string {
  const modeToken = sanitizeMasteringFilenameToken(input.mode);
  const ext = sanitizeMasteringFilenameToken(input.format.toLowerCase());
  const tokens: Record<string, string> = {
    source_basename: sanitizeMasteringFilenameToken(input.sourceBasename.replace(/\.[^.]+$/, "")),
    safe_title: sanitizeMasteringFilenameToken(input.safeTitle ?? input.sourceBasename.replace(/\.[^.]+$/, "")),
    date: sanitizeMasteringFilenameToken(input.date),
    time: sanitizeMasteringFilenameToken(input.time),
    mode: modeToken,
    intensity: sanitizeMasteringFilenameToken(input.intensity),
    format: ext,
    version: String(input.version ?? 1),
    ext,
  };

  return MASTERING_FILENAME_TEMPLATE.replace(/\{([^}]+)\}/g, (_, token: string) => tokens[token] ?? "audio");
}

export function verifyMasteringOutput(input: MasteringOutputVerificationInput): MasteringOutputVerification {
  const normalizedPath = input.outputPath.replace(/\\/g, "/").toLowerCase();
  const normalizedFolder = input.selectedOutputFolder.replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();
  const extensionMatches = normalizedPath.endsWith(input.expectedExtension.toLowerCase());
  const insideFolder = normalizedPath.startsWith(`${normalizedFolder}/`) || input.userChoseOutsideFolder === true;

  if (!input.processingReturnedSuccess) {
    return {
      ok: false,
      diagnosticCode: "MASTERING_FAILED",
      verified: false,
      message: "Processing did not return success. No mastered output is verified.",
    };
  }

  if (!input.nativeWriteVerified) {
    return {
      ok: false,
      diagnosticCode: "MASTERING_OUTPUT_NOT_VERIFIED",
      verified: false,
      message: "Browser/Web Audio output is not a verified native file until Electron confirms the write.",
    };
  }

  if (!input.fileExists || input.sizeBytes <= 0 || !extensionMatches || !insideFolder) {
    return {
      ok: false,
      diagnosticCode: "MASTERING_OUTPUT_NOT_VERIFIED",
      verified: false,
      message: "Mastered output requires existing file, nonzero size, expected extension, and approved folder.",
    };
  }

  return {
    ok: true,
    diagnosticCode: "MASTERING_EXPORT_COMPLETE",
    verified: true,
    message: "Mastered output verified on disk.",
  };
}

export function createUnmeasuredMasteringAnalysis(path = "", fileName = "No file selected"): MasteringFileAnalysis {
  return {
    path,
    fileName,
    durationSeconds: null,
    sampleRate: null,
    channels: null,
    formatName: null,
    containerFormat: null,
    sizeBytes: null,
    peakDbfs: null,
    peakMeasured: false,
    integratedLufs: null,
    loudnessMeasured: false,
    truePeakDbtp: null,
    truePeakMeasured: false,
    clippingWarning: false,
    diagnosticCode: "MASTERING_ANALYSIS_NOT_STARTED",
    userMessage: "Analysis has not run yet.",
  };
}

export function getUnmeasuredMasteringReport(): MasteringBeforeAfterReport {
  const unmeasuredLoudness: MasteringAnalysisValue = { measured: false, value: null, unit: "LUFS" };
  const unmeasuredPeak: MasteringAnalysisValue = { measured: false, value: null, unit: "dBFS" };
  return {
    inputLoudness: unmeasuredLoudness,
    outputLoudness: unmeasuredLoudness,
    inputPeak: unmeasuredPeak,
    outputPeak: unmeasuredPeak,
    message: "Before/after loudness analysis not available yet.",
  };
}

function analysisValue(measured: boolean, value: number | null, unit: MasteringAnalysisValue["unit"]): MasteringAnalysisValue {
  return {
    measured,
    value: measured ? value : null,
    unit,
  };
}

export function buildMasteringBeforeAfterReport(input: {
  beforeAnalysis: MasteringFileAnalysis | null;
  afterAnalysis: MasteringFileAnalysis | null;
}): MasteringBeforeAfterReport {
  const inputLoudnessMeasured = !!input.beforeAnalysis?.loudnessMeasured;
  const outputLoudnessMeasured = !!input.afterAnalysis?.loudnessMeasured;
  const inputPeakMeasured = !!input.beforeAnalysis?.peakMeasured;
  const outputPeakMeasured = !!input.afterAnalysis?.peakMeasured;

  return {
    inputLoudness: analysisValue(inputLoudnessMeasured, input.beforeAnalysis?.integratedLufs ?? null, "LUFS"),
    outputLoudness: analysisValue(outputLoudnessMeasured, input.afterAnalysis?.integratedLufs ?? null, "LUFS"),
    inputPeak: analysisValue(inputPeakMeasured, input.beforeAnalysis?.peakDbfs ?? null, "dBFS"),
    outputPeak: analysisValue(outputPeakMeasured, input.afterAnalysis?.peakDbfs ?? null, "dBFS"),
    message:
      input.beforeAnalysis && input.afterAnalysis
        ? "Before/after report uses measured metadata where available. LUFS and true peak remain Not measured until a verified loudness analyzer is added."
        : "Before/after comparison requires input analysis and a verified mastered output.",
  };
}

export function createMasteringHistoryRecord(input: {
  historyId: string;
  sourceFile: string | null;
  sourceDuration: string | null;
  outputFile: string | null;
  settings: MasteringSettings;
  processingBackend: MasteringProcessingBackend;
  outputVerification: MasteringOutputVerification;
  beforeAfterReport?: MasteringBeforeAfterReport;
  createdDate?: string;
  errorCode?: MasteringDiagnosticCode | null;
}): MasteringHistoryRecord {
  return {
    historyId: input.historyId,
    sourceFile: input.sourceFile,
    sourceDuration: input.sourceDuration,
    outputFile: input.outputFile,
    masteringMode: input.settings.modeId,
    settings: input.settings,
    processingBackend: input.processingBackend,
    beforeAnalysis: input.beforeAfterReport?.inputLoudness ?? null,
    afterAnalysis: input.beforeAfterReport?.outputLoudness ?? null,
    exportStatus: input.outputVerification.diagnosticCode,
    outputVerification: input.outputVerification,
    createdDate: input.createdDate ?? "2026-01-01",
    errorCode: input.errorCode ?? (input.outputVerification.ok ? null : input.outputVerification.diagnosticCode),
  };
}

export function masteringDoesNotAffectReleaseGate(): string {
  return "Mastering Lab is audio finalization, not stem separation proof. It does not approve Beta Candidate and does not verify separator model weights.";
}
