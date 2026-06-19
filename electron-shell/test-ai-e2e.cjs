const fs = require('fs');
const path = require('path');
const aiSeparation = require('./ai-separation.cjs');

function parseArgs(argv) {
  const parsed = {
    python: null,
    model: null,
    input: null,
    output: null,
    device: 'cpu',
    expectedSha256: null,
    expectedSizeBytes: null,
    license: null,
    sourceUrl: null
  };

  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--python') parsed.python = value;
    if (key === '--model') parsed.model = value;
    if (key === '--input') parsed.input = value;
    if (key === '--output') parsed.output = value;
    if (key === '--device') parsed.device = value || 'cpu';
    if (key === '--expected-sha256') parsed.expectedSha256 = value;
    if (key === '--expected-size-bytes') parsed.expectedSizeBytes = value;
    if (key === '--license') parsed.license = value;
    if (key === '--source-url') parsed.sourceUrl = value;
    if (key.startsWith('--')) i++;
  }
  return parsed;
}

function printHeader() {
  console.log('==========================================================');
  console.log('      OPENSTEM REAL LOCAL CPU AI SEPARATION E2E PROOF      ');
  console.log('==========================================================');
}

function block(message, details = []) {
  console.log('\nRESULT: BLOCKED');
  console.log(`Reason: ${message}`);
  for (const detail of details) {
    console.log(`  - ${detail}`);
  }
  console.log('==========================================================');
  process.exit(2);
}

function fail(message, result) {
  console.log('\nRESULT: FAIL');
  console.log(`Reason: ${message}`);
  if (result) {
    console.log(JSON.stringify(result, null, 2));
  }
  console.log('==========================================================');
  process.exit(1);
}

function requireExistingFile(label, filePath) {
  if (!filePath) block(`${label} path is required.`);
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) block(`${label} path does not exist.`, [resolved]);
  if (!fs.statSync(resolved).isFile()) block(`${label} path is not a file.`, [resolved]);
  return resolved;
}

function requireExistingDirectory(label, folderPath) {
  if (!folderPath) block(`${label} path is required.`);
  const resolved = path.resolve(folderPath);
  if (!fs.existsSync(resolved)) block(`${label} folder does not exist.`, [resolved]);
  if (!fs.statSync(resolved).isDirectory()) block(`${label} path is not a directory.`, [resolved]);
  const folderCheck = aiSeparation.verifyOutputFolder(resolved);
  if (!folderCheck.success) block(`${label} folder is not writable.`, [folderCheck.error || resolved]);
  return resolved;
}

async function main() {
  printHeader();
  const args = parseArgs(process.argv.slice(2));

  if (args.device !== 'cpu') {
    block('This task implements CPU AI proof only; CUDA/MPS/DirectML proof is not implemented.');
  }

  const pythonPath = requireExistingFile('Python executable', args.python);
  const modelPath = requireExistingFile('Model file', args.model);
  const inputPath = requireExistingFile('Input audio', args.input);
  const outputFolder = requireExistingDirectory('Output', args.output);
  const expectedSha256 = args.expectedSha256 ? String(args.expectedSha256).trim().replace(/^sha256[:_]/i, '').toLowerCase() : null;

  if (!expectedSha256 || !/^[a-f0-9]{64}$/.test(expectedSha256)) {
    block('Manual CPU proof requires --expected-sha256 with a valid SHA-256 value.', [
      'Do not run CPU proof with an unverified model asset.',
      'A local model with a hash mismatch or missing hash must not be used for proof.'
    ]);
  }

  console.log('[1/4] Checking Python/backend requirements...');
  const backendDetails = aiSeparation.checkBackendDetails(pythonPath);
  const ffmpeg = aiSeparation.checkFFmpegReady();
  console.log(`  Python: ${backendDetails.pythonFound ? `${backendDetails.pythonPath} (${backendDetails.pythonVersion})` : 'missing'}`);
  console.log(`  audio-separator import: ${backendDetails.audioSeparatorInstalled ? 'ready' : 'missing'}`);
  console.log(`  audio-separator CLI: ${backendDetails.audioSeparatorCliReady ? 'ready' : 'missing'}`);
  console.log(`  PyTorch: ${backendDetails.torchInstalled ? backendDetails.torchVersion : 'missing'}`);
  console.log(`  FFmpeg: ${ffmpeg.ready ? ffmpeg.version : 'missing'}`);

  if (!backendDetails.canRunAISeparation || !ffmpeg.ready) {
    const blockers = [
      ...(backendDetails.blockers || []).map(blocker => `${blocker.id}: ${blocker.label}`),
      ...(!ffmpeg.ready ? [`ffmpeg_missing: ${ffmpeg.error || 'ffmpeg -version failed'}`] : [])
    ];
    block('Backend requirements are missing.', blockers);
  }

  console.log('[2/4] Building CPU AI processing request...');
  const request = {
    inputs: [inputPath],
    outputFolder,
    format: 'WAV',
    model: {
      id: 'manual_e2e_model',
      name: path.basename(modelPath),
      architecture: path.basename(path.dirname(modelPath)) || 'Custom',
      filePath: modelPath,
      stemType: 'variable',
      gpuSupport: false,
      memoryRisk: 'high',
      downloaded: true,
      description: 'Manual E2E proof model',
      fileSize: `${fs.statSync(modelPath).size} bytes`,
      checksum: expectedSha256,
      expectedSizeBytes: args.expectedSizeBytes ? Number(args.expectedSizeBytes) : undefined,
      license: args.license || 'User-supplied verified source metadata',
      sourceUrl: args.sourceUrl || undefined,
      sourceType: 'manual_import',
      requiredBackend: 'audio-separator'
    },
    verifiedModelLocalPath: modelPath,
    method: {
      id: 'manual_e2e_cpu_ai',
      name: 'Manual CPU AI E2E',
      category: 'Custom Models',
      description: 'Manual CPU AI proof',
      defaultModelId: 'manual_e2e_model'
    },
    processMethod: 'manual_e2e_cpu_ai',
    userSelectedMode: 'ai',
    selectedDevice: 'cpu',
    customPythonPath: pythonPath,
    parameters: {
      chunks: '512',
      noiseReduction: '0',
      executionDevice: 'cpu',
      cpuThreads: 2,
      segmentSize: '256'
    },
    options: {
      ttaActive: false,
      postProcessActive: false,
      vocalsOnly: false,
      instrumentalOnly: false,
      splitMode: false,
      saveAllOutputs: true,
      modelTestMode: false,
      createFolderPerTrack: false
    },
    timestamp: new Date().toISOString()
  };

  console.log('[3/4] Running audio-separator CPU subprocess...');
  const result = await aiSeparation.runCpuAiSeparation(request, {
    allowExternalModelPath: true,
    backendDetails,
    ffmpeg,
    onLog: (message) => console.log(`  ${message}`),
    onProgress: (update) => {
      if (update.log) console.log(`  ${update.log}`);
      if (update.status && update.status !== 'running') console.log(`  [status] ${update.status}`);
    }
  });

  console.log('[4/4] Verifying proof result...');
  console.log(JSON.stringify(result, null, 2));

  if (result.success && result.proofStatus === 'pass' && result.outputFiles.some(file => file.verified && file.sizeBytes > 0)) {
    console.log('\nRESULT: PASS');
    console.log('CPU AI proof passed with verified non-empty output stems.');
    console.log('==========================================================');
    process.exit(0);
  }

  fail(result.error || 'CPU AI proof did not pass.', result);
}

main().catch((err) => {
  fail(err.message || String(err));
});
