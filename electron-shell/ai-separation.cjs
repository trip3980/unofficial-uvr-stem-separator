const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn, spawnSync, execFileSync } = require("child_process");
const {
  computeSha256,
  getModelProofEligibility,
  normalizeExpectedSha256,
  resolveModelPath,
  verifyModelHash,
} = require("./model-integrity.cjs");

const AUDIO_OUTPUT_EXTENSIONS = new Set([".wav", ".flac", ".mp3", ".ogg", ".m4a", ".aac", ".aiff", ".wma"]);

function uniqueList(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  ];
}

function firstNonEmptyLine(text) {
  return (
    String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || ""
  );
}

function defaultRunCommand(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: options.timeout || 5000,
    windowsHide: true,
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const exitCode = typeof result.status === "number" ? result.status : null;
  const error = result.error ? result.error.message : exitCode === 0 ? undefined : firstNonEmptyLine(stderr || stdout);

  return {
    ok: !result.error && exitCode === 0,
    exitCode,
    stdout,
    stderr,
    output: `${stdout}${stderr}`,
    error,
  };
}

function runCommand(command, args = [], options = {}) {
  const runner = options.runCommand || defaultRunCommand;
  return runner(command, args, options);
}

const BLOCKER_DIAGNOSTIC_CODES = {
  request_missing: "RUNTIME_NATIVE_BACKEND_REQUIRED",
  browser_mode: "RUNTIME_BROWSER_PREVIEW_ONLY",
  non_ai_mode: "PROOF_FFMPEG_FALLBACK_NON_AI",
  input_missing: "PROOF_INPUT_MISSING",
  input_not_file: "PROOF_INPUT_MISSING",
  input_invalid: "PROOF_INPUT_MISSING",
  output_missing: "PROOF_OUTPUT_MISSING",
  output_not_writable: "PROOF_OUTPUT_MISSING",
  output_stale: "PROOF_OUTPUT_STALE",
  output_undecodable: "PROOF_OUTPUT_UNDECODABLE",
  model_missing: "PROOF_MODEL_MISSING",
  model_hash_mismatch: "MODEL_LOCAL_HASH_MISMATCH",
  model_size_mismatch: "MODEL_LOCAL_HASH_MISMATCH",
  model_integrity_error: "MODEL_LOCAL_FILE_MISSING",
  model_hash_missing: "PROOF_MODEL_HASH_MISSING",
  model_manifest_invalid: "PROOF_MODEL_MANIFEST_INVALID",
  model_filename_mismatch: "PROOF_MODEL_FILENAME_MISMATCH",
  model_manual_import_required: "MODEL_MANUAL_IMPORT_REQUIRED",
  model_auth_required: "MODEL_SOURCE_AUTH_REQUIRED",
  model_access_denied: "MODEL_SOURCE_ACCESS_DENIED",
  model_gated_or_private: "MODEL_SOURCE_ACCESS_DENIED",
  model_broken_link: "MODEL_SOURCE_BROKEN_LINK",
  model_source_unavailable: "MODEL_SOURCE_UNAVAILABLE",
  model_network_unavailable: "MODEL_SOURCE_UNAVAILABLE",
  model_dns_failed: "MODEL_SOURCE_UNAVAILABLE",
  model_timeout: "MODEL_SOURCE_UNAVAILABLE",
  model_missing_hash: "MODEL_METADATA_MISSING_HASH",
  model_needs_verification: "MODEL_MANUAL_IMPORT_REQUIRED",
  ffmpeg_missing: "RUNTIME_FFMPEG_MISSING",
  ffprobe_missing: "RUNTIME_FFMPEG_MISSING",
  python_missing: "RUNTIME_PYTHON_MISSING",
  audio_separator_missing: "RUNTIME_AUDIO_SEPARATOR_MISSING",
  audio_separator_cli_missing: "RUNTIME_AUDIO_SEPARATOR_MISSING",
  torch_missing: "RUNTIME_PYTORCH_MISSING",
  torch_probe_invalid: "RUNTIME_PYTORCH_MISSING",
  device_forced_cpu: "RUNTIME_DEVICE_NOT_PROVEN",
};

function makeBlocker(id, label, detail) {
  return { id, label, detail, diagnosticCode: BLOCKER_DIAGNOSTIC_CODES[id] || "RUNTIME_NATIVE_BACKEND_REQUIRED" };
}

function hasPathShape(command) {
  return path.isAbsolute(command) || command.includes("/") || command.includes("\\") || /^[a-zA-Z]:[\\/]/.test(command);
}

function createFFmpegResult({ ready, source, command, version, diagnosticCode, error, userMessage }) {
  return {
    ready,
    source,
    command,
    path: command,
    version: version || null,
    diagnosticCode,
    error: error || null,
    userMessage,
  };
}

