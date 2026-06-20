import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { MODEL_REGISTRY } from "../services/audioEngine";
import { getModelProofEligibility } from "../services/modelProofEligibility";
import { GoldenProofModelManifest, validateGoldenProofModelManifest } from "../services/proofModel";
import { ModelRegistryEntry } from "../types";

export const SUPPORTED_PROOF_MODEL_EXTENSIONS = new Set([".pth", ".onnx", ".ckpt", ".pt", ".safetensors"]);

export interface ProofModelSearchRoot {
  label: string;
  path: string;
  source: "openstem_user_data" | "legacy_migration" | "repo_ignored" | "configured_manifest" | "user_selected";
  exists: boolean;
}

export interface ProofModelCandidateFile {
  path: string;
  filename: string;
  sizeBytes: number;
  extension: string;
  architectureGuess: string;
  actualSha256: string;
}

export interface ProofModelCandidateResult extends ProofModelCandidateFile {
  registryModelId: string | null;
  registryArchitecture: string | null;
  registryStatus: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  license: string | null;
  expectedSha256: string | null;
  hashMatches: boolean | null;
  classification: "Hash verified" | "MODEL_LOCAL_HASH_MISMATCH" | "Installed / Hash unavailable";
  diagnosticCode: string | null;
  proofEligible: boolean;
  proofMessage: string;
}

export interface ConfiguredProofManifestMetadata {
  manifestPath: string;
  manifest: GoldenProofModelManifest;
  localPath: string;
  expectedSha256: string | null;
  validationErrors: string[];
}

interface ParsedArgs {
  folders: string[];
  json: boolean;
}

function normalizeSha256(value?: string | null): string | null {
  const normalized = String(value || "")
    .trim()
    .replace(/^sha256[:_]/i, "")
    .toLowerCase();
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

function parseArgs(argv: string[]): ParsedArgs {
  const folders: string[] = [];
  let json = false;
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--folder" && value) {
      folders.push(path.resolve(value));
      index++;
    } else if (key === "--json") {
      json = true;
    }
  }
  return { folders, json };
}

function safeReadJson(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function resolveManifestPathValue(manifestPath: string, rawPath?: string): string {
  const trimmed = String(rawPath || "").trim();
  if (!trimmed) return "";
  return path.isAbsolute(trimmed) ? path.resolve(trimmed) : path.resolve(path.dirname(manifestPath), trimmed);
}

function resolveManifestPath(rootDir: string, env: NodeJS.ProcessEnv): string | null {
  const configured = env.OPENSTEM_PROOF_MODEL_MANIFEST?.trim();
  if (configured) return path.resolve(configured);

  const localCandidates = [
    path.join(rootDir, "proof-model.local.json"),
    path.join(rootDir, "docs", "proof-model.local.json"),
  ];
  return localCandidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function loadConfiguredProofManifestMetadata(
  rootDir: string,
  env: NodeJS.ProcessEnv,
): ConfiguredProofManifestMetadata | null {
  const manifestPath = resolveManifestPath(rootDir, env);
  const manifest = manifestPath ? (safeReadJson(manifestPath) as GoldenProofModelManifest | null) : null;
  if (!manifestPath || !manifest) return null;
  return {
    manifestPath,
    manifest,
    localPath: resolveManifestPathValue(manifestPath, manifest.local_path),
    expectedSha256: normalizeSha256(manifest.expected_sha256),
    validationErrors: validateGoldenProofModelManifest(manifest).errors,
  };
}

function uniqueRoots(roots: Omit<ProofModelSearchRoot, "exists">[]): ProofModelSearchRoot[] {
  const seen = new Set<string>();
  const deduped: ProofModelSearchRoot[] = [];
  for (const root of roots) {
    const resolved = path.resolve(root.path);
    const key = resolved.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      ...root,
      path: resolved,
      exists: fs.existsSync(resolved) && fs.statSync(resolved).isDirectory(),
    });
  }
  return deduped;
}

