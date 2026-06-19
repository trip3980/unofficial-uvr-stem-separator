const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

console.log("==========================================================");
console.log("      ELECTRON NATIVE DESKTOP REAL AI PIPELINE E2E TEST   ");
console.log("==========================================================");

// Parse input args
const args = process.argv.slice(2);
let customPython = null;
let customModel = null;
let customInput = null;
let customOutput = null;
let customDevice = 'cpu';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--python') {
    customPython = args[i + 1];
  } else if (args[i] === '--model') {
    customModel = args[i + 1];
  } else if (args[i] === '--input') {
    customInput = args[i + 1];
  } else if (args[i] === '--output') {
    customOutput = args[i + 1];
  } else if (args[i] === '--device') {
    customDevice = args[i + 1] || 'cpu';
  }
}

// 1. Core Paths resolution
const tmpDir = path.join(__dirname, '..', 'tmp_test_runs');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const inputTrack = customInput || path.join(tmpDir, 'test_ai_source.wav');
const outputDir = customOutput || path.join(tmpDir, 'test_ai_output_stems');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper to find model folder
function getModelLibraryPath() {
  let userData = '';
  if (process.platform === 'win32') {
    userData = path.join(process.env.APPDATA || '', 'openstem-ai-audio-workstation');
    if (!fs.existsSync(userData)) {
      const oldPath = path.join(process.env.APPDATA || '', 'unofficial-uvr-stem-separator');
      if (fs.existsSync(oldPath)) userData = oldPath;
    }
  } else if (process.platform === 'darwin') {
    userData = path.join(os.homedir(), 'Library', 'Application Support', 'openstem-ai-audio-workstation');
    if (!fs.existsSync(userData)) {
      const oldPath = path.join(os.homedir(), 'Library', 'Application Support', 'unofficial-uvr-stem-separator');
      if (fs.existsSync(oldPath)) userData = oldPath;
    }
  } else {
    userData = path.join(os.homedir(), '.config', 'openstem-ai-audio-workstation');
    if (!fs.existsSync(userData)) {
      const oldPath = path.join(os.homedir(), '.config', 'unofficial-uvr-stem-separator');
      if (fs.existsSync(oldPath)) userData = oldPath;
    }
  }
  return path.join(userData, 'uvr_models');
}

function findAnyLocalModelFile(libraryPath) {
  if (!fs.existsSync(libraryPath)) return null;
  const subdirs = ['VR', 'MDX_Net', 'MDX-Net', 'Demucs', 'RoFormer', 'MDXC', 'Custom', 'Ensemble'];
  for (const sub of subdirs) {
    const subPath = path.join(libraryPath, sub);
    if (fs.existsSync(subPath)) {
      const files = fs.readdirSync(subPath);
      for (const f of files) {
        if (f.endsWith('.onnx') || f.endsWith('.pth') || f.endsWith('.ckpt')) {
          return {
            name: f,
            architecture: sub.replace('_', '-'),
            filePath: path.join(subPath, f)
          };
        }
      }
    }
  }
  return null;
}

// 2. Diagnostics Pre-requisites Verified Directly
console.log("\n[1/5] Running Core AI Dependency Checks...");

// A. Check FFmpeg
let ffmpegReady = false;
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  ffmpegReady = true;
} catch (e) {}
console.log(`  --> FFmpeg System Availability: ${ffmpegReady ? "PASSED (Installed)" : "FAILED"}`);

// B. Check Python
let pythonFound = false;
let workingCmd = 'python';
const cmds = [];
if (customPython) {
  cmds.push(customPython);
}
cmds.push('python', 'python3', 'py');

for (const cmd of cmds) {
  if (!cmd) continue;
  try {
    const execCmd = cmd.includes(' ') && !cmd.startsWith('"') ? `"${cmd}"` : cmd;
    execSync(`${execCmd} --version`, { stdio: 'ignore' });
    workingCmd = execCmd;
    pythonFound = true;
    break;
  } catch (e) {}
}
console.log(`  --> Python Environment Resolver: ${pythonFound ? `PASSED (${workingCmd})` : "FAILED"}`);