function checkFFmpegReady(options = {}) {
  const requestedCommand = String(options.ffmpegCommand || options.ffmpegPath || "").trim();
  const hasSelectedCommand = requestedCommand.length > 0;
  let command = hasSelectedCommand ? requestedCommand : "ffmpeg";
  const source = hasSelectedCommand ? "selected_path" : "path";

  if (hasSelectedCommand && hasPathShape(command)) {
    command = path.resolve(command);
    if (!fs.existsSync(command)) {
      return createFFmpegResult({
        ready: false,
        source,
        command,
        diagnosticCode: "RUNTIME_FFMPEG_INVALID_PATH",
        error: "Selected FFmpeg path does not exist.",
        userMessage: "FFmpeg path is invalid - select a real ffmpeg executable.",
      });
    }

    const stats = fs.statSync(command);
    if (!stats.isFile()) {
      return createFFmpegResult({
        ready: false,
        source,
        command,
        diagnosticCode: "RUNTIME_FFMPEG_INVALID_PATH",
        error: "Selected FFmpeg path is not a file.",
        userMessage: "FFmpeg path is invalid - select the ffmpeg executable file.",
      });
    }

    const basename = path.basename(command).toLowerCase();
    const expectedName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
    if (basename !== expectedName) {
      return createFFmpegResult({
        ready: false,
        source,
        command,
        diagnosticCode: "RUNTIME_FFMPEG_INVALID_PATH",
        error: `Selected executable must be named ${expectedName}.`,
        userMessage: "FFmpeg path is invalid - selected file is not the expected ffmpeg executable.",
      });
    }
  }

  const result = runCommand(command, ["-version"], { ...options, timeout: options.timeout || 3000 });
  const output = result.output || "";
  const versionLine = firstNonEmptyLine(output);
  const ready = !!(result.ok && output.toLowerCase().includes("ffmpeg"));

  return createFFmpegResult({
    ready,
    source,
    command,
    version: ready ? versionLine : null,
    diagnosticCode: ready
      ? "RUNTIME_FFMPEG_READY"
      : hasSelectedCommand
        ? "RUNTIME_FFMPEG_EXEC_FAILED"
        : "RUNTIME_FFMPEG_MISSING",
    error: ready ? null : result.error || "ffmpeg -version failed",
    userMessage: ready
      ? "FFmpeg ready from selected executable or PATH. This resolves only the FFmpeg runtime blocker."
      : hasSelectedCommand
        ? "FFmpeg execution failed - selected path exists but ffmpeg -version did not succeed."
        : "FFmpeg missing - OpenStem could not run ffmpeg -version from PATH.",
  });
}