export function getApprovedProofModelSearchRoots(
  rootDir = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
  userSelectedFolders: string[] = [],
): ProofModelSearchRoot[] {
  const appData = env.APPDATA || path.join(env.USERPROFILE || os.homedir(), "AppData", "Roaming");
  const roots: Omit<ProofModelSearchRoot, "exists">[] = [
    {
      label: "OpenStem Electron userData model library",
      path: path.join(appData, "openstem-ai-audio-workstation", "uvr_models"),
      source: "openstem_user_data",
    },
    {
      label: "Legacy unofficial UVR migration model library",
      path: path.join(appData, "unofficial-uvr-stem-separator", "uvr_models"),
      source: "legacy_migration",
    },
    {
      label: "Repo-local ignored uvr_models folder",
      path: path.join(rootDir, "uvr_models"),
      source: "repo_ignored",
    },
    {
      label: "Repo-local ignored models folder",
      path: path.join(rootDir, "models"),
      source: "repo_ignored",
    },
  ];

  const manifestPath = resolveManifestPath(rootDir, env);
  const manifest = manifestPath ? safeReadJson(manifestPath) : null;
  const localPath = String(manifest?.local_path || "").trim();
  if (localPath) {
    roots.push({
      label: "Configured proof manifest local file folder",
      path: path.dirname(
        path.isAbsolute(localPath) ? localPath : path.resolve(path.dirname(manifestPath as string), localPath),
      ),
      source: "configured_manifest",
    });
  }

  for (const folder of userSelectedFolders) {
    roots.push({
      label: "User-selected proof candidate folder",
      path: folder,
      source: "user_selected",
    });
  }

  return uniqueRoots(roots);
}

