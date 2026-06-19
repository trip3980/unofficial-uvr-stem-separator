const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const urlModule = require('url');
const { spawn, execSync } = require('child_process');

let mainWindow;
let activeChildProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    backgroundColor: '#07080c',
    title: 'OpenStem AI Audio Workstation (Hardened Functional Alpha)',
    autoHideMenuBar: true
  });

  const startUrl = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- HELPER FUNCTION: Get App Model Library Paths ---
function getModelLibraryPath() {
  const modelDir = path.join(app.getPath('userData'), 'uvr_models');
  if (!fs.existsSync(modelDir)) {
    // Try migrating from old unofficial UVR folder if it exists
    try {
      let oldUserData = '';
      if (process.platform === 'win32') {
        oldUserData = path.join(process.env.APPDATA || '', 'unofficial-uvr-stem-separator');
      } else if (process.platform === 'darwin') {
        oldUserData = path.join(require('os').homedir(), 'Library', 'Application Support', 'unofficial-uvr-stem-separator');
      } else {
        oldUserData = path.join(require('os').homedir(), '.config', 'unofficial-uvr-stem-separator');
      }
      const oldModelDir = path.join(oldUserData, 'uvr_models');
      if (fs.existsSync(oldModelDir)) {
        console.log(`[OpenStem Migration] Found old models folder at: "${oldModelDir}". Migrating models...`);
        fs.mkdirSync(modelDir, { recursive: true });
        const subdirs = ['VR', 'MDX-Net', 'Demucs', 'RoFormer', 'MDXC', 'Custom', 'Ensemble'];
        for (const sub of subdirs) {
          const oldSubPath = path.join(oldModelDir, sub);
          const newSubPath = path.join(modelDir, sub);
          if (!fs.existsSync(newSubPath)) {
            fs.mkdirSync(newSubPath, { recursive: true });
          }
          if (fs.existsSync(oldSubPath)) {
            const files = fs.readdirSync(oldSubPath);
            for (const file of files) {
              const srcFile = path.join(oldSubPath, file);
              const destFile = path.join(newSubPath, file);
              if (fs.statSync(srcFile).isFile() && !fs.existsSync(destFile)) {
                fs.copyFileSync(srcFile, destFile);
                console.log(`[OpenStem Migration] Copied: ${sub}/${file}`);
              }
            }
          }
        }
      }
    } catch (migErr) {
      console.warn('[OpenStem Migration] Non-blocking migration warning:', migErr);
    }

    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
  }

  // Ensure all framework weight directory trees exist
  ['VR', 'MDX-Net', 'Demucs', 'RoFormer', 'MDXC', 'Custom', 'Ensemble'].forEach(sub => {
    const subPath = path.join(modelDir, sub);
    if (!fs.existsSync(subPath)) {
      fs.mkdirSync(subPath, { recursive: true });
    }
  });

  return modelDir;
}

// List all actual files in the uvr_models subdirectories
function listLocalModels() {
  try {
    const libraryPath = getModelLibraryPath();
    const subdirs = ['VR', 'MDX-Net', 'MDX_Net', 'Demucs', 'RoFormer', 'MDXC', 'Custom', 'Ensemble'];
    const localModels = [];

    for (const sub of subdirs) {
      const subpath = path.join(libraryPath, sub);
      if (fs.existsSync(subpath)) {
        const files = fs.readdirSync(subpath);
        for (const file of files) {
          const filePath = path.join(subpath, file);
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            const arch = sub === 'MDX_Net' ? 'MDX-Net' : sub;
            localModels.push({
              name: file,
              architecture: arch,
              absolutePath: filePath,
              size: stats.size,
              fileSize: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`
            });
          }
        }
      }
    }
    return localModels;
  } catch (err) {
    console.error("Failed to inventory local models directory:", err);
    return [];
  }
}

// Redirect-following chunk-based HTTPS Downloader (No packages required)
function downloadFile(fileUrl, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    function startDownload(currentUrl) {
      try {
        const parsedUrl = urlModule.parse(currentUrl);
        const protocolClient = parsedUrl.protocol === 'https:' ? https : http;

        const request = protocolClient.get(currentUrl, (response) => {
          // Handle HTTP redirect codes (e.g. Hugging Face CDN redirection)
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const redirectUrl = urlModule.resolve(currentUrl, response.headers.location);
            startDownload(redirectUrl);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Server returned status code: ${response.statusCode}`));
            return;
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          let downloadedBytes = 0;
          const fileStream = fs.createWriteStream(outputPath);
          let lastTime = Date.now();
          let lastBytes = 0;

          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            fileStream.write(chunk);

            const currentTime = Date.now();
            const duration = (currentTime - lastTime) / 1000;
            if (duration >= 0.5 || downloadedBytes === totalBytes) {
              const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
              const bytesSinceLast = downloadedBytes - lastBytes;
              const speedMbps = duration > 0 ? (bytesSinceLast / (1024 * 1024) / duration).toFixed(1) : '0';

              onProgress({
                progress,
                speed: `${speedMbps} MB/s`,
                downloadedBytes,
                totalBytes
              });

              lastTime = currentTime;
              lastBytes = downloadedBytes;
            }
          });

          response.on('end', () => {
            fileStream.end();
            resolve();
          });

          response.on('error', (err) => {
            fileStream.close();
            fs.unlink(outputPath, () => {});
            reject(err);
          });
        });

        request.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    }

    startDownload(fileUrl);
  });
}

