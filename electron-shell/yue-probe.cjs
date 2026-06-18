const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Parse CLI Arguments
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    // Handle booleans or value arguments
    if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) {
      args[key] = process.argv[i + 1];
      i++;
    } else {
      args[key] = true;
    }
  }
}

// Map key arguments safely
const pythonPath = args['python'] || 'python';
const yueRoot = args['yue-root'] || '';
const genreTxt = args['genre'] || '';
const lyricsTxt = args['lyrics'] || '';
const outputDir = args['output'] || '';
const deviceRequested = args['device'] || 'cpu';
const stage1Model = args['stage1-model'] || '';
const stage2Model = args['stage2-model'] || '';
const runSegments = parseInt(args['segments'], 10) || 1;
const maxNewTokens = parseInt(args['max-new-tokens'], 10) || 3000;
const stage2BatchSize = parseInt(args['stage2-batch-size'], 10) || 1;
const repetitionPenalty = parseFloat(args['repetition-penalty']) || 1.1;

// Audio prompt (ICL) options
const useAudioPrompt = !!args['use-audio-prompt'] || !!args['use_audio_prompt'];
const audioPromptPath = args['audio-prompt-path'] || args['audio_prompt_path'] || '';
const useDualTracksPrompt = !!args['use-dual-tracks-prompt'] || !!args['use_dual_tracks_prompt'];
const vocalTrackPromptPath = args['vocal-track-prompt-path'] || args['vocal_track_prompt_path'] || '';
const instrumentalTrackPromptPath = args['instrumental-track-prompt-path'] || args['instrumental_track_prompt_path'] || '';
const promptStartTime = args['prompt-start-time'] || args['prompt_start_time'] || '';
const promptEndTime = args['prompt-end-time'] || args['prompt_end_time'] || '';

const isDryRun = !!args['dry-run'];
const isRealRun = !!args['run'];

console.log('----------------------------------------------------');
console.log('YuE local integration runner initialized');
console.log(`Dry-run mode: ${isDryRun}`);
console.log(`Real run mode: ${isRealRun}`);
console.log('----------------------------------------------------');

const blockers = [];
let pythonVersion = 'None';
let torchVersion = 'None';
let cudaAvailable = false;
let cudaDeviceName = null;
let transformersInstalled = false;
let flashAttentionInstalled = false;
let yueRootExists = false;
let inferPyExists = false;
let requirementsStatus = 'Unverified';

// Validate Output Directory first so we can write report there
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
  blockers.push("No output directory path was selected.");
}

// 1. Verify python path
let pythonWorking = false;
try {
  const versionOut = execSync(`"${pythonPath}" --version`, { encoding: 'utf8', timeout: 3000 });
  if (versionOut && (versionOut.toLowerCase().includes('python') || /^[0-9.]+/i.test(versionOut.trim()))) {
    pythonWorking = true;
    pythonVersion = versionOut.replace(/python/i, '').trim();
  }
} catch (err) {
  blockers.push(`Python executable path invalid or non-executable: "${pythonPath}"`);
}

// 2. Spawn python backend probe to read torch/transformers statistics
if (pythonWorking) {
  try {
    const probeScriptPath = path.join(__dirname, '../scripts/yue_probe.py');
    if (fs.existsSync(probeScriptPath)) {
      const probeRunCmd = `"${pythonPath}" "${probeScriptPath}" --yue-root "${yueRoot}" --output "${outputDir}"`;
      const probeOut = execSync(probeRunCmd, { encoding: 'utf8', timeout: 5000 });
      if (probeOut) {
        const pData = JSON.parse(probeOut.trim());
        torchVersion = pData.torchVersion || 'None';
        cudaAvailable = !!pData.cudaAvailable;
        cudaDeviceName = pData.cudaDeviceName || null;
        transformersInstalled = !!pData.transformersInstalled;
        flashAttentionInstalled = !!pData.flashAttentionInstalled;
        yueRootExists = !!pData.yueRootExists;
        inferPyExists = !!pData.inferPyExists;
        requirementsStatus = pData.requirementsStatus || 'Unverified';
        
        // Extract probe-detected python-side blockers if any
        if (pData.blockers && pData.blockers.length > 0) {
          pData.blockers.forEach(b => {
            if (!blockers.includes(b)) blockers.push(b);
          });
        }
      }
    } else {
      blockers.push("Internal scripting file 'scripts/yue_probe.py' is missing.");
    }
  } catch (err) {
    blockers.push(`Failed running python-environment verification probe: ${err.message}`);
  }
}