// C. Check PyTorch & audio-separator
let torchInstalled = false;
let audioSeparatorReady = false;
if (pythonFound) {
  try {
    execSync(`${workingCmd} -c "import torch"`, { stdio: 'ignore' });
    torchInstalled = true;
  } catch (e) {}
  try {
    execSync(`${workingCmd} -c "import audio_separator"`, { stdio: 'ignore' });
    audioSeparatorReady = true;
  } catch (e) {}
}
console.log(`  --> PyTorch Neural Network Module: ${torchInstalled ? "PASSED (Ready)" : "FAILED"}`);
console.log(`  --> audio-separator Package CLI: ${audioSeparatorReady ? "PASSED (Ready)" : "FAILED"}`);

// D. Model disk verification
let modelFilePath = null;
let modelFileName = null;
let modelArchitecture = "Unknown";
let modelFileSize = "Unknown";

if (customModel) {
  if (fs.existsSync(customModel)) {
    modelFilePath = customModel;
    modelFileName = path.basename(customModel);
    const stat = fs.statSync(customModel);
    modelFileSize = `${(stat.size / (1024 * 1024)).toFixed(1)} MB`;
    const parts = customModel.split(path.sep);
    modelArchitecture = parts[parts.length - 2] || "MDX_Net";
  }
} else {
  const libPath = getModelLibraryPath();
  const discoveredModel = findAnyLocalModelFile(libPath);
  console.log(`  --> Model Library Path: "${libPath}"`);
  if (discoveredModel) {
    modelFilePath = discoveredModel.filePath;
    modelFileName = discoveredModel.name;
    modelArchitecture = discoveredModel.architecture;
    const stat = fs.statSync(discoveredModel.filePath);
    modelFileSize = `${(stat.size / (1024 * 1024)).toFixed(1)} MB`;
  }
}

if (modelFilePath) {
  console.log(`  --> Selected Model File: "${modelFileName}" (${modelArchitecture})`);
  console.log(`  --> Model File Path: "${modelFilePath}"`);
  console.log(`  --> Model File Size: ${modelFileSize}`);
} else {
  console.log(`  --> Selected Model File status: MISSING (No model specified or found)`);
}

// 3. Evaluation Gate for real AI Execution
const canRunAI = ffmpegReady && pythonFound && torchInstalled && audioSeparatorReady && modelFilePath;

if (!canRunAI) {
  console.log("\n[!] VERIFICATION CODES: BLOCKED");
  console.log("  --> Missing pre-requisites for Real AI Separation Test.");
  if (!ffmpegReady) console.log("      * Reason: FFmpeg binary is missing.");
  if (!pythonFound) console.log("      * Reason: Python environment is missing.");
  if (!torchInstalled) console.log("      * Reason: PyTorch module is missing.");
  if (!audioSeparatorReady) console.log("      * Reason: audio-separator pack is missing.");
  if (!modelFilePath) console.log("      * Reason: No model weight file is selected or downloaded.");
  console.log("\nRESULT: BLOCKED - Real AI/model-based separation is not proven yet.");
  console.log("==========================================================");
  process.exit(2); // Exit with blocked status
}

// Validate execution device availability
let finalRunDevice = 'cpu';
if (pythonFound && torchInstalled) {
  try {
    const torchCheckCode = "import torch; cuda = torch.cuda.is_available() if hasattr(torch, 'cuda') else False; mps = torch.backends.mps.is_available() if hasattr(torch.backends, 'mps') else False; print(f'{cuda}|{mps}')";
    const torchOutput = execSync(`${workingCmd} -c "${torchCheckCode}"`, { encoding: 'utf8', timeout: 5000 }).trim();
    const parts = torchOutput.split('|');
    const cudaAvailable = parts[0] === 'True';
    const mpsAvailable = parts[1] === 'True';

    if (customDevice === 'cuda') {
      if (!cudaAvailable) {
        console.error(`\n[!] VERIFICATION CODES: FAILED (CUDA requested but unavailable via PyTorch)`);
        process.exit(1);
      }
      finalRunDevice = 'cuda';
    } else if (customDevice === 'mps') {
      if (!mpsAvailable) {
        console.error(`\n[!] VERIFICATION CODES: FAILED (MPS requested but unavailable on this platform)`);
        process.exit(1);
      }
      finalRunDevice = 'mps';
    } else if (customDevice === 'dml' || customDevice === 'directml') {
      finalRunDevice = 'dml';
    } else if (customDevice === 'auto') {
      if (cudaAvailable) {
        finalRunDevice = 'cuda';
      } else if (mpsAvailable) {
        finalRunDevice = 'mps';
      } else {
        finalRunDevice = 'cpu';
      }
    } else {
      finalRunDevice = 'cpu';
    }
  } catch (e) {
    if (customDevice !== 'cpu' && customDevice !== 'auto') {
      console.error(`\n[!] VERIFICATION CODES: FAILED (Error verifying hardware support: ${e.message})`);
      process.exit(1);
    }
    finalRunDevice = 'cpu';
  }
}
console.log(`  --> Mapped Execution Device: "${finalRunDevice}" (User option: "${customDevice}")`);

