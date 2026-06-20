const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const { createMissingHelperScriptResult, fileExists, resolveScriptFile } = require("./runtime-paths.cjs");

// Parse CLI Arguments
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--")) {
    const key = arg.slice(2);
    if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith("--")) {
      args[key] = process.argv[i + 1];
      i++;
    } else {
      args[key] = true;
    }
  }
}

// Map key arguments safely
const pythonPath = args["python"] || "python";
const inputAudio = args["input"] || "";
const outputDir = args["output"] || "";

const saveMidi = !!args["save-midi"];
const sonifyMidi = !!args["sonify-midi"];
const saveModelOutputs = !!args["save-model-outputs"];
const saveNoteEvents = !!args["save-note-events"];

// Advanced parameters which we parse if supplied
const onsetThreshold = args["onset-threshold"] || "";
const frameThreshold = args["frame-threshold"] || "";
const minNoteLength = args["minimum-note-length"] || "";
const minFreq = args["minimum-frequency"] || "";
const maxFreq = args["maximum-frequency"] || "";
const includePitchBends = !!args["include-pitch-bends"];
const multiplePitchBends = !!args["multiple-pitch-bends"];
const midiTempo = args["midi-tempo"] || "";

const isDryRun = !!args["dry-run"];
const isRealRun = !!args["run"];

console.log("----------------------------------------------------");
console.log("Spotify Basic Pitch local adapter runner initialized");
console.log(`Input audio: "${inputAudio}"`);
console.log(`Output folder: "${outputDir}"`);
console.log(`Dry-run mode: ${isDryRun}`);
console.log(`Real run mode: ${isRealRun}`);
console.log("----------------------------------------------------");

const blockers = [];
let pythonVersion = "None";
let basicPitchInstalled = false;
let basicPitchVersion = "None";
let cliAvailable = false;
let pythonWorking = false;
let helperMissing = null;

// 1. Validate Output Directory first
let mainLogDir = process.cwd();
if (outputDir) {
  try {
    const absOut = path.resolve(outputDir);
    if (!fs.existsSync(absOut)) {
      fs.mkdirSync(absOut, { recursive: true });
    }
    mainLogDir = absOut;
  } catch (err) {
    blockers.push(`Output directory could not be resolved/created: ${err.message}`);
  }
} else {
  blockers.push("No output directory path was specified.");
}

// 2. Verify Python executable path
try {
  const versionOut = execFileSync(pythonPath, ["--version"], { encoding: "utf8", timeout: 3000 });
  if (versionOut && (versionOut.toLowerCase().includes("python") || /^[0-9.]+/i.test(versionOut.trim()))) {
    pythonWorking = true;
    pythonVersion = versionOut.replace(/python/i, "").trim();
  }
} catch (err) {
  blockers.push(`Python executable path invalid or non-executable: "${pythonPath}"`);
}

// 3. Run Python readiness probe
if (pythonWorking) {
  try {
    const probeScriptPath = resolveScriptFile("basic_pitch_probe.py");
    if (fileExists(probeScriptPath)) {
      const probeOut = execFileSync(
        pythonPath,
        [probeScriptPath, "--input", inputAudio || "", "--output", outputDir || ""],
        { encoding: "utf8", timeout: 8000 },
      );
      if (probeOut) {
        const pData = JSON.parse(probeOut.trim());
        basicPitchInstalled = !!pData.basicPitchInstalled;
        basicPitchVersion = pData.basicPitchVersion || "None";
        cliAvailable = !!pData.cliAvailable;

        // Collect blockers from python probe
        if (pData.blockers && pData.blockers.length > 0) {
          pData.blockers.forEach((b) => {
            // Only push critical environment/input errors for non-dry-runs unless dry-run is also blocked
            if (!blockers.includes(b)) {
              blockers.push(b);
            }
          });
        }
      }
    } else {
      helperMissing = createMissingHelperScriptResult(probeScriptPath);
      blockers.push(`${helperMissing.message} Missing: ${helperMissing.missingPath}`);
    }
  } catch (err) {
    blockers.push(`Failed executing Basic Pitch python probe: ${err.message}`);
  }
}

// 4. Verify input file existence checks
if (!inputAudio) {
  blockers.push("Input audio file has not been designated.");
} else {
  try {
    if (!fs.existsSync(path.resolve(inputAudio))) {
      if (!blockers.includes(`Input audio file does not exist: ${inputAudio}`)) {
        blockers.push(`Input audio file does not exist: ${inputAudio}`);
      }
    }
  } catch (e) {
    blockers.push(`Error checking input audio file: ${e.message}`);
  }
}

