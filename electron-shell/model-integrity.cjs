const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MODEL_ARCH_SUBFOLDERS = {
  VR: 'VR',
  'MDX-Net': 'MDX_Net',
  MDX_Net: 'MDX_Net',
  Demucs: 'Demucs',
  RoFormer: 'RoFormer',
  MDXC: 'MDXC',
  Custom: 'Custom',
  Ensemble: 'Ensemble'
};

const ALLOWED_MODEL_EXTENSIONS = new Set([
  '.ckpt',
  '.json',
  '.onnx',
  '.pth',
  '.pt',
  '.safetensors',
  '.yaml',
  '.yml'
]);

const MAX_MODEL_CANDIDATES = 25;
const MAX_MODEL_SEARCH_DEPTH = 4;

const PROOF_SUPPORTED_BACKENDS = new Set([
  'python-pytorch',
  'onnxruntime',
  'audio-separator',
  'cpu-dsp'
]);

const SOURCE_STATUS_MESSAGES = {
  auth_required:
    'This source returned HTTP 401. It may require Hugging Face authentication, approved access, or corrected source metadata. OpenStem will not download or use this model for proof until the source is legitimately accessible and the local file passes SHA-256 verification.',
  gated_or_private:
    'This source returned HTTP 403. Access is denied or gated. OpenStem will not download or use this model until legitimate access and verification are available.',
  access_denied:
    'This source returned HTTP 403. Access is denied or gated. OpenStem will not download or use this model until legitimate access and verification are available.',
  rate_limited:
    'This source returned HTTP 429. OpenStem will keep this model blocked until source access can be checked without rate limiting and local SHA-256 verification passes.',
  source_unavailable:
    'The source could not be reached. OpenStem will keep this model blocked until source metadata and access are verified.',
  network_unavailable:
    'The model source check could not reach the network. This is different from HTTP 401; retry connectivity before changing source metadata.',
  dns_failed:
    'DNS lookup failed while checking this model source. This is a connectivity or domain-resolution problem, not proof eligibility.',
  timeout:
    'The model source check timed out. Retry diagnostics before treating the source as broken or proof-eligible.',
  unavailable:
    'The source is unavailable. OpenStem will keep this model blocked until source metadata and access are verified.',
  broken_link:
    'This source returned HTTP 404 / Not Found. Correct the source metadata before download or proof.',
  missing_hash:
    'The source may be reachable, but expected SHA-256 metadata is missing. This model is not proof-eligible.',
  needs_verification:
    'Source metadata is present but not verified. Import or reconnect a local file and match SHA-256 before proof.',
  custom_unverified:
    'Custom model metadata is registered, but the local file has not matched the expected SHA-256.',
  custom_hash_unavailable:
    'Custom model is missing expected SHA-256 metadata. It can be kept for experiments but cannot satisfy proof.'
};

const SOURCE_BLOCKING_STATUSES = new Set(Object.keys(SOURCE_STATUS_MESSAGES));

const SOURCE_STATUS_DIAGNOSTIC_CODES = {
  auth_required: 'MODEL_SOURCE_AUTH_REQUIRED',
  gated_or_private: 'MODEL_SOURCE_ACCESS_DENIED',
  access_denied: 'MODEL_SOURCE_ACCESS_DENIED',
  rate_limited: 'MODEL_SOURCE_RATE_LIMITED',
  source_unavailable: 'MODEL_SOURCE_UNAVAILABLE',
  network_unavailable: 'MODEL_SOURCE_UNAVAILABLE',
  dns_failed: 'MODEL_SOURCE_UNAVAILABLE',
  timeout: 'MODEL_SOURCE_UNAVAILABLE',
  unavailable: 'MODEL_SOURCE_UNAVAILABLE',
  broken_link: 'MODEL_SOURCE_BROKEN_LINK',
  missing_hash: 'MODEL_METADATA_MISSING_HASH',
  needs_verification: 'MODEL_MANUAL_IMPORT_REQUIRED',
  custom_unverified: 'MODEL_MANUAL_IMPORT_REQUIRED',
  custom_hash_unavailable: 'MODEL_METADATA_MISSING_HASH'
};

