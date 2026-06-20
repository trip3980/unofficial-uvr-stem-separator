import type {
  TranscriptionExportFormat,
  TranscriptionReadinessCode,
  WhisperModelSize,
} from "../types";

export type TranscriptionBackendId =
  | "openai-whisper"
  | "faster-whisper"
  | "whisper.cpp"
  | "whisperx"
  | "whisper-timestamped"
  | "stable-ts";

export interface WhisperModelOption {
  id: WhisperModelSize;
  family: "OpenAI Whisper";
  label: string;
  sizeLabel: string;
  approximateRamVram: string;
  speedEstimate: string;
  accuracyEstimate: string;
  languageSupport: string;
  cpuUsable: boolean;
  gpuRecommended: boolean;
  installedState: "missing" | "installed_not_verified" | "hash_verified";
  sourceLicenseStatus: string;
  proofBoundary: string;
}

export interface TranscriptionReadinessItem {
  code: TranscriptionReadinessCode;
  label: string;
  state: "blocked" | "warning" | "ready" | "info";
  message: string;
}

export interface TranscriptionReadinessInput {
  hasInput: boolean;
  hasOutputFolder: boolean;
  ffmpegReady: boolean;
  backendReady: boolean;
  nativeRunnerAvailable: boolean;
  modelState: "missing" | "installed_not_verified" | "hash_verified";
}

export interface TranscriptionExportFormatPolicy {
  id: TranscriptionExportFormat;
  label: string;
  status: "planned_not_active" | "available_after_native_runner";
  requiresTimestamps: boolean;
  completionRule: string;
}

export interface TranscriptionModePreset {
  id: "fast" | "balanced" | "accurate" | "maximum_accuracy";
  label: "Fast" | "Balanced" | "Accurate" | "Maximum Accuracy";
  modelHint: WhisperModelSize;
  status: "planned_not_active";
  note: string;
}

export interface TranscriptionLanguageOption {
  id: string;
  label: string;
  group: "auto" | "english" | "popular" | "more" | "other";
}

export const SUPPORTED_TRANSCRIPTION_INPUT_FORMATS = [
  "WAV",
  "MP3",
  "M4A",
  "MP4",
  "MOV",
  "AAC",
  "FLAC",
  "OGG",
  "OPUS",
  "WMA",
  "AIFF",
] as const;

export const TRANSCRIPTION_READINESS_CODES: TranscriptionReadinessCode[] = [
  "WHISPER_MODEL_MISSING",
  "WHISPER_MODEL_INSTALLED_NOT_VERIFIED",
  "WHISPER_MODEL_HASH_VERIFIED",
  "WHISPER_BACKEND_NOT_INSTALLED",
  "WHISPER_BACKEND_READY",
  "WHISPER_FFMPEG_MISSING",
  "TRANSCRIPTION_INPUT_MISSING",
  "TRANSCRIPTION_OUTPUT_FOLDER_MISSING",
  "TRANSCRIPTION_READY",
  "TRANSCRIPTION_RUNNING",
  "TRANSCRIPTION_COMPLETE",
  "TRANSCRIPTION_FAILED",
  "TRANSCRIPTION_DRY_RUN_ONLY",
  "TRANSCRIPTION_BROWSER_PREVIEW_ONLY",
  "TRANSCRIPTION_CANCELED",
  "DIARIZATION_BACKEND_MISSING",
  "DIARIZATION_MODEL_MISSING",
  "PDF_EXPORT_NOT_READY",
  "PDF_EXPORT_COMPLETE",
  "PDF_OUTPUT_NOT_VERIFIED",
  "TRANSCRIPT_OUTPUT_NOT_VERIFIED",
];

export const TRANSCRIPTION_MODE_PRESETS: TranscriptionModePreset[] = [
  {
    id: "fast",
    label: "Fast",
    modelHint: "base.en",
    status: "planned_not_active",
    note: "Quick local draft target once native transcription is wired.",
  },
  {
    id: "balanced",
    label: "Balanced",
    modelHint: "small",
    status: "planned_not_active",
    note: "Default accuracy/speed lane for everyday local transcription.",
  },
  {
    id: "accurate",
    label: "Accurate",
    modelHint: "medium",
    status: "planned_not_active",
    note: "Higher accuracy lane; GPU or patient CPU use may be needed.",
  },
  {
    id: "maximum_accuracy",
    label: "Maximum Accuracy",
    modelHint: "large-v3",
    status: "planned_not_active",
    note: "Highest planned local lane; requires documented model availability and hardware fit.",
  },
];