// 5. Build standard command line syntax for `basic-pitch`
// Pattern verified: basic-pitch <output-directory> <input-audio-path-1> [<input-audio-path-2>...] [flags]
let commandToRun = "";
let exitCode = -1;
let stdoutSummary = "";
let stderrSummary = "";
let proofStatus = "BLOCKED";

const generatedFiles = [];
const midiFiles = [];
const sonifiedWavFiles = [];
const noteEventCsvFiles = [];
const modelOutputNpzFiles = [];
const generatedFileSizes = {};

// CLI flags as specified in inspected documentation
// Spotify Basic Pitch executable command setup:
// basic-pitch <output-directory> <input-audio-path>
if (blockers.length === 0) {
  const binaryName = "basic-pitch";
  const cmdArgs = [outputDir, inputAudio];

  if (sonifyMidi) cmdArgs.push("--sonify-midi");
  if (saveModelOutputs) cmdArgs.push("--save-model-outputs");
  if (saveNoteEvents) cmdArgs.push("--save-note-events");

  // Include advanced threshold elements if they exist
  if (onsetThreshold) {
    cmdArgs.push("--onset-threshold", onsetThreshold.toString());
  }
  if (frameThreshold) {
    cmdArgs.push("--frame-threshold", frameThreshold.toString());
  }
  if (minNoteLength) {
    cmdArgs.push("--minimum-note-length", minNoteLength.toString());
  }
  if (minFreq) {
    cmdArgs.push("--minimum-frequency", minFreq.toString());
  }
  if (maxFreq) {
    cmdArgs.push("--maximum-frequency", maxFreq.toString());
  }
  if (includePitchBends) {
    cmdArgs.push("--include-pitch-bends");
  }
  if (multiplePitchBends) {
    cmdArgs.push("--multiple-pitch-bends");
  }
  if (midiTempo) {
    cmdArgs.push("--midi-tempo", midiTempo.toString());
  }

  // Safe printed preview representation
  commandToRun = `"${binaryName}" ${cmdArgs.map((x) => (x.toString().includes(" ") ? `"${x}"` : x)).join(" ")}`;
}