function resolveFFprobeCommand(ffmpeg) {
  const rawCommand =
    typeof ffmpeg === "string" ? ffmpeg : ffmpeg?.command || ffmpeg?.path || ffmpeg?.ffmpegCommand || "ffmpeg";
  const command = String(rawCommand || "ffmpeg");
  const basename = path.basename(command).toLowerCase();
  if (hasPathShape(command) && (basename === "ffmpeg.exe" || basename === "ffmpeg")) {
    const resolved = path.resolve(command);
    const probeName = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
    const candidate = path.join(path.dirname(resolved), probeName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return "ffprobe";
}

function checkFFprobeReady(options = {}) {
  const command = options.ffprobeCommand || resolveFFprobeCommand(options.ffmpeg || options.ffmpegCommand);
  const result = runCommand(command, ["-version"], { ...options, timeout: options.timeout || 3000 });
  const output = result.output || "";
  const versionLine = firstNonEmptyLine(output);
  const ready = !!(result.ok && output.toLowerCase().includes("ffprobe"));
  return {
    ready,
    source: hasPathShape(command) ? "selected_path" : "path",
    command,
    path: command,
    version: ready ? versionLine : null,
    diagnosticCode: ready ? "RUNTIME_FFMPEG_READY" : "RUNTIME_FFMPEG_MISSING",
    error: ready ? null : result.error || "ffprobe -version failed",
    userMessage: ready
      ? "FFprobe ready for input/output audio verification."
      : "FFprobe missing - OpenStem cannot verify proof audio decodability.",
  };
}

function verifyAudioFileDecodable(filePath, ffmpeg, options = {}) {
  const resolved = path.resolve(String(filePath || ""));
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return {
      ok: false,
      diagnosticCode: "PROOF_INPUT_MISSING",
      error: "Audio file is missing.",
      ffprobeCommand: null,
    };
  }

  const ffprobeCommand = options.ffprobeCommand || resolveFFprobeCommand(ffmpeg || options.ffmpegCommand);
  const result = runCommand(
    ffprobeCommand,
    ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_type", "-of", "default=nw=1:nk=1", resolved],
    { ...options, timeout: options.timeout || 10000 },
  );
  const output = String(result.output || "").trim().toLowerCase();
  const ok = !!(result.ok && output.split(/\r?\n/).some((line) => line.trim() === "audio"));
  return {
    ok,
    diagnosticCode: ok ? "PROOF_AUDIO_DECODABLE" : "PROOF_OUTPUT_UNDECODABLE",
    ffprobeCommand,
    output,
    error: ok ? null : result.error || firstNonEmptyLine(result.stderr || result.stdout || output) || "ffprobe did not find an audio stream.",
  };
}

function discoverPython(customPythonPath, options = {}) {
  const candidates = uniqueList([customPythonPath, process.env.OPENSTEM_PYTHON_PATH, "python", "python3", "py"]);

  const attempted = [];
  for (const candidate of candidates) {
    if ((candidate.includes("/") || candidate.includes("\\")) && !fs.existsSync(candidate)) {
      attempted.push({ candidate, ok: false, error: "Python executable path does not exist." });
      continue;
    }

    const result = runCommand(candidate, ["--version"], { ...options, timeout: options.timeout || 2500 });
    const output = result.output || "";
    attempted.push({ candidate, ok: result.ok, output: firstNonEmptyLine(output), error: result.error });
    const match = output.match(/Python\s+([0-9]+(?:\.[0-9]+){1,2})/i) || output.match(/\b([0-9]+(?:\.[0-9]+){1,2})\b/);
    if (result.ok && match) {
      return {
        pythonFound: true,
        pythonPath: candidate,
        pythonVersion: match[1],
        attempted,
      };
    }
  }

  return {
    pythonFound: false,
    pythonPath: "",
    pythonVersion: "None",
    attempted,
  };
}

function getAudioSeparatorExecutableCandidates(pythonPath) {
  const candidates = ["audio-separator"];
  if (pythonPath && (pythonPath.includes("/") || pythonPath.includes("\\"))) {
    const pythonDir = path.dirname(pythonPath);
    if (process.platform === "win32") {
      candidates.unshift(path.join(pythonDir, "audio-separator.exe"));
      candidates.unshift(path.join(pythonDir, "audio-separator-script.py"));
    } else {
      candidates.unshift(path.join(pythonDir, "audio-separator"));
    }
  }
  return uniqueList(candidates);
}

function discoverAudioSeparatorCli(pythonPath, options = {}) {
  const candidates = [
    {
      type: "python_module",
      label: "python -m audio_separator.cli",
      command: pythonPath,
      argsPrefix: ["-m", "audio_separator.cli"],
    },
    {
      type: "python_module",
      label: "python -m audio_separator",
      command: pythonPath,
      argsPrefix: ["-m", "audio_separator"],
    },
    ...getAudioSeparatorExecutableCandidates(pythonPath).map((command) => ({
      type: "executable",
      label: command,
      command,
      argsPrefix: [],
    })),
  ];

  const attempted = [];
  for (const candidate of candidates) {
    if ((candidate.command.includes("/") || candidate.command.includes("\\")) && !fs.existsSync(candidate.command)) {
      attempted.push({ label: candidate.label, ok: false, error: "CLI executable path does not exist." });
      continue;
    }

    const result = runCommand(candidate.command, [...candidate.argsPrefix, "--help"], {
      ...options,
      timeout: options.timeout || 6000,
    });
    const output = result.output || "";
    const looksLikeCliHelp = /usage:|audio-separator|separate audio/i.test(output);
    attempted.push({
      label: candidate.label,
      ok: result.ok && looksLikeCliHelp,
      error: result.error,
      firstLine: firstNonEmptyLine(output),
    });

    if (result.ok && looksLikeCliHelp) {
      return {
        ready: true,
        ...candidate,
        helpText: output,
        supportsDeviceFlag: output.includes("--device"),
        supportsModelFileDir: output.includes("--model_file_dir"),
        supportsOutputFormat: output.includes("--output_format"),
        attempted,
      };
    }
  }

  return {
    ready: false,
    attempted,
    error: "audio-separator CLI help could not be executed.",
  };
}

function checkBackendDetails(customPythonPath, options = {}) {
  const ffmpeg = options.ffmpeg || checkFFmpegReady(options);
  const ffprobe = options.ffprobe || checkFFprobeReady({ ...options, ffmpeg });
  const python = discoverPython(customPythonPath, options);
  const result = {
    pythonFound: python.pythonFound,
    pythonPath: python.pythonPath,
    pythonVersion: python.pythonVersion,
    pythonAttempted: python.attempted,
    audioSeparatorInstalled: false,
    audioSeparatorCliReady: false,
    audioSeparatorCli: null,
    torchInstalled: false,
    torchVersion: "None",
    isCpuOnlyPytorch: true,
    cudaAvailable: false,
    cudaVersion: "None",
    cudaDeviceCount: 0,
    gpuDeviceName: "None",
    systemRamBytes: os.totalmem(),
    systemRamDisplay: `${(os.totalmem() / 1073741824).toFixed(2)} GB`,
    totalVramBytes: 0,
    vramDisplay: "None",
    mpsAvailable: false,
    ffmpegReady: ffmpeg.ready,
    ffmpeg,
    ffprobeReady: ffprobe.ready,
    ffprobe,
    canRunAISeparation: false,
    canRunCpuAISeparation: false,
    blockers: [],
  };

  if (!python.pythonFound) {
    result.blockers.push(makeBlocker("python_missing", "Python executable was not found."));
  } else {
    const audioSeparatorImport = runCommand(
      python.pythonPath,
      [
        "-c",
        [
          "import audio_separator",
          "from audio_separator.separator.separator import Separator",
          'print("audio_separator separator import OK")',
        ].join("; "),
      ],
      {
        ...options,
        timeout: options.audioSeparatorImportTimeout || 60000,
      },
    );
    result.audioSeparatorInstalled = !!audioSeparatorImport.ok;
    if (audioSeparatorImport.ok) {
      const cli = discoverAudioSeparatorCli(python.pythonPath, options);
      result.audioSeparatorCliReady = !!cli.ready;
      result.audioSeparatorCli = cli.ready ? cli : null;
      if (!cli.ready) {
        result.blockers.push(
          makeBlocker("audio_separator_cli_missing", "audio-separator CLI help could not be executed.", cli.error),
        );
      }
    } else {
      result.blockers.push(
        makeBlocker(
          "audio_separator_missing",
          "Python package audio_separator could not be imported.",
          audioSeparatorImport.error,
        ),
      );
    }

    const torchProbeCode = [
      "import json",
      "import torch",
      'cuda_available = bool(torch.cuda.is_available()) if hasattr(torch, "cuda") else False',
      "cuda_count = int(torch.cuda.device_count()) if cuda_available else 0",
      'gpu_name = torch.cuda.get_device_name(0) if cuda_available and cuda_count > 0 else "None"',
      "total_vram = int(torch.cuda.get_device_properties(0).total_memory) if cuda_available and cuda_count > 0 else 0",
      'mps_backend = getattr(getattr(torch, "backends", None), "mps", None)',
      "mps_available = bool(mps_backend and mps_backend.is_available())",
      "payload = {",
      '  "torchVersion": torch.__version__,',
      '  "isCpuOnlyPytorch": ("+cpu" in torch.__version__) or not cuda_available,',
      '  "cudaAvailable": cuda_available,',
      '  "cudaVersion": str(getattr(torch.version, "cuda", None) or "None"),',
      '  "cudaDeviceCount": cuda_count,',
      '  "gpuDeviceName": gpu_name,',
      '  "totalVramBytes": total_vram,',
      '  "vramDisplay": ("{:.2f} GB".format(total_vram / 1073741824) if total_vram else "None"),',
      '  "mpsAvailable": mps_available',
      "}",
      "print(json.dumps(payload))",
    ].join("\n");

    const torchProbe = runCommand(python.pythonPath, ["-c", torchProbeCode], {
      ...options,
      timeout: options.torchTimeout || 60000,
    });
    if (torchProbe.ok) {
      try {
        const torchPayloadLine = String(torchProbe.stdout || torchProbe.output || "")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .reverse()
          .find((line) => line.startsWith("{") && line.endsWith("}"));
        const parsed = JSON.parse(torchPayloadLine || firstNonEmptyLine(torchProbe.stdout || torchProbe.output));
        result.torchInstalled = true;
        result.torchVersion = parsed.torchVersion || "Unknown";
        result.isCpuOnlyPytorch = parsed.isCpuOnlyPytorch !== false;
        result.cudaAvailable = !!parsed.cudaAvailable;
        result.cudaVersion = parsed.cudaVersion || "None";
        result.cudaDeviceCount = Number(parsed.cudaDeviceCount || 0);
        result.gpuDeviceName = parsed.gpuDeviceName || "None";
        result.totalVramBytes = Number(parsed.totalVramBytes || 0);
        result.vramDisplay = parsed.vramDisplay || "None";
        result.mpsAvailable = !!parsed.mpsAvailable;
      } catch (err) {
        result.blockers.push(makeBlocker("torch_probe_invalid", "PyTorch probe returned invalid JSON.", err.message));
      }
    } else {
      result.blockers.push(
        makeBlocker("torch_missing", "Python package torch could not be imported.", torchProbe.error),
      );
    }
  }

  if (!ffmpeg.ready) {
    result.blockers.push(makeBlocker("ffmpeg_missing", "FFmpeg is missing or ffmpeg -version failed.", ffmpeg.error));
  }
  if (!ffprobe.ready) {
    result.blockers.push(makeBlocker("ffprobe_missing", "FFprobe is missing or ffprobe -version failed.", ffprobe.error));
  }

  result.canRunAISeparation =
    result.pythonFound && result.audioSeparatorInstalled && result.audioSeparatorCliReady && result.torchInstalled;
  result.canRunCpuAISeparation = result.canRunAISeparation && !!ffmpeg.ready && !!ffprobe.ready;

  return result;
}

function verifyPythonPath(pythonPath, options = {}) {
  if (!pythonPath) {
    const discovered = discoverPython(undefined, options);
    return {
      success: discovered.pythonFound,
      status: discovered.pythonFound ? "system_default_verified" : "system_default_missing",
      pythonFound: discovered.pythonFound,
      pythonPath: discovered.pythonPath,
      version: discovered.pythonFound ? `Python ${discovered.pythonVersion}` : undefined,
      error: discovered.pythonFound ? undefined : "No system Python executable could be verified.",
    };
  }

  const discovered = discoverPython(pythonPath, options);
  const matchesRequested = discovered.pythonFound && discovered.pythonPath === pythonPath;
  return {
    success: matchesRequested,
    status: matchesRequested ? "verified" : "invalid",
    pythonFound: matchesRequested,
    pythonPath: matchesRequested ? pythonPath : "",
    version: matchesRequested ? `Python ${discovered.pythonVersion}` : undefined,
    error: matchesRequested ? undefined : "Selected Python executable could not be verified.",
  };
}

function verifyOutputFolder(folderPath) {
  if (!folderPath) {
    return { success: false, exists: false, writable: false, status: "missing", error: "Output folder is required." };
  }

  try {
    if (!fs.existsSync(folderPath)) {
      return {
        success: false,
        exists: false,
        writable: false,
        status: "missing",
        error: "Output folder does not exist.",
      };
    }
    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      return {
        success: false,
        exists: true,
        writable: false,
        status: "invalid",
        error: "Output path is not a directory.",
      };
    }

    const testFile = path.join(folderPath, `.openstem_write_test_${process.pid}_${Date.now()}`);
    fs.writeFileSync(testFile, "openstem-write-test");
    fs.unlinkSync(testFile);
    return { success: true, exists: true, writable: true, status: "writable" };
  } catch (err) {
    return {
      success: false,
      exists: fs.existsSync(folderPath),
      writable: false,
      status: "not_writable",
      error: err.message,
    };
  }
}