// Auto-resolve genre and lyrics strings into local temporary prompt text files
let finalGenrePath = genreTxt;
if (genreTxt) {
  try {
    const isFile = fs.existsSync(path.resolve(genreTxt));
    if (!isFile) {
      const tempPath = path.join(mainLogDir, 'temp_genre.txt');
      fs.writeFileSync(tempPath, genreTxt, 'utf8');
      finalGenrePath = tempPath;
    }
  } catch (err) {
    blockers.push(`Failed to write temporary genre prompt file: ${err.message}`);
  }
} else if (!isDryRun) {
  blockers.push("Genre prompt string or file is mandatory for real YuE generation runs.");
}

let finalLyricsPath = lyricsTxt;
if (lyricsTxt) {
  try {
    const isFile = fs.existsSync(path.resolve(lyricsTxt));
    if (!isFile) {
      const tempPath = path.join(mainLogDir, 'temp_lyrics.txt');
      fs.writeFileSync(tempPath, lyricsTxt, 'utf8');
      finalLyricsPath = tempPath;
    }
  } catch (err) {
    blockers.push(`Failed to write temporary lyrics prompt file: ${err.message}`);
  }
} else if (!isDryRun) {
  blockers.push("Lyrics prompt string or file is mandatory for real YuE generation runs.");
}

// Check models configuration
if (!stage1Model) {
  blockers.push("Stage 1 model name/path was not configured.");
}
if (!stage2Model) {
  blockers.push("Stage 2 model name/path was not configured.");
}

// Validate hardware acceleration
if (deviceRequested === 'cuda' && !cudaAvailable) {
  blockers.push("CUDA selected but NVIDIA GPU / CUDA library is not available in PyTorch.");
}

// Prepare commands
const executionInferPy = path.join(yueRoot, 'inference', 'infer.py');
let commandToRun = '';
let exitCode = -1;
let stdoutSummary = '';
let stderrSummary = '';
let proofStatus = 'BLOCKED';
let generatedFiles = [];
let generatedFileSizes = {};

if (blockers.length === 0 && yueRootExists && inferPyExists) {
  // Build safe YuE inference command arguments list
  const commandArgs = [];
  
  commandArgs.push('inference/infer.py');
  commandArgs.push('--stage1_model', stage1Model);
  commandArgs.push('--stage2_model', stage2Model);
  commandArgs.push('--genre_txt', finalGenrePath);
  commandArgs.push('--lyrics_txt', finalLyricsPath);
  commandArgs.push('--run_n_segments', runSegments.toString());
  commandArgs.push('--stage2_batch_size', stage2BatchSize.toString());
  commandArgs.push('--output_dir', outputDir);
  commandArgs.push('--max_new_tokens', maxNewTokens.toString());
  commandArgs.push('--repetition_penalty', repetitionPenalty.toString());
  
  // Set CUDA index derived from device or use default 0
  if (deviceRequested === 'cuda' || cudaAvailable) {
    commandArgs.push('--cuda_idx', '0');
  }

  // Handle Prompt Option combinations strictly matching inspected repo arguments
  if (useAudioPrompt && audioPromptPath) {
    commandArgs.push('--use_audio_prompt');
    commandArgs.push('--audio_prompt_path', audioPromptPath);
    if (promptStartTime) commandArgs.push('--prompt_start_time', promptStartTime.toString());
    if (promptEndTime) commandArgs.push('--prompt_end_time', promptEndTime.toString());
  } else if (useDualTracksPrompt && vocalTrackPromptPath && instrumentalTrackPromptPath) {
    commandArgs.push('--use_dual_tracks_prompt');
    commandArgs.push('--vocal_track_prompt_path', vocalTrackPromptPath);
    commandArgs.push('--instrumental_track_prompt_path', instrumentalTrackPromptPath);
    if (promptStartTime) commandArgs.push('--prompt_start_time', promptStartTime.toString());
    if (promptEndTime) commandArgs.push('--prompt_end_time', promptEndTime.toString());
  }

  // Final full command string preview
  commandToRun = `"${pythonPath}" ${commandArgs.map(x => x.includes(' ') || x.includes('&') ? `"${x}"` : x).join(' ')}`;
}