async function executeBasicPitch() {
  if (blockers.length > 0) {
    proofStatus = "BLOCKED";
    writeReport();
    return;
  }

  // Dry run pathway
  if (isDryRun && !isRealRun) {
    proofStatus = "DRY_RUN_ONLY";
    exitCode = 0;
    stdoutSummary = `Dry-run environment validation successful. Preflight check confirmed Basic Pitch commands are ready. Command preview: ${commandToRun}`;
    console.log("[PROBE] Dry run parameter review finished.");
    writeReport();
    return;
  }

  // Real Subprocess Execution Mode
  console.log(`[EXEC] Pitching audio-to-MIDI transcription command:\n${commandToRun}`);
  proofStatus = "FAIL"; // default until positive completion verified

  // We run basic-pitch using the Python executable `-m basic_pitch` wrapper or the direct `basic-pitch` CLI.
  // It is safest to construct it through python -m basic_pitch if cliAvailable is verified as sub-module,
  // or binary if running directly. Let's do python wrapper or binary execution.
  const isModule = true; // Use python -m basic_pitch.inference or similar to guarantee environments match

  // Spotify CLI syntax matches:
  // python -m basic_pitch <output-directory> <input-audio-path> [flags]
  const spawnExecutable = pythonPath;
  const spawnArgs = ["-m", "basic_pitch", outputDir, inputAudio];

  if (sonifyMidi) spawnArgs.push("--sonify-midi");
  if (saveModelOutputs) spawnArgs.push("--save-model-outputs");
  if (saveNoteEvents) spawnArgs.push("--save-note-events");

  if (onsetThreshold) {
    spawnArgs.push("--onset-threshold", onsetThreshold.toString());
  }
  if (frameThreshold) {
    spawnArgs.push("--frame-threshold", frameThreshold.toString());
  }
  if (minNoteLength) {
    spawnArgs.push("--minimum-note-length", minNoteLength.toString());
  }
  if (minFreq) {
    spawnArgs.push("--minimum-frequency", minFreq.toString());
  }
  if (maxFreq) {
    spawnArgs.push("--maximum-frequency", maxFreq.toString());
  }
  if (includePitchBends) {
    spawnArgs.push("--include-pitch-bends");
  }
  if (multiplePitchBends) {
    spawnArgs.push("--multiple-pitch-bends");
  }
  if (midiTempo) {
    spawnArgs.push("--midi-tempo", midiTempo.toString());
  }

  // Execute spawn
  const child = spawn(spawnExecutable, spawnArgs);

  const stdoutChunks = [];
  const stderrChunks = [];

  child.stdout.on("data", (chunk) => {
    stdoutChunks.push(chunk);
    process.stdout.write(chunk);
  });

  child.stderr.on("data", (chunk) => {
    stderrChunks.push(chunk);
    process.stderr.write(chunk);
  });

  await new Promise((resolve) => {
    child.on("close", (code) => {
      exitCode = code;
      resolve();
    });
  });

  stdoutSummary = Buffer.concat(stdoutChunks).toString("utf8");
  stderrSummary = Buffer.concat(stderrChunks).toString("utf8");

  // Verify outputs on success
  if (exitCode === 0 && outputDir && fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir);

    // Look for generated MIDI and associated files
    // Basic Pitch appends _basic_pitch.mid or similar depending on execution file
    files.forEach((f) => {
      const full = path.join(outputDir, f);
      const ext = path.extname(f).toLowerCase();
      const stats = fs.statSync(full);

      if (stats.size > 0) {
        generatedFiles.push(f);
        generatedFileSizes[f] = stats.size;

        if (ext === ".mid" || ext === ".midi") {
          midiFiles.push(f);
        } else if (ext === ".wav" && f.includes("sonified")) {
          sonifiedWavFiles.push(f);
        } else if (ext === ".csv") {
          noteEventCsvFiles.push(f);
        } else if (ext === ".npz") {
          modelOutputNpzFiles.push(f);
        }
      }
    });

    // Verification requirement: at least one MIDI file must exist with size > 0
    if (midiFiles.length > 0) {
      proofStatus = "PASS";
      console.log(
        "[PROBE-SUCCESS] Spotify Basic Pitch audio-to-MIDI E2E transcription completed with a non-empty MIDI output.",
      );
    } else {
      blockers.push("Transcription finished but no non-empty .mid / .midi files were found on disk in output folder.");
    }
  } else {
    blockers.push(`Basic Pitch process crashed with exit code: ${exitCode}`);
  }

  writeReport();
}

function writeReport() {
  const proofReport = {
    timestamp: new Date().toISOString(),
    pythonPath: pythonPath,
    pythonVersion: pythonVersion,
    basicPitchInstalled: basicPitchInstalled,
    basicPitchVersion: basicPitchVersion,
    cliAvailable: cliAvailable,
    inputFiles: [inputAudio],
    outputDir: outputDir,
    commandExecuted: commandToRun || "None - Preflight Blocked",
    selectedOptions: {
      saveMidi: saveMidi,
      sonifyMidi: sonifyMidi,
      saveModelOutputs: saveModelOutputs,
      saveNoteEvents: saveNoteEvents,
      onsetThreshold: onsetThreshold,
      frameThreshold: frameThreshold,
      minNoteLength: minNoteLength,
      minFreq: minFreq,
      maxFreq: maxFreq,
      includePitchBends: includePitchBends,
      multiplePitchBends: multiplePitchBends,
      midiTempo: midiTempo,
    },
    exitCode: exitCode,
    stdoutSummary: stdoutSummary ? stdoutSummary.trim().slice(-1500) : "",
    stderrSummary: stderrSummary ? stderrSummary.trim().slice(-2000) : "",
    generatedFiles: generatedFiles,
    midiFiles: midiFiles,
    sonifiedWavFiles: sonifiedWavFiles,
    noteEventCsvFiles: noteEventCsvFiles,
    modelOutputNpzFiles: modelOutputNpzFiles,
    generatedFileSizes: generatedFileSizes,
    proofStatus: proofStatus,
    status: helperMissing ? helperMissing.status : proofStatus,
    helperMissing: helperMissing,
    blockers: blockers,
  };

  const reportFile = path.join(mainLogDir, "basic_pitch_e2e_proof.json");
  try {
    fs.writeFileSync(reportFile, JSON.stringify(proofReport, null, 2), "utf8");
    console.log(`[PROBE] Wrote Basic Pitch certification report: ${reportFile}`);
  } catch (err) {
    console.error(`[PROBE-ERROR] Failed to save JSON proof report: ${err.message}`);
  }
}

// Start sequence
executeBasicPitch();