function isSameAsInputOutput(outputFolder) {
  return String(outputFolder || "").trim() === "(Same as Input)";
}

function hasAbsolutePathShape(candidatePath) {
  return path.isAbsolute(candidatePath) || /^[a-zA-Z]:[\\/]/.test(candidatePath) || candidatePath.startsWith("\\\\");
}

function verifyExternalModelFile(model, modelPath) {
  if (!modelPath || !fs.existsSync(modelPath)) {
    return { ok: false, exists: false, status: "missing", localPath: modelPath };
  }
  const stats = fs.statSync(modelPath);
  if (!stats.isFile()) {
    return { ok: false, exists: true, status: "error", localPath: modelPath, error: "Model path is not a file." };
  }
  const expectedSha256 = normalizeExpectedSha256(model || {});
  if (!expectedSha256) {
    return {
      ok: true,
      exists: true,
      hashChecked: false,
      status: "installed_hash_unavailable",
      localPath: modelPath,
      fileSizeBytes: stats.size,
    };
  }
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
    return {
      ok: false,
      exists: true,
      hashChecked: false,
      status: "error",
      localPath: modelPath,
      expectedSha256,
      fileSizeBytes: stats.size,
      error: "Expected SHA-256 is missing or malformed.",
    };
  }
  const actualSha256 = computeSha256(modelPath);
  return {
    ok: actualSha256 === expectedSha256,
    exists: true,
    hashChecked: true,
    hashMatches: actualSha256 === expectedSha256,
    actualSha256,
    expectedSha256,
    status: actualSha256 === expectedSha256 ? "hash_verified" : "hash_mismatch",
    localPath: modelPath,
    fileSizeBytes: stats.size,
  };
}

