// Centralized UVR Architecture Type System
// Matches strict type annotations, standard enums, and structured modules.

export type OutputFormat = "WAV" | "FLAC" | "MP3";

export type ProcessingStatus = "idle" | "validating" | "running" | "completed" | "cancelled" | "error";

export type ModelSourceStatus =
  | "verified"
  | "verified_local"
  | "configured_not_checked"
  | "download_available"
  | "reachable"
  | "needs_verification"
  | "custom_unverified"
  | "custom_hash_unavailable"
  | "auth_required"
  | "gated_or_private"
  | "access_denied"
  | "broken_link"
  | "rate_limited"
  | "source_unavailable"
  | "network_unavailable"
  | "dns_failed"
  | "timeout"
  | "unavailable"
  | "missing_hash"
  | "hash_mismatch"
  | "manual_import_required"
  | "unsupported_backend"
  | "experimental";

export interface ModelRegistryEntry {
  id: string;
  name: string;
  architecture: "VR" | "MDX-Net" | "Demucs" | "RoFormer" | "MDXC" | "Ensemble" | "Custom";
  filePath: string;
  stemType: "vocals" | "instrumental" | "4stem" | "variable";
  gpuSupport: boolean;
  memoryRisk: "low" | "med" | "high";
  downloaded: boolean;
  description: string;
  fileSize: string;
  downloadUrl?: string;
  license?: string;

  // Model Source Registry metadata
  sourceType?:
    | "hugging_face_repo"
    | "hugging_face_space"
    | "github_release"
    | "github_raw"
    | "manual_import"
    | "unknown";
  sourceUrl?: string;
  checksum?: string;
  expectedSizeBytes?: number;
  requiredBackend?: "python-pytorch" | "onnxruntime" | "audio-separator" | "cpu-dsp";
  supportedExtensions?: string[];
  verifiedStatus?: ModelSourceStatus;
  gpuSupportStatus?: "yes" | "no" | "unknown";
  updateAvailable?: boolean;
  catalogLane?: "curated" | "custom";
  userNotes?: string;
  actualSha256?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ModelProofEligibilityReason =
  | "hash_verified"
  | "missing_file"
  | "hash_mismatch"
  | "missing_hash"
  | "hash_missing"
  | "custom_unverified"
  | "custom_hash_unavailable"
  | "source_missing"
  | "needs_verification"
  | "auth_required"
  | "gated_or_private"
  | "access_denied"
  | "rate_limited"
  | "source_unavailable"
  | "network_unavailable"
  | "dns_failed"
  | "timeout"
  | "unavailable"
  | "broken_link"
  | "unsupported_backend"
  | "license_missing"
  | "manual_import_required"
  | "size_mismatch";

export interface ModelProofEligibility {
  proofEligible: boolean;
  reason: ModelProofEligibilityReason;
  displayMessage: string;
  diagnosticCode?: string;
}

export interface ProcessMethod {
  id: string;
  name: string;
  category: "VR Architecture" | "MDX-Net" | "Demucs v3" | "Ensemble Mode" | "Advanced Models" | "Custom Models";
  description: string;
  defaultModelId: string;
}

export interface SettingSchemaEntry {
  key: string;
  label: string;
  type: "select" | "slider" | "number" | "toggle";
  allowedValues?: (string | number)[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue: string | number | boolean;
  helpText: string;
  compatibilityConditions?: string; // Rules description for settings
  utilityRule?: string;
}

export interface AppState {
  selectedInputs: string[]; // List of multiple files to fully support manual/spectrogram ensembles
  selectedOutputFolder: string;
  processMethodId: string; // From PROCESS_METHODS config
  selectedModelId: string; // From ModelRegistry
  selectedEnsembleId: string; // Specific ensemble sub-modes
  outputFormat: OutputFormat;

  // Granular settings schemas
  dropdownSettings: {
    chunks: string;
    noiseReduction: string;
    executionDevice: "cpu" | "cuda" | "directml" | "auto" | "mps" | "dml";
    cpuThreads: number;
    segmentSize: string;
  };

