import { ModelProofEligibility, ModelRegistryEntry } from "../types";
import { getDiagnosticCodeForProofReason } from "./diagnosticCodes";

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

const SOURCE_STATUS_MESSAGES: Partial<Record<string, string>> = {
  auth_required:
    "This source returned HTTP 401. It may require Hugging Face authentication, approved access, or corrected source metadata. OpenStem will not download or use this model for proof until the source is legitimately accessible and the local file passes SHA-256 verification.",
  gated_or_private:
    "This source returned HTTP 403. Access is denied or gated. OpenStem will not download or use this model until legitimate access and verification are available.",
  access_denied:
    "This source returned HTTP 403. Access is denied or gated. OpenStem will not download or use this model until legitimate access and verification are available.",
  rate_limited:
    "This source returned HTTP 429. OpenStem will keep this model blocked until source access can be checked without rate limiting and local SHA-256 verification passes.",
  source_unavailable:
    "The source could not be reached. OpenStem will keep this model blocked until source metadata and access are verified.",
  network_unavailable:
    "The model source check could not reach the network. This is different from HTTP 401; retry connectivity before changing source metadata.",
  dns_failed:
    "DNS lookup failed while checking this model source. This is a connectivity or domain-resolution problem, not proof eligibility.",
  timeout:
    "The model source check timed out. Retry diagnostics before treating the source as broken or proof-eligible.",
  unavailable:
    "The source is unavailable. OpenStem will keep this model blocked until source metadata and access are verified.",
  broken_link:
    "This source returned HTTP 404 / Not Found. Correct the source metadata before download or proof.",
  missing_hash:
    "The source may be reachable, but expected SHA-256 metadata is missing. This model is not proof-eligible.",
  needs_verification:
    "Source metadata is present but not verified. Import or reconnect a local file and match SHA-256 before proof.",
  custom_unverified:
    "Custom model metadata is registered, but the local file has not matched the expected SHA-256.",
  custom_hash_unavailable:
    "Custom model is missing expected SHA-256 metadata. It can be kept for experiments but cannot satisfy proof.",
};

const SOURCE_BLOCKING_STATUSES = new Set(Object.keys(SOURCE_STATUS_MESSAGES));

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
      diagnosticCode: getDiagnosticCodeForProofReason("hash_mismatch"),
    };
  }

  if (status === "size_mismatch") {
    return {
      proofEligible: false,
      reason: "size_mismatch",
      displayMessage: "The local model file size does not match expected integrity metadata.",
      diagnosticCode: getDiagnosticCodeForProofReason("size_mismatch"),
    };
  }

  if (model?.verifiedStatus === "unsupported_backend" || (model?.requiredBackend && !SUPPORTED_PROOF_BACKENDS.has(model.requiredBackend))) {
    return {
      proofEligible: false,
      reason: "unsupported_backend",
      displayMessage: "The selected model backend is not supported by the current OpenStem proof path.",
      diagnosticCode: getDiagnosticCodeForProofReason("unsupported_backend"),
    };
  }

  if (model?.architecture === "Ensemble") {
    return {
      proofEligible: false,
      reason: "unsupported_backend",
      displayMessage: "Ensemble presets are workflow plans, not single model weight files for CPU AI proof.",
      diagnosticCode: "ENSEMBLE_PLANNER_ONLY",
    };
  }

  if (model && !hasUsableLicense(model)) {
    return {
      proofEligible: false,
      reason: "license_missing",
      displayMessage: "Model license metadata is missing or unknown; proof eligibility requires usable source/license metadata.",
      diagnosticCode: getDiagnosticCodeForProofReason("license_missing"),
    };
  }

  if (verification.exists === false || status === "missing") {
    return {
      proofEligible: false,
      reason: "missing_file",
      displayMessage: "CPU AI proof is blocked until the selected model file exists locally and matches the expected SHA-256.",
      diagnosticCode: getDiagnosticCodeForProofReason("missing_file"),
    };
  }

  if (model?.sourceType === "manual_import" && !expectedSha256) {
    return {
      proofEligible: false,
      reason: "manual_import_required",
      displayMessage: "Manual import requires verifiable source metadata and a matching expected SHA-256 before proof can run.",
      diagnosticCode: getDiagnosticCodeForProofReason("manual_import_required"),
    };
  }

  if (!model?.downloadUrl && !model?.sourceUrl && model?.sourceType !== "manual_import" && model?.architecture !== "Custom") {
    return {
      proofEligible: false,
      reason: "source_missing",
      displayMessage: "Model source metadata is missing; source integrity cannot be verified.",
      diagnosticCode: getDiagnosticCodeForProofReason("source_missing"),
    };
  }

  if (!expectedSha256 || status === "installed_hash_unavailable") {
    return {
      proofEligible: false,
      reason: "hash_missing",
      displayMessage: "CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.",
      diagnosticCode: getDiagnosticCodeForProofReason("hash_missing"),
    };
  }

  if (status === "hash_verified" && verification.hashMatches === true) {
    return {
      proofEligible: true,
      reason: "hash_verified",
      displayMessage: "Model is proof-eligible because its local SHA-256 matches expected source integrity metadata.",
      diagnosticCode: undefined,
    };
  }

  const blockingSourceStatus = [status, model?.verifiedStatus].find((value) =>
    value ? SOURCE_BLOCKING_STATUSES.has(value) : false,
  );
  if (blockingSourceStatus) {
    return {
      proofEligible: false,
      reason: blockingSourceStatus as ModelProofEligibility["reason"],
      displayMessage: SOURCE_STATUS_MESSAGES[blockingSourceStatus] as string,
      diagnosticCode: getDiagnosticCodeForProofReason(blockingSourceStatus),
    };
  }

  if (verification.hashChecked === false) {
    return {
      proofEligible: false,
      reason: "hash_missing",
      displayMessage: "CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.",
      diagnosticCode: getDiagnosticCodeForProofReason("hash_missing"),
    };
  }

  return {
    proofEligible: false,
    reason: "missing_file",
    displayMessage: "Model proof eligibility has not been established by local hash verification.",
    diagnosticCode: getDiagnosticCodeForProofReason("missing_file"),
  };
}