function resolveAndVerifyModel(request, context = {}) {
  const model = request.model || {};
  const explicitModelPath =
    request.verifiedModelLocalPath ||
    model.local_path ||
    model.localPath ||
    model.absolutePath ||
    (model.filePath && hasAbsolutePathShape(String(model.filePath)) ? model.filePath : null);

  if (context.allowExternalModelPath && explicitModelPath) {
    return verifyExternalModelFile(model, path.resolve(String(explicitModelPath)));
  }

  if (!context.modelLibraryPath) {
    return { ok: false, exists: false, status: "error", error: "Model library path is required." };
  }

  const payload = explicitModelPath ? { ...model, local_path: path.resolve(String(explicitModelPath)) } : model;
  return verifyModelHash(payload, context.modelLibraryPath);
}

function validateProcessingRequest(request, context = {}) {
  const blockers = [];
  const warnings = [];

  if (!request || typeof request !== "object") {
    return {
      ok: false,
      blockers: [makeBlocker("request_missing", "Processing request payload is missing.")],
      warnings,
      normalized: null,
    };
  }

  if (request.bridgeMode === "browser" || request.environment === "browser") {
    blockers.push(makeBlocker("browser_mode", "Browser Preview / Not runnable for native AI separation."));
  }

  if (request.userSelectedMode && request.userSelectedMode !== "ai") {
    blockers.push(makeBlocker("non_ai_mode", "CPU AI proof requires AI mode; FFmpeg fallback is not eligible."));
  }

  const inputs = Array.isArray(request.inputs)
    ? request.inputs.filter(Boolean).map((input) => path.resolve(String(input)))
    : [];
  if (inputs.length === 0) {
    blockers.push(makeBlocker("input_missing", "At least one input audio file is required."));
  }

  for (const inputPath of inputs) {
    try {
      if (!fs.existsSync(inputPath)) {
        blockers.push(makeBlocker("input_missing", `Input file does not exist: ${inputPath}`));
      } else if (!fs.statSync(inputPath).isFile()) {
        blockers.push(makeBlocker("input_not_file", `Input path is not a file: ${inputPath}`));
      }
    } catch (err) {
      blockers.push(makeBlocker("input_invalid", `Input file could not be verified: ${inputPath}`, err.message));
    }
  }

  const sameAsInput = isSameAsInputOutput(request.outputFolder);
  let outputRoot =
    sameAsInput && inputs.length > 0 ? path.dirname(inputs[0]) : path.resolve(String(request.outputFolder || ""));
  if (!sameAsInput) {
    const outputCheck = verifyOutputFolder(request.outputFolder);
    if (!outputCheck.exists) {
      blockers.push(makeBlocker("output_missing", "Output folder does not exist.", outputCheck.error));
    } else if (!outputCheck.writable) {
      blockers.push(makeBlocker("output_not_writable", "Output folder is not writable.", outputCheck.error));
    }
  } else if (inputs.length === 0) {
    blockers.push(makeBlocker("output_missing", "Same-as-input output requires verified input files."));
  }

  if (!request.model || !request.model.name) {
    blockers.push(makeBlocker("model_missing", "Selected model metadata is missing."));
  }

  let modelIntegrity = null;
  let modelProofEligibility = null;
  if (request.model && request.model.name) {
    modelIntegrity = resolveAndVerifyModel(request, context);
    modelProofEligibility = getModelProofEligibility(request.model, modelIntegrity);
    if (!modelIntegrity.exists) {
      blockers.push(
        makeBlocker(
          "model_missing",
          "Selected model file is missing on disk.",
          modelIntegrity.localPath || modelIntegrity.error,
        ),
      );
    } else if (modelIntegrity.status === "hash_mismatch") {
      blockers.push(
        makeBlocker(
          "model_hash_mismatch",
          "Selected model hash does not match registry metadata.",
          modelIntegrity.localPath,
        ),
      );
    } else if (modelIntegrity.status === "size_mismatch") {
      blockers.push(
        makeBlocker(
          "model_size_mismatch",
          "Selected model size does not match registry metadata.",
          modelIntegrity.localPath,
        ),
      );
    } else if (modelIntegrity.status === "error" || modelIntegrity.ok === false) {
      blockers.push(
        makeBlocker("model_integrity_error", "Selected model could not be verified.", modelIntegrity.error),
      );
    } else if (!modelProofEligibility.proofEligible) {
      const blockerId =
        modelProofEligibility.reason === "hash_missing"
          ? "model_hash_missing"
          : `model_${modelProofEligibility.reason}`;
      blockers.push(
        makeBlocker(blockerId, modelProofEligibility.displayMessage, modelIntegrity.localPath || modelIntegrity.error),
      );
    }
  }

  const ffmpegContext = {
    ...context,
    ffmpegCommand: context.ffmpegCommand || request.customFFmpegPath,
  };
  const ffmpeg = context.ffmpeg || checkFFmpegReady(ffmpegContext);
  if (!ffmpeg.ready) {
    blockers.push(makeBlocker("ffmpeg_missing", "FFmpeg is missing or ffmpeg -version failed.", ffmpeg.error));
  }

  const backendDetails =
    context.backendDetails || checkBackendDetails(request.customPythonPath, { ...context, ffmpeg });
  if (!backendDetails.pythonFound) {
    blockers.push(makeBlocker("python_missing", "Python executable was not found."));
  }
  if (backendDetails.pythonFound && !backendDetails.audioSeparatorInstalled) {
    blockers.push(
      makeBlocker("audio_separator_missing", "audio-separator import failed in the selected Python environment."),
    );
  }
  if (backendDetails.pythonFound && backendDetails.audioSeparatorInstalled && !backendDetails.audioSeparatorCliReady) {
    blockers.push(
      makeBlocker("audio_separator_cli_missing", "audio-separator CLI could not be inspected with --help."),
    );
  }
  if (backendDetails.pythonFound && !backendDetails.torchInstalled) {
    blockers.push(makeBlocker("torch_missing", "PyTorch import failed in the selected Python environment."));
  }

  const requestedDevice = request.selectedDevice || request.parameters?.executionDevice || "cpu";
  if (requestedDevice !== "cpu") {
    warnings.push(
      makeBlocker(
        "device_forced_cpu",
        `Requested device "${requestedDevice}" ignored for this task; CPU mode is forced.`,
      ),
    );
  }

  const outputFormat = String(request.format || "WAV").toLowerCase();
  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    normalized: {
      inputs,
      outputRoot,
      outputMode: sameAsInput ? "same_as_input" : "selected_folder",
      modelPath: modelIntegrity?.localPath || "",
      modelIntegrity,
      modelProofEligibility,
      ffmpeg,
      backendDetails,
      pythonPath: backendDetails.pythonPath,
      audioSeparatorCli: backendDetails.audioSeparatorCli,
      outputFormat,
      selectedDevice: "cpu",
    },
  };
}