function computeSha256(filePath: string): string {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) {
        hash.update(bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function normalizeArchitectureGuess(value: string): string {
  return value === "MDX_Net" ? "MDX-Net" : value;
}

function collectCandidateFiles(searchRoot: ProofModelSearchRoot, maxDepth = 8): ProofModelCandidateFile[] {
  const candidates: ProofModelCandidateFile[] = [];
  if (!searchRoot.exists) return candidates;

  function walk(dirPath: string, depth: number): void {
    if (depth > maxDepth) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const resolved = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(resolved, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_PROOF_MODEL_EXTENSIONS.has(extension)) continue;
      const stats = fs.statSync(resolved);
      const relativeParts = path.relative(searchRoot.path, resolved).split(path.sep);
      const architectureGuess = normalizeArchitectureGuess(
        relativeParts.length > 1 ? relativeParts[0] : path.basename(path.dirname(resolved)),
      );
      candidates.push({
        path: resolved,
        filename: entry.name,
        sizeBytes: stats.size,
        extension,
        architectureGuess,
        actualSha256: computeSha256(resolved),
      });
    }
  }

  walk(searchRoot.path, 0);
  return candidates;
}

function findRegistryMatch(
  candidate: ProofModelCandidateFile,
  registry: ModelRegistryEntry[],
): ModelRegistryEntry | undefined {
  const filename = candidate.filename.toLowerCase();
  const sameName = registry.filter((model) => String(model.name).toLowerCase() === filename);
  return sameName.find((model) => model.architecture === candidate.architectureGuess) || sameName[0];
}

function sizeMatchesManifest(candidate: ProofModelCandidateFile, manifest: GoldenProofModelManifest): boolean {
  if (typeof manifest.expected_size_bytes === "number" && manifest.expected_size_bytes > 0) {
    return candidate.sizeBytes === manifest.expected_size_bytes;
  }

  if (
    typeof manifest.expected_size_min_bytes === "number" &&
    typeof manifest.expected_size_max_bytes === "number" &&
    manifest.expected_size_min_bytes > 0 &&
    manifest.expected_size_max_bytes >= manifest.expected_size_min_bytes
  ) {
    return (
      candidate.sizeBytes >= manifest.expected_size_min_bytes && candidate.sizeBytes <= manifest.expected_size_max_bytes
    );
  }

  return false;
}

function configuredManifestAppliesToCandidate(
  candidate: ProofModelCandidateFile,
  manifestMetadata?: ConfiguredProofManifestMetadata | null,
): boolean {
  if (!manifestMetadata?.localPath) return false;
  return path.resolve(candidate.path).toLowerCase() === path.resolve(manifestMetadata.localPath).toLowerCase();
}

export function classifyProofModelCandidate(
  candidate: ProofModelCandidateFile,
  registry: ModelRegistryEntry[] = MODEL_REGISTRY,
  manifestMetadata?: ConfiguredProofManifestMetadata | null,
): ProofModelCandidateResult {
  const registryMatch = findRegistryMatch(candidate, registry);
  if (configuredManifestAppliesToCandidate(candidate, manifestMetadata)) {
    const expectedSha256 = manifestMetadata?.expectedSha256 || null;
    const manifest = manifestMetadata?.manifest;
    const manifestValid = !!manifest && manifestMetadata.validationErrors.length === 0;
    const hashMatches = !!expectedSha256 && candidate.actualSha256 === expectedSha256;
    const sizeMatches = !!manifest && sizeMatchesManifest(candidate, manifest);
    const proofEligible = manifestValid && hashMatches && sizeMatches;
    const diagnosticCode = !manifestValid
      ? "PROOF_MODEL_MANIFEST_INVALID"
      : !expectedSha256
        ? "MODEL_METADATA_MISSING_HASH"
        : !hashMatches
          ? "MODEL_LOCAL_HASH_MISMATCH"
          : !sizeMatches
            ? "PROOF_MODEL_SIZE_MISMATCH"
            : null;

    return {
      ...candidate,
      registryModelId: registryMatch?.id || manifest?.proof_model_id || null,
      registryArchitecture: registryMatch?.architecture || manifest?.architecture || null,
      registryStatus: "configured_manifest",
      sourceType: "configured_manifest",
      sourceUrl: manifest?.source_url || null,
      license: manifest?.license || null,
      expectedSha256,
      hashMatches: expectedSha256 ? hashMatches : null,
      classification: !expectedSha256
        ? "Installed / Hash unavailable"
        : hashMatches
          ? "Hash verified"
          : "MODEL_LOCAL_HASH_MISMATCH",
      diagnosticCode,
      proofEligible,
      proofMessage: proofEligible
        ? "Configured proof manifest local file matches expected SHA-256 and size metadata."
        : manifestMetadata?.validationErrors.join(" ") ||
          (expectedSha256
            ? "Configured proof manifest exists, but the local file does not match required proof metadata."
            : "Configured proof manifest is missing expected SHA-256 metadata."),
    };
  }

  const expectedSha256 = normalizeSha256(registryMatch?.checksum);
  if (!registryMatch || !expectedSha256) {
    return {
      ...candidate,
      registryModelId: registryMatch?.id || null,
      registryArchitecture: registryMatch?.architecture || null,
      registryStatus: registryMatch?.verifiedStatus || null,
      sourceType: registryMatch?.sourceType || null,
      sourceUrl: registryMatch?.sourceUrl || registryMatch?.downloadUrl || null,
      license: registryMatch?.license || null,
      expectedSha256: expectedSha256 || null,
      hashMatches: null,
      classification: "Installed / Hash unavailable",
      diagnosticCode: "MODEL_METADATA_MISSING_HASH",
      proofEligible: false,
      proofMessage:
        "Local model found, but proof hash metadata is missing. This model can be inspected but cannot satisfy proof.",
    };
  }

  const hashMatches = candidate.actualSha256 === expectedSha256;
  if (!hashMatches) {
    return {
      ...candidate,
      registryModelId: registryMatch.id,
      registryArchitecture: registryMatch.architecture,
      registryStatus: registryMatch.verifiedStatus || null,
      sourceType: registryMatch.sourceType || null,
      sourceUrl: registryMatch.sourceUrl || registryMatch.downloadUrl || null,
      license: registryMatch.license || null,
      expectedSha256,
      hashMatches: false,
      classification: "MODEL_LOCAL_HASH_MISMATCH",
      diagnosticCode: "MODEL_LOCAL_HASH_MISMATCH",
      proofEligible: false,
      proofMessage: "Local model SHA-256 does not match expected metadata. OpenStem will not use it for proof.",
    };
  }

  const proofEligibility = getModelProofEligibility(registryMatch, {
    exists: true,
    status: "hash_verified",
    hashChecked: true,
    hashMatches: true,
  });
  return {
    ...candidate,
    registryModelId: registryMatch.id,
    registryArchitecture: registryMatch.architecture,
    registryStatus: registryMatch.verifiedStatus || null,
    sourceType: registryMatch.sourceType || null,
    sourceUrl: registryMatch.sourceUrl || registryMatch.downloadUrl || null,
    license: registryMatch.license || null,
    expectedSha256,
    hashMatches: true,
    classification: "Hash verified",
    diagnosticCode: proofEligibility.diagnosticCode || null,
    proofEligible: proofEligibility.proofEligible,
    proofMessage: proofEligibility.displayMessage,
  };
}

export function auditLocalProofModelCandidates(
  rootDir = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
  userSelectedFolders: string[] = [],
): { roots: ProofModelSearchRoot[]; candidates: ProofModelCandidateResult[]; verifiedCandidates: number } {
  const roots = getApprovedProofModelSearchRoots(rootDir, env, userSelectedFolders);
  const manifestMetadata = loadConfiguredProofManifestMetadata(rootDir, env);
  const seenCandidates = new Set<string>();
  const candidates = roots.flatMap((root) =>
    collectCandidateFiles(root)
      .filter((candidate) => {
        const key = path.resolve(candidate.path).toLowerCase();
        if (seenCandidates.has(key)) return false;
        seenCandidates.add(key);
        return true;
      })
      .map((candidate) => classifyProofModelCandidate(candidate, MODEL_REGISTRY, manifestMetadata)),
  );
  return {
    roots,
    candidates,
    verifiedCandidates: candidates.filter((candidate) => candidate.proofEligible).length,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const result = auditLocalProofModelCandidates(process.cwd(), process.env, args.folders);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("=========================================");
  console.log("AUDITING LOCAL PROOF MODEL CANDIDATES");
  console.log("=========================================");
  console.log("No internet is searched. No model weights are downloaded. Filename matches are candidates only.");
  console.log("");
  console.log("Approved search roots:");
  for (const root of result.roots) {
    console.log(`  - ${root.exists ? "exists" : "missing"} | ${root.source} | ${root.path}`);
  }
  console.log("");
  console.log(`Candidates found: ${result.candidates.length}`);
  for (const candidate of result.candidates) {
    console.log(`  - ${candidate.filename}`);
    console.log(`    path: ${candidate.path}`);
    console.log(`    size: ${candidate.sizeBytes}`);
    console.log(`    extension: ${candidate.extension}`);
    console.log(`    architecture guess: ${candidate.architectureGuess}`);
    console.log(`    actual SHA-256: ${candidate.actualSha256}`);
    console.log(`    registry model id: ${candidate.registryModelId || "none"}`);
    console.log(`    expected SHA-256: ${candidate.expectedSha256 || "missing"}`);
    console.log(`    classification: ${candidate.classification}`);
    console.log(`    proof eligible: ${candidate.proofEligible ? "yes" : "no"}`);
    console.log(`    message: ${candidate.proofMessage}`);
  }
  console.log("");
  if (result.verifiedCandidates > 0) {
    console.log("RESULT: VERIFIED_LOCAL_MODEL_CANDIDATE_FOUND");
    console.log(
      "A matching local SHA-256 candidate exists. Run proof:check with a local proof manifest before E2E proof.",
    );
  } else {
    console.log("RESULT: BLOCKED_NO_VERIFIED_LOCAL_MODEL");
    console.log("No proof-eligible local model candidate was found in approved locations.");
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || "")) {
  main();
}
