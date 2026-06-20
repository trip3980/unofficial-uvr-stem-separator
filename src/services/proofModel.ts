export const GOLDEN_PROOF_MODEL_ID = "golden_cpu_proof_model";

export interface GoldenProofModelManifest {
  proof_model_id: string;
  display_name: string;
  model_family?: string;
  filename: string;
  architecture: string;
  backend: string;
  source_project: string;
  source_url: string;
  license: string;
  expected_sha256: string;
  expected_size_bytes: number | null;
  expected_size_min_bytes?: number | null;
  expected_size_max_bytes?: number | null;
  local_path: string;
  backend_compatibility?: string;
  cpu_compatibility?: boolean;
  expected_output_stems?: string[];
  supported_proof_command?: string;
  manual_placement_note?: string;
  notes: string;
}

export interface ProofModelLocalFileState {
  exists: boolean;
  actualSha256?: string;
  sizeBytes?: number | null;
  filename?: string;
}

export interface ProofModelRuntimeState {
  backendAvailable?: boolean;
  inputAudioAvailable?: boolean;
  outputFolderWritable?: boolean;
}

export interface GoldenProofModelEvaluation {
  proofModelConfigured: boolean;
  localFileExists: boolean;
  expectedSha256Present: boolean;
  actualSha256Matches: boolean;
  sourceLicenseDocumented: boolean;
  backendSupportsModel: boolean;
  cpuCompatible: boolean;
  backendAvailable: boolean;
  inputAudioAvailable: boolean;
  outputFolderWritable: boolean;
  modelProofEligible: boolean;
  proofReady: boolean;
  e2eProofPassed: false;
  statusLabel: string;
  diagnosticCodes: string[];
  blockers: string[];
}

export interface GoldenProofModelManifestValidation {
  ok: boolean;
  errors: string[];
}

const SUPPORTED_CPU_PROOF_ARCHITECTURES = new Set(["VR", "MDX-Net", "Demucs", "RoFormer", "MDXC", "Custom"]);

export function normalizeSha256(value?: string | null): string {
  return String(value || "")
    .trim()
    .replace(/^sha256[:_]/i, "")
    .toLowerCase();
}

export function isValidSha256(value?: string | null): boolean {
  return /^[a-f0-9]{64}$/.test(normalizeSha256(value));
}

function hasUsableLicense(license?: string): boolean {
  const normalized = String(license || "")
    .trim()
    .toLowerCase();
  return !!normalized && normalized !== "unknown" && normalized !== "needs verification";
}