function snapshotOutputFiles(outputDir) {
  const snapshot = new Map();
  if (!outputDir || !fs.existsSync(outputDir)) return snapshot;
  for (const entry of fs.readdirSync(outputDir)) {
    const filePath = path.join(outputDir, entry);
    try {
      const stats = fs.statSync(filePath);
      if (stats.isFile() && AUDIO_OUTPUT_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
        snapshot.set(filePath, { sizeBytes: stats.size, mtimeMs: stats.mtimeMs });
      }
    } catch (err) {
      // Ignore files that disappear during scanning.
    }
  }
  return snapshot;
}

function scanVerifiedOutputs(outputDir, beforeSnapshot = new Map(), options = {}) {
  if (!outputDir || !fs.existsSync(outputDir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(outputDir)) {
    const filePath = path.join(outputDir, entry);
    try {
      const stats = fs.statSync(filePath);
      if (!stats.isFile() || !AUDIO_OUTPUT_EXTENSIONS.has(path.extname(entry).toLowerCase())) continue;
      const before = beforeSnapshot.get(filePath);
      const isNewOrChanged = !before || before.sizeBytes !== stats.size || before.mtimeMs !== stats.mtimeMs;
      if (!isNewOrChanged) continue;
      const decodeCheck = options.requireDecodable
        ? verifyAudioFileDecodable(filePath, options.ffmpeg, options)
        : { ok: null, diagnosticCode: undefined, error: null, ffprobeCommand: null };
      results.push({
        path: filePath,
        sizeBytes: stats.size,
        verified: stats.size > 0 && decodeCheck.ok !== false,
        decodable: decodeCheck.ok,
        ffprobeCommand: decodeCheck.ffprobeCommand,
        diagnosticCode: decodeCheck.ok === false ? "PROOF_OUTPUT_UNDECODABLE" : undefined,
        error: decodeCheck.ok === false ? decodeCheck.error : undefined,
      });
    } catch (err) {
      // Ignore files that disappear during scanning.
    }
  }
  return results;
}

function createProofResult({ exitCode, outputFiles = [], error, status }) {
  const verifiedOutputs = outputFiles.filter(
    (file) => file && file.verified && file.sizeBytes > 0 && file.decodable !== false,
  );
  const proofPass = exitCode === 0 && status !== "cancelled" && verifiedOutputs.length > 0;
  const emptyOutputs = outputFiles.filter((file) => file && file.sizeBytes <= 0);
  const undecodableOutputs = outputFiles.filter((file) => file && file.decodable === false);
  let diagnosticCode = "PROOF_OUTPUT_EMPTY";
  let failureMessage = error || "AI CPU separation did not produce verified non-empty output stems.";
  if (typeof exitCode === "number" && exitCode !== 0) {
    diagnosticCode = "PROOF_SEPARATION_FAILED";
    failureMessage = error || "audio-separator did not exit cleanly.";
  } else if (undecodableOutputs.length > 0) {
    diagnosticCode = "PROOF_OUTPUT_UNDECODABLE";
    failureMessage = error || "AI CPU separation produced output files that FFprobe could not decode.";
  } else if (outputFiles.length === 0) {
    diagnosticCode = "PROOF_OUTPUT_STALE";
    failureMessage = error || "No new or changed output stems were created; stale files do not count as proof.";
  } else if (emptyOutputs.length > 0) {
    diagnosticCode = "PROOF_OUTPUT_EMPTY";
    failureMessage = error || "AI CPU separation produced empty output files.";
  }
  return {
    success: proofPass,
    exitCode: typeof exitCode === "number" ? exitCode : -1,
    mode: "ai_cpu",
    outputFiles,
    proofEligible: exitCode === 0 && status !== "cancelled",
    proofStatus: proofPass ? "pass" : "fail",
    error: proofPass ? undefined : failureMessage,
    diagnosticCode: proofPass ? undefined : diagnosticCode,
    status,
  };
}

function buildAudioSeparatorInvocation(normalized, inputTrack, outputDir) {
  const cli = normalized.audioSeparatorCli;
  if (!cli || !cli.ready) {
    throw new Error("audio-separator CLI is not ready.");
  }

  const command = cli.command || normalized.pythonPath;
  const args = [...(cli.argsPrefix || [])];
  args.push(inputTrack);
  args.push("--model_filename", path.basename(normalized.modelPath));
  if (cli.supportsModelFileDir !== false) {
    args.push("--model_file_dir", path.dirname(normalized.modelPath));
  }
  args.push("--output_dir", outputDir);
  if (cli.supportsOutputFormat !== false) {
    args.push("--output_format", normalized.outputFormat.toUpperCase());
  }
  if (cli.supportsDeviceFlag) {
    args.push("--device", "cpu");
  }
  return { command, args, deviceFlagApplied: !!cli.supportsDeviceFlag };
}

function createCpuProcessEnv(extraEnv = {}, ffmpeg) {
  const env = {
    ...process.env,
    CUDA_VISIBLE_DEVICES: "-1",
    HIP_VISIBLE_DEVICES: "-1",
    OPENSTEM_FORCE_CPU: "1",
    ...extraEnv,
  };

  if (ffmpeg?.ready && ffmpeg.source === "selected_path" && hasPathShape(ffmpeg.path || ffmpeg.command)) {
    const ffmpegPath = path.resolve(ffmpeg.path || ffmpeg.command);
    const ffmpegDir = path.dirname(ffmpegPath);
    const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
    env[pathKey] = `${ffmpegDir}${path.delimiter}${env[pathKey] || ""}`;
    env.FFMPEG_BINARY = ffmpegPath;
    env.IMAGEIO_FFMPEG_EXE = ffmpegPath;
    env.OPENSTEM_SELECTED_FFMPEG = ffmpegPath;
  }

  return env;
}

function parseBackendProgress(line) {
  const match = String(line || "").match(/\b([0-9]{1,3})%/);
  if (!match) return undefined;
  const pct = Number(match[1]);
  return Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : undefined;
}

function resolveTargetOutputDir(request, normalized, inputTrack) {
  let targetOutDir = normalized.outputMode === "same_as_input" ? path.dirname(inputTrack) : normalized.outputRoot;

  if (request.options?.createFolderPerTrack) {
    const outputBaseName = path.basename(inputTrack, path.extname(inputTrack));
    targetOutDir = path.join(targetOutDir, `${outputBaseName}_Stems`);
    fs.mkdirSync(targetOutDir, { recursive: true });
  }

  return targetOutDir;
}

function waitForChild(child, isCancellationRequested) {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (isCancellationRequested && isCancellationRequested()) {
        resolve({ cancelled: true, exitCode: typeof code === "number" ? code : -1 });
        return;
      }
      if (code === 0) {
        resolve({ cancelled: false, exitCode: 0 });
      } else {
        reject(new Error(`audio-separator exited with code ${code}`));
      }
    });
  });
}