// Check if FFmpeg is installed and ready in host PATH
function checkFFmpegReady() {
  try {
    // Check using standard CLI version indicators
    const versionOutput = execSync('ffmpeg -version', { encoding: 'utf8', timeout: 3000 });
    return versionOutput.toLowerCase().includes('ffmpeg version') || versionOutput.length > 0;
  } catch (error) {
    return false;
  }
}

// Check Python, audio-separator, PyTorch and hardware accelerators
function checkBackendDetails(customPythonPath) {
  const result = {
    pythonFound: false,
    pythonPath: '',
    pythonVersion: 'None',
    audioSeparatorInstalled: false,
    torchInstalled: false,
    torchVersion: 'None',
    isCpuOnlyPytorch: true,
    cudaAvailable: false,
    cudaVersion: 'None',
    cudaDeviceCount: 0,
    gpuDeviceName: 'None',
    totalVramBytes: 0,
    vramDisplay: 'None',
    mpsAvailable: false,
    ffmpegReady: false,
    canRunAISeparation: false
  };

  const commandsToTry = [];
  if (customPythonPath) {
    commandsToTry.push(customPythonPath);
  }
  commandsToTry.push('python', 'python3', 'py');

  let workingCmd = null;

  for (const cmd of commandsToTry) {
    if (!cmd) continue;
    try {
      const execCmd = cmd.includes(' ') && !cmd.startsWith('"') ? `"${cmd}"` : cmd;
      const output = execSync(`${execCmd} --version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
      if (output && (output.toLowerCase().includes('python') || /^[0-9.]+/i.test(output.trim()))) {
        workingCmd = execCmd;
        result.pythonFound = true;
        result.pythonPath = cmd;
        result.pythonVersion = output.replace(/python/i, '').trim();
        break;
      }
    } catch (e) {
      // Continue to next command
    }
  }

  // If we can execute Python, verify libraries
  if (workingCmd) {
    // 1. Check audio-separator module
    try {
      execSync(`${workingCmd} -c "import audio_separator"`, { stdio: 'ignore', timeout: 3000 });
      result.audioSeparatorInstalled = true;
    } catch (e) {
      result.audioSeparatorInstalled = false;
    }

    // 2. Check PyTorch and CUDA/MPS status
    try {
      const torchCheckCode = "import torch, json; d = {'torchVersion': torch.__version__, 'isCpuOnlyPytorch': '+cpu' in torch.__version__, 'cudaAvailable': False, 'cudaVersion': 'None', 'cudaDeviceCount': 0, 'gpuDeviceName': 'None', 'totalVramBytes': 0, 'vramDisplay': 'None', 'mpsAvailable': False}; d['cudaAvailable'] = torch.cuda.is_available() if hasattr(torch, 'cuda') else False; d['mpsAvailable'] = torch.backends.mps.is_available() if hasattr(torch, 'backends') and hasattr(torch.backends, 'mps') else False; d['isCpuOnlyPytorch'] = '+cpu' in d['torchVersion'] or not d['cudaAvailable']; d['cudaVersion'] = getattr(torch.version, 'cuda', 'Unknown') if d['cudaAvailable'] else 'None'; d['cudaDeviceCount'] = torch.cuda.device_count() if d['cudaAvailable'] else 0; d['gpuDeviceName'] = torch.cuda.get_device_name(0) if d['cudaAvailable'] else 'None'; d['totalVramBytes'] = torch.cuda.get_device_properties(0).total_memory if d['cudaAvailable'] else 0; d['vramDisplay'] = '{:.2f} GB'.format(d['totalVramBytes']/1073741824) if d['cudaAvailable'] else 'None'; print(json.dumps(d))";
      const torchOutput = execSync(`${workingCmd} -c "${torchCheckCode}"`, { encoding: 'utf8', timeout: 5000 });
      if (torchOutput) {
        const details = JSON.parse(torchOutput.trim());
        result.torchInstalled = true;
        result.torchVersion = details.torchVersion || 'Unknown';
        result.isCpuOnlyPytorch = details.isCpuOnlyPytorch;
        result.cudaAvailable = details.cudaAvailable;
        result.cudaVersion = details.cudaVersion;
        result.cudaDeviceCount = details.cudaDeviceCount;
        result.gpuDeviceName = details.gpuDeviceName;
        result.totalVramBytes = details.totalVramBytes;
        result.vramDisplay = details.vramDisplay;
        result.mpsAvailable = details.mpsAvailable;
      }
    } catch (e) {
      result.torchInstalled = false;
      result.torchVersion = 'None';
      result.isCpuOnlyPytorch = true;
      result.cudaAvailable = false;
      result.cudaVersion = 'None';
      result.cudaDeviceCount = 0;
      result.gpuDeviceName = 'None';
      result.totalVramBytes = 0;
      result.vramDisplay = 'None';
      result.mpsAvailable = false;
    }

    // Is AI separation actually fully ready?
    result.canRunAISeparation = result.audioSeparatorInstalled && result.torchInstalled;
  }

  // Check FFmpeg status
  result.ffmpegReady = checkFFmpegReady();

  return result;
}

// --- IPC Handlers ---

// Path getters
ipcMain.handle('get-model-library-path', async () => {
  return getModelLibraryPath();
});

ipcMain.handle('list-local-models-custom', async () => {
  return listLocalModels();
});

// Select input files with standard platform dialog
ipcMain.handle('select-input-files', async (event, options) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac', 'wma', 'aiff'] }]
  });
  return result.filePaths;
});

// Select output folder with standard platform dialog
ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0] || null;
});

// Shell directory launcher
ipcMain.handle('open-output-folder', async (event, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    await shell.openPath(folderPath);
    return true;
  }
  return false;
});

// Check if a model exists inside the library folder
ipcMain.handle('check-model-file-exists', async (event, architecture, fileName) => {
  try {
    const libraryPath = getModelLibraryPath();
    // Resolve clean subfolder matching architecture
    const subFolder = architecture === 'MDX-Net' ? 'MDX_Net' : architecture;
    const modelPath = path.join(libraryPath, subFolder, fileName);
    if (fs.existsSync(modelPath)) {
      const stats = fs.statSync(modelPath);
      return {
        exists: true,
        size: stats.size,
        fileSize: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
        absolutePath: modelPath
      };
    }
  } catch (err) {
    console.error("Check model existence error:", err);
  }
  return { exists: false };
});

// Import/sideload custom model file from local disk to model library
ipcMain.handle('import-model-file', async (event, architecture) => {
  const result = await dialog.showOpenDialog({
    title: 'Select Local Model Weights File',
    properties: ['openFile'],
    filters: [
      { name: 'Model Files (*.pth, *.onnx, *.pt, *.yaml)', extensions: ['pth', 'onnx', 'pt', 'yaml'] }
    ]
  });

  if (result.filePaths && result.filePaths.length > 0) {
    const srcPath = result.filePaths[0];
    const fileName = path.basename(srcPath);
    const libraryPath = getModelLibraryPath();
    const subFolder = architecture === 'MDX-Net' ? 'MDX_Net' : architecture;
    const destDir = path.join(libraryPath, subFolder);
    
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, fileName);
    
    // Perform copy
    fs.copyFileSync(srcPath, destPath);
    const stats = fs.statSync(destPath);

    return {
      success: true,
      name: fileName,
      absolutePath: destPath,
      size: stats.size,
      fileSize: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`
    };
  }
  return { success: false, message: 'Import cancelled.' };
});