function isSupportedBackend(backend?: string): boolean {
  const normalized = String(backend || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  return normalized === "audio-separator" || normalized === "audio separator";
}

function cleanString(value?: string | null): string {
  return String(value || "").trim();
}

function isPositiveInteger(value?: number | null): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function manifestBasename(value?: string | null): string {
  const cleaned = cleanString(value).replace(/\\/g, "/");
  return cleaned.split("/").filter(Boolean).pop() || "";
}

function hasValidSizeMetadata(manifest?: GoldenProofModelManifest | null): boolean {
  if (!manifest) return false;
  if (isPositiveInteger(manifest.expected_size_bytes)) return true;
  return (
    isPositiveInteger(manifest.expected_size_min_bytes) &&
    isPositiveInteger(manifest.expected_size_max_bytes) &&
    Number(manifest.expected_size_min_bytes) <= Number(manifest.expected_size_max_bytes)
  );
}

function localSizeMatchesExpected(
  manifest: GoldenProofModelManifest | null | undefined,
  sizeBytes?: number | null,
): boolean {
  if (!manifest || typeof sizeBytes !== "number") return false;
  if (isPositiveInteger(manifest.expected_size_bytes)) {
    return sizeBytes === manifest.expected_size_bytes;
  }
  if (isPositiveInteger(manifest.expected_size_min_bytes) && isPositiveInteger(manifest.expected_size_max_bytes)) {
    return (
      sizeBytes >= Number(manifest.expected_size_min_bytes) && sizeBytes <= Number(manifest.expected_size_max_bytes)
    );
  }
  return false;
}

export function validateGoldenProofModelManifest(
  manifest?: GoldenProofModelManifest | null,
): GoldenProofModelManifestValidation {
  if (!manifest) {
    return { ok: false, errors: ["Golden proof model manifest is not configured."] };
  }

  const errors: string[] = [];
  const requiredTextFields: Array<[keyof GoldenProofModelManifest, string]> = [
    ["proof_model_id", "proof_model_id"],
    ["display_name", "display_name"],
    ["filename", "filename"],
    ["architecture", "architecture"],
    ["backend", "backend"],
    ["license", "license"],
    ["expected_sha256", "expected_sha256"],
    ["local_path", "local_path"],
  ];

  for (const [field, label] of requiredTextFields) {
    if (!cleanString(manifest[field] as string)) {
      errors.push(`${label} is required.`);
    }
  }

  if (cleanString(manifest.filename) && manifestBasename(manifest.filename) !== cleanString(manifest.filename)) {
    errors.push("filename must be a filename only, not a path.");
  }
  if (!isValidSha256(manifest.expected_sha256)) {
    errors.push("expected_sha256 must be a 64-character SHA-256 hex value.");
  }
  if (!hasValidSizeMetadata(manifest)) {
    errors.push("expected_size_bytes or expected_size_min_bytes/expected_size_max_bytes is required.");
  }
  if (!hasUsableLicense(manifest.license)) {
    errors.push("license must be documented and usable.");
  }
  if (!isSupportedBackend(manifest.backend)) {
    errors.push("backend must be audio-separator for the current CPU proof lane.");
  }
  if (!SUPPORTED_CPU_PROOF_ARCHITECTURES.has(cleanString(manifest.architecture))) {
    errors.push("architecture is not supported by the current CPU proof lane.");
  }
  if (manifest.cpu_compatibility !== true) {
    errors.push("cpu_compatibility must be true for the current proof lane.");
  }
  if (!Array.isArray(manifest.expected_output_stems) || manifest.expected_output_stems.length === 0) {
    errors.push("expected_output_stems must list the stems the proof command should verify.");
  }
  if (!cleanString(manifest.supported_proof_command)) {
    errors.push("supported_proof_command is required.");
  }
  if (!hasDocumentedProofModelSource(manifest)) {
    errors.push("source project, source URL/manual provenance, or notes must document model origin.");
  }

  return { ok: errors.length === 0, errors };
}

export function hasDocumentedProofModelSource(manifest?: GoldenProofModelManifest | null): boolean {
  if (!manifest) return false;
  return !!(
    hasUsableLicense(manifest.license) &&
    (String(manifest.source_url || "").trim() ||
      String(manifest.source_project || "").trim() ||
      String(manifest.notes || "").trim())
  );
}

export function evaluateGoldenProofModel(
  manifest?: GoldenProofModelManifest | null,
  localFile: ProofModelLocalFileState = { exists: false },
  runtime: ProofModelRuntimeState = {},
): GoldenProofModelEvaluation {
  const expectedSha256 = normalizeSha256(manifest?.expected_sha256);
  const actualSha256 = normalizeSha256(localFile.actualSha256);
  const manifestValidation = validateGoldenProofModelManifest(manifest);
  const expectedSha256Present = isValidSha256(expectedSha256);
  const localFileExists = !!localFile.exists;
  const actualSha256Matches = localFileExists && expectedSha256Present && actualSha256 === expectedSha256;
  const filenameMatches =
    !manifest ||
    !localFileExists ||
    !localFile.filename ||
    !manifest.filename ||
    manifestBasename(localFile.filename) === manifestBasename(manifest.filename);
  const sizeMatchesExpected = localFileExists && localSizeMatchesExpected(manifest, localFile.sizeBytes);
  const sourceLicenseDocumented = hasDocumentedProofModelSource(manifest);
  const backendSupportsModel =
    !!manifest &&
    isSupportedBackend(manifest.backend) &&
    SUPPORTED_CPU_PROOF_ARCHITECTURES.has(String(manifest.architecture || ""));
  const cpuCompatible = backendSupportsModel && manifest?.cpu_compatibility !== false;
  const backendAvailable = runtime.backendAvailable === true;
  const inputAudioAvailable = runtime.inputAudioAvailable === true;
  const outputFolderWritable = runtime.outputFolderWritable === true;
  const modelProofEligible =
    !!manifest &&
    localFileExists &&
    manifestValidation.ok &&
    filenameMatches &&
    sizeMatchesExpected &&
    expectedSha256Present &&
    actualSha256Matches &&
    sourceLicenseDocumented &&
    backendSupportsModel &&
    cpuCompatible;
  const proofReady = modelProofEligible && backendAvailable && inputAudioAvailable && outputFolderWritable;
  const diagnosticCodes: string[] = [];
  const blockers: string[] = [];

  if (!manifest) {
    diagnosticCodes.push("PROOF_MODEL_MISSING");
    blockers.push("Golden proof model manifest is not configured.");
  } else {
    if (!manifestValidation.ok) {
      diagnosticCodes.push("PROOF_MODEL_MANIFEST_INVALID");
      blockers.push(...manifestValidation.errors);
    }
    if (!sourceLicenseDocumented) {
      diagnosticCodes.push("MODEL_SOURCE_UNAVAILABLE");
      blockers.push("Source project, source URL/manual provenance, or usable license is missing.");
    }
    if (!expectedSha256Present) {
      diagnosticCodes.push("MODEL_METADATA_MISSING_HASH");
      blockers.push("Expected SHA-256 is missing or invalid.");
    }
    if (!localFileExists) {
      diagnosticCodes.push("MODEL_LOCAL_FILE_MISSING");
      blockers.push("Local proof model file is missing.");
    }
    if (localFileExists && expectedSha256Present && !actualSha256Matches) {
      diagnosticCodes.push("MODEL_LOCAL_HASH_MISMATCH");
      blockers.push("Actual local SHA-256 does not match expected SHA-256.");
    }
    if (localFileExists && !filenameMatches) {
      diagnosticCodes.push("PROOF_MODEL_FILENAME_MISMATCH");
      blockers.push("Local proof model filename does not match the manifest filename.");
    }
    if (localFileExists && !sizeMatchesExpected) {
      diagnosticCodes.push("PROOF_MODEL_SIZE_MISMATCH");
      blockers.push("Local proof model size does not match manifest size metadata.");
    }
    if (!backendSupportsModel) {
      diagnosticCodes.push("PROOF_BACKEND_MISSING");
      blockers.push("Model backend or architecture is not supported by the current CPU proof lane.");
    }
    if (!cpuCompatible) {
      diagnosticCodes.push("RUNTIME_PYTORCH_MISSING");
      blockers.push("CPU compatibility is not confirmed.");
    }
  }

  if (modelProofEligible) {
    if (!backendAvailable) {
      diagnosticCodes.push("RUNTIME_PYTHON_MISSING");
      blockers.push("Python/audio-separator/PyTorch/FFmpeg backend is not available.");
    }
    if (!inputAudioAvailable) {
      diagnosticCodes.push("INPUT_FILE_MISSING");
      blockers.push("Proof input audio is missing.");
    }
    if (!outputFolderWritable) {
      diagnosticCodes.push("OUTPUT_FOLDER_MISSING");
      blockers.push("Proof output folder is missing or not writable.");
    }
  }

  let statusLabel = "Golden proof model missing";
  if (manifest && !expectedSha256Present) {
    statusLabel = "Golden proof model not ready - expected SHA-256 match required";
  } else if (manifest && !localFileExists) {
    statusLabel = "Golden proof model not ready - local file missing";
  } else if (manifest && localFileExists && expectedSha256Present && !actualSha256Matches) {
    statusLabel = "Golden proof model not ready - hash mismatch";
  } else if (manifest && localFileExists && (!manifestValidation.ok || !filenameMatches || !sizeMatchesExpected)) {
    statusLabel = "Golden proof model not ready - manifest metadata mismatch";
  } else if (modelProofEligible && !proofReady) {
    statusLabel = "Golden proof model hash verified - runtime proof prerequisites missing";
  } else if (proofReady) {
    statusLabel = "Golden proof model ready for CPU E2E proof";
  }

  return {
    proofModelConfigured: !!manifest,
    localFileExists,
    expectedSha256Present,
    actualSha256Matches,
    sourceLicenseDocumented,
    backendSupportsModel,
    cpuCompatible,
    backendAvailable,
    inputAudioAvailable,
    outputFolderWritable,
    modelProofEligible,
    proofReady,
    e2eProofPassed: false,
    statusLabel,
    diagnosticCodes: Array.from(new Set(diagnosticCodes)),
    blockers: Array.from(new Set(blockers)),
  };
}
