import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";
import { MODEL_REGISTRY } from "../services/audioEngine";
import {
  evaluateGoldenProofModel,
  GoldenProofModelManifest,
  normalizeSha256,
  validateGoldenProofModelManifest,
} from "../services/proofModel";
import {
  ensureSyntheticProofInput,
  getDefaultProofOutputPath,
  resolveProofFfprobeCommand,
  verifyAudioFileDecodable,
} from "../services/proofInput";

const require = createRequire(import.meta.url);

function hasUsableLicense(license?: string): boolean {
  const normalized = String(license || "")
    .trim()
    .toLowerCase();
  return !!normalized && normalized !== "unknown" && normalized !== "needs verification";
}

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

function fileSha256(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function isFile(filePath?: string): boolean {
  return !!filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function isWritableDirectory(folderPath?: string): boolean {
  if (!folderPath || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) return false;
  try {
    fs.accessSync(folderPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

const PROOF_REPORT_FILENAME = "openstem-proof-report.json";

interface CompletedProofReportCheck {
  attempted: boolean;
  passed: boolean;
  reportPath?: string;
  proofRunId?: string;
  runStartedAt?: string;
  runCompletedAt?: string;
  outputFolder?: string;
  outputFiles: Array<{ path: string; sizeBytes: number; decodable: boolean }>;
  diagnosticCode?: string;
  blockers: string[];
}

function getProofManifestPath(rootDir: string): { manifestPath: string; configuredPath: boolean } {
  const configured = process.env.OPENSTEM_PROOF_MODEL_MANIFEST?.trim();
  if (configured) {
    return {
      manifestPath: path.resolve(configured),
      configuredPath: true,
    };
  }

  const localCandidates = [
    path.join(rootDir, "proof-model.local.json"),
    path.join(rootDir, "docs", "proof-model.local.json"),
  ];
  const found = localCandidates.find((candidate) => fs.existsSync(candidate));
  return {
    manifestPath: found || localCandidates[0],
    configuredPath: !!found,
  };
}

function readProofManifest(manifestPath: string): GoldenProofModelManifest | null {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return parsed as GoldenProofModelManifest;
  } catch (err: any) {
    console.log(`Proof model manifest parse error: ${err.message}`);
    return null;
  }
}

function resolveManifestPathValue(manifestPath: string, rawPath?: string): string {
  const trimmed = String(rawPath || "").trim();
  if (!trimmed) return "";
  return path.isAbsolute(trimmed) ? trimmed : path.resolve(path.dirname(manifestPath), trimmed);
}

function getDefaultPythonPath(rootDir: string): string {
  const configured = process.env.OPENSTEM_PROOF_PYTHON?.trim();
  if (configured) return path.resolve(configured);
  const windowsCandidate = path.join(rootDir, ".venv-openstem", "Scripts", "python.exe");
  const posixCandidate = path.join(rootDir, ".venv-openstem", "bin", "python");
  if (fs.existsSync(windowsCandidate)) return windowsCandidate;
  if (fs.existsSync(posixCandidate)) return posixCandidate;
  return windowsCandidate;
}

function getDefaultFFmpegPath(): string | undefined {
  const configured = process.env.OPENSTEM_PROOF_FFMPEG?.trim() || process.env.OPENSTEM_BACKEND_FFMPEG?.trim();
  return configured ? path.resolve(configured) : undefined;
}

function resolveProofInput(
  rootDir: string,
  ffmpegPath?: string,
): {
  path: string;
  available: boolean;
  generated: boolean;
  decodable: boolean;
  diagnosticCode?: string;
  error?: string;
  ffprobeCommand: string;
} {
  const configured = process.env.OPENSTEM_PROOF_INPUT?.trim();
  const ffprobeCommand = resolveProofFfprobeCommand(ffmpegPath || "ffmpeg");
  if (configured) {
    const inputPath = path.resolve(configured);
    const exists = isFile(inputPath);
    const probe = exists
      ? verifyAudioFileDecodable(inputPath, ffprobeCommand)
      : { ok: false, error: "Input file missing." };
    return {
      path: inputPath,
      available: exists && probe.ok,
      generated: false,
      decodable: exists && probe.ok,
      diagnosticCode: exists && !probe.ok ? "PROOF_INPUT_UNDECODABLE" : exists ? undefined : "PROOF_INPUT_MISSING",
      error: probe.error,
      ffprobeCommand,
    };
  }

  const generated = ensureSyntheticProofInput({
    rootDir,
    ffmpegCommand: ffmpegPath,
  });
  return {
    path: generated.path,
    available: generated.ok,
    generated: generated.generated,
    decodable: generated.decodable,
    diagnosticCode: generated.diagnosticCode,
    error: generated.error,
    ffprobeCommand: generated.ffprobeCommand,
  };
}

function resolveProofOutputPath(rootDir: string): string {
  const configured = process.env.OPENSTEM_PROOF_OUTPUT?.trim();
  const outputPath = configured ? path.resolve(configured) : getDefaultProofOutputPath(rootDir);
  if (!configured) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  return outputPath;
}

function checkBackendAvailable(pythonPath: string, ffmpegPath?: string): { available: boolean; details: string[] } {
  const details: string[] = [];
  if (!isFile(pythonPath)) {
    details.push(`Python executable missing: ${pythonPath}`);
    return { available: false, details };
  }

  try {
    const aiSeparation = require("../../electron-shell/ai-separation.cjs");
    const ffmpeg = aiSeparation.checkFFmpegReady({ ffmpegCommand: ffmpegPath });
    const backendDetails = aiSeparation.checkBackendDetails(pythonPath, { ffmpeg });
    details.push(`Python found: ${yesNo(!!backendDetails.pythonFound)}`);
    details.push(`audio-separator installed: ${yesNo(!!backendDetails.audioSeparatorInstalled)}`);
    details.push(`audio-separator CLI ready: ${yesNo(backendDetails.audioSeparatorCliReady !== false)}`);
    details.push(`PyTorch installed: ${yesNo(!!backendDetails.torchInstalled)}`);
    details.push(`FFmpeg command checked: ${ffmpeg.command || ffmpeg.path || "ffmpeg"}`);
    details.push(`FFmpeg ready: ${yesNo(!!ffmpeg.ready)}`);
    details.push(`FFprobe command checked: ${backendDetails.ffprobe?.command || "ffprobe"}`);
    details.push(`FFprobe ready: ${yesNo(!!backendDetails.ffprobeReady)}`);
    return {
      available: !!backendDetails.canRunCpuAISeparation,
      details,
    };
  } catch (err: any) {
    details.push(`Backend diagnostic failed: ${err.message}`);
    return { available: false, details };
  }
}

function sameResolvedPath(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const left = path.resolve(a);
  const right = path.resolve(b);
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function isInsideDirectory(parentDir: string, childPath: string): boolean {
  const parent = path.resolve(parentDir);
  const child = path.resolve(childPath);
  const relative = path.relative(parent, child);
  return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function getLatestProofReportPath(proofOutputPath: string): string | null {
  if (!fs.existsSync(proofOutputPath) || !fs.statSync(proofOutputPath).isDirectory()) return null;
  const reports: Array<{ path: string; mtimeMs: number }> = [];
  for (const entry of fs.readdirSync(proofOutputPath)) {
    const folderPath = path.join(proofOutputPath, entry);
    try {
      if (!fs.statSync(folderPath).isDirectory() || !entry.startsWith("openstem-proof-")) continue;
      const reportPath = path.join(folderPath, PROOF_REPORT_FILENAME);
      if (fs.existsSync(reportPath) && fs.statSync(reportPath).isFile()) {
        reports.push({ path: reportPath, mtimeMs: fs.statSync(reportPath).mtimeMs });
      }
    } catch {
      // Ignore proof folders that disappear while scanning.
    }
  }
  reports.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return reports[0]?.path || null;
}

function readJsonFile(filePath: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function verifyCompletedProofReport(options: {
  proofOutputPath: string;
  localModelPath: string;
  expectedSha256: string;
  actualSha256: string;
  modelSizeBytes: number | null;
  proofInputPath: string;
  ffprobeCommand: string;
  expectedStems: string[];
}): CompletedProofReportCheck {
  const reportPath = getLatestProofReportPath(options.proofOutputPath);
  if (!reportPath) {
    return {
      attempted: false,
      passed: false,
      diagnosticCode: "PROOF_E2E_NOT_RUN",
      outputFiles: [],
      blockers: ["No completed proof report was found in the proof output folder."],
    };
  }

  const report = readJsonFile(reportPath);
  const blockers: string[] = [];
  if (!report || typeof report !== "object") {
    return {
      attempted: true,
      passed: false,
      reportPath,
      diagnosticCode: "PROOF_SEPARATION_FAILED",
      outputFiles: [],
      blockers: ["Latest proof report could not be parsed as JSON."],
    };
  }

  const outputFolder = path.resolve(String(report.outputFolder || path.dirname(reportPath)));
  const runStartedMs =
    typeof report.runStartedEpochMs === "number" ? report.runStartedEpochMs : Date.parse(String(report.runStartedAt));
  const expectedSha256 = normalizeSha256(options.expectedSha256);
  const reportExpectedSha256 = normalizeSha256(report.model?.expectedSha256);
  const reportActualSha256 = normalizeSha256(report.model?.actualSha256);
  const expectedStems = options.expectedStems.map((stem) => stem.trim().toLowerCase()).filter(Boolean);

  if (report.schemaVersion !== 1) blockers.push("Proof report schemaVersion must be 1.");
  if (String(report.proofStatus || "").toUpperCase() !== "PASS") {
    blockers.push(`Latest proof report status is ${report.proofStatus || "missing"}, not PASS.`);
  }
  if (report.result?.exitCode !== 0) blockers.push("Proof report result exitCode is not 0.");
  if (report.result?.proofStatus !== "pass") blockers.push("Proof report result proofStatus is not pass.");
  if (String(report.backend || "").toLowerCase() !== "audio-separator") {
    blockers.push("Proof report backend is not audio-separator.");
  }
  if (String(report.device || "").toLowerCase() !== "cpu") {
    blockers.push("Proof report device is not cpu.");
  }
  if (!sameResolvedPath(report.model?.path, options.localModelPath)) {
    blockers.push("Proof report model path does not match the configured local proof model.");
  }
  if (reportExpectedSha256 !== expectedSha256 || reportActualSha256 !== expectedSha256) {
    blockers.push("Proof report model SHA-256 metadata does not match the configured expected hash.");
  }
  if (options.actualSha256 !== expectedSha256) {
    blockers.push("Current local proof model SHA-256 does not match expected metadata.");
  }
  if (typeof options.modelSizeBytes === "number" && report.model?.sizeBytes !== options.modelSizeBytes) {
    blockers.push("Proof report model size does not match the current local proof model.");
  }
  if (!sameResolvedPath(report.input?.path, options.proofInputPath)) {
    blockers.push("Proof report input path does not match the configured/generated proof input.");
  }
  if (!Number.isFinite(runStartedMs)) {
    blockers.push("Proof report runStartedAt/runStartedEpochMs is missing or invalid.");
  }
  if (!isInsideDirectory(options.proofOutputPath, outputFolder)) {
    blockers.push("Proof report output folder is outside the configured proof output root.");
  }

  const reportOutputFiles = Array.isArray(report.outputFiles) ? report.outputFiles : [];
  const verifiedOutputFiles: Array<{ path: string; sizeBytes: number; decodable: boolean }> = [];
  for (const output of reportOutputFiles) {
    const outputPath = path.resolve(String(output.path || ""));
    if (!outputPath || !fs.existsSync(outputPath) || !fs.statSync(outputPath).isFile()) {
      blockers.push(`Proof output missing: ${output.path || "unknown"}`);
      continue;
    }
    const stats = fs.statSync(outputPath);
    if (!isInsideDirectory(outputFolder, outputPath)) {
      blockers.push(`Proof output is outside the proof run folder: ${outputPath}`);
    }
    if (stats.size <= 0) {
      blockers.push(`Proof output is empty: ${outputPath}`);
    }
    if (Number.isFinite(runStartedMs) && stats.mtimeMs < runStartedMs) {
      blockers.push(`Proof output is older than the proof run start time: ${outputPath}`);
    }
    const decodable = verifyAudioFileDecodable(outputPath, options.ffprobeCommand);
    if (!decodable.ok) {
      blockers.push(`Proof output is not decodable: ${outputPath} (${decodable.error || "ffprobe failed"})`);
    }
    if (output.verified !== true || output.decodable !== true || output.insideProofOutputFolder !== true) {
      blockers.push(`Proof report did not mark output as verified/decodable/inside folder: ${outputPath}`);
    }
    if (stats.size > 0 && decodable.ok) {
      verifiedOutputFiles.push({ path: outputPath, sizeBytes: stats.size, decodable: true });
    }
  }

  if (verifiedOutputFiles.length === 0) {
    blockers.push("No verified non-empty decodable proof output files were found.");
  }

  const outputNames = verifiedOutputFiles.map((file) => path.basename(file.path).toLowerCase());
  const missingStems = expectedStems.filter((stem) => !outputNames.some((name) => name.includes(stem)));
  if (missingStems.length > 0) {
    blockers.push(`Expected proof stems are missing: ${missingStems.join(", ")}`);
  }

  const diagnosticCode =
    blockers.find((blocker) => blocker.toLowerCase().includes("older than")) !== undefined
      ? "PROOF_OUTPUT_STALE"
      : blockers.find((blocker) => blocker.toLowerCase().includes("not decodable")) !== undefined
        ? "PROOF_OUTPUT_UNDECODABLE"
        : blockers.find((blocker) => blocker.toLowerCase().includes("missing")) !== undefined
          ? "PROOF_OUTPUT_MISSING"
          : report.diagnosticCode || (blockers.length > 0 ? "PROOF_SEPARATION_FAILED" : undefined);

  return {
    attempted: true,
    passed: blockers.length === 0,
    reportPath,
    proofRunId: String(report.proofRunId || ""),
    runStartedAt: String(report.runStartedAt || ""),
    runCompletedAt: String(report.runCompletedAt || ""),
    outputFolder,
    outputFiles: verifiedOutputFiles,
    diagnosticCode,
    blockers: Array.from(new Set(blockers)),
  };
}

function main(): void {
  const rootDir = process.cwd();
  console.log("=========================================");
  console.log("CHECKING OPENSTEM CPU AI PROOF READINESS");
  console.log("=========================================");

  const verifiedWeightMetadata = MODEL_REGISTRY.filter((model) => {
    if (model.architecture === "Ensemble") return false;
    return (
      model.verifiedStatus === "verified" &&
      !!model.checksum &&
      hasUsableLicense(model.license) &&
      (!!model.downloadUrl || !!model.sourceUrl || model.sourceType === "manual_import")
    );
  });

  const blockedSourceStatuses = new Set([
    "auth_required",
    "gated_or_private",
    "access_denied",
    "rate_limited",
    "source_unavailable",
    "network_unavailable",
    "dns_failed",
    "timeout",
    "unavailable",
    "broken_link",
    "missing_hash",
    "hash_mismatch",
    "needs_verification",
  ]);
  const blockedSources = MODEL_REGISTRY.filter((model) =>
    model.verifiedStatus ? blockedSourceStatuses.has(model.verifiedStatus) : false,
  );
  const ensembles = MODEL_REGISTRY.filter(
    (model) => model.architecture === "Ensemble" && model.verifiedStatus === "verified",
  );

  console.log(`Registry entries: ${MODEL_REGISTRY.length}`);
  console.log(`Verified ensemble presets: ${ensembles.length}`);
  console.log(`Blocked source entries: ${blockedSources.length}`);
  console.log(`Verified single-weight metadata candidates: ${verifiedWeightMetadata.length}`);

  const { manifestPath, configuredPath } = getProofManifestPath(rootDir);
  const manifest = readProofManifest(manifestPath);
  const localModelPath = manifest ? resolveManifestPathValue(manifestPath, manifest.local_path) : "";
  const localFileExists = isFile(localModelPath);
  const actualSha256 = localFileExists ? fileSha256(localModelPath) : "";
  const localFileStats = localFileExists ? fs.statSync(localModelPath) : null;
  const manifestValidation = validateGoldenProofModelManifest(manifest);

  const pythonPath = getDefaultPythonPath(rootDir);
  const ffmpegPath = getDefaultFFmpegPath();
  const backendCheck = checkBackendAvailable(pythonPath, ffmpegPath);
  const proofInput = resolveProofInput(rootDir, ffmpegPath);
  const proofOutputPath = resolveProofOutputPath(rootDir);
  const evaluation = evaluateGoldenProofModel(
    manifest,
    {
      exists: localFileExists,
      actualSha256,
      sizeBytes: localFileStats?.size ?? null,
      filename: localModelPath ? path.basename(localModelPath) : undefined,
    },
    {
      backendAvailable: backendCheck.available,
      inputAudioAvailable: proofInput.available,
      outputFolderWritable: isWritableDirectory(proofOutputPath),
    },
  );
  const completedProof = evaluation.proofReady
    ? verifyCompletedProofReport({
        proofOutputPath,
        localModelPath,
        expectedSha256: normalizeSha256(manifest?.expected_sha256),
        actualSha256,
        modelSizeBytes: localFileStats?.size ?? null,
        proofInputPath: proofInput.path,
        ffprobeCommand: proofInput.ffprobeCommand,
        expectedStems: manifest?.expected_output_stems || [],
      })
    : {
        attempted: false,
        passed: false,
        diagnosticCode: "PROOF_E2E_NOT_RUN",
        outputFiles: [],
        blockers: [],
      };

  console.log("");
  console.log("Golden proof model readiness:");
  console.log(`  proof model configured: ${yesNo(configuredPath && !!manifest)}`);
  console.log(`  manifest path: ${configuredPath ? manifestPath : "not configured"}`);
  console.log(`  model id: ${manifest?.proof_model_id || "not configured"}`);
  console.log(`  display name: ${manifest?.display_name || "not configured"}`);
  console.log(`  expected filename: ${manifest?.filename || "not configured"}`);
  console.log(`  model family: ${manifest?.model_family || "not configured"}`);
  console.log(`  architecture: ${manifest?.architecture || "not configured"}`);
  console.log(`  backend: ${manifest?.backend || "not configured"}`);
  console.log(`  manifest schema valid: ${yesNo(manifestValidation.ok)}`);
  console.log(`  source/license documented: ${yesNo(evaluation.sourceLicenseDocumented)}`);
  console.log(`  expected SHA-256 present: ${yesNo(evaluation.expectedSha256Present)}`);
  console.log(`  expected size bytes: ${manifest?.expected_size_bytes ?? "not configured"}`);
  console.log(
    `  expected size range: ${
      manifest?.expected_size_min_bytes && manifest?.expected_size_max_bytes
        ? `${manifest.expected_size_min_bytes}-${manifest.expected_size_max_bytes}`
        : "not configured"
    }`,
  );
  console.log(`  expected output stems: ${manifest?.expected_output_stems?.join(", ") || "not configured"}`);
  console.log(`  local file path: ${localModelPath || "not configured"}`);
  console.log(`  local file exists: ${yesNo(evaluation.localFileExists)}`);
  console.log(`  local file size bytes: ${localFileStats?.size ?? "not checked"}`);
  console.log(`  actual SHA-256: ${actualSha256 || "not checked"}`);
  console.log(`  actual SHA-256 matches: ${yesNo(evaluation.actualSha256Matches)}`);
  console.log(`  backend supports model: ${yesNo(evaluation.backendSupportsModel)}`);
  console.log(`  CPU compatible: ${yesNo(evaluation.cpuCompatible)}`);
  console.log(`  Python path checked: ${pythonPath}`);
  console.log(`  FFmpeg path checked: ${ffmpegPath || "PATH discovery"}`);
  console.log(`  backend available: ${yesNo(evaluation.backendAvailable)}`);
  for (const detail of backendCheck.details) {
    console.log(`    - ${detail}`);
  }
  console.log(`  input audio path: ${proofInput.path || "not configured"}`);
  console.log(`  input audio generated: ${yesNo(proofInput.generated)}`);
  console.log(`  input audio available: ${yesNo(evaluation.inputAudioAvailable)}`);
  console.log(`  input audio decodable: ${yesNo(proofInput.decodable)}`);
  console.log(`  FFprobe command checked: ${proofInput.ffprobeCommand}`);
  console.log(`  output folder path: ${proofOutputPath || "not configured"}`);
  console.log(`  output folder writable: ${yesNo(evaluation.outputFolderWritable)}`);
  console.log(`  proof ready: ${yesNo(evaluation.proofReady)}`);
  console.log(`  CPU proof attempted: ${yesNo(completedProof.attempted)}`);
  console.log(`  CPU proof report path: ${completedProof.reportPath || "not found"}`);
  console.log(`  CPU proof output folder: ${completedProof.outputFolder || "not verified"}`);
  console.log(`  CPU proof output files verified: ${completedProof.outputFiles.length}`);
  console.log(`  CPU proof passed: ${yesNo(completedProof.passed)}`);
  console.log(`  status: ${evaluation.statusLabel}`);

  if (!evaluation.proofReady) {
    console.log("");
    console.log("RESULT: BLOCKED");
    console.log("Code: PROOF_BETA_BLOCKED");
    for (const code of evaluation.diagnosticCodes) {
      console.log(`Code: ${code}`);
    }
    if (!manifest && !evaluation.diagnosticCodes.includes("PROOF_MODEL_MISSING")) {
      console.log("Code: PROOF_MODEL_MISSING");
    }
    console.log(
      "CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.",
    );
    console.log("A local model with a hash mismatch must not be used for proof, release claims, or verified status.");
    console.log("Do not run CPU AI proof until a proof-eligible model asset exists.");
    if (evaluation.blockers.length > 0) {
      console.log("Blockers:");
      for (const blocker of evaluation.blockers) {
        console.log(`  - ${blocker}`);
      }
    }
    if (proofInput.error) {
      console.log(`Proof input detail: ${proofInput.diagnosticCode || "PROOF_INPUT_MISSING"} - ${proofInput.error}`);
    }
    process.exit(2);
  }

  if (!completedProof.passed) {
    console.log("");
    if (!completedProof.attempted) {
      console.log("RESULT: READY_TO_RUN_CPU_E2E_PROOF");
      console.log("Code: PROOF_E2E_NOT_RUN");
      console.log("Golden proof model and runtime are ready, but no passing CPU E2E proof report was found.");
    } else {
      console.log("RESULT: BLOCKED");
      console.log(`Code: ${completedProof.diagnosticCode || "PROOF_SEPARATION_FAILED"}`);
      console.log("Latest CPU E2E proof report did not verify successfully.");
    }
    for (const blocker of completedProof.blockers) {
      console.log(`  - ${blocker}`);
    }
    console.log("This does not approve Beta Candidate. Run the CPU proof command and verify non-empty stems.");
    console.log("Suggested command:");
    const ffmpegArg = ffmpegPath ? ` --ffmpeg "${ffmpegPath}"` : "";
    const expectedSizeArg =
      typeof manifest?.expected_size_bytes === "number"
        ? ` --expected-size-bytes "${manifest.expected_size_bytes}"`
        : "";
    const expectedStemsArg =
      manifest?.expected_output_stems && manifest.expected_output_stems.length > 0
        ? ` --expected-stems "${manifest.expected_output_stems.join(",")}"`
        : "";
    console.log(
      `node electron-shell/test-ai-e2e.cjs --python "${pythonPath}" --model "${localModelPath}" --expected-sha256 "${normalizeSha256(
        manifest?.expected_sha256,
      )}"${expectedSizeArg}${expectedStemsArg} --input "${proofInput.path}" --output "${proofOutputPath}" --device cpu${ffmpegArg}`,
    );
    process.exit(2);
  }

  console.log("");
  console.log("RESULT: CPU_E2E_PROOF_PASSED");
  console.log("Verified local CPU AI E2E proof report found and re-checked.");
  console.log(`Proof report: ${completedProof.reportPath}`);
  console.log(`Proof run: ${completedProof.proofRunId || "not recorded"}`);
  console.log(`Proof completed: ${completedProof.runCompletedAt || "not recorded"}`);
  for (const output of completedProof.outputFiles) {
    console.log(`  - ${output.path} (${output.sizeBytes} bytes, decodable=${yesNo(output.decodable)})`);
  }
  console.log(
    "This does not approve Beta Candidate by itself; final release checklist review and user decision remain required.",
  );
}

main();