const PROOF_REASON_DIAGNOSTIC_CODES = {
  hash_mismatch: 'MODEL_LOCAL_HASH_MISMATCH',
  size_mismatch: 'MODEL_LOCAL_HASH_MISMATCH',
  unsupported_backend: 'PROOF_BACKEND_MISSING',
  license_missing: 'MODEL_METADATA_MISSING_LICENSE',
  missing_file: 'PROOF_MODEL_MISSING',
  manual_import_required: 'MODEL_MANUAL_IMPORT_REQUIRED',
  source_missing: 'MODEL_SOURCE_UNAVAILABLE',
  hash_missing: 'PROOF_MODEL_HASH_MISSING',
  custom_unverified: 'MODEL_MANUAL_IMPORT_REQUIRED',
  custom_hash_unavailable: 'MODEL_METADATA_MISSING_HASH'
};

function diagnosticCodeForSourceStatus(status) {
  return SOURCE_STATUS_DIAGNOSTIC_CODES[status] || 'MODEL_SOURCE_UNAVAILABLE';
}

function diagnosticCodeForProofReason(reason) {
  return PROOF_REASON_DIAGNOSTIC_CODES[reason] || diagnosticCodeForSourceStatus(reason);
}

function normalizeModelPayload(modelOrArchitecture, fileName, checksum) {
  if (modelOrArchitecture && typeof modelOrArchitecture === 'object') {
    return { ...modelOrArchitecture };
  }
  return {
    architecture: modelOrArchitecture,
    name: fileName,
    checksum
  };
}

