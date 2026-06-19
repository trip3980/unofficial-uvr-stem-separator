const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const urlModule = require('url');
const { spawn, execFileSync } = require('child_process');
const {
  ALLOWED_MODEL_EXTENSIONS,
  computeSha256,
  deleteModelFile,
  getModelProofEligibility,
  isPathInside,
  normalizeExpectedSha256,
  purgeModelCache,
  verifyModelHash
} = require('./model-integrity.cjs');
const {
  checkPackagedRuntime,
  createMissingHelperScriptResult,
  fileExists,
  getNodeRunnerEnv,
  resolveScriptFile
} = require('./runtime-paths.cjs');
const aiSeparation = require('./ai-separation.cjs');

let mainWindow;
let activeChildProcess = null;
let activeCancellationRequested = false;

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
    ['VR', 'MDX-Net', 'MDX_Net', 'Demucs', 'RoFormer', 'MDXC', 'Custom', 'Ensemble'].forEach(sub => {
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
function downloadFile(fileUrl, outputPath, onProgress, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Download aborted after too many redirects.'));
      return;
    }

    function startDownload(currentUrl) {
      try {
        const parsedUrl = new URL(currentUrl);
        if (parsedUrl.protocol !== 'https:') {
          reject(new Error('Model downloads require an HTTPS source URL.'));
          return;
        }
        const protocolClient = https;

        const request = protocolClient.get(currentUrl, (response) => {
          // Handle HTTP redirect codes (e.g. Hugging Face CDN redirection)
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const redirectUrl = urlModule.resolve(currentUrl, response.headers.location);
            downloadFile(redirectUrl, outputPath, onProgress, redirectCount + 1).then(resolve, reject);
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
  return aiSeparation.checkFFmpegReady();
}

// Check Python, audio-separator, PyTorch and hardware accelerators
function checkBackendDetails(customPythonPath) {
  return aiSeparation.checkBackendDetails(customPythonPath);
}

function getRuntimeNodeRunnerEnv() {
  return getNodeRunnerEnv({}, {
    isPackaged: app.isPackaged,
    appRoot: app.getAppPath(),
    resourcesPath: process.resourcesPath
  });
}

function getHelperScriptOrMissing(filename) {
  const helperPath = resolveScriptFile(filename, {
    isPackaged: app.isPackaged,
    appRoot: app.getAppPath(),
    resourcesPath: process.resourcesPath
  });
  if (!fileExists(helperPath)) {
    return createMissingHelperScriptResult(helperPath);
  }
  return { ok: true, path: helperPath };
}

function runNodeRunnerSync(args, timeout) {
  return execFileSync(process.execPath, args, {
    encoding: 'utf8',
    timeout,
    env: getRuntimeNodeRunnerEnv()
  });
}

function spawnNodeRunner(args) {
  return spawn(process.execPath, args, {
    env: getRuntimeNodeRunnerEnv()
  });
}

// --- IPC Handlers ---

// Path getters
ipcMain.handle('get-model-library-path', async () => {
  return getModelLibraryPath();
});

ipcMain.handle('list-local-models-custom', async () => {
  return listLocalModels();
});

ipcMain.handle('check-packaged-runtime', async () => {
  return checkPackagedRuntime({
    isPackaged: app.isPackaged,
    appRoot: app.getAppPath(),
    resourcesPath: process.resourcesPath
  });
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

// Verify that a local model file exists and, when available, matches its expected SHA-256.
ipcMain.handle('verify-model-hash', async (event, modelOrArchitecture, fileName, checksum) => {
  const libraryPath = getModelLibraryPath();
  return verifyModelHash(modelOrArchitecture, libraryPath, fileName, checksum);
});

// Delete one concrete model weights file only when it resolves inside the OpenStem model library.
ipcMain.handle('delete-model-file', async (event, modelOrArchitecture, fileName) => {
  const libraryPath = getModelLibraryPath();
  const result = deleteModelFile(modelOrArchitecture, libraryPath, fileName);
  if (result.deletedPaths.length > 0) {
    console.log('[OpenStem Model Manager] Deleted model file(s):', result.deletedPaths);
  }
  if (result.skippedPaths.length > 0) {
    console.log('[OpenStem Model Manager] Skipped model file delete target(s):', result.skippedPaths);
  }
  return result;
});

// Purge only approved model-manager cache artifacts, never model source or project folders.
ipcMain.handle('purge-model-cache', async () => {
  const libraryPath = getModelLibraryPath();
  const result = purgeModelCache(libraryPath);
  if (result.deletedPaths.length > 0) {
    console.log('[OpenStem Model Manager] Purged model cache path(s):', result.deletedPaths);
  }
  if (result.skippedPaths.length > 0) {
    console.log('[OpenStem Model Manager] Skipped model cache path(s):', result.skippedPaths);
  }
  return result;
});

function normalizeImportExpectedSize(model) {
  const raw = model?.expected_size_bytes || model?.expectedSizeBytes || model?.sizeBytes;
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

// Import/sideload custom model file from local disk to model library after local integrity inspection.
ipcMain.handle('import-model-file', async (event, architecture, targetModel) => {
  const result = await dialog.showOpenDialog({
    title: 'Select Local Model Weights File',
    properties: ['openFile'],
    filters: [
      { name: 'Model Files (*.pth, *.onnx, *.pt, *.yaml)', extensions: ['pth', 'onnx', 'pt', 'yaml'] }
    ]
  });

  if (result.filePaths && result.filePaths.length > 0) {
    const srcPath = result.filePaths[0];
    const sourceFileName = path.basename(srcPath);
    const importTarget = targetModel && typeof targetModel === 'object' ? targetModel : null;
    const fileName = importTarget?.name || sourceFileName;
    const libraryPath = getModelLibraryPath();
    const targetArchitecture = importTarget?.architecture || architecture;
    const subFolder = targetArchitecture === 'MDX-Net' ? 'MDX_Net' : targetArchitecture;
    const destDir = path.join(libraryPath, subFolder);
    const destPath = path.resolve(path.join(destDir, fileName));

    if (!isPathInside(libraryPath, destPath)) {
      return { success: false, status: 'error', error: 'Import target resolved outside the approved OpenStem model library.' };
    }

    const stats = fs.statSync(srcPath);
    if (!stats.isFile()) {
      return { success: false, status: 'error', error: 'Selected import source is not a file.' };
    }

    const ext = path.extname(sourceFileName).toLowerCase();
    if (!ALLOWED_MODEL_EXTENSIONS.has(ext)) {
      return { success: false, status: 'error', error: `Unsupported model file extension "${ext}".` };
    }

    const expectedSha256 = normalizeExpectedSha256(importTarget || {});
    const expectedSizeBytes = normalizeImportExpectedSize(importTarget);
    const actualSha256 = computeSha256(srcPath);
    const sizeMatches = expectedSizeBytes === null ? undefined : stats.size === expectedSizeBytes;

    if (expectedSizeBytes !== null && !sizeMatches) {
      return {
        success: false,
        ok: false,
        exists: true,
        status: 'size_mismatch',
        name: fileName,
        sourcePath: srcPath,
        actualSha256,
        fileSizeBytes: stats.size,
        expectedSizeBytes,
        error: 'Selected model size does not match the selected registry entry.'
      };
    }

    if (expectedSha256 && actualSha256 !== expectedSha256) {
      return {
        success: false,
        ok: false,
        exists: true,
        status: 'hash_mismatch',
        name: fileName,
        sourcePath: srcPath,
        actualSha256,
        expectedSha256,
        fileSizeBytes: stats.size,
        expectedSizeBytes: expectedSizeBytes === null ? undefined : expectedSizeBytes,
        error: 'Selected model SHA-256 does not match the selected registry entry.'
      };
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (fs.existsSync(destPath) && path.resolve(srcPath) !== destPath) {
      const replace = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Cancel', 'Replace existing model'],
        defaultId: 0,
        cancelId: 0,
        title: 'Replace existing model file?',
        message: 'A model file already exists at the approved OpenStem model-library target.',
        detail: destPath
      });
      if (replace.response !== 1) {
        return { success: false, status: 'cancelled', message: 'Import cancelled before replacing existing model file.' };
      }
    }

    fs.copyFileSync(srcPath, destPath);
    const copiedStats = fs.statSync(destPath);
    const verification = verifyModelHash({
      ...(importTarget || {}),
      architecture: targetArchitecture,
      name: fileName,
      checksum: expectedSha256 || importTarget?.checksum,
      local_path: destPath
    }, libraryPath);
    const proofEligibility = getModelProofEligibility({
      ...(importTarget || {}),
      architecture: targetArchitecture,
      name: fileName,
      checksum: expectedSha256 || importTarget?.checksum,
      license: importTarget?.license || 'User-supplied / not verified',
      sourceType: importTarget?.sourceType || 'manual_import',
      requiredBackend: importTarget?.requiredBackend || 'audio-separator'
    }, verification);

    return {
      success: true,
      name: fileName,
      absolutePath: destPath,
      sourcePath: srcPath,
      size: copiedStats.size,
      fileSize: `${(copiedStats.size / (1024 * 1024)).toFixed(1)} MB`,
      actualSha256,
      expectedSha256: expectedSha256 || undefined,
      status: verification.status,
      verification,
      proofEligibility,
      verified: proofEligibility.proofEligible
    };
  }
  return { success: false, message: 'Import cancelled.' };
});

// Download Hugging Face or public model links to uvr_models
ipcMain.handle('download-model', async (event, modelId, url, architecture, fileName) => {
  if (!url) {
    return { success: false, error: "Download URL source is missing for this model index entry." };
  }
  if (!fileName || typeof fileName !== 'string' || path.basename(fileName) !== fileName) {
    return { success: false, error: "Download target filename is missing or unsafe." };
  }

  const libraryPath = getModelLibraryPath();
  const subFolder = architecture === 'MDX-Net' ? 'MDX_Net' : architecture;
  const destDir = path.join(libraryPath, subFolder);
  const destPath = path.resolve(path.join(destDir, fileName));
  const ext = path.extname(fileName).toLowerCase();

  if (!ALLOWED_MODEL_EXTENSIONS.has(ext)) {
    return { success: false, error: `Download blocked for unsupported model file extension "${ext}".` };
  }
  if (!isPathInside(libraryPath, destPath)) {
    return { success: false, error: "Download target resolved outside the approved OpenStem model library." };
  }

  try {
    fs.mkdirSync(destDir, { recursive: true });

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
  return checkFFmpegReady();
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
  return aiSeparation.verifyOutputFolder(folderPath);
});

// Verify custom python path behaves correctly
ipcMain.handle('verify-python-path', async (event, pythonPath) => {
  return aiSeparation.verifyPythonPath(pythonPath);
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
  const helperCheck = getHelperScriptOrMissing('yue_probe.py');
  if (!helperCheck.ok) return helperCheck;

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
    runNodeRunnerSync(args, 10000);
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

  const helperCheck = getHelperScriptOrMissing('yue_probe.py');
  if (!helperCheck.ok) return helperCheck;

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
    const child = spawnNodeRunner(cmdArgs);
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
  const helperCheck = getHelperScriptOrMissing('basic_pitch_probe.py');
  if (!helperCheck.ok) return helperCheck;

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
    runNodeRunnerSync(args, 15000);
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

  const helperCheck = getHelperScriptOrMissing('basic_pitch_probe.py');
  if (!helperCheck.ok) return helperCheck;

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
    const child = spawnNodeRunner(args);
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

// Start processing - executes real CPU AI separation only. FFmpeg fallback is not proof eligible.
ipcMain.handle('start-processing', async (event, config) => {
  activeCancellationRequested = false;
  event.sender.send('backend-progress', { type: 'log', message: '[backend] INITIATING REAL CPU AI SEPARATION PIPELINE' });

  const result = await aiSeparation.runCpuAiSeparation(
    {
      ...config,
      selectedDevice: 'cpu',
      parameters: {
        ...(config?.parameters || {}),
        executionDevice: 'cpu'
      }
    },
    {
      modelLibraryPath: getModelLibraryPath(),
      allowExternalModelPath: false,
      isCancellationRequested: () => activeCancellationRequested,
      onChild: (child) => {
        activeChildProcess = child;
      },
      onChildExit: (child) => {
        if (!child || activeChildProcess === child) {
          activeChildProcess = null;
        }
      },
      onLog: (message) => {
        event.sender.send('backend-progress', { type: 'log', message });
      },
      onProgress: (update) => {
        event.sender.send('backend-progress', update);
      }
    }
  );

  if (result.status !== 'cancelled') {
    activeCancellationRequested = false;
  }
  activeChildProcess = null;
  return result;
});

// Cancel processing
ipcMain.handle('cancel-processing', async () => {
  console.log('Main process: cancel-processing received');
  if (!activeChildProcess) {
    activeCancellationRequested = false;
    return { ok: true, status: 'no_active_process' };
  }
  activeCancellationRequested = true;
  const result = aiSeparation.requestCancelActiveProcess(activeChildProcess);
  if (result.ok) {
    activeChildProcess = null;
  }
  return result;
});
