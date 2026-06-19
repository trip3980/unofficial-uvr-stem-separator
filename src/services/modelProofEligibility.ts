import { ModelProofEligibility, ModelRegistryEntry } from "../types";

export interface ModelVerificationLike {
  exists?: boolean;
  status?: string;
  hashChecked?: boolean;
  hashMatches?: boolean;
}

const SUPPORTED_PROOF_BACKENDS = new Set([
  "python-pytorch",
  "onnxruntime",
  "audio-separator",
  "cpu-dsp",
]);

export function normalizeExpectedSha256(model?: Partial<ModelRegistryEntry> & Record<string, any>): string | null {
  const raw =
    model?.checksum ||
    model?.expectedSha256 ||
    model?.expected_sha256 ||
    model?.sha256;
  if (!raw) return null;
  return String(raw).trim().replace(/^sha256[:_]/i, "").toLowerCase();
}

function hasUsableLicense(model: Partial<ModelRegistryEntry>): boolean {
  const license = String(model.license || "").trim().toLowerCase();
  return !!license && license !== "unknown" && license !== "needs verification";
}

export function getModelProofEligibility(
  model: Partial<ModelRegistryEntry> | undefined,
  verification: ModelVerificationLike = {},
): ModelProofEligibility {
  const status = verification.status || model?.verifiedStatus;
  const expectedSha256 = normalizeExpectedSha256(model as any);

  if (status === "hash_mismatch" || model?.verifiedStatus === "hash_mismatch") {
    return {
      proofEligible: false,
      reason: "hash_mismatch",
      displayMessage: "A local model with a hash mismatch must not be used for proof, release claims, or verified status.",
    };
  }

  if (status === "size_mismatch") {
    return {
      proofEligible: false,
      reason: "size_mismatch",
      displayMessage: "The local model file size does not match expected integrity metadata.",
    };
  }

  if (model?.verifiedStatus === "broken_link" || status === "broken_link") {
    return {
      proofEligible: false,
      reason: "broken_link",
      displayMessage: "A model source returning HTTP 401 or another unavailable response must be treated as unavailable until source metadata is corrected.",
    };
  }

  if (model?.verifiedStatus === "unsupported_backend" || (model?.requiredBackend && !SUPPORTED_PROOF_BACKENDS.has(model.requiredBackend))) {
    return {
      proofEligible: false,
      reason: "unsupported_backend",
      displayMessage: "The selected model backend is not supported by the current OpenStem proof path.",
    };
  }

  if (model?.architecture === "Ensemble") {
    return {
      proofEligible: false,
      reason: "unsupported_backend",
      displayMessage: "Ensemble presets are workflow plans, not single model weight files for CPU AI proof.",
    };
  }

  if (model && !hasUsableLicense(model)) {
    return {
      proofEligible: false,
      reason: "license_missing",
      displayMessage: "Model license metadata is missing or unknown; proof eligibility requires usable source/license metadata.",
    };
  }

  if (verification.exists === false || status === "missing") {
    return {
      proofEligible: false,
      reason: "missing_file",
      displayMessage: "CPU AI proof is blocked until the selected model file exists locally and matches the expected SHA-256.",
    };
  }

  if (model?.sourceType === "manual_import" && !expectedSha256) {
    return {
      proofEligible: false,
      reason: "manual_import_required",
      displayMessage: "Manual import requires verifiable source metadata and a matching expected SHA-256 before proof can run.",
    };
  }

  if (!model?.downloadUrl && !model?.sourceUrl && model?.sourceType !== "manual_import" && model?.architecture !== "Custom") {
    return {
      proofEligible: false,
      reason: "source_missing",
      displayMessage: "Model source metadata is missing; source integrity cannot be verified.",
    };
  }

  if (!expectedSha256 || status === "installed_hash_unavailable" || verification.hashChecked === false) {
    return {
      proofEligible: false,
      reason: "hash_missing",
      displayMessage: "CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.",
    };
  }

  if (status === "hash_verified" && verification.hashMatches === true) {
    return {
      proofEligible: true,
      reason: "hash_verified",
      displayMessage: "Model is proof-eligible because its local SHA-256 matches expected source integrity metadata.",
    };
  }

  return {
    proofEligible: false,
    reason: "missing_file",
    displayMessage: "Model proof eligibility has not been established by local hash verification.",
  };
}
