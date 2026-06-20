const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const aiSeparation = require("./ai-separation.cjs");

const PROOF_REPORT_FILENAME = "openstem-proof-report.json";

function parseArgs(argv) {
  const parsed = {
    python: null,
    model: null,
    input: null,
    output: null,
    ffmpeg: null,
    device: "cpu",
    expectedSha256: null,
    expectedSizeBytes: null,
    expectedSizeMinBytes: null,
    expectedSizeMaxBytes: null,
    expectedStems: null,
    license: null,
    sourceUrl: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--python") parsed.python = value;
    if (key === "--model") parsed.model = value;
    if (key === "--input") parsed.input = value;
    if (key === "--output") parsed.output = value;
    if (key === "--ffmpeg") parsed.ffmpeg = value;
    if (key === "--device") parsed.device = value || "cpu";
    if (key === "--expected-sha256") parsed.expectedSha256 = value;
    if (key === "--expected-size-bytes") parsed.expectedSizeBytes = value;
    if (key === "--expected-size-min-bytes") parsed.expectedSizeMinBytes = value;
    if (key === "--expected-size-max-bytes") parsed.expectedSizeMaxBytes = value;
    if (key === "--expected-stems") parsed.expectedStems = value;
    if (key === "--license") parsed.license = value;
    if (key === "--source-url") parsed.sourceUrl = value;
    if (key.startsWith("--")) i++;
  }
  return parsed;
}

function printHeader() {
  console.log("==========================================================");
  console.log("      OPENSTEM REAL LOCAL CPU AI SEPARATION E2E PROOF      ");
  console.log("==========================================================");
}

function block(message, details = []) {
  console.log("\nRESULT: BLOCKED");
  console.log(`Reason: ${message}`);
  for (const detail of details) {
    console.log(`  - ${detail}`);
  }
  console.log("==========================================================");
  process.exit(2);
}

function fail(message, result) {
  console.log("\nRESULT: FAIL");
  console.log(`Reason: ${message}`);
  if (result) {
    console.log(JSON.stringify(result, null, 2));
  }
  console.log("==========================================================");
  process.exit(1);
}

function fileSha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function isInsideDirectory(parentDir, childPath) {
  const parent = path.resolve(parentDir);
  const child = path.resolve(childPath);
  const relative = path.relative(parent, child);
  return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function collectOutputEvidence(outputFiles, outputFolder, runStartedMs) {
  return (Array.isArray(outputFiles) ? outputFiles : []).map((file) => {
    const filePath = path.resolve(String(file.path || ""));
    const stats = fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? fs.statSync(filePath) : null;
    return {
      path: filePath,
      filename: path.basename(filePath),
      sizeBytes: stats?.size ?? Number(file.sizeBytes || 0),
      verified: file.verified === true,
      decodable: file.decodable === true,
      ffprobeCommand: file.ffprobeCommand || "ffprobe",
      insideProofOutputFolder: isInsideDirectory(outputFolder, filePath),
      newerThanProofStart: !!stats && stats.mtimeMs >= runStartedMs,
      lastModifiedTimeMs: stats?.mtimeMs ?? null,
      diagnosticCode: file.diagnosticCode,
      error: file.error,
    };
  });
}

function writeProofReport(outputFolder, report) {
  const reportPath = path.join(outputFolder, PROOF_REPORT_FILENAME);
  fs.writeFileSync(reportPath, JSON.stringify({ ...report, reportPath }, null, 2));
  return reportPath;
}

function requireExistingFile(label, filePath) {
  if (!filePath) block(`${label} path is required.`);
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) block(`${label} path does not exist.`, [resolved]);
  if (!fs.statSync(resolved).isFile()) block(`${label} path is not a file.`, [resolved]);
  return resolved;
}

function requireExistingDirectory(label, folderPath) {
  if (!folderPath) block(`${label} path is required.`);
  const resolved = path.resolve(folderPath);
  if (!fs.existsSync(resolved)) block(`${label} folder does not exist.`, [resolved]);
  if (!fs.statSync(resolved).isDirectory()) block(`${label} path is not a directory.`, [resolved]);
  const folderCheck = aiSeparation.verifyOutputFolder(resolved);
  if (!folderCheck.success) block(`${label} folder is not writable.`, [folderCheck.error || resolved]);
  return resolved;
}