export const TRANSCRIPTION_LANGUAGE_OPTIONS: TranscriptionLanguageOption[] = [
  { id: "auto", label: "Auto Detect", group: "auto" },
  { id: "en", label: "English", group: "english" },
  { id: "en-us", label: "English US", group: "english" },
  { id: "en-gb", label: "English UK", group: "english" },
  { id: "es", label: "Spanish", group: "popular" },
  { id: "fr", label: "French", group: "popular" },
  { id: "de", label: "German", group: "popular" },
  { id: "pt", label: "Portuguese", group: "popular" },
  { id: "it", label: "Italian", group: "more" },
  { id: "ja", label: "Japanese", group: "more" },
  { id: "ko", label: "Korean", group: "more" },
  { id: "other", label: "Other languages", group: "other" },
];

export const TRANSCRIPTION_DASHBOARD_FOLDERS = [
  "All Files",
  "Uncategorized",
  "Interviews",
  "Meetings",
  "Media Review",
] as const;

export const TRANSCRIPTION_BULK_ACTIONS = [
  "Bulk Export - Planned / Not active",
  "Bulk Move - Planned / Not active",
  "Verify Outputs - Native required",
] as const;

export const TRANSCRIPTION_SPEAKER_COUNT_OPTIONS = [
  "Detect Automatically",
  "2 speakers",
  "3 speakers",
  "4 speakers",
  "5 speakers",
  "6 speakers",
  "7 speakers",
  "8 speakers",
] as const;

