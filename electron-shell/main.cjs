const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const urlModule = require("url");
const { spawn, execFile, execFileSync } = require("child_process");
const {
  ALLOWED_MODEL_EXTENSIONS,
  computeSha256,
  deleteModelFile,
  getModelProofEligibility,
  isPathInside,
  normalizeExpectedSha256,
  purgeModelCache,
  reconnectModelFileFromPath,
  searchModelCandidatesInFolder,
  verifyModelHash,
} = require("./model-integrity.cjs");
const {
  checkPackagedRuntime,
  createMissingHelperScriptResult,
  fileExists,
  getNodeRunnerEnv,
  resolveScriptFile,
} = require("./runtime-paths.cjs");
const aiSeparation = require("./ai-separation.cjs");

let mainWindow;
let activeChildProcess = null;
let activeCancellationRequested = false;
const approvedModelCandidatePaths = new Set();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
    backgroundColor: "#07080c",
    title: "OpenStem AI Audio Workstation (Hardened Functional Alpha)",
    autoHideMenuBar: true,
  });

  const startUrl = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, "../dist/index.html")}`;

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// --- HELPER FUNCTION: Get App Model Library Paths ---
function getModelLibraryPath() {
  const modelDir = path.join(app.getPath("userData"), "uvr_models");
  if (!fs.existsSync(modelDir)) {
    // Try migrating from old unofficial UVR folder if it exists
    try {
      let oldUserData = "";
      if (process.platform === "win32") {
        oldUserData = path.join(process.env.APPDATA || "", "unofficial-uvr-stem-separator");
      } else if (process.platform === "darwin") {
        oldUserData = path.join(
          require("os").homedir(),
          "Library",
          "Application Support",
          "unofficial-uvr-stem-separator",
        );
      } else {
        oldUserData = path.join(require("os").homedir(), ".config", "unofficial-uvr-stem-separator");
      }
      const oldModelDir = path.join(oldUserData, "uvr_models");
      if (fs.existsSync(oldModelDir)) {
        console.log(`[OpenStem Migration] Found old models folder at: "${oldModelDir}". Migrating models...`);
        fs.mkdirSync(modelDir, { recursive: true });
        const subdirs = ["VR", "MDX-Net", "Demucs", "RoFormer", "MDXC", "Custom", "Ensemble"];
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
      console.warn("[OpenStem Migration] Non-blocking migration warning:", migErr);
    }

    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
  }

  // Ensure all framework weight directory trees exist
  ["VR", "MDX-Net", "MDX_Net", "Demucs", "RoFormer", "MDXC", "Custom", "Ensemble"].forEach((sub) => {
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
    const subdirs = ["VR", "MDX-Net", "MDX_Net", "Demucs", "RoFormer", "MDXC", "Custom", "Ensemble"];
    const localModels = [];

    for (const sub of subdirs) {
      const subpath = path.join(libraryPath, sub);
      if (fs.existsSync(subpath)) {
        const files = fs.readdirSync(subpath);
        for (const file of files) {
          const filePath = path.join(subpath, file);
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            const arch = sub === "MDX_Net" ? "MDX-Net" : sub;
            localModels.push({
              name: file,
              architecture: arch,
              absolutePath: filePath,
              size: stats.size,
              fileSize: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
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

function getCustomModelLibraryPath() {
  return path.join(app.getPath("userData"), "custom-model-library.json");
}

function getLocalModelIndexPath() {
  return path.join(app.getPath("userData"), "openstem-models.local.json");
}

function getPromptLibraryPath() {
  return path.join(app.getPath("userData"), "openstem-prompt-library.json");
}

function readCustomModelLibrary() {
  const libraryFile = getCustomModelLibraryPath();
  if (!fs.existsSync(libraryFile)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(libraryFile, "utf8"));
    return Array.isArray(parsed?.entries) ? parsed.entries : [];
  } catch (err) {
    console.warn("[OpenStem Model Manager] Failed to read custom model library:", err.message);
    return [];
  }
}

function writeCustomModelLibrary(entries) {
  const libraryFile = getCustomModelLibraryPath();
  fs.mkdirSync(path.dirname(libraryFile), { recursive: true });
  fs.writeFileSync(
    libraryFile,
    JSON.stringify(
      {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        entries,
      },
      null,
      2,
    ),
  );
}

function createEmptyPromptLibraryDocument() {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    templates: [],
  };
}

function containsPromptLibraryForbiddenKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsPromptLibraryForbiddenKey);
  return Object.entries(value).some(([key, childValue]) => {
    return (
      key === "transcriptText" ||
      key === "__proto__" ||
      key === "constructor" ||
      containsPromptLibraryForbiddenKey(childValue)
    );
  });
}

function validatePromptLibraryDocument(document) {
  const errors = [];
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return ["Prompt library document must be a JSON object."];
  }
  if (containsPromptLibraryForbiddenKey(document)) {
    errors.push("Prompt library must not include transcript text or unsafe prototype keys.");
  }
  if (!Array.isArray(document.templates)) {
    errors.push("Prompt library document requires a templates array.");
    return errors;
  }

  for (const template of document.templates) {
    if (!template || typeof template !== "object" || Array.isArray(template)) {
      errors.push("Each prompt template must be an object.");
      continue;
    }
    if (typeof template.templateId !== "string" || template.templateId.trim().length === 0) {
      errors.push("Prompt template id is missing.");
    }
    if (typeof template.templateName !== "string" || template.templateName.trim().length === 0) {
      errors.push("Prompt template name is missing.");
    }
    if (!Array.isArray(template.sections) || template.sections.length === 0) {
      errors.push("Prompt template requires at least one section.");
      continue;
    }
    for (const section of template.sections) {
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        errors.push("Each prompt section must be an object.");
        continue;
      }
      if (typeof section.sectionId !== "string" || section.sectionId.trim().length === 0) {
        errors.push("Prompt section id is missing.");
      }
      if (typeof section.label !== "string" || section.label.trim().length === 0) {
        errors.push("Prompt section label is missing.");
      }
      if (typeof section.instructionText !== "string") {
        errors.push("Prompt section instruction text is missing.");
      }
    }
  }

  return errors;
}

function readPromptLibraryDocument() {
  const libraryFile = getPromptLibraryPath();
  if (!fs.existsSync(libraryFile)) {
    return createEmptyPromptLibraryDocument();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(libraryFile, "utf8"));
    const errors = validatePromptLibraryDocument(parsed);
    if (errors.length > 0) {
      console.warn("[OpenStem Prompt Library] Ignoring invalid prompt library:", errors.join(" "));
      return createEmptyPromptLibraryDocument();
    }
    return {
      schemaVersion: 1,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      templates: parsed.templates,
    };
  } catch (err) {
    console.warn("[OpenStem Prompt Library] Failed to read prompt library:", err.message);
    return createEmptyPromptLibraryDocument();
  }
}

function writePromptLibraryDocument(document) {
  const errors = validatePromptLibraryDocument(document);
  if (errors.length > 0) {
    return { success: false, errors, error: errors.join(" ") };
  }

  const libraryFile = getPromptLibraryPath();
  fs.mkdirSync(path.dirname(libraryFile), { recursive: true });
  const cleanDocument = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    templates: document.templates.filter((template) => template && template.builtIn !== true),
  };
  fs.writeFileSync(libraryFile, JSON.stringify(cleanDocument, null, 2));
  return {
    success: true,
    path: libraryFile,
    document: cleanDocument,
  };
}

function normalizeCustomSha(value) {
  if (!value) return undefined;
  const normalized = String(value)
    .trim()
    .replace(/^sha256[:_]/i, "")
    .toLowerCase();
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

function validateCustomModelEntry(entry) {
  const errors = [];
  const validArchitectures = new Set(["VR", "MDX-Net", "Demucs", "RoFormer", "MDXC", "Custom"]);
  const validBackends = new Set(["python-pytorch", "onnxruntime", "audio-separator", "cpu-dsp"]);
  const validStatuses = new Set([
    "custom_unverified",
    "custom_hash_unavailable",
    "hash_mismatch",
    "verified_local",
    "unsupported_backend",
  ]);
  const fakeUrlParts = ["example.com", "localhost", "placeholder", "fake", "dummy", "todo"];

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return ["Custom model entry must be an object."];
  }
  if (!entry.id || typeof entry.id !== "string" || !/^custom[_-]/.test(entry.id)) {
    errors.push("Custom model id must start with custom_ or custom-.");
  }
  if (!entry.filename || typeof entry.filename !== "string" || path.basename(entry.filename) !== entry.filename) {
    errors.push("Custom model filename is missing or unsafe.");
  } else if (!ALLOWED_MODEL_EXTENSIONS.has(path.extname(entry.filename).toLowerCase())) {
    errors.push(`Custom model extension "${path.extname(entry.filename).toLowerCase()}" is unsupported.`);
  }
  if (!validArchitectures.has(entry.architecture)) {
    errors.push("Custom model architecture is unsupported.");
  }
  if (entry.backend && !validBackends.has(entry.backend)) {
    errors.push("Custom model backend is unsupported.");
  }
  if (!validStatuses.has(entry.verificationStatus)) {
    errors.push("Custom model verificationStatus is unsupported.");
  }

  const expectedSha = normalizeCustomSha(entry.expectedSha256);
  const actualSha = normalizeCustomSha(entry.actualSha256);
  if (expectedSha === null) errors.push("Custom model expectedSha256 is malformed.");
  if (actualSha === null) errors.push("Custom model actualSha256 is malformed.");

  if (entry.sourceUrl) {
    try {
      const parsed = new URL(String(entry.sourceUrl));
      if (!["http:", "https:"].includes(parsed.protocol)) {
        errors.push("Custom model sourceUrl must use http or https.");
      }
      if (fakeUrlParts.some((part) => parsed.toString().toLowerCase().includes(part))) {
        errors.push("Custom model sourceUrl must not be a placeholder URL.");
      }
    } catch {
      errors.push("Custom model sourceUrl is malformed.");
    }
  }

  if (entry.localPath) {
    const resolved = path.resolve(String(entry.localPath));
    if (!isPathInside(getModelLibraryPath(), resolved)) {
      errors.push("Custom model localPath must stay inside the OpenStem model library.");
    }
  }

  if (entry.sizeBytes !== undefined && entry.sizeBytes !== null) {
    const size = Number(entry.sizeBytes);
    if (!Number.isFinite(size) || size < 0) {
      errors.push("Custom model sizeBytes must be a non-negative number.");
    }
  }

  if (entry.verificationStatus === "verified_local") {
    if (!expectedSha || !actualSha || expectedSha !== actualSha || !entry.localPath) {
      errors.push("Custom model cannot be verified_local without localPath and matching expected/actual SHA-256.");
    }
  }

  return errors;
}

function sanitizeCustomModelEntry(entry) {
  const now = new Date().toISOString();
  const expectedSha = normalizeCustomSha(entry.expectedSha256);
  const actualSha = normalizeCustomSha(entry.actualSha256);
  return {
    id: String(entry.id),
    displayName: String(entry.displayName || entry.filename),
    userProvidedName: String(entry.userProvidedName || entry.displayName || entry.filename),
    localPath: entry.localPath ? path.resolve(String(entry.localPath)) : undefined,
    filename: String(entry.filename),
    actualSha256: actualSha || undefined,
    expectedSha256: expectedSha || undefined,
    sizeBytes: entry.sizeBytes === undefined || entry.sizeBytes === null ? undefined : Number(entry.sizeBytes),
    architecture: entry.architecture,
    backend: entry.backend || undefined,
    sourceUrl: entry.sourceUrl || undefined,
    sourceProject: entry.sourceProject || undefined,
    license: entry.license || undefined,
    verificationStatus: entry.verificationStatus,
    proofEligibility:
      entry.proofEligibility && typeof entry.proofEligibility === "object" ? entry.proofEligibility : undefined,
    userNotes: entry.userNotes || undefined,
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };
}

function createEmptyLocalModelIndex() {
  return {
    schemaVersion: 1,
    indexName: "openstem-models.local.json",
    updatedAt: new Date().toISOString(),
    modelLibraryPath: getModelLibraryPath(),
    entries: [],
  };
}

function readLocalModelIndex() {
  const indexFile = getLocalModelIndexPath();
  if (!fs.existsSync(indexFile)) {
    return createEmptyLocalModelIndex();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(indexFile, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return createEmptyLocalModelIndex();
    }
    return {
      schemaVersion: 1,
      indexName: "openstem-models.local.json",
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      modelLibraryPath: getModelLibraryPath(),
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch (err) {
    console.warn("[OpenStem Model Manager] Failed to read local model index:", err.message);
    return createEmptyLocalModelIndex();
  }
}

function writeLocalModelIndex(index) {
  const indexFile = getLocalModelIndexPath();
  fs.mkdirSync(path.dirname(indexFile), { recursive: true });
  fs.writeFileSync(
    indexFile,
    JSON.stringify(
      {
        schemaVersion: 1,
        indexName: "openstem-models.local.json",
        updatedAt: new Date().toISOString(),
        modelLibraryPath: getModelLibraryPath(),
        entries: Array.isArray(index.entries) ? index.entries : [],
      },
      null,
      2,
    ),
  );
}

function validateLocalModelIndexEntry(entry) {
  const errors = [];
  const validStatuses = new Set([
    "not_installed",
    "downloading",
    "partial_download",
    "download_complete_verification_pending",
    "installed_hash_unavailable",
    "installed_not_checked",
    "hash_verified",
    "hash_mismatch",
    "manual_import_required",
    "custom_unverified",
    "custom_hash_unavailable",
    "missing",
  ]);

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return ["Local model index entry must be an object."];
  }
  if (!entry.modelId || typeof entry.modelId !== "string") {
    errors.push("Local model index entry requires modelId.");
  }
  if (!entry.verificationStatus || !validStatuses.has(entry.verificationStatus)) {
    errors.push("Local model index entry verificationStatus is unsupported.");
  }

  const expectedSha = normalizeCustomSha(entry.expectedSha256);
  const actualSha = normalizeCustomSha(entry.actualSha256);
  if (expectedSha === null) errors.push("Local model index expectedSha256 is malformed.");
  if (actualSha === null) errors.push("Local model index actualSha256 is malformed.");

  if (entry.localPath) {
    const resolved = path.resolve(String(entry.localPath));
    if (!isPathInside(getModelLibraryPath(), resolved)) {
      errors.push("Local model index localPath must stay inside the OpenStem model library.");
    }
  }
  if (entry.fileSizeBytes !== undefined && entry.fileSizeBytes !== null) {
    const size = Number(entry.fileSizeBytes);
    if (!Number.isFinite(size) || size < 0) {
      errors.push("Local model index fileSizeBytes must be a non-negative number.");
    }
  }
  if (entry.proofEligible === true) {
    if (entry.verificationStatus !== "hash_verified" || !expectedSha || !actualSha || expectedSha !== actualSha) {
      errors.push(
        "Local model index cannot mark proofEligible without hash_verified and exact expected/actual SHA-256 match.",
      );
    }
  }

  return errors;
}

function sanitizeLocalModelIndexEntry(entry) {
  const now = new Date().toISOString();
  const expectedSha = normalizeCustomSha(entry.expectedSha256);
  const actualSha = normalizeCustomSha(entry.actualSha256);
  const verificationStatus = entry.verificationStatus || "installed_not_checked";
  return {
    modelId: String(entry.modelId),
    localPath: entry.localPath ? path.resolve(String(entry.localPath)) : undefined,
    actualSha256: actualSha || undefined,
    expectedSha256: expectedSha || undefined,
    fileSizeBytes:
      entry.fileSizeBytes === undefined || entry.fileSizeBytes === null ? undefined : Number(entry.fileSizeBytes),
    verificationStatus,
    verifiedAt: verificationStatus === "hash_verified" ? entry.verifiedAt || now : undefined,
    sourceManifestVersion: entry.sourceManifestVersion || "1.0",
    sourceMetadataVersion: entry.sourceMetadataVersion || undefined,
    proofEligible: entry.proofEligible === true,
    lastSourceCheck:
      entry.lastSourceCheck && typeof entry.lastSourceCheck === "object" ? entry.lastSourceCheck : undefined,
    repairHistory: Array.isArray(entry.repairHistory) ? entry.repairHistory.slice(-20) : [],
    userNotes: entry.userNotes || undefined,
  };
}

function upsertLocalModelIndexEntry(entry) {
  const errors = validateLocalModelIndexEntry(entry);
  if (errors.length > 0) {
    return { success: false, errors, error: errors.join(" ") };
  }
  const sanitized = sanitizeLocalModelIndexEntry(entry);
  const index = readLocalModelIndex();
  const existingIndex = index.entries.findIndex((item) => item.modelId === sanitized.modelId);
  if (existingIndex >= 0) {
    const existing = index.entries[existingIndex];
    index.entries[existingIndex] = {
      ...existing,
      ...sanitized,
      repairHistory: [
        ...(Array.isArray(existing.repairHistory) ? existing.repairHistory : []),
        ...(Array.isArray(sanitized.repairHistory) ? sanitized.repairHistory : []),
      ].slice(-20),
    };
  } else {
    index.entries.push(sanitized);
  }
  writeLocalModelIndex(index);
  return { success: true, entry: sanitized, entries: index.entries };
}

function modelIdFromPayload(modelOrArchitecture, fallbackName) {
  if (modelOrArchitecture && typeof modelOrArchitecture === "object" && modelOrArchitecture.id) {
    return String(modelOrArchitecture.id);
  }
  return String(fallbackName || modelOrArchitecture || "unknown_model");
}

function localIndexEntryFromVerification(modelOrArchitecture, result, action, message) {
  const model = modelOrArchitecture && typeof modelOrArchitecture === "object" ? modelOrArchitecture : {};
  const now = new Date().toISOString();
  const status =
    result.status === "hash_verified"
      ? "hash_verified"
      : result.status === "hash_mismatch"
        ? "hash_mismatch"
        : result.status === "installed_hash_unavailable"
          ? "installed_hash_unavailable"
          : result.status === "missing"
            ? "missing"
            : "installed_not_checked";
  return {
    modelId: modelIdFromPayload(modelOrArchitecture, result.name || result.expectedFileName),
    localPath: result.absolutePath || result.localPath || result.sourcePath,
    actualSha256: result.actualSha256,
    expectedSha256: result.expectedSha256 || normalizeExpectedSha256(model),
    fileSizeBytes: result.fileSizeBytes || result.size,
    verificationStatus: status,
    verifiedAt: status === "hash_verified" ? now : undefined,
    sourceManifestVersion: "1.0",
    sourceMetadataVersion: model.updatedAt || model.createdAt,
    proofEligible: result.proofEligible === true || result.proofEligibility?.proofEligible === true,
    lastSourceCheck: model.verifiedStatus
      ? {
          sourceStatus: model.verifiedStatus,
          checkedAt: now,
        }
      : undefined,
    repairHistory: [
      {
        action,
        status,
        at: now,
        message: message || result.message || result.error,
      },
    ],
    userNotes: model.userNotes,
  };
}

// Redirect-following chunk-based HTTPS Downloader (No packages required)
function downloadFile(fileUrl, outputPath, onProgress, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Download aborted after too many redirects."));
      return;
    }

    function startDownload(currentUrl) {
      try {
        const parsedUrl = new URL(currentUrl);
        if (parsedUrl.protocol !== "https:") {
          reject(new Error("Model downloads require an HTTPS source URL."));
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

          const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
          let downloadedBytes = 0;
          const fileStream = fs.createWriteStream(outputPath);
          let lastTime = Date.now();
          let lastBytes = 0;

          response.on("data", (chunk) => {
            downloadedBytes += chunk.length;
            fileStream.write(chunk);

            const currentTime = Date.now();
            const duration = (currentTime - lastTime) / 1000;
            if (duration >= 0.5 || downloadedBytes === totalBytes) {
              const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
              const bytesSinceLast = downloadedBytes - lastBytes;
              const speedMbps = duration > 0 ? (bytesSinceLast / (1024 * 1024) / duration).toFixed(1) : "0";

              onProgress({
                progress,
                speed: `${speedMbps} MB/s`,
                downloadedBytes,
                totalBytes,
              });

              lastTime = currentTime;
              lastBytes = downloadedBytes;
            }
          });

          response.on("end", () => {
            fileStream.end();
            resolve();
          });

          response.on("error", (err) => {
            fileStream.close();
            fs.unlink(outputPath, () => {});
            reject(err);
          });
        });

        request.on("error", (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    }

    startDownload(fileUrl);
  });
}

// Check if FFmpeg is installed and ready in host PATH or from a selected executable path.
function checkFFmpegReady(ffmpegPath) {
  return aiSeparation.checkFFmpegReady({ ffmpegCommand: ffmpegPath || undefined });
}

// Check Python, audio-separator, PyTorch and hardware accelerators
function checkBackendDetails(customPythonPath, ffmpegPath) {
  const ffmpeg = ffmpegPath ? checkFFmpegReady(ffmpegPath) : undefined;
  return aiSeparation.checkBackendDetails(customPythonPath, ffmpeg ? { ffmpeg } : {});
}

function getRuntimeNodeRunnerEnv() {
  return getNodeRunnerEnv(
    {},
    {
      isPackaged: app.isPackaged,
      appRoot: app.getAppPath(),
      resourcesPath: process.resourcesPath,
    },
  );
}

function getHelperScriptOrMissing(filename) {
  const helperPath = resolveScriptFile(filename, {
    isPackaged: app.isPackaged,
    appRoot: app.getAppPath(),
    resourcesPath: process.resourcesPath,
  });
  if (!fileExists(helperPath)) {
    return createMissingHelperScriptResult(helperPath);
  }
  return { ok: true, path: helperPath };
}

function runNodeRunnerSync(args, timeout) {
  return execFileSync(process.execPath, args, {
    encoding: "utf8",
    timeout,
    env: getRuntimeNodeRunnerEnv(),
  });
}

function spawnNodeRunner(args) {
  return spawn(process.execPath, args, {
    env: getRuntimeNodeRunnerEnv(),
  });
}

function asPlainIpcObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function resolveProofReportPath(outputFolder, reportFilename) {
  const rawFolder = String(outputFolder || "").trim();
  if (!rawFolder) {
    return { ok: false, error: "Output folder is required to read a proof report." };
  }
  const resolvedFolder = path.resolve(rawFolder);
  if (!fs.existsSync(resolvedFolder) || !fs.statSync(resolvedFolder).isDirectory()) {
    return { ok: false, error: "Output folder does not exist.", folderPath: resolvedFolder };
  }
  return { ok: true, reportPath: path.join(resolvedFolder, reportFilename), folderPath: resolvedFolder };
}

const MASTERING_AUDIO_EXTENSIONS = ["wav", "mp3", "flac", "m4a", "aac", "ogg", "opus", "aiff", "aif"];
const MASTERING_OUTPUT_FORMATS = new Set(["wav", "flac"]);
const MASTERING_RESERVED_WINDOWS_NAMES = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
]);

function isAllowedMasteringAudioPath(filePath) {
  const ext = path.extname(String(filePath || "")).replace(/^\./, "").toLowerCase();
  return MASTERING_AUDIO_EXTENSIONS.includes(ext);
}

function execFileAsync(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        encoding: "utf8",
        timeout: options.timeout || 15000,
        maxBuffer: options.maxBuffer || 1024 * 1024 * 8,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          stdout: stdout || "",
          stderr: stderr || "",
          error: error ? error.message : null,
          code: error && typeof error.code === "number" ? error.code : 0,
        });
      },
    );
  });
}

function spawnProcessAsync(command, args) {
  return new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, { windowsHide: true });

    const appendLimited = (current, chunk) => {
      const next = current + String(chunk || "");
      return next.length > 40000 ? next.slice(next.length - 40000) : next;
    };

    child.stdout.on("data", (chunk) => {
      stdout = appendLimited(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, chunk);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, code: null, stdout, stderr, error: error.message });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      resolve({ ok: code === 0, code, stdout, stderr, error: code === 0 ? null : `Process exited with code ${code}` });
    });
  });
}

function resolveFFprobeCommand(ffmpegCommand) {
  const command = String(ffmpegCommand || "ffmpeg");
  const basename = path.basename(command).toLowerCase();
  if (path.isAbsolute(command) && (basename === "ffmpeg.exe" || basename === "ffmpeg")) {
    const probeName = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
    const candidate = path.join(path.dirname(command), probeName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return "ffprobe";
}

function sanitizeMasteringOutputFilename(filename, format) {
  const ext = String(format || "wav").toLowerCase();
  const baseName = path.basename(String(filename || `openstem_mastered.${ext}`).replace(/\0/g, ""));
  const parsed = path.parse(baseName);
  const invalidFilenameChars = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);
  let safeName = (parsed.name || "openstem_mastered")
    .split("")
    .map((char) => (invalidFilenameChars.has(char) || char.charCodeAt(0) < 32 ? "_" : char))
    .join("")
    .replace(/\.+$/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .slice(0, 96);
  if (!safeName) safeName = "openstem_mastered";
  if (MASTERING_RESERVED_WINDOWS_NAMES.has(safeName.toLowerCase())) safeName = `${safeName}_file`;
  return `${safeName}.${ext}`;
}

function chooseMasteringOutputPath(outputFolder, outputFilename, format, overwritePolicy) {
  const folder = path.resolve(String(outputFolder || ""));
  const filename = sanitizeMasteringOutputFilename(outputFilename, format);
  const initialPath = path.resolve(folder, filename);
  if (!isPathInside(folder, initialPath)) {
    return { ok: false, error: "Resolved output path is outside the selected folder.", outputPath: null };
  }

  if (overwritePolicy === "overwrite_previous_export") {
    return { ok: true, outputPath: initialPath, savedAsNewCopy: false };
  }

  if (!fs.existsSync(initialPath)) {
    return { ok: true, outputPath: initialPath, savedAsNewCopy: false };
  }

  const parsed = path.parse(filename);
  for (let version = 2; version <= 999; version += 1) {
    const candidate = path.resolve(folder, `${parsed.name}_v${version}${parsed.ext}`);
    if (!isPathInside(folder, candidate)) {
      return { ok: false, error: "Resolved versioned output path is outside the selected folder.", outputPath: null };
    }
    if (!fs.existsSync(candidate)) {
      return { ok: true, outputPath: candidate, savedAsNewCopy: true };
    }
  }

  return { ok: false, error: "Could not create a unique mastered output filename.", outputPath: null };
}

function verifyMasteringPaths(inputPath, outputFolder) {
  const resolvedInput = path.resolve(String(inputPath || ""));
  const resolvedFolder = path.resolve(String(outputFolder || ""));
  if (!fs.existsSync(resolvedInput) || !fs.statSync(resolvedInput).isFile()) {
    return { ok: false, diagnosticCode: "MASTERING_INPUT_MISSING", error: "Input audio file is missing." };
  }
  if (!fs.existsSync(resolvedFolder) || !fs.statSync(resolvedFolder).isDirectory()) {
    return { ok: false, diagnosticCode: "MASTERING_OUTPUT_FOLDER_MISSING", error: "Output folder is missing." };
  }
  try {
    const testPath = path.join(resolvedFolder, `.openstem-mastering-write-test-${Date.now()}.tmp`);
    fs.writeFileSync(testPath, "ok");
    fs.unlinkSync(testPath);
  } catch (err) {
    return {
      ok: false,
      diagnosticCode: "MASTERING_OUTPUT_FOLDER_MISSING",
      error: `Output folder is not writable: ${err.message}`,
    };
  }
  return { ok: true, inputPath: resolvedInput, outputFolder: resolvedFolder };
}

function parseFfprobeAudioAnalysis(inputPath, probeJson, peakInfo, ffmpegCheck) {
  const parsed = JSON.parse(probeJson);
  const audioStream = Array.isArray(parsed.streams)
    ? parsed.streams.find((stream) => stream && stream.codec_type === "audio")
    : null;
  const format = parsed.format || {};
  const stats = fs.statSync(inputPath);
  const peakDbfs = typeof peakInfo.peakDbfs === "number" ? peakInfo.peakDbfs : null;
  const clippingWarning = typeof peakDbfs === "number" && peakDbfs >= -0.1;

  return {
    success: true,
    path: inputPath,
    fileName: path.basename(inputPath),
    durationSeconds: Number.isFinite(Number(format.duration)) ? Number(format.duration) : null,
    sampleRate: audioStream && Number.isFinite(Number(audioStream.sample_rate)) ? Number(audioStream.sample_rate) : null,
    channels: audioStream && Number.isFinite(Number(audioStream.channels)) ? Number(audioStream.channels) : null,
    bitDepth:
      audioStream && Number.isFinite(Number(audioStream.bits_per_sample)) ? Number(audioStream.bits_per_sample) : null,
    formatName: audioStream?.codec_name || null,
    containerFormat: format.format_name || null,
    sizeBytes: stats.size,
    peakDbfs,
    peakMeasured: typeof peakDbfs === "number",
    integratedLufs: null,
    loudnessMeasured: false,
    truePeakDbtp: null,
    truePeakMeasured: false,
    clippingWarning,
    diagnosticCode: clippingWarning ? "MASTERING_CLIPPING_WARNING" : "MASTERING_ANALYSIS_COMPLETE",
    ffmpegVersion: ffmpegCheck.version || null,
    userMessage: clippingWarning
      ? "Analysis complete. Peak is close to clipping; output should be verified after processing."
      : "Analysis complete. LUFS and true peak remain Not measured until a verified loudness analyzer is added.",
  };
}

async function runMasteringAudioAnalysis(inputPath, ffmpegPath) {
  const resolvedInput = path.resolve(String(inputPath || ""));
  if (!fs.existsSync(resolvedInput) || !fs.statSync(resolvedInput).isFile()) {
    return {
      success: false,
      diagnosticCode: "MASTERING_INPUT_MISSING",
      error: "Input audio file is missing.",
      userMessage: "Select a real local audio file before analysis.",
    };
  }

  const ffmpegCheck = checkFFmpegReady(ffmpegPath);
  if (!ffmpegCheck.ready) {
    return {
      success: false,
      diagnosticCode: "MASTERING_FFMPEG_MISSING",
      error: ffmpegCheck.error,
      userMessage: ffmpegCheck.userMessage,
      ffmpeg: ffmpegCheck,
    };
  }

  const ffprobeCommand = resolveFFprobeCommand(ffmpegCheck.command || ffmpegCheck.path || ffmpegPath || "ffmpeg");
  const probe = await execFileAsync(
    ffprobeCommand,
    ["-v", "error", "-show_format", "-show_streams", "-of", "json", resolvedInput],
    { timeout: 15000 },
  );

  if (!probe.ok) {
    return {
      success: false,
      diagnosticCode: "MASTERING_ANALYSIS_FAILED",
      error: probe.error || probe.stderr || "ffprobe failed.",
      userMessage: "FFmpeg probe failed. Select another file or verify FFmpeg/ffprobe.",
      ffmpeg: ffmpegCheck,
    };
  }

  const volume = await execFileAsync(
    ffmpegCheck.command || ffmpegCheck.path || "ffmpeg",
    ["-hide_banner", "-nostdin", "-i", resolvedInput, "-af", "volumedetect", "-f", "null", "-"],
    { timeout: 30000, maxBuffer: 1024 * 1024 * 12 },
  );
  const volumeOutput = `${volume.stdout || ""}\n${volume.stderr || ""}`;
  const peakMatch = volumeOutput.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
  const peakInfo = {
    peakDbfs: peakMatch ? Number(peakMatch[1]) : null,
  };

  try {
    return {
      ...parseFfprobeAudioAnalysis(resolvedInput, probe.stdout, peakInfo, ffmpegCheck),
      ffmpeg: ffmpegCheck,
      ffprobeCommand,
    };
  } catch (err) {
    return {
      success: false,
      diagnosticCode: "MASTERING_ANALYSIS_FAILED",
      error: err.message,
      userMessage: "FFmpeg returned metadata, but OpenStem could not parse the analysis result.",
      ffmpeg: ffmpegCheck,
    };
  }
}

function clampMasteringNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

async function runMasteringFfmpegExport(request = {}) {
  const format = String(request.outputFormat || "wav").toLowerCase();
  if (!MASTERING_OUTPUT_FORMATS.has(format)) {
    return {
      success: false,
      diagnosticCode: "MASTERING_BACKEND_NOT_IMPLEMENTED",
      error: "The first FFmpeg mastering backend only exports WAV or FLAC.",
      userMessage: "Choose WAV or FLAC for the current local mastering backend.",
    };
  }

  if (request.modeId === "reference_match") {
    return {
      success: false,
      diagnosticCode: "MATCHERING_BACKEND_NOT_CONFIGURED",
      error: "Reference Match requires a verified Matchering-style backend.",
      userMessage: "Reference Match is planned and cannot run yet.",
    };
  }

  const pathCheck = verifyMasteringPaths(request.inputPath, request.outputFolder);
  if (!pathCheck.ok) {
    return {
      success: false,
      diagnosticCode: pathCheck.diagnosticCode,
      error: pathCheck.error,
      userMessage: pathCheck.error,
    };
  }

  const ffmpegCheck = checkFFmpegReady(request.ffmpegPath);
  if (!ffmpegCheck.ready) {
    return {
      success: false,
      diagnosticCode: "MASTERING_FFMPEG_MISSING",
      error: ffmpegCheck.error,
      userMessage: ffmpegCheck.userMessage,
      ffmpeg: ffmpegCheck,
    };
  }

  const outputChoice = chooseMasteringOutputPath(
    pathCheck.outputFolder,
    request.outputFilename,
    format,
    request.overwritePolicy,
  );
  if (!outputChoice.ok) {
    return {
      success: false,
      diagnosticCode: "MASTERING_OVERWRITE_BLOCKED",
      error: outputChoice.error,
      userMessage: outputChoice.error,
    };
  }

  const outputPath = outputChoice.outputPath;
  if (path.resolve(pathCheck.inputPath) === path.resolve(outputPath)) {
    return {
      success: false,
      diagnosticCode: "MASTERING_OVERWRITE_BLOCKED",
      error: "Refusing to overwrite the original source audio.",
      userMessage: "OpenStem never overwrites the original source audio by default.",
    };
  }

  const targetLufs = clampMasteringNumber(request.targetLufs, -14, -30, -6);
  const peakCeilingDb = clampMasteringNumber(request.peakCeilingDb, -1, -6, -0.1);
  const loudnessRange = request.preserveDynamics === false ? 8 : 11;
  const filter = `loudnorm=I=${targetLufs}:TP=${peakCeilingDb}:LRA=${loudnessRange}`;
  const args = [
    request.overwritePolicy === "overwrite_previous_export" ? "-y" : "-n",
    "-hide_banner",
    "-nostdin",
    "-i",
    pathCheck.inputPath,
    "-map",
    "0:a:0",
    "-vn",
    "-af",
    filter,
  ];

  if (format === "wav") {
    args.push("-c:a", "pcm_s16le");
  } else {
    args.push("-c:a", "flac");
  }

  args.push("-metadata", "comment=OpenStem Mastering Lab processed copy; not AI proof", outputPath);

  const ffmpegRun = await spawnProcessAsync(ffmpegCheck.command || ffmpegCheck.path || "ffmpeg", args);
  const fileExistsAfterRun = fs.existsSync(outputPath);
  const outputStats = fileExistsAfterRun ? fs.statSync(outputPath) : null;
  const outputVerified = !!(ffmpegRun.ok && fileExistsAfterRun && outputStats && outputStats.size > 0);
  const afterAnalysis = outputVerified ? await runMasteringAudioAnalysis(outputPath, request.ffmpegPath) : null;

  return {
    success: outputVerified,
    diagnosticCode: outputVerified
      ? outputChoice.savedAsNewCopy
        ? "MASTERING_SAVED_AS_NEW_COPY"
        : "MASTERING_EXPORT_COMPLETE"
      : "MASTERING_OUTPUT_NOT_VERIFIED",
    inputPath: pathCheck.inputPath,
    outputPath,
    outputFolder: pathCheck.outputFolder,
    outputFormat: format,
    outputSizeBytes: outputStats ? outputStats.size : 0,
    nativeWriteVerified: outputVerified,
    processingReturnedSuccess: ffmpegRun.ok,
    savedAsNewCopy: outputChoice.savedAsNewCopy,
    backend: "ffmpeg",
    ffmpeg: ffmpegCheck,
    ffmpegArgs: args.map((arg) => (arg === pathCheck.inputPath || arg === outputPath ? "[local path]" : arg)),
    afterAnalysis,
    error: outputVerified ? null : ffmpegRun.error || ffmpegRun.stderr || "FFmpeg output verification failed.",
    userMessage: outputVerified
      ? "Processed copy created and verified on disk."
      : "FFmpeg did not create a verified non-empty output file.",
  };
}

// --- IPC Handlers ---

// Path getters
ipcMain.handle("get-model-library-path", async () => {
  return getModelLibraryPath();
});

ipcMain.handle("list-local-models-custom", async () => {
  return listLocalModels();
});

ipcMain.handle("list-custom-model-library", async () => {
  return {
    success: true,
    entries: readCustomModelLibrary(),
  };
});

ipcMain.handle("get-local-model-index-path", async () => {
  return getLocalModelIndexPath();
});

ipcMain.handle("get-prompt-library-path", async () => {
  return { success: true, path: getPromptLibraryPath() };
});

ipcMain.handle("load-prompt-library", async () => {
  return {
    success: true,
    path: getPromptLibraryPath(),
    document: readPromptLibraryDocument(),
  };
});

ipcMain.handle("save-prompt-library", async (event, document) => {
  return writePromptLibraryDocument(document);
});

ipcMain.handle("list-local-model-index", async () => {
  return {
    success: true,
    index: readLocalModelIndex(),
  };
});

ipcMain.handle("save-local-model-index-entry", async (event, entry) => {
  return upsertLocalModelIndexEntry(entry);
});

ipcMain.handle("remove-local-model-index-entry", async (event, modelId) => {
  const targetId = String(modelId || "");
  if (!targetId) {
    return { success: false, error: "Local model index removal requires modelId." };
  }
  const index = readLocalModelIndex();
  const nextEntries = index.entries.filter((entry) => entry.modelId !== targetId);
  writeLocalModelIndex({ ...index, entries: nextEntries });
  return {
    success: true,
    removed: index.entries.length - nextEntries.length,
    entries: nextEntries,
  };
});

ipcMain.handle("save-custom-model-library-entry", async (event, entry) => {
  const errors = validateCustomModelEntry(entry);
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      error: errors.join(" "),
    };
  }

  const sanitized = sanitizeCustomModelEntry(entry);
  const entries = readCustomModelLibrary();
  const index = entries.findIndex((item) => item.id === sanitized.id);
  if (index >= 0) {
    entries[index] = {
      ...entries[index],
      ...sanitized,
      createdAt: entries[index].createdAt || sanitized.createdAt,
    };
  } else {
    entries.push(sanitized);
  }
  writeCustomModelLibrary(entries);
  return {
    success: true,
    entry: sanitized,
    entries,
  };
});

ipcMain.handle("remove-custom-model-library-entry", async (event, id) => {
  const targetId = String(id || "");
  if (!/^custom[_-]/.test(targetId)) {
    return { success: false, error: "Only custom model metadata entries can be removed." };
  }
  const entries = readCustomModelLibrary();
  const nextEntries = entries.filter((entry) => entry.id !== targetId);
  writeCustomModelLibrary(nextEntries);
  return {
    success: true,
    removed: entries.length - nextEntries.length,
    entries: nextEntries,
  };
});

ipcMain.handle("check-packaged-runtime", async () => {
  return checkPackagedRuntime({
    isPackaged: app.isPackaged,
    appRoot: app.getAppPath(),
    resourcesPath: process.resourcesPath,
  });
});

// Select input files with standard platform dialog
ipcMain.handle("select-input-files", async (event, options) => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Audio Files", extensions: ["wav", "mp3", "flac", "ogg", "m4a", "aac", "wma", "aiff"] }],
  });
  return result.filePaths;
});

// Select output folder with standard platform dialog
ipcMain.handle("select-output-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle("select-mastering-input-file", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Audio For Mastering",
    properties: ["openFile"],
    filters: [{ name: "Audio Files", extensions: MASTERING_AUDIO_EXTENSIONS }],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle("analyze-mastering-audio", async (event, request) => {
  return runMasteringAudioAnalysis(request?.inputPath, request?.ffmpegPath);
});

ipcMain.handle("run-mastering-ffmpeg", async (event, request) => {
  return runMasteringFfmpegExport(request);
});

ipcMain.handle("open-mastering-audio-file", async (event, filePath) => {
  const resolved = path.resolve(String(filePath || ""));
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return { success: false, error: "Audio file is missing." };
  }
  if (!isAllowedMasteringAudioPath(resolved)) {
    return { success: false, error: "Only supported audio files can be opened from the Mastering Lab." };
  }
  const result = await shell.openPath(resolved);
  return { success: result === "", error: result || null };
});

// Shell directory launcher. Files are revealed in Explorer/Finder instead of launched.
ipcMain.handle("open-output-folder", async (event, folderPath) => {
  try {
    const rawPath = String(folderPath || "").trim();
    if (!rawPath) {
      return { success: false, error: "Output folder path is missing." };
    }

    const resolved = path.resolve(rawPath);
    if (!fs.existsSync(resolved)) {
      return { success: false, error: "Output path does not exist.", path: resolved };
    }

    const stats = fs.statSync(resolved);
    if (stats.isDirectory()) {
      const result = await shell.openPath(resolved);
      return {
        success: result === "",
        opened: "directory",
        path: resolved,
        error: result || null,
      };
    }

    if (stats.isFile()) {
      shell.showItemInFolder(resolved);
      return {
        success: true,
        opened: "file_parent",
        path: resolved,
        userMessage: "Opened the file location instead of launching the file.",
      };
    }

    return { success: false, error: "Output path is not a file or directory.", path: resolved };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Check if a model exists inside the library folder
ipcMain.handle("check-model-file-exists", async (event, architecture, fileName) => {
  try {
    const libraryPath = getModelLibraryPath();
    // Resolve clean subfolder matching architecture
    const subFolder = architecture === "MDX-Net" ? "MDX_Net" : architecture;
    const modelPath = path.join(libraryPath, subFolder, fileName);
    if (fs.existsSync(modelPath)) {
      const stats = fs.statSync(modelPath);
      return {
        exists: true,
        size: stats.size,
        fileSize: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
        absolutePath: modelPath,
      };
    }
  } catch (err) {
    console.error("Check model existence error:", err);
  }
  return { exists: false };
});

// Verify that a local model file exists and, when available, matches its expected SHA-256.
ipcMain.handle("verify-model-hash", async (event, modelOrArchitecture, fileName, checksum) => {
  const libraryPath = getModelLibraryPath();
  const result = verifyModelHash(modelOrArchitecture, libraryPath, fileName, checksum);
  const modelId = modelIdFromPayload(modelOrArchitecture, fileName);
  if (modelId && modelId !== "unknown_model") {
    upsertLocalModelIndexEntry(localIndexEntryFromVerification(modelOrArchitecture, result, "verify"));
  }
  return result;
});

// Delete one concrete model weights file only when it resolves inside the OpenStem model library.
ipcMain.handle("delete-model-file", async (event, modelOrArchitecture, fileName) => {
  const libraryPath = getModelLibraryPath();
  const result = deleteModelFile(modelOrArchitecture, libraryPath, fileName);
  if (result.deletedPaths.length > 0) {
    console.log("[OpenStem Model Manager] Deleted model file(s):", result.deletedPaths);
  }
  if (result.skippedPaths.length > 0) {
    console.log("[OpenStem Model Manager] Skipped model file delete target(s):", result.skippedPaths);
  }
  return result;
});

// Purge only approved model-manager cache artifacts, never model source or project folders.
ipcMain.handle("purge-model-cache", async () => {
  const libraryPath = getModelLibraryPath();
  const result = purgeModelCache(libraryPath);
  if (result.deletedPaths.length > 0) {
    console.log("[OpenStem Model Manager] Purged model cache path(s):", result.deletedPaths);
  }
  if (result.skippedPaths.length > 0) {
    console.log("[OpenStem Model Manager] Skipped model cache path(s):", result.skippedPaths);
  }
  return result;
});

function normalizeImportExpectedSize(model) {
  const raw = model?.expected_size_bytes || model?.expectedSizeBytes || model?.sizeBytes;
  if (raw === undefined || raw === null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

// Import/sideload custom model file from local disk to model library after local integrity inspection.
ipcMain.handle("import-model-file", async (event, architecture, targetModel) => {
  const result = await dialog.showOpenDialog({
    title: "Select Local Model Weights File",
    properties: ["openFile"],
    filters: [{ name: "Model Files (*.pth, *.onnx, *.pt, *.yaml)", extensions: ["pth", "onnx", "pt", "yaml"] }],
  });

  if (result.filePaths && result.filePaths.length > 0) {
    const srcPath = result.filePaths[0];
    const sourceFileName = path.basename(srcPath);
    const importTarget = targetModel && typeof targetModel === "object" ? targetModel : null;
    const fileName = importTarget?.name || sourceFileName;
    const libraryPath = getModelLibraryPath();
    const targetArchitecture = importTarget?.architecture || architecture;
    const subFolder = targetArchitecture === "MDX-Net" ? "MDX_Net" : targetArchitecture;
    const destDir = path.join(libraryPath, subFolder);
    const destPath = path.resolve(path.join(destDir, fileName));

    if (!isPathInside(libraryPath, destPath)) {
      return {
        success: false,
        status: "error",
        error: "Import target resolved outside the approved OpenStem model library.",
      };
    }

    const stats = fs.statSync(srcPath);
    if (!stats.isFile()) {
      return { success: false, status: "error", error: "Selected import source is not a file." };
    }

    const ext = path.extname(sourceFileName).toLowerCase();
    if (!ALLOWED_MODEL_EXTENSIONS.has(ext)) {
      return { success: false, status: "error", error: `Unsupported model file extension "${ext}".` };
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
        status: "size_mismatch",
        name: fileName,
        sourcePath: srcPath,
        actualSha256,
        fileSizeBytes: stats.size,
        expectedSizeBytes,
        error: "Selected model size does not match the selected registry entry.",
      };
    }

    if (expectedSha256 && actualSha256 !== expectedSha256) {
      return {
        success: false,
        ok: false,
        exists: true,
        status: "hash_mismatch",
        name: fileName,
        sourcePath: srcPath,
        actualSha256,
        expectedSha256,
        fileSizeBytes: stats.size,
        expectedSizeBytes: expectedSizeBytes === null ? undefined : expectedSizeBytes,
        error: "Selected model SHA-256 does not match the selected registry entry.",
      };
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (fs.existsSync(destPath) && path.resolve(srcPath) !== destPath) {
      const replace = await dialog.showMessageBox(mainWindow, {
        type: "warning",
        buttons: ["Cancel", "Replace existing model"],
        defaultId: 0,
        cancelId: 0,
        title: "Replace existing model file?",
        message: "A model file already exists at the approved OpenStem model-library target.",
        detail: destPath,
      });
      if (replace.response !== 1) {
        return {
          success: false,
          status: "cancelled",
          message: "Import cancelled before replacing existing model file.",
        };
      }
    }

    fs.copyFileSync(srcPath, destPath);
    const copiedStats = fs.statSync(destPath);
    const verification = verifyModelHash(
      {
        ...(importTarget || {}),
        architecture: targetArchitecture,
        name: fileName,
        checksum: expectedSha256 || importTarget?.checksum,
        local_path: destPath,
      },
      libraryPath,
    );
    const proofEligibility = getModelProofEligibility(
      {
        ...(importTarget || {}),
        architecture: targetArchitecture,
        name: fileName,
        checksum: expectedSha256 || importTarget?.checksum,
        license: importTarget?.license || "User-supplied / not verified",
        sourceType: importTarget?.sourceType || "manual_import",
        requiredBackend: importTarget?.requiredBackend || "audio-separator",
      },
      verification,
    );

    const response = {
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
      verified: proofEligibility.proofEligible,
    };
    upsertLocalModelIndexEntry(
      localIndexEntryFromVerification(
        importTarget || {
          id: `${targetArchitecture}_${fileName}`,
          architecture: targetArchitecture,
          name: fileName,
          checksum: expectedSha256 || undefined,
          license: importTarget?.license || "User-supplied / not verified",
          sourceType: importTarget?.sourceType || "manual_import",
          requiredBackend: importTarget?.requiredBackend || "audio-separator",
        },
        response,
        "verify",
        proofEligibility.displayMessage,
      ),
    );
    return response;
  }
  return { success: false, message: "Import cancelled." };
});

ipcMain.handle("reconnect-model-file", async (event, targetModel, approvedSourcePath) => {
  let srcPath = typeof approvedSourcePath === "string" && approvedSourcePath ? path.resolve(approvedSourcePath) : "";
  const libraryPath = getModelLibraryPath();

  if (srcPath) {
    const approvedBySearch = approvedModelCandidatePaths.has(srcPath);
    const alreadyInModelLibrary = isPathInside(libraryPath, srcPath);
    if (!approvedBySearch && !alreadyInModelLibrary) {
      return {
        success: false,
        ok: false,
        status: "error",
        diagnosticCode: "MODEL_LOCAL_FILE_MISSING",
        error: "Reconnect path was not selected in this Electron session or approved by a model search.",
      };
    }
  } else {
    const result = await dialog.showOpenDialog({
      title: "Reconnect Local Model File",
      properties: ["openFile"],
      filters: [
        { name: "Model Files", extensions: ["ckpt", "json", "onnx", "pth", "pt", "safetensors", "yaml", "yml"] },
      ],
    });
    if (!result.filePaths || result.filePaths.length === 0) {
      return { success: false, status: "cancelled", message: "Reconnect cancelled." };
    }
    srcPath = path.resolve(result.filePaths[0]);
  }

  const result = reconnectModelFileFromPath(targetModel, libraryPath, srcPath);
  if (result.success && result.absolutePath) {
    approvedModelCandidatePaths.delete(srcPath);
    upsertLocalModelIndexEntry(localIndexEntryFromVerification(targetModel, result, "reconnect"));
    console.log("[OpenStem Model Manager] Reconnected model file:", {
      sourcePath: result.sourcePath,
      absolutePath: result.absolutePath,
      status: result.status,
      verified: result.verified,
    });
  }
  return result;
});

ipcMain.handle("search-model-candidates", async (event, targetModel, options = {}) => {
  const mode = options && options.mode === "model-library" ? "model-library" : "select-folder";
  let rootPath;

  if (mode === "model-library") {
    rootPath = getModelLibraryPath();
  } else {
    const result = await dialog.showOpenDialog({
      title: "Search Folder for Matching Model File",
      properties: ["openDirectory"],
    });
    if (!result.filePaths || result.filePaths.length === 0) {
      return { success: false, status: "cancelled", message: "Folder search cancelled.", candidates: [] };
    }
    rootPath = result.filePaths[0];
  }

  const result = searchModelCandidatesInFolder(targetModel, rootPath, {
    maxDepth: options.maxDepth,
  });

  if (result.success && Array.isArray(result.candidates)) {
    for (const candidate of result.candidates) {
      if (candidate && candidate.sourcePath) {
        approvedModelCandidatePaths.add(path.resolve(candidate.sourcePath));
      }
    }
  }

  return result;
});

ipcMain.handle("open-external-url", async (event, targetUrl) => {
  try {
    const parsed = new URL(String(targetUrl || ""));
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { success: false, error: "Only http and https source pages can be opened." };
    }
    await shell.openExternal(parsed.toString());
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Download Hugging Face or public model links through temp_downloads before final placement.
ipcMain.handle("download-model", async (event, modelId, url, architecture, fileName) => {
  if (!url) {
    return { success: false, error: "Download URL source is missing for this model index entry." };
  }
  if (!fileName || typeof fileName !== "string" || path.basename(fileName) !== fileName) {
    return { success: false, error: "Download target filename is missing or unsafe." };
  }

  const libraryPath = getModelLibraryPath();
  const subFolder = architecture === "MDX-Net" ? "MDX_Net" : architecture;
  const destDir = path.join(libraryPath, subFolder);
  const destPath = path.resolve(path.join(destDir, fileName));
  const tempDownloadDir = path.join(libraryPath, "temp_downloads");
  const tempPath = path.resolve(
    path.join(tempDownloadDir, `${String(modelId || "model")}-${Date.now()}-${fileName}.openstem-partial`),
  );
  const ext = path.extname(fileName).toLowerCase();

  if (!ALLOWED_MODEL_EXTENSIONS.has(ext)) {
    return { success: false, error: `Download blocked for unsupported model file extension "${ext}".` };
  }
  if (!isPathInside(libraryPath, destPath)) {
    return { success: false, error: "Download target resolved outside the approved OpenStem model library." };
  }
  if (!isPathInside(tempDownloadDir, tempPath)) {
    return { success: false, error: "Download temp target resolved outside the approved OpenStem temp cache." };
  }

  try {
    fs.mkdirSync(destDir, { recursive: true });
    fs.mkdirSync(tempDownloadDir, { recursive: true });

    event.sender.send("backend-progress", {
      type: "log",
      message: `[downloader] Initiating download from configured source: ${url}`,
    });

    await downloadFile(url, tempPath, (status) => {
      event.sender.send("backend-progress", {
        type: "download",
        modelId: modelId,
        progress: status.progress,
        speed: status.speed,
        status: "downloading",
        downloadedBytes: status.downloadedBytes,
        totalBytes: status.totalBytes,
      });
    });

    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { force: true });
    }
    fs.renameSync(tempPath, destPath);
    const stats = fs.statSync(destPath);
    upsertLocalModelIndexEntry({
      modelId: String(modelId),
      localPath: destPath,
      fileSizeBytes: stats.size,
      verificationStatus: "download_complete_verification_pending",
      proofEligible: false,
      repairHistory: [
        {
          action: "download",
          status: "download_complete_verification_pending",
          at: new Date().toISOString(),
          message: "Download completed into model library; SHA-256 verification is still required.",
        },
      ],
    });

    event.sender.send("backend-progress", {
      type: "log",
      message: `[downloader] Download complete. Model written to target path, verification still pending: ${destPath}`,
    });

    event.sender.send("backend-progress", {
      type: "download",
      modelId: modelId,
      progress: 100,
      speed: "0 MB/s",
      status: "verifying",
    });

    return {
      success: true,
      absolutePath: destPath,
      size: stats.size,
      fileSize: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
      verificationStatus: "download_complete_verification_pending",
      proofEligible: false,
    };
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { force: true });
    }
    upsertLocalModelIndexEntry({
      modelId: String(modelId),
      verificationStatus: "partial_download",
      proofEligible: false,
      repairHistory: [
        {
          action: "download",
          status: "partial_download",
          at: new Date().toISOString(),
          message: err.message,
        },
      ],
    });
    event.sender.send("backend-progress", {
      type: "log",
      message: `[downloader] Error. Download failed. Reason: ${err.message}`,
    });
    event.sender.send("backend-progress", {
      type: "download",
      modelId: modelId,
      progress: 0,
      status: "error",
      error: err.message,
    });
    return { success: false, error: err.message };
  }
});

// Select and verify FFmpeg executable path with standard platform dialog.
ipcMain.handle("select-ffmpeg-path", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select FFmpeg Executable",
    properties: ["openFile"],
    filters: [
      { name: "FFmpeg Executable", extensions: process.platform === "win32" ? ["exe"] : [] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  const filePath = result.filePaths[0] || null;
  if (!filePath) {
    return {
      success: false,
      cancelled: true,
      ready: false,
      diagnosticCode: "RUNTIME_FFMPEG_MISSING",
      error: "No FFmpeg executable was selected.",
      userMessage: "FFmpeg selection was cancelled.",
    };
  }
  const check = checkFFmpegReady(filePath);
  return {
    success: !!check.ready,
    filePath,
    ...check,
  };
});

// Check FFmpeg command status
ipcMain.handle("check-ffmpeg-ready", async (event, ffmpegPath) => {
  return checkFFmpegReady(ffmpegPath);
});

// Check Python backend ready and dependency states
ipcMain.handle("check-backend-details", async (event, customPythonPath, ffmpegPath) => {
  return checkBackendDetails(customPythonPath, ffmpegPath);
});

// Select Python path with standard platform dialog
ipcMain.handle("select-python-path", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Python Executable",
    properties: ["openFile"],
    filters: [{ name: "Executables", extensions: process.platform === "win32" ? ["exe"] : [] }],
  });
  return result.filePaths[0] || null;
});

// Verify output folder exists and is writable
ipcMain.handle("verify-output-folder", async (event, folderPath) => {
  return aiSeparation.verifyOutputFolder(folderPath);
});

// Verify custom python path behaves correctly
ipcMain.handle("verify-python-path", async (event, pythonPath) => {
  return aiSeparation.verifyPythonPath(pythonPath);
});

// Clear temporary processed directories
ipcMain.handle("clear-temp-files", async () => {
  try {
    const tempDir = path.join(app.getPath("userData"), "temp");
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
ipcMain.handle("clear-failed-downloads", async () => {
  try {
    const libraryPath = getModelLibraryPath();
    const tempDownloadDir = path.join(libraryPath, "temp_downloads");
    if (fs.existsSync(tempDownloadDir)) {
      fs.rmSync(tempDownloadDir, { recursive: true, force: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Flush regional checksum validation cached registries
ipcMain.handle("reset-weights-cache", async () => {
  try {
    const libraryPath = getModelLibraryPath();
    const cacheFile = path.join(libraryPath, "verification_cache.json");
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Real Local YuE Engine integration processes
ipcMain.handle("validate-yue-environment", async (event, config) => {
  const { pythonPath, yueRoot, genreTxt, lyricsTxt, outputDir, deviceRequested, stage1Model, stage2Model } =
    asPlainIpcObject(config);
  const helperCheck = getHelperScriptOrMissing("yue_probe.py");
  if (!helperCheck.ok) return helperCheck;

  const runnerScript = path.join(__dirname, "yue-probe.cjs");
  const args = [
    runnerScript,
    "--dry-run",
    "--python",
    pythonPath || "python",
    "--yue-root",
    yueRoot || "",
    "--genre",
    genreTxt || "",
    "--lyrics",
    lyricsTxt || "",
    "--output",
    outputDir || "",
    "--device",
    deviceRequested || "cpu",
    "--stage1-model",
    stage1Model || "",
    "--stage2-model",
    stage2Model || "",
  ];

  try {
    runNodeRunnerSync(args, 10000);
    const reportPath = path.join(outputDir || process.cwd(), "yue_e2e_proof.json");
    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      return { success: true, report: data };
    }
    return { success: false, error: "Dry-run finished but proof report was not generated." };
  } catch (err) {
    return { success: false, error: err.message, stderr: err.stderr ? err.stderr.toString() : "" };
  }
});

ipcMain.handle("run-yue-generation", async (event, config) => {
  const {
    pythonPath,
    yueRoot,
    genreTxt,
    lyricsTxt,
    outputDir,
    deviceRequested,
    stage1Model,
    stage2Model,
    segments,
    maxNewTokens,
    stage2BatchSize,
    repetitionPenalty,
    useAudioPrompt,
    audioPromptPath,
    useDualTracksPrompt,
    vocalTrackPromptPath,
    instrumentalTrackPromptPath,
    promptStartTime,
    promptEndTime,
  } = asPlainIpcObject(config);

  const helperCheck = getHelperScriptOrMissing("yue_probe.py");
  if (!helperCheck.ok) return helperCheck;

  const runnerScript = path.join(__dirname, "yue-probe.cjs");
  const cmdArgs = [
    runnerScript,
    "--run",
    "--python",
    pythonPath || "python",
    "--yue-root",
    yueRoot || "",
    "--genre",
    genreTxt || "",
    "--lyrics",
    lyricsTxt || "",
    "--output",
    outputDir || "",
    "--device",
    deviceRequested || "cpu",
    "--stage1-model",
    stage1Model || "",
    "--stage2-model",
    stage2Model || "",
    "--segments",
    String(segments || 1),
    "--max-new-tokens",
    String(maxNewTokens || 3000),
    "--stage2-batch-size",
    String(stage2BatchSize || 1),
    "--repetition-penalty",
    String(repetitionPenalty || 1.1),
  ];

  if (useAudioPrompt && audioPromptPath) {
    cmdArgs.push("--use-audio-prompt", "true");
    cmdArgs.push("--audio-prompt-path", audioPromptPath);
    if (promptStartTime) cmdArgs.push("--prompt-start-time", String(promptStartTime));
    if (promptEndTime) cmdArgs.push("--prompt-end-time", String(promptEndTime));
  } else if (useDualTracksPrompt && vocalTrackPromptPath && instrumentalTrackPromptPath) {
    cmdArgs.push("--use-dual-tracks-prompt", "true");
    cmdArgs.push("--vocal-track-prompt-path", vocalTrackPromptPath);
    cmdArgs.push("--instrumental-track-prompt-path", instrumentalTrackPromptPath);
    if (promptStartTime) cmdArgs.push("--prompt-start-time", String(promptStartTime));
    if (promptEndTime) cmdArgs.push("--prompt-end-time", String(promptEndTime));
  }

  event.sender.send("backend-progress", {
    type: "log",
    message: "[yue-runner] Launching custom local YuE model generation script",
  });

  try {
    const child = spawnNodeRunner(cmdArgs);
    activeChildProcess = child;

    child.stdout.on("data", (data) => {
      event.sender.send("backend-progress", { type: "log", message: `[yue-stdout] ${data.toString().trim()}` });
    });

    child.stderr.on("data", (data) => {
      event.sender.send("backend-progress", { type: "log", message: `[yue-stderr] ${data.toString().trim()}` });
    });

    const exitCode = await new Promise((resolve, reject) => {
      child.on("close", (code) => {
        activeChildProcess = null;
        resolve(code);
      });
      child.on("error", (err) => {
        activeChildProcess = null;
        reject(err);
      });
    });

    const reportPath = path.join(outputDir || process.cwd(), "yue_e2e_proof.json");
    let report = null;
    if (fs.existsSync(reportPath)) {
      try {
        report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      } catch (err) {}
    }

    if (exitCode === 0 && report && report.proofStatus === "PASS") {
      return { success: true, report: report };
    } else {
      return {
        success: false,
        error: `Inference process exited with code ${exitCode}. Check preflight blockers and folder layouts.`,
        report: report,
      };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("read-yue-proof-report", async (event, outputFolder) => {
  try {
    const resolved = resolveProofReportPath(outputFolder, "yue_e2e_proof.json");
    if (!resolved.ok) return { success: false, error: resolved.error, folderPath: resolved.folderPath };
    const reportPath = resolved.reportPath;
    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      return { success: true, report: data };
    }
    return { success: false, error: "Proof report file not found." };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("validate-basic-pitch-environment", async (event, config) => {
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
    midiTempo,
  } = asPlainIpcObject(config);
  const helperCheck = getHelperScriptOrMissing("basic_pitch_probe.py");
  if (!helperCheck.ok) return helperCheck;

  const runnerScript = path.join(__dirname, "basic-pitch-probe.cjs");
  const args = [
    runnerScript,
    "--dry-run",
    "--python",
    pythonPath || "python",
    "--input",
    inputAudio || "",
    "--output",
    outputDir || "",
  ];
  if (saveMidi) args.push("--save-midi");
  if (sonifyMidi) args.push("--sonify-midi");
  if (saveModelOutputs) args.push("--save-model-outputs");
  if (saveNoteEvents) args.push("--save-note-events");

  if (onsetThreshold) args.push("--onset-threshold", String(onsetThreshold));
  if (frameThreshold) args.push("--frame-threshold", String(frameThreshold));
  if (minNoteLength) args.push("--minimum-note-length", String(minNoteLength));
  if (minFreq) args.push("--minimum-frequency", String(minFreq));
  if (maxFreq) args.push("--maximum-frequency", String(maxFreq));
  if (includePitchBends) args.push("--include-pitch-bends");
  if (multiplePitchBends) args.push("--multiple-pitch-bends");
  if (midiTempo) args.push("--midi-tempo", String(midiTempo));

  try {
    runNodeRunnerSync(args, 15000);
    const reportPath = path.join(outputDir || process.cwd(), "basic_pitch_e2e_proof.json");
    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      return { success: true, report: data };
    }
    return { success: false, error: "Dry-run finished but Basic Pitch reports were not compiled on disk." };
  } catch (err) {
    return { success: false, error: err.message, stderr: err.stderr ? err.stderr.toString() : "" };
  }
});

ipcMain.handle("run-basic-pitch-transcription", async (event, config) => {
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
    midiTempo,
  } = asPlainIpcObject(config);

  const helperCheck = getHelperScriptOrMissing("basic_pitch_probe.py");
  if (!helperCheck.ok) return helperCheck;

  const runnerScript = path.join(__dirname, "basic-pitch-probe.cjs");
  const args = [
    runnerScript,
    "--run",
    "--python",
    pythonPath || "python",
    "--input",
    inputAudio || "",
    "--output",
    outputDir || "",
  ];
  if (saveMidi) args.push("--save-midi");
  if (sonifyMidi) args.push("--sonify-midi");
  if (saveModelOutputs) args.push("--save-model-outputs");
  if (saveNoteEvents) args.push("--save-note-events");

  if (onsetThreshold) args.push("--onset-threshold", String(onsetThreshold));
  if (frameThreshold) args.push("--frame-threshold", String(frameThreshold));
  if (minNoteLength) args.push("--minimum-note-length", String(minNoteLength));
  if (minFreq) args.push("--minimum-frequency", String(minFreq));
  if (maxFreq) args.push("--maximum-frequency", String(maxFreq));
  if (includePitchBends) args.push("--include-pitch-bends");
  if (multiplePitchBends) args.push("--multiple-pitch-bends");
  if (midiTempo) args.push("--midi-tempo", String(midiTempo));

  event.sender.send("backend-progress", {
    type: "log",
    message: "[basic-pitch-runner] Launching custom local Basic Pitch audio-to-MIDI transcription...",
  });

  try {
    const child = spawnNodeRunner(args);
    activeChildProcess = child;

    child.stdout.on("data", (data) => {
      event.sender.send("backend-progress", { type: "log", message: `[basic-pitch-stdout] ${data.toString().trim()}` });
    });

    child.stderr.on("data", (data) => {
      event.sender.send("backend-progress", { type: "log", message: `[basic-pitch-stderr] ${data.toString().trim()}` });
    });

    const exitCode = await new Promise((resolve, reject) => {
      child.on("close", (code) => {
        activeChildProcess = null;
        resolve(code);
      });
      child.on("error", (err) => {
        activeChildProcess = null;
        reject(err);
      });
    });

    const reportPath = path.join(outputDir || process.cwd(), "basic_pitch_e2e_proof.json");
    let report = null;
    if (fs.existsSync(reportPath)) {
      try {
        report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      } catch (err) {}
    }

    if (exitCode === 0 && report && report.proofStatus === "PASS") {
      return { success: true, report: report };
    } else {
      return {
        success: false,
        error: `Basic Pitch execution exited with code ${exitCode}. Check your logs, environment, and preflight blockers.`,
        report: report,
      };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("read-basic-pitch-proof-report", async (event, outputFolder) => {
  try {
    const resolved = resolveProofReportPath(outputFolder, "basic_pitch_e2e_proof.json");
    if (!resolved.ok) return { success: false, error: resolved.error, folderPath: resolved.folderPath };
    const reportPath = resolved.reportPath;
    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      return { success: true, report: data };
    }
    return { success: false, error: "Basic Pitch proof report file not found on disk." };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("verify-audio-file", async (event, filePath) => {
  try {
    if (!filePath) {
      return { exists: false, error: "Empty file path" };
    }
    const resolvedPath = path.resolve(filePath);
    if (fs.existsSync(resolvedPath)) {
      const stats = fs.statSync(resolvedPath);
      const isFile = stats.isFile();
      const sizeBytes = stats.size;
      const ext = path.extname(resolvedPath).toLowerCase();
      const isAudio = [".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".mid", ".midi"].includes(ext);
      return {
        exists: isFile,
        sizeBytes: sizeBytes,
        extension: ext,
        isAudio: isAudio,
      };
    }
    return { exists: false, error: "File does not exist" };
  } catch (err) {
    return { exists: false, error: err.message };
  }
});

// Start processing - executes real CPU AI separation only. FFmpeg fallback is not proof eligible.
ipcMain.handle("start-processing", async (event, config) => {
  activeCancellationRequested = false;
  event.sender.send("backend-progress", {
    type: "log",
    message: "[backend] INITIATING REAL CPU AI SEPARATION PIPELINE",
  });

  const result = await aiSeparation.runCpuAiSeparation(
    {
      ...config,
      selectedDevice: "cpu",
      parameters: {
        ...(config?.parameters || {}),
        executionDevice: "cpu",
      },
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
        event.sender.send("backend-progress", { type: "log", message });
      },
      onProgress: (update) => {
        event.sender.send("backend-progress", update);
      },
    },
  );

  if (result.status !== "cancelled") {
    activeCancellationRequested = false;
  }
  activeChildProcess = null;
  return result;
});

// Cancel processing
ipcMain.handle("cancel-processing", async () => {
  console.log("Main process: cancel-processing received");
  if (!activeChildProcess) {
    activeCancellationRequested = false;
    return { ok: true, status: "no_active_process" };
  }
  activeCancellationRequested = true;
  const result = aiSeparation.requestCancelActiveProcess(activeChildProcess);
  if (result.ok) {
    activeChildProcess = null;
  }
  return result;
});