async function executeInference() {
  if (blockers.length > 0) {
    proofStatus = 'BLOCKED';
    writeReport();
    return;
  }

  if (isDryRun && !isRealRun) {
    proofStatus = 'DRY_RUN_ONLY';
    exitCode = 0;
    stdoutSummary = `Dry-run check completed successfully. Environment is ready for local generation. Ready to execute command: ${commandToRun}`;
    console.log('[PROBE] Environment verified successfully. Dry-run complete.');
    writeReport();
    return;
  }

  // Execute Real Run!
  console.log(`[EXEC] Launching child subprocess for real YuE inference...\nCWD: ${yueRoot}\nCmd: ${commandToRun}`);
  proofStatus = 'FAIL'; // default until positive completion verified
  
  const executableMain = pythonPath;
  const parts = commandToRun.split(' ').slice(1);
  const parsedParts = [];
  
  // Custom un-quoting for argument delivery to spawn
  for (let i = 0; i < parts.length; i++) {
    let p = parts[i];
    if (p.startsWith('"') && p.endsWith('"')) {
      p = p.slice(1, -1);
    }
    parsedParts.push(p);
  }

  const child = spawn(executableMain, [path.join(yueRoot, 'inference', 'infer.py'), ...parsedParts.slice(1)], {
    cwd: yueRoot
  });

  const stdoutChunks = [];
  const stderrChunks = [];

  child.stdout.on('data', (chunk) => {
    stdoutChunks.push(chunk);
    process.stdout.write(chunk);
  });

  child.stderr.on('data', (chunk) => {
    stderrChunks.push(chunk);
    process.stderr.write(chunk);
  });

  await new Promise((resolve) => {
    child.on('close', (code) => {
      exitCode = code;
      resolve();
    });
  });

  stdoutSummary = Buffer.concat(stdoutChunks).toString('utf8');
  stderrSummary = Buffer.concat(stderrChunks).toString('utf8');

  // Verify outputs
  if (exitCode === 0 && outputDir && fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir);
    const audioFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ext === '.wav' || ext === '.mp3' || ext === '.flac';
    });

    if (audioFiles.length > 0) {
      let nonZeroCount = 0;
      audioFiles.forEach(f => {
        const full = path.join(outputDir, f);
        const stats = fs.statSync(full);
        if (stats.size > 0) {
          generatedFiles.push(f);
          generatedFileSizes[f] = stats.size;
          nonZeroCount++;
        }
      });

      if (nonZeroCount > 0) {
        proofStatus = 'PASS';
        console.log('[PROBE-SUCCESS] Local YuE generation verified! Proof of generation complete.');
      } else {
        blockers.push("All written audio files inside the output directory are empty 0-byte records.");
      }
    } else {
      blockers.push("No generated audio files (.wav, .mp3, .flac) found in the output folder after inference exit 0.");
    }
  } else {
    blockers.push(`Inference execution failed with process exit code: ${exitCode}`);
  }

  writeReport();
}

function writeReport() {
  const proofReport = {
    timestamp: new Date().toISOString(),
    yueRoot: yueRoot,
    pythonPath: pythonPath,
    pythonVersion: pythonVersion,
    torchVersion: torchVersion,
    cudaAvailable: cudaAvailable,
    cudaDeviceName: cudaDeviceName,
    deviceRequested: deviceRequested,
    deviceUsed: cudaAvailable ? 'cuda' : 'cpu',
    stage1Model: stage1Model,
    stage2Model: stage2Model,
    genreTxt: genreTxt,
    lyricsTxt: lyricsTxt,
    runSegments: runSegments,
    stage2BatchSize: stage2BatchSize,
    maxNewTokens: maxNewTokens,
    repetitionPenalty: repetitionPenalty,
    outputDir: outputDir,
    commandExecuted: commandToRun || "None - Blocked or Not Built",
    exitCode: exitCode,
    stdoutSummary: stdoutSummary ? stdoutSummary.trim().slice(-1000) : '', // keep compact
    stderrSummary: stderrSummary ? stderrSummary.trim().slice(-2000) : '',
    generatedFiles: generatedFiles,
    generatedFileSizes: generatedFileSizes,
    proofStatus: proofStatus,
    blockers: blockers
  };

  const reportFile = path.join(mainLogDir, 'yue_e2e_proof.json');
  try {
    fs.writeFileSync(reportFile, JSON.stringify(proofReport, null, 2), 'utf8');
    console.log(`[PROBE] Wrote proof certification report: ${reportFile}`);
  } catch (err) {
    console.error(`[PROBE-ERROR] Failed to save JSON proof report: ${err.message}`);
  }
}

// Start processing sequence
executeInference();