function isPathInside(parentPath, candidatePath) {
  const parent = path.resolve(parentPath);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeExpectedSha256(model) {
  const raw =
    model.expected_sha256 ||
    model.expectedSha256 ||
    model.sha256 ||
    model.checksum;

  if (!raw) return null;
  return String(raw).trim().replace(/^sha256[:_]/i, '').toLowerCase();
}

function normalizeExpectedSizeBytes(model) {
  const raw = model.expected_size_bytes || model.expectedSizeBytes || model.sizeBytes;
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeSupportedExtensions(model) {
  const extensions = new Set(ALLOWED_MODEL_EXTENSIONS);
  if (Array.isArray(model.supportedExtensions)) {
    for (const ext of model.supportedExtensions) {
      if (typeof ext !== 'string' || !ext.trim()) continue;
      const normalized = ext.trim().toLowerCase().startsWith('.') ? ext.trim().toLowerCase() : `.${ext.trim().toLowerCase()}`;
      extensions.add(normalized);
    }
  }

  const modelName = model.name || model.fileName;
  if (typeof modelName === 'string' && modelName.includes('.')) {
    const ext = path.extname(modelName).toLowerCase();
    if (ext) extensions.add(ext);
  }

  return extensions;
}

function getExpectedModelFileName(model) {
  const modelName = model.name || model.fileName;
  if (!modelName || typeof modelName !== 'string') return null;
  return path.basename(modelName);
}

function isAllowedModelFileExtension(fileName, model) {
  return normalizeSupportedExtensions(model).has(path.extname(String(fileName || '')).toLowerCase());
}

function resolveModelLibraryDestination(model, modelLibraryPath) {
  const safeModel = {
    ...model,
    local_path: undefined,
    localPath: undefined,
    absolutePath: undefined
  };
  return resolveModelPath(safeModel, modelLibraryPath);
}

function resolveModelPath(model, modelLibraryPath) {
  const libraryPath = path.resolve(modelLibraryPath);
  const explicitPath = model.local_path || model.localPath || model.absolutePath;

  if (explicitPath) {
    const resolved = path.resolve(String(explicitPath));
    if (!isPathInside(libraryPath, resolved)) {
      return { ok: false, error: 'Model path is outside the approved OpenStem model library.' };
    }
    return { ok: true, localPath: resolved };
  }

  const modelName = model.name || model.fileName;
  if (!modelName || typeof modelName !== 'string') {
    return { ok: false, error: 'Model filename is missing.' };
  }
  if (path.basename(modelName) !== modelName) {
    return { ok: false, error: 'Model filename contains unsafe path traversal characters.' };
  }

  const subFolder = MODEL_ARCH_SUBFOLDERS[model.architecture] || MODEL_ARCH_SUBFOLDERS.Custom;
  const resolved = path.resolve(path.join(libraryPath, subFolder, modelName));
  if (!isPathInside(libraryPath, resolved)) {
    return { ok: false, error: 'Resolved model path is outside the approved OpenStem model library.' };
  }
  return { ok: true, localPath: resolved };
}

function computeSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const fd = fs.openSync(filePath, 'r');
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) {
        hash.update(bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function hasUsableLicense(model) {
  const license = String(model.license || '').trim().toLowerCase();
  return !!license && license !== 'unknown' && license !== 'needs verification';
}

function getModelProofEligibility(modelOrArchitecture, verification = {}) {
  const model = normalizeModelPayload(modelOrArchitecture || {});
  const status = verification.status || model.verificationStatus || model.verifiedStatus;
  const backend = model.requiredBackend;
  const hasExpectedSha256 = !!normalizeExpectedSha256(model);

  if (status === 'hash_mismatch' || model.verifiedStatus === 'hash_mismatch') {
    return {
      proofEligible: false,
      reason: 'hash_mismatch',
      displayMessage: 'A local model with a hash mismatch must not be used for proof, release claims, or verified status.',
      diagnosticCode: diagnosticCodeForProofReason('hash_mismatch')
    };
  }

  if (status === 'size_mismatch') {
    return {
      proofEligible: false,
      reason: 'size_mismatch',
      displayMessage: 'The local model file size does not match expected integrity metadata.',
      diagnosticCode: diagnosticCodeForProofReason('size_mismatch')
    };
  }

  if (model.verifiedStatus === 'unsupported_backend' || (backend && !PROOF_SUPPORTED_BACKENDS.has(backend))) {
    return {
      proofEligible: false,
      reason: 'unsupported_backend',
      displayMessage: 'The selected model backend is not supported by the current OpenStem proof path.',
      diagnosticCode: diagnosticCodeForProofReason('unsupported_backend')
    };
  }

  if (model.architecture === 'Ensemble') {
    return {
      proofEligible: false,
      reason: 'unsupported_backend',
      displayMessage: 'Ensemble presets are workflow plans, not single model weight files for CPU AI proof.',
      diagnosticCode: 'ENSEMBLE_PLANNER_ONLY'
    };
  }

  if (!hasUsableLicense(model)) {
    return {
      proofEligible: false,
      reason: 'license_missing',
      displayMessage: 'Model license metadata is missing or unknown; proof eligibility requires usable source/license metadata.',
      diagnosticCode: diagnosticCodeForProofReason('license_missing')
    };
  }

  if (verification.exists === false || status === 'missing') {
    return {
      proofEligible: false,
      reason: 'missing_file',
      displayMessage: 'CPU AI proof is blocked until the selected model file exists locally and matches the expected SHA-256.',
      diagnosticCode: diagnosticCodeForProofReason('missing_file')
    };
  }

  if (model.sourceType === 'manual_import' && !hasExpectedSha256) {
    return {
      proofEligible: false,
      reason: 'manual_import_required',
      displayMessage: 'Manual import requires verifiable source metadata and a matching expected SHA-256 before proof can run.',
      diagnosticCode: diagnosticCodeForProofReason('manual_import_required')
    };
  }

  if (!model.downloadUrl && !model.sourceUrl && model.sourceType !== 'manual_import' && model.architecture !== 'Custom') {
    return {
      proofEligible: false,
      reason: 'source_missing',
      displayMessage: 'Model source metadata is missing; source integrity cannot be verified.',
      diagnosticCode: diagnosticCodeForProofReason('source_missing')
    };
  }

  if (!hasExpectedSha256 || status === 'installed_hash_unavailable') {
    return {
      proofEligible: false,
      reason: 'hash_missing',
      displayMessage: 'CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.',
      diagnosticCode: diagnosticCodeForProofReason('hash_missing')
    };
  }

  if (status === 'hash_verified' && verification.hashMatches === true) {
    return {
      proofEligible: true,
      reason: 'hash_verified',
      displayMessage: 'Model is proof-eligible because its local SHA-256 matches expected source integrity metadata.'
    };
  }

  const blockingSourceStatus = [status, model.verifiedStatus].find((value) => value && SOURCE_BLOCKING_STATUSES.has(value));
  if (blockingSourceStatus) {
    return {
      proofEligible: false,
      reason: blockingSourceStatus,
      displayMessage: SOURCE_STATUS_MESSAGES[blockingSourceStatus],
      diagnosticCode: diagnosticCodeForSourceStatus(blockingSourceStatus)
    };
  }

  if (verification.hashChecked === false) {
    return {
      proofEligible: false,
      reason: 'hash_missing',
      displayMessage: 'CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.',
      diagnosticCode: diagnosticCodeForProofReason('hash_missing')
    };
  }

  return {
    proofEligible: false,
    reason: 'missing_file',
    displayMessage: 'Model proof eligibility has not been established by local hash verification.',
    diagnosticCode: diagnosticCodeForProofReason('missing_file')
  };
}

function inspectReconnectCandidate(modelOrArchitecture, sourcePath) {
  const model = normalizeModelPayload(modelOrArchitecture || {});
  const expectedFileName = getExpectedModelFileName(model);
  const absolutePath = typeof sourcePath === 'string' && sourcePath ? path.resolve(sourcePath) : '';
  const selectedFileName = absolutePath ? path.basename(absolutePath) : '';
  const filenameCompatible = !!expectedFileName && selectedFileName.toLowerCase() === expectedFileName.toLowerCase();
  const extensionAllowed = selectedFileName ? isAllowedModelFileExtension(selectedFileName, model) : false;
  const expectedSha256 = normalizeExpectedSha256(model);
  const expectedSizeBytes = normalizeExpectedSizeBytes(model);

  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return {
      success: false,
      ok: false,
      exists: false,
      status: 'missing',
      diagnosticCode: 'MODEL_LOCAL_FILE_MISSING',
      sourcePath: absolutePath,
      expectedFileName,
      selectedFileName,
      filenameCompatible,
      extensionAllowed,
      hashChecked: false,
      hashMatches: false,
      proofEligible: false,
      error: 'Selected local model file does not exist.'
    };
  }

  const stats = fs.statSync(absolutePath);
  if (!stats.isFile()) {
    return {
      success: false,
      ok: false,
      exists: true,
      status: 'error',
      diagnosticCode: 'MODEL_LOCAL_FILE_MISSING',
      sourcePath: absolutePath,
      expectedFileName,
      selectedFileName,
      filenameCompatible,
      extensionAllowed,
      hashChecked: false,
      hashMatches: false,
      proofEligible: false,
      error: 'Selected reconnect target is not a file.'
    };
  }

  if (!extensionAllowed) {
    return {
      success: false,
      ok: false,
      exists: true,
      status: 'error',
      diagnosticCode: 'MODEL_MANUAL_IMPORT_REQUIRED',
      sourcePath: absolutePath,
      expectedFileName,
      selectedFileName,
      filenameCompatible,
      extensionAllowed,
      fileSizeBytes: stats.size,
      expectedSizeBytes: expectedSizeBytes === null ? undefined : expectedSizeBytes,
      hashChecked: false,
      hashMatches: false,
      proofEligible: false,
      error: `Unsupported model file extension "${path.extname(selectedFileName).toLowerCase()}".`
    };
  }

  const actualSha256 = computeSha256(absolutePath);
  const sizeMatches = expectedSizeBytes === null ? undefined : stats.size === expectedSizeBytes;
  if (expectedSizeBytes !== null && !sizeMatches) {
    return {
      success: false,
      ok: false,
      exists: true,
      status: 'size_mismatch',
      diagnosticCode: 'MODEL_LOCAL_HASH_MISMATCH',
      sourcePath: absolutePath,
      expectedFileName,
      selectedFileName,
      filenameCompatible,
      extensionAllowed,
      actualSha256,
      expectedSha256: expectedSha256 || undefined,
      fileSizeBytes: stats.size,
      expectedSizeBytes,
      sizeMatches: false,
      hashChecked: true,
      hashMatches: false,
      proofEligible: false,
      error: 'Selected model size does not match expected metadata.'
    };
  }

  if (!expectedSha256) {
    const verification = {
      ok: true,
      exists: true,
      status: 'installed_hash_unavailable',
      localPath: absolutePath,
      fileSizeBytes: stats.size,
      expectedSizeBytes: expectedSizeBytes === null ? undefined : expectedSizeBytes,
      sizeMatches,
      hashChecked: false,
      hashMatches: false
    };
    const proofEligibility = getModelProofEligibility(model, verification);
    return {
      success: true,
      ok: true,
      exists: true,
      status: 'installed_hash_unavailable',
      diagnosticCode: 'MODEL_METADATA_MISSING_HASH',
      sourcePath: absolutePath,
      expectedFileName,
      selectedFileName,
      filenameCompatible,
      extensionAllowed,
      actualSha256,
      fileSizeBytes: stats.size,
      expectedSizeBytes: expectedSizeBytes === null ? undefined : expectedSizeBytes,
      sizeMatches,
      hashChecked: false,
      hashMatches: false,
      proofEligible: false,
      proofEligibility,
      message: 'Selected local file was found, but expected SHA-256 metadata is missing.'
    };
  }

  const hashMatches = actualSha256 === expectedSha256;
  const verification = {
    ok: hashMatches,
    exists: true,
    status: hashMatches ? 'hash_verified' : 'hash_mismatch',
    localPath: absolutePath,
    actualSha256,
    expectedSha256,
    fileSizeBytes: stats.size,
    expectedSizeBytes: expectedSizeBytes === null ? undefined : expectedSizeBytes,
    sizeMatches,
    hashChecked: true,
    hashMatches
  };
  const proofEligibility = getModelProofEligibility(model, verification);

  return {
    success: hashMatches,
    ok: hashMatches,
    exists: true,
    status: hashMatches ? 'hash_verified' : 'hash_mismatch',
    diagnosticCode: hashMatches ? undefined : 'MODEL_LOCAL_HASH_MISMATCH',
    sourcePath: absolutePath,
    expectedFileName,
    selectedFileName,
    filenameCompatible,
    extensionAllowed,
    actualSha256,
    expectedSha256,
    fileSizeBytes: stats.size,
    expectedSizeBytes: expectedSizeBytes === null ? undefined : expectedSizeBytes,
    sizeMatches,
    hashChecked: true,
    hashMatches,
    proofEligible: proofEligibility.proofEligible,
    proofEligibility,
    message: hashMatches
      ? 'Selected local file SHA-256 matches expected metadata.'
      : 'Selected local file SHA-256 does not match expected metadata.',
    error: hashMatches ? undefined : 'Selected local file SHA-256 does not match expected metadata.'
  };
}

function reconnectModelFileFromPath(modelOrArchitecture, modelLibraryPath, sourcePath) {
  const model = normalizeModelPayload(modelOrArchitecture || {});
  const inspection = inspectReconnectCandidate(model, sourcePath);
  if (!inspection.success) {
    return {
      ...inspection,
      verified: false
    };
  }

  try {
    const resolvedDestination = resolveModelLibraryDestination(model, modelLibraryPath);
    if (!resolvedDestination.ok) {
      return {
        ...inspection,
        success: false,
        ok: false,
        verified: false,
        status: 'error',
        diagnosticCode: 'MODEL_LOCAL_FILE_MISSING',
        error: resolvedDestination.error
      };
    }

    const destPath = resolvedDestination.localPath;
    const destDir = path.dirname(destPath);
    const destFileName = path.basename(destPath);
    if (!isAllowedModelFileExtension(destFileName, model)) {
      return {
        ...inspection,
        success: false,
        ok: false,
        verified: false,
        status: 'error',
        diagnosticCode: 'MODEL_MANUAL_IMPORT_REQUIRED',
        error: `Reconnect target has unsupported extension "${path.extname(destFileName).toLowerCase()}".`
      };
    }

    fs.mkdirSync(destDir, { recursive: true });
    if (path.resolve(inspection.sourcePath) !== path.resolve(destPath)) {
      fs.copyFileSync(inspection.sourcePath, destPath);
    }

    const verification = verifyModelHash({
      ...model,
      local_path: destPath
    }, modelLibraryPath);
    const proofEligibility = getModelProofEligibility(model, verification);
    const copiedStats = fs.statSync(destPath);

    return {
      ...inspection,
      success: true,
      ok: verification.ok,
      verified: proofEligibility.proofEligible,
      status: verification.status,
      absolutePath: destPath,
      sourcePath: inspection.sourcePath,
      name: destFileName,
      size: copiedStats.size,
      fileSize: `${(copiedStats.size / (1024 * 1024)).toFixed(1)} MB`,
      verification,
      proofEligibility,
      proofEligible: proofEligibility.proofEligible,
      message: proofEligibility.proofEligible
        ? 'Local model reconnected and SHA-256 verified.'
        : `Local model reconnected, but proof remains blocked: ${proofEligibility.displayMessage}`
    };
  } catch (err) {
    return {
      ...inspection,
      success: false,
      ok: false,
      verified: false,
      status: 'error',
      diagnosticCode: 'MODEL_LOCAL_FILE_MISSING',
      error: err.message
    };
  }
}

function searchModelCandidatesInFolder(modelOrArchitecture, searchRoot, options = {}) {
  const model = normalizeModelPayload(modelOrArchitecture || {});
  const expectedFileName = getExpectedModelFileName(model);
  const rootPath = typeof searchRoot === 'string' && searchRoot ? path.resolve(searchRoot) : '';
  const maxDepth = Number.isFinite(Number(options.maxDepth)) ? Math.max(0, Math.min(MAX_MODEL_SEARCH_DEPTH, Number(options.maxDepth))) : MAX_MODEL_SEARCH_DEPTH;
  const candidates = [];

  if (!expectedFileName) {
    return {
      success: false,
      ok: false,
      status: 'error',
      diagnosticCode: 'MODEL_LOCAL_FILE_MISSING',
      rootPath,
      expectedFileName,
      candidates,
      error: 'Expected model filename is missing.'
    };
  }

  if (!rootPath || !fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
    return {
      success: false,
      ok: false,
      status: 'missing',
      diagnosticCode: 'MODEL_LOCAL_FILE_MISSING',
      rootPath,
      expectedFileName,
      candidates,
      error: 'Selected search folder does not exist.'
    };
  }

  function walk(dirPath, depth) {
    if (candidates.length >= MAX_MODEL_CANDIDATES || depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (candidates.length >= MAX_MODEL_CANDIDATES) return;
      const entryPath = path.join(dirPath, entry.name);
      const resolvedEntry = path.resolve(entryPath);
      if (!isPathInside(rootPath, resolvedEntry)) continue;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(resolvedEntry, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      if (entry.name.toLowerCase() !== expectedFileName.toLowerCase()) continue;
      if (!isAllowedModelFileExtension(entry.name, model)) continue;
      candidates.push(inspectReconnectCandidate(model, resolvedEntry));
    }
  }

  walk(rootPath, 0);
  const verifiedCandidates = candidates.filter((candidate) => candidate.status === 'hash_verified' && candidate.hashMatches === true);

  return {
    success: true,
    ok: true,
    status: verifiedCandidates.length > 0 ? 'hash_verified' : candidates.length > 0 ? 'candidates_found' : 'missing',
    diagnosticCode: verifiedCandidates.length > 0 ? undefined : 'MODEL_LOCAL_FILE_MISSING',
    rootPath,
    expectedFileName,
    candidates,
    verifiedCandidates: verifiedCandidates.length,
    message: verifiedCandidates.length > 0
      ? 'Folder search found at least one SHA-256 verified candidate.'
      : candidates.length > 0
        ? 'Folder search found filename candidates, but none matched expected SHA-256.'
        : 'Folder search found no matching filename candidates.'
  };
}

function verifyModelHash(modelOrArchitecture, modelLibraryPath, fileName, checksum) {
  const model = normalizeModelPayload(modelOrArchitecture, fileName, checksum);

  try {
    const resolved = resolveModelPath(model, modelLibraryPath);
    if (!resolved.ok) {
      return {
        ok: false,
        exists: false,
        hashChecked: false,
        status: 'error',
        error: resolved.error
      };
    }

    const localPath = resolved.localPath;
    if (!fs.existsSync(localPath)) {
      return {
        ok: false,
        exists: false,
        hashChecked: false,
        status: 'missing',
        localPath
      };
    }

    const stats = fs.statSync(localPath);
    if (!stats.isFile()) {
      return {
        ok: false,
        exists: true,
        hashChecked: false,
        status: 'error',
        localPath,
        error: 'Resolved model path is not a file.'
      };
    }

    const fileSizeBytes = stats.size;
    const expectedSizeBytes = normalizeExpectedSizeBytes(model);
    const sizeMatches = expectedSizeBytes === null ? undefined : fileSizeBytes === expectedSizeBytes;
    if (expectedSizeBytes !== null && !sizeMatches) {
      return {
        ok: false,
        exists: true,
        sizeMatches: false,
        hashChecked: false,
        fileSizeBytes,
        expectedSizeBytes,
        status: 'size_mismatch',
        localPath
      };
    }

    const expectedSha256 = normalizeExpectedSha256(model);
    if (!expectedSha256) {
      return {
        ok: true,
        exists: true,
        sizeMatches,
        hashChecked: false,
        fileSizeBytes,
        expectedSizeBytes: expectedSizeBytes === null ? undefined : expectedSizeBytes,
        status: 'installed_hash_unavailable',
        localPath
      };
    }

    if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
      return {
        ok: false,
        exists: true,
        sizeMatches,
        hashChecked: false,
        fileSizeBytes,
        expectedSizeBytes: expectedSizeBytes === null ? undefined : expectedSizeBytes,
        expectedSha256,
        status: 'error',
        localPath,
        error: 'Expected SHA-256 is missing or malformed.'
      };
    }

    const actualSha256 = computeSha256(localPath);
    const hashMatches = actualSha256 === expectedSha256;

    return {
      ok: hashMatches,
      exists: true,
      sizeMatches,
      hashChecked: true,
      hashMatches,
      actualSha256,
      expectedSha256,
      fileSizeBytes,
      expectedSizeBytes: expectedSizeBytes === null ? undefined : expectedSizeBytes,
      status: hashMatches ? 'hash_verified' : 'hash_mismatch',
      localPath
    };
  } catch (err) {
    return {
      ok: false,
      exists: false,
      hashChecked: false,
      status: 'error',
      error: err.message
    };
  }
}

function deleteModelFile(modelOrArchitecture, modelLibraryPath, fileName) {
  const model = normalizeModelPayload(modelOrArchitecture, fileName);
  const deletedPaths = [];
  const skippedPaths = [];

  try {
    const resolved = resolveModelPath(model, modelLibraryPath);
    if (!resolved.ok) {
      return { ok: false, success: false, deletedPaths, skippedPaths, error: resolved.error };
    }

    const localPath = resolved.localPath;
    if (!isPathInside(modelLibraryPath, localPath)) {
      return {
        ok: false,
        success: false,
        deletedPaths,
        skippedPaths,
        error: 'Blocked unsafe delete outside OpenStem model library.'
      };
    }

    if (!fs.existsSync(localPath)) {
      skippedPaths.push(localPath);
      return { ok: true, success: true, deletedPaths, skippedPaths };
    }

    const stats = fs.statSync(localPath);
    if (!stats.isFile()) {
      return {
        ok: false,
        success: false,
        deletedPaths,
        skippedPaths,
        error: 'Blocked delete because target is not a file.'
      };
    }

    const ext = path.extname(localPath).toLowerCase();
    if (!ALLOWED_MODEL_EXTENSIONS.has(ext)) {
      return {
        ok: false,
        success: false,
        deletedPaths,
        skippedPaths,
        error: `Blocked delete for unsupported model file extension "${ext}".`
      };
    }

    fs.unlinkSync(localPath);
    deletedPaths.push(localPath);
    return { ok: true, success: true, deletedPaths, skippedPaths };
  } catch (err) {
    return { ok: false, success: false, deletedPaths, skippedPaths, error: err.message };
  }
}

function purgeModelCache(modelLibraryPath) {
  const deletedPaths = [];
  const skippedPaths = [];
  const approvedTargets = [
    path.join(modelLibraryPath, 'temp_downloads'),
    path.join(modelLibraryPath, 'verification_cache.json')
  ];

  try {
    for (const targetPath of approvedTargets) {
      const resolved = path.resolve(targetPath);
      if (!isPathInside(modelLibraryPath, resolved)) {
        skippedPaths.push(resolved);
        continue;
      }
      if (!fs.existsSync(resolved)) {
        skippedPaths.push(resolved);
        continue;
      }
      const stats = fs.statSync(resolved);
      if (stats.isDirectory()) {
        fs.rmSync(resolved, { recursive: true, force: true });
      } else {
        fs.unlinkSync(resolved);
      }
      deletedPaths.push(resolved);
    }
    return { ok: true, success: true, deletedPaths, skippedPaths };
  } catch (err) {
    return { ok: false, success: false, deletedPaths, skippedPaths, error: err.message };
  }
}

module.exports = {
  ALLOWED_MODEL_EXTENSIONS,
  computeSha256,
  deleteModelFile,
  getModelProofEligibility,
  inspectReconnectCandidate,
  isPathInside,
  normalizeExpectedSha256,
  normalizeModelPayload,
  purgeModelCache,
  reconnectModelFileFromPath,
  resolveModelPath,
  searchModelCandidatesInFolder,
  verifyModelHash
};
