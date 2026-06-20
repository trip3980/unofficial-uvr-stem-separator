export type UpdateLaneId = "application" | "model_catalog" | "model_weights";

export interface OpenStemUpdateLane {
  id: UpdateLaneId;
  title: string;
  statusLabel: string;
  diagnosticCode: string;
  owner: string;
  userMessage: string;
  developerNextStep: string;
  verificationRequired: string[];
  allowedActions: string[];
  blockedActions: string[];
  autoInstallAllowed: boolean;
}

export const UPDATE_TRUST_REQUIREMENTS = [
  "HTTPS release or catalog source",
  "signed update manifest or documented trusted digest",
  "SHA-256 for every downloaded installer, catalog file, and model weight",
  "license/source metadata for every model entry",
  "user-visible prompt before install or replacement",
  "download into a temporary file before replacing local state",
  "post-download verification before marking any update usable",
];

export const OPENSTEM_UPDATE_PRINCIPLE =
  "OpenStem separates program updates, model-catalog metadata updates, and model-weight replacement. No lane may report ready, current, installed, or usable until its own manifest and verification checks pass.";

export const UPDATE_READINESS_LANES: OpenStemUpdateLane[] = [
  {
    id: "application",
    title: "Program Updates",
    statusLabel: "Planned / Not configured",
    diagnosticCode: "APP_UPDATE_BACKEND_NOT_CONFIGURED",
    owner: "Electron packaging and release pipeline",
    userMessage:
      "Program update checks are not active yet. Installers remain manual until OpenStem has a signed release manifest, installer hash verification, and a user-approved install flow.",
    developerNextStep:
      "Add a signed app-update manifest, verify installer SHA-256 before launch/install, and test packaged-app update checks on Windows before enabling this lane.",
    verificationRequired: [
      "release manifest fetched over HTTPS",
      "manifest signature or pinned digest verified",
      "installer SHA-256 matches manifest",
      "installed version compared with manifest version",
      "packaged app prompts before install",
      "rollback or manual recovery path documented",
    ],
    allowedActions: ["open releases page", "run packaged artifact verification", "manual installer install"],
    blockedActions: ["silent install", "background replacement", "claiming no updates before a check"],
    autoInstallAllowed: false,
  },
  {
    id: "model_catalog",
    title: "Model Catalog Updates",
    statusLabel: "Manifest required",
    diagnosticCode: "MODEL_UPDATE_MANIFEST_MISSING",
    owner: "Model registry and source-integrity workflow",
    userMessage:
      "Model catalog refresh is metadata-only until a trusted catalog manifest exists. Catalog metadata cannot make a model proof-eligible by itself.",
    developerNextStep:
      "Define a versioned catalog manifest with source URL, license, expected filename, expected size when known, expected SHA-256, backend, and source status for every changed entry.",
    verificationRequired: [
      "catalog manifest schema validates",
      "new or changed entries include license/source metadata",
      "expected SHA-256 values are present before proof eligibility",
      "source audit classifies HTTP/auth/network state",
      "registry validation passes",
    ],
    allowedActions: ["validate manifest", "audit model sources", "show metadata differences"],
    blockedActions: ["mark model usable from metadata alone", "hide auth-required or broken-link states"],
    autoInstallAllowed: false,
  },
  {
    id: "model_weights",
    title: "Model Weight Replacement",
    statusLabel: "Hash verification required",
    diagnosticCode: "MODEL_UPDATE_HASH_REQUIRED",
    owner: "Native model downloader and local model index",
    userMessage:
      "Model weights can be replaced only after the source is allowed, the expected SHA-256 is known, and the downloaded or reconnected local file matches that hash.",
    developerNextStep:
      "Use the native download/import path, stream to a partial temp file, compute SHA-256, update the local model index, and keep proof blocked until the local hash matches expected metadata.",
    verificationRequired: [
      "native Electron bridge available",
      "source status allows access",
      "expected SHA-256 exists",
      "download or reconnect writes a real local file",
      "actual SHA-256 matches expected SHA-256",
      "local index records verification status",
    ],
    allowedActions: ["manual import", "reconnect local file", "download only from verified source metadata"],
    blockedActions: ["trust filename only", "accept hash mismatch", "treat download completion as verification"],
    autoInstallAllowed: false,
  },
];

export function getOpenStemUpdateReadinessSummary(): string {
  return UPDATE_READINESS_LANES.map((lane) => `${lane.title}: ${lane.statusLabel} (${lane.diagnosticCode})`).join(
    " | ",
  );
}