  checkboxSettings: {
    ttaActive: boolean;
    postProcessActive: boolean;
    saveVocalsOnly: boolean; // Also maps to "Stem Only"
    saveInstrumentalOnly: boolean; // Also maps to "Mix without Stem Only"
    splitMode: boolean; // Auto chunks
    saveAllOutputs: boolean; // Only for preset ensembles
    modelTestMode: boolean; // Model comparing feature
    saveNoiseyOutput: boolean;
    highPrecisionWeights: boolean;
    sameAsInputFolder?: boolean; // Toggles output folder to [SAME AS INPUT FOLDER]
    createFolderPerTrack?: boolean; // Creates a subfolder for each track
  };

  processingStatus: ProcessingStatus;
  progress: number;
  consoleLogs: string[];
}

// Structured request object that the UI produces for backend separation engine consumption
export interface ProcessingRequest {
  inputs: string[];
  outputFolder: string;
  format: OutputFormat;
  model: ModelRegistryEntry;
  verifiedModelLocalPath?: string;
  method: ProcessMethod;
  processMethod?: string;
  userSelectedMode?: "ai" | "ffmpeg";
  selectedDevice?: "cpu" | "cuda" | "directml" | "auto" | "mps" | "dml";
  customPythonPath?: string;
  customFFmpegPath?: string;
  parameters: {
    chunks: string;
    noiseReduction: string;
    executionDevice: "cpu" | "cuda" | "directml" | "auto" | "mps" | "dml";
    cpuThreads: number;
    segmentSize: string;
  };
  options: {
    ttaActive: boolean;
    postProcessActive: boolean;
    vocalsOnly: boolean;
    instrumentalOnly: boolean;
    splitMode: boolean;
    saveAllOutputs: boolean;
    modelTestMode: boolean;
    createFolderPerTrack?: boolean;
  };
  timestamp: string;
}

export type TranscriptionReadinessCode =
  | "WHISPER_MODEL_MISSING"
  | "WHISPER_MODEL_INSTALLED_NOT_VERIFIED"
  | "WHISPER_MODEL_HASH_VERIFIED"
  | "WHISPER_BACKEND_NOT_INSTALLED"
  | "WHISPER_BACKEND_READY"
  | "WHISPER_FFMPEG_MISSING"
  | "TRANSCRIPTION_INPUT_MISSING"
  | "TRANSCRIPTION_OUTPUT_FOLDER_MISSING"
  | "TRANSCRIPTION_READY"
  | "TRANSCRIPTION_RUNNING"
  | "TRANSCRIPTION_COMPLETE"
  | "TRANSCRIPTION_FAILED"
  | "TRANSCRIPTION_DRY_RUN_ONLY"
  | "TRANSCRIPTION_BROWSER_PREVIEW_ONLY"
  | "TRANSCRIPTION_CANCELED"
  | "DIARIZATION_BACKEND_MISSING"
  | "DIARIZATION_MODEL_MISSING"
  | "PDF_EXPORT_NOT_READY"
  | "PDF_EXPORT_COMPLETE"
  | "PDF_OUTPUT_NOT_VERIFIED"
  | "TRANSCRIPT_OUTPUT_NOT_VERIFIED";

export type TranscriptionExportFormat =
  | "pdf"
  | "docx"
  | "txt"
  | "srt"
  | "vtt"
  | "csv"
  | "json"
  | "html";

export type WhisperModelSize =
  | "tiny"
  | "tiny.en"
  | "base"
  | "base.en"
  | "small"
  | "small.en"
  | "medium"
  | "medium.en"
  | "large"
  | "large-v2"
  | "large-v3"
  | "turbo";

export type ClinicalPromptReadinessCode =
  | "CLINICAL_BROWSER_PREVIEW_ONLY"
  | "CLINICAL_TRANSCRIPT_INPUT_MISSING"
  | "LOCAL_LLM_NOT_CONFIGURED"
  | "LOCAL_LLM_READY"
  | "LOCAL_LLM_MODEL_MISSING"
  | "LOCAL_LLM_CONTEXT_TOO_SMALL"
  | "LOCAL_LLM_RUN_FAILED"
  | "LOCAL_LLM_OUTPUT_NOT_VERIFIED"
  | "CLINICAL_LLM_NOT_CONFIGURED"
  | "CLINICAL_LLM_PROVIDER_NOT_RUNNING"
  | "CLINICAL_LLM_MODEL_MISSING"
  | "CLINICAL_LLM_MODEL_READY"
  | "CLINICAL_LLM_PROOF_RUNNING"
  | "CLINICAL_LLM_PROOF_PASSED"
  | "CLINICAL_LLM_PROOF_FAILED"
  | "CLINICAL_LLM_OUTPUT_EMPTY"
  | "CLINICAL_LLM_OUTPUT_FORMAT_FAILED"
  | "CLINICAL_LLM_INSUFFICIENT_EVIDENCE"
  | "CLINICAL_LLM_DRAFT_ONLY"
  | "CLOUD_LLM_DISABLED"
  | "CLOUD_LLM_REQUIRES_EXPLICIT_CONSENT"
  | "CLOUD_LLM_BAA_REQUIRED"
  | "CLINICAL_OUTPUT_DRAFT_ONLY"
  | "CLINICAL_INSUFFICIENT_EVIDENCE"
  | "CLINICAL_HISTORY_METADATA_ONLY"
  | "CLINICAL_EXPORT_NOT_VERIFIED";

export type ClinicalLocalModelTier =
  | "laptop_fast"
  | "balanced_quality"
  | "clinical_language_review"
  | "custom_local_model";

export type ClinicalLocalModelProvider = "ollama" | "llama.cpp" | "gpt4all" | "cloud" | "custom_local";

export type ClinicalLocalModelProviderState =
  | "OLLAMA_NOT_INSTALLED"
  | "OLLAMA_NOT_RUNNING"
  | "OLLAMA_READY"
  | "OLLAMA_MODEL_MISSING"
  | "OLLAMA_MODEL_READY"
  | "OLLAMA_MODEL_PULL_REQUIRED"
  | "OLLAMA_RUN_FAILED"
  | "LLAMA_CPP_NOT_CONFIGURED"
  | "LLAMA_CPP_READY"
  | "GGUF_MODEL_MISSING"
  | "GGUF_MODEL_READY"
  | "GPT4ALL_REFERENCE_ONLY"
  | "GPT4ALL_RUNTIME_NOT_CONFIGURED"
  | "GPT4ALL_RUNTIME_READY"
  | "CLOUD_LLM_DISABLED"
  | "CLOUD_LLM_REQUIRES_EXPLICIT_CONSENT"
  | "CLOUD_LLM_BAA_REQUIRED";

export type ClinicalLocalModelInstallState =
  | "catalog-visible"
  | "provider-managed"
  | "installed"
  | "provider-ready"
  | "manually-imported"
  | "hash-unavailable"
  | "hash-verified"
  | "proof-of-concept-passed"
  | "not-for-diagnosis"
  | "draft-only";

export type ClinicalHistoryMode = "disabled" | "metadata_only" | "full_local_opt_in";

export type ClinicalCloudConsentState = "disabled" | "requires_baa_and_consent" | "ready_with_baa";

export interface ClinicalPromptSection {
  id: string;
  title: string;
  prompt: string;
  requiredPrefix: string;
  outputStatus: ClinicalPromptReadinessCode;
}

export interface ClinicalPromptWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  sections: ClinicalPromptSection[];
  clinicianReviewRequired: boolean;
}

export interface ClinicalPromptSectionResult {
  sectionId: string;
  status: ClinicalPromptReadinessCode;
  text: string;
  verified: boolean;
}

export type TranscriptionInputMode =
  | "single_file"
  | "multiple_files"
  | "video_file"
  | "directory"
  | "recursive_directory";

export interface TranscriptionHistoryEntry {
  transcriptId: string;
  sourceFilePath: string;
  sourceFileName: string;
  sourceDurationSeconds?: number;
  sourceSizeBytes?: number;
  modelUsed: WhisperModelSize;
  backendUsed: "openai-whisper" | "faster-whisper" | "whisper.cpp" | "whisperx" | "not_run";
  language: string;
  task: "transcribe" | "translate";
  startedAt: string;
  completedAt?: string;
  outputFolder: string;
  outputFiles: Partial<Record<TranscriptionExportFormat, string>>;
  status: TranscriptionReadinessCode;
  errorCode?: TranscriptionReadinessCode;
  transcriptTextPath?: string;
  pdfPath?: string;
  subtitlePath?: string;
  notes?: string;
  sessionName?: string;
  sessionNumber?: string;
}