async function runCpuAiSeparation(request, options = {}) {
  const onProgress = options.onProgress || (() => {});
  const onLog = options.onLog || (() => {});
  const spawnProcess = options.spawnProcess || spawn;
  const isCancellationRequested = options.isCancellationRequested || (() => false);

  onProgress({ type: "process", status: "validating", log: "[backend] Validating CPU AI separation request." });
  const validation = validateProcessingRequest(request, options);
  if (!validation.ok) {
    const message = validation.blockers.map((blocker) => blocker.label).join(" ");
    for (const blocker of validation.blockers) {
      onLog(`[backend-blocker] ${blocker.id}: ${blocker.label}${blocker.detail ? ` (${blocker.detail})` : ""}`);
    }
    const failed = createProofResult({ exitCode: -1, outputFiles: [], error: message, status: "failed" });
    onProgress({ type: "process", status: "failed", error: failed.error, blockers: validation.blockers });
    return { ...failed, blockers: validation.blockers, warnings: validation.warnings };
  }

  const normalized = validation.normalized;
  for (const warning of validation.warnings) {
    onLog(`[backend-warning] ${warning.id}: ${warning.label}`);
  }
  onLog(`[backend] CPU AI mode selected. Python: ${normalized.pythonPath}`);
  onLog(`[backend] Model verified on disk: ${normalized.modelPath}`);
  onLog(`[backend] FFmpeg verified: ${normalized.ffmpeg.version || normalized.ffmpeg.path}`);
  onProgress({
    type: "process",
    status: "running",
    log: "[backend] Launching audio-separator subprocess in CPU mode.",
  });

  const allOutputFiles = [];
  let lastExitCode = -1;

  try {
    for (const inputTrack of normalized.inputs) {
      if (isCancellationRequested()) {
        const cancelled = createProofResult({
          exitCode: -1,
          outputFiles: allOutputFiles,
          error: "Processing cancelled.",
          status: "cancelled",
        });
        onProgress({ type: "process", status: "cancelled", error: cancelled.error });
        return cancelled;
      }

      const targetOutDir = resolveTargetOutputDir(request, normalized, inputTrack);
      const before = snapshotOutputFiles(targetOutDir);
      const invocation = buildAudioSeparatorInvocation(normalized, inputTrack, targetOutDir);
      onLog(
        `[backend-cli] ${invocation.command} ${invocation.args.map((arg) => (String(arg).includes(" ") ? `"${arg}"` : arg)).join(" ")}`,
      );
      if (!invocation.deviceFlagApplied) {
        onLog(
          "[backend-cli] Installed audio-separator CLI help does not expose --device; CPU mode is enforced with process environment GPU masking.",
        );
      }

      const child = spawnProcess(invocation.command, invocation.args, {
        cwd: targetOutDir,
        env: createCpuProcessEnv(options.env, normalized.ffmpeg),
        windowsHide: true,
      });
      if (options.onChild) options.onChild(child);

      const handleLine = (prefix, data) => {
        const text = data.toString();
        for (const line of text
          .split(/\r?\n/)
          .map((part) => part.trim())
          .filter(Boolean)) {
          const progress = parseBackendProgress(line);
          if (progress !== undefined) {
            onProgress({ type: "process", status: "running", progress, log: `[${prefix}] ${line}` });
          } else {
            onLog(`[${prefix}] ${line}`);
          }
        }
      };

      if (child.stdout) child.stdout.on("data", (data) => handleLine("audio-separator stdout", data));
      if (child.stderr) child.stderr.on("data", (data) => handleLine("audio-separator stderr", data));

      const childResult = await waitForChild(child, isCancellationRequested);
      if (options.onChildExit) options.onChildExit(child);
      lastExitCode = childResult.exitCode;

      if (childResult.cancelled) {
        const cancelled = createProofResult({
          exitCode: lastExitCode,
          outputFiles: allOutputFiles,
          error: "Processing cancelled.",
          status: "cancelled",
        });
        onProgress({ type: "process", status: "cancelled", error: cancelled.error });
        return cancelled;
      }

      const newOutputs = scanVerifiedOutputs(targetOutDir, before, {
        ffmpeg: normalized.ffmpeg,
        requireDecodable: options.requireDecodableOutputs === true,
        runCommand: options.runCommand,
      });
      for (const output of newOutputs) {
        onLog(
          `[backend] Output verification: ${path.basename(output.path)} (${output.sizeBytes} bytes, verified=${output.verified}, decodable=${output.decodable === null ? "not checked" : output.decodable})`,
        );
      }
      allOutputFiles.push(...newOutputs);
    }

    const proof = createProofResult({ exitCode: lastExitCode, outputFiles: allOutputFiles, status: "completed" });
    onProgress({
      type: "process",
      status: proof.success ? "completed" : "failed",
      outputFiles: proof.outputFiles,
      proofStatus: proof.proofStatus,
      error: proof.error,
    });
    return { ...proof, blockers: [], warnings: validation.warnings };
  } catch (err) {
    const failed = createProofResult({
      exitCode: lastExitCode,
      outputFiles: allOutputFiles,
      error: err.message,
      status: isCancellationRequested() ? "cancelled" : "failed",
    });
    onProgress({
      type: "process",
      status: failed.status === "cancelled" ? "cancelled" : "failed",
      error: failed.error,
      outputFiles: failed.outputFiles,
    });
    return { ...failed, blockers: [], warnings: validation.warnings };
  } finally {
    if (options.onChildExit) options.onChildExit(null);
  }
}