async function main() {
  printHeader();
  const args = parseArgs(process.argv.slice(2));
  const runStartedAt = new Date();
  const runStartedMs = runStartedAt.getTime();

  if (args.device !== "cpu") {
    block("This task implements CPU AI proof only; CUDA/MPS/DirectML proof is not implemented.");
  }

  const pythonPath = requireExistingFile("Python executable", args.python);
  const modelPath = requireExistingFile("Model file", args.model);
  const inputPath = requireExistingFile("Input audio", args.input);
  const outputRoot = requireExistingDirectory("Output", args.output);
  const proofRunId = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFolder = path.join(outputRoot, `openstem-proof-${proofRunId}`);
  fs.mkdirSync(outputFolder, { recursive: true });
  const expectedSha256 = args.expectedSha256
    ? String(args.expectedSha256)
        .trim()
        .replace(/^sha256[:_]/i, "")
        .toLowerCase()
    : null;

  if (!expectedSha256 || !/^[a-f0-9]{64}$/.test(expectedSha256)) {
    block("Manual CPU proof requires --expected-sha256 with a valid SHA-256 value.", [
      "Do not run CPU proof with an unverified model asset.",
      "A local model with a hash mismatch or missing hash must not be used for proof.",
    ]);
  }
  const modelSizeBytes = fs.statSync(modelPath).size;
  const actualModelSha256 = fileSha256(modelPath);
  if (actualModelSha256 !== expectedSha256) {
    block("Model SHA-256 does not match --expected-sha256.", [
      "Code: MODEL_LOCAL_HASH_MISMATCH",
      `Expected ${expectedSha256}`,
      `Actual   ${actualModelSha256}`,
    ]);
  }
  const expectedSizeBytes = args.expectedSizeBytes ? Number(args.expectedSizeBytes) : null;
  const expectedSizeMinBytes = args.expectedSizeMinBytes ? Number(args.expectedSizeMinBytes) : null;
  const expectedSizeMaxBytes = args.expectedSizeMaxBytes ? Number(args.expectedSizeMaxBytes) : null;
  if (Number.isFinite(expectedSizeBytes) && expectedSizeBytes !== modelSizeBytes) {
    block("Model size does not match --expected-size-bytes.", [
      "Code: PROOF_MODEL_SIZE_MISMATCH",
      `Expected ${expectedSizeBytes} bytes but found ${modelSizeBytes} bytes.`,
    ]);
  }
  if (
    Number.isFinite(expectedSizeMinBytes) &&
    Number.isFinite(expectedSizeMaxBytes) &&
    (modelSizeBytes < expectedSizeMinBytes || modelSizeBytes > expectedSizeMaxBytes)
  ) {
    block("Model size is outside the expected size range.", [
      "Code: PROOF_MODEL_SIZE_MISMATCH",
      `Expected ${expectedSizeMinBytes}-${expectedSizeMaxBytes} bytes but found ${modelSizeBytes} bytes.`,
    ]);
  }

  console.log("[1/5] Checking Python/backend requirements...");
  const ffmpeg = aiSeparation.checkFFmpegReady({ ffmpegCommand: args.ffmpeg || undefined });
  const ffprobe = aiSeparation.checkFFprobeReady({ ffmpeg });
  const backendDetails = aiSeparation.checkBackendDetails(pythonPath, { ffmpeg });
  console.log(
    `  Python: ${backendDetails.pythonFound ? `${backendDetails.pythonPath} (${backendDetails.pythonVersion})` : "missing"}`,
  );
  console.log(`  audio-separator import: ${backendDetails.audioSeparatorInstalled ? "ready" : "missing"}`);
  console.log(`  audio-separator CLI: ${backendDetails.audioSeparatorCliReady ? "ready" : "missing"}`);
  console.log(`  PyTorch: ${backendDetails.torchInstalled ? backendDetails.torchVersion : "missing"}`);
  console.log(`  FFmpeg: ${ffmpeg.ready ? ffmpeg.version : "missing"}`);
  console.log(`  FFprobe: ${ffprobe.ready ? ffprobe.version : "missing"}`);

  if (!backendDetails.canRunAISeparation || !ffmpeg.ready || !ffprobe.ready) {
    const blockers = [
      ...(backendDetails.blockers || []).map((blocker) => `${blocker.id}: ${blocker.label}`),
      ...(!ffmpeg.ready ? [`ffmpeg_missing: ${ffmpeg.error || "ffmpeg -version failed"}`] : []),
      ...(!ffprobe.ready ? [`ffprobe_missing: ${ffprobe.error || "ffprobe -version failed"}`] : []),
    ];
    block("Backend requirements are missing.", blockers);
  }

  console.log("[2/5] Verifying proof input audio...");
  const inputProbe = aiSeparation.verifyAudioFileDecodable(inputPath, ffmpeg);
  if (!inputProbe.ok) {
    block("Proof input audio is not decodable.", [
      "Code: PROOF_INPUT_UNDECODABLE",
      inputProbe.error || "ffprobe did not find an audio stream.",
      "Run npm.cmd run proof:input or provide a decodable WAV file.",
    ]);
  }

  console.log("[3/5] Building CPU AI processing request...");
  const request = {
    inputs: [inputPath],
    outputFolder,
    format: "WAV",
    model: {
      id: "manual_e2e_model",
      name: path.basename(modelPath),
      architecture: path.basename(path.dirname(modelPath)) || "Custom",
      filePath: modelPath,
      stemType: "variable",
      gpuSupport: false,
      memoryRisk: "high",
      downloaded: true,
      description: "Manual E2E proof model",
      fileSize: `${fs.statSync(modelPath).size} bytes`,
      checksum: expectedSha256,
      expectedSizeBytes: args.expectedSizeBytes ? Number(args.expectedSizeBytes) : undefined,
      expectedSizeMinBytes: args.expectedSizeMinBytes ? Number(args.expectedSizeMinBytes) : undefined,
      expectedSizeMaxBytes: args.expectedSizeMaxBytes ? Number(args.expectedSizeMaxBytes) : undefined,
      license: args.license || "User-supplied verified source metadata",
      sourceUrl: args.sourceUrl || undefined,
      sourceType: "manual_import",
      requiredBackend: "audio-separator",
    },
    verifiedModelLocalPath: modelPath,
    method: {
      id: "manual_e2e_cpu_ai",
      name: "Manual CPU AI E2E",
      category: "Custom Models",
      description: "Manual CPU AI proof",
      defaultModelId: "manual_e2e_model",
    },
    processMethod: "manual_e2e_cpu_ai",
    userSelectedMode: "ai",
    selectedDevice: "cpu",
    customPythonPath: pythonPath,
    customFFmpegPath: args.ffmpeg || undefined,
    parameters: {
      chunks: "512",
      noiseReduction: "0",
      executionDevice: "cpu",
      cpuThreads: 2,
      segmentSize: "256",
    },
    options: {
      ttaActive: false,
      postProcessActive: false,
      vocalsOnly: false,
      instrumentalOnly: false,
      splitMode: false,
      saveAllOutputs: true,
      modelTestMode: false,
      createFolderPerTrack: false,
    },
    timestamp: new Date().toISOString(),
  };

  console.log(`[4/5] Running audio-separator CPU subprocess in isolated output folder: ${outputFolder}`);
  const result = await aiSeparation.runCpuAiSeparation(request, {
    allowExternalModelPath: true,
    backendDetails,
    ffmpeg,
    requireDecodableOutputs: true,
    onLog: (message) => console.log(`  ${message}`),
    onProgress: (update) => {
      if (update.log) console.log(`  ${update.log}`);
      if (update.status && update.status !== "running") console.log(`  [status] ${update.status}`);
    },
  });

  console.log("[5/5] Verifying proof result...");
  console.log(JSON.stringify(result, null, 2));

  const expectedStems = args.expectedStems
    ? String(args.expectedStems)
        .split(",")
        .map((stem) => stem.trim().toLowerCase())
        .filter(Boolean)
    : [];
  if (result.success && expectedStems.length > 0) {
    const outputNames = result.outputFiles.map((file) => path.basename(file.path).toLowerCase());
    const missingStems = expectedStems.filter((stem) => !outputNames.some((name) => name.includes(stem)));
    if (missingStems.length > 0) {
      writeProofReport(outputFolder, {
        schemaVersion: 1,
        proofRunId,
        runStartedAt: runStartedAt.toISOString(),
        runStartedEpochMs: runStartedMs,
        runCompletedAt: new Date().toISOString(),
        proofStatus: "FAIL",
        diagnosticCode: "PROOF_OUTPUT_MISSING",
        device: "cpu",
        backend: "audio-separator",
        model: {
          path: modelPath,
          filename: path.basename(modelPath),
          expectedSha256,
          actualSha256: actualModelSha256,
          sizeBytes: modelSizeBytes,
        },
        input: {
          path: inputPath,
          filename: path.basename(inputPath),
          sizeBytes: fs.statSync(inputPath).size,
          decodable: true,
        },
        outputRoot,
        outputFolder,
        expectedStems,
        outputFiles: collectOutputEvidence(result.outputFiles, outputFolder, runStartedMs),
        result,
      });
      fail(`Expected output stems were not created: ${missingStems.join(", ")}`, {
        diagnosticCode: "PROOF_OUTPUT_MISSING",
        expectedStems,
        outputNames,
        outputFolder,
      });
    }
  }

  const outputEvidence = collectOutputEvidence(result.outputFiles, outputFolder, runStartedMs);
  const invalidOutputEvidence = outputEvidence.filter(
    (file) =>
      !file.insideProofOutputFolder ||
      !file.newerThanProofStart ||
      file.sizeBytes <= 0 ||
      file.verified !== true ||
      file.decodable !== true,
  );
  const expectedStemMissing =
    expectedStems.length > 0
      ? expectedStems.filter(
          (stem) =>
            !outputEvidence.some(
              (file) =>
                file.insideProofOutputFolder &&
                file.newerThanProofStart &&
                file.sizeBytes > 0 &&
                file.verified === true &&
                file.decodable === true &&
                file.filename.toLowerCase().includes(stem),
            ),
        )
      : [];
  const completedAt = new Date();
  const proofPassed =
    result.success &&
    result.exitCode === 0 &&
    result.proofStatus === "pass" &&
    outputEvidence.length > 0 &&
    invalidOutputEvidence.length === 0 &&
    expectedStemMissing.length === 0;
  const proofReport = {
    schemaVersion: 1,
    proofRunId,
    runStartedAt: runStartedAt.toISOString(),
    runStartedEpochMs: runStartedMs,
    runCompletedAt: completedAt.toISOString(),
    runCompletedEpochMs: completedAt.getTime(),
    proofStatus: proofPassed ? "PASS" : "FAIL",
    diagnosticCode: proofPassed
      ? undefined
      : expectedStemMissing.length > 0
        ? "PROOF_OUTPUT_MISSING"
        : invalidOutputEvidence.some((file) => !file.newerThanProofStart)
          ? "PROOF_OUTPUT_STALE"
          : invalidOutputEvidence.some((file) => file.decodable !== true)
            ? "PROOF_OUTPUT_UNDECODABLE"
            : result.diagnosticCode || "PROOF_OUTPUT_EMPTY",
    device: "cpu",
    backend: "audio-separator",
    model: {
      path: modelPath,
      filename: path.basename(modelPath),
      expectedSha256,
      actualSha256: actualModelSha256,
      sizeBytes: modelSizeBytes,
      expectedSizeBytes,
      expectedSizeMinBytes,
      expectedSizeMaxBytes,
      license: args.license || null,
      sourceUrl: args.sourceUrl || null,
    },
    input: {
      path: inputPath,
      filename: path.basename(inputPath),
      sizeBytes: fs.statSync(inputPath).size,
      decodable: true,
    },
    outputRoot,
    outputFolder,
    expectedStems,
    outputFiles: outputEvidence,
    result,
  };
  const reportPath = writeProofReport(outputFolder, proofReport);
  console.log(`Proof report: ${reportPath}`);

  if (
    proofPassed &&
    outputEvidence.some(
      (file) =>
        file.verified === true &&
        file.sizeBytes > 0 &&
        file.decodable === true &&
        file.insideProofOutputFolder &&
        file.newerThanProofStart,
    )
  ) {
    console.log("\nRESULT: PASS");
    console.log("CPU AI proof passed with verified non-empty output stems.");
    console.log("==========================================================");
    process.exit(0);
  }

  fail(result.error || proofReport.diagnosticCode || "CPU AI proof did not pass.", proofReport);
}

main().catch((err) => {
  fail(err.message || String(err));
});