// Validate input track
if (customInput && !fs.existsSync(customInput)) {
  console.error(`\n[!] VERIFICATION CODES: BLOCKED (Input audio file missing: "${customInput}")`);
  process.exit(2);
}

// 4. Synthesize valid audio wav test target via FFmpeg (if not customInput)
if (!customInput) {
  console.log("\n[2/5] Synthesizing Real Audio Source Target...");
  try {
    execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 2 "${inputTrack}" -y`, { stdio: 'ignore' });
    console.log(`  --> Generated test WAV file at: "${inputTrack}"`);
  } catch (err) {
    console.error("  --> FAILED: Cannot generate WAV input", err.message);
    process.exit(1);
  }
} else {
  console.log(`\n[2/5] Using Custom Audio Source Target: "${inputTrack}"`);
}

// 5. Spawn real audio-separator CLI command process
console.log("\n[3/5] Starting Real AI Subprocess Execution...");
for (const f of fs.readdirSync(outputDir)) {
  try { fs.unlinkSync(path.join(outputDir, f)); } catch (e) {}
}
const filesBefore = new Set(fs.readdirSync(outputDir));

const cliArgs = [
  '-m', 'audio_separator.cli',
  inputTrack,
  '--model_filename', modelFilePath,
  '--output_dir', outputDir,
  '--device', finalRunDevice
];

console.log(`  --> Spawning Process: ${workingCmd} ${cliArgs.join(' ')}`);

const child = spawn(workingCmd, cliArgs);

child.stdout.on('data', (data) => {
  console.log(`      [audio_separator-out] ${data.toString().trim()}`);
});

child.stderr.on('data', (data) => {
  console.log(`      [audio_separator-err] ${data.toString().trim()}`);
});

child.on('close', (code) => {
  console.log(`  --> Subprocess closed with exit code: ${code}`);
  if (code !== 0) {
    console.error(`\n[!] VERIFICATION CODES: FAILED (Exit Code ${code})`);
    console.log("==========================================================");
    process.exit(1);
  }

  // 6. Output Integrity Checks
  console.log("\n[4/5] Scanning and Verifying Physical Output Stems on Disk...");
  const filesAfter = fs.readdirSync(outputDir);
  const newlyCreated = filesAfter.filter(f => !filesBefore.has(f)).map(f => path.join(outputDir, f));

  let verifiedStems = 0;
  newlyCreated.forEach(filePath => {
    const stat = fs.statSync(filePath);
    console.log(`  --> Discovered Stems: "${path.basename(filePath)}" (${stat.size} bytes)`);
    if (stat.size > 0) {
      verifiedStems++;
    }
  });

  if (verifiedStems > 0) {
    console.log("\n[5/5] VERIFICATION CHECKS: PASSED");
    console.log(`  --> Label: AI model separation output`);
    console.log(`  --> Verified Stems Count: ${verifiedStems}`);
    console.log("\n==========================================================");
    console.log("RESULT: SUCCESS - Pure AI/model-based separation works!");
    console.log("==========================================================");
    process.exit(0);
  } else {
    console.error("\n[5/5] VERIFICATION CHECKS: FAILED");
    console.error("  --> No valid, non-empty output stems were created on disk.");
    console.log("==========================================================");
    process.exit(1);
  }
});