function requestCancelActiveProcess(activeProcess, options = {}) {
  if (!activeProcess || !activeProcess.pid) {
    return { ok: true, status: "no_active_process" };
  }

  try {
    if ((options.platform || process.platform) === "win32") {
      const runner = options.execFileSync || execFileSync;
      runner("taskkill", ["/pid", String(activeProcess.pid), "/f", "/t"], { stdio: "ignore", windowsHide: true });
    } else if (typeof activeProcess.kill === "function") {
      activeProcess.kill("SIGTERM");
    } else {
      return { ok: false, status: "error", error: "Active process cannot be terminated." };
    }
    return { ok: true, status: "cancel_requested" };
  } catch (err) {
    return { ok: false, status: "error", error: err.message };
  }
}

module.exports = {
  AUDIO_OUTPUT_EXTENSIONS,
  buildAudioSeparatorInvocation,
  checkBackendDetails,
  checkFFmpegReady,
  checkFFprobeReady,
  createCpuProcessEnv,
  createProofResult,
  defaultRunCommand,
  discoverAudioSeparatorCli,
  discoverPython,
  requestCancelActiveProcess,
  runCpuAiSeparation,
  scanVerifiedOutputs,
  snapshotOutputFiles,
  validateProcessingRequest,
  verifyAudioFileDecodable,
  verifyOutputFolder,
  verifyPythonPath,
};
