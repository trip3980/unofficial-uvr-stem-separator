const fs = require('fs');
const path = require('path');

const REQUIRED_RUNTIME_FILES = [
  { name: 'Renderer entrypoint', relativePath: 'dist/index.html', required: true },
  { name: 'Dev/server HTTP bundle', relativePath: 'dist/server.cjs', required: false },
  { name: 'Electron main process', relativePath: 'electron-shell/main.cjs', required: true },
  { name: 'Electron preload bridge', relativePath: 'electron-shell/preload.cjs', required: true },
  { name: 'YuE Node runner', relativePath: 'electron-shell/yue-probe.cjs', required: true },
  { name: 'Basic Pitch Node runner', relativePath: 'electron-shell/basic-pitch-probe.cjs', required: true },
  { name: 'YuE Python probe helper', relativePath: 'scripts/yue_probe.py', required: true },
  { name: 'Basic Pitch Python probe helper', relativePath: 'scripts/basic_pitch_probe.py', required: true }
];

function getElectronApp() {
  try {
    const electron = require('electron');
    return electron && electron.app ? electron.app : null;
  } catch (err) {
    return null;
  }
}

function normalizeBool(value) {
  return value === true || value === 'true' || value === '1';
}

function isPackagedRuntime(options = {}) {
  if (options.isPackaged !== undefined) return normalizeBool(options.isPackaged);
  if (process.env.OPENSTEM_IS_PACKAGED !== undefined) return normalizeBool(process.env.OPENSTEM_IS_PACKAGED);
  const electronApp = getElectronApp();
  if (electronApp && typeof electronApp.isPackaged === 'boolean') return electronApp.isPackaged;
  return false;
}

function getAppRoot(options = {}) {
  if (options.appRoot) return path.resolve(String(options.appRoot));
  if (options.appPath) return path.resolve(String(options.appPath));
  if (process.env.OPENSTEM_APP_ROOT) return path.resolve(process.env.OPENSTEM_APP_ROOT);

  const electronApp = getElectronApp();
  if (electronApp && typeof electronApp.getAppPath === 'function') {
    try {
      return path.resolve(electronApp.getAppPath());
    } catch (err) {
      // Fall through to module-relative resolution.
    }
  }

  return path.resolve(__dirname, '..');
}

function getResourcesRoot(options = {}) {
  if (options.resourcesRoot) return path.resolve(String(options.resourcesRoot));
  if (options.resourcesPath) return path.resolve(String(options.resourcesPath));
  if (process.env.OPENSTEM_RESOURCES_PATH) return path.resolve(process.env.OPENSTEM_RESOURCES_PATH);
  if (isPackagedRuntime(options) && process.resourcesPath) return path.resolve(process.resourcesPath);
  return getAppRoot(options);
}

function fileExists(filePath) {
  try {
    return !!filePath && fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

function asarUnpackedPath(candidatePath) {
  return candidatePath.includes('app.asar')
    ? candidatePath.replace('app.asar', 'app.asar.unpacked')
    : null;
}

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean).map(p => path.resolve(p)))];
}

function getRuntimeCandidates(relativePath, options = {}) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('Runtime relativePath is required.');
  }
  if (path.isAbsolute(relativePath)) return uniquePaths([relativePath]);

  const normalizedRelative = relativePath.replace(/[\\/]+/g, path.sep);
  const appRoot = getAppRoot(options);
  const resourcesRoot = getResourcesRoot(options);

  const candidates = [
    path.join(resourcesRoot, normalizedRelative),
    path.join(appRoot, normalizedRelative)
  ];

  const appUnpacked = asarUnpackedPath(appRoot);
  const resourcesUnpacked = asarUnpackedPath(resourcesRoot);
  if (appUnpacked) candidates.push(path.join(appUnpacked, normalizedRelative));
  if (resourcesUnpacked) candidates.push(path.join(resourcesUnpacked, normalizedRelative));

  return uniquePaths(candidates);
}

function resolveRuntimeFile(relativePath, options = {}) {
  const candidates = getRuntimeCandidates(relativePath, options);
  return candidates.find(fileExists) || candidates[0];
}

function resolveScriptFile(filename, options = {}) {
  const safeName = path.basename(String(filename || ''));
  if (!safeName) {
    throw new Error('Script filename is required.');
  }
  return resolveRuntimeFile(path.join('scripts', safeName), options);
}

function explainMissingRuntimeFile(filePath) {
  return `Required runtime file is missing from packaged resources: ${filePath}`;
}

function createMissingHelperScriptResult(missingPath) {
  return {
    ok: false,
    success: false,
    status: 'helper_missing',
    missingPath,
    message: 'Required helper script is missing from packaged resources.'
  };
}

function checkPackagedRuntime(options = {}) {
  const appPath = getAppRoot(options);
  const resourcesPath = getResourcesRoot(options);
  const requiredFiles = REQUIRED_RUNTIME_FILES.map((entry) => {
    const resolved = resolveRuntimeFile(entry.relativePath, options);
    return {
      name: entry.name,
      path: resolved,
      exists: fileExists(resolved),
      required: entry.required
    };
  });
  const missingRequiredFiles = requiredFiles
    .filter(entry => entry.required && !entry.exists)
    .map(entry => entry.path);

  return {
    ok: missingRequiredFiles.length === 0,
    isPackaged: isPackagedRuntime(options),
    appPath,
    resourcesPath,
    requiredFiles,
    missingRequiredFiles
  };
}

function getNodeRunnerEnv(extra = {}, options = {}) {
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    OPENSTEM_APP_ROOT: getAppRoot(options),
    OPENSTEM_RESOURCES_PATH: getResourcesRoot(options),
    OPENSTEM_IS_PACKAGED: isPackagedRuntime(options) ? '1' : '0',
    ...extra
  };
}

module.exports = {
  REQUIRED_RUNTIME_FILES,
  checkPackagedRuntime,
  createMissingHelperScriptResult,
  explainMissingRuntimeFile,
  fileExists,
  getAppRoot,
  getNodeRunnerEnv,
  getResourcesRoot,
  getRuntimeCandidates,
  isPackagedRuntime,
  resolveRuntimeFile,
  resolveScriptFile
};