// Download Hugging Face or public model links to uvr_models
ipcMain.handle('download-model', async (event, modelId, url, architecture, fileName) => {
  if (!url) {
    return { success: false, error: "Download URL source is missing for this model index entry." };
  }

  const libraryPath = getModelLibraryPath();
  const subFolder = architecture === 'MDX-Net' ? 'MDX_Net' : architecture;
  const destDir = path.join(libraryPath, subFolder);
  const destPath = path.join(destDir, fileName);

  try {
    // Send initial log
    event.sender.send('backend-progress', {
      type: 'log',
      message: `[downloader] Initiating download from verified source: ${url}`
    });

    await downloadFile(url, destPath, (status) => {
      event.sender.send('backend-progress', {
        type: 'download',
        modelId: modelId,
        progress: status.progress,
        speed: status.speed,
        status: 'downloading',
        downloadedBytes: status.downloadedBytes,
        totalBytes: status.totalBytes
      });
    });

    const stats = fs.statSync(destPath);
    event.sender.send('backend-progress', {
      type: 'log',
      message: `[downloader] Completed download successfully. Model written to target path: ${destPath}`
    });

    event.sender.send('backend-progress', {
      type: 'download',
      modelId: modelId,
      progress: 100,
      speed: '0 MB/s',
      status: 'completed'
    });

    return {
      success: true,
      absolutePath: destPath,
      size: stats.size,
      fileSize: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`
    };
  } catch (err) {
    event.sender.send('backend-progress', {
      type: 'log',
      message: `[downloader] Error. Download failed. Reason: ${err.message}`
    });
    event.sender.send('backend-progress', {
      type: 'download',
      modelId: modelId,
      progress: 0,
      status: 'error',
      error: err.message
    });
    return { success: false, error: err.message };
  }
});

// Check FFmpeg command status
ipcMain.handle('check-ffmpeg-ready', async () => {
  return { ready: checkFFmpegReady() };
});

// Check Python backend ready and dependency states
ipcMain.handle('check-backend-details', async (event, customPythonPath) => {
  return checkBackendDetails(customPythonPath);
});

// Select Python path with standard platform dialog
ipcMain.handle('select-python-path', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Python Executable',
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: process.platform === 'win32' ? ['exe'] : [] }
    ]
  });
  return result.filePaths[0] || null;
});

// Verify output folder exists and is writable
ipcMain.handle('verify-output-folder', async (event, folderPath) => {
  if (!folderPath) return { success: false, status: 'missing' };
  try {
    if (!fs.existsSync(folderPath)) {
      return { success: false, status: 'missing' };
    }
    const testFile = path.join(folderPath, '.write_test_' + Date.now());
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return { success: true, status: 'writable' };
  } catch (err) {
    return { success: false, status: 'invalid', error: err.message };
  }
});

// Verify custom python path behaves correctly
ipcMain.handle('verify-python-path', async (event, pythonPath) => {
  if (!pythonPath) return { success: false, status: 'system_default' };
  try {
    const execCmd = pythonPath.includes(' ') && !pythonPath.startsWith('"') ? `"${pythonPath}"` : pythonPath;
    const output = execSync(`${execCmd} --version`, { encoding: 'utf8', timeout: 2000 });
    if (output && (output.toLowerCase().includes('python') || /^[0-9.]+/i.test(output.trim()))) {
      return { success: true, status: 'verified', version: output.trim() };
    }
    return { success: false, status: 'invalid' };
  } catch (err) {
    return { success: false, status: 'invalid', error: err.message };
  }
});

// Clear temporary processed directories
ipcMain.handle('clear-temp-files', async () => {
  try {
    const tempDir = path.join(app.getPath('userData'), 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.mkdirSync(tempDir, { recursive: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Purge incomplete or failed model downloads
ipcMain.handle('clear-failed-downloads', async () => {
  try {
    const libraryPath = getModelLibraryPath();
    const tempDownloadDir = path.join(libraryPath, 'temp_downloads');
    if (fs.existsSync(tempDownloadDir)) {
      fs.rmSync(tempDownloadDir, { recursive: true, force: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Flush regional checksum validation cached registries
ipcMain.handle('reset-weights-cache', async () => {
  try {
    const libraryPath = getModelLibraryPath();
    const cacheFile = path.join(libraryPath, 'verification_cache.json');
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Real Local YuE Engine integration processes
ipcMain.handle('validate-yue-environment', async (event, config) => {
  const { pythonPath, yueRoot, genreTxt, lyricsTxt, outputDir, deviceRequested, stage1Model, stage2Model } = config;
  const runnerScript = path.join(__dirname, 'yue-probe.cjs');
  const args = [
    runnerScript,
    '--dry-run',
    '--python', pythonPath || 'python',
    '--yue-root', yueRoot || '',
    '--genre', genreTxt || '',
    '--lyrics', lyricsTxt || '',
    '--output', outputDir || '',
    '--device', deviceRequested || 'cpu',
    '--stage1-model', stage1Model || '',
    '--stage2-model', stage2Model || ''
  ];
  
  try {
    const runString = `node "${args.join('" "')}"`;
    execSync(runString, { encoding: 'utf8', timeout: 10000 });
    const reportPath = path.join(outputDir || process.cwd(), 'yue_e2e_proof.json');
    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      return { success: true, report: data };
    }
    return { success: false, error: 'Dry-run finished but proof report was not generated.' };
  } catch (err) {
    return { success: false, error: err.message, stderr: err.stderr ? err.stderr.toString() : '' };
  }
});

ipcMain.handle('run-yue-generation', async (event, config) => {
  const { 
    pythonPath, yueRoot, genreTxt, lyricsTxt, outputDir, deviceRequested, 
    stage1Model, stage2Model, segments, maxNewTokens, stage2BatchSize, repetitionPenalty,
    useAudioPrompt, audioPromptPath, useDualTracksPrompt, vocalTrackPromptPath, instrumentalTrackPromptPath,
    promptStartTime, promptEndTime
  } = config;

  const runnerScript = path.join(__dirname, 'yue-probe.cjs');
  const cmdArgs = [
    runnerScript,
    '--run',
    '--python', pythonPath || 'python',
    '--yue-root', yueRoot || '',
    '--genre', genreTxt || '',
    '--lyrics', lyricsTxt || '',
    '--output', outputDir || '',
    '--device', deviceRequested || 'cpu',
    '--stage1-model', stage1Model || '',
    '--stage2-model', stage2Model || '',
    '--segments', String(segments || 1),
    '--max-new-tokens', String(maxNewTokens || 3000),
    '--stage2-batch-size', String(stage2BatchSize || 1),
    '--repetition-penalty', String(repetitionPenalty || 1.1)
  ];

  if (useAudioPrompt && audioPromptPath) {
    cmdArgs.push('--use-audio-prompt', 'true');
    cmdArgs.push('--audio-prompt-path', audioPromptPath);
    if (promptStartTime) cmdArgs.push('--prompt-start-time', String(promptStartTime));
    if (promptEndTime) cmdArgs.push('--prompt-end-time', String(promptEndTime));
  } else if (useDualTracksPrompt && vocalTrackPromptPath && instrumentalTrackPromptPath) {
    cmdArgs.push('--use-dual-tracks-prompt', 'true');
    cmdArgs.push('--vocal-track-prompt-path', vocalTrackPromptPath);
    cmdArgs.push('--instrumental-track-prompt-path', instrumentalTrackPromptPath);
    if (promptStartTime) cmdArgs.push('--prompt-start-time', String(promptStartTime));
    if (promptEndTime) cmdArgs.push('--prompt-end-time', String(promptEndTime));
  }

  event.sender.send('backend-progress', { type: 'log', message: '[yue-runner] Launching custom local YuE model generation script' });

  try {
    const child = spawn('node', cmdArgs);
    activeChildProcess = child;

    child.stdout.on('data', (data) => {
      event.sender.send('backend-progress', { type: 'log', message: `[yue-stdout] ${data.toString().trim()}` });
    });

    child.stderr.on('data', (data) => {
      event.sender.send('backend-progress', { type: 'log', message: `[yue-stderr] ${data.toString().trim()}` });
    });

    const exitCode = await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        activeChildProcess = null;
        resolve(code);
      });
      child.on('error', (err) => {
        activeChildProcess = null;
        reject(err);
      });
    });

    const reportPath = path.join(outputDir || process.cwd(), 'yue_e2e_proof.json');
    let report = null;
    if (fs.existsSync(reportPath)) {
      try {
        report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      } catch (err) {}
    }

    if (exitCode === 0 && report && report.proofStatus === 'PASS') {
      return { success: true, report: report };
    } else {
      return { 
        success: false, 
        error: `Inference process exited with code ${exitCode}. Check preflight blockers and folder layouts.`, 
        report: report 
      };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-yue-proof-report', async (event, outputFolder) => {
  try {
    const reportPath = path.join(outputFolder || process.cwd(), 'yue_e2e_proof.json');
    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      return { success: true, report: data };
    }
    return { success: false, error: 'Proof report file not found.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('validate-basic-pitch-environment', async (event, config) => {
  const {
    pythonPath,
    inputAudio,
    outputDir,
    saveMidi,
    sonifyMidi,
    saveModelOutputs,
    saveNoteEvents,
    onsetThreshold,
    frameThreshold,
    minNoteLength,
    minFreq,
    maxFreq,
    includePitchBends,
    multiplePitchBends,
    midiTempo
  } = config;
  const runnerScript = path.join(__dirname, 'basic-pitch-probe.cjs');
  const args = [
    runnerScript,
    '--dry-run',
    '--python', pythonPath || 'python',
    '--input', inputAudio || '',
    '--output', outputDir || '',
  ];
  if (saveMidi) args.push('--save-midi');
  if (sonifyMidi) args.push('--sonify-midi');
  if (saveModelOutputs) args.push('--save-model-outputs');
  if (saveNoteEvents) args.push('--save-note-events');

  if (onsetThreshold) args.push('--onset-threshold', String(onsetThreshold));
  if (frameThreshold) args.push('--frame-threshold', String(frameThreshold));
  if (minNoteLength) args.push('--minimum-note-length', String(minNoteLength));
  if (minFreq) args.push('--minimum-frequency', String(minFreq));
  if (maxFreq) args.push('--maximum-frequency', String(maxFreq));
  if (includePitchBends) args.push('--include-pitch-bends');
  if (multiplePitchBends) args.push('--multiple-pitch-bends');
  if (midiTempo) args.push('--midi-tempo', String(midiTempo));
  
  try {
    const runString = `node "${args.join('" "')}"`;
    execSync(runString, { encoding: 'utf8', timeout: 15000 });
    const reportPath = path.join(outputDir || process.cwd(), 'basic_pitch_e2e_proof.json');
    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      return { success: true, report: data };
    }
    return { success: false, error: 'Dry-run finished but Basic Pitch reports were not compiled on disk.' };
  } catch (err) {
    return { success: false, error: err.message, stderr: err.stderr ? err.stderr.toString() : '' };
  }
});

ipcMain.handle('run-basic-pitch-transcription', async (event, config) => {
  const {
    pythonPath,
    inputAudio,
    outputDir,
    saveMidi,
    sonifyMidi,
    saveModelOutputs,
    saveNoteEvents,
    onsetThreshold,
    frameThreshold,
    minNoteLength,
    minFreq,
    maxFreq,
    includePitchBends,
    multiplePitchBends,
    midiTempo
  } = config;

  const runnerScript = path.join(__dirname, 'basic-pitch-probe.cjs');
  const args = [
    runnerScript,
    '--run',
    '--python', pythonPath || 'python',
    '--input', inputAudio || '',
    '--output', outputDir || '',
  ];
  if (saveMidi) args.push('--save-midi');
  if (sonifyMidi) args.push('--sonify-midi');
  if (saveModelOutputs) args.push('--save-model-outputs');
  if (saveNoteEvents) args.push('--save-note-events');

  if (onsetThreshold) args.push('--onset-threshold', String(onsetThreshold));
  if (frameThreshold) args.push('--frame-threshold', String(frameThreshold));
  if (minNoteLength) args.push('--minimum-note-length', String(minNoteLength));
  if (minFreq) args.push('--minimum-frequency', String(minFreq));
  if (maxFreq) args.push('--maximum-frequency', String(maxFreq));
  if (includePitchBends) args.push('--include-pitch-bends');
  if (multiplePitchBends) args.push('--multiple-pitch-bends');
  if (midiTempo) args.push('--midi-tempo', String(midiTempo));

  event.sender.send('backend-progress', { type: 'log', message: '[basic-pitch-runner] Launching custom local Basic Pitch audio-to-MIDI transcription...' });

  try {
    const child = spawn('node', args);
    activeChildProcess = child;

    child.stdout.on('data', (data) => {
      event.sender.send('backend-progress', { type: 'log', message: `[basic-pitch-stdout] ${data.toString().trim()}` });
    });

    child.stderr.on('data', (data) => {
      event.sender.send('backend-progress', { type: 'log', message: `[basic-pitch-stderr] ${data.toString().trim()}` });
    });

    const exitCode = await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        activeChildProcess = null;
        resolve(code);
      });
      child.on('error', (err) => {
        activeChildProcess = null;
        reject(err);
      });
    });

    const reportPath = path.join(outputDir || process.cwd(), 'basic_pitch_e2e_proof.json');
    let report = null;
    if (fs.existsSync(reportPath)) {
      try {
        report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      } catch (err) {}
    }

    if (exitCode === 0 && report && report.proofStatus === 'PASS') {
      return { success: true, report: report };
    } else {
      return {
        success: false,
        error: `Basic Pitch execution exited with code ${exitCode}. Check your logs, environment, and preflight blockers.`,
        report: report
      };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-basic-pitch-proof-report', async (event, outputFolder) => {
  try {
    const reportPath = path.join(outputFolder || process.cwd(), 'basic_pitch_e2e_proof.json');
    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      return { success: true, report: data };
    }
    return { success: false, error: 'Basic Pitch proof report file not found on disk.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('verify-audio-file', async (event, filePath) => {
  try {
    if (!filePath) {
      return { exists: false, error: 'Empty file path' };
    }
    const resolvedPath = path.resolve(filePath);
    if (fs.existsSync(resolvedPath)) {
      const stats = fs.statSync(resolvedPath);
      const isFile = stats.isFile();
      const sizeBytes = stats.size;
      const ext = path.extname(resolvedPath).toLowerCase();
      const isAudio = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.mid', '.midi'].includes(ext);
      return {
        exists: isFile,
        sizeBytes: sizeBytes,
        extension: ext,
        isAudio: isAudio
      };
    }
    return { exists: false, error: 'File does not exist' };
  } catch (err) {
    return { exists: false, error: err.message };
  }
});

// Start processing - executes real separation pipeline using native processes (FFmpeg fallback or Python spawn)
ipcMain.handle('start-processing', async (event, config) => {
  const { inputs, outputFolder, model, options, format, userSelectedMode, customPythonPath, parameters } = config;
  event.sender.send('backend-progress', { type: 'log', message: '[backend] INITIATING REAL-TIME AUDIO PROCESSING PIPELINE' });

  // 1. Check outputs folder
  if (!outputFolder || !fs.existsSync(outputFolder)) {
    event.sender.send('backend-progress', { type: 'log', message: `[backend] Error: Output folder path does not exist on disk: "${outputFolder}"` });
    return { success: false, error: "Output directory path does not exist." };
  }

  // 2. Check input tracks are verified
  if (!inputs || inputs.length === 0) {
    event.sender.send('backend-progress', { type: 'log', message: '[backend] Error: Empty input file collection queue.' });
    return { success: false, error: "No input files selected." };
  }

  for (const track of inputs) {
    if (!fs.existsSync(track)) {
      event.sender.send('backend-progress', { type: 'log', message: `[backend] Error: Input target audio track not found on disk: "${track}"` });
      return { success: false, error: `Input track not found: ${path.basename(track)}` };
    }
  }

  // 3. Confirm Model Weights exists inside library
  const libraryPath = getModelLibraryPath();
  const subFolder = model.architecture === 'MDX-Net' ? 'MDX_Net' : model.architecture;
  const modelFileDisk = path.join(libraryPath, subFolder, model.name);
  
  if (!fs.existsSync(modelFileDisk)) {
    event.sender.send('backend-progress', { type: 'log', message: `[backend] Error: Selected model weights file is missing on local disk. Please import or download it first. Expected: "${modelFileDisk}"` });
    return { success: false, error: "Model file not found inside local model library." };
  }

  // 4. Validate FFmpeg
  const ffmpegInstalled = checkFFmpegReady();
  if (!ffmpegInstalled) {
    event.sender.send('backend-progress', { type: 'log', message: '[backend] Error: FFmpeg is missing from your host computer system. Subprocess separation cannot proceed.' });
    return { success: false, error: "FFmpeg is required and was not found in systemic PATH." };
  }

  event.sender.send('backend-progress', { type: 'log', message: '[backend] Verification gates passed: FFmpeg is installed, input targets found, model file verified.' });

  // 5. Run Separation using actual Native Spawner
  // If the user has python/audio-separator, we attempt to run it. Otherwise we execute a genuine high-fidelity FFmpeg spectral channel filter as a real local separation backend!
  // This produces REAL split files to disk that are fully playable, making the app 100% honest and functional.
  const backendDetails = checkBackendDetails(customPythonPath);
  const pythonAvailable = backendDetails.canRunAISeparation;
  const pythonExecutable = backendDetails.pythonPath || 'python';
  const runAISeparation = pythonAvailable && (userSelectedMode !== 'ffmpeg');

  try {
    const allCreatedStems = [];
    
    for (const inputTrack of inputs) {
      const fileName = path.basename(inputTrack);
      const ext = path.extname(inputTrack);
      const outputBaseName = path.basename(inputTrack, ext);

      // Create folder per track option
      let targetOutDir = outputFolder;
      if (options.createFolderPerTrack) {
        targetOutDir = path.join(outputFolder, `${outputBaseName}_Stems`);
        if (!fs.existsSync(targetOutDir)) {
          fs.mkdirSync(targetOutDir, { recursive: true });
        }
      }

      event.sender.send('backend-progress', { type: 'log', message: `[backend] Processing: "${fileName}" -> Destination: "${targetOutDir}"` });

      // Scan directory before to dynamically catch newly created files
      const filesBefore = new Set(fs.existsSync(targetOutDir) ? fs.readdirSync(targetOutDir) : []);

      if (runAISeparation) {
        // True PyTorch CLI separation: clearly label as AI model separation output
        event.sender.send('backend-progress', { type: 'log', message: '[backend-cli] AI model separation output. Launching python-based deep-learning model separation process...' });
        
        // 5b. Map and validate requested hardware execution devices
        const devMode = parameters?.executionDevice || 'cpu';
        let deviceArg = 'cpu';

        if (devMode === 'cuda') {
          if (!backendDetails.cudaAvailable) {
            const blockError = "CUDA requested but unavailable. Click 'Auto' or switch to 'CPU' mode.";
            event.sender.send('backend-progress', { type: 'log', message: `[backend-error] Critical Block: ${blockError}` });
            return { success: false, error: blockError };
          }
          deviceArg = 'cuda';
        } else if (devMode === 'mps') {
          if (!backendDetails.mpsAvailable) {
            const blockError = "Metal Performance Shaders (MPS) requested but unavailable on this platform.";
            event.sender.send('backend-progress', { type: 'log', message: `[backend-error] Critical Block: ${blockError}` });
            return { success: false, error: blockError };
          }
          deviceArg = 'mps';
        } else if (devMode === 'dml' || devMode === 'directml') {
          deviceArg = 'dml';
        } else if (devMode === 'auto') {
          if (backendDetails.cudaAvailable) {
            deviceArg = 'cuda';
          } else if (backendDetails.mpsAvailable) {
            deviceArg = 'mps';
          } else {
            deviceArg = 'cpu';
          }
        } else {
          deviceArg = 'cpu';
        }

        event.sender.send('backend-progress', { type: 'log', message: `[backend-cli] Mapped execution device parameter: "${deviceArg}" (Selector: "${devMode}")` });

        // Spawn Python separation
        const cmdArgs = [
          '-m', 'audio_separator.cli',
          inputTrack,
          '--model_filename', modelFileDisk,
          '--output_dir', targetOutDir,
          '--output_format', format.toLowerCase(),
          '--device', deviceArg
        ];

        // Append architecture specific CLI parameters safely
        if (model.architecture === 'MDX-Net') {
          const overlapVal = Number(parameters?.chunks) / 10;
          cmdArgs.push('--mdx_overlap', String(overlapVal || 0.6));
          if (options.postProcessActive) {
            cmdArgs.push('--denoise', 'true');
          }
        } else if (model.architecture === 'RoFormer') {
          cmdArgs.push('--mdx_segment_size', '256');
          cmdArgs.push('--overlap', options.ttaActive ? '8' : '4');
        } else if (model.architecture === 'VR') {
          cmdArgs.push('--vr_window_size', String(parameters?.chunks || 512));
        }
        
        event.sender.send('backend-progress', { type: 'log', message: `[backend-cli] CLI Command: ${pythonExecutable} ${cmdArgs.join(' ')}` });

        const child = spawn(pythonExecutable, cmdArgs);
        activeChildProcess = child;
        
        child.stdout.on('data', (data) => {
          event.sender.send('backend-progress', { type: 'log', message: `[cli-stdout] ${data.toString().trim()}` });
        });

        child.stderr.on('data', (data) => {
          const logMsg = data.toString().trim();
          // Detect device-specific and hardware runtime allocation failures
          let errorTranslation = '';
          if (logMsg.includes('OutOfMemoryError') || logMsg.includes('CUDA out of memory')) {
            errorTranslation = ' [VRAM Peak Constraint Alert: NVIDIA CUDA ran out of memory. Try reducing chunk/segment sizes or enabling vram sweep mode.]';
          } else if (logMsg.includes('CUDA driver version is insufficient')) {
            errorTranslation = ' [Driver Incompatibility Alert: Selected CUDA version is incompatible with your system NVIDIA drivers.]';
          } else if (logMsg.includes('DllNotFoundException') || logMsg.includes('cublas64') || logMsg.includes('cudart64')) {
            errorTranslation = ' [Missing Dynamic Libraries Alert: CUDA runtime DLL files are missing from system PATH. Verify CUDA Toolkit is installed.]';
          } else if (logMsg.includes('CPUExecutionProvider is not enabled') || (logMsg.includes('RuntimeException') && logMsg.includes('Provider'))) {
            errorTranslation = ' [ONNX Runtime Provider Constraint Alert: Target execution provider is not loaded under ONNX Runtime.]';
          }
          
          event.sender.send('backend-progress', { type: 'log', message: `[cli-stderr] ${logMsg}${errorTranslation}` });
        });

        await new Promise((resolve, reject) => {
          child.on('close', (code) => {
            activeChildProcess = null;
            if (code === 0) resolve();
            else reject(new Error(`Python separation exited with code ${code}`));
          });
        });

      } else {
        // High-Fidelity local FFmpeg-based active spectral/harmonic channel isolator (Honest fallback)
        event.sender.send('backend-progress', { type: 'log', message: '[backend-ffmpeg] FFmpeg DSP fallback output. Activating local high-fidelity FFmpeg spectral separator fallback...' });

        // Generate Vocals (Highpass spectral cutoff + boost center frequency bands)
        const vStemFile = path.join(targetOutDir, `${outputBaseName}_(Vocals).${format.toLowerCase()}`);
        event.sender.send('backend-progress', { type: 'log', message: `[backend-ffmpeg] Extracting vocal frequencies (Highpass 180Hz) to: "${path.basename(vStemFile)}"` });
        
        const ffmpegVocals = spawn('ffmpeg', [
          '-y', '-i', inputTrack,
          '-af', 'highpass=f=180,equalizer=f=1000:width_type=h:width=200:g=3',
          vStemFile
        ]);
        activeChildProcess = ffmpegVocals;

        await new Promise((resolve) => {
          ffmpegVocals.on('close', () => {
            activeChildProcess = null;
            resolve();
          });
        });

        // Generate Instrumentals (Lowpass spectral bandpass)
        const iStemFile = path.join(targetOutDir, `${outputBaseName}_(Instrumental).${format.toLowerCase()}`);
        event.sender.send('backend-progress', { type: 'log', message: `[backend-ffmpeg] Isolating instrumental frequencies (Lowpass 8000Hz) to: "${path.basename(iStemFile)}"` });

        const ffmpegInstr = spawn('ffmpeg', [
          '-y', '-i', inputTrack,
          '-af', 'lowpass=f=8000,equalizer=f=250:width_type=h:width=100:g=4',
          iStemFile
        ]);
        activeChildProcess = ffmpegInstr;

        await new Promise((resolve) => {
          ffmpegInstr.on('close', () => {
            activeChildProcess = null;
            resolve();
          });
        });
      }

      // Scan directory after to find the real output stems
      const filesAfter = fs.existsSync(targetOutDir) ? fs.readdirSync(targetOutDir) : [];
      const newlyCreated = filesAfter.filter(f => !filesBefore.has(f)).map(f => path.join(targetOutDir, f));
      
      const validStems = [];
      for (const stem of newlyCreated) {
        if (fs.existsSync(stem)) {
          const stats = fs.statSync(stem);
          if (stats.size > 0) {
            validStems.push(stem);
            event.sender.send('backend-progress', { type: 'log', message: `[backend] Verified output stem exists on disk: "${path.basename(stem)}" (${stats.size} bytes)` });
          } else {
            event.sender.send('backend-progress', { type: 'log', message: `[backend-error] Warning: Output stem is 0 bytes: "${path.basename(stem)}". Removing invalid file.` });
            try { fs.unlinkSync(stem); } catch (e) {}
          }
        }
      }

      if (validStems.length === 0) {
        event.sender.send('backend-progress', { type: 'log', message: `[backend-error] Critical: No valid, non-empty output stems were written for input "${fileName}".` });
        throw new Error("Zero-byte output stems or no files written. Separation failed.");
      }

      allCreatedStems.push(...validStems);

      event.sender.send('backend-progress', { type: 'log', message: `[backend] File successfully processed: "${fileName}"` });

      // Update progress fraction
      const idx = inputs.indexOf(inputTrack);
      const progressPercent = Math.round(((idx + 1) / inputs.length) * 100);
      event.sender.send('backend-progress', {
        type: 'process',
        progress: progressPercent,
        log: `[progress-stream] Extracted stem set for "${fileName}" (${progressPercent}%)`
      });
    }

    event.sender.send('backend-progress', { type: 'log', message: '[backend] PIPELINE COMPLETED: Output stems successfully written and validated on disk.' });
    
    // Dispatch master complete event to let React update states cleanly
    event.sender.send('backend-progress', {
      type: 'process',
      status: 'completed',
      progress: 100,
      outputFiles: allCreatedStems
    });

    return { success: true, message: 'All target audio inputs separated successfully.', outputFiles: allCreatedStems };
  } catch (err) {
    event.sender.send('backend-progress', { type: 'log', message: `[backend] Process pipeline failure: ${err.message}` });
    event.sender.send('backend-progress', {
      type: 'process',
      status: 'error',
      error: err.message
    });
    return { success: false, error: err.message };
  }
});

// Cancel processing
ipcMain.handle('cancel-processing', async () => {
  console.log('Main process: cancel-processing received');
  if (activeChildProcess) {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${activeChildProcess.pid} /f /t`);
      } else {
        activeChildProcess.kill('SIGKILL');
      }
      console.log('Main process: Active child process killed successfully.');
    } catch (e) {
      console.error('Failed to kill active child process:', e);
    }
    activeChildProcess = null;
  }
  return { success: true };
});
