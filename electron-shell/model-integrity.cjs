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

const PROOF_SUPPORTED_BACKENDS = new Set([
  'python-pytorch',
  'onnxruntime',
  'audio-separator',
  'cpu-dsp'
]);

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
      displayMessage: 'A local model with a hash mismatch must not be used for proof, release claims, or verified status.'
    };
  }

  if (status === 'size_mismatch') {
    return {
      proofEligible: false,
      reason: 'size_mismatch',
      displayMessage: 'The local model file size does not match expected integrity metadata.'
    };
  }

  if (model.verifiedStatus === 'broken_link' || status === 'broken_link') {
    return {
      proofEligible: false,
      reason: 'broken_link',
      displayMessage: 'A model source returning HTTP 401 or another unavailable response must be treated as unavailable until source metadata is corrected.'
    };
  }

  if (model.verifiedStatus === 'unsupported_backend' || (backend && !PROOF_SUPPORTED_BACKENDS.has(backend))) {
    return {
      proofEligible: false,
      reason: 'unsupported_backend',
      displayMessage: 'The selected model backend is not supported by the current OpenStem proof path.'
    };
  }

  if (model.architecture === 'Ensemble') {
    return {
      proofEligible: false,
      reason: 'unsupported_backend',
      displayMessage: 'Ensemble presets are workflow plans, not single model weight files for CPU AI proof.'
    };
  }

  if (!hasUsableLicense(model)) {
    return {
      proofEligible: false,
      reason: 'license_missing',
      displayMessage: 'Model license metadata is missing or unknown; proof eligibility requires usable source/license metadata.'
    };
  }

  if (verification.exists === false || status === 'missing') {
    return {
      proofEligible: false,
      reason: 'missing_file',
      displayMessage: 'CPU AI proof is blocked until the selected model file exists locally and matches the expected SHA-256.'
    };
  }

  if (model.sourceType === 'manual_import' && !hasExpectedSha256) {
    return {
      proofEligible: false,
      reason: 'manual_import_required',
      displayMessage: 'Manual import requires verifiable source metadata and a matching expected SHA-256 before proof can run.'
    };
  }

  if (!model.downloadUrl && !model.sourceUrl && model.sourceType !== 'manual_import' && model.architecture !== 'Custom') {
    return {
      proofEligible: false,
      reason: 'source_missing',
      displayMessage: 'Model source metadata is missing; source integrity cannot be verified.'
    };
  }

  if (!hasExpectedSha256 || status === 'installed_hash_unavailable' || verification.hashChecked === false) {
    return {
      proofEligible: false,
      reason: 'hash_missing',
      displayMessage: 'CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.'
    };
  }

  if (status === 'hash_verified' && verification.hashMatches === true) {
    return {
      proofEligible: true,
      reason: 'hash_verified',
      displayMessage: 'Model is proof-eligible because its local SHA-256 matches expected source integrity metadata.'
    };
  }

  return {
    proofEligible: false,
    reason: 'missing_file',
    displayMessage: 'Model proof eligibility has not been established by local hash verification.'
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
  isPathInside,
  normalizeExpectedSha256,
  normalizeModelPayload,
  purgeModelCache,
  resolveModelPath,
  verifyModelHash
};
