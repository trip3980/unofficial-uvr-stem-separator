import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createRequire } from "module";
import { MODEL_REGISTRY } from "../services/audioEngine";
import { getModelProofEligibility } from "../services/modelProofEligibility";
import { validateModelEntry, validateModelRegistry } from "../services/registryValidator";

const require = createRequire(import.meta.url);

/**
 * OpenStem Application Assurance Unit Tests
 * Direct assessment of:
 * 1. Independent app title branding
 * 2. README disclosures/limits
 * 3. THIRD_PARTY_NOTICES.md presence & completeness
 * 4. Registry validator behavior on malformed entries
 * 5. UI status labels mapping and safety deactivation
 * 6. FFmpeg fallback labeling
 */
function runTests(): void {
  console.log("=========================================");
  console.log("RUNNING COMPREHENSIVE REPOSITORY TESTS");
  console.log("=========================================");

  let failuresCount = 0;

  function assert(condition: boolean, testName: string, errorMessage: string = "") {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (errorMessage) {
        console.error(`   Reason: ${errorMessage}`);
      }
      failuresCount++;
    }
  }

  // Define paths relative to workspace root (assuming running from process.cwd() or script directory context)
  const rootDir = process.cwd();
  
  // Test 1: App Title displayed in branding system
  try {
    const brandingPath = path.join(rootDir, "src", "config", "branding.ts");
    const brandingContent = fs.readFileSync(brandingPath, "utf8");
    assert(
      brandingContent.includes("OpenStem") || brandingContent.includes("Hardened Functional Alpha"),
      "Test 1.1: src/config/branding.ts contains 'OpenStem' to reflect independent branding",
      "Branding constant does not declare 'OpenStem'"
    );
    assert(
      !brandingContent.includes("Official Release Mode"),
      "Test 1.2: src/config/branding.ts does not contain 'Official Release Mode'",
      "Forbidden string 'Official Release Mode' found"
    );
  } catch (err: any) {
    assert(false, "Test 1: Branding configuration file check", err.message);
  }

  // Test 2: README holds clear disclaimers & origin attribution
  try {
    const readmePath = path.join(rootDir, "README.md");
    const readmeContent = fs.readFileSync(readmePath, "utf8");
    assert(
      readmeContent.includes("independent") && readmeContent.includes("Hardened Functional Alpha"),
      "Test 2.1: README contains clear disclaimers",
      "README is missing independent disclaimer or status"
    );
    assert(
      readmeContent.includes("Ultimate Vocal Remover") || readmeContent.includes("UVR"),
      "Test 2.2: README provides origin attribution",
      "README does not mention the upstream Ultimate Vocal Remover"
    );
    assert(
      !readmeContent.includes("Official Release Mode") && !readmeContent.includes("UVR 6"),
      "Test 2.3: README does not declare forbidden official continuations",
      "Forbidden official release patterns found in README"
    );
    assert(
      readmeContent.includes("CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.") &&
        readmeContent.includes("A local model with a hash mismatch must not be used for proof, release claims, or verified status.") &&
        readmeContent.includes("A model source returning HTTP 401 must be treated as unavailable or requiring manual source correction."),
      "Test 2.4: README documents verified model proof blockers",
      "README is missing exact verified model blocker language"
    );
  } catch (err: any) {
    assert(false, "Test 2: README disclaimers and attribution", err.message);
  }

  // Test 3: THIRD_PARTY_NOTICES.md exists and contains the requested items in proper format
  try {
    const noticesPath = path.join(rootDir, "THIRD_PARTY_NOTICES.md");
    const noticesContent = fs.readFileSync(noticesPath, "utf8");
    assert(
      fs.existsSync(noticesPath),
      "Test 3.1: THIRD_PARTY_NOTICES.md exists on disk",
      "Notice file not found"
    );
    assert(
      noticesContent.includes("audio-separator") && noticesContent.includes("Ultimate Vocal Remover"),
      "Test 3.2: THIRD_PARTY_NOTICES.md references core dependencies",
      "Upstream projects are not mentioned"
    );
    assert(
      noticesContent.includes("MIT") || noticesContent.includes("License"),
      "Test 3.3: THIRD_PARTY_NOTICES.md lists licenses",
      "License attribution column or table missing"
    );
  } catch (err: any) {
    assert(false, "Test 3: THIRD_PARTY_NOTICES.md checks", err.message);
  }

  // Test 4: Registry validator fails on malformed model entries
  try {
    // Construct mock malformed entry
    const malformedEntry = {
      id: "malformed_model_fake_hash",
      name: "", // Fail: missing filename
      architecture: "VR" as const,
      filePath: "models/VR/fake.pth",
      stemType: "vocals" as const,
      gpuSupport: false,
      memoryRisk: "low" as const,
      downloaded: false,
      downloadUrl: "https://example.com/fake.pth", // Fail: fake/placeholder URL
      description: "Malformed mock model",
      fileSize: "100 MB",
      license: "", // Fail: missing license
      verifiedStatus: "verified" as const, // Fail: marked as verified with fake url and missing checksum
      checksum: "invalid_short_hash" // Fail: malformed hash length
    };

    const errors = validateModelEntry(malformedEntry);
    assert(
      errors.length > 0,
      "Test 4.1: Registry validator correctly flags malformed model templates",
      "Validator did not flag a duplicate fake url, missing license, missing name, or malformed checksum"
    );
    assert(
      errors.some(e => e.includes("license")),
      "Test 4.2: Validator flags missing license metadata",
      "No license error raised"
    );
    assert(
      errors.some(e => e.includes("checksum") || e.includes("verified")),
      "Test 4.3: Validator blocks fake verified statuses with missing/invalid hashes",
      "Did not block fake verified status"
    );
  } catch (err: any) {
    assert(false, "Test 4: Registry validator behavior checks", err.message);
  }

  // Test 5: UI status labels block downloading for unverified models
  try {
    const downloaderPath = path.join(rootDir, "src", "components", "ModelDownloader.tsx");
    const downloaderContent = fs.readFileSync(downloaderPath, "utf8");
    assert(
      downloaderContent.includes("needs_verification") || downloaderContent.includes("Needs Verification"),
      "Test 5.1: ModelDownloader UI supports 'Needs Verification' state",
      "ModelDownloader has no Needs Verification representation"
    );
    assert(
      downloaderContent.includes("verifiedStatus !== \"verified\"") || downloaderContent.includes("verifiedStatus === \"verified\""),
      "Test 5.2: ModelDownloader filters actions strictly by active verifiedStatus",
      "Download button is not conditioned on verifiedStatus"
    );
    const blockedKnownSources = [
      "vr_5_hp_karaoke",
      "github_release_mdxc",
      "github_raw_demucs_config",
      "hf_space_demucs_mmi",
    ];
    assert(
      blockedKnownSources.every(id => MODEL_REGISTRY.find(model => model.id === id)?.verifiedStatus === "broken_link"),
      "Test 5.3: Known unreachable registry sources remain broken_link",
      "A known HTTP 401/404 registry source was not preserved as broken_link"
    );
    assert(
      MODEL_REGISTRY
        .filter(model => !!model.downloadUrl && model.architecture !== "Ensemble")
        .every(model => model.verifiedStatus !== "verified"),
      "Test 5.4: Current direct-download model sources are not fake-verified",
      "A current direct-download model source is marked verified without a verified reachable source audit"
    );
  } catch (err: any) {
    assert(false, "Test 5: UI status labels checks", err.message);
  }

  // Test 6: FFmpeg fallback checks
  try {
    const manualsPath = path.join(rootDir, "src", "data", "submenuManuals.ts");
    const manualsContent = fs.readFileSync(manualsPath, "utf8");
    assert(
      manualsContent.includes("FFmpeg DSP Fallback") && manualsContent.includes("Non-AI static DSP filtering"),
      "Test 6.1: SubmenuManual definitions explain FFmpeg is not neural AI separation",
      "FFmpeg description lacks honest non-AI static DSP labeling"
    );
  } catch (err: any) {
    assert(false, "Test 6: FFmpeg fallback labeling checks", err.message);
  }

  // Test 7: Native model integrity helper behavior
  try {
    const integrity = require(path.join(rootDir, "electron-shell", "model-integrity.cjs"));
    const tempRoot = path.join(rootDir, "tmp_test_runs", "model_integrity_unit");
    const modelLibraryPath = path.join(tempRoot, "uvr_models");
    const vrDir = path.join(modelLibraryPath, "VR");
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.mkdirSync(vrDir, { recursive: true });

    const fileBody = Buffer.from("known local model bytes");
    const goodModelPath = path.join(vrDir, "known_model.onnx");
    fs.writeFileSync(goodModelPath, fileBody);
    const matchingHash = crypto.createHash("sha256").update(fileBody).digest("hex");
    const mismatchedHash = crypto.createHash("sha256").update("other bytes").digest("hex");

    const missingResult = integrity.verifyModelHash(
      { architecture: "VR", name: "missing_model.onnx", checksum: matchingHash },
      modelLibraryPath
    );
    assert(
      missingResult.status === "missing" && missingResult.exists === false,
      "Test 7.1: Missing model file returns missing",
      `Expected missing status, got ${missingResult.status}`
    );

    const noHashResult = integrity.verifyModelHash(
      { architecture: "VR", name: "known_model.onnx" },
      modelLibraryPath
    );
    assert(
      noHashResult.status === "installed_hash_unavailable" && noHashResult.hashChecked === false,
      "Test 7.2: Missing expected hash does not return verified",
      `Expected installed_hash_unavailable, got ${noHashResult.status}`
    );

    const matchingResult = integrity.verifyModelHash(
      { architecture: "VR", name: "known_model.onnx", checksum: matchingHash },
      modelLibraryPath
    );
    assert(
      matchingResult.status === "hash_verified" && matchingResult.hashMatches === true,
      "Test 7.3: Matching hash returns hash_verified",
      `Expected hash_verified, got ${matchingResult.status}`
    );

    const mismatchResult = integrity.verifyModelHash(
      { architecture: "VR", name: "known_model.onnx", checksum: mismatchedHash },
      modelLibraryPath
    );
    assert(
      mismatchResult.status === "hash_mismatch" && mismatchResult.ok === false,
      "Test 7.4: Mismatched hash returns hash_mismatch",
      `Expected hash_mismatch, got ${mismatchResult.status}`
    );

    const sizeMismatchResult = integrity.verifyModelHash(
      {
        architecture: "VR",
        name: "known_model.onnx",
        checksum: matchingHash,
        expected_size_bytes: fileBody.length + 1
      },
      modelLibraryPath
    );
    assert(
      sizeMismatchResult.status === "size_mismatch" && sizeMismatchResult.hashChecked === false,
      "Test 7.5: Size mismatch blocks verification",
      `Expected size_mismatch, got ${sizeMismatchResult.status}`
    );

    const unsafeDeleteResult = integrity.deleteModelFile(
      {
        architecture: "VR",
        name: "package.json",
        local_path: path.join(rootDir, "package.json")
      },
      modelLibraryPath
    );
    assert(
      unsafeDeleteResult.ok === false && unsafeDeleteResult.deletedPaths.length === 0,
      "Test 7.6: Unsafe delete path is rejected",
      "deleteModelFile allowed deletion outside the model library"
    );

    const deleteTarget = path.join(vrDir, "delete_me.pt");
    fs.writeFileSync(deleteTarget, "temporary model bytes");
    const safeDeleteResult = integrity.deleteModelFile(
      { architecture: "VR", name: "delete_me.pt" },
      modelLibraryPath
    );
    assert(
      safeDeleteResult.ok === true && !fs.existsSync(deleteTarget),
      "Test 7.7: Safe model delete removes only resolved model file",
      "deleteModelFile did not remove the approved model file"
    );

    const tempDownloads = path.join(modelLibraryPath, "temp_downloads");
    const verificationCache = path.join(modelLibraryPath, "verification_cache.json");
    fs.mkdirSync(tempDownloads, { recursive: true });
    fs.writeFileSync(path.join(tempDownloads, "partial.tmp"), "partial");
    fs.writeFileSync(verificationCache, "{}");
    const purgeResult = integrity.purgeModelCache(modelLibraryPath);
    assert(
      purgeResult.ok === true &&
        !fs.existsSync(tempDownloads) &&
        !fs.existsSync(verificationCache) &&
        fs.existsSync(goodModelPath),
      "Test 7.8: Cache purge removes only approved cache artifacts",
      "purgeModelCache removed an unexpected path or left approved cache files behind"
    );

    assert(
      noHashResult.status !== "hash_verified" && mismatchResult.status !== "hash_verified",
      "Test 7.9: Unverified models cannot be marked verified",
      "A missing or mismatched hash produced hash_verified"
    );

    const proofModel = {
      architecture: "VR",
      name: "known_model.onnx",
      checksum: matchingHash,
      downloaded: true,
      license: "MIT",
      sourceUrl: "https://example.invalid/known_model.onnx",
      sourceType: "manual_import",
      requiredBackend: "audio-separator"
    };
    const backendProofEligible = integrity.getModelProofEligibility(proofModel, matchingResult);
    const frontendProofEligible = getModelProofEligibility(proofModel as any, {
      exists: true,
      status: "hash_verified",
      hashChecked: true,
      hashMatches: true
    });
    assert(
      backendProofEligible.proofEligible === true &&
        backendProofEligible.reason === "hash_verified" &&
        frontendProofEligible.proofEligible === true &&
        frontendProofEligible.reason === "hash_verified",
      "Test 7.10: Matching verified SHA-256 is proof-eligible in backend and frontend helpers",
      "Matching hash did not produce proof-eligible status"
    );

    const backendMismatchProof = integrity.getModelProofEligibility(proofModel, mismatchResult);
    const frontendMismatchProof = getModelProofEligibility(proofModel as any, {
      exists: true,
      status: "hash_mismatch",
      hashChecked: true,
      hashMatches: false
    });
    assert(
      backendMismatchProof.proofEligible === false &&
        backendMismatchProof.reason === "hash_mismatch" &&
        frontendMismatchProof.reason === "hash_mismatch",
      "Test 7.11: Hash mismatch is never proof-eligible",
      "Hash mismatch did not block proof eligibility"
    );

    const noHashProof = integrity.getModelProofEligibility(
      {
        ...proofModel,
        checksum: undefined,
        sourceType: "hugging_face_repo",
        downloadUrl: "https://example.invalid/known_model.onnx"
      },
      noHashResult
    );
    assert(
      noHashProof.proofEligible === false && noHashProof.reason === "hash_missing",
      "Test 7.12: Installed file without expected hash blocks CPU proof",
      `Expected hash_missing, got ${noHashProof.reason}`
    );

    const brokenSourceProof = getModelProofEligibility({
      ...proofModel,
      verifiedStatus: "broken_link"
    } as any, {
      exists: true,
      status: "hash_verified",
      hashChecked: true,
      hashMatches: true
    });
    assert(
      brokenSourceProof.proofEligible === false && brokenSourceProof.reason === "broken_link",
      "Test 7.13: Broken source metadata blocks proof even when a local hash check is present",
      `Expected broken_link, got ${brokenSourceProof.reason}`
    );
  } catch (err: any) {
    assert(false, "Test 7: Native model integrity helper checks", err.message);
  }

  // Test 8: Browser mode cannot fake native model verification
  try {
    const downloaderPath = path.join(rootDir, "src", "components", "ModelDownloader.tsx");
    const downloaderContent = fs.readFileSync(downloaderPath, "utf8");
    assert(
      downloaderContent.includes("Browser Preview / Not runnable"),
      "Test 8.1: Browser mode exposes not-runnable model verification status",
      "ModelDownloader is missing Browser Preview / Not runnable state"
    );
    assert(
      !downloaderContent.includes("hashMatch: status") && !downloaderContent.includes("hashMatch: item.downloaded"),
      "Test 8.2: Browser mode cannot fake model verification through hashMatch UI state",
      "ModelDownloader still contains legacy hashMatch state"
    );
    assert(
      !downloaderContent.includes("downloaded: true, // Only if backend confirms it") &&
        !downloaderContent.includes('dState.status === "completed"'),
      "Test 8.3: ModelDownloader does not keep legacy fake installed/completed UI states",
      "ModelDownloader still contains legacy downloaded/completed state markers"
    );
    assert(
      downloaderContent.includes("nativeDownloadBridgeReady") &&
        downloaderContent.includes("nativeImportBridgeReady"),
      "Test 8.4: ModelDownloader gates download/import actions through native bridge readiness",
      "ModelDownloader is missing native bridge readiness gates"
    );
    assert(
      !downloaderContent.includes("matching the latest stable remote metadata hashes"),
      "Test 8.5: Empty update state does not claim unverified model freshness",
      "ModelDownloader still claims installed weights match latest remote hashes without verification"
    );
    assert(
      downloaderContent.includes("Proof Gate") &&
        downloaderContent.includes("Imported / Hash unavailable") &&
        downloaderContent.includes("Source returned HTTP 401/404"),
      "Test 8.6: ModelDownloader exposes proof gate and unavailable-source states",
      "ModelDownloader is missing proof gate or unavailable source messaging"
    );
    const classicConsoleContent = fs.readFileSync(path.join(rootDir, "src", "components", "ClassicConsole.tsx"), "utf8");
    assert(
      classicConsoleContent.includes("modelProofEligibility.proofEligible && modelFileStatus === \"hash_verified\"") &&
        classicConsoleContent.includes("model_proof_not_eligible"),
      "Test 8.7: ClassicConsole requires proof-eligible hash verification before AI run",
      "ClassicConsole still lacks strict proof eligibility gating"
    );
    assert(
      !classicConsoleContent.includes("Verified integrity checksum: Valid SHA-256 signature calculated.") &&
        !classicConsoleContent.includes("Model registered as local-available.") &&
        !classicConsoleContent.includes("Weights loaded successfully without restarting interface.") &&
        classicConsoleContent.includes('verification?.status !== "hash_verified"') &&
        classicConsoleContent.includes("Browser Preview / Not runnable for model downloads or SHA-256 verification"),
      "Test 8.8: ClassicConsole quick cache path cannot fake download or verification success",
      "ClassicConsole still contains legacy fake model download/checksum success markers"
    );
  } catch (err: any) {
    assert(false, "Test 8: Browser-mode verification guard checks", err.message);
  }

  // Test 9: Packaged runtime resource wiring
  try {
    const runtimePaths = require(path.join(rootDir, "electron-shell", "runtime-paths.cjs"));
    const yueScriptPath = runtimePaths.resolveScriptFile("yue_probe.py", {
      isPackaged: false,
      appRoot: rootDir,
      resourcesPath: rootDir
    });
    assert(
      runtimePaths.fileExists(yueScriptPath),
      "Test 9.1: Runtime path resolver finds YuE helper script in dev mode",
      `YuE helper script not found at ${yueScriptPath}`
    );

    const tempRoot = path.join(rootDir, "tmp_test_runs", "runtime_paths_unit");
    const packagedResources = path.join(tempRoot, "resources");
    const packagedAppRoot = path.join(tempRoot, "resources", "app.asar");
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.mkdirSync(path.join(packagedResources, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(packagedResources, "scripts", "basic_pitch_probe.py"), "# packaged helper\n");

    const packagedScriptPath = runtimePaths.resolveScriptFile("basic_pitch_probe.py", {
      isPackaged: true,
      appRoot: packagedAppRoot,
      resourcesPath: packagedResources
    });
    assert(
      packagedScriptPath === path.join(packagedResources, "scripts", "basic_pitch_probe.py") &&
        runtimePaths.fileExists(packagedScriptPath),
      "Test 9.2: Runtime path resolver supports packaged resourcesPath script lookup",
      `Packaged helper script resolved incorrectly: ${packagedScriptPath}`
    );

    const missingHelper = runtimePaths.createMissingHelperScriptResult(
      path.join(packagedResources, "scripts", "missing_probe.py")
    );
    assert(
      missingHelper.ok === false &&
        missingHelper.status === "helper_missing" &&
        missingHelper.message === "Required helper script is missing from packaged resources.",
      "Test 9.3: Missing helper script produces helper_missing structured result",
      "Missing helper result did not match required structure"
    );

    const diagnostic = runtimePaths.checkPackagedRuntime({
      isPackaged: false,
      appRoot: rootDir,
      resourcesPath: rootDir
    });
    const diagnosticNames = diagnostic.requiredFiles.map((entry: any) => entry.name);
    assert(
      diagnosticNames.includes("YuE Python probe helper") &&
        diagnosticNames.includes("Basic Pitch Python probe helper"),
      "Test 9.4: Packaged runtime diagnostics list required helper scripts",
      "Packaged diagnostic did not include required Python helper scripts"
    );

    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    const buildConfig = packageJson.build || {};
    const filesConfig = JSON.stringify(buildConfig.files || []);
    const extraResourcesConfig = JSON.stringify(buildConfig.extraResources || []);
    assert(
      extraResourcesConfig.includes("\"from\":\"scripts\"") || extraResourcesConfig.includes('"from":"scripts"'),
      "Test 9.5: electron-builder includes scripts as packaged resources",
      "package.json build.extraResources does not include scripts"
    );
    assert(
      filesConfig.includes("!**/.venv*/**") &&
        filesConfig.includes("!**/uvr_models/**") &&
        filesConfig.includes("!**/models/**") &&
        filesConfig.includes("!**/*.log"),
      "Test 9.6: electron-builder excludes local envs, model caches, and logs",
      "package.json build.files is missing runtime exclusion patterns"
    );

    const mainContent = fs.readFileSync(path.join(rootDir, "electron-shell", "main.cjs"), "utf8");
    const preloadContent = fs.readFileSync(path.join(rootDir, "electron-shell", "preload.cjs"), "utf8");
    assert(
      mainContent.includes("check-packaged-runtime") && preloadContent.includes("checkPackagedRuntime"),
      "Test 9.7: Packaged runtime diagnostic IPC is implemented and exposed",
      "Runtime diagnostic IPC/preload bridge missing"
    );
    assert(
      mainContent.includes("path.basename(fileName) !== fileName") &&
        mainContent.includes("ALLOWED_MODEL_EXTENSIONS.has(ext)") &&
        mainContent.includes("isPathInside(libraryPath, destPath)") &&
        mainContent.includes("Model downloads require an HTTPS source URL."),
      "Test 9.8: Native downloader validates filename, extension, destination, and HTTPS protocol",
      "download-model IPC is missing destination or source hardening"
    );

    const yueProbeContent = fs.readFileSync(path.join(rootDir, "electron-shell", "yue-probe.cjs"), "utf8");
    const basicProbeContent = fs.readFileSync(path.join(rootDir, "electron-shell", "basic-pitch-probe.cjs"), "utf8");
    assert(
      yueProbeContent.includes("resolveScriptFile('yue_probe.py')") &&
        basicProbeContent.includes("resolveScriptFile('basic_pitch_probe.py')"),
      "Test 9.9: YuE and Basic Pitch probes resolve helper scripts through runtime path helper",
      "Probe wrappers still assume project-relative helper script paths"
    );
    assert(
      yueProbeContent.includes("execFileSync(pythonPath") &&
        basicProbeContent.includes("execFileSync(pythonPath") &&
        !yueProbeContent.includes("execSync(") &&
        !basicProbeContent.includes("execSync("),
      "Test 9.10: YuE and Basic Pitch probes avoid shell-string Python execution",
      "YuE or Basic Pitch probe still uses shell-string execSync with user-configurable paths"
    );

    const batchEncoderContent = fs.readFileSync(path.join(rootDir, "src", "components", "BatchEncoder.tsx"), "utf8");
    const sunoContent = fs.readFileSync(path.join(rootDir, "src", "components", "SunoMusicLab.tsx"), "utf8");
    const serverContent = fs.readFileSync(path.join(rootDir, "server.ts"), "utf8");
    assert(
      batchEncoderContent.includes("uvr.checkFFmpegReady") &&
        sunoContent.includes("Packaged file mode detected") &&
        sunoContent.includes("serverRoutesAvailable"),
      "Test 9.11: server.ts packaged mismatch is resolved or explicitly classified",
      "Packaged Electron still relies silently on server.ts HTTP routes"
    );
    assert(
      serverContent.includes('app.listen(PORT, "127.0.0.1"') &&
        serverContent.includes("new URL(String(targetUrl))") &&
        serverContent.includes('["GET", "POST"].includes(requestMethod)') &&
        serverContent.includes('["http:", "https:"].includes(parsedTarget.protocol)'),
      "Test 9.12: Dev server proxy is local-only and validates target URL/method",
      "server.ts proxy can still expose broad network or unsupported proxy behavior"
    );

    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch (err: any) {
    assert(false, "Test 9: Packaged runtime resource wiring", err.message);
  }

  // Test 10: CPU AI separation backend proof helper
  try {
    const aiSeparation = require(path.join(rootDir, "electron-shell", "ai-separation.cjs"));
    const tempRoot = path.join(rootDir, "tmp_test_runs", "ai_separation_unit");
    const modelLibraryPath = path.join(tempRoot, "uvr_models");
    const modelDir = path.join(modelLibraryPath, "VR");
    const outputDir = path.join(tempRoot, "outputs");
    const inputPath = path.join(tempRoot, "input.wav");
    const modelPath = path.join(modelDir, "unit_model.onnx");
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.mkdirSync(modelDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(inputPath, Buffer.from("unit input audio bytes"));
    fs.writeFileSync(modelPath, Buffer.from("unit model bytes"));
    const matchingHash = crypto.createHash("sha256").update("unit model bytes").digest("hex");
    const mismatchedHash = crypto.createHash("sha256").update("different model bytes").digest("hex");

    const readyBackend = {
      pythonFound: true,
      pythonPath: "python",
      pythonVersion: "3.11.0",
      audioSeparatorInstalled: true,
      audioSeparatorCliReady: true,
      audioSeparatorCli: {
        ready: true,
        command: "python",
        argsPrefix: ["-m", "audio_separator.cli"],
        supportsDeviceFlag: false,
        supportsModelFileDir: true,
        supportsOutputFormat: true
      },
      torchInstalled: true,
      torchVersion: "2.5.0+cpu",
      cudaAvailable: false,
      mpsAvailable: false,
      canRunAISeparation: true,
      blockers: []
    };
    const readyFfmpeg = { ready: true, path: "ffmpeg", version: "ffmpeg version unit" };
    const baseRequest = {
      inputs: [inputPath],
      outputFolder: outputDir,
      format: "WAV",
      model: {
        id: "unit_model",
        name: "unit_model.onnx",
        architecture: "VR",
        filePath: modelPath,
        stemType: "vocals",
        gpuSupport: false,
        memoryRisk: "low",
        downloaded: true,
        description: "Unit model",
        fileSize: "16 bytes",
        checksum: matchingHash,
        license: "MIT",
        sourceUrl: "https://example.invalid/unit_model.onnx",
        sourceType: "manual_import",
        requiredBackend: "audio-separator"
      },
      verifiedModelLocalPath: modelPath,
      method: {
        id: "unit_method",
        name: "Unit Method",
        category: "VR Architecture",
        description: "Unit method",
        defaultModelId: "unit_model"
      },
      userSelectedMode: "ai",
      selectedDevice: "cpu",
      parameters: {
        chunks: "512",
        noiseReduction: "0",
        executionDevice: "cpu",
        cpuThreads: 2,
        segmentSize: "256"
      },
      options: {
        ttaActive: false,
        postProcessActive: false,
        vocalsOnly: false,
        instrumentalOnly: false,
        splitMode: false,
        saveAllOutputs: true,
        modelTestMode: false
      },
      timestamp: new Date().toISOString()
    };

    const missingPython = aiSeparation.checkBackendDetails("C:\\missing\\python.exe", {
      runCommand: () => ({ ok: false, exitCode: 1, stdout: "", stderr: "missing", output: "missing", error: "missing" }),
      ffmpeg: readyFfmpeg
    });
    assert(
      missingPython.pythonFound === false && missingPython.blockers.some((b: any) => b.id === "python_missing"),
      "Test 10.1: Python missing returns blocker",
      "Missing Python did not produce python_missing"
    );

    const audioMissing = aiSeparation.checkBackendDetails("python", {
      runCommand: (_cmd: string, args: string[]) => {
        if (args.includes("--version")) return { ok: true, exitCode: 0, stdout: "Python 3.11.0", stderr: "", output: "Python 3.11.0" };
        if (args.join(" ").includes("import audio_separator")) return { ok: false, exitCode: 1, stdout: "", stderr: "No module", output: "No module", error: "No module" };
        return { ok: false, exitCode: 1, stdout: "", stderr: "blocked", output: "blocked", error: "blocked" };
      },
      ffmpeg: readyFfmpeg
    });
    assert(
      audioMissing.audioSeparatorInstalled === false && audioMissing.blockers.some((b: any) => b.id === "audio_separator_missing"),
      "Test 10.2: audio-separator missing returns blocker",
      "Missing audio-separator did not produce audio_separator_missing"
    );

    const torchMissing = aiSeparation.checkBackendDetails("python", {
      runCommand: (_cmd: string, args: string[]) => {
        const joined = args.join(" ");
        if (args.includes("--version")) return { ok: true, exitCode: 0, stdout: "Python 3.11.0", stderr: "", output: "Python 3.11.0" };
        if (joined.includes("import audio_separator")) return { ok: true, exitCode: 0, stdout: "audio_separator import OK", stderr: "", output: "audio_separator import OK" };
        if (joined.includes("--help")) return { ok: true, exitCode: 0, stdout: "usage: audio-separator [audio_files ...] --model_filename MODEL_FILENAME --model_file_dir MODEL_FILE_DIR --output_dir OUTPUT_DIR --output_format OUTPUT_FORMAT", stderr: "", output: "usage: audio-separator" };
        if (joined.includes("import torch")) return { ok: false, exitCode: 1, stdout: "", stderr: "No module named torch", output: "No module named torch", error: "No module named torch" };
        return { ok: false, exitCode: 1, stdout: "", stderr: "unexpected", output: "unexpected", error: "unexpected" };
      },
      ffmpeg: readyFfmpeg
    });
    assert(
      torchMissing.torchInstalled === false && torchMissing.blockers.some((b: any) => b.id === "torch_missing"),
      "Test 10.3: PyTorch missing returns blocker",
      "Missing torch did not produce torch_missing"
    );

    const ffmpegMissing = aiSeparation.checkFFmpegReady({
      runCommand: () => ({ ok: false, exitCode: 1, stdout: "", stderr: "missing", output: "missing", error: "missing" })
    });
    assert(
      ffmpegMissing.ready === false && !!ffmpegMissing.error,
      "Test 10.4: FFmpeg missing returns structured blocker state",
      "Missing FFmpeg did not return ready=false"
    );

    const missingInput = aiSeparation.validateProcessingRequest(
      { ...baseRequest, inputs: [path.join(tempRoot, "missing.wav")] },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg }
    );
    assert(
      missingInput.ok === false && missingInput.blockers.some((b: any) => b.id === "input_missing"),
      "Test 10.5: Missing input returns blocker",
      "Missing input was not blocked"
    );

    const missingOutput = aiSeparation.validateProcessingRequest(
      { ...baseRequest, outputFolder: path.join(tempRoot, "missing_output") },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg }
    );
    assert(
      missingOutput.ok === false && missingOutput.blockers.some((b: any) => b.id === "output_missing"),
      "Test 10.6: Missing output folder returns blocker",
      "Missing output folder was not blocked"
    );

    const missingModel = aiSeparation.validateProcessingRequest(
      { ...baseRequest, verifiedModelLocalPath: path.join(modelDir, "missing.onnx"), model: { ...baseRequest.model, name: "missing.onnx" } },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg }
    );
    assert(
      missingModel.ok === false && missingModel.blockers.some((b: any) => b.id === "model_missing"),
      "Test 10.7: Missing model file returns blocker",
      "Missing model was not blocked"
    );

    const hashMismatch = aiSeparation.validateProcessingRequest(
      { ...baseRequest, model: { ...baseRequest.model, checksum: mismatchedHash } },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg }
    );
    assert(
      hashMismatch.ok === false && hashMismatch.blockers.some((b: any) => b.id === "model_hash_mismatch"),
      "Test 10.8: Hash mismatch blocks run",
      "Hash mismatch was not blocked"
    );

    const hashMissing = aiSeparation.validateProcessingRequest(
      {
        ...baseRequest,
        model: {
          ...baseRequest.model,
          checksum: undefined,
          sourceType: "hugging_face_repo",
          downloadUrl: "https://example.invalid/unit_model.onnx"
        }
      },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg }
    );
    assert(
      hashMissing.ok === false && hashMissing.blockers.some((b: any) => b.id === "model_hash_missing"),
      "Test 10.9: Missing expected model hash blocks CPU proof",
      "Missing expected hash was not blocked"
    );

    const browserMode = aiSeparation.validateProcessingRequest(
      { ...baseRequest, bridgeMode: "browser" },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg }
    );
    assert(
      browserMode.ok === false && browserMode.blockers.some((b: any) => b.id === "browser_mode"),
      "Test 10.10: Browser mode cannot run AI separation",
      "Browser mode was not blocked"
    );

    const beforeOutputs = aiSeparation.snapshotOutputFiles(outputDir);
    const goodStemPath = path.join(outputDir, "input_(Vocals).wav");
    fs.writeFileSync(goodStemPath, Buffer.from("verified output bytes"));
    const verifiedOutputs = aiSeparation.scanVerifiedOutputs(outputDir, beforeOutputs);
    const passProof = aiSeparation.createProofResult({ exitCode: 0, outputFiles: verifiedOutputs, status: "completed" });
    assert(
      passProof.success === true && passProof.proofStatus === "pass",
      "Test 10.11: Exit code 0 with non-empty stems returns proof pass",
      "Non-empty output did not produce proof pass"
    );

    const emptyOutputDir = path.join(tempRoot, "empty_outputs");
    fs.mkdirSync(emptyOutputDir, { recursive: true });
    const beforeEmpty = aiSeparation.snapshotOutputFiles(emptyOutputDir);
    fs.writeFileSync(path.join(emptyOutputDir, "empty.wav"), Buffer.alloc(0));
    const emptyOutputs = aiSeparation.scanVerifiedOutputs(emptyOutputDir, beforeEmpty);
    const failProof = aiSeparation.createProofResult({ exitCode: 0, outputFiles: emptyOutputs, status: "completed" });
    assert(
      failProof.success === false && failProof.proofStatus === "fail",
      "Test 10.12: Exit code 0 with empty/missing outputs returns proof fail",
      "Empty output produced proof pass"
    );

    const noActiveCancel = aiSeparation.requestCancelActiveProcess(null);
    const fakeProcess: any = {
      pid: 12345,
      killed: false,
      kill(signal: string) {
        this.killed = signal === "SIGTERM";
        return true;
      }
    };
    const cancelRequested = aiSeparation.requestCancelActiveProcess(fakeProcess, { platform: "linux" });
    assert(
      noActiveCancel.status === "no_active_process" &&
        cancelRequested.status === "cancel_requested" &&
        fakeProcess.killed === true,
      "Test 10.13: Cancellation returns cancelled/no_active_process correctly",
      "Cancellation result shape was incorrect"
    );

    const invocation = aiSeparation.buildAudioSeparatorInvocation(
      {
        audioSeparatorCli: readyBackend.audioSeparatorCli,
        pythonPath: "python",
        modelPath,
        outputFormat: "wav"
      },
      inputPath,
      outputDir
    );
    assert(
      invocation.args.includes("--model_file_dir") &&
        invocation.args.includes(path.dirname(modelPath)) &&
        !invocation.args.includes("--device"),
      "Test 10.14: CLI invocation uses inspected audio-separator syntax",
      "Invocation did not include model_file_dir or incorrectly forced unsupported --device"
    );

    const proofScriptContent = fs.readFileSync(path.join(rootDir, "electron-shell", "test-ai-e2e.cjs"), "utf8");
    assert(
      proofScriptContent.includes("expected-sha256") &&
        proofScriptContent.includes("Manual CPU proof requires --expected-sha256") &&
        proofScriptContent.includes("A local model with a hash mismatch or missing hash must not be used for proof."),
      "Test 10.15: Manual CPU proof script requires expected SHA-256",
      "test-ai-e2e.cjs does not block unverified manual proof models"
    );

    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch (err: any) {
    assert(false, "Test 10: CPU AI separation backend helper", err.message);
  }

  // Test 11: UI truth-state regression checks after creative polish
  try {
    const basicPitchContent = fs.readFileSync(path.join(rootDir, "src", "components", "BasicPitchMidiLab.tsx"), "utf8");
    const sunoContent = fs.readFileSync(path.join(rootDir, "src", "components", "SunoMusicLab.tsx"), "utf8");
    const globalSettingsContent = fs.readFileSync(path.join(rootDir, "src", "components", "GlobalSettings.tsx"), "utf8");
    const mixerContent = fs.readFileSync(path.join(rootDir, "src", "components", "FourTrackMixer.tsx"), "utf8");
    const classicConsoleContent = fs.readFileSync(path.join(rootDir, "src", "components", "ClassicConsole.tsx"), "utf8");
    const downloaderContent = fs.readFileSync(path.join(rootDir, "src", "components", "ModelDownloader.tsx"), "utf8");
    const legalContent = fs.readFileSync(path.join(rootDir, "src", "components", "LegalAbout.tsx"), "utf8");
    const manualsContent = fs.readFileSync(path.join(rootDir, "src", "data", "submenuManuals.ts"), "utf8");
    const brandingContent = fs.readFileSync(path.join(rootDir, "src", "config", "branding.ts"), "utf8");
    const readmeContent = fs.readFileSync(path.join(rootDir, "README.md"), "utf8");
    const proofCheckContent = fs.readFileSync(path.join(rootDir, "src", "scripts", "check-proof-readiness.ts"), "utf8");

    const combinedTruthContent = [
      basicPitchContent,
      sunoContent,
      globalSettingsContent,
      mixerContent,
      classicConsoleContent,
      downloaderContent,
      legalContent,
      manualsContent,
      brandingContent,
      readmeContent
    ].join("\n");
    const combinedTruthLower = combinedTruthContent.toLowerCase();

    assert(
      basicPitchContent.includes('proofStatus: "DRY_RUN_ONLY"') &&
        basicPitchContent.includes("Browser preflight preview compiled") &&
        !basicPitchContent.includes('proofStatus: "PASS",'),
      "Test 11.1: Basic Pitch browser preview stays dry-run-only and never fake PASS",
      "Basic Pitch browser preview can still report PASS instead of DRY_RUN_ONLY"
    );
    assert(
      basicPitchContent.includes("Browser Preview / Not runnable for local MIDI generation") &&
        basicPitchContent.includes("No local MIDI, WAV, CSV, or NPZ files were written") &&
        basicPitchContent.includes("Basic Pitch requirements checked on this machine. This does not count as UVR separation proof."),
      "Test 11.2: Basic Pitch browser preview cannot claim local files or UVR proof",
      "Basic Pitch is missing no-local-file or not-UVR-proof wording"
    );
    assert(
      sunoContent.includes("Sandbox Preview Mode is active. No local PyTorch preflight or model inference is running.") &&
        sunoContent.includes("No proof report generated") &&
        sunoContent.includes("localFilePath: null") &&
        sunoContent.includes("fileExists: false") &&
        sunoContent.includes("canSendToSeparator: false") &&
        sunoContent.includes("generatedByProof: false") &&
        sunoContent.includes("Generative audio does not count as UVR AI E2E proof"),
      "Test 11.3: YuE/generative sandbox cannot claim proof, inference, or local output files",
      "YuE sandbox/generative UI is missing preview-only, no-proof, or no-local-file guards"
    );
    assert(
      classicConsoleContent.includes("Browser Preview / Not runnable for native AI separation") &&
        downloaderContent.includes("Browser Preview / Not runnable") &&
        basicPitchContent.includes("Browser Preview / Not runnable for local MIDI generation") &&
        legalContent.includes("Actions are preview-only and cannot run native downloads, model verification, or real audio separation."),
      "Test 11.4: Browser mode truth states remain not-runnable and cannot claim native access",
      "Browser-mode UI is missing explicit not-runnable/native-disabled wording"
    );
    assert(
      !combinedTruthContent.includes("Browser Preview Mode: Native backend active") &&
        !combinedTruthContent.includes("Browser Preview Mode: packaged runtime diagnostics passed") &&
        !combinedTruthContent.includes("Browser Preview Mode: local file path verified"),
      "Test 11.5: Browser mode cannot claim native backend, packaged runtime, or verified local paths",
      "Browser preview contains forbidden native/runtime/local-path success wording"
    );
    assert(
      downloaderContent.includes("OpenStem Model Manager & Proof Gate") &&
        downloaderContent.includes("Local Weights") &&
        downloaderContent.includes("Imported / Hash unavailable") &&
        downloaderContent.includes("It remains not proof-eligible until expected SHA-256 metadata is supplied and matched.") &&
        downloaderContent.includes("Source returned HTTP 401/404"),
      "Test 11.6: Model Manager preserves proof gate, local-weight, manual-import, and broken-source truth",
      "Model Manager proof/source wording regressed"
    );

    const brokenOrUnavailableModels = MODEL_REGISTRY.filter(model =>
      model.verifiedStatus === "broken_link" || model.verifiedStatus === "unavailable"
    );
    assert(
      brokenOrUnavailableModels.length >= 24 &&
        brokenOrUnavailableModels.every(model => model.verifiedStatus !== "verified"),
      "Test 11.7: Broken HTTP 401/404 or unavailable model sources remain blocked",
      "A broken/unavailable registry source was treated as verified"
    );

    const ensembleModels = MODEL_REGISTRY.filter(model => model.architecture === "Ensemble");
    const manualImportWithoutHash = getModelProofEligibility(
      {
        architecture: "VR",
        name: "manual_without_hash.pth",
        sourceType: "manual_import",
        downloaded: true,
        license: "MIT"
      } as any,
      { exists: true, status: "installed_hash_unavailable", hashChecked: false }
    );
    assert(
      ensembleModels.length > 0 &&
        ensembleModels.every(model =>
          getModelProofEligibility(model as any, {
            exists: true,
            status: "hash_verified",
            hashChecked: true,
            hashMatches: true
          }).proofEligible === false
        ) &&
        manualImportWithoutHash.proofEligible === false &&
        manualImportWithoutHash.reason === "manual_import_required",
      "Test 11.8: Ensemble presets and manual imports without SHA-256 are never proof-eligible weights",
      "Ensemble preset or manual import without expected SHA-256 became proof-eligible"
    );
    assert(
      mixerContent.includes("No verified stem session loaded") &&
        mixerContent.includes("Preview-only demo stems") &&
        mixerContent.includes("Demo stems are preview-only and cannot be exported") &&
        mixerContent.includes("canExport: false") &&
        mixerContent.includes('proofSource: "demo"'),
      "Test 11.9: Stem Mixer defaults to no verified session and keeps demo stems non-proof",
      "Stem Mixer demo/empty-state proof wording regressed"
    );
    assert(
      globalSettingsContent.includes("cleanup preview only. Native Electron is required to delete temp files.") &&
        globalSettingsContent.includes("failed-download cleanup preview only. Native Electron is required.") &&
        globalSettingsContent.includes("model cache reset preview only. Native Electron is required.") &&
        globalSettingsContent.includes("Legacy reference / Not wired") &&
        globalSettingsContent.includes("Global defaults apply to newly initialized jobs") &&
        !globalSettingsContent.includes("Browser Preview Mode: All simulated process runtime temporary directories wiped clean!") &&
        !globalSettingsContent.includes("Browser Preview Mode: Purged corrupt partial download registers successfully."),
      "Test 11.10: Global Settings browser cleanup and stored/planned settings cannot claim real proof or deletion",
      "Global Settings browser cleanup or stored-setting wording regressed"
    );
    assert(
      brandingContent.includes('RELEASE_STATE = "Hardened Functional Alpha"') &&
        legalContent.includes("Beta Candidate remains blocked until verified local AI E2E stem-separation proof passes.") &&
        readmeContent.includes("`release:check` verifies application tooling, packaging, and registry safety. Passing it does not satisfy AI proof or unblock Beta Candidate status.") &&
        proofCheckContent.includes("RESULT: BLOCKED") &&
        proofCheckContent.includes("Do not run CPU AI proof until a proof-eligible model asset exists.") &&
        manualsContent.includes("FFmpeg utility processing does not count as AI proof."),
      "Test 11.11: Release/proof wording preserves Alpha state, Beta blocker, proof blocker, and FFmpeg non-AI truth",
      "Release/proof wording no longer protects Alpha/Beta/proof/FFmpeg boundaries"
    );
    assert(
      !combinedTruthLower.includes("production ready") &&
        !combinedTruthLower.includes("official release mode") &&
        !/\bcertified\b/i.test(combinedTruthContent) &&
        !combinedTruthLower.includes("perfect separation") &&
        !combinedTruthLower.includes("perfect separations") &&
        !combinedTruthLower.includes("ai proof passed"),
      "Test 11.12: Forbidden release/proof hype wording stays out of UI and docs",
      "Forbidden wording found: production ready, official release mode, certified, perfect separation, or AI proof passed"
    );
  } catch (err: any) {
    assert(false, "Test 11: UI truth-state regression checks", err.message);
  }

  console.log("\n=========================================");
  if (failuresCount === 0) {
    console.log("🏆 ALL REPOSITORY TESTS COMPLETED: 100% SUCCESS!");
    console.log("=========================================\n");
    process.exit(0);
  } else {
    console.error(`😰 TEST RUN FAILED with ${failuresCount} failures.`);
    console.log("=========================================\n");
    process.exit(1);
  }
}

runTests();
