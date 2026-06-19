import { ModelRegistryEntry } from "../types";

/**
 * Registry integrity validator (Rule 5 & 6)
 * Validates model registry entries to guard against source-integrity risks, fake links, missing hashes, or fake statuses.
 */
export function validateModelEntry(entry: ModelRegistryEntry): string[] {
  const errors: string[] = [];

  // 1. Missing Filename
  if (!entry.name || entry.name.trim() === "") {
    errors.push(`Model ${entry.id}: Missing filename (name).`);
  }

  // 2. Missing License
  if (!entry.license || entry.license.trim() === "") {
    errors.push(`Model ${entry.id}: Missing license metadata.`);
  }

  // 3. Check for fake, placeholder, or guessed URLs
  const fakePatterns = [
    "example.com",
    "placeholder",
    "fakeurl",
    "guessed",
    "test.com",
    "localhost",
    "dummy"
  ];

  if (entry.downloadUrl) {
    const urlLower = entry.downloadUrl.toLowerCase();
    if (fakePatterns.some(pattern => urlLower.includes(pattern))) {
      errors.push(`Model ${entry.id}: Contains fake or placeholder download URL.`);
    }
  }

  if (entry.sourceUrl) {
    const urlLower = entry.sourceUrl.toLowerCase();
    if (fakePatterns.some(pattern => urlLower.includes(pattern))) {
      errors.push(`Model ${entry.id}: Contains fake or placeholder source URL.`);
    }
  }

  // 4. Missing source URL for remote models (excluding manual_import or unknown models)
  const isRemote = entry.id !== "multi_ai_ensemble_preset" && 
                   entry.id !== "manual_ensemble_preset" && 
                   entry.architecture !== "Ensemble" &&
                   entry.sourceType !== "manual_import" && 
                   entry.sourceType !== "unknown";

  if (isRemote && !entry.downloadUrl && !entry.sourceUrl) {
    errors.push(`Model ${entry.id}: Downloadable model is missing download / source URL.`);
  }

  // 5. Missing or malformed hash
  // SHA-256 is 64 hex characters (optionally prefixed by algo or of format "sha256_xxxx")
  const hashRegex = /^(sha256_)?([a-fA-F0-9]{24,128})$/;
  
  if (entry.checksum) {
    if (!hashRegex.test(entry.checksum)) {
      errors.push(`Model ${entry.id}: Hash "${entry.checksum}" is malformed. Must be a valid hex string representing a checksum.`);
    }
  } else {
    // If it is marked as "verified", we MUST have a hash
    if (entry.verifiedStatus === "verified" && isRemote) {
      errors.push(`Model ${entry.id}: Marked as verified but contains a missing checksum.`);
    }
  }

  // 6. Fake "verified" status
  if (entry.verifiedStatus === "verified") {
    if (isRemote && !entry.checksum) {
      errors.push(`Model ${entry.id}: Fake verified status - missing checksum.`);
    }
    if (isRemote && !entry.downloadUrl) {
      errors.push(`Model ${entry.id}: Fake verified status - missing download URL.`);
    }
    const hasUnsuportedBackend = entry.requiredBackend && 
      !["python-pytorch", "onnxruntime", "audio-separator", "cpu-dsp"].includes(entry.requiredBackend);
    if (hasUnsuportedBackend) {
      errors.push(`Model ${entry.id}: Fake verified status - uses an unsupported backend.`);
    }
  }

  // 7. Unsupported backend marked as available
  if (entry.requiredBackend) {
    const validBackends = ["python-pytorch", "onnxruntime", "audio-separator", "cpu-dsp"];
    if (!validBackends.includes(entry.requiredBackend)) {
      errors.push(`Model ${entry.id}: Declares unsupported backend "${entry.requiredBackend}".`);
    }
  }

  return errors;
}

/**
 * Validates the entire Model Registry.
 * Returns a map of model IDs to their list of validation failures (if any).
 */
export function validateModelRegistry(models: ModelRegistryEntry[]): Map<string, string[]> {
  const allErrors = new Map<string, string[]>();
  for (const model of models) {
    const errors = validateModelEntry(model);
    if (errors.length > 0) {
      allErrors.set(model.id, errors);
    }
  }
  return allErrors;
}