export const WHISPER_MODEL_OPTIONS: WhisperModelOption[] = [
  {
    id: "tiny",
    family: "OpenAI Whisper",
    label: "tiny",
    sizeLabel: "39M parameters",
    approximateRamVram: "~1 GB VRAM / low RAM",
    speedEstimate: "Fastest draft mode",
    accuracyEstimate: "Lowest accuracy",
    languageSupport: "Multilingual",
    cpuUsable: true,
    gpuRecommended: false,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "tiny.en",
    family: "OpenAI Whisper",
    label: "tiny.en",
    sizeLabel: "39M parameters",
    approximateRamVram: "~1 GB VRAM / low RAM",
    speedEstimate: "Fastest English draft mode",
    accuracyEstimate: "Lowest accuracy, English-optimized",
    languageSupport: "English-only",
    cpuUsable: true,
    gpuRecommended: false,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "base",
    family: "OpenAI Whisper",
    label: "base",
    sizeLabel: "74M parameters",
    approximateRamVram: "~1 GB VRAM / low RAM",
    speedEstimate: "Fast",
    accuracyEstimate: "Quick draft accuracy",
    languageSupport: "Multilingual",
    cpuUsable: true,
    gpuRecommended: false,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "base.en",
    family: "OpenAI Whisper",
    label: "base.en",
    sizeLabel: "74M parameters",
    approximateRamVram: "~1 GB VRAM / low RAM",
    speedEstimate: "Fast English draft",
    accuracyEstimate: "Quick draft accuracy, English-optimized",
    languageSupport: "English-only",
    cpuUsable: true,
    gpuRecommended: false,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "small",
    family: "OpenAI Whisper",
    label: "small",
    sizeLabel: "244M parameters",
    approximateRamVram: "~2 GB VRAM / moderate RAM",
    speedEstimate: "Balanced",
    accuracyEstimate: "Everyday accuracy",
    languageSupport: "Multilingual",
    cpuUsable: true,
    gpuRecommended: false,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "small.en",
    family: "OpenAI Whisper",
    label: "small.en",
    sizeLabel: "244M parameters",
    approximateRamVram: "~2 GB VRAM / moderate RAM",
    speedEstimate: "Balanced English",
    accuracyEstimate: "Everyday accuracy, English-optimized",
    languageSupport: "English-only",
    cpuUsable: true,
    gpuRecommended: false,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "medium",
    family: "OpenAI Whisper",
    label: "medium",
    sizeLabel: "769M parameters",
    approximateRamVram: "~5 GB VRAM / high RAM",
    speedEstimate: "Slow on CPU",
    accuracyEstimate: "High accuracy",
    languageSupport: "Multilingual",
    cpuUsable: true,
    gpuRecommended: true,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "medium.en",
    family: "OpenAI Whisper",
    label: "medium.en",
    sizeLabel: "769M parameters",
    approximateRamVram: "~5 GB VRAM / high RAM",
    speedEstimate: "Slow on CPU",
    accuracyEstimate: "High accuracy, English-optimized",
    languageSupport: "English-only",
    cpuUsable: true,
    gpuRecommended: true,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "large",
    family: "OpenAI Whisper",
    label: "large",
    sizeLabel: "1.55B parameters",
    approximateRamVram: "~10 GB VRAM / high RAM",
    speedEstimate: "Slowest",
    accuracyEstimate: "Highest standard accuracy",
    languageSupport: "Multilingual",
    cpuUsable: true,
    gpuRecommended: true,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "large-v2",
    family: "OpenAI Whisper",
    label: "large-v2",
    sizeLabel: "1.55B parameters",
    approximateRamVram: "~10 GB VRAM / high RAM",
    speedEstimate: "Very slow on CPU",
    accuracyEstimate: "High accuracy, previous large checkpoint",
    languageSupport: "Multilingual",
    cpuUsable: true,
    gpuRecommended: true,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "large-v3",
    family: "OpenAI Whisper",
    label: "large-v3",
    sizeLabel: "1.55B parameters",
    approximateRamVram: "~10 GB VRAM / high RAM",
    speedEstimate: "Very slow on CPU",
    accuracyEstimate: "Highest planned accuracy lane",
    languageSupport: "Multilingual",
    cpuUsable: true,
    gpuRecommended: true,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
  {
    id: "turbo",
    family: "OpenAI Whisper",
    label: "turbo",
    sizeLabel: "809M parameters",
    approximateRamVram: "~6 GB VRAM / high RAM",
    speedEstimate: "Fast large-v3-derived mode",
    accuracyEstimate: "Strong transcription accuracy, translation not supported",
    languageSupport: "Multilingual transcription",
    cpuUsable: true,
    gpuRecommended: true,
    installedState: "missing",
    sourceLicenseStatus: "Source/license metadata required before verified use",
    proofBoundary: "Transcription model readiness is separate from separator model readiness.",
  },
];

export const TRANSCRIPTION_EXPORT_FORMAT_POLICIES: TranscriptionExportFormatPolicy[] = [
  {
    id: "pdf",
    label: "PDF",
    status: "planned_not_active",
    requiresTimestamps: false,
    completionRule:
      "PDF export is complete only after the file exists, file size is greater than 0, and expected path matches output.",
  },
  {
    id: "docx",
    label: "DOCX",
    status: "planned_not_active",
    requiresTimestamps: false,
    completionRule:
      "DOCX export requires a stable local exporter and nonzero output file verification.",
  },
  {
    id: "txt",
    label: "TXT",
    status: "available_after_native_runner",
    requiresTimestamps: false,
    completionRule:
      "TXT export requires native transcription output and nonzero file verification.",
  },
  {
    id: "json",
    label: "JSON",
    status: "available_after_native_runner",
    requiresTimestamps: false,
    completionRule:
      "JSON export must include backend, model, status, errors, and verified output path metadata.",
  },
  {
    id: "srt",
    label: "SRT",
    status: "planned_not_active",
    requiresTimestamps: true,
    completionRule:
      "SRT export requires segment timestamps from the backend and nonzero output file verification.",
  },
  {
    id: "vtt",
    label: "VTT",
    status: "planned_not_active",
    requiresTimestamps: true,
    completionRule:
      "VTT export requires segment timestamps from the backend and nonzero output file verification.",
  },
  {
    id: "csv",
    label: "CSV",
    status: "planned_not_active",
    requiresTimestamps: true,
    completionRule:
      "CSV export should contain structured segment rows only after timestamped backend output exists.",
  },
  {
    id: "html",
    label: "HTML",
    status: "planned_not_active",
    requiresTimestamps: false,
    completionRule:
      "HTML export must be local, self-contained, and verified as a nonzero output file.",
  },
];

export const TRANSCRIPTION_BACKEND_OPTIONS: {
  id: TranscriptionBackendId;
  label: string;
  state: "planned_not_active" | "reference_only";
  note: string;
}[] = [
  {
    id: "openai-whisper",
    label: "OpenAI Whisper",
    state: "planned_not_active",
    note: "Python and FFmpeg required for local execution.",
  },
  {
    id: "faster-whisper",
    label: "faster-whisper / CTranslate2",
    state: "planned_not_active",
    note: "Useful first native runner candidate after model verification.",
  },
  {
    id: "whisper.cpp",
    label: "whisper.cpp",
    state: "reference_only",
    note: "Strong future candidate for packaged native binaries after license and build strategy are documented.",
  },
  {
    id: "whisperx",
    label: "WhisperX",
    state: "reference_only",
    note: "Word timestamps and diarization require extra dependencies and optional gated models.",
  },
  {
    id: "whisper-timestamped",
    label: "whisper-timestamped",
    state: "reference_only",
    note: "Word timestamps and confidence require separate dependency validation.",
  },
  {
    id: "stable-ts",
    label: "stable-ts",
    state: "reference_only",
    note: "Timestamp refinement requires separate dependency validation.",
  },
];

export function getDefaultTranscriptionReadiness(): TranscriptionReadinessItem[] {
  return evaluateTranscriptionReadiness({
    hasInput: false,
    hasOutputFolder: false,
    ffmpegReady: false,
    backendReady: false,
    nativeRunnerAvailable: false,
    modelState: "missing",
  });
}

export function evaluateTranscriptionReadiness(input: TranscriptionReadinessInput): TranscriptionReadinessItem[] {
  const items: TranscriptionReadinessItem[] = [];

  if (!input.nativeRunnerAvailable) {
    items.push({
      code: "TRANSCRIPTION_DRY_RUN_ONLY",
      label: "Browser Preview / Not runnable",
      state: "blocked",
      message: "Native transcription runner is Planned / Not active.",
    });
  }

  if (!input.hasInput) {
    items.push({
      code: "TRANSCRIPTION_INPUT_MISSING",
      label: "Input missing",
      state: "blocked",
      message: "Choose a real audio or video file through the native file picker before transcription can run.",
    });
  }

  if (!input.hasOutputFolder) {
    items.push({
      code: "TRANSCRIPTION_OUTPUT_FOLDER_MISSING",
      label: "Output folder missing",
      state: "blocked",
      message: "Choose a writable output folder before transcript files can be created.",
    });
  }

  if (!input.ffmpegReady) {
    items.push({
      code: "WHISPER_FFMPEG_MISSING",
      label: "FFmpeg required for audio/video decoding",
      state: "blocked",
      message: "FFmpeg required for audio/video decoding.",
    });
  }

  if (!input.backendReady) {
    items.push({
      code: "WHISPER_BACKEND_NOT_INSTALLED",
      label: "Whisper backend missing",
      state: "blocked",
      message: "Install and verify a local Whisper-family backend before native transcription can run.",
    });
  } else {
    items.push({
      code: "WHISPER_BACKEND_READY",
      label: "Whisper backend ready",
      state: "ready",
      message: "A native Whisper-family backend is available for transcription only.",
    });
  }

  if (input.modelState === "missing") {
    items.push({
      code: "WHISPER_MODEL_MISSING",
      label: "Whisper model missing",
      state: "blocked",
      message: "No local transcription model file is installed or verified.",
    });
  }

  if (input.modelState === "installed_not_verified") {
    items.push({
      code: "WHISPER_MODEL_INSTALLED_NOT_VERIFIED",
      label: "Whisper model installed / hash not verified",
      state: "blocked",
      message: "A local model file exists, but it is not trusted until SHA-256 verification passes.",
    });
  }

  if (input.modelState === "hash_verified") {
    items.push({
      code: "WHISPER_MODEL_HASH_VERIFIED",
      label: "Whisper model hash verified",
      state: "ready",
      message: "The selected transcription model has a matching local SHA-256.",
    });
  }

  const ready =
    input.nativeRunnerAvailable &&
    input.hasInput &&
    input.hasOutputFolder &&
    input.ffmpegReady &&
    input.backendReady &&
    input.modelState === "hash_verified";

  items.push({
    code: ready ? "TRANSCRIPTION_READY" : "TRANSCRIPT_OUTPUT_NOT_VERIFIED",
    label: ready ? "Transcription ready" : "Transcript output not verified",
    state: ready ? "ready" : "warning",
    message: ready
      ? "Native transcription can run, but completion still requires verified output files."
      : "No transcript, subtitle, or PDF output exists yet. Output success requires a real file with size greater than 0.",
  });

  return items;
}

export function transcriptionDoesNotAffectReleaseGate(): string {
  return "Transcription is not stem separation proof and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.";
}
