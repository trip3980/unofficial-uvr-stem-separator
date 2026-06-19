// Centralized UVR Architecture Type System
// Matches strict type annotations, standard enums, and structured modules.

export type OutputFormat = "WAV" | "FLAC" | "MP3";

export type ProcessingStatus =
  | "idle"
  | "validating"
  | "running"
  | "completed"
  | "cancelled"
  | "error";

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
  sourceType?: "hugging_face_repo" | "hugging_face_space" | "github_release" | "github_raw" | "manual_import" | "unknown";
  sourceUrl?: string;
  checksum?: string;
  expectedSizeBytes?: number;
  requiredBackend?: "python-pytorch" | "onnxruntime" | "audio-separator" | "cpu-dsp";
  supportedExtensions?: string[];
  verifiedStatus?: 'verified' | 'needs_verification' | 'unavailable' | 'broken_link' | 'missing_hash' | 'hash_mismatch' | 'unsupported_backend' | 'experimental';
  gpuSupportStatus?: "yes" | "no" | "unknown";
  updateAvailable?: boolean;
}

export type ModelProofEligibilityReason =
  | "hash_verified"
  | "missing_file"
  | "hash_mismatch"
  | "hash_missing"
  | "source_missing"
  | "broken_link"
  | "unsupported_backend"
  | "license_missing"
  | "manual_import_required"
  | "size_mismatch";

export interface ModelProofEligibility {
  proofEligible: boolean;
  reason: ModelProofEligibilityReason;
  displayMessage: string;
}

export interface ProcessMethod {
  id: string;
  name: string;
  category:
    | "VR Architecture"
    | "MDX-Net"
    | "Demucs v3"
    | "Ensemble Mode"
    | "Advanced Models"
    | "Custom Models";
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
