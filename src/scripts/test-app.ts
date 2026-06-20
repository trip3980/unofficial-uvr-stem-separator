import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createRequire } from "module";
import { MODEL_REGISTRY } from "../services/audioEngine";
import { getMixerExportState, getMixerSessionState } from "../components/FourTrackMixer";
import {
  DIAGNOSTIC_CODES,
  getDiagnosticCodeForLegacyBlocker,
  getDiagnosticCodeForProofReason,
  getDiagnosticCodeForSourceStatus,
} from "../services/diagnosticCodes";
import { getModelProofEligibility } from "../services/modelProofEligibility";
import {
  createCustomModelEntryFromMetadata,
  customModelEntryToRegistryEntry,
  getModelCatalogLane,
  getRecommendedModelAction,
  modelRegistryEntryToCustomModelEntry,
  summarizeModelLibrary,
} from "../services/modelLibrary";
import {
  buildSourceDiagnosticResult,
  buildSourceResolutionWorkflow,
  evaluateManualReconnect,
  validateImportedModelMetadata,
} from "../services/modelSourceDiagnostics";
import {
  buildOpenStemModelManifest,
  createEmptyLocalModelIndex,
  deriveLocalModelIndexEntry,
  getDownloadVerifyFlow,
  getOpenStemModelLibraryState,
  getRepairReconnectFlow,
  isInstalledLocalModelStatus,
  validateLocalModelIndexDocument,
  validateLocalModelIndexLocation,
  validateOpenStemModelManifest,
} from "../services/modelManifest";
import {
  getHardwareFitBadgeLabel,
  getModelCompatibilityGate,
  getModelHardwareFit,
} from "../services/modelCompatibility";
import {
  evaluateGoldenProofModel,
  GoldenProofModelManifest,
  validateGoldenProofModelManifest,
} from "../services/proofModel";
import {
  buildSyntheticProofInputFfmpegArgs,
  getDefaultProofInputPath,
  getDefaultProofOutputPath,
} from "../services/proofInput";
import { validateModelEntry } from "../services/registryValidator";
import {
  DEFAULT_TRANSCRIPTION_FILENAME_TEMPLATE,
  TRANSCRIPT_DOCX_EXPORT_TEMPLATE,
  TRANSCRIPT_JSON_EXPORT_TEMPLATE,
  TRANSCRIPT_PDF_EXPORT_TEMPLATE,
  TRANSCRIPT_TXT_EXPORT_TEMPLATE,
  VTT_ARCHIVE_FILENAME_TEMPLATE,
  buildTranscriptionFilenamePreview,
} from "../services/transcriptionFilenamePolicy";
import {
  TRANSCRIPTION_BULK_ACTIONS,
  TRANSCRIPTION_DASHBOARD_FOLDERS,
  TRANSCRIPTION_LANGUAGE_OPTIONS,
  TRANSCRIPTION_MODE_PRESETS,
  WHISPER_MODEL_OPTIONS,
  transcriptionDoesNotAffectReleaseGate,
} from "../services/transcriptionPolicy";
import {
  RECORDING_QUALITY_PRESETS,
  SYNTHETIC_VTT_FIXTURE,
  TRANSCRIPTION_INTAKE_DIAGNOSTIC_CODES,
  TRANSCRIPTION_INTAKE_FOLDER_POLICY,
  TRANSCRIPT_ARCHIVE_EXPORT_POLICY,
  applySpeakerRenameMap,
  buildSpeakerRenameMap,
  buildTranscriptArchiveExportPlan,
  parseVttTranscriptContent,
  segmentsToCleanTranscript,
  segmentsToJsonArchive,
  segmentsToRenamedVttContent,
  verifyTranscriptExportResult,
  vttWorkflowDoesNotAffectReleaseGate,
} from "../services/vttTranscriptImport";
import {
  DEFAULT_TRANSCRIPTION_AUTOMATION_MODE,
  DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS,
  DEFAULT_TRANSCRIPTION_OVERWRITE_POLICY,
  TRANSCRIPTION_AUTOMATION_DIAGNOSTIC_CODES,
  TRANSCRIPTION_AUTOMATION_FOLDER_POLICY,
  TRANSCRIPTION_AUTOMATION_MODES,
  TRANSCRIPTION_OVERWRITE_POLICY_OPTIONS,
  TRANSCRIPTION_WORKFLOW_STAGE_ORDER,
  buildImportedAudioAutomationWorkflowPlan,
  buildPostProcessingEditorState,
  buildRecordingAutomationWorkflowPlan,
  buildVttAutomationWorkflowPlan,
  evaluateOverwritePolicy,
  transcriptionAutomationDoesNotAffectReleaseGate,
} from "../services/transcriptionAutomationWorkflow";
import {
  CHECKPOINT_AUTOMATION_CONTROLS,
  CHECKPOINT_AUTOMATION_PRESETS,
  CHECKPOINT_FILE_VERIFICATION_POLICY,
  CHECKPOINT_FILE_WRITING_STAGE_IDS,
  CHECKPOINT_START_FROM_SOURCE_OPTIONS,
  CHECKPOINT_WORKFLOW_DIAGNOSTIC_CODES,
  CHECKPOINT_WORKFLOW_STAGE_ORDER,
  DEFAULT_CHECKPOINT_STOP_STAGE_ID,
  buildCheckpointWorkflowPlan,
  checkpointAutomationDoesNotAffectReleaseGate,
  getCheckpointResumeSummary,
} from "../services/transcriptionWorkflowPipeline";
import {
  DEFAULT_CLINICAL_PROMPT_TEMPLATE,
  buildPendingClinicalSectionResults,
  clinicalWorkflowDoesNotAffectReleaseGate,
  getClinicalDraftDisclaimer,
  getDefaultClinicalWorkflowReadiness,
} from "../services/clinicalPromptWorkflow";
import {
  CLINICAL_PRIVACY_LANGUAGE,
  canSendPhiToCloud,
  sanitizeClinicalLogEvent,
  shouldStoreTranscriptText,
} from "../services/clinicalPrivacyPolicy";
import {
  CLINICAL_DRAFT_QUALITY_CHECKS,
  CLINICAL_LOCAL_MODEL_CATALOG,
  CLINICAL_LOCAL_MODEL_PROVIDER_STRATEGY,
  CLINICAL_PROMPT_PROOF_TESTS,
  CLINICAL_SYNTHETIC_NON_PHI_TRANSCRIPT,
  REJECTED_CLINICAL_MODEL_CANDIDATES,
  clinicalLocalModelDoesNotAffectReleaseGate,
  evaluateClinicalDraftOutput,
  getClinicalModelsByTier,
  getClinicalPromptTestReadiness,
  getDefaultClinicalLocalModel,
} from "../services/localClinicalModelPolicy";
import {
  DEEP_TRANSCRIPT_PRIVACY_POLICY,
  TRANSCRIPT_WORKFLOW_MODES,
  buildPreviewContextMap,
  deepTranscriptWorkflowDoesNotAffectReleaseGate,
  getRecommendedTranscriptWorkflowMode,
} from "../services/deepTranscriptComprehension";
import { buildSubQuestionPlans, subQuestionPlannerDoesNotExposeChainOfThought } from "../services/subQuestionPlanner";
import { buildTranscriptEvidenceIndex, retrieveEvidenceForPlan } from "../services/transcriptEvidenceIndex";
import {
  assemblePlainTextOutput,
  buildDraftSectionAnswer,
  evaluateTranscriptSectionAnswer,
  getTranscriptAnswerSynthesisPolicy,
} from "../services/transcriptAnswerSynthesis";
import {
  DEFAULT_PROMPT_LIBRARY_TEMPLATES,
  PROMPT_LIBRARY_AUTOSAVE_POLICY,
  PROMPT_LIBRARY_RUN_POLICY,
  PROMPT_LIBRARY_STORAGE_POLICY,
  addPromptLibrarySection,
  createPromptLibraryDocument,
  duplicatePromptLibraryTemplate,
  ensureEditablePromptLibraryTemplate,
  exportPromptLibraryDocument,
  getUserPromptLibraryTemplates,
  importPromptLibraryTemplates,
  renamePromptLibraryTemplate,
  togglePromptLibrarySection,
  promptLibraryDoesNotAffectReleaseGate,
  validatePromptLibraryImport,
} from "../services/promptLibrary";
import {
  DOCUMENT_FORMAT_DEPENDENCY_RECOMMENDATIONS,
  DOCUMENT_FORMAT_DIAGNOSTIC_CODES,
  DOCUMENT_FORMAT_REFERENCE_STRATEGY,
  DOCUMENT_IMPORT_FORMAT_POLICIES,
  DOCUMENT_OUTPUT_FORMAT_POLICIES,
  documentFormatsDoNotAffectReleaseGate,
} from "../services/documentFormatPolicy";
import {
  DOCUMENT_IMPORT_RULES,
  buildDocumentImportPlan,
  documentImportDoesNotAffectReleaseGate,
  validateDocumentImportSchema,
} from "../services/documentImportPolicy";
import {
  DOCUMENT_EXPORT_FILENAME_TEMPLATES,
  DOCUMENT_EXPORT_RULES,
  DOCUMENT_OFFICE_CONVERTER_DIAGNOSTIC_CODES,
  applySpeakerRenameToDocumentText,
  buildDocumentExportPlan,
  buildExternalOfficeConverterPlan,
  documentExportDoesNotAffectReleaseGate,
  verifyDocumentExportOutput,
} from "../services/documentExportPolicy";
import {
  WORKFLOW_FILE_WRITING_STAGE_IDS,
  WORKFLOW_RECOVERY_ACTIONS,
  WORKFLOW_RUN_PRESETS,
  WORKFLOW_RUN_SIMPLE_STATUS_LABELS,
  applyWorkflowEdit,
  clearFailedStageAndRetry,
  createWorkflowArtifactRecord,
  createWorkflowRunRecord,
  evaluateWorkflowOverwritePolicy,
  failWorkflowStage,
  getWorkflowStatusSummary,
  requireArtifactVerificationForStage,
  rerunWorkflowStage,
  resumeWorkflowRun,
  verifyWorkflowArtifact,
  workflowRunLedgerDoesNotAffectReleaseGate,
} from "../services/workflowRunLedger";
import {
  MASTERING_FILENAME_TEMPLATE,
  MASTERING_MODES,
  WEB_AUDIO_MASTERING_REFERENCE,
  buildMasteringFilename,
  createMasteringHistoryRecord,
  evaluateMasteringReadiness,
  getDefaultMasteringSettings,
  getUnmeasuredMasteringReport,
  masteringDoesNotAffectReleaseGate,
  sanitizeMasteringFilenameToken,
  verifyMasteringOutput,
} from "../services/masteringWorkflow";
import {
  AUDIO_EFFECT_CHAINS,
  AUDIO_FORMAT_SUPPORT_MATRIX,
  AUDACITY_REFERENCE_WORKFLOW_POLICY,
  audioEffectChainsDoNotAffectReleaseGate,
  buildAudioEffectChainRunPlan,
  evaluateAudioEffectChainReadiness,
} from "../services/audioEffectChainPolicy";
import {
  BATCH_MASTERING_POLICY,
  CLOUD_MASTERING_POLICY,
  MASTERING_ANALYSIS_POLICY,
  MASTERING_CHAIN_POLICIES,
  MASTERING_EXPORT_POLICIES,
  MASTERING_GOALS,
  REFERENCE_MATCH_POLICY,
  buildMasteringChainRunPlan,
  evaluateMasteringChainReadiness,
  masteringChainDoesNotAffectReleaseGate,
} from "../services/masteringChainPolicy";
import {
  VOICEBOX_API_MCP_POLICY,
  VOICEBOX_CAPTURE_ACTIONS,
  VOICEBOX_CAPTURE_LEDGER_FIELDS,
  VOICEBOX_LOCAL_LLM_REFINEMENT_MODES,
  VOICEBOX_MIC_DICTATION_POLICY,
  VOICEBOX_PEDALBOARD_REVIEW,
  VOICEBOX_POST_PROCESSING_PRESETS,
  VOICEBOX_PROFILE_PRESET_TYPES,
  VOICEBOX_QUEUE_DIAGNOSTIC_CODES,
  VOICEBOX_QUEUE_TARGETS,
  VOICEBOX_REFERENCE_POLICY,
  VOICEBOX_STT_MODEL_LADDER,
  VOICEBOX_TAURI_ELECTRON_LESSONS,
  voiceboxReferenceDoesNotAffectReleaseGate,
} from "../services/voiceboxReferenceWorkflow";
import { getOpenStemUpdateReadinessSummary, UPDATE_READINESS_LANES } from "../services/updatePolicy";
import { classifySourceStatus } from "./audit-registry-sources";
import {
  classifyProofModelCandidate,
  getApprovedProofModelSearchRoots,
  SUPPORTED_PROOF_MODEL_EXTENSIONS,
} from "./audit-proof-model-candidates";

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
      "Branding constant does not declare 'OpenStem'",
    );
    assert(
      !brandingContent.includes("Official Release Mode"),
      "Test 1.2: src/config/branding.ts does not contain 'Official Release Mode'",
      "Forbidden string 'Official Release Mode' found",
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
      "README is missing independent disclaimer or status",
    );
    assert(
      readmeContent.includes("Ultimate Vocal Remover") || readmeContent.includes("UVR"),
      "Test 2.2: README provides origin attribution",
      "README does not mention the upstream Ultimate Vocal Remover",
    );
    assert(
      !readmeContent.includes("Official Release Mode") && !readmeContent.includes("UVR 6"),
      "Test 2.3: README does not declare forbidden official continuations",
      "Forbidden official release patterns found in README",
    );
    assert(
      readmeContent.includes("CPU AI proof has completed for one local proof lane only.") &&
        readmeContent.includes("This proves only that one model/backend/device/input/output vertical slice.") &&
        readmeContent.includes(
          "A local model with a hash mismatch must not be used for proof, release claims, or verified status.",
        ) &&
        readmeContent.includes("`auth_required`: source returned HTTP 401") &&
        readmeContent.includes("`network_unavailable`: no HTTP response was received") &&
        readmeContent.includes("`broken_link`: source returned HTTP 404 / Not Found.") &&
        readmeContent.includes("Manual metadata JSON import rejects malformed hashes and missing licenses.") &&
        readmeContent.includes("## Model Library Philosophy") &&
        readmeContent.includes("Curated OpenStem Catalog") &&
        readmeContent.includes("User Custom Model Library") &&
        readmeContent.includes("GPT4All and Ollama") &&
        readmeContent.includes("openstem-models.local.json") &&
        readmeContent.includes("OpenStem separates model compatibility from hardware fit.") &&
        readmeContent.includes("Hardware estimates are guidance, not proof.") &&
        readmeContent.includes("## Golden CPU Proof Model Lane") &&
        readmeContent.includes("This proves only that one model/backend/device/input/output vertical slice.") &&
        readmeContent.includes("docs/proof-model.example.json") &&
        readmeContent.includes("Custom / Hash unavailable") &&
        readmeContent.includes("verified_local") &&
        readmeContent.includes(
          "OpenStem does not bypass authentication, private repositories, gated models, license restrictions, or source-integrity checks.",
        ),
      "Test 2.4: README documents verified model proof blockers",
      "README is missing exact verified model blocker language",
    );
  } catch (err: any) {
    assert(false, "Test 2: README disclaimers and attribution", err.message);
  }

  // Test 2a: Model curation audit documents UVR5-style comparison and two-lane model library
  try {
    const modelCurationAuditPath = path.join(rootDir, "docs", "MODEL_CURATION_AUDIT.md");
    const modelCurationAuditContent = fs.readFileSync(modelCurationAuditPath, "utf8");
    assert(
      modelCurationAuditContent.includes("Classic UVR5 Model Workflow Comparison") &&
        modelCurationAuditContent.includes("Lane 1 - Curated OpenStem Catalog") &&
        modelCurationAuditContent.includes("Lane 2 - User Custom Model Library") &&
        modelCurationAuditContent.includes("The issue is not that React, Electron, or TypeScript are bad.") &&
        modelCurationAuditContent.includes(
          "No curated or custom model can become proof eligible from filename match alone.",
        ),
      "Test 2a.1: Model curation audit captures UVR5 comparison and strict custom proof rules",
      "docs/MODEL_CURATION_AUDIT.md is missing the required curation audit language",
    );
  } catch (err: any) {
    assert(false, "Test 2a: Model curation audit document", err.message);
  }

  // Test 2b: Model library manifest design documents GPT4All/Ollama-style adaptation
  try {
    const modelLibraryManifestPath = path.join(rootDir, "docs", "MODEL_LIBRARY_MANIFEST.md");
    const modelLibraryManifestContent = fs.readFileSync(modelLibraryManifestPath, "utf8");
    assert(
      modelLibraryManifestContent.includes("## Current Model-System Audit") &&
        modelLibraryManifestContent.includes("## Manifest Format") &&
        modelLibraryManifestContent.includes("openstem-models.local.json") &&
        modelLibraryManifestContent.includes("Download complete means verification pending, not hash verified.") &&
        modelLibraryManifestContent.includes("## Compatibility And Hardware Fit Gate") &&
        modelLibraryManifestContent.includes("A model can be valid but too demanding") &&
        modelLibraryManifestContent.includes("Hardware estimates are static guidance") &&
        modelLibraryManifestContent.includes("## Model Library Pattern Comparison") &&
        modelLibraryManifestContent.includes("GPT4All-style pattern") &&
        modelLibraryManifestContent.includes("Ollama-style pattern") &&
        modelLibraryManifestContent.includes("## GPT4All Reference Adaptation") &&
        modelLibraryManifestContent.includes("The installer should not contain unverified separator model weights.") &&
        modelLibraryManifestContent.includes(
          "Legacy MD5-style catalog hashes are not acceptable for OpenStem proof.",
        ) &&
        modelLibraryManifestContent.includes("OpenStem must be stricter because model verification controls AI proof"),
      "Test 2b.1: Model library manifest doc captures GPT4All/Ollama comparison and strict proof rules",
      "docs/MODEL_LIBRARY_MANIFEST.md is missing manifest, local index, or comparison language",
    );
  } catch (err: any) {
    assert(false, "Test 2b: Model library manifest document", err.message);
  }

  // Test 2c: GPT4All reference audit is docs-only and cannot become OpenStem model metadata
  try {
    const gpt4AllAuditPath = path.join(rootDir, "docs", "GPT4ALL_REFERENCE_AUDIT.md");
    const gpt4AllAuditContent = fs.readFileSync(gpt4AllAuditPath, "utf8");
    const modelLibraryManifestContent = fs.readFileSync(
      path.join(rootDir, "docs", "MODEL_LIBRARY_MANIFEST.md"),
      "utf8",
    );
    const proofChecklistContent = fs.readFileSync(path.join(rootDir, "docs", "PROOF_ASSET_CHECKLIST.md"), "utf8");
    const modelDownloaderContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "ModelDownloader.tsx"),
      "utf8",
    );
    const classicConsoleContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "ClassicConsole.tsx"),
      "utf8",
    );
    const registryHasLlmReference = MODEL_REGISTRY.some((model) =>
      /gpt4all|llama|deepseek|qwen|gguf/i.test(
        `${model.id} ${model.name} ${model.sourceUrl || ""} ${model.downloadUrl || ""}`,
      ),
    );
    assert(
      gpt4AllAuditContent.includes("Reference commit inspected: `b666d16db5aeab8b91aaf7963adcee9c643734d7`") &&
        gpt4AllAuditContent.includes("What GPT4All Does Well") &&
        gpt4AllAuditContent.includes("How GPT4All Makes Many Models Feel Built Into One App") &&
        gpt4AllAuditContent.includes("The app contains the GUI and runtime, not all model weights.") &&
        gpt4AllAuditContent.includes(
          "OpenStem should copy this pattern for audio models, but with stricter SHA-256 proof gates.",
        ) &&
        gpt4AllAuditContent.includes("Security, Vulnerability, and Remote Update Lessons from GPT4All") &&
        gpt4AllAuditContent.includes("No updater package was added in this audit. That is intentional.") &&
        gpt4AllAuditContent.includes("OpenStem should not copy disabled TLS verification behavior.") &&
        gpt4AllAuditContent.includes("Passing a model catalog update is not model proof.") &&
        gpt4AllAuditContent.includes("What Should Not Be Adapted") &&
        gpt4AllAuditContent.includes("GPT4All LLM model entries") &&
        modelLibraryManifestContent.includes("GPT4All Reference Adaptation") &&
        proofChecklistContent.includes(
          "GPT4All-style model library UX is acceptable only as a model-management pattern",
        ) &&
        !registryHasLlmReference &&
        !modelDownloaderContent.includes("GPT4All") &&
        !classicConsoleContent.includes("GPT4All"),
      "Test 2c.1: GPT4All reference audit is docs-only and LLM metadata stays out of OpenStem runtime UI",
      "GPT4All audit is missing required comparison language or GPT4All/LLM metadata leaked into runtime UI/registry",
    );
  } catch (err: any) {
    assert(false, "Test 2c: GPT4All reference audit document", err.message);
  }

  // Test 3: THIRD_PARTY_NOTICES.md exists and contains the requested items in proper format
  try {
    const noticesPath = path.join(rootDir, "THIRD_PARTY_NOTICES.md");
    const noticesContent = fs.readFileSync(noticesPath, "utf8");
    assert(fs.existsSync(noticesPath), "Test 3.1: THIRD_PARTY_NOTICES.md exists on disk", "Notice file not found");
    assert(
      noticesContent.includes("audio-separator") && noticesContent.includes("Ultimate Vocal Remover"),
      "Test 3.2: THIRD_PARTY_NOTICES.md references core dependencies",
      "Upstream projects are not mentioned",
    );
    assert(
      noticesContent.includes("MIT") || noticesContent.includes("License"),
      "Test 3.3: THIRD_PARTY_NOTICES.md lists licenses",
      "License attribution column or table missing",
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
      checksum: "invalid_short_hash", // Fail: malformed hash length
    };

    const errors = validateModelEntry(malformedEntry);
    assert(
      errors.length > 0,
      "Test 4.1: Registry validator correctly flags malformed model templates",
      "Validator did not flag a duplicate fake url, missing license, missing name, or malformed checksum",
    );
    assert(
      errors.some((e) => e.includes("license")),
      "Test 4.2: Validator flags missing license metadata",
      "No license error raised",
    );
    assert(
      errors.some((e) => e.includes("checksum") || e.includes("verified")),
      "Test 4.3: Validator blocks fake verified statuses with missing/invalid hashes",
      "Did not block fake verified status",
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
      "ModelDownloader has no Needs Verification representation",
    );
    assert(
      downloaderContent.includes('verifiedStatus !== "verified"') ||
        downloaderContent.includes('verifiedStatus === "verified"'),
      "Test 5.2: ModelDownloader filters actions strictly by active verifiedStatus",
      "Download button is not conditioned on verifiedStatus",
    );
    const authRequiredKnownSources = [
      "vr_5_hp_karaoke",
      "vr_8_hp2_vocal",
      "github_release_mdxc",
      "hf_space_demucs_mmi",
    ];
    assert(
      authRequiredKnownSources
        .filter((id) => id !== "github_release_mdxc")
        .every((id) => MODEL_REGISTRY.find((model) => model.id === id)?.verifiedStatus === "auth_required") &&
        MODEL_REGISTRY.find((model) => model.id === "github_release_mdxc")?.verifiedStatus === "broken_link" &&
        MODEL_REGISTRY.find((model) => model.id === "github_raw_demucs_config")?.verifiedStatus === "broken_link",
      "Test 5.3: Known HTTP 401 sources are auth_required and HTTP 404 sources remain broken_link",
      "A known HTTP 401 or HTTP 404 registry source was misclassified",
    );
    assert(
      classifySourceStatus(401, true) === "auth_required" &&
        classifySourceStatus(403, true) === "access_denied" &&
        classifySourceStatus(404, true) === "broken_link" &&
        classifySourceStatus(429, true) === "rate_limited" &&
        classifySourceStatus(undefined, true, "network error") === "network_unavailable" &&
        classifySourceStatus(undefined, true, "getaddrinfo ENOTFOUND huggingface.co") === "dns_failed" &&
        classifySourceStatus(undefined, true, "timeout after 15000ms") === "timeout" &&
        classifySourceStatus(503, true) === "source_unavailable" &&
        classifySourceStatus(200, false) === "missing_hash" &&
        classifySourceStatus(206, true) === "reachable",
      "Test 5.3a: HTTP source audit statuses preserve network/DNS/timeout/401/403/404/429 classification",
      "HTTP status classifier collapsed distinct source states",
    );
    const noInternetDiagnostic = buildSourceDiagnosticResult({
      url: "https://huggingface.co/example/model.bin",
      error: "network error",
      hasExpectedHash: true,
    });
    const authDiagnostic = buildSourceDiagnosticResult({
      url: "https://huggingface.co/example/model.bin",
      statusCode: 401,
      hasExpectedHash: true,
    });
    const missingHashDiagnostic = buildSourceDiagnosticResult({
      url: "https://huggingface.co/example/model.bin",
      statusCode: 200,
      hasExpectedHash: false,
    });
    assert(
      noInternetDiagnostic.sourceStatus === "network_unavailable" &&
        noInternetDiagnostic.reachable === false &&
        noInternetDiagnostic.diagnosticCode === "MODEL_SOURCE_UNAVAILABLE" &&
        authDiagnostic.sourceStatus === "auth_required" &&
        authDiagnostic.requiresAuth === true &&
        authDiagnostic.diagnosticCode === "MODEL_SOURCE_AUTH_REQUIRED" &&
        missingHashDiagnostic.sourceStatus === "missing_hash" &&
        missingHashDiagnostic.reachable === true &&
        missingHashDiagnostic.downloadableWithoutAuth === false &&
        missingHashDiagnostic.diagnosticCode === "MODEL_METADATA_MISSING_HASH",
      "Test 5.3b: Source diagnostics distinguish no-network, auth-required, and missing-hash states",
      "Source diagnostic result fields collapsed connectivity, auth, or hash states",
    );
    assert(
      DIAGNOSTIC_CODES.PROOF_MODEL_MISSING.severity === "blocker" &&
        DIAGNOSTIC_CODES.PROOF_BETA_BLOCKED.proofImpact === "blocks_beta" &&
        getDiagnosticCodeForProofReason("missing_file") === "PROOF_MODEL_MISSING" &&
        getDiagnosticCodeForProofReason("hash_mismatch") === "MODEL_LOCAL_HASH_MISMATCH" &&
        getDiagnosticCodeForSourceStatus("auth_required") === "MODEL_SOURCE_AUTH_REQUIRED" &&
        getDiagnosticCodeForSourceStatus("broken_link") === "MODEL_SOURCE_BROKEN_LINK" &&
        getDiagnosticCodeForLegacyBlocker("browser_preview_mode") === "RUNTIME_BROWSER_PREVIEW_ONLY" &&
        getDiagnosticCodeForLegacyBlocker("ffmpeg_fallback_blocked") === "PROOF_FFMPEG_FALLBACK_NON_AI",
      "Test 5.3c: Shared diagnostic catalog maps proof, source, browser, and FFmpeg blockers",
      "Diagnostic code catalog is missing a required blocker mapping",
    );
    assert(
      MODEL_REGISTRY.filter((model) => !!model.downloadUrl && model.architecture !== "Ensemble").every(
        (model) => model.verifiedStatus !== "verified",
      ),
      "Test 5.4: Current direct-download model sources are not fake-verified",
      "A current direct-download model source is marked verified without a verified reachable source audit",
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
      "FFmpeg description lacks honest non-AI static DSP labeling",
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
      modelLibraryPath,
    );
    assert(
      missingResult.status === "missing" && missingResult.exists === false,
      "Test 7.1: Missing model file returns missing",
      `Expected missing status, got ${missingResult.status}`,
    );

    const noHashResult = integrity.verifyModelHash({ architecture: "VR", name: "known_model.onnx" }, modelLibraryPath);
    assert(
      noHashResult.status === "installed_hash_unavailable" && noHashResult.hashChecked === false,
      "Test 7.2: Missing expected hash does not return verified",
      `Expected installed_hash_unavailable, got ${noHashResult.status}`,
    );

    const matchingResult = integrity.verifyModelHash(
      { architecture: "VR", name: "known_model.onnx", checksum: matchingHash },
      modelLibraryPath,
    );
    assert(
      matchingResult.status === "hash_verified" && matchingResult.hashMatches === true,
      "Test 7.3: Matching hash returns hash_verified",
      `Expected hash_verified, got ${matchingResult.status}`,
    );

    const mismatchResult = integrity.verifyModelHash(
      { architecture: "VR", name: "known_model.onnx", checksum: mismatchedHash },
      modelLibraryPath,
    );
    assert(
      mismatchResult.status === "hash_mismatch" && mismatchResult.ok === false,
      "Test 7.4: Mismatched hash returns hash_mismatch",
      `Expected hash_mismatch, got ${mismatchResult.status}`,
    );

    const sizeMismatchResult = integrity.verifyModelHash(
      {
        architecture: "VR",
        name: "known_model.onnx",
        checksum: matchingHash,
        expected_size_bytes: fileBody.length + 1,
      },
      modelLibraryPath,
    );
    assert(
      sizeMismatchResult.status === "size_mismatch" && sizeMismatchResult.hashChecked === false,
      "Test 7.5: Size mismatch blocks verification",
      `Expected size_mismatch, got ${sizeMismatchResult.status}`,
    );

    const unsafeDeleteResult = integrity.deleteModelFile(
      {
        architecture: "VR",
        name: "package.json",
        local_path: path.join(rootDir, "package.json"),
      },
      modelLibraryPath,
    );
    assert(
      unsafeDeleteResult.ok === false && unsafeDeleteResult.deletedPaths.length === 0,
      "Test 7.6: Unsafe delete path is rejected",
      "deleteModelFile allowed deletion outside the model library",
    );

    const deleteTarget = path.join(vrDir, "delete_me.pt");
    fs.writeFileSync(deleteTarget, "temporary model bytes");
    const safeDeleteResult = integrity.deleteModelFile({ architecture: "VR", name: "delete_me.pt" }, modelLibraryPath);
    assert(
      safeDeleteResult.ok === true && !fs.existsSync(deleteTarget),
      "Test 7.7: Safe model delete removes only resolved model file",
      "deleteModelFile did not remove the approved model file",
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
      "purgeModelCache removed an unexpected path or left approved cache files behind",
    );

    assert(
      noHashResult.status !== "hash_verified" && mismatchResult.status !== "hash_verified",
      "Test 7.9: Unverified models cannot be marked verified",
      "A missing or mismatched hash produced hash_verified",
    );

    const proofModel = {
      architecture: "VR",
      name: "known_model.onnx",
      checksum: matchingHash,
      downloaded: true,
      license: "MIT",
      sourceUrl: "https://example.invalid/known_model.onnx",
      sourceType: "manual_import",
      requiredBackend: "audio-separator",
    };
    const backendProofEligible = integrity.getModelProofEligibility(proofModel, matchingResult);
    const frontendProofEligible = getModelProofEligibility(proofModel as any, {
      exists: true,
      status: "hash_verified",
      hashChecked: true,
      hashMatches: true,
    });
    assert(
      backendProofEligible.proofEligible === true &&
        backendProofEligible.reason === "hash_verified" &&
        frontendProofEligible.proofEligible === true &&
        frontendProofEligible.reason === "hash_verified",
      "Test 7.10: Matching verified SHA-256 is proof-eligible in backend and frontend helpers",
      "Matching hash did not produce proof-eligible status",
    );

    const backendMismatchProof = integrity.getModelProofEligibility(proofModel, mismatchResult);
    const frontendMismatchProof = getModelProofEligibility(proofModel as any, {
      exists: true,
      status: "hash_mismatch",
      hashChecked: true,
      hashMatches: false,
    });
    assert(
      backendMismatchProof.proofEligible === false &&
        backendMismatchProof.reason === "hash_mismatch" &&
        frontendMismatchProof.reason === "hash_mismatch",
      "Test 7.11: Hash mismatch is never proof-eligible",
      "Hash mismatch did not block proof eligibility",
    );

    const noHashProof = integrity.getModelProofEligibility(
      {
        ...proofModel,
        checksum: undefined,
        sourceType: "hugging_face_repo",
        downloadUrl: "https://example.invalid/known_model.onnx",
      },
      noHashResult,
    );
    assert(
      noHashProof.proofEligible === false && noHashProof.reason === "hash_missing",
      "Test 7.12: Installed file without expected hash blocks CPU proof",
      `Expected hash_missing, got ${noHashProof.reason}`,
    );
    assert(
      noHashProof.diagnosticCode === "PROOF_MODEL_HASH_MISSING",
      "Test 7.12a: Missing expected model hash uses PROOF_MODEL_HASH_MISSING",
      `Expected PROOF_MODEL_HASH_MISSING, got ${noHashProof.diagnosticCode}`,
    );

    const brokenSourceProof = getModelProofEligibility(
      {
        ...proofModel,
        verifiedStatus: "broken_link",
      } as any,
      {
        exists: true,
        status: "installed_not_checked",
        hashChecked: false,
        hashMatches: false,
      },
    );
    assert(
      brokenSourceProof.proofEligible === false &&
        brokenSourceProof.reason === "broken_link" &&
        brokenSourceProof.diagnosticCode === "MODEL_SOURCE_BROKEN_LINK",
      "Test 7.13: Broken source metadata blocks proof before local hash verification",
      `Expected broken_link, got ${brokenSourceProof.reason}`,
    );
    const authRequiredProof = getModelProofEligibility(
      {
        ...proofModel,
        verifiedStatus: "auth_required",
      } as any,
      {
        exists: true,
        status: "installed_not_checked",
        hashChecked: false,
        hashMatches: false,
      },
    );
    assert(
      authRequiredProof.proofEligible === false &&
        authRequiredProof.reason === "auth_required" &&
        authRequiredProof.diagnosticCode === "MODEL_SOURCE_AUTH_REQUIRED",
      "Test 7.14: HTTP 401 auth-required source metadata blocks proof before local hash verification",
      `Expected auth_required, got ${authRequiredProof.reason}`,
    );

    const authRecoveredProof = getModelProofEligibility(
      {
        ...proofModel,
        verifiedStatus: "auth_required",
      } as any,
      {
        exists: true,
        status: "hash_verified",
        hashChecked: true,
        hashMatches: true,
      },
    );
    assert(
      authRecoveredProof.proofEligible === true && authRecoveredProof.reason === "hash_verified",
      "Test 7.14a: Auth-required remote source can be locally recovered only after matching SHA-256",
      `Expected hash_verified, got ${authRecoveredProof.reason}`,
    );

    const sourceBlockedStatuses = [
      "network_unavailable",
      "dns_failed",
      "timeout",
      "missing_hash",
      "needs_verification",
    ];
    assert(
      sourceBlockedStatuses.every((verifiedStatus) => {
        const frontendResult = getModelProofEligibility(
          {
            ...proofModel,
            verifiedStatus,
          } as any,
          {
            exists: true,
            status: "installed_not_checked",
            hashChecked: false,
            hashMatches: false,
          },
        );
        const backendResult = integrity.getModelProofEligibility(
          {
            ...proofModel,
            verifiedStatus,
          },
          {
            exists: true,
            status: "installed_not_checked",
            hashChecked: false,
            hashMatches: false,
          },
        );
        return (
          frontendResult.proofEligible === false &&
          backendResult.proofEligible === false &&
          !!backendResult.diagnosticCode
        );
      }),
      "Test 7.15: Network, DNS, timeout, missing-hash, and needs-verification statuses block proof before local hash verification",
      "A diagnostic source blocker was treated as proof-eligible",
    );

    const missingProofDiagnostic = getModelProofEligibility(proofModel as any, {
      exists: false,
      status: "missing",
      hashChecked: false,
    });
    assert(
      missingProofDiagnostic.proofEligible === false &&
        missingProofDiagnostic.reason === "missing_file" &&
        missingProofDiagnostic.diagnosticCode === "PROOF_MODEL_MISSING",
      "Test 7.15a: Proof-blocked missing model uses PROOF_MODEL_MISSING",
      `Expected PROOF_MODEL_MISSING, got ${missingProofDiagnostic.diagnosticCode}`,
    );

    assert(
      backendMismatchProof.diagnosticCode === "MODEL_LOCAL_HASH_MISMATCH",
      "Test 7.15b: Native hash mismatch uses MODEL_LOCAL_HASH_MISMATCH",
      `Expected MODEL_LOCAL_HASH_MISMATCH, got ${backendMismatchProof.diagnosticCode}`,
    );

    const validImportedMetadata = validateImportedModelMetadata({
      name: "known_model.onnx",
      fileName: "known_model.onnx",
      architecture: "VR",
      sourceUrl: "https://huggingface.co/openstem/example/resolve/main/known_model.onnx",
      sourceProject: "openstem/example",
      license: "MIT",
      expectedSha256: matchingHash,
      expectedSizeBytes: fileBody.length,
      requiredBackend: "audio-separator",
      sourceType: "hugging_face_repo",
    });
    const malformedHashMetadata = validateImportedModelMetadata({
      name: "bad_hash.onnx",
      fileName: "bad_hash.onnx",
      architecture: "VR",
      sourceUrl: "https://huggingface.co/openstem/example/resolve/main/bad_hash.onnx",
      sourceProject: "openstem/example",
      license: "MIT",
      expectedSha256: "not-a-valid-hash",
    });
    const missingLicenseMetadata = validateImportedModelMetadata({
      name: "missing_license.onnx",
      fileName: "missing_license.onnx",
      architecture: "VR",
      sourceUrl: "https://huggingface.co/openstem/example/resolve/main/missing_license.onnx",
      sourceProject: "openstem/example",
      expectedSha256: matchingHash,
    });
    assert(
      validImportedMetadata.ok === true &&
        validImportedMetadata.metadata?.verifiedStatus === "needs_verification" &&
        malformedHashMetadata.ok === false &&
        malformedHashMetadata.errors.some((error) => error.includes("64 hexadecimal")) &&
        missingLicenseMetadata.ok === false &&
        missingLicenseMetadata.errors.some((error) => error.includes("license")),
      "Test 7.16: Manual metadata import validates hash/license and remains needs_verification",
      "Manual metadata validation accepted malformed hash, missing license, or fake verified status",
    );

    const reconnectMatch = evaluateManualReconnect({ expectedSha256: matchingHash, actualSha256: matchingHash });
    const reconnectMismatch = evaluateManualReconnect({ expectedSha256: matchingHash, actualSha256: mismatchedHash });
    const reconnectMissingHash = evaluateManualReconnect({ actualSha256: matchingHash });
    assert(
      reconnectMatch.status === "hash_verified" &&
        reconnectMatch.proofEligible === true &&
        reconnectMismatch.status === "hash_mismatch" &&
        reconnectMismatch.proofEligible === false &&
        reconnectMissingHash.status === "installed_hash_unavailable" &&
        reconnectMissingHash.proofEligible === false,
      "Test 7.17: Manual local reconnect requires matching expected SHA-256",
      "Manual reconnect allowed mismatch or missing expected hash",
    );

    const recoveryRoot = path.join(tempRoot, "recovery_candidates");
    const recoveryNested = path.join(recoveryRoot, "nested");
    fs.mkdirSync(recoveryNested, { recursive: true });
    const verifiedCandidatePath = path.join(recoveryRoot, "known_model.onnx");
    const mismatchCandidatePath = path.join(recoveryNested, "known_model.onnx");
    const wrongNameCandidatePath = path.join(recoveryRoot, "renamed_model.onnx");
    fs.writeFileSync(verifiedCandidatePath, fileBody);
    fs.writeFileSync(mismatchCandidatePath, Buffer.from("same filename but wrong bytes"));
    fs.writeFileSync(wrongNameCandidatePath, fileBody);

    const verifiedCandidate = integrity.inspectReconnectCandidate(proofModel, verifiedCandidatePath);
    const filenameOnlyCandidate = integrity.inspectReconnectCandidate(proofModel, mismatchCandidatePath);
    const renamedButMatchingCandidate = integrity.inspectReconnectCandidate(proofModel, wrongNameCandidatePath);
    assert(
      verifiedCandidate.status === "hash_verified" &&
        verifiedCandidate.hashMatches === true &&
        verifiedCandidate.filenameCompatible === true &&
        filenameOnlyCandidate.filenameCompatible === true &&
        filenameOnlyCandidate.status === "hash_mismatch" &&
        filenameOnlyCandidate.hashMatches === false &&
        renamedButMatchingCandidate.status === "hash_verified" &&
        renamedButMatchingCandidate.filenameCompatible === false,
      "Test 7.17a: Local reconnect compares filename but trusts only matching SHA-256",
      "Candidate inspection trusted filename-only matching or rejected a cryptographic match because of filename alone",
    );

    const searchResult = integrity.searchModelCandidatesInFolder(proofModel, recoveryRoot, { maxDepth: 4 });
    assert(
      searchResult.success === true &&
        searchResult.candidates.length === 2 &&
        searchResult.verifiedCandidates === 1 &&
        searchResult.candidates.some((candidate: any) => candidate.status === "hash_verified") &&
        searchResult.candidates.some((candidate: any) => candidate.status === "hash_mismatch"),
      "Test 7.17b: Folder search finds expected filename candidates but only accepts hash matches",
      "Folder search missed candidates or treated a mismatched hash as verified",
    );

    fs.unlinkSync(goodModelPath);
    const reconnectFromVerifiedCandidate = integrity.reconnectModelFileFromPath(
      proofModel,
      modelLibraryPath,
      verifiedCandidatePath,
    );
    assert(
      reconnectFromVerifiedCandidate.success === true &&
        reconnectFromVerifiedCandidate.status === "hash_verified" &&
        reconnectFromVerifiedCandidate.proofEligibility?.proofEligible === true &&
        fs.existsSync(goodModelPath),
      "Test 7.17c: Verified folder candidate can reconnect into the model library",
      "Reconnect did not copy or verify the matching candidate",
    );

    const blockedReconnect = integrity.reconnectModelFileFromPath(proofModel, modelLibraryPath, mismatchCandidatePath);
    assert(
      blockedReconnect.success === false &&
        blockedReconnect.status === "hash_mismatch" &&
        blockedReconnect.diagnosticCode === "MODEL_LOCAL_HASH_MISMATCH",
      "Test 7.17d: Mismatched local file remains blocked during reconnect",
      "Reconnect accepted a mismatched candidate",
    );

    const hfResolution = buildSourceResolutionWorkflow({
      downloadUrl: "https://huggingface.co/openstem/example/resolve/main/model.onnx",
      sourceType: "hugging_face_repo",
      verifiedStatus: "auth_required",
    });
    const githubResolution = buildSourceResolutionWorkflow({
      downloadUrl: "https://github.com/openstem/example/releases/download/v1/model.onnx",
      sourceType: "github_release",
      verifiedStatus: "broken_link",
    });
    assert(
      hfResolution.hfAuthentication === "Planned / Not active" &&
        hfResolution.candidateSearchTrust === "candidate_only_needs_hash_and_license" &&
        hfResolution.candidateSourcesAllowed.includes("same public or authorized Hugging Face repo file tree") &&
        hfResolution.candidateSourcesAllowed.includes("user-selected folder") &&
        githubResolution.candidateSourcesAllowed.includes("configured GitHub releases") &&
        hfResolution.actions.some((action) => action.includes("Search selected folder")) &&
        hfResolution.actions.some((action) => action.includes("unverified until expected SHA-256")),
      "Test 7.18: Source-resolution workflow limits candidate search and never auto-verifies candidates",
      "Source-resolution workflow trusts candidates or searches outside allowed sources",
    );

    const customNoHash = createCustomModelEntryFromMetadata({
      displayName: "User No Hash",
      filename: "user_no_hash.onnx",
      architecture: "Custom",
      backend: "audio-separator",
      license: "MIT",
      sourceUrl: "https://huggingface.co/user/no-hash/resolve/main/user_no_hash.onnx",
      sourceProject: "user/no-hash",
    });
    const customNoHashRegistry = customModelEntryToRegistryEntry(customNoHash);
    const customVerified = modelRegistryEntryToCustomModelEntry(
      {
        ...proofModel,
        id: "custom_verified_known_model",
        catalogLane: "custom",
        filePath: goodModelPath,
        actualSha256: matchingHash,
        verifiedStatus: "verified_local",
      } as any,
      {
        actualSha256: matchingHash,
        expectedSha256: matchingHash,
        fileSizeBytes: fileBody.length,
        hashMatches: true,
        status: "hash_verified",
      },
    );
    const customVerifiedRegistry = customModelEntryToRegistryEntry(customVerified);
    const customMismatch = modelRegistryEntryToCustomModelEntry(
      {
        ...proofModel,
        id: "custom_mismatch_known_model",
        catalogLane: "custom",
        filePath: goodModelPath,
        actualSha256: mismatchedHash,
        verifiedStatus: "hash_mismatch",
      } as any,
      {
        actualSha256: mismatchedHash,
        expectedSha256: matchingHash,
        fileSizeBytes: fileBody.length,
        hashMatches: false,
        status: "hash_mismatch",
      },
    );
    const customMismatchRegistry = customModelEntryToRegistryEntry(customMismatch);
    const customNoHashProof = getModelProofEligibility(customNoHashRegistry as any, {
      exists: true,
      status: "custom_hash_unavailable",
      hashChecked: false,
      hashMatches: false,
    });
    const customVerifiedProof = getModelProofEligibility(customVerifiedRegistry as any, {
      exists: true,
      status: "hash_verified",
      hashChecked: true,
      hashMatches: true,
    });
    const customMismatchProof = getModelProofEligibility(customMismatchRegistry as any, {
      exists: true,
      status: "hash_mismatch",
      hashChecked: true,
      hashMatches: false,
    });
    const laneSummary = summarizeModelLibrary([MODEL_REGISTRY[0], customNoHashRegistry, customVerifiedRegistry]);
    assert(
      getModelCatalogLane(MODEL_REGISTRY[0]) === "curated" &&
        getModelCatalogLane(customNoHashRegistry) === "custom" &&
        customNoHashProof.proofEligible === false &&
        customNoHashRegistry.verifiedStatus === "custom_hash_unavailable" &&
        customVerifiedProof.proofEligible === true &&
        customVerifiedRegistry.verifiedStatus === "verified_local" &&
        customMismatchProof.proofEligible === false &&
        customMismatchRegistry.verifiedStatus === "hash_mismatch" &&
        laneSummary.curatedTotal === 1 &&
        laneSummary.customTotal === 2 &&
        laneSummary.customProofEligible === 1 &&
        getRecommendedModelAction(customNoHashRegistry).includes("Import metadata"),
      "Test 7.19: Curated and custom model lanes preserve strict proof eligibility",
      "Custom lane allowed missing hash, mismatched hash, or confused curated/custom model separation",
    );

    const manifestModel = {
      ...proofModel,
      id: "manifest_test_model",
      name: "manifest_test.onnx",
      downloadUrl: "https://github.com/openstem/models/releases/download/v1/manifest_test.onnx",
      sourceUrl: "https://github.com/openstem/models/releases/download/v1/manifest_test.onnx",
      sourceType: "github_release",
      verifiedStatus: "needs_verification",
      checksum: matchingHash,
      expectedSizeBytes: fileBody.length,
      license: "MIT",
      catalogLane: "curated",
    } as any;
    const manifest = buildOpenStemModelManifest([manifestModel], "2026-06-19T00:00:00.000Z");
    const malformedShaManifest = {
      ...manifest,
      models: [{ ...manifest.models[0], expected_sha256: "abc123" }],
    };
    const placeholderUrlManifest = {
      ...manifest,
      models: [{ ...manifest.models[0], source_url: "https://example.com/model.onnx" }],
    };
    const missingLicenseVerifiedManifest = {
      ...manifest,
      models: [{ ...manifest.models[0], source_status: "verified", status: "download_available", license: "" }],
    };
    const sourceWithoutStatusManifest = {
      ...manifest,
      models: [{ ...manifest.models[0], source_status: undefined }],
    };
    const proofEligibleManifest = {
      ...manifest,
      models: [{ ...manifest.models[0], status: "proof_eligible" }],
    };
    const localIndex = createEmptyLocalModelIndex("C:/Users/test/AppData/Roaming/OpenStem/uvr_models");
    const matchingIndexEntry = deriveLocalModelIndexEntry({
      model: manifestModel,
      localPath: goodModelPath,
      actualSha256: matchingHash,
      fileSizeBytes: fileBody.length,
      verificationStatus: "hash_verified",
      proofEligibility: customVerifiedProof,
      now: "2026-06-19T00:00:00.000Z",
    });
    const pendingIndexEntry = {
      modelId: "manifest_test_model",
      localPath: "C:/Users/test/AppData/Roaming/OpenStem/uvr_models/MDX_Net/manifest_test.onnx",
      fileSizeBytes: fileBody.length,
      verificationStatus: "download_complete_verification_pending",
      proofEligible: false,
    };
    const badProofIndex = {
      ...localIndex,
      entries: [
        {
          modelId: "bad_proof",
          actualSha256: matchingHash,
          expectedSha256: matchingHash,
          verificationStatus: "installed_not_checked",
          proofEligible: true,
        },
      ],
    };
    const validIndex = {
      ...localIndex,
      entries: [matchingIndexEntry, pendingIndexEntry],
    };
    const libraryState = getOpenStemModelLibraryState(manifestModel, matchingIndexEntry);
    assert(
      validateOpenStemModelManifest(manifest).ok === true &&
        validateOpenStemModelManifest(malformedShaManifest).ok === false &&
        validateOpenStemModelManifest(placeholderUrlManifest).ok === false &&
        validateOpenStemModelManifest(missingLicenseVerifiedManifest).ok === false &&
        validateOpenStemModelManifest(sourceWithoutStatusManifest).ok === false &&
        validateOpenStemModelManifest(proofEligibleManifest).ok === false &&
        validateLocalModelIndexDocument(validIndex).ok === true &&
        validateLocalModelIndexDocument(badProofIndex).ok === false &&
        validateLocalModelIndexLocation({
          indexPath: path.join(rootDir, "openstem-models.local.json"),
          sourceRepoPath: rootDir,
        }).ok === false &&
        validateLocalModelIndexLocation({
          indexPath: "C:/Users/test/AppData/Roaming/OpenStem/openstem-models.local.json",
          sourceRepoPath: rootDir,
        }).ok === true &&
        isInstalledLocalModelStatus("partial_download") === false &&
        isInstalledLocalModelStatus("download_complete_verification_pending") === false &&
        libraryState.proofStatus === "proof_eligible" &&
        getDownloadVerifyFlow().some((step) => step.includes("verification pending")) &&
        getRepairReconnectFlow().some((step) => step.includes("Reconnect local file")),
      "Test 7.20: Manifest and local model index preserve download, hash, and proof boundaries",
      "Manifest/local index accepted fake metadata, partial downloads, source-repo index, or proof without hash verification",
    );

    const largeValidModel = {
      id: "large_valid_roformer",
      name: "large_valid_roformer.onnx",
      architecture: "RoFormer",
      filePath: "",
      stemType: "vocals",
      gpuSupport: true,
      gpuSupportStatus: "unknown",
      memoryRisk: "high",
      downloaded: false,
      description: "Large valid model for compatibility gating test.",
      fileSize: "5.0 GB",
      downloadUrl: "https://github.com/openstem/models/releases/download/v1/large_valid_roformer.onnx",
      sourceUrl: "https://github.com/openstem/models/releases/download/v1/large_valid_roformer.onnx",
      sourceType: "github_release",
      license: "MIT",
      checksum: matchingHash,
      expectedSizeBytes: 5 * 1024 * 1024 * 1024,
      requiredBackend: "audio-separator",
      supportedExtensions: [".onnx"],
      verifiedStatus: "verified",
    } as const;
    const largeGate = getModelCompatibilityGate(largeValidModel as any);
    const largeHardwareWarning = getModelHardwareFit(largeValidModel as any, {
      checked: true,
      systemRamBytes: 4 * 1024 * 1024 * 1024,
      totalVramBytes: 2 * 1024 * 1024 * 1024,
      cudaAvailable: false,
      mpsAvailable: false,
      canRunCpuAISeparation: true,
      torchInstalled: true,
      audioSeparatorInstalled: true,
      source: "backend_diagnostics",
    });
    const gpuRecommendedFit = getModelHardwareFit(largeValidModel as any);
    const unsupportedBackendGate = getModelCompatibilityGate({
      ...largeValidModel,
      id: "unsupported_backend_model",
      requiredBackend: "future-backend",
    } as any);
    const missingHashModel = {
      ...largeValidModel,
      id: "missing_hash_large_model",
      checksum: undefined,
      verifiedStatus: "missing_hash",
    } as any;
    const missingHashGate = getModelCompatibilityGate(missingHashModel);
    const missingHashProof = getModelProofEligibility(missingHashModel, {
      exists: true,
      status: "installed_hash_unavailable",
      hashChecked: false,
      hashMatches: false,
    });
    const cpuSlowModel = {
      ...largeValidModel,
      id: "cpu_slow_valid_model",
      architecture: "MDX-Net",
      name: "cpu_slow_valid_model.onnx",
      gpuSupport: false,
      memoryRisk: "med",
      expectedSizeBytes: 900 * 1024 * 1024,
      fileSize: "900 MB",
      supportedExtensions: [".onnx"],
    } as any;
    const cpuSlowGate = getModelCompatibilityGate(cpuSlowModel);
    const cpuSlowFit = getModelHardwareFit(cpuSlowModel);
    const authRequiredGate = getModelCompatibilityGate({
      ...largeValidModel,
      id: "auth_required_large_model",
      verifiedStatus: "auth_required",
    } as any);
    const goodHardwareFit = getModelHardwareFit(largeValidModel as any, {
      checked: true,
      systemRamBytes: 64 * 1024 * 1024 * 1024,
      totalVramBytes: 24 * 1024 * 1024 * 1024,
      cudaAvailable: true,
      mpsAvailable: false,
      canRunCpuAISeparation: true,
      torchInstalled: true,
      audioSeparatorInstalled: true,
      source: "backend_diagnostics",
    });
    const goodHardwareStillNotProof = getModelProofEligibility(largeValidModel as any, {
      exists: false,
      status: "missing",
      hashChecked: false,
      hashMatches: false,
    });
    assert(
      largeGate.allowedInLibrary === true &&
        largeGate.canAttemptDownload === true &&
        largeGate.blockers.length === 0 &&
        largeHardwareWarning.fit === "likely_too_large" &&
        largeHardwareWarning.warningLevel === "severe" &&
        getHardwareFitBadgeLabel(largeHardwareWarning) === "Likely too large for this machine" &&
        unsupportedBackendGate.allowedInLibrary === false &&
        unsupportedBackendGate.blockers.includes("unsupported_backend") &&
        missingHashGate.blockers.includes("missing_hash") &&
        missingHashProof.proofEligible === false &&
        customMismatchProof.proofEligible === false &&
        customVerifiedProof.proofEligible === true &&
        goodHardwareFit.fit !== "likely_too_large" &&
        goodHardwareStillNotProof.proofEligible === false &&
        gpuRecommendedFit.userMessage.includes("not proof") &&
        cpuSlowGate.allowedInLibrary === true &&
        cpuSlowGate.canAttemptDownload === true &&
        cpuSlowFit.fit === "usable_but_slow" &&
        authRequiredGate.canAttemptDownload === false &&
        authRequiredGate.canAttemptManualImport === true,
      "Test 7.21: Compatibility gate and hardware-fit warnings stay separate from proof eligibility",
      "Hardware fit blocked a valid large model, unsupported backend passed, or hardware fit counted as proof",
    );

    const goldenManifest: GoldenProofModelManifest = {
      proof_model_id: "golden_cpu_proof_model",
      display_name: "Unit test golden proof model",
      model_family: "VR",
      filename: "known_model.onnx",
      architecture: "VR",
      backend: "audio-separator",
      source_project: "unit_test_fixture",
      source_url: "",
      license: "MIT",
      expected_sha256: matchingHash,
      expected_size_bytes: fileBody.length,
      expected_size_min_bytes: null,
      expected_size_max_bytes: null,
      local_path: goodModelPath,
      backend_compatibility: "audio-separator CPU",
      cpu_compatibility: true,
      expected_output_stems: ["Vocals", "Instrumental"],
      supported_proof_command: "node electron-shell/test-ai-e2e.cjs --device cpu",
      manual_placement_note: "Unit test only.",
      notes: "Unit test metadata only; not a real proof asset.",
    };
    const noGoldenModel = evaluateGoldenProofModel(null);
    const noGoldenHash = evaluateGoldenProofModel(
      { ...goldenManifest, expected_sha256: "" },
      { exists: true, actualSha256: matchingHash, sizeBytes: fileBody.length },
      { backendAvailable: true, inputAudioAvailable: true, outputFolderWritable: true },
    );
    const goldenHashMismatch = evaluateGoldenProofModel(
      goldenManifest,
      { exists: true, actualSha256: mismatchedHash, sizeBytes: fileBody.length },
      { backendAvailable: true, inputAudioAvailable: true, outputFolderWritable: true },
    );
    const goldenHashVerifiedRuntimeMissing = evaluateGoldenProofModel(
      goldenManifest,
      { exists: true, actualSha256: matchingHash, sizeBytes: fileBody.length },
      { backendAvailable: false, inputAudioAvailable: false, outputFolderWritable: false },
    );
    const goldenReady = evaluateGoldenProofModel(
      goldenManifest,
      { exists: true, actualSha256: matchingHash, sizeBytes: fileBody.length },
      { backendAvailable: true, inputAudioAvailable: true, outputFolderWritable: true },
    );
    const wrongSize = evaluateGoldenProofModel(
      goldenManifest,
      { exists: true, actualSha256: matchingHash, sizeBytes: fileBody.length + 1 },
      { backendAvailable: true, inputAudioAvailable: true, outputFolderWritable: true },
    );
    const wrongFilename = evaluateGoldenProofModel(
      goldenManifest,
      { exists: true, actualSha256: matchingHash, sizeBytes: fileBody.length, filename: "wrong.onnx" },
      { backendAvailable: true, inputAudioAvailable: true, outputFolderWritable: true },
    );
    const gitignoreContent = fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8");
    const proofCheckContent = fs.readFileSync(path.join(rootDir, "src", "scripts", "check-proof-readiness.ts"), "utf8");
    const proofModelTemplateContent = fs.readFileSync(path.join(rootDir, "docs", "proof-model.example.json"), "utf8");
    const proofChecklistContent = fs.readFileSync(path.join(rootDir, "docs", "PROOF_ASSET_CHECKLIST.md"), "utf8");
    const proofInputArgs = buildSyntheticProofInputFfmpegArgs("C:/proof/openstem_synthetic_proof.wav");
    assert(
      noGoldenModel.proofReady === false &&
        noGoldenModel.diagnosticCodes.includes("PROOF_MODEL_MISSING") &&
        noGoldenHash.modelProofEligible === false &&
        noGoldenHash.diagnosticCodes.includes("MODEL_METADATA_MISSING_HASH") &&
        goldenHashMismatch.modelProofEligible === false &&
        goldenHashMismatch.diagnosticCodes.includes("MODEL_LOCAL_HASH_MISMATCH") &&
        wrongSize.modelProofEligible === false &&
        wrongSize.diagnosticCodes.includes("PROOF_MODEL_SIZE_MISMATCH") &&
        wrongFilename.modelProofEligible === false &&
        wrongFilename.diagnosticCodes.includes("PROOF_MODEL_FILENAME_MISMATCH") &&
        goldenHashVerifiedRuntimeMissing.modelProofEligible === true &&
        goldenHashVerifiedRuntimeMissing.proofReady === false &&
        validateGoldenProofModelManifest(goldenManifest).ok === true &&
        validateGoldenProofModelManifest({ ...goldenManifest, expected_output_stems: [] }).ok === false &&
        goldenReady.modelProofEligible === true &&
        goldenReady.proofReady === true &&
        goldenReady.e2eProofPassed === false &&
        goldenReady.statusLabel === "Golden proof model ready for CPU E2E proof",
      "Test 7.22: Golden proof model lane separates missing, hash, readiness, and E2E proof states",
      "Golden proof model evaluation allowed missing hash, hash mismatch, or readiness to count as E2E proof",
    );
    assert(
      gitignoreContent.includes("*.onnx") &&
        gitignoreContent.includes("*.pth") &&
        gitignoreContent.includes("proof-model.local.json") &&
        gitignoreContent.includes("docs/proof-model.local.json") &&
        proofModelTemplateContent.includes('"expected_sha256": ""') &&
        proofModelTemplateContent.includes('"local_path": ""') &&
        proofModelTemplateContent.includes('"expected_output_stems": []') &&
        proofModelTemplateContent.includes('"supported_proof_command"') &&
        proofCheckContent.includes("proof model configured:") &&
        proofCheckContent.includes("actual SHA-256 matches:") &&
        proofCheckContent.includes("input audio generated:") &&
        proofCheckContent.includes("FFprobe command checked:") &&
        proofCheckContent.includes("CPU proof attempted:") &&
        proofCheckContent.includes("CPU proof report path:") &&
        proofCheckContent.includes("CPU proof output files verified:") &&
        proofCheckContent.includes("RESULT: READY_TO_RUN_CPU_E2E_PROOF") &&
        proofCheckContent.includes("RESULT: CPU_E2E_PROOF_PASSED") &&
        proofCheckContent.includes("PROOF_E2E_NOT_RUN") &&
        proofCheckContent.includes("openstem-proof-report.json") &&
        proofCheckContent.includes("Do not run CPU AI proof until a proof-eligible model asset exists.") &&
        proofChecklistContent.includes("What This Proof Does Not Prove") &&
        proofChecklistContent.includes("durable passing `openstem-proof-report.json`") &&
        proofChecklistContent.includes("local end-to-end execution") &&
        proofInputArgs.includes("lavfi") &&
        proofInputArgs.includes("pcm_s16le") &&
        getDefaultProofInputPath(rootDir).endsWith(
          path.join("tmp_test_runs", "proof_input", "openstem_synthetic_proof.wav"),
        ) &&
        getDefaultProofOutputPath(rootDir).endsWith("OpenStemProofOutput"),
      "Test 7.23: Golden proof model files and proof-check output keep model assets external and proof blocked",
      "Proof model template, gitignore, or proof-check output can commit assets or imply fake proof",
    );
    const matchingCandidate = classifyProofModelCandidate(
      {
        path: "C:/Users/test/AppData/Roaming/OpenStem/uvr_models/VR/known_model.onnx",
        filename: "known_model.onnx",
        sizeBytes: fileBody.length,
        extension: ".onnx",
        architectureGuess: "VR",
        actualSha256: matchingHash,
      },
      [proofModel as any],
    );
    const mismatchedCandidate = classifyProofModelCandidate(
      {
        path: "C:/Users/test/AppData/Roaming/OpenStem/uvr_models/VR/known_model.onnx",
        filename: "known_model.onnx",
        sizeBytes: fileBody.length,
        extension: ".onnx",
        architectureGuess: "VR",
        actualSha256: mismatchedHash,
      },
      [proofModel as any],
    );
    const missingHashCandidate = classifyProofModelCandidate(
      {
        path: "C:/Users/test/AppData/Roaming/OpenStem/uvr_models/Custom/user_no_hash.onnx",
        filename: "user_no_hash.onnx",
        sizeBytes: fileBody.length,
        extension: ".onnx",
        architectureGuess: "Custom",
        actualSha256: matchingHash,
      },
      [customNoHashRegistry as any],
    );
    const manifestBackedCandidate = classifyProofModelCandidate(
      {
        path: "C:/Users/test/AppData/Roaming/OpenStem/uvr_models/VR/1_HP-UVR.pth",
        filename: "1_HP-UVR.pth",
        sizeBytes: fileBody.length,
        extension: ".pth",
        architectureGuess: "VR",
        actualSha256: matchingHash,
      },
      [customNoHashRegistry as any],
      {
        manifestPath: "C:/Users/test/OpenStem/proof-model.local.json",
        localPath: "C:/Users/test/AppData/Roaming/OpenStem/uvr_models/VR/1_HP-UVR.pth",
        expectedSha256: matchingHash,
        validationErrors: [],
        manifest: {
          proof_model_id: "golden_cpu_proof_model",
          display_name: "Manifest backed proof model",
          filename: "1_HP-UVR.pth",
          architecture: "VR",
          backend: "audio-separator",
          source_project: "Test fixture",
          source_url: "https://example.invalid/1_HP-UVR.pth",
          license: "MIT",
          expected_sha256: matchingHash,
          expected_size_bytes: fileBody.length,
          local_path: "C:/Users/test/AppData/Roaming/OpenStem/uvr_models/VR/1_HP-UVR.pth",
          cpu_compatibility: true,
          expected_output_stems: ["Vocals", "Instrumental"],
          supported_proof_command: "node electron-shell/test-ai-e2e.cjs --device cpu",
          notes: "Synthetic test manifest.",
        } satisfies GoldenProofModelManifest,
      },
    );
    const approvedProofRoots = getApprovedProofModelSearchRoots(
      "C:/Users/test/OpenStem",
      {
        APPDATA: "C:/Users/test/AppData/Roaming",
        USERPROFILE: "C:/Users/test",
      } as any,
      ["C:/Users/test/SelectedProofModels"],
    );
    const proofCandidateAuditContent = fs.readFileSync(
      path.join(rootDir, "src", "scripts", "audit-proof-model-candidates.ts"),
      "utf8",
    );
    assert(
      matchingCandidate.classification === "Hash verified" &&
        matchingCandidate.proofEligible === true &&
        matchingCandidate.expectedSha256 === matchingHash &&
        mismatchedCandidate.classification === "MODEL_LOCAL_HASH_MISMATCH" &&
        mismatchedCandidate.proofEligible === false &&
        mismatchedCandidate.diagnosticCode === "MODEL_LOCAL_HASH_MISMATCH" &&
        missingHashCandidate.classification === "Installed / Hash unavailable" &&
        missingHashCandidate.proofEligible === false &&
        missingHashCandidate.diagnosticCode === "MODEL_METADATA_MISSING_HASH" &&
        missingHashCandidate.proofMessage.includes("cannot satisfy proof") &&
        manifestBackedCandidate.classification === "Hash verified" &&
        manifestBackedCandidate.proofEligible === true &&
        manifestBackedCandidate.sourceType === "configured_manifest" &&
        SUPPORTED_PROOF_MODEL_EXTENSIONS.has(".onnx") &&
        SUPPORTED_PROOF_MODEL_EXTENSIONS.has(".pth") &&
        approvedProofRoots.some((root) => root.source === "openstem_user_data") &&
        approvedProofRoots.some((root) => root.source === "legacy_migration") &&
        approvedProofRoots.some((root) => root.source === "user_selected") &&
        proofCandidateAuditContent.includes("No internet is searched. No model weights are downloaded.") &&
        proofCandidateAuditContent.includes("Filename matches are candidates only."),
      "Test 7.24: Local proof-candidate audit requires expected SHA-256 and rejects filename-only trust",
      "Proof candidate audit allowed missing hash, hash mismatch, or filename-only matching to satisfy proof",
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
      "ModelDownloader is missing Browser Preview / Not runnable state",
    );
    assert(
      !downloaderContent.includes("hashMatch: status") && !downloaderContent.includes("hashMatch: item.downloaded"),
      "Test 8.2: Browser mode cannot fake model verification through hashMatch UI state",
      "ModelDownloader still contains legacy hashMatch state",
    );
    assert(
      !downloaderContent.includes("downloaded: true, // Only if backend confirms it") &&
        !downloaderContent.includes('dState.status === "completed"'),
      "Test 8.3: ModelDownloader does not keep legacy fake installed/completed UI states",
      "ModelDownloader still contains legacy downloaded/completed state markers",
    );
    assert(
      downloaderContent.includes("nativeDownloadBridgeReady") && downloaderContent.includes("nativeImportBridgeReady"),
      "Test 8.4: ModelDownloader gates download/import actions through native bridge readiness",
      "ModelDownloader is missing native bridge readiness gates",
    );
    assert(
      !downloaderContent.includes("matching the latest stable remote metadata hashes"),
      "Test 8.5: Empty update state does not claim unverified model freshness",
      "ModelDownloader still claims installed weights match latest remote hashes without verification",
    );
    assert(
      downloaderContent.includes("Proof Gate") &&
        downloaderContent.includes("Imported / Hash unavailable") &&
        downloaderContent.includes("Managed Local Model Index") &&
        downloaderContent.includes("Local Index State") &&
        downloaderContent.includes("Compatibility vs Hardware Fit") &&
        downloaderContent.includes("Hardware Fit") &&
        downloaderContent.includes("Hardware fit not checked") &&
        downloaderContent.includes("Estimate:") &&
        downloaderContent.includes("download_complete_verification_pending") &&
        downloaderContent.includes("Auth Required") &&
        downloaderContent.includes("This source returned HTTP 401.") &&
        downloaderContent.includes("This source returned HTTP 404 / Not Found."),
      "Test 8.6: ModelDownloader exposes proof gate and unavailable-source states",
      "ModelDownloader is missing proof gate or unavailable source messaging",
    );
    const classicConsoleContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "ClassicConsole.tsx"),
      "utf8",
    );
    assert(
      classicConsoleContent.includes('modelProofEligibility.proofEligible && modelFileStatus === "hash_verified"') &&
        classicConsoleContent.includes("model_proof_not_eligible"),
      "Test 8.7: ClassicConsole requires proof-eligible hash verification before AI run",
      "ClassicConsole still lacks strict proof eligibility gating",
    );
    assert(
      !classicConsoleContent.includes("Verified integrity checksum: Valid SHA-256 signature calculated.") &&
        !classicConsoleContent.includes("Model registered as local-available.") &&
        !classicConsoleContent.includes("Weights loaded successfully without restarting interface.") &&
        classicConsoleContent.includes('verification?.status !== "hash_verified"') &&
        classicConsoleContent.includes("Browser Preview / Not runnable for model downloads or SHA-256 verification"),
      "Test 8.8: ClassicConsole quick cache path cannot fake download or verification success",
      "ClassicConsole still contains legacy fake model download/checksum success markers",
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
      resourcesPath: rootDir,
    });
    assert(
      runtimePaths.fileExists(yueScriptPath),
      "Test 9.1: Runtime path resolver finds YuE helper script in dev mode",
      `YuE helper script not found at ${yueScriptPath}`,
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
      resourcesPath: packagedResources,
    });
    assert(
      packagedScriptPath === path.join(packagedResources, "scripts", "basic_pitch_probe.py") &&
        runtimePaths.fileExists(packagedScriptPath),
      "Test 9.2: Runtime path resolver supports packaged resourcesPath script lookup",
      `Packaged helper script resolved incorrectly: ${packagedScriptPath}`,
    );

    const missingHelper = runtimePaths.createMissingHelperScriptResult(
      path.join(packagedResources, "scripts", "missing_probe.py"),
    );
    assert(
      missingHelper.ok === false &&
        missingHelper.status === "helper_missing" &&
        missingHelper.message === "Required helper script is missing from packaged resources.",
      "Test 9.3: Missing helper script produces helper_missing structured result",
      "Missing helper result did not match required structure",
    );

    const diagnostic = runtimePaths.checkPackagedRuntime({
      isPackaged: false,
      appRoot: rootDir,
      resourcesPath: rootDir,
    });
    const diagnosticNames = diagnostic.requiredFiles.map((entry: any) => entry.name);
    assert(
      diagnosticNames.includes("YuE Python probe helper") &&
        diagnosticNames.includes("Basic Pitch Python probe helper"),
      "Test 9.4: Packaged runtime diagnostics list required helper scripts",
      "Packaged diagnostic did not include required Python helper scripts",
    );

    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    const buildConfig = packageJson.build || {};
    const filesConfig = JSON.stringify(buildConfig.files || []);
    const extraResourcesConfig = JSON.stringify(buildConfig.extraResources || []);
    assert(
      (extraResourcesConfig.includes('"from":"scripts"') || extraResourcesConfig.includes('"from":"scripts"')) &&
        buildConfig.afterPack === "electron-shell/after-pack.cjs",
      "Test 9.5: electron-builder includes scripts as packaged resources",
      "package.json build.extraResources does not include scripts or afterPack release resource hook",
    );
    assert(
      filesConfig.includes("!**/.venv*/**") &&
        filesConfig.includes("!**/uvr_models/**") &&
        filesConfig.includes("!**/models/**") &&
        filesConfig.includes("!**/*.log"),
      "Test 9.6: electron-builder excludes local envs, model caches, and logs",
      "package.json build.files is missing runtime exclusion patterns",
    );

    const mainContent = fs.readFileSync(path.join(rootDir, "electron-shell", "main.cjs"), "utf8");
    const preloadContent = fs.readFileSync(path.join(rootDir, "electron-shell", "preload.cjs"), "utf8");
    assert(
      mainContent.includes("check-packaged-runtime") &&
        preloadContent.includes("checkPackagedRuntime") &&
        mainContent.includes("reconnect-model-file") &&
        mainContent.includes("search-model-candidates") &&
        mainContent.includes("list-custom-model-library") &&
        mainContent.includes("save-custom-model-library-entry") &&
        mainContent.includes("remove-custom-model-library-entry") &&
        mainContent.includes("get-local-model-index-path") &&
        mainContent.includes("list-local-model-index") &&
        mainContent.includes("save-local-model-index-entry") &&
        mainContent.includes("remove-local-model-index-entry") &&
        mainContent.includes("validateLocalModelIndexEntry") &&
        mainContent.includes("openstem-models.local.json") &&
        mainContent.includes("validateCustomModelEntry") &&
        preloadContent.includes("reconnectModelFile") &&
        preloadContent.includes("searchModelCandidates") &&
        preloadContent.includes("listCustomModelLibrary") &&
        preloadContent.includes("saveCustomModelLibraryEntry") &&
        preloadContent.includes("removeCustomModelLibraryEntry") &&
        preloadContent.includes("listLocalModelIndex") &&
        preloadContent.includes("saveLocalModelIndexEntry") &&
        preloadContent.includes("removeLocalModelIndexEntry"),
      "Test 9.7: Packaged runtime, model recovery, and local index IPC are implemented and exposed",
      "Runtime diagnostic, model recovery, or local index IPC/preload bridge missing",
    );
    assert(
      !preloadContent.includes("verifyModelPath") &&
        !preloadContent.includes("readModelDirectory") &&
        !preloadContent.includes("verify-model-path") &&
        !preloadContent.includes("read-model-directory"),
      "Test 9.7a: Preload does not expose dangling model filesystem APIs",
      "Preload exposes model path/directory APIs without a matching safe main-process IPC contract",
    );
    assert(
      mainContent.includes("path.basename(fileName) !== fileName") &&
        mainContent.includes("ALLOWED_MODEL_EXTENSIONS.has(ext)") &&
        mainContent.includes("isPathInside(libraryPath, destPath)") &&
        mainContent.includes(".openstem-partial") &&
        mainContent.includes("download_complete_verification_pending") &&
        mainContent.includes("partial_download") &&
        mainContent.includes("fs.renameSync(tempPath, destPath)") &&
        mainContent.includes("Model downloads require an HTTPS source URL."),
      "Test 9.8: Native downloader validates filename, extension, destination, temp download, and HTTPS protocol",
      "download-model IPC is missing destination, temp-file, or source hardening",
    );

    const yueProbeContent = fs.readFileSync(path.join(rootDir, "electron-shell", "yue-probe.cjs"), "utf8");
    const basicProbeContent = fs.readFileSync(path.join(rootDir, "electron-shell", "basic-pitch-probe.cjs"), "utf8");
    assert(
      /resolveScriptFile\(["']yue_probe\.py["']\)/.test(yueProbeContent) &&
        /resolveScriptFile\(["']basic_pitch_probe\.py["']\)/.test(basicProbeContent),
      "Test 9.9: YuE and Basic Pitch probes resolve helper scripts through runtime path helper",
      "Probe wrappers still assume project-relative helper script paths",
    );
    assert(
      yueProbeContent.includes("execFileSync(pythonPath") &&
        basicProbeContent.includes("execFileSync(pythonPath") &&
        !yueProbeContent.includes("execSync(") &&
        !basicProbeContent.includes("execSync("),
      "Test 9.10: YuE and Basic Pitch probes avoid shell-string Python execution",
      "YuE or Basic Pitch probe still uses shell-string execSync with user-configurable paths",
    );
    assert(
      !/\bcertified\b/i.test(basicProbeContent) &&
        basicProbeContent.includes("audio-to-MIDI E2E transcription completed with a non-empty MIDI output"),
      "Test 9.10a: Basic Pitch probe avoids certification wording",
      "Basic Pitch probe output can still imply certification instead of a bounded MIDI verification result",
    );

    const batchEncoderContent = fs.readFileSync(path.join(rootDir, "src", "components", "BatchEncoder.tsx"), "utf8");
    const sunoContent = fs.readFileSync(path.join(rootDir, "src", "components", "SunoMusicLab.tsx"), "utf8");
    const serverContent = fs.readFileSync(path.join(rootDir, "server.ts"), "utf8");
    const backendDiagnosticsContent = fs.readFileSync(
      path.join(rootDir, "src", "scripts", "backend-diagnostics.ts"),
      "utf8",
    );
    const electronMainContent = mainContent;
    assert(
      electronMainContent.includes("function asPlainIpcObject") &&
        (electronMainContent.match(/asPlainIpcObject\(config\)/g) || []).length >= 4 &&
        electronMainContent.includes("function resolveProofReportPath") &&
        electronMainContent.includes("Output folder is required to read a proof report.") &&
        electronMainContent.includes('resolveProofReportPath(outputFolder, "yue_e2e_proof.json")') &&
        electronMainContent.includes('resolveProofReportPath(outputFolder, "basic_pitch_e2e_proof.json")'),
      "Test 9.10b: Native helper IPC handles malformed config and explicit proof-report folders",
      "YuE or Basic Pitch IPC can still throw on malformed config or read proof reports from implicit cwd",
    );
    assert(
      (batchEncoderContent.includes("uvr.checkFFmpegReady") || batchEncoderContent.includes("uvr?.checkFFmpegReady")) &&
        sunoContent.includes("Packaged file mode detected") &&
        sunoContent.includes("serverRoutesAvailable"),
      "Test 9.11: server.ts packaged mismatch is resolved or explicitly classified",
      "Packaged Electron still relies silently on server.ts HTTP routes",
    );
    assert(
      serverContent.includes('app.listen(PORT, "127.0.0.1"') &&
        serverContent.includes("new URL(String(targetUrl))") &&
        serverContent.includes("isApprovedLocalProxyHost(parsedTarget.hostname)") &&
        serverContent.includes("sanitizeProxyHeaders(headers)") &&
        serverContent.includes('"authorization"') &&
        serverContent.includes('"cookie"') &&
        serverContent.includes('["GET", "POST"].includes(requestMethod)') &&
        serverContent.includes('["http:", "https:"].includes(parsedTarget.protocol)'),
      "Test 9.12: Dev server proxy is local-only and validates target URL/method",
      "server.ts proxy can still expose broad network or unsupported proxy behavior",
    );
    assert(
      backendDiagnosticsContent.includes("resolveDiagnosticPythonPath") &&
        backendDiagnosticsContent.includes("OPENSTEM_BACKEND_PYTHON") &&
        backendDiagnosticsContent.includes("OPENSTEM_PROOF_PYTHON") &&
        backendDiagnosticsContent.includes("OPENSTEM_BACKEND_FFMPEG") &&
        backendDiagnosticsContent.includes("OPENSTEM_PROOF_FFMPEG") &&
        backendDiagnosticsContent.includes(".venv-openstem") &&
        backendDiagnosticsContent.includes("pythonResolved") &&
        backendDiagnosticsContent.includes("ffmpegResolved") &&
        backendDiagnosticsContent.includes("ffmpegSource") &&
        backendDiagnosticsContent.includes("compactBackendDetails") &&
        backendDiagnosticsContent.includes("helpTextPreview") &&
        backendDiagnosticsContent.includes("diagnostics_only_not_ai_proof"),
      "Test 9.13: Backend diagnostics uses project-local Python without claiming proof",
      "backend-diagnostics does not expose deterministic project-local Python resolution or proof-boundary wording",
    );
    assert(
      preloadContent.includes("selectFFmpegPath") &&
        preloadContent.includes("checkFFmpegReady: (ffmpegPath)") &&
        preloadContent.includes("checkBackendDetails: (customPythonPath, ffmpegPath)") &&
        preloadContent.includes("selectMasteringInputFile") &&
        preloadContent.includes("analyzeMasteringAudio") &&
        preloadContent.includes("runMasteringFfmpeg") &&
        preloadContent.includes("openMasteringAudioFile") &&
        electronMainContent.includes("select-ffmpeg-path") &&
        electronMainContent.includes("select-mastering-input-file") &&
        electronMainContent.includes("analyze-mastering-audio") &&
        electronMainContent.includes("run-mastering-ffmpeg") &&
        electronMainContent.includes("runMasteringFfmpegExport") &&
        electronMainContent.includes("loudnorm=I=") &&
        electronMainContent.includes("spawnProcessAsync") &&
        electronMainContent.includes("showOpenDialog") &&
        electronMainContent.includes("checkFFmpegReady(ffmpegPath)") &&
        electronMainContent.includes("checkBackendDetails(customPythonPath, ffmpegPath)") &&
        !electronMainContent.includes("exec("),
      "Test 9.14: Electron bridge exposes narrow selected-FFmpeg APIs without shell exec",
      "Electron FFmpeg bridge is missing selected-path IPC or exposes unsafe shell execution",
    );
    assert(
      electronMainContent.includes("function isAllowedMasteringAudioPath") &&
        electronMainContent.includes("MASTERING_AUDIO_EXTENSIONS.includes(ext)") &&
        electronMainContent.includes("Only supported audio files can be opened from the Mastering Lab."),
      "Test 9.14a: Mastering file opener rejects non-audio renderer paths",
      "open-mastering-audio-file can still launch non-audio files from renderer-supplied paths",
    );
    assert(
      electronMainContent.includes('ipcMain.handle("open-output-folder"') &&
        electronMainContent.includes("stats.isDirectory()") &&
        electronMainContent.includes("stats.isFile()") &&
        electronMainContent.includes("shell.showItemInFolder(resolved)") &&
        electronMainContent.includes('opened: "file_parent"') &&
        !electronMainContent.includes("if (folderPath && fs.existsSync(folderPath))") &&
        !electronMainContent.includes("await shell.openPath(folderPath)"),
      "Test 9.15: open-output-folder IPC reveals files instead of launching arbitrary paths",
      "open-output-folder IPC can still launch renderer-supplied file paths or lacks structured file/folder handling",
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
        supportsOutputFormat: true,
      },
      torchInstalled: true,
      torchVersion: "2.5.0+cpu",
      cudaAvailable: false,
      mpsAvailable: false,
      canRunAISeparation: true,
      canRunCpuAISeparation: true,
      ffprobeReady: true,
      blockers: [],
    };
    const readyFfmpeg = { ready: true, command: "ffmpeg", path: "ffmpeg", version: "ffmpeg version unit" };
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
        requiredBackend: "audio-separator",
      },
      verifiedModelLocalPath: modelPath,
      method: {
        id: "unit_method",
        name: "Unit Method",
        category: "VR Architecture",
        description: "Unit method",
        defaultModelId: "unit_model",
      },
      userSelectedMode: "ai",
      selectedDevice: "cpu",
      parameters: {
        chunks: "512",
        noiseReduction: "0",
        executionDevice: "cpu",
        cpuThreads: 2,
        segmentSize: "256",
      },
      options: {
        ttaActive: false,
        postProcessActive: false,
        vocalsOnly: false,
        instrumentalOnly: false,
        splitMode: false,
        saveAllOutputs: true,
        modelTestMode: false,
      },
      timestamp: new Date().toISOString(),
    };

    const missingPython = aiSeparation.checkBackendDetails("C:\\missing\\python.exe", {
      runCommand: () => ({
        ok: false,
        exitCode: 1,
        stdout: "",
        stderr: "missing",
        output: "missing",
        error: "missing",
      }),
      ffmpeg: readyFfmpeg,
    });
    assert(
      missingPython.pythonFound === false && missingPython.blockers.some((b: any) => b.id === "python_missing"),
      "Test 10.1: Python missing returns blocker",
      "Missing Python did not produce python_missing",
    );

    const audioMissing = aiSeparation.checkBackendDetails("python", {
      runCommand: (_cmd: string, args: string[]) => {
        if (args.includes("--version"))
          return { ok: true, exitCode: 0, stdout: "Python 3.11.0", stderr: "", output: "Python 3.11.0" };
        if (args.join(" ").includes("import audio_separator"))
          return { ok: false, exitCode: 1, stdout: "", stderr: "No module", output: "No module", error: "No module" };
        return { ok: false, exitCode: 1, stdout: "", stderr: "blocked", output: "blocked", error: "blocked" };
      },
      ffmpeg: readyFfmpeg,
    });
    assert(
      audioMissing.audioSeparatorInstalled === false &&
        audioMissing.blockers.some(
          (b: any) => b.id === "audio_separator_missing" && b.diagnosticCode === "RUNTIME_AUDIO_SEPARATOR_MISSING",
        ),
      "Test 10.2: audio-separator missing returns blocker",
      "Missing audio-separator did not produce audio_separator_missing with diagnostic code",
    );

    const torchMissing = aiSeparation.checkBackendDetails("python", {
      runCommand: (_cmd: string, args: string[]) => {
        const joined = args.join(" ");
        if (args.includes("--version"))
          return { ok: true, exitCode: 0, stdout: "Python 3.11.0", stderr: "", output: "Python 3.11.0" };
        if (joined.includes("import audio_separator"))
          return {
            ok: true,
            exitCode: 0,
            stdout: "audio_separator import OK",
            stderr: "",
            output: "audio_separator import OK",
          };
        if (joined.includes("--help"))
          return {
            ok: true,
            exitCode: 0,
            stdout:
              "usage: audio-separator [audio_files ...] --model_filename MODEL_FILENAME --model_file_dir MODEL_FILE_DIR --output_dir OUTPUT_DIR --output_format OUTPUT_FORMAT",
            stderr: "",
            output: "usage: audio-separator",
          };
        if (joined.includes("import torch"))
          return {
            ok: false,
            exitCode: 1,
            stdout: "",
            stderr: "No module named torch",
            output: "No module named torch",
            error: "No module named torch",
          };
        return { ok: false, exitCode: 1, stdout: "", stderr: "unexpected", output: "unexpected", error: "unexpected" };
      },
      ffmpeg: readyFfmpeg,
    });
    assert(
      torchMissing.torchInstalled === false &&
        torchMissing.blockers.some(
          (b: any) => b.id === "torch_missing" && b.diagnosticCode === "RUNTIME_PYTORCH_MISSING",
        ),
      "Test 10.3: PyTorch missing returns blocker",
      "Missing torch did not produce torch_missing with diagnostic code",
    );

    const ffmpegMissing = aiSeparation.checkFFmpegReady({
      runCommand: () => ({
        ok: false,
        exitCode: 1,
        stdout: "",
        stderr: "missing",
        output: "missing",
        error: "missing",
      }),
    });
    assert(
      ffmpegMissing.ready === false &&
        ffmpegMissing.diagnosticCode === "RUNTIME_FFMPEG_MISSING" &&
        !!ffmpegMissing.error,
      "Test 10.4: FFmpeg missing returns structured blocker state",
      "Missing FFmpeg did not return ready=false",
    );

    const executableName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
    const fakeFfmpegPath = path.join(tempRoot, executableName);
    fs.writeFileSync(fakeFfmpegPath, "unit ffmpeg placeholder");
    const selectedReadyFfmpeg = aiSeparation.checkFFmpegReady({
      ffmpegCommand: fakeFfmpegPath,
      runCommand: (command: string, args: string[]) => ({
        ok: command === fakeFfmpegPath && args.includes("-version"),
        exitCode: 0,
        stdout: "ffmpeg version unit",
        stderr: "",
        output: "ffmpeg version unit",
      }),
    });
    const invalidSelectedFfmpeg = aiSeparation.checkFFmpegReady({
      ffmpegCommand: path.join(tempRoot, `missing-${executableName}`),
      runCommand: () => ({
        ok: true,
        exitCode: 0,
        stdout: "ffmpeg version should not run",
        stderr: "",
        output: "ffmpeg version should not run",
      }),
    });
    const failingSelectedFfmpeg = aiSeparation.checkFFmpegReady({
      ffmpegCommand: fakeFfmpegPath,
      runCommand: () => ({
        ok: false,
        exitCode: 1,
        stdout: "",
        stderr: "failed",
        output: "failed",
        error: "failed",
      }),
    });
    const selectedEnv = aiSeparation.createCpuProcessEnv({}, selectedReadyFfmpeg);
    const selectedEnvPathKey = Object.keys(selectedEnv).find((key) => key.toLowerCase() === "path") || "PATH";
    const readyFfprobe = aiSeparation.checkFFprobeReady({
      runCommand: (command: string, args: string[]) => ({
        ok: command === "ffprobe" && args.includes("-version"),
        exitCode: 0,
        stdout: "ffprobe version unit",
        stderr: "",
        output: "ffprobe version unit",
      }),
    });
    const decodableInput = aiSeparation.verifyAudioFileDecodable(inputPath, readyFfmpeg, {
      runCommand: (_command: string, args: string[]) => ({
        ok: args.includes("-select_streams"),
        exitCode: 0,
        stdout: "audio\n",
        stderr: "",
        output: "audio\n",
      }),
    });
    assert(
      selectedReadyFfmpeg.ready === true &&
        selectedReadyFfmpeg.source === "selected_path" &&
        selectedReadyFfmpeg.command === fakeFfmpegPath &&
        selectedReadyFfmpeg.diagnosticCode === "RUNTIME_FFMPEG_READY" &&
        invalidSelectedFfmpeg.diagnosticCode === "RUNTIME_FFMPEG_INVALID_PATH" &&
        failingSelectedFfmpeg.diagnosticCode === "RUNTIME_FFMPEG_EXEC_FAILED" &&
        selectedEnv.OPENSTEM_SELECTED_FFMPEG === fakeFfmpegPath &&
        String(selectedEnv[selectedEnvPathKey]).startsWith(path.dirname(fakeFfmpegPath)) &&
        readyFfprobe.ready === true &&
        decodableInput.ok === true,
      "Test 10.4a: Selected FFmpeg/FFprobe paths are validated and threaded into CPU subprocess environment",
      "Selected FFmpeg path validation, FFprobe readiness, or decodable input verification regressed",
    );

    const missingInput = aiSeparation.validateProcessingRequest(
      { ...baseRequest, inputs: [path.join(tempRoot, "missing.wav")] },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg },
    );
    assert(
      missingInput.ok === false &&
        missingInput.blockers.some((b: any) => b.id === "input_missing" && b.diagnosticCode === "PROOF_INPUT_MISSING"),
      "Test 10.5: Missing input returns blocker",
      "Missing input was not blocked with diagnostic code",
    );

    const missingOutput = aiSeparation.validateProcessingRequest(
      { ...baseRequest, outputFolder: path.join(tempRoot, "missing_output") },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg },
    );
    assert(
      missingOutput.ok === false &&
        missingOutput.blockers.some(
          (b: any) => b.id === "output_missing" && b.diagnosticCode === "PROOF_OUTPUT_MISSING",
        ),
      "Test 10.6: Missing output folder returns blocker",
      "Missing output folder was not blocked with diagnostic code",
    );

    const missingModel = aiSeparation.validateProcessingRequest(
      {
        ...baseRequest,
        verifiedModelLocalPath: path.join(modelDir, "missing.onnx"),
        model: { ...baseRequest.model, name: "missing.onnx" },
      },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg },
    );
    assert(
      missingModel.ok === false &&
        missingModel.blockers.some((b: any) => b.id === "model_missing" && b.diagnosticCode === "PROOF_MODEL_MISSING"),
      "Test 10.7: Missing model file returns blocker",
      "Missing model was not blocked with diagnostic code",
    );

    const hashMismatch = aiSeparation.validateProcessingRequest(
      { ...baseRequest, model: { ...baseRequest.model, checksum: mismatchedHash } },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg },
    );
    assert(
      hashMismatch.ok === false &&
        hashMismatch.blockers.some(
          (b: any) => b.id === "model_hash_mismatch" && b.diagnosticCode === "MODEL_LOCAL_HASH_MISMATCH",
        ),
      "Test 10.8: Hash mismatch blocks run",
      "Hash mismatch was not blocked with diagnostic code",
    );

    const hashMissing = aiSeparation.validateProcessingRequest(
      {
        ...baseRequest,
        model: {
          ...baseRequest.model,
          checksum: undefined,
          sourceType: "hugging_face_repo",
          downloadUrl: "https://example.invalid/unit_model.onnx",
        },
      },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg },
    );
    assert(
      hashMissing.ok === false &&
        hashMissing.blockers.some(
          (b: any) => b.id === "model_hash_missing" && b.diagnosticCode === "PROOF_MODEL_HASH_MISSING",
        ),
      "Test 10.9: Missing expected model hash blocks CPU proof",
      "Missing expected hash was not blocked with diagnostic code",
    );

    const browserMode = aiSeparation.validateProcessingRequest(
      { ...baseRequest, bridgeMode: "browser" },
      { modelLibraryPath, backendDetails: readyBackend, ffmpeg: readyFfmpeg },
    );
    assert(
      browserMode.ok === false &&
        browserMode.blockers.some(
          (b: any) => b.id === "browser_mode" && b.diagnosticCode === "RUNTIME_BROWSER_PREVIEW_ONLY",
        ),
      "Test 10.10: Browser mode cannot run AI separation",
      "Browser mode was not blocked with diagnostic code",
    );

    const beforeOutputs = aiSeparation.snapshotOutputFiles(outputDir);
    const goodStemPath = path.join(outputDir, "input_(Vocals).wav");
    fs.writeFileSync(goodStemPath, Buffer.from("verified output bytes"));
    const verifiedOutputs = aiSeparation.scanVerifiedOutputs(outputDir, beforeOutputs);
    const passProof = aiSeparation.createProofResult({
      exitCode: 0,
      outputFiles: verifiedOutputs,
      status: "completed",
    });
    assert(
      passProof.success === true && passProof.proofStatus === "pass",
      "Test 10.11: Exit code 0 with non-empty stems returns proof pass",
      "Non-empty output did not produce proof pass",
    );

    const staleOutputDir = path.join(tempRoot, "stale_outputs");
    fs.mkdirSync(staleOutputDir, { recursive: true });
    fs.writeFileSync(path.join(staleOutputDir, "old_(Vocals).wav"), Buffer.from("old output bytes"));
    const beforeStale = aiSeparation.snapshotOutputFiles(staleOutputDir);
    const staleOutputs = aiSeparation.scanVerifiedOutputs(staleOutputDir, beforeStale);
    const staleProof = aiSeparation.createProofResult({ exitCode: 0, outputFiles: staleOutputs, status: "completed" });
    assert(
      staleProof.success === false &&
        staleProof.proofStatus === "fail" &&
        staleProof.diagnosticCode === "PROOF_OUTPUT_STALE",
      "Test 10.11a: Stale output files cannot pass proof",
      "Unchanged pre-existing output files were allowed to satisfy proof",
    );

    const decodableOutputDir = path.join(tempRoot, "decodable_outputs");
    fs.mkdirSync(decodableOutputDir, { recursive: true });
    const beforeDecodable = aiSeparation.snapshotOutputFiles(decodableOutputDir);
    fs.writeFileSync(path.join(decodableOutputDir, "input_(Instrumental).wav"), Buffer.from("output bytes"));
    const decodableOutputs = aiSeparation.scanVerifiedOutputs(decodableOutputDir, beforeDecodable, {
      ffmpeg: readyFfmpeg,
      requireDecodable: true,
      runCommand: () => ({
        ok: true,
        exitCode: 0,
        stdout: "audio\n",
        stderr: "",
        output: "audio\n",
      }),
    });
    const decodableProof = aiSeparation.createProofResult({
      exitCode: 0,
      outputFiles: decodableOutputs,
      status: "completed",
    });
    const undecodableOutputDir = path.join(tempRoot, "undecodable_outputs");
    fs.mkdirSync(undecodableOutputDir, { recursive: true });
    const beforeUndecodable = aiSeparation.snapshotOutputFiles(undecodableOutputDir);
    fs.writeFileSync(path.join(undecodableOutputDir, "input_(Vocals).wav"), Buffer.from("not audio"));
    const undecodableOutputs = aiSeparation.scanVerifiedOutputs(undecodableOutputDir, beforeUndecodable, {
      ffmpeg: readyFfmpeg,
      requireDecodable: true,
      runCommand: () => ({
        ok: false,
        exitCode: 1,
        stdout: "",
        stderr: "invalid data",
        output: "invalid data",
        error: "invalid data",
      }),
    });
    const undecodableProof = aiSeparation.createProofResult({
      exitCode: 0,
      outputFiles: undecodableOutputs,
      status: "completed",
    });
    assert(
      decodableProof.success === true &&
        decodableOutputs[0].decodable === true &&
        undecodableProof.success === false &&
        undecodableProof.diagnosticCode === "PROOF_OUTPUT_UNDECODABLE",
      "Test 10.11b: Proof outputs must be decodable when proof mode requires it",
      "Undecodable proof outputs were accepted or decodable outputs were rejected",
    );

    const emptyOutputDir = path.join(tempRoot, "empty_outputs");
    fs.mkdirSync(emptyOutputDir, { recursive: true });
    const beforeEmpty = aiSeparation.snapshotOutputFiles(emptyOutputDir);
    fs.writeFileSync(path.join(emptyOutputDir, "empty.wav"), Buffer.alloc(0));
    const emptyOutputs = aiSeparation.scanVerifiedOutputs(emptyOutputDir, beforeEmpty);
    const failProof = aiSeparation.createProofResult({ exitCode: 0, outputFiles: emptyOutputs, status: "completed" });
    assert(
      failProof.success === false &&
        failProof.proofStatus === "fail" &&
        failProof.diagnosticCode === "PROOF_OUTPUT_EMPTY",
      "Test 10.12: Exit code 0 with empty/missing outputs returns proof fail",
      "Empty output produced proof pass or missing diagnostic code",
    );

    const noActiveCancel = aiSeparation.requestCancelActiveProcess(null);
    const fakeProcess: any = {
      pid: 12345,
      killed: false,
      kill(signal: string) {
        this.killed = signal === "SIGTERM";
        return true;
      },
    };
    const cancelRequested = aiSeparation.requestCancelActiveProcess(fakeProcess, { platform: "linux" });
    assert(
      noActiveCancel.status === "no_active_process" &&
        cancelRequested.status === "cancel_requested" &&
        fakeProcess.killed === true,
      "Test 10.13: Cancellation returns cancelled/no_active_process correctly",
      "Cancellation result shape was incorrect",
    );

    const invocation = aiSeparation.buildAudioSeparatorInvocation(
      {
        audioSeparatorCli: readyBackend.audioSeparatorCli,
        pythonPath: "python",
        modelPath,
        outputFormat: "wav",
      },
      inputPath,
      outputDir,
    );
    assert(
      invocation.args.includes("--model_file_dir") &&
        invocation.args.includes(path.dirname(modelPath)) &&
        !invocation.args.includes("--device"),
      "Test 10.14: CLI invocation uses inspected audio-separator syntax",
      "Invocation did not include model_file_dir or incorrectly forced unsupported --device",
    );

    const proofScriptContent = fs.readFileSync(path.join(rootDir, "electron-shell", "test-ai-e2e.cjs"), "utf8");
    assert(
      proofScriptContent.includes("expected-sha256") &&
        proofScriptContent.includes("expected-stems") &&
        proofScriptContent.includes("openstem-proof-") &&
        proofScriptContent.includes("requireDecodableOutputs: true") &&
        proofScriptContent.includes("Manual CPU proof requires --expected-sha256") &&
        proofScriptContent.includes("A local model with a hash mismatch or missing hash must not be used for proof."),
      "Test 10.15: Manual CPU proof script requires expected SHA-256",
      "test-ai-e2e.cjs does not block unverified manual proof models",
    );

    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch (err: any) {
    assert(false, "Test 10: CPU AI separation backend helper", err.message);
  }

  // Test 11: UI truth-state regression checks after creative polish
  try {
    const basicPitchContent = fs.readFileSync(path.join(rootDir, "src", "components", "BasicPitchMidiLab.tsx"), "utf8");
    const sunoContent = fs.readFileSync(path.join(rootDir, "src", "components", "SunoMusicLab.tsx"), "utf8");
    const globalSettingsContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "GlobalSettings.tsx"),
      "utf8",
    );
    const mixerContent = fs.readFileSync(path.join(rootDir, "src", "components", "FourTrackMixer.tsx"), "utf8");
    const ensemblePlannerContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "EnsemblePipelinePlanner.tsx"),
      "utf8",
    );
    const batchEncoderContent = fs.readFileSync(path.join(rootDir, "src", "components", "BatchEncoder.tsx"), "utf8");
    const masteringLabContent = fs.readFileSync(path.join(rootDir, "src", "components", "MasteringLab.tsx"), "utf8");
    const localTranscriptionContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "LocalTranscriptionWorkspace.tsx"),
      "utf8",
    );
    const clinicalWorkflowContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "ClinicalWorkflowBuilder.tsx"),
      "utf8",
    );
    const transcriptWorkflowContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "TranscriptWorkflowBuilder.tsx"),
      "utf8",
    );
    const classicConsoleContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "ClassicConsole.tsx"),
      "utf8",
    );
    const downloaderContent = fs.readFileSync(path.join(rootDir, "src", "components", "ModelDownloader.tsx"), "utf8");
    const hostSetupGuideContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "HostSetupGuide.tsx"),
      "utf8",
    );
    const legalContent = fs.readFileSync(path.join(rootDir, "src", "components", "LegalAbout.tsx"), "utf8");
    const appErrorBoundaryContent = fs.readFileSync(
      path.join(rootDir, "src", "components", "AppErrorBoundary.tsx"),
      "utf8",
    );
    const manualsContent = fs.readFileSync(path.join(rootDir, "src", "data", "submenuManuals.ts"), "utf8");
    const brandingContent = fs.readFileSync(path.join(rootDir, "src", "config", "branding.ts"), "utf8");
    const readmeContent = fs.readFileSync(path.join(rootDir, "README.md"), "utf8");
    const proofCheckContent = fs.readFileSync(path.join(rootDir, "src", "scripts", "check-proof-readiness.ts"), "utf8");
    const proofModelEvaluatorContent = fs.readFileSync(path.join(rootDir, "src", "services", "proofModel.ts"), "utf8");
    const transcriptionPolicyContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "transcriptionPolicy.ts"),
      "utf8",
    );
    const transcriptionFilenamePolicyContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "transcriptionFilenamePolicy.ts"),
      "utf8",
    );
    const vttTranscriptImportContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "vttTranscriptImport.ts"),
      "utf8",
    );
    const clinicalPromptWorkflowContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "clinicalPromptWorkflow.ts"),
      "utf8",
    );
    const clinicalPrivacyPolicyContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "clinicalPrivacyPolicy.ts"),
      "utf8",
    );
    const localClinicalModelPolicyContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "localClinicalModelPolicy.ts"),
      "utf8",
    );
    const promptLibraryServiceContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "promptLibrary.ts"),
      "utf8",
    );
    const deepTranscriptServiceContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "deepTranscriptComprehension.ts"),
      "utf8",
    );
    const subQuestionPlannerContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "subQuestionPlanner.ts"),
      "utf8",
    );
    const transcriptEvidenceIndexContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "transcriptEvidenceIndex.ts"),
      "utf8",
    );
    const transcriptAnswerSynthesisContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "transcriptAnswerSynthesis.ts"),
      "utf8",
    );
    const transcriptionWorkflowPipelineContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "transcriptionWorkflowPipeline.ts"),
      "utf8",
    );
    const appContent = fs.readFileSync(path.join(rootDir, "src", "App.tsx"), "utf8");
    const proofAssetChecklistContent = fs.readFileSync(path.join(rootDir, "docs", "PROOF_ASSET_CHECKLIST.md"), "utf8");
    const releaseChecklistContent = fs.readFileSync(path.join(rootDir, "docs", "RELEASE_CHECKLIST.md"), "utf8");
    const localTranscriptionWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "LOCAL_TRANSCRIPTION_WORKFLOW.md"),
      "utf8",
    );
    const transcriptionReferenceAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "TRANSCRIPTION_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const recordingVttArchiveAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "RECORDING_VTT_ARCHIVE_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const transcriptionIntakeWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "TRANSCRIPTION_INTAKE_WORKFLOW.md"),
      "utf8",
    );
    const transcriptionAutomationWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "TRANSCRIPTION_AUTOMATION_WORKFLOW.md"),
      "utf8",
    );
    const checkpointAutomationWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "CHECKPOINT_AUTOMATION_WORKFLOW.md"),
      "utf8",
    );
    const vttArchiveExportWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "VTT_ARCHIVE_EXPORT_WORKFLOW.md"),
      "utf8",
    );
    const turboscribeHarAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "TURBOSCRIBE_HAR_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const clinicalPromptWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "CLINICAL_PROMPT_WORKFLOW.md"),
      "utf8",
    );
    const clinicalPrivacySecurityNotesContent = fs.readFileSync(
      path.join(rootDir, "docs", "CLINICAL_PRIVACY_SECURITY_NOTES.md"),
      "utf8",
    );
    const clinicalWorkflowReferenceAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "CLINICAL_WORKFLOW_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const clinicalWorkflowRiskRegisterContent = fs.readFileSync(
      path.join(rootDir, "docs", "CLINICAL_WORKFLOW_RISK_REGISTER.md"),
      "utf8",
    );
    const localClinicalModelGuideContent = fs.readFileSync(
      path.join(rootDir, "docs", "LOCAL_CLINICAL_MODEL_GUIDE.md"),
      "utf8",
    );
    const localClinicalModelReferenceAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "LOCAL_CLINICAL_MODEL_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const transcriptPromptWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "TRANSCRIPT_PROMPT_WORKFLOW.md"),
      "utf8",
    );
    const deepTranscriptDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "DEEP_TRANSCRIPT_COMPREHENSION.md"),
      "utf8",
    );
    const deepTranscriptReferenceAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "DEEP_TRANSCRIPT_COMPREHENSION_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const subqRagReferenceAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "SUBQ_RAG_TRANSCRIPT_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const promptLibraryWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "PROMPT_LIBRARY_WORKFLOW.md"),
      "utf8",
    );
    const documentFormatReferenceAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "DOCUMENT_FORMAT_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const documentFormatWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "DOCUMENT_FORMAT_WORKFLOW.md"),
      "utf8",
    );
    const voiceboxReferenceAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "VOICEBOX_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const referenceProjectIndexContent = fs.readFileSync(
      path.join(rootDir, "docs", "REFERENCE_PROJECT_INDEX.md"),
      "utf8",
    );
    const guiConsistencyAuditContent = fs.readFileSync(path.join(rootDir, "docs", "GUI_CONSISTENCY_AUDIT.md"), "utf8");
    const legalAboutUpdateDocContent = fs.readFileSync(path.join(rootDir, "docs", "LEGAL_AND_ABOUT_UPDATE.md"), "utf8");
    const dependencySecurityAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "DEPENDENCY_SECURITY_AUDIT.md"),
      "utf8",
    );
    const crashRiskAuditContent = fs.readFileSync(path.join(rootDir, "docs", "CRASH_RISK_AUDIT.md"), "utf8");
    const skillsReadmeContent = fs.readFileSync(path.join(rootDir, ".agents", "skills", "README.md"), "utf8");
    const musicMidiSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "music-midi-workflow", "SKILL.md"),
      "utf8",
    );
    const audioFormatSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "audio-format-workflow", "SKILL.md"),
      "utf8",
    );
    const masteringSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "mastering-workflow", "SKILL.md"),
      "utf8",
    );
    const audacityReferenceSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "audacity-reference-workflow", "SKILL.md"),
      "utf8",
    );
    const localTranscriptionSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "local-transcription-workflow", "SKILL.md"),
      "utf8",
    );
    const transcriptionIntakeSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "transcription-intake-workflow", "SKILL.md"),
      "utf8",
    );
    const transcriptionAutomationSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "transcription-automation-workflow", "SKILL.md"),
      "utf8",
    );
    const checkpointAutomationSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "checkpoint-automation-workflow", "SKILL.md"),
      "utf8",
    );
    const clinicalPromptSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "clinical-prompt-workflow", "SKILL.md"),
      "utf8",
    );
    const clinicalPrivacySkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "clinical-privacy-security", "SKILL.md"),
      "utf8",
    );
    const subqRagTranscriptSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "subq-rag-transcript-workflow", "SKILL.md"),
      "utf8",
    );
    const promptLibrarySkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "prompt-library-workflow", "SKILL.md"),
      "utf8",
    );
    const documentFormatSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "document-format-workflow", "SKILL.md"),
      "utf8",
    );
    const voiceboxReferenceSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "voicebox-reference-workflow", "SKILL.md"),
      "utf8",
    );
    const updateWorkflowSkillContent = fs.readFileSync(
      path.join(rootDir, ".agents", "skills", "update-workflow", "SKILL.md"),
      "utf8",
    );
    const updateStrategyContent = fs.readFileSync(path.join(rootDir, "docs", "UPDATE_STRATEGY.md"), "utf8");
    const securityPolicyContent = fs.readFileSync(path.join(rootDir, "docs", "SECURITY_POLICY_DRAFT.md"), "utf8");
    const documentFormatPolicyContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "documentFormatPolicy.ts"),
      "utf8",
    );
    const documentImportPolicyContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "documentImportPolicy.ts"),
      "utf8",
    );
    const documentExportPolicyContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "documentExportPolicy.ts"),
      "utf8",
    );
    const masteringWorkflowContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "masteringWorkflow.ts"),
      "utf8",
    );
    const masteringChainPolicyContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "masteringChainPolicy.ts"),
      "utf8",
    );
    const audioEffectChainPolicyContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "audioEffectChainPolicy.ts"),
      "utf8",
    );
    const voiceboxReferenceWorkflowContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "voiceboxReferenceWorkflow.ts"),
      "utf8",
    );
    const workflowRunLedgerContent = fs.readFileSync(
      path.join(rootDir, "src", "services", "workflowRunLedger.ts"),
      "utf8",
    );
    const workflowRunLedgerDocContent = fs.readFileSync(path.join(rootDir, "docs", "WORKFLOW_RUN_LEDGER.md"), "utf8");
    const masteringWorkflowDocContent = fs.readFileSync(path.join(rootDir, "docs", "MASTERING_WORKFLOW.md"), "utf8");
    const masteringBackendPolicyDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "MASTERING_BACKEND_POLICY.md"),
      "utf8",
    );
    const masteringReferenceAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "MASTERING_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const audacityReferenceAuditContent = fs.readFileSync(
      path.join(rootDir, "docs", "AUDACITY_REFERENCE_AUDIT.md"),
      "utf8",
    );
    const audioEffectChainWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "AUDIO_EFFECT_CHAIN_WORKFLOW.md"),
      "utf8",
    );
    const audioFormatWorkflowDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "AUDIO_FORMAT_WORKFLOW.md"),
      "utf8",
    );
    const webAudioMasteringIntegrationDocContent = fs.readFileSync(
      path.join(rootDir, "docs", "WEB_AUDIO_MASTERING_INTEGRATION.md"),
      "utf8",
    );
    const docsThirdPartyNoticesContent = fs.readFileSync(path.join(rootDir, "docs", "THIRD_PARTY_NOTICES.md"), "utf8");
    const thirdPartyNoticesContent = fs.readFileSync(path.join(rootDir, "THIRD_PARTY_NOTICES.md"), "utf8");
    const verifyElectronArtifactsContent = fs.readFileSync(
      path.join(rootDir, "src", "scripts", "verify-electron-artifacts.ts"),
      "utf8",
    );
    const packageJsonContent = fs.readFileSync(path.join(rootDir, "package.json"), "utf8");
    const gitignoreContent = fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8");

    const combinedTruthContent = [
      appContent,
      basicPitchContent,
      sunoContent,
      globalSettingsContent,
      mixerContent,
      localTranscriptionContent,
      transcriptWorkflowContent,
      clinicalWorkflowContent,
      classicConsoleContent,
      downloaderContent,
      legalContent,
      manualsContent,
      brandingContent,
      readmeContent,
    ].join("\n");
    const combinedTruthLower = combinedTruthContent.toLowerCase();
    const updateReadinessSummary = getOpenStemUpdateReadinessSummary();
    const txtDocumentImportPolicy = DOCUMENT_IMPORT_FORMAT_POLICIES.find((format) => format.id === "txt");
    const vttDocumentImportPolicy = DOCUMENT_IMPORT_FORMAT_POLICIES.find((format) => format.id === "vtt");
    const pdfDocumentImportPolicy = DOCUMENT_IMPORT_FORMAT_POLICIES.find((format) => format.id === "pdf");
    const docxDocumentImportPolicy = DOCUMENT_IMPORT_FORMAT_POLICIES.find((format) => format.id === "docx");
    const odtDocumentImportPolicy = DOCUMENT_IMPORT_FORMAT_POLICIES.find((format) => format.id === "odt");
    const txtDocumentOutputPolicy = DOCUMENT_OUTPUT_FORMAT_POLICIES.find((format) => format.id === "txt");
    const pdfDocumentOutputPolicy = DOCUMENT_OUTPUT_FORMAT_POLICIES.find((format) => format.id === "pdf");
    const docxDocumentOutputPolicy = DOCUMENT_OUTPUT_FORMAT_POLICIES.find((format) => format.id === "docx");
    const odtDocumentOutputPolicy = DOCUMENT_OUTPUT_FORMAT_POLICIES.find((format) => format.id === "odt");
    const vttDocumentImportPlan = buildDocumentImportPlan({ formatId: "vtt", nativeFileVerified: true });
    const pdfDocumentImportPlan = buildDocumentImportPlan({ formatId: "pdf", nativeFileVerified: true });
    const docxDocumentImportPlan = buildDocumentImportPlan({ formatId: "docx", nativeFileVerified: true });
    const odtDocumentImportPlan = buildDocumentImportPlan({ formatId: "odt", nativeFileVerified: true });
    const invalidJsonTranscriptImport = validateDocumentImportSchema({ schemaVersion: 1 });
    const validJsonTranscriptImport = validateDocumentImportSchema({
      schemaVersion: 1,
      transcriptText: "Synthetic transcript text.",
    });
    const pdfDocumentExportUnverified = buildDocumentExportPlan({
      formatId: "pdf",
      nativeWriteVerified: true,
      dependencyAvailable: true,
      outputPath: "synthetic.pdf",
      exists: false,
      sizeBytes: 0,
      extensionMatches: false,
      insideSelectedFolder: false,
      overwritePolicyAllows: false,
      speakerRenameApplied: true,
    });
    const docxDocumentExportUnverified = buildDocumentExportPlan({
      formatId: "docx",
      nativeWriteVerified: true,
      dependencyAvailable: true,
      outputPath: "synthetic.docx",
      exists: false,
      sizeBytes: 0,
      extensionMatches: false,
      insideSelectedFolder: false,
      overwritePolicyAllows: false,
    });
    const verifiedDocumentExport = buildDocumentExportPlan({
      formatId: "txt",
      nativeWriteVerified: true,
      outputPath: "synthetic.txt",
      exists: true,
      sizeBytes: 42,
      extensionMatches: true,
      insideSelectedFolder: true,
      overwritePolicyAllows: true,
      speakerRenameApplied: true,
    });
    const zeroByteDocumentExport = verifyDocumentExportOutput({
      outputPath: "synthetic.txt",
      exists: true,
      sizeBytes: 0,
      extensionMatches: true,
      insideSelectedFolder: true,
      overwritePolicyAllows: true,
    });
    const officeConverterMissing = buildExternalOfficeConverterPlan();
    const officeConverterInvalid = buildExternalOfficeConverterPlan({
      converterType: "soffice",
      configuredPath: "C:\\invalid\\soffice.exe",
      pathValid: false,
    });
    const officeConverterReady = buildExternalOfficeConverterPlan({
      converterType: "pandoc",
      configuredPath: "C:\\Tools\\pandoc.exe",
      pathValid: true,
    });
    const renamedDocumentText = applySpeakerRenameToDocumentText("Speaker 1: hello\nSpeaker 2: there", {
      "Speaker 1": "Interviewer",
      "Speaker 2": "Guest",
    });
    const verifiedLedgerTxtArtifact = verifyWorkflowArtifact({
      artifact: createWorkflowArtifactRecord({
        artifactId: "ledger-txt-export",
        artifactType: "txt_export",
        path: "synthetic-transcript.txt",
        format: "txt",
        sourceStage: "transcript_export_saved",
      }),
      fileExists: true,
      sizeBytes: 42,
      expectedExtension: ".txt",
      verificationRecorded: true,
    });
    const missingLedgerPdfArtifact = verifyWorkflowArtifact({
      artifact: createWorkflowArtifactRecord({
        artifactId: "ledger-pdf-export",
        artifactType: "pdf_export",
        path: "synthetic-transcript.pdf",
        format: "pdf",
        sourceStage: "transcript_export_saved",
      }),
      fileExists: false,
      sizeBytes: 0,
      expectedExtension: ".pdf",
      verificationRecorded: true,
    });
    const verifiedLedgerPdfReplacement = verifyWorkflowArtifact({
      artifact: createWorkflowArtifactRecord({
        artifactId: "ledger-pdf-replacement",
        artifactType: "pdf_export",
        path: "synthetic-replacement.pdf",
        format: "pdf",
        sourceStage: "transcript_export_saved",
        previousVersionPath: "synthetic-transcript.pdf",
      }),
      fileExists: true,
      sizeBytes: 64,
      expectedExtension: ".pdf",
      verificationRecorded: true,
    });
    const missingLedgerPdfReplacement = verifyWorkflowArtifact({
      artifact: createWorkflowArtifactRecord({
        artifactId: "ledger-pdf-replacement-missing",
        artifactType: "pdf_export",
        path: "synthetic-replacement.pdf",
        format: "pdf",
        sourceStage: "transcript_export_saved",
        previousVersionPath: "synthetic-transcript.pdf",
      }),
      fileExists: false,
      sizeBytes: 0,
      expectedExtension: ".pdf",
      verificationRecorded: true,
    });
    const verifiedPromptOutputArtifact = verifyWorkflowArtifact({
      artifact: createWorkflowArtifactRecord({
        artifactId: "ledger-prompt-output",
        artifactType: "prompt_output",
        path: "synthetic-prompt-output.txt",
        format: "txt",
        sourceStage: "prompt_output_export_saved",
      }),
      fileExists: true,
      sizeBytes: 88,
      expectedExtension: ".txt",
      verificationRecorded: true,
    });
    const metadataOnlyWorkflowRun = createWorkflowRunRecord({
      workflowRunId: "ledger-metadata-only",
      sourceType: "imported_vtt",
      sourceOriginalPath: "synthetic-input.vtt",
      sourceManagedPath: "managed/synthetic-input.vtt",
      sourceDuration: "00:00:03",
      sourceSize: SYNTHETIC_VTT_FIXTURE.length,
      sourceFormat: "vtt",
      transcriptTextPath: "transcripts/synthetic.txt",
      transcriptPreviewText: "Private transcript text should not be stored by default.",
      parsedSegmentsPath: "transcripts/synthetic-segments.json",
      speakerMap: { "Speaker 1": "Interviewer" },
      title: "Synthetic Ledger Run",
      sessionNumber: "007",
      date: "2026-06-19",
      selectedPromptLibraryId: "meeting-summary",
      selectedPromptTemplateName: "Meeting Summary",
      selectedModelId: "local-transcript-model",
      workflowMode: "automatic_then_review",
      generatedFiles: [],
      exportFiles: [verifiedLedgerTxtArtifact, missingLedgerPdfArtifact, verifiedPromptOutputArtifact],
      promptOutputs: [
        {
          sectionId: "summary",
          outputPath: "synthetic-prompt-output.txt",
          status: "Output Verified",
          regenerateRecommended: false,
        },
      ],
      lastCompletedStage: "transcript_preview",
      currentStage: "transcript_export_saved",
      reviewedByUser: false,
      notes: "Synthetic metadata-only ledger test.",
      historyMode: "metadata_only",
    });
    const fullHistoryWorkflowRun = createWorkflowRunRecord({
      workflowRunId: "ledger-full-history",
      sourceType: "pasted_text",
      transcriptPreviewText: "Synthetic non-PHI transcript.",
      historyMode: "full_history",
    });
    const failedLedgerRun = failWorkflowStage(
      metadataOnlyWorkflowRun,
      "transcript_export_saved",
      "PDF_OUTPUT_NOT_VERIFIED",
    );
    const retryLedgerRun = clearFailedStageAndRetry(failedLedgerRun);
    const rerunLedgerRun = rerunWorkflowStage(failedLedgerRun, "transcript_export_saved");
    const speakerEditLedgerRun = applyWorkflowEdit(metadataOnlyWorkflowRun, "speaker_names");
    const transcriptEditLedgerRun = applyWorkflowEdit(metadataOnlyWorkflowRun, "transcript_text");
    const titleEditLedgerRun = applyWorkflowEdit(metadataOnlyWorkflowRun, "title");
    const promptLibraryEditLedgerRun = applyWorkflowEdit(metadataOnlyWorkflowRun, "prompt_library");
    const promptOutputEditLedgerRun = applyWorkflowEdit(metadataOnlyWorkflowRun, "prompt_output");
    const ledgerResume = resumeWorkflowRun(metadataOnlyWorkflowRun);
    const ledgerFailedResume = resumeWorkflowRun(failedLedgerRun);
    const ledgerSummary = getWorkflowStatusSummary(failedLedgerRun);
    const ledgerRegenerateSummary = getWorkflowStatusSummary(transcriptEditLedgerRun);
    const fileWritingVerification = requireArtifactVerificationForStage(
      "transcript_export_saved",
      metadataOnlyWorkflowRun.exportFiles,
    );
    const nonWritingVerification = requireArtifactVerificationForStage("transcript_preview", []);
    const replacementBlocked = evaluateWorkflowOverwritePolicy({
      policy: "overwrite_previous_export",
      previousArtifact: verifiedLedgerTxtArtifact,
      replacementArtifact: missingLedgerPdfReplacement,
    });
    const replacementAllowed = evaluateWorkflowOverwritePolicy({
      policy: "overwrite_previous_export",
      previousArtifact: verifiedLedgerTxtArtifact,
      replacementArtifact: verifiedLedgerPdfReplacement,
    });
    const askOverwrite = evaluateWorkflowOverwritePolicy({
      policy: "ask_before_overwrite",
      previousArtifact: verifiedLedgerTxtArtifact,
      replacementArtifact: verifiedLedgerPdfReplacement,
    });
    const saveNewCopy = evaluateWorkflowOverwritePolicy({
      policy: "never_overwrite",
      previousArtifact: verifiedLedgerTxtArtifact,
      replacementArtifact: verifiedLedgerPdfReplacement,
    });
    const defaultMasteringSettings = getDefaultMasteringSettings("streaming_ready");
    const masteringBlockedReadiness = evaluateMasteringReadiness({
      inputPath: null,
      outputFolder: null,
      processingBackendReady: false,
      ffmpegReady: false,
      modeId: "balanced_master",
    });
    const masteringBackendBlockedReadiness = evaluateMasteringReadiness({
      inputPath: "C:/Audio/song.wav",
      outputFolder: "C:/OpenStem/Masters",
      processingBackendReady: false,
      ffmpegReady: true,
      modeId: "balanced_master",
    });
    const masteringReferenceBlockedReadiness = evaluateMasteringReadiness({
      inputPath: "C:/Audio/song.wav",
      outputFolder: "C:/OpenStem/Masters",
      processingBackendReady: true,
      ffmpegReady: false,
      modeId: "reference_match",
    });
    const masteringReadyReadiness = evaluateMasteringReadiness({
      inputPath: "C:/Audio/song.wav",
      outputFolder: "C:/OpenStem/Masters",
      processingBackendReady: true,
      ffmpegReady: true,
      modeId: "balanced_master",
    });
    const masteringChainBlockedReadiness = evaluateMasteringChainReadiness({
      modeId: "balanced_master",
      inputFileSelected: true,
      outputFolderSelected: true,
      outputFolderWritable: true,
      ffmpegReady: true,
      analysisComplete: false,
    });
    const masteringChainReadyReadiness = evaluateMasteringChainReadiness({
      modeId: "balanced_master",
      inputFileSelected: true,
      outputFolderSelected: true,
      outputFolderWritable: true,
      ffmpegReady: true,
      analysisComplete: true,
    });
    const masteringReferenceChainReadiness = evaluateMasteringChainReadiness({
      modeId: "reference_match",
      inputFileSelected: true,
      outputFolderSelected: true,
      outputFolderWritable: true,
      ffmpegReady: true,
      analysisComplete: true,
      referenceFileSelected: false,
    });
    const safeMasteringFilename = buildMasteringFilename({
      sourceBasename: "CON.wav",
      date: "01-01-2026",
      time: "1423",
      mode: "streaming_ready",
      intensity: "medium",
      format: "wav",
    });
    const sanitizedMasteringToken = sanitizeMasteringFilenameToken("bad:path/track?.wav");
    const browserMasteringVerification = verifyMasteringOutput({
      outputPath: "C:/OpenStem/Masters/song_mastered.wav",
      selectedOutputFolder: "C:/OpenStem/Masters",
      expectedExtension: ".wav",
      fileExists: true,
      sizeBytes: 100,
      nativeWriteVerified: false,
      processingReturnedSuccess: true,
    });
    const zeroByteMasteringVerification = verifyMasteringOutput({
      outputPath: "C:/OpenStem/Masters/song_mastered.wav",
      selectedOutputFolder: "C:/OpenStem/Masters",
      expectedExtension: ".wav",
      fileExists: true,
      sizeBytes: 0,
      nativeWriteVerified: true,
      processingReturnedSuccess: true,
    });
    const verifiedMasteringOutput = verifyMasteringOutput({
      outputPath: "C:/OpenStem/Masters/song_mastered.wav",
      selectedOutputFolder: "C:/OpenStem/Masters",
      expectedExtension: ".wav",
      fileExists: true,
      sizeBytes: 100,
      nativeWriteVerified: true,
      processingReturnedSuccess: true,
    });
    const unmeasuredMasteringReport = getUnmeasuredMasteringReport();
    const masteringHistoryPreview = createMasteringHistoryRecord({
      historyId: "mastering-test",
      sourceFile: "C:/Audio/song.wav",
      sourceDuration: "00:03:00",
      outputFile: "C:/OpenStem/Masters/song_mastered.wav",
      settings: defaultMasteringSettings,
      processingBackend: "not_configured",
      outputVerification: browserMasteringVerification,
      beforeAfterReport: unmeasuredMasteringReport,
    });
    const gentleEffectChainReadiness = evaluateAudioEffectChainReadiness({
      chainId: "gentle_master",
      inputVerified: false,
      outputFolderWritable: false,
      processingBackendReady: false,
      ffmpegReady: false,
      analysisMeasured: false,
    });
    const podcastEffectChainReadiness = evaluateAudioEffectChainReadiness({
      chainId: "podcast_normalize",
      inputVerified: true,
      outputFolderWritable: true,
      processingBackendReady: false,
      ffmpegReady: false,
      analysisMeasured: false,
    });
    const gentleChainRunPlan = buildAudioEffectChainRunPlan("gentle_master");
    const ffmpegDependentFormats = AUDIO_FORMAT_SUPPORT_MATRIX.filter((format) => format.status === "ffmpeg_dependent");

    const workflowOrder = [
      "Input needed",
      "Output folder needed",
      "Verified model needed",
      "Backend ready",
      "Ready for local run",
    ];
    const workflowOrderIsStable = workflowOrder.every((label, index) => {
      if (index === 0) return classicConsoleContent.includes(label);
      return classicConsoleContent.indexOf(label) > classicConsoleContent.indexOf(workflowOrder[index - 1]);
    });
    assert(
      classicConsoleContent.includes("Main Audio Separator Workflow") &&
        classicConsoleContent.includes("Run Readiness") &&
        classicConsoleContent.includes(
          "Select input - select output - choose model - check readiness - run - show progress - show real",
        ) &&
        classicConsoleContent.includes("outputs.") &&
        classicConsoleContent.includes("Proof blocked: verified model missing") &&
        classicConsoleContent.includes("Open Model Manager to add or verify a model.") &&
        classicConsoleContent.includes("PROGRESS LOG TERMINAL AREA") &&
        classicConsoleContent.includes("Verified AI output files:") &&
        classicConsoleContent.includes("Run AI Separation") &&
        classicConsoleContent.includes("Verified proof model available") &&
        classicConsoleContent.includes("Verified proof model missing") &&
        workflowOrderIsStable,
      "Test 11.0a: Classic Console keeps UVR5-style main workflow visually ordered",
      "Classic Console main path is missing ordered input/output/model/readiness/run/progress/results labels",
    );
    assert(
      [
        "Input missing",
        "Output folder missing",
        "Verified model missing",
        "Backend missing",
        "FFmpeg missing",
        "Python missing",
        "audio-separator missing",
        "PyTorch missing",
        "Browser preview cannot run native separation",
        "Model source requires authentication",
        "Model hash mismatch",
      ].every((label) => classicConsoleContent.includes(label)) &&
        [
          "Large model may be slow",
          "GPU recommended",
          "DirectML not locally proven",
          "Static VRAM estimate",
          "Hash unavailable",
          "Experimental backend",
        ].every((label) => classicConsoleContent.includes(label)) &&
        classicConsoleContent.includes("Blocked: ${primaryWorkflowBlockers.length} requirements missing"),
      "Test 11.0b: Classic Console uses consistent blocker and warning vocabulary",
      "Classic Console blocker/warning labels drifted away from the shared truth-state vocabulary",
    );
    assert(
      appContent.includes("Primary workflow") &&
        appContent.includes("Post-processing") &&
        appContent.includes("Setup and proof") &&
        appContent.includes("Advanced / reference") &&
        appContent.includes("Requires verified stems") &&
        appContent.includes("Non-AI FFmpeg conversion") &&
        appContent.includes("Local Transcription") &&
        appContent.includes("Speech-to-text / Not proof") &&
        appContent.includes("Planning View / Not active") &&
        appContent.includes("Audio-to-MIDI only") &&
        appContent.includes("Experimental / connector-dependent") &&
        appContent.includes("Defaults for new jobs") &&
        mixerContent.includes("Requires verified stem session") &&
        batchEncoderContent.includes("Non-AI FFmpeg conversion") &&
        basicPitchContent.includes("Audio-to-MIDI only / Not stem separation") &&
        sunoContent.includes("Experimental / connector-dependent") &&
        globalSettingsContent.includes("Defaults for new jobs") &&
        hostSetupGuideContent.includes("Golden Proof Model: Missing") &&
        hostSetupGuideContent.includes("Golden Proof Model: Hash mismatch") &&
        hostSetupGuideContent.includes("Golden Proof Model: Proof ready") &&
        downloaderContent.includes("Supports Audio Separator path: add or verify a model before running separation."),
      "Test 11.0c: Secondary and advanced panels stay labeled below the main separator workflow",
      "Secondary/advanced panel labels no longer describe their limited role clearly",
    );
    assert(
      appContent.includes("local_transcription") &&
        appContent.includes("LocalTranscriptionWorkspace") &&
        manualsContent.includes('sectionId: "local_transcription"') &&
        manualsContent.includes("Local Transcription Manual") &&
        localTranscriptionContent.includes("Local Transcription Workspace") &&
        localTranscriptionContent.includes("Speech-to-text / Not stem separation proof") &&
        localTranscriptionContent.includes("TRANSCRIPTION_DRY_RUN_ONLY") &&
        localTranscriptionContent.includes("Browser Preview / Not runnable") &&
        localTranscriptionContent.includes("Native transcription runner is Planned / Not active") &&
        localTranscriptionContent.includes("Start Transcription - Planned / Not active") &&
        !localTranscriptionContent.includes("TurboScribe"),
      "Test 11.0d: Local Transcription submenu is present but not branded as TurboScribe or runnable",
      "Local Transcription submenu is missing, branded incorrectly, or implies native execution",
    );
    assert(
      localTranscriptionContent.includes("WHISPER_MODEL_MISSING") &&
        transcriptionPolicyContent.includes("WHISPER_BACKEND_NOT_INSTALLED") &&
        transcriptionPolicyContent.includes("WHISPER_FFMPEG_MISSING") &&
        transcriptionPolicyContent.includes("TRANSCRIPTION_INPUT_MISSING") &&
        transcriptionPolicyContent.includes("TRANSCRIPTION_OUTPUT_FOLDER_MISSING") &&
        transcriptionPolicyContent.includes("TRANSCRIPT_OUTPUT_NOT_VERIFIED") &&
        localTranscriptionContent.includes("PDF export Planned / Not active") &&
        localTranscriptionContent.includes("Timestamps unavailable") &&
        localTranscriptionContent.includes("Diarization unavailable") &&
        localTranscriptionContent.includes("History starts empty") &&
        localTranscriptionContent.includes("A history entry requires a real completed native transcription job.") &&
        localTranscriptionContent.includes("Transcript text is not written to logs by default.") &&
        transcriptionDoesNotAffectReleaseGate().includes("does not approve Beta Candidate"),
      "Test 11.0e: Local Transcription truth states stay blocked, local, and non-proof",
      "Local Transcription is missing blocked readiness, export, history, timestamp, privacy, or Beta-boundary states",
    );
    const expectedTranscriptionModels = [
      "tiny",
      "tiny.en",
      "base",
      "base.en",
      "small",
      "small.en",
      "medium",
      "medium.en",
      "large",
      "large-v2",
      "large-v3",
      "turbo",
    ];
    const expectedFilenamePreview = buildTranscriptionFilenamePreview({
      template: DEFAULT_TRANSCRIPTION_FILENAME_TEMPLATE,
      title: "Joe Dirt",
      sessionNumber: "003",
      date: "01-01-2026",
      durationMin: 124,
      format: "pdf",
    });
    const unsafeFilenamePreview = buildTranscriptionFilenamePreview({
      template: "{safe_title}_{source_basename}_{date}.pdf",
      title: "..\\CON:Bad*Name",
      sessionNumber: "001",
      date: "01/01/2026",
      durationMin: 3,
      sourceBasename: "..\\NUL:source.wav",
      format: "pdf",
    });
    assert(
      expectedTranscriptionModels.every((modelId) => WHISPER_MODEL_OPTIONS.some((model) => model.id === modelId)) &&
        expectedFilenamePreview.filename === "Joe_Dirt_session_number_003_01-01-2026_124_min.pdf" &&
        unsafeFilenamePreview.filename.endsWith(".pdf") &&
        !/[<>:"/\\|?*]/.test(unsafeFilenamePreview.filename) &&
        Array.from(unsafeFilenamePreview.filename).every((char) => char.charCodeAt(0) >= 32) &&
        !unsafeFilenamePreview.filename.includes("..") &&
        transcriptionPolicyContent.includes("TRANSCRIPTION_READINESS_CODES") &&
        transcriptionPolicyContent.includes("transcriptionDoesNotAffectReleaseGate") &&
        transcriptionFilenamePolicyContent.includes("WINDOWS_RESERVED_BASENAMES") &&
        transcriptionFilenamePolicyContent.includes("unsupported tokens"),
      "Test 11.0f: Transcription model policy and filename template safety remain deterministic",
      "Whisper model list or filename policy regressed",
    );
    assert(
      skillsReadmeContent.includes("local-transcription-workflow") &&
        localTranscriptionSkillContent.includes("Transcription is not stem separation.") &&
        localTranscriptionSkillContent.includes("Transcription does not approve Beta Candidate.") &&
        localTranscriptionSkillContent.includes("Whisper weights must not be committed.") &&
        localTranscriptionSkillContent.includes("HAR captures are sensitive reference artifacts.") &&
        localTranscriptionWorkflowDocContent.includes("Transcription does not prove separator models") &&
        localTranscriptionWorkflowDocContent.includes(
          "Whisper model readiness is separate from OpenStem separator model readiness.",
        ) &&
        localTranscriptionWorkflowDocContent.includes("PDF completion requires") &&
        localTranscriptionWorkflowDocContent.includes("Recent Files starts empty") &&
        localTranscriptionWorkflowDocContent.includes("Fast, Balanced, Accurate, and Maximum Accuracy") &&
        localTranscriptionWorkflowDocContent.includes("`{folder}`") &&
        localTranscriptionWorkflowDocContent.includes("`{status}`") &&
        transcriptionReferenceAuditContent.includes("dparksports/turboscribe") &&
        transcriptionReferenceAuditContent.includes("Sanitized HAR Note") &&
        transcriptionReferenceAuditContent.includes("Whisper can hallucinate or repeat text during silence") &&
        transcriptionReferenceAuditContent.includes("Keep release state Hardened Functional Alpha") &&
        !packageJsonContent.includes('"openai-whisper"') &&
        !packageJsonContent.includes('"faster-whisper"') &&
        !packageJsonContent.includes('"whisperx"'),
      "Test 11.0g: Local Transcription docs and skill preserve proof, model-weight, and reference boundaries",
      "Local Transcription docs/skill are missing proof boundaries or package.json gained Whisper dependencies",
    );
    assert(
      localTranscriptionContent.includes("Recent Files") &&
        localTranscriptionContent.includes("Folders") &&
        localTranscriptionContent.includes("Uncategorized") &&
        localTranscriptionContent.includes("New Folder - Planned / Not active") &&
        TRANSCRIPTION_BULK_ACTIONS.every((action) => transcriptionPolicyContent.includes(action)) &&
        TRANSCRIPTION_DASHBOARD_FOLDERS.every((folder) => transcriptionPolicyContent.includes(folder)) &&
        TRANSCRIPTION_MODE_PRESETS.every((mode) => transcriptionPolicyContent.includes(mode.label)) &&
        [
          "Auto Detect",
          "English",
          "English US",
          "English UK",
          "Popular languages",
          "More languages",
          "Other languages",
        ].every((label) => transcriptionPolicyContent.includes(label) || localTranscriptionContent.includes(label)) &&
        TRANSCRIPTION_LANGUAGE_OPTIONS.some((language) => language.label === "Auto Detect") &&
        localTranscriptionContent.includes("Speaker recognition Planned / Requires diarization backend") &&
        localTranscriptionContent.includes("DIARIZATION_BACKEND_MISSING") &&
        localTranscriptionContent.includes("DIARIZATION_MODEL_MISSING") &&
        localTranscriptionContent.includes("Detect Automatically") &&
        transcriptionPolicyContent.includes("8 speakers") &&
        localTranscriptionContent.includes("Translate/transcribe to English") &&
        localTranscriptionContent.includes("Restore audio") &&
        localTranscriptionContent.includes("Additional safe tokens") &&
        transcriptionFilenamePolicyContent.includes('"folder"') &&
        transcriptionFilenamePolicyContent.includes('"status"') &&
        !["TurboScribe", "Cheetah", "Dolphin", "Whale"].some((label) => localTranscriptionContent.includes(label)),
      "Test 11.0h: HAR-informed transcription dashboard stays local, blocked, and unbranded",
      "Local Transcription dashboard/mode/folder/speaker/token guardrails regressed",
    );
    assert(
      gitignoreContent.includes("*.har") &&
        turboscribeHarAuditContent.includes("HAR files are sensitive") &&
        turboscribeHarAuditContent.includes("No cookies") &&
        turboscribeHarAuditContent.includes("No auth headers") &&
        turboscribeHarAuditContent.includes("No raw request bodies") &&
        turboscribeHarAuditContent.includes("No raw response bodies") &&
        turboscribeHarAuditContent.includes("No session IDs") &&
        turboscribeHarAuditContent.includes("No transcript IDs") &&
        turboscribeHarAuditContent.includes("No TurboScribe endpoints are reused") &&
        turboscribeHarAuditContent.includes("No cloud upload behavior") &&
        turboscribeHarAuditContent.includes("Entries: 219") &&
        turboscribeHarAuditContent.includes("Safe label scan confirmed") &&
        !packageJsonContent.includes("turboscribe.ai.har"),
      "Test 11.0i: Sanitized HAR audit excludes private capture data and keeps HAR files ignored",
      "HAR handling doc or ignore rules regressed",
    );
    const parsedSyntheticVtt = parseVttTranscriptContent(SYNTHETIC_VTT_FIXTURE, "synthetic.vtt");
    const missingVtt = parseVttTranscriptContent("", "missing.vtt");
    const malformedVtt = parseVttTranscriptContent("00:00:01.000 --> 00:00:02.000\nNo header", "bad.vtt");
    const speakerRenameMap = buildSpeakerRenameMap(parsedSyntheticVtt.speakers, {
      "Speaker 1": "Interviewer",
      "Speaker 2": "Guest",
    });
    const renamedSyntheticVtt = applySpeakerRenameMap(parsedSyntheticVtt.segments, speakerRenameMap);
    const cleanRenamedTranscript = segmentsToCleanTranscript(renamedSyntheticVtt.segments, {
      includeSpeakers: true,
      includeTimestamps: true,
    });
    const renamedVttContent = segmentsToRenamedVttContent(renamedSyntheticVtt.segments);
    const jsonArchiveContent = segmentsToJsonArchive(renamedSyntheticVtt.segments, speakerRenameMap, {
      title: "Synthetic intake test",
      sourcePath: "synthetic.vtt",
    });
    const archiveExportPlan = buildTranscriptArchiveExportPlan({
      title: "Synthetic Intake Test",
      sessionNumber: "001",
      date: "01-01-2026",
      durationMin: 1,
      durationHhmmss: "00h00m08s",
      sourceBasename: "synthetic.vtt",
      transcriptId: "synthetic_transcript",
      folder: "Renamed Transcript Archive",
      speakerCount: parsedSyntheticVtt.speakers.length,
    });
    const speakerCountFilenamePreview = buildTranscriptionFilenamePreview({
      template: "{safe_title}_{speaker_count}.txt",
      title: "Synthetic Intake Test",
      sessionNumber: "001",
      date: "01-01-2026",
      durationMin: 1,
      speakerCount: parsedSyntheticVtt.speakers.length,
      format: "txt",
    });
    const archiveFilenamesAreSafe = archiveExportPlan.outputs.every((output) => {
      return !/[<>:"/\\|?*]/.test(output.filename) && !output.filename.includes("..");
    });
    const failedExportVerification = verifyTranscriptExportResult({
      path: "synthetic.txt",
      exists: false,
      sizeBytes: 0,
    });
    const zeroByteExportVerification = verifyTranscriptExportResult({
      path: "synthetic.txt",
      exists: true,
      sizeBytes: 0,
    });
    const completeExportVerification = verifyTranscriptExportResult({
      path: "synthetic.txt",
      exists: true,
      sizeBytes: 12,
    });
    const vttAutomationPlan = buildVttAutomationWorkflowPlan({
      mode: DEFAULT_TRANSCRIPTION_AUTOMATION_MODE,
      sourcePath: "synthetic.vtt",
      title: "Synthetic Intake Test",
      sessionNumber: "001",
      speakerOverrides: { "Speaker 1": "Interviewer" },
    });
    const failedVttAutomationPlan = buildVttAutomationWorkflowPlan({
      vttContent: "not a vtt",
      sourcePath: "bad.vtt",
    });
    const recordingAutomationPlan = buildRecordingAutomationWorkflowPlan({
      nativeRecordingImplemented: false,
      normalizerEnabled: true,
    });
    const importedAudioAutomationPlan = buildImportedAudioAutomationWorkflowPlan({
      copyIntoLibrary: true,
    });
    const postProcessingEditorState = buildPostProcessingEditorState();
    const overwriteBlocked = evaluateOverwritePolicy({
      policy: "never_overwrite",
      previousExportExists: true,
      nativeWriteVerified: false,
    });
    const overwriteRequiresConfirmation = evaluateOverwritePolicy({
      policy: "ask_before_overwrite",
      previousExportExists: true,
      nativeWriteVerified: false,
    });
    const overwriteVerified = evaluateOverwritePolicy({
      policy: "overwrite_previous_export",
      previousExportExists: true,
      nativeWriteVerified: true,
    });
    const saveNewCopyVerified = evaluateOverwritePolicy({
      policy: "save_new_copy_with_suffix",
      previousExportExists: true,
      nativeWriteVerified: true,
    });
    const checkpointWorkflowPlan = buildCheckpointWorkflowPlan({
      sourceType: "imported_vtt",
      presetId: "stop_at_transcript",
      stopAfterStageId: "transcript_preview",
      editedTranscript: true,
      editedSpeakers: true,
      metadataOnlyHistory: true,
    });
    const recordedAudioCheckpointPlan = buildCheckpointWorkflowPlan({
      sourceType: "recorded_audio",
      presetId: "stop_at_transcript",
      completedStageIds: ["source_intake", "recording_complete", "audio_saved"],
      metadataOnlyHistory: true,
    });
    const promptOnlyCheckpointPlan = buildCheckpointWorkflowPlan({
      sourceType: "pasted_transcript",
      presetId: "prompt_only",
      stopAfterStageId: "prompt_output_review",
      metadataOnlyHistory: true,
    });
    const failedCheckpointPlan = buildCheckpointWorkflowPlan({
      sourceType: "existing_history_item",
      presetId: "export_only",
      failedStageId: "transcript_export_saved",
      completedStageIds: ["source_intake", "transcript_preview", "speaker_review", "title_filename_review"],
      metadataOnlyHistory: true,
    });
    const checkpointResumeSummary = getCheckpointResumeSummary(failedCheckpointPlan);
    assert(
      recordingVttArchiveAuditContent.includes("DeltaCircuit/react-media-recorder") &&
        recordingVttArchiveAuditContent.includes("samhirtarif/react-audio-recorder") &&
        recordingVttArchiveAuditContent.includes("renanmakoto/voice-recorder-app") &&
        recordingVttArchiveAuditContent.includes("ishandeveloper/Recordify") &&
        recordingVttArchiveAuditContent.includes("youngerheart/electron-recorder") &&
        recordingVttArchiveAuditContent.includes("O4FDev/electron-system-audio-recorder") &&
        recordingVttArchiveAuditContent.includes("osk/node-webvtt") &&
        recordingVttArchiveAuditContent.includes("webvtt-parser") &&
        recordingVttArchiveAuditContent.includes("octimot/StoryToolkitAI") &&
        recordingVttArchiveAuditContent.includes("No new dependency is recommended now.") &&
        recordingVttArchiveAuditContent.includes("PDF/DOCX exporter packages: rejected for now") &&
        !packageJsonContent.includes('"react-media-recorder"') &&
        !packageJsonContent.includes('"react-audio-voice-recorder"') &&
        !packageJsonContent.includes('"webvtt-parser"') &&
        !packageJsonContent.includes('"node-webvtt"'),
      "Test 11.0j: Recording/VTT/archive reference audit exists and avoids dependency churn",
      "Reference audit is missing inspected projects or package.json gained unapproved recorder/VTT dependencies",
    );
    assert(
      skillsReadmeContent.includes("transcription-intake-workflow") &&
        transcriptionIntakeSkillContent.includes("Recording/import/export is not stem separation.") &&
        transcriptionIntakeSkillContent.includes("Browser mode cannot claim durable local file creation") &&
        transcriptionIntakeSkillContent.includes("VTT import must parse timestamps and text locally.") &&
        transcriptionIntakeSkillContent.includes("Speaker rename must be editable and reversible.") &&
        transcriptionIntakeSkillContent.includes("Export success requires output file existence and nonzero size.") &&
        transcriptionIntakeSkillContent.includes("Do not upload audio or transcript text by default.") &&
        transcriptionIntakeWorkflowDocContent.includes("Record or Import") &&
        transcriptionIntakeWorkflowDocContent.includes("Make speech louder for transcription") &&
        transcriptionIntakeWorkflowDocContent.includes("Imported VTT Transcripts") &&
        transcriptionIntakeWorkflowDocContent.includes("`{speaker_count}`") &&
        vttArchiveExportWorkflowDocContent.includes("Auto export after rename: off") &&
        vttArchiveExportWorkflowDocContent.includes("Native Electron mode is required") &&
        vttArchiveExportWorkflowDocContent.includes("verifyTranscriptExport(path)"),
      "Test 11.0k: Transcription intake docs and skill preserve local, non-proof, verified-export rules",
      "Transcription intake docs or skill are missing local/non-proof/export verification boundaries",
    );
    assert(
      localTranscriptionContent.includes("Record or Import") &&
        localTranscriptionContent.includes("In-Session Recording") &&
        localTranscriptionContent.includes("Imported Audio Sessions") &&
        localTranscriptionContent.includes("Transcript/VTT Intake") &&
        localTranscriptionContent.includes("Microphone input selector") &&
        localTranscriptionContent.includes("Refresh input devices") &&
        localTranscriptionContent.includes("Low / Medium / High recording quality") &&
        localTranscriptionContent.includes("Make speech louder for transcription") &&
        localTranscriptionContent.includes("Recordings folder selector") &&
        localTranscriptionContent.includes("VTT source folder selector") &&
        localTranscriptionContent.includes("Rename speakers") &&
        localTranscriptionContent.includes("Archive & Export - Native writer required") &&
        localTranscriptionContent.includes("Auto export after rename: off by default") &&
        localTranscriptionContent.includes("Original VTT stays untouched") &&
        localTranscriptionContent.includes("Speaker rename changes labels only") &&
        localTranscriptionContent.includes("it is not diarization") &&
        localTranscriptionContent.includes("PDF export Planned / Not active") &&
        !localTranscriptionContent.includes("Recording complete") &&
        !localTranscriptionContent.includes("Export complete") &&
        !localTranscriptionContent.includes("PDF export complete") &&
        !localTranscriptionContent.includes("DOCX export complete"),
      "Test 11.0l: Local Transcription exposes record/import/VTT/archive controls without fake completion",
      "Record/import/VTT/archive UI is missing or implies completed recording/export work",
    );
    assert(
      TRANSCRIPTION_INTAKE_FOLDER_POLICY.length === 7 &&
        TRANSCRIPTION_INTAKE_FOLDER_POLICY.some((folder) => folder.label === "In-Session Recordings") &&
        TRANSCRIPTION_INTAKE_FOLDER_POLICY.some((folder) => folder.label === "Imported Audio Sessions") &&
        TRANSCRIPTION_INTAKE_FOLDER_POLICY.some((folder) => folder.label === "Imported VTT Transcripts") &&
        TRANSCRIPTION_INTAKE_FOLDER_POLICY.some((folder) => folder.label === "Renamed Transcript Archive") &&
        TRANSCRIPTION_INTAKE_FOLDER_POLICY.some((folder) => folder.label === "Exported PDFs") &&
        TRANSCRIPTION_INTAKE_FOLDER_POLICY.some((folder) => folder.label === "Exported Word Documents") &&
        TRANSCRIPTION_INTAKE_FOLDER_POLICY.some((folder) => folder.label === "Exported TXT/JSON/SRT/VTT") &&
        TRANSCRIPTION_INTAKE_FOLDER_POLICY.every((folder) => folder.userCanChange) &&
        TRANSCRIPTION_INTAKE_FOLDER_POLICY.every((folder) =>
          folder.logicalPath.startsWith("{userData}/OpenStem/Transcription/"),
        ) &&
        TRANSCRIPTION_INTAKE_DIAGNOSTIC_CODES.includes("RECORDING_FOLDER_MISSING") &&
        TRANSCRIPTION_INTAKE_DIAGNOSTIC_CODES.includes("ARCHIVE_FOLDER_NOT_WRITABLE") &&
        TRANSCRIPTION_INTAKE_DIAGNOSTIC_CODES.includes("EXPORT_OUTPUT_ZERO_BYTES") &&
        RECORDING_QUALITY_PRESETS.map((preset) => preset.label).join(",") === "Low,Medium,High" &&
        ![localTranscriptionContent, transcriptionIntakeWorkflowDocContent, vttTranscriptImportContent].some(
          (content) => content.includes("C:\\Users\\Consumer"),
        ),
      "Test 11.0m: Transcription intake folder and diagnostic policy is visible, writable-aware, and platform-safe",
      "Folder policy, diagnostic codes, recording quality presets, or hardcoded path guardrails regressed",
    );
    assert(
      missingVtt.status === "VTT_FILE_MISSING" &&
        malformedVtt.status === "VTT_PARSE_FAILED" &&
        parsedSyntheticVtt.ok &&
        parsedSyntheticVtt.status === "VTT_IMPORTED" &&
        parsedSyntheticVtt.speakerStatus === "VTT_SPEAKERS_DETECTED" &&
        parsedSyntheticVtt.segments.length === 2 &&
        parsedSyntheticVtt.segments[0].start === "00:00:01.000" &&
        parsedSyntheticVtt.segments[0].end === "00:00:04.000" &&
        parsedSyntheticVtt.segments[0].startSeconds === 1 &&
        parsedSyntheticVtt.speakers.includes("Speaker 1") &&
        parsedSyntheticVtt.speakers.includes("Speaker 2") &&
        renamedSyntheticVtt.state === "SPEAKER_RENAME_APPLIED" &&
        renamedSyntheticVtt.message.includes("No diarization was inferred or changed.") &&
        cleanRenamedTranscript.includes("Interviewer:") &&
        cleanRenamedTranscript.includes("Guest:") &&
        renamedVttContent.startsWith("WEBVTT") &&
        renamedVttContent.includes("Interviewer:") &&
        jsonArchiveContent.includes("OpenStem AI Audio Workstation") &&
        jsonArchiveContent.includes("not stem separation proof"),
      "Test 11.0n: VTT parser handles synthetic cues, timestamps, speakers, and reversible rename truthfully",
      "VTT import parser, speaker detection, rename map, or archive serialization regressed",
    );
    assert(
      transcriptionFilenamePolicyContent.includes('"speaker_count"') &&
        VTT_ARCHIVE_FILENAME_TEMPLATE.endsWith("_renamed.vtt") &&
        speakerCountFilenamePreview.filename === "Synthetic_Intake_Test_2.txt" &&
        TRANSCRIPT_PDF_EXPORT_TEMPLATE.endsWith(".pdf") &&
        TRANSCRIPT_DOCX_EXPORT_TEMPLATE.endsWith(".docx") &&
        TRANSCRIPT_TXT_EXPORT_TEMPLATE.endsWith(".txt") &&
        TRANSCRIPT_JSON_EXPORT_TEMPLATE.endsWith(".json") &&
        archiveExportPlan.autoExportAfterRename === false &&
        archiveExportPlan.keepOriginalVtt === true &&
        archiveExportPlan.overwriteOriginalVtt === false &&
        archiveExportPlan.sourceFilesDeletedByDefault === false &&
        archiveExportPlan.outputs.some(
          (output) => output.format === "vtt" && output.status === "native_writer_required",
        ) &&
        archiveExportPlan.outputs.some(
          (output) => output.format === "txt" && output.status === "native_writer_required",
        ) &&
        archiveExportPlan.outputs.some(
          (output) => output.format === "json" && output.status === "native_writer_required",
        ) &&
        archiveExportPlan.outputs.some((output) => output.format === "pdf" && output.status === "planned_not_active") &&
        archiveExportPlan.outputs.some(
          (output) => output.format === "docx" && output.status === "planned_not_active",
        ) &&
        archiveFilenamesAreSafe &&
        TRANSCRIPT_ARCHIVE_EXPORT_POLICY.autoExportAfterRename === false &&
        failedExportVerification.state === "EXPORT_OUTPUT_NOT_VERIFIED" &&
        zeroByteExportVerification.state === "EXPORT_OUTPUT_ZERO_BYTES" &&
        completeExportVerification.state === "ARCHIVE_EXPORT_COMPLETE",
      "Test 11.0o: Archive/export plan uses safe filenames and requires real output verification",
      "Archive/export filename templates, auto-export policy, or output verification states regressed",
    );
    assert(
      vttWorkflowDoesNotAffectReleaseGate().includes("not stem separation proof") &&
        vttWorkflowDoesNotAffectReleaseGate().includes("does not approve Beta Candidate") &&
        transcriptionIntakeWorkflowDocContent.includes("Browser preview can show planned paths") &&
        transcriptionIntakeWorkflowDocContent.includes("Native Electron mode is required") &&
        vttArchiveExportWorkflowDocContent.includes("no raw transcript logging") &&
        vttArchiveExportWorkflowDocContent.includes("no cloud upload") &&
        localTranscriptionContent.includes("Transcript text is not written to logs by default.") &&
        localTranscriptionContent.includes("No user audio is uploaded by this workspace."),
      "Test 11.0p: Recording/VTT/archive workflow stays privacy-aware and does not affect release gates",
      "Recording/VTT/archive workflow can be mistaken for proof, cloud upload, or logged transcript text",
    );
    assert(
      skillsReadmeContent.includes("transcription-automation-workflow") &&
        transcriptionAutomationSkillContent.includes(
          "Automatic workflow should reduce friction but remain reversible.",
        ) &&
        transcriptionAutomationSkillContent.includes(
          "Manual workflow should allow the user to inspect and edit every step.",
        ) &&
        transcriptionAutomationSkillContent.includes(
          "Hybrid workflow should allow automatic processing first and cleanup later.",
        ) &&
        transcriptionAutomationSkillContent.includes("Completed steps must be preserved if a later step fails.") &&
        transcriptionAutomationWorkflowDocContent.includes("Automatic then Review") &&
        transcriptionAutomationWorkflowDocContent.includes("Default mode: Automatic then Review.") &&
        transcriptionAutomationWorkflowDocContent.includes("Default: Ask before overwrite.") &&
        transcriptionAutomationWorkflowDocContent.includes(
          "Source -> Intake -> Clean/Normalize -> Transcribe/Parse -> Edit Speakers/Title -> Export/Archive -> Done",
        ) &&
        localTranscriptionWorkflowDocContent.includes("## Automation Modes") &&
        localTranscriptionWorkflowDocContent.includes("Auto-overwrite remains off"),
      "Test 11.0q: Transcription automation skill and docs define modes, overwrite defaults, and recoverable stages",
      "Transcription automation docs or skill are missing mode/default/recovery rules",
    );
    assert(
      DEFAULT_TRANSCRIPTION_AUTOMATION_MODE === "automatic_then_review" &&
        TRANSCRIPTION_AUTOMATION_MODES.length === 3 &&
        TRANSCRIPTION_AUTOMATION_MODES.some(
          (mode) => mode.label === "Automatic" && mode.userLabel === "Run the full workflow with defaults.",
        ) &&
        TRANSCRIPTION_AUTOMATION_MODES.some(
          (mode) => mode.label === "Manual" && mode.userLabel === "Let me confirm each step.",
        ) &&
        TRANSCRIPTION_AUTOMATION_MODES.some(
          (mode) =>
            mode.label === "Automatic then Review" &&
            mode.userLabel === "Process now, edit title/speakers/export later." &&
            mode.defaultSelected,
        ) &&
        TRANSCRIPTION_WORKFLOW_STAGE_ORDER.join(" -> ") ===
          "Source -> Intake -> Clean/Normalize -> Transcribe/Parse -> Edit Speakers/Title -> Export/Archive -> Done" &&
        localTranscriptionContent.includes("Workflow mode") &&
        localTranscriptionContent.includes("Automatic then Review") &&
        localTranscriptionContent.includes("Process now, edit title/speakers/export later.") &&
        localTranscriptionContent.includes("End-to-end flow"),
      "Test 11.0r: Local Transcription exposes Automatic, Manual, and Automatic then Review modes with default hybrid mode",
      "Workflow mode selector or default automation mode regressed",
    );
    assert(
      vttAutomationPlan.status === "vtt_imported_export_ready" &&
        vttAutomationPlan.summary.includes("VTT imported. Speakers detected. Export ready.") &&
        vttAutomationPlan.stages.some((stage) => stage.label === "Transcribe/Parse" && stage.status === "complete") &&
        vttAutomationPlan.stages.some((stage) => stage.label === "Export/Archive" && stage.status === "ready") &&
        vttAutomationPlan.archiveExportPlan?.outputs.some(
          (output) => output.format === "txt" && output.status === "native_writer_required",
        ) &&
        vttAutomationPlan.archiveExportPlan?.outputs.some(
          (output) => output.format === "pdf" && output.status === "planned_not_active",
        ) &&
        vttAutomationPlan.historyRecord.sourceType === "vtt" &&
        vttAutomationPlan.historyRecord.workflowMode === DEFAULT_TRANSCRIPTION_AUTOMATION_MODE &&
        vttAutomationPlan.historyRecord.title === "Synthetic Intake Test" &&
        vttAutomationPlan.completedStepsPreservedOnFailure === true &&
        failedVttAutomationPlan.vtt?.status === "VTT_PARSE_FAILED" &&
        failedVttAutomationPlan.summary.includes("Original file is preserved"),
      "Test 11.0s: VTT automation parses, prepares export/archive, creates history preview, and preserves failed parse recovery",
      "VTT automation plan can fake completion or fails to preserve parse recovery boundaries",
    );
    assert(
      recordingAutomationPlan.status === "recording_planned_not_active" &&
        recordingAutomationPlan.summary.includes("Recording workflow is Planned / Not active") &&
        recordingAutomationPlan.nativeWriteRequired &&
        recordingAutomationPlan.historyRecord.errors.includes("Native recording is not implemented.") &&
        importedAudioAutomationPlan.status === "imported_audio_native_required" &&
        importedAudioAutomationPlan.summary.includes("Imported audio copy requires native write verification") &&
        importedAudioAutomationPlan.historyRecord.managedCopyPath?.includes("Imported Audio Sessions") &&
        localTranscriptionContent.includes("recording_planned_not_active") &&
        localTranscriptionContent.includes("imported_audio_native_required") &&
        localTranscriptionContent.includes("Original files are never deleted by default."),
      "Test 11.0t: Recording and imported-audio automation remain native-required and non-destructive",
      "Recording/imported-audio automation can imply fake native output or source-file deletion",
    );
    assert(
      postProcessingEditorState.editableFields.includes("title") &&
        postProcessingEditorState.editableFields.includes("speaker names") &&
        postProcessingEditorState.editableFields.includes("transcript text") &&
        postProcessingEditorState.editableFields.includes("overwrite policy") &&
        postProcessingEditorState.actions.includes("Save changes") &&
        postProcessingEditorState.actions.includes("Regenerate exports") &&
        postProcessingEditorState.actions.includes("Export to same folder") &&
        postProcessingEditorState.actions.includes("Export to new folder") &&
        postProcessingEditorState.actions.includes("Overwrite previous export") &&
        postProcessingEditorState.actions.includes("Save as new export") &&
        postProcessingEditorState.actions.includes("Reset speaker names") &&
        postProcessingEditorState.actions.includes("Restore original transcript") &&
        postProcessingEditorState.regenerateExportAvailable &&
        localTranscriptionContent.includes("Post-processing editor") &&
        localTranscriptionContent.includes("Transcript text editor") &&
        localTranscriptionContent.includes("Regenerate exports") &&
        localTranscriptionContent.includes("Restore original transcript"),
      "Test 11.0u: Post-processing editor supports title, speaker, transcript, and regenerate-export edits",
      "Post-processing editor fields/actions regressed",
    );
    assert(
      DEFAULT_TRANSCRIPTION_OVERWRITE_POLICY === "ask_before_overwrite" &&
        TRANSCRIPTION_OVERWRITE_POLICY_OPTIONS.some(
          (policy) => policy.label === "Never overwrite" && policy.sourceFilesAffected === false,
        ) &&
        TRANSCRIPTION_OVERWRITE_POLICY_OPTIONS.some(
          (policy) => policy.label === "Ask before overwrite" && policy.defaultSelected,
        ) &&
        TRANSCRIPTION_OVERWRITE_POLICY_OPTIONS.some((policy) => policy.label === "Overwrite previous export") &&
        TRANSCRIPTION_OVERWRITE_POLICY_OPTIONS.some((policy) => policy.label === "Save new copy with suffix") &&
        overwriteBlocked.state === "OVERWRITE_NOT_ALLOWED" &&
        overwriteRequiresConfirmation.state === "OVERWRITE_CONFIRMATION_REQUIRED" &&
        overwriteVerified.state === "EXPORT_OVERWRITTEN" &&
        saveNewCopyVerified.state === "EXPORT_SAVED_AS_NEW_COPY" &&
        localTranscriptionContent.includes("Overwrite policy") &&
        localTranscriptionContent.includes("Auto-overwrite"),
      "Test 11.0v: Overwrite and resave policy defaults to ask-before-overwrite and never touches source files",
      "Overwrite policy defaults or verified overwrite states regressed",
    );
    assert(
      DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoCreateHistoryRecord === true &&
        DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoExportAfterVttImport === false &&
        DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoExportAfterRecordingTranscription === false &&
        DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoExportAfterImportedAudioTranscription === false &&
        DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoCopyFinalPlainTextToClipboard === false &&
        DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoOverwrite === false &&
        DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.exportFormats.txt.selectedByDefault === true &&
        DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.exportFormats.txt.status === "native_writer_required" &&
        DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.exportFormats.pdf.selectedByDefault === false &&
        DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.exportFormats.docx.selectedByDefault === false &&
        localTranscriptionContent.includes("Auto-export and history") &&
        localTranscriptionContent.includes("Auto-export after VTT import") &&
        localTranscriptionContent.includes("Auto-copy final plain text to clipboard") &&
        localTranscriptionContent.includes("History item preview"),
      "Test 11.0w: Auto-export settings are conservative and do not overwrite or copy text by default",
      "Auto-export defaults became risky or UI no longer exposes them",
    );
    assert(
      TRANSCRIPTION_AUTOMATION_FOLDER_POLICY.length === 7 &&
        [
          "In-Session Recordings",
          "Imported Audio Sessions",
          "Imported VTT Source Folder",
          "Renamed Transcript Archive",
          "Transcript Export Folder",
          "PDF Export Folder",
          "DOCX Export Folder",
        ].every((label) => TRANSCRIPTION_AUTOMATION_FOLDER_POLICY.some((folder) => folder.label === label)) &&
        TRANSCRIPTION_AUTOMATION_FOLDER_POLICY.every((folder) =>
          folder.logicalPath.startsWith("{userData}/OpenStem/Transcription/"),
        ) &&
        TRANSCRIPTION_AUTOMATION_FOLDER_POLICY.every((folder) => folder.status === "ready_after_native_check") &&
        localTranscriptionContent.includes("Automation folder policy") &&
        ![localTranscriptionContent, transcriptionAutomationWorkflowDocContent].some((content) =>
          content.includes("C:\\Users\\Consumer"),
        ),
      "Test 11.0x: Automation folder policy exposes seven platform-safe source/archive/export folders",
      "Automation folder policy labels, defaults, or hardcoded path guardrails regressed",
    );
    assert(
      TRANSCRIPTION_AUTOMATION_DIAGNOSTIC_CODES.includes("VTT_SELECTED") &&
        TRANSCRIPTION_AUTOMATION_DIAGNOSTIC_CODES.includes("VTT_VERIFIED") &&
        TRANSCRIPTION_AUTOMATION_DIAGNOSTIC_CODES.includes("RECORDING_FILE_WRITTEN") &&
        TRANSCRIPTION_AUTOMATION_DIAGNOSTIC_CODES.includes("TRANSCRIPTION_RUNNING") &&
        TRANSCRIPTION_AUTOMATION_DIAGNOSTIC_CODES.includes("ARCHIVE_EXPORT_COMPLETE") &&
        TRANSCRIPTION_AUTOMATION_DIAGNOSTIC_CODES.includes("EXPORT_REGENERATION_FAILED") &&
        TRANSCRIPTION_AUTOMATION_DIAGNOSTIC_CODES.includes("EXPORT_OUTPUT_NOT_VERIFIED") &&
        vttAutomationPlan.proofBoundary.includes("not stem separation proof") &&
        transcriptionAutomationDoesNotAffectReleaseGate().includes("does not approve Beta Candidate") &&
        transcriptWorkflowContent.includes("Transcription automation handoff") &&
        transcriptWorkflowContent.includes("Default intake mode") &&
        transcriptWorkflowContent.includes("Completed steps preserved on failure") &&
        transcriptWorkflowContent.includes("without rerunning intake or pretending local model output exists."),
      "Test 11.0y: Automation diagnostics, proof boundary, and Transcript Workflow handoff stay honest",
      "Automation diagnostics or Transcript Workflow handoff can imply proof or fake local model output",
    );
    assert(
      skillsReadmeContent.includes("checkpoint-automation-workflow") &&
        checkpointAutomationSkillContent.includes("Each workflow stage must have a clear status.") &&
        checkpointAutomationSkillContent.includes("The user can stop after any stage.") &&
        checkpointAutomationSkillContent.includes("The user can resume from any completed stage.") &&
        checkpointAutomationSkillContent.includes("Every file-writing stage must verify output exists") &&
        checkpointAutomationWorkflowDocContent.includes("Default stop point: Transcript Preview.") &&
        checkpointAutomationWorkflowDocContent.includes("Metadata-only history must not store transcript text.") &&
        transcriptionAutomationWorkflowDocContent.includes("## Checkpoint Automation") &&
        localTranscriptionWorkflowDocContent.includes("## Automation Checkpoints"),
      "Test 11.0z: Checkpoint automation skill and docs preserve stop/resume/file-verification rules",
      "Checkpoint automation docs or skill are missing stage, resume, metadata-only, or file-verification rules",
    );
    assert(
      CHECKPOINT_WORKFLOW_STAGE_ORDER.length === 16 &&
        [
          "Source Intake",
          "Recording Complete",
          "Audio Saved",
          "Audio Normalized",
          "Transcription Ready",
          "Whisper Transcription Complete",
          "Transcript Preview",
          "Speaker Review",
          "Title / Filename Review",
          "Transcript Archive Saved",
          "Transcript Export Saved",
          "Prompt Library Selected",
          "Prompt Workflow Complete",
          "Prompt Output Review",
          "Prompt Output Export Saved",
          "Workflow Complete",
        ].every((stage) => CHECKPOINT_WORKFLOW_STAGE_ORDER.includes(stage)) &&
        CHECKPOINT_WORKFLOW_DIAGNOSTIC_CODES.includes("WORKFLOW_SOURCE_MISSING") &&
        CHECKPOINT_WORKFLOW_DIAGNOSTIC_CODES.includes("WORKFLOW_OUTPUT_NOT_VERIFIED") &&
        CHECKPOINT_WORKFLOW_DIAGNOSTIC_CODES.includes("WORKFLOW_REGENERATE_REQUIRED") &&
        CHECKPOINT_WORKFLOW_DIAGNOSTIC_CODES.includes("WORKFLOW_AUTOMATION_STOPPED_BY_USER") &&
        CHECKPOINT_FILE_WRITING_STAGE_IDS.includes("audio_saved") &&
        CHECKPOINT_FILE_WRITING_STAGE_IDS.includes("transcript_export_saved") &&
        CHECKPOINT_FILE_WRITING_STAGE_IDS.includes("prompt_output_export_saved") &&
        CHECKPOINT_FILE_VERIFICATION_POLICY.includes("File exists.") &&
        CHECKPOINT_FILE_VERIFICATION_POLICY.includes("Size is greater than 0."),
      "Test 11.0z.1: Checkpoint pipeline defines all stages, diagnostics, and file verification gates",
      "Checkpoint pipeline stage list, diagnostic codes, or file-writing verification gates regressed",
    );
    assert(
      DEFAULT_CHECKPOINT_STOP_STAGE_ID === "transcript_preview" &&
        CHECKPOINT_AUTOMATION_PRESETS.some(
          (preset) => preset.label === "Full Auto" && preset.stopAfterStageId === null,
        ) &&
        CHECKPOINT_AUTOMATION_PRESETS.some(
          (preset) => preset.label === "Stop at Transcript" && preset.stopAfterStageId === "transcript_preview",
        ) &&
        CHECKPOINT_AUTOMATION_PRESETS.some(
          (preset) => preset.label === "Stop at Rename" && preset.stopAfterStageId === "title_filename_review",
        ) &&
        CHECKPOINT_AUTOMATION_PRESETS.some((preset) => preset.label === "Export Only") &&
        CHECKPOINT_AUTOMATION_PRESETS.some((preset) => preset.label === "Prompt Only") &&
        CHECKPOINT_AUTOMATION_PRESETS.some((preset) => preset.label === "Manual Review") &&
        CHECKPOINT_START_FROM_SOURCE_OPTIONS.includes("recorded_audio") &&
        CHECKPOINT_START_FROM_SOURCE_OPTIONS.includes("imported_audio") &&
        CHECKPOINT_START_FROM_SOURCE_OPTIONS.includes("imported_vtt") &&
        CHECKPOINT_START_FROM_SOURCE_OPTIONS.includes("pasted_transcript") &&
        CHECKPOINT_START_FROM_SOURCE_OPTIONS.includes("existing_history_item") &&
        CHECKPOINT_AUTOMATION_CONTROLS.includes("Continue from here") &&
        CHECKPOINT_AUTOMATION_CONTROLS.includes("Rerun this step") &&
        CHECKPOINT_AUTOMATION_CONTROLS.includes("Regenerate downstream outputs"),
      "Test 11.0z.2: Checkpoint presets, source-start options, and controls exist",
      "Checkpoint presets, source options, or automation controls regressed",
    );
    assert(
      checkpointWorkflowPlan.sourceType === "imported_vtt" &&
        checkpointWorkflowPlan.defaultStopStageId === "transcript_preview" &&
        checkpointWorkflowPlan.stages.some((stage) => stage.id === "transcript_preview" && stage.stopAfterStage) &&
        checkpointWorkflowPlan.stages.some(
          (stage) =>
            stage.id === "transcript_export_saved" &&
            stage.status === "Needs Review" &&
            stage.errorCode === "WORKFLOW_REGENERATE_REQUIRED",
        ) &&
        checkpointWorkflowPlan.stages.some(
          (stage) =>
            stage.id === "transcript_archive_saved" &&
            stage.status === "Needs Review" &&
            stage.errorCode === "WORKFLOW_REGENERATE_REQUIRED",
        ) &&
        recordedAudioCheckpointPlan.historyState.lastCompletedStage === "audio_saved" &&
        promptOnlyCheckpointPlan.stages.some((stage) => stage.id === "prompt_output_review" && stage.stopAfterStage) &&
        failedCheckpointPlan.stages.some(
          (stage) => stage.id === "transcript_export_saved" && stage.status === "Failed",
        ) &&
        failedCheckpointPlan.historyState.lastCompletedStage === "title_filename_review" &&
        checkpointResumeSummary.status === "WORKFLOW_RESUME_READY",
      "Test 11.0z.3: Checkpoint stop, resume, rerun, and regeneration states stay structured",
      "Checkpoint plan no longer supports stop-at-transcript, recorded-audio resume, prompt-only stop, or failed-stage preservation",
    );
    assert(
      checkpointWorkflowPlan.transcriptPreviewBox.enabled &&
        checkpointWorkflowPlan.transcriptPreviewBox.scrollable &&
        checkpointWorkflowPlan.transcriptPreviewBox.actions.includes("save transcript changes") &&
        checkpointWorkflowPlan.promptOutputBox.enabled &&
        checkpointWorkflowPlan.promptOutputBox.scrollable &&
        checkpointWorkflowPlan.promptOutputBox.sectionSeparator === "line_breaks" &&
        checkpointWorkflowPlan.promptOutputBox.noBulletsByDefault &&
        checkpointWorkflowPlan.promptOutputBox.noTablesByDefault &&
        checkpointWorkflowPlan.historyState.metadataOnly &&
        !checkpointWorkflowPlan.historyState.storesTranscriptText &&
        checkpointWorkflowPlan.stages
          .filter((stage) => CHECKPOINT_FILE_WRITING_STAGE_IDS.includes(stage.id))
          .every((stage) => stage.status !== "Complete") &&
        checkpointWorkflowPlan.proofBoundary.includes("not stem separation proof") &&
        checkpointAutomationDoesNotAffectReleaseGate().includes("does not approve Beta Candidate"),
      "Test 11.0z.4: Review boxes, metadata-only history, no fake file completion, and proof boundary hold",
      "Checkpoint review boxes, metadata-only history, file output verification, or proof boundary regressed",
    );
    assert(
      localTranscriptionContent.includes("Automation Checkpoints") &&
        localTranscriptionContent.includes("Include in automation") &&
        localTranscriptionContent.includes("Stop after this stage") &&
        localTranscriptionContent.includes("Continue from here") &&
        localTranscriptionContent.includes("Run selected steps") &&
        localTranscriptionContent.includes("Rerun this step") &&
        localTranscriptionContent.includes("Manual review required") &&
        localTranscriptionContent.includes("Transcript Preview Box") &&
        localTranscriptionContent.includes("Prompt Output Box") &&
        localTranscriptionContent.includes("Regenerate recommended") &&
        localTranscriptionContent.includes("Metadata-only history stores transcript text") &&
        transcriptWorkflowContent.includes("Automation Checkpoints") &&
        transcriptWorkflowContent.includes("Prompt workflows can start from a pasted transcript") &&
        transcriptWorkflowContent.includes("Prompt Output Review") &&
        transcriptWorkflowContent.includes("Prompt Output Export Saved") &&
        transcriptionWorkflowPipelineContent.includes("pending_native_verification"),
      "Test 11.0z.5: Local Transcription and Transcript Workflow Builder expose checkpoint controls honestly",
      "Checkpoint UI controls, review boxes, prompt handoff, or metadata-only wording regressed",
    );
    assert(
      skillsReadmeContent.includes("document-format-workflow") &&
        documentFormatSkillContent.includes("Document import/export is not stem separation proof.") &&
        documentFormatSkillContent.includes("Do not fake PDF, DOCX, ODT, RTF, HTML, SRT, VTT, TXT, or JSON exports.") &&
        documentFormatSkillContent.includes("Output success requires file existence and size greater than 0.") &&
        documentFormatSkillContent.includes("Do not bundle a full office suite or converter by default") &&
        documentFormatSkillContent.includes("does not approve Beta Candidate"),
      "Test 11.0z.6: Document format skill exists and preserves proof/export boundaries",
      "Document format skill or skills README index is missing required boundaries",
    );
    assert(
      documentFormatReferenceAuditContent.includes("Apache OpenOffice") &&
        documentFormatReferenceAuditContent.includes("LibreOffice headless") &&
        documentFormatReferenceAuditContent.includes("Apache POI") &&
        documentFormatReferenceAuditContent.includes("mammoth.js") &&
        documentFormatReferenceAuditContent.includes("docx.js") &&
        documentFormatReferenceAuditContent.includes("pdf-lib") &&
        documentFormatReferenceAuditContent.includes("PDFKit") &&
        documentFormatReferenceAuditContent.includes("Pandoc") &&
        documentFormatReferenceAuditContent.includes("unoconv") &&
        documentFormatReferenceAuditContent.includes("officeParser") &&
        documentFormatReferenceAuditContent.includes("textract") &&
        documentFormatReferenceAuditContent.includes("Reference only") &&
        documentFormatReferenceAuditContent.includes("Optional user-configured external converter later") &&
        documentFormatWorkflowDocContent.includes("Import Format Matrix") &&
        documentFormatWorkflowDocContent.includes("Export Format Matrix") &&
        documentFormatWorkflowDocContent.includes("No cloud conversion is enabled by default."),
      "Test 11.0z.7: Document format reference audit and workflow docs cover office-format strategy",
      "Document format audit or workflow doc is missing required reference findings or local-first matrix",
    );
    assert(
      txtDocumentImportPolicy?.status === "supported" &&
        vttDocumentImportPolicy?.status === "supported" &&
        pdfDocumentImportPolicy?.status !== "supported" &&
        docxDocumentImportPolicy?.status !== "supported" &&
        odtDocumentImportPolicy?.status === "requires external converter" &&
        txtDocumentOutputPolicy?.status === "planned" &&
        pdfDocumentOutputPolicy?.status === "requires dependency" &&
        docxDocumentOutputPolicy?.status === "requires dependency" &&
        odtDocumentOutputPolicy?.status === "requires external converter" &&
        DOCUMENT_FORMAT_DIAGNOSTIC_CODES.includes("DOCUMENT_OUTPUT_NOT_VERIFIED") &&
        DOCUMENT_FORMAT_DIAGNOSTIC_CODES.includes("DOCUMENT_IMPORT_REQUIRES_CONVERTER"),
      "Test 11.0z.8: Document format policy matrix stays honest about supported/planned/converter states",
      "Document format policy marked PDF/DOCX/ODT as supported too early or lost diagnostic codes",
    );
    assert(
      DOCUMENT_IMPORT_RULES.noCloudParsing &&
        DOCUMENT_IMPORT_RULES.noHiddenUpload &&
        DOCUMENT_IMPORT_RULES.textLoggedByDefault === false &&
        DOCUMENT_IMPORT_RULES.sourceFilesModified === false &&
        vttDocumentImportPlan.canImport &&
        vttDocumentImportPlan.diagnosticCode === "DOCUMENT_IMPORT_SUPPORTED" &&
        !pdfDocumentImportPlan.canImport &&
        pdfDocumentImportPlan.requiresDependency &&
        !docxDocumentImportPlan.canImport &&
        docxDocumentImportPlan.requiresDependency &&
        !odtDocumentImportPlan.canImport &&
        odtDocumentImportPlan.requiresExternalConverter &&
        !invalidJsonTranscriptImport.ok &&
        validJsonTranscriptImport.ok,
      "Test 11.0z.9: Document import plans remain local, schema-gated, and dependency-aware",
      "Document import policy can import unsupported files or no longer blocks cloud/schema/dependency cases",
    );
    assert(
      DOCUMENT_EXPORT_RULES.exportSuccessRequiresExistingFile &&
        DOCUMENT_EXPORT_RULES.exportSuccessRequiresNonzeroSize &&
        DOCUMENT_EXPORT_RULES.exportSuccessRequiresExtensionMatch &&
        DOCUMENT_EXPORT_RULES.noCloudConversionByDefault &&
        pdfDocumentExportUnverified.completionState === "DOCUMENT_OUTPUT_NOT_VERIFIED" &&
        !pdfDocumentExportUnverified.isVerifiedComplete &&
        docxDocumentExportUnverified.completionState === "DOCUMENT_OUTPUT_NOT_VERIFIED" &&
        !docxDocumentExportUnverified.isVerifiedComplete &&
        verifiedDocumentExport.completionState === "DOCUMENT_OUTPUT_VERIFIED" &&
        verifiedDocumentExport.isVerifiedComplete &&
        verifiedDocumentExport.speakerRenameAppliedToOutput &&
        !zeroByteDocumentExport.ok &&
        zeroByteDocumentExport.diagnosticCode === "DOCUMENT_OUTPUT_NOT_VERIFIED",
      "Test 11.0z.10: Document export cannot complete until real output verification passes",
      "Document export verification allows missing or zero-byte PDF/DOCX/TXT outputs",
    );
    assert(
      DOCUMENT_EXPORT_FILENAME_TEMPLATES.txt === "{safe_title}_{date}_{time}.txt" &&
        DOCUMENT_EXPORT_FILENAME_TEMPLATES.pdf ===
          "{safe_title}_session_{session_number}_{date}_{duration_min}_min.pdf" &&
        DOCUMENT_EXPORT_FILENAME_TEMPLATES.docx === "{safe_title}_prompt_output_{date}_{time}.docx" &&
        DOCUMENT_EXPORT_FILENAME_TEMPLATES.json === "{safe_title}_transcript_archive_{date}.json" &&
        renamedDocumentText.includes("Interviewer: hello") &&
        renamedDocumentText.includes("Guest: there"),
      "Test 11.0z.11: Document filename templates and speaker rename export text remain deterministic",
      "Document export templates or speaker rename export text regressed",
    );
    assert(
      officeConverterMissing.status === "OFFICE_CONVERTER_NOT_CONFIGURED" &&
        !officeConverterMissing.canConvert &&
        !officeConverterMissing.bundledByDefault &&
        officeConverterInvalid.status === "OFFICE_CONVERTER_INVALID_PATH" &&
        !officeConverterInvalid.canConvert &&
        officeConverterReady.status === "OFFICE_CONVERTER_READY" &&
        officeConverterReady.canConvert &&
        officeConverterReady.safeArgumentArraysRequired &&
        DOCUMENT_OFFICE_CONVERTER_DIAGNOSTIC_CODES.includes("DOCUMENT_FORMAT_REQUIRES_CONVERTER") &&
        DOCUMENT_FORMAT_REFERENCE_STRATEGY.notBundledByDefault.includes("Apache OpenOffice") &&
        DOCUMENT_FORMAT_REFERENCE_STRATEGY.notBundledByDefault.includes("LibreOffice") &&
        DOCUMENT_FORMAT_DEPENDENCY_RECOMMENDATIONS.some(
          (dependency) => dependency.name === "Apache OpenOffice" && dependency.decision === "reference only",
        ) &&
        DOCUMENT_FORMAT_DEPENDENCY_RECOMMENDATIONS.some(
          (dependency) => dependency.name === "unoconv" && dependency.decision === "rejected for default runtime",
        ),
      "Test 11.0z.12: External office converter policy stays opt-in, path-validated, and not bundled",
      "Office converter policy implies bundled converters, unsafe execution, or missing diagnostics",
    );
    assert(
      localTranscriptionContent.includes("Document Import / Export") &&
        localTranscriptionContent.includes("TXT / VTT local-first") &&
        localTranscriptionContent.includes("PDF import Planned") &&
        localTranscriptionContent.includes("DOCX") &&
        localTranscriptionContent.includes("ODT requires external converter") &&
        localTranscriptionContent.includes("No cloud conversion by default") &&
        localTranscriptionContent.includes("DOCUMENT_OUTPUT_NOT_VERIFIED") &&
        localTranscriptionContent.includes("Speaker rename applies to document exports after regeneration") &&
        transcriptWorkflowContent.includes("Document Import / Export Handoff") &&
        transcriptWorkflowContent.includes("Import transcript document") &&
        transcriptWorkflowContent.includes("Export final prompt output") &&
        transcriptWorkflowContent.includes("Export section outputs") &&
        transcriptWorkflowContent.includes("Export transcript + prompt output together") &&
        transcriptWorkflowContent.includes("No cloud conversion by default"),
      "Test 11.0z.13: Local Transcription and Transcript Workflow Builder expose document workflow scaffolds honestly",
      "Document import/export UI scaffold is missing local-first or output-not-verified wording",
    );
    assert(
      localTranscriptionWorkflowDocContent.includes("Document Import And Export") &&
        vttArchiveExportWorkflowDocContent.includes("ODT is converter-gated") &&
        transcriptPromptWorkflowDocContent.includes("Document Import And Export Handoff") &&
        checkpointAutomationWorkflowDocContent.includes("Document import/export checkpoints use the same rule") &&
        documentFormatPolicyContent.includes("DOCUMENT_OUTPUT_NOT_VERIFIED") &&
        documentImportPolicyContent.includes("noHiddenUpload") &&
        documentExportPolicyContent.includes("safeArgumentArraysRequired") &&
        documentFormatsDoNotAffectReleaseGate().includes("does not approve Beta Candidate") &&
        documentImportDoesNotAffectReleaseGate().includes("does not approve Beta Candidate") &&
        documentExportDoesNotAffectReleaseGate().includes("does not approve Beta Candidate"),
      "Test 11.0z.14: Document workflow docs and services preserve proof and privacy boundaries",
      "Document workflow docs/services are missing proof, privacy, or converter safety boundaries",
    );
    assert(
      !packageJsonContent.includes('"mammoth"') &&
        !packageJsonContent.includes('"docx"') &&
        !packageJsonContent.includes('"pdf-lib"') &&
        !packageJsonContent.includes('"pdfkit"') &&
        !packageJsonContent.includes('"officeparser"') &&
        !packageJsonContent.includes('"textract"') &&
        !packageJsonContent.includes('"pandoc"') &&
        ![
          localTranscriptionContent,
          transcriptWorkflowContent,
          documentFormatPolicyContent,
          documentImportPolicyContent,
          documentExportPolicyContent,
          documentFormatWorkflowDocContent,
        ].some((content) => /C:\\Users\\(?!invalid|Tools)/i.test(content)),
      "Test 11.0z.15: Document workflow adds no parser dependencies or hardcoded user folders",
      "Document workflow added dependencies prematurely or hardcoded a local user folder",
    );
    assert(
      workflowRunLedgerContent.includes("export interface WorkflowRunRecord") &&
        [
          "workflowRunId",
          "sourceType",
          "sourceOriginalPath",
          "sourceManagedPath",
          "sourceDuration",
          "sourceSize",
          "sourceFormat",
          "transcriptTextPath",
          "transcriptPreviewText",
          "parsedSegmentsPath",
          "speakerMap",
          "title",
          "sessionNumber",
          "date",
          "selectedPromptLibraryId",
          "selectedPromptTemplateName",
          "selectedModelId",
          "workflowMode",
          "checkpointStatuses",
          "generatedFiles",
          "exportFiles",
          "promptOutputs",
          "lastCompletedStage",
          "currentStage",
          "failedStage",
          "errorCode",
          "createdAt",
          "updatedAt",
          "reviewedByUser",
          "notes",
        ].every((fieldName) => workflowRunLedgerContent.includes(fieldName)) &&
        workflowRunLedgerContent.includes("export interface WorkflowArtifactRecord") &&
        [
          "artifactId",
          "artifactType",
          "path",
          "format",
          "sizeBytes",
          "createdAt",
          "verified",
          "verificationError",
          "sourceStage",
          "overwrittenPreviousFile",
          "previousVersionPath",
        ].every((fieldName) => workflowRunLedgerContent.includes(fieldName)),
      "Test 11.0z.16: Workflow Run Ledger service exists with required run and artifact fields",
      "Workflow Run Ledger service is missing required run or artifact record fields",
    );
    assert(
      metadataOnlyWorkflowRun.transcriptPreviewText === null &&
        !metadataOnlyWorkflowRun.storesTranscriptText &&
        metadataOnlyWorkflowRun.historyMode === "metadata_only" &&
        fullHistoryWorkflowRun.transcriptPreviewText === "Synthetic non-PHI transcript." &&
        fullHistoryWorkflowRun.storesTranscriptText &&
        fullHistoryWorkflowRun.historyMode === "full_history",
      "Test 11.0z.17: Workflow Run Ledger keeps metadata-only history by default with full-history opt-in",
      "Workflow Run Ledger stored transcript text by default or lost full-history opt-in behavior",
    );
    assert(
      verifiedLedgerTxtArtifact.verified &&
        verifiedLedgerTxtArtifact.verificationError === null &&
        !missingLedgerPdfArtifact.verified &&
        missingLedgerPdfArtifact.verificationError === "Output Missing" &&
        !fileWritingVerification.ok &&
        fileWritingVerification.status === "Output Missing" &&
        fileWritingVerification.missingArtifactTypes.includes("pdf_export") &&
        nonWritingVerification.ok &&
        WORKFLOW_FILE_WRITING_STAGE_IDS.includes("transcript_export_saved"),
      "Test 11.0z.18: Workflow Run Ledger requires artifact verification for file-writing stages",
      "Workflow Run Ledger allowed missing or unverified outputs to count as complete",
    );
    assert(
      failedLedgerRun.failedStage === "transcript_export_saved" &&
        failedLedgerRun.errorCode === "PDF_OUTPUT_NOT_VERIFIED" &&
        failedLedgerRun.checkpointStatuses.transcript_export_saved === "Failed" &&
        failedLedgerRun.exportFiles.some(
          (artifact) => artifact.artifactId === "ledger-txt-export" && artifact.verified,
        ) &&
        failedLedgerRun.exportFiles.some(
          (artifact) => artifact.artifactId === "ledger-pdf-export" && !artifact.verified,
        ),
      "Test 11.0z.19: Workflow Run Ledger preserves earlier artifacts when a later stage fails",
      "Workflow Run Ledger erased earlier verified artifacts or failed-stage diagnostics",
    );
    assert(
      transcriptEditLedgerRun.promptOutputs.every((output) => output.regenerateRecommended) &&
        transcriptEditLedgerRun.checkpointStatuses.prompt_output_review === "Needs Review" &&
        promptLibraryEditLedgerRun.promptOutputs.every((output) => output.status === "Regenerate Recommended") &&
        speakerEditLedgerRun.exportFiles.some(
          (artifact) => artifact.artifactType === "txt_export" && artifact.regenerateRecommended,
        ) &&
        speakerEditLedgerRun.checkpointStatuses.transcript_export_saved === "Needs Review" &&
        titleEditLedgerRun.exportFiles.some(
          (artifact) => artifact.artifactType === "txt_export" && artifact.regenerateRecommended,
        ) &&
        titleEditLedgerRun.checkpointStatuses.title_filename_review === "Needs Review" &&
        promptOutputEditLedgerRun.checkpointStatuses.prompt_output_export_saved === "Needs Review",
      "Test 11.0z.20: Workflow Run Ledger marks downstream artifacts regenerate recommended after edits",
      "Workflow Run Ledger no longer marks prompt outputs, exports, or filenames for regeneration after edits",
    );
    assert(
      !replacementBlocked.canOverwrite &&
        replacementBlocked.preservePreviousArtifact &&
        replacementBlocked.action === "blocked" &&
        replacementBlocked.message.includes("Prior successful export remains") &&
        replacementAllowed.canOverwrite &&
        replacementAllowed.action === "overwrite_previous" &&
        askOverwrite.action === "ask_user" &&
        saveNewCopy.action === "save_new_copy",
      "Test 11.0z.21: Workflow Run Ledger overwrite policy preserves previous exports until replacement verifies",
      "Workflow Run Ledger allowed unsafe overwrite or failed to preserve previous successful export",
    );
    assert(
      ledgerResume.canResume &&
        ledgerResume.nextRecommendedAction === "Continue automation" &&
        ledgerFailedResume.canResume &&
        ledgerFailedResume.nextRecommendedAction === "Rerun failed step" &&
        retryLedgerRun.failedStage === null &&
        retryLedgerRun.checkpointStatuses.transcript_export_saved === "Ready" &&
        rerunLedgerRun.failedStage === null &&
        rerunLedgerRun.currentStage === "transcript_export_saved" &&
        ledgerSummary.currentStageLabel === "Failed" &&
        ledgerSummary.controls.includes("Open output folder") &&
        ledgerSummary.controls.includes("Rerun failed step") &&
        ledgerRegenerateSummary.currentStageLabel === "Regenerate Recommended",
      "Test 11.0z.22: Workflow Run Ledger supports resume, retry, rerun, and status summaries",
      "Workflow Run Ledger recovery actions or simple status summary regressed",
    );
    assert(
      WORKFLOW_RUN_PRESETS.length === 5 &&
        [
          "Fast Transcript Only",
          "Archive Transcript",
          "Prompt Output Only",
          "Full Auto then Review",
          "Manual Step-by-Step",
        ].every((label) => WORKFLOW_RUN_PRESETS.some((preset) => preset.label === label)) &&
        WORKFLOW_RUN_PRESETS.some(
          (preset) =>
            preset.id === "full_auto_then_review" &&
            preset.workflowMode === "automatic_then_review" &&
            preset.stopAfterStageId === "prompt_output_review",
        ) &&
        WORKFLOW_RUN_PRESETS.some((preset) => preset.id === "manual_step_by_step" && preset.manualReviewEveryStage) &&
        [
          "Ready",
          "Running",
          "Complete",
          "Needs Review",
          "Failed",
          "Regenerate Recommended",
          "Output Verified",
          "Output Missing",
        ].every((label) => WORKFLOW_RUN_SIMPLE_STATUS_LABELS.join("\n").includes(label)) &&
        WORKFLOW_RECOVERY_ACTIONS.includes("Continue automation") &&
        WORKFLOW_RECOVERY_ACTIONS.includes("Clear failed stage and retry"),
      "Test 11.0z.23: Workflow Run Ledger presets, simple labels, and recovery actions exist",
      "Workflow Run Ledger lost required presets, simple labels, or recovery actions",
    );
    assert(
      workflowRunLedgerDocContent.includes("# Workflow Run Ledger") &&
        workflowRunLedgerDocContent.includes("Workflow Run Record") &&
        workflowRunLedgerDocContent.includes("Artifact Records") &&
        workflowRunLedgerDocContent.includes("Checkpoint States") &&
        workflowRunLedgerDocContent.includes("Prompt Output Export Saved") &&
        workflowRunLedgerDocContent.includes("File-writing checkpoints remain Output Not Verified") &&
        workflowRunLedgerDocContent.includes("Resume Behavior") &&
        workflowRunLedgerDocContent.includes("Regenerate Recommended Behavior") &&
        workflowRunLedgerDocContent.includes("Overwrite Policy") &&
        workflowRunLedgerDocContent.includes("Full-history mode is opt-in") &&
        workflowRunLedgerDocContent.includes("does not approve Beta Candidate") &&
        checkpointAutomationWorkflowDocContent.includes("The Workflow Run Ledger is the shared recovery record") &&
        transcriptionAutomationWorkflowDocContent.includes("The Workflow Run Ledger is the concrete recovery layer") &&
        transcriptPromptWorkflowDocContent.includes("Workflow Run Ledger Handoff"),
      "Test 11.0z.24: Workflow Run Ledger docs describe recovery, privacy, overwrite, and proof boundaries",
      "Workflow Run Ledger docs or related workflow docs are missing required recovery and proof language",
    );
    assert(
      localTranscriptionContent.includes("Workflow Status") &&
        localTranscriptionContent.includes("One Workflow Run Ledger") &&
        localTranscriptionContent.includes("Completed artifacts") &&
        localTranscriptionContent.includes("Failed artifacts") &&
        localTranscriptionContent.includes("Regenerate recommended") &&
        localTranscriptionContent.includes("Previous successful export remains until") &&
        localTranscriptionContent.includes("Workflow presets") &&
        [
          "Ready",
          "Running",
          "Complete",
          "Needs Review",
          "Failed",
          "Regenerate Recommended",
          "Output Verified",
          "Output Missing",
        ].every((label) => localTranscriptionContent.includes(label)) &&
        transcriptWorkflowContent.includes("Workflow Status") &&
        transcriptWorkflowContent.includes("The Workflow Run Ledger keeps prompt-library choice") &&
        transcriptWorkflowContent.includes("Regenerate prompt output") &&
        transcriptWorkflowContent.includes("Prompt output export remains disabled until a native writer verifies"),
      "Test 11.0z.25: Workflow Run Ledger status panels use simple labels and honest recovery controls",
      "Workflow Run Ledger UI panels lost simple labels, recovery controls, or output verification wording",
    );
    assert(
      workflowRunLedgerDoesNotAffectReleaseGate().includes("does not approve Beta Candidate") &&
        workflowRunLedgerContent.includes("workflowRunLedgerDoesNotAffectReleaseGate") &&
        !proofCheckContent.includes("workflowRunLedger") &&
        !workflowRunLedgerContent.includes("PROOF_BETA_READY") &&
        !workflowRunLedgerDocContent.includes("approves Beta Candidate"),
      "Test 11.0z.26: Workflow Run Ledger does not approve Beta or satisfy proof-check",
      "Workflow Run Ledger appears to affect proof readiness or Beta Candidate status",
    );
    assert(
      appContent.includes("mastering_lab") &&
        appContent.includes("MasteringLab") &&
        appContent.includes("Mastering Lab") &&
        appContent.includes("Finalize audio / Not proof") &&
        manualsContent.includes('sectionId: "mastering_lab"') &&
        manualsContent.includes("Mastering Lab Manual") &&
        masteringLabContent.includes("Input Audio") &&
        masteringLabContent.includes("Mastering Preset / Style") &&
        masteringLabContent.includes("Effects Chain / Macro") &&
        masteringLabContent.includes("Reusable OpenStem-native chains") &&
        masteringLabContent.includes("input audio, analyze, apply") &&
        masteringLabContent.includes("Processing Controls") &&
        masteringLabContent.includes("Run Mastering") &&
        masteringLabContent.includes("Before/After Preview") &&
        masteringLabContent.includes("Export Settings") &&
        masteringLabContent.includes("Output Verification") &&
        masteringLabContent.includes("History / Recent Masters") &&
        masteringLabContent.includes("Run Mastering - blocked") &&
        masteringLabContent.includes("Analyze Input") &&
        masteringLabContent.includes("Select / Verify FFmpeg") &&
        masteringLabContent.includes("Open mastered") &&
        masteringLabContent.includes("Reference Match / Batch") &&
        masteringLabContent.includes("MASTERING_CHAIN_POLICIES") &&
        ![appContent, masteringLabContent, manualsContent].some((content) =>
          ["LANDR", "Mixea", "DistroKid"].some((name) => content.includes(name)),
        ),
      "Test 11.0z.27: Mastering Lab submenu exists as a dedicated honest post-processing workspace",
      "Mastering Lab navigation, manual, UI sections, or unbranded truth-state wording regressed",
    );
    assert(
      masteringWorkflowContent.includes("MasteringDiagnosticCode") &&
        masteringChainPolicyContent.includes("MasteringChainPolicy") &&
        WEB_AUDIO_MASTERING_REFERENCE.inspectedCommit === "a71d08b9da51488d90899ebdea17e15d19f73eae" &&
        WEB_AUDIO_MASTERING_REFERENCE.license === "ISC" &&
        WEB_AUDIO_MASTERING_REFERENCE.copiedSourceFiles.length === 0 &&
        MASTERING_MODES.length === 8 &&
        MASTERING_MODES.some(
          (mode) =>
            mode.label === "Balanced Master" && mode.implemented && mode.backendStatus === "ffmpeg_single_file_ready",
        ) &&
        MASTERING_GOALS.some((goal) => goal.displayName === "Voice / Speech Cleanup") &&
        MASTERING_GOALS.some((goal) => goal.displayName === "Podcast / Dialogue") &&
        MASTERING_CHAIN_POLICIES.length === 8 &&
        MASTERING_CHAIN_POLICIES.every((chain) => chain.destructive === false) &&
        MASTERING_EXPORT_POLICIES.some((policy) => policy.id === "save_mastered_copy" && policy.default) &&
        MASTERING_ANALYSIS_POLICY.notMeasuredUntilReviewed.includes("integrated loudness / LUFS") &&
        REFERENCE_MATCH_POLICY.requiredStates.includes("MATCHERING_BACKEND_NOT_CONFIGURED") &&
        BATCH_MASTERING_POLICY.status === "planned_after_single_file_verified" &&
        CLOUD_MASTERING_POLICY.enabledByDefault === false &&
        buildMasteringChainRunPlan("balanced_master").join(" -> ").includes("Analyze input -> Normalize loudness") &&
        masteringChainDoesNotAffectReleaseGate().includes("does not approve Beta Candidate") &&
        MASTERING_MODES.some((mode) => mode.id === "reference_match" && mode.ffmpegRequired) &&
        defaultMasteringSettings.modeId === "streaming_ready" &&
        defaultMasteringSettings.targetLufs === -14 &&
        audioEffectChainPolicyContent.includes("AUDACITY_REFERENCE_WORKFLOW_POLICY") &&
        AUDACITY_REFERENCE_WORKFLOW_POLICY.referenceOnly === true &&
        AUDACITY_REFERENCE_WORKFLOW_POLICY.copiedSourceFiles.length === 0 &&
        AUDIO_EFFECT_CHAINS.length === 7 &&
        AUDIO_EFFECT_CHAINS.some((chain) => chain.name === "Voice Cleanup" && chain.recordingApplicable) &&
        AUDIO_EFFECT_CHAINS.some(
          (chain) => chain.name === "Transcription Prep" && chain.requiredBackend === "ffmpeg_required",
        ) &&
        AUDIO_EFFECT_CHAINS.every(
          (chain) =>
            chain.destructive === false &&
            chain.verificationRequirements.some((requirement) => requirement.includes("output file")),
        ) &&
        gentleEffectChainReadiness.diagnosticCode === "CHAIN_INPUT_MISSING" &&
        gentleEffectChainReadiness.blockers.includes("CHAIN_BACKEND_NOT_IMPLEMENTED") &&
        podcastEffectChainReadiness.blockers.includes("CHAIN_FFMPEG_REQUIRED") &&
        podcastEffectChainReadiness.blockers.includes("CHAIN_BACKEND_NOT_IMPLEMENTED") &&
        gentleChainRunPlan.join(" -> ").includes("Input audio -> Analyze -> Apply chain: Gentle Master") &&
        audioEffectChainsDoNotAffectReleaseGate().includes("do not approve Beta Candidate") &&
        masteringBlockedReadiness.blockers.includes("MASTERING_INPUT_MISSING") &&
        masteringBlockedReadiness.blockers.includes("MASTERING_OUTPUT_FOLDER_MISSING") &&
        masteringBackendBlockedReadiness.diagnosticCode === "MASTERING_BACKEND_NOT_IMPLEMENTED" &&
        masteringReferenceBlockedReadiness.diagnosticCode === "MASTERING_FFMPEG_MISSING" &&
        masteringReadyReadiness.diagnosticCode === "MASTERING_READY" &&
        masteringChainBlockedReadiness.diagnosticCode === "MASTERING_ANALYSIS_NOT_STARTED" &&
        masteringChainReadyReadiness.diagnosticCode === "MASTERING_READY" &&
        masteringReferenceChainReadiness.blockers.includes("MATCHERING_BACKEND_NOT_CONFIGURED"),
      "Test 11.0z.28: Mastering workflow service preserves modes, readiness, reference metadata, and backend blockers",
      "Mastering service lost reference metadata, mode policy, FFmpeg gate, or backend-not-implemented blocker",
    );
    assert(
      MASTERING_FILENAME_TEMPLATE === "{source_basename}_mastered_{date}_{time}_{mode}.{ext}" &&
        safeMasteringFilename === "CON_file_mastered_01-01-2026_1423_streaming_ready.wav" &&
        Array.from(sanitizedMasteringToken).every((char) => char.charCodeAt(0) >= 32 && !'<>:"/\\|?*'.includes(char)) &&
        !browserMasteringVerification.ok &&
        browserMasteringVerification.diagnosticCode === "MASTERING_OUTPUT_NOT_VERIFIED" &&
        browserMasteringVerification.message.includes("Electron confirms the write") &&
        !zeroByteMasteringVerification.ok &&
        verifiedMasteringOutput.ok &&
        verifiedMasteringOutput.diagnosticCode === "MASTERING_EXPORT_COMPLETE" &&
        unmeasuredMasteringReport.message === "Before/after loudness analysis not available yet." &&
        !unmeasuredMasteringReport.inputLoudness.measured &&
        masteringHistoryPreview.exportStatus === "MASTERING_OUTPUT_NOT_VERIFIED" &&
        masteringHistoryPreview.errorCode === "MASTERING_OUTPUT_NOT_VERIFIED",
      "Test 11.0z.29: Mastering filename, output verification, before-after, and history states stay honest",
      "Mastering filename safety, native output verification, unmeasured analysis, or history error state regressed",
    );
    assert(
      skillsReadmeContent.includes("mastering-workflow") &&
        masteringSkillContent.includes("Mastering is not stem separation.") &&
        masteringSkillContent.includes("Do not fake loudness or true-peak measurements.") &&
        masteringSkillContent.includes("Browser downloads are not native output verification.") &&
        masteringWorkflowDocContent.includes("Mastering Lab") &&
        masteringWorkflowDocContent.includes("Output success requires") &&
        masteringWorkflowDocContent.includes("FFmpeg single-file lane") &&
        masteringBackendPolicyDocContent.includes("FFmpeg local processing") &&
        masteringBackendPolicyDocContent.includes("argument arrays") &&
        masteringBackendPolicyDocContent.includes("Cloud mastering is disabled by default") &&
        masteringReferenceAuditContent.includes("Web-Audio-Mastering Findings") &&
        masteringReferenceAuditContent.includes("Matchering Findings") &&
        masteringReferenceAuditContent.includes("ffmpeg-normalize Findings") &&
        masteringReferenceAuditContent.includes("pyloudnorm Findings") &&
        masteringReferenceAuditContent.includes("phaselimiter Findings") &&
        webAudioMasteringIntegrationDocContent.includes(
          "Reference commit inspected: `a71d08b9da51488d90899ebdea17e15d19f73eae`",
        ) &&
        webAudioMasteringIntegrationDocContent.includes("Direct files copied: none") &&
        docsThirdPartyNoticesContent.includes("Web-Audio-Mastering") &&
        thirdPartyNoticesContent.includes("Web-Audio-Mastering") &&
        masteringDoesNotAffectReleaseGate().includes("does not approve Beta Candidate"),
      "Test 11.0z.30: Mastering docs, skill, attribution, and proof boundaries are present",
      "Mastering docs/skill/notices are missing reference audit, attribution, or release-gate boundaries",
    );
    assert(
      audacityReferenceAuditContent.includes("Audacity Reference Audit") &&
        audacityReferenceAuditContent.includes(
          "Local checkout: local external reference checkout, not committed to OpenStem.",
        ) &&
        audacityReferenceAuditContent.includes("Branch inspected: `master`") &&
        audacityReferenceAuditContent.includes("747072739466770b3fc4bf4ecf3e196675a08885") &&
        audacityReferenceAuditContent.includes("GPLv3") &&
        audacityReferenceAuditContent.includes("GPLv2-or-later") &&
        audacityReferenceAuditContent.includes("CC-BY 3.0") &&
        audacityReferenceAuditContent.includes("audacity3") &&
        audacityReferenceAuditContent.includes("OpenStem did not modify the Audacity checkout") &&
        audacityReferenceAuditContent.includes("Do not copy Audacity source code into OpenStem.") &&
        audacityReferenceAuditContent.includes("Do not copy Audacity documentation text into OpenStem help content.") &&
        !packageJsonContent.toLowerCase().includes("audacity") &&
        !masteringLabContent.includes("Audacity"),
      "Test 11.0z.30a: Audacity reference audit is docs-only and does not leak into runtime branding/dependencies",
      "Audacity audit is missing repo/license/stable-branch findings or Audacity leaked into runtime UI/dependencies",
    );
    assert(
      skillsReadmeContent.includes("audacity-reference-workflow") &&
        audacityReferenceSkillContent.includes("Do not copy Audacity GPL-family source code") &&
        audacityReferenceSkillContent.includes("Do not embed Audacity binaries") &&
        audacityReferenceSkillContent.includes("Before/after values must be measured, not invented.") &&
        audacityReferenceSkillContent.includes("This workflow does not approve Beta Candidate.") &&
        masteringSkillContent.includes("Audacity can be used as a reference") &&
        docsThirdPartyNoticesContent.includes("Audacity is referenced only") &&
        docsThirdPartyNoticesContent.includes("GPL-family licensed") &&
        thirdPartyNoticesContent.includes("**Audacity**") &&
        thirdPartyNoticesContent.includes("Referenced only / concept-adapted"),
      "Test 11.0z.30b: Audacity reference skill and notices preserve GPL and non-affiliation guardrails",
      "Audacity skill/notices are missing reference-only, GPL, no-copy, or Beta-boundary rules",
    );
    assert(
      audioEffectChainWorkflowDocContent.includes("Audio Effect Chain Workflow") &&
        audioEffectChainWorkflowDocContent.includes(
          "Select input -> analyze -> choose chain -> apply chain -> export copy -> verify output -> show measured report",
        ) &&
        audioEffectChainWorkflowDocContent.includes("Source audio is not overwritten by default") &&
        audioEffectChainWorkflowDocContent.includes("Batch effect chains are planned only") &&
        audioFormatWorkflowDocContent.includes("FFmpeg-dependent") &&
        audioFormatWorkflowDocContent.includes("Codec support unverified") &&
        audioFormatWorkflowDocContent.includes("| WAV      | planned") &&
        masteringWorkflowDocContent.includes("Audacity Reference Translation Layer") &&
        masteringWorkflowDocContent.includes("src/services/audioEffectChainPolicy.ts") &&
        transcriptionIntakeWorkflowDocContent.includes("Audacity reference translation") &&
        AUDIO_FORMAT_SUPPORT_MATRIX.some((format) => format.id === "wav_output" && format.status === "planned") &&
        ffmpegDependentFormats.length >= 7 &&
        ffmpegDependentFormats.every((format) => format.ffmpegRequired) &&
        !AUDIO_FORMAT_SUPPORT_MATRIX.some((format) => format.status === "supported"),
      "Test 11.0z.30c: Effects-chain, format, FFmpeg, recording, and batch/macro docs stay honest",
      "Audio chain/format docs or policy overclaimed codec support, processing, recording, or batch readiness",
    );
    assert(
      !packageJsonContent.includes('"fft.js"') &&
        !packageJsonContent.includes('"wavesurfer.js"') &&
        gitignoreContent.includes("*_mastered_*.wav") &&
        gitignoreContent.includes("mastering-outputs/") &&
        verifyElectronArtifactsContent.includes("mastered audio outputs") &&
        verifyElectronArtifactsContent.includes("/_mastered_/i") &&
        releaseChecklistContent.includes("generated mastered audio outputs") &&
        releaseChecklistContent.includes("Do not bundle user audio, recordings, transcripts, mastered exports"),
      "Test 11.0z.31: Mastering integration adds no dependencies and excludes generated mastered outputs",
      "Mastering integration added premature dependencies or lost artifact-exclusion checks",
    );
    assert(
      appContent.includes("AppErrorBoundary") &&
        appContent.includes("boundaryKey={activeTab}") &&
        appContent.includes('onReturnHome={() => setActiveTab("classic_console")}') &&
        appErrorBoundaryContent.includes("getDerivedStateFromError") &&
        appErrorBoundaryContent.includes("componentDidCatch") &&
        appErrorBoundaryContent.includes("Recoverable UI Error") &&
        appErrorBoundaryContent.includes("No source audio, transcript, model file, or output") &&
        appErrorBoundaryContent.includes("Retry Section") &&
        appErrorBoundaryContent.includes("Return To Audio Separator"),
      "Test 11.0z.32: App-level error boundary contains tab crashes without erasing user files",
      "App error boundary is missing, not wired to tab content, or lacks recovery/no-delete wording",
    );
    assert(
      legalContent.includes("Local Tools, Draft Workflows & Proof Boundaries") &&
        legalContent.includes("Local Transcription") &&
        legalContent.includes("Transcript Workflow Builder") &&
        legalContent.includes("Clinical Workflow") &&
        legalContent.includes("not automatic HIPAA compliance") &&
        legalContent.includes("Mastering Lab") &&
        legalContent.includes("does not promise pro-grade mastering results") &&
        legalContent.includes("Reference Projects & Non-Affiliation Notice") &&
        [
          "TurboScribe",
          "LANDR",
          "DistroKid",
          "Mixea",
          "Audacity",
          "Voicebox",
          "Apache OpenOffice",
          "GPT4All",
          "Ollama",
          "Whisper",
          "Web-Audio-Mastering",
        ].every((name) => legalContent.includes(name)) &&
        !legalContent.includes("HIPAA compliant") &&
        !/\bcertified\b/i.test(legalContent),
      "Test 11.0z.33: Legal/About covers new feature families without compliance or mastering overclaims",
      "Legal/About is missing new feature boundaries, non-affiliation language, or overclaim guards",
    );
    assert(
      thirdPartyNoticesContent.includes("Whisper / Whisper-family tools") &&
        thirdPartyNoticesContent.includes("TurboScribe") &&
        thirdPartyNoticesContent.includes("**Voicebox**") &&
        thirdPartyNoticesContent.includes("GPT4All / Ollama") &&
        thirdPartyNoticesContent.includes("Apache OpenOffice / LibreOffice / Pandoc") &&
        thirdPartyNoticesContent.includes("LANDR / DistroKid Mixea") &&
        docsThirdPartyNoticesContent.includes("Transcription, Prompt, Document, And Mastering References") &&
        docsThirdPartyNoticesContent.includes("Voicebox is referenced only") &&
        docsThirdPartyNoticesContent.includes("Referenced projects are inspiration") &&
        docsThirdPartyNoticesContent.includes("does not imply official affiliation"),
      "Test 11.0z.34: Third-party notices cover reference-only transcription, prompt, document, and mastering projects",
      "Third-party notices are missing reference-only projects or non-affiliation boundaries",
    );
    assert(
      VOICEBOX_REFERENCE_POLICY.referenceOnly === true &&
        VOICEBOX_REFERENCE_POLICY.copiedSourceFiles.length === 0 &&
        VOICEBOX_REFERENCE_POLICY.inspectedCommit === "b35b90961d5bc83a8b4e96e8b6ccde2a03152ff9" &&
        VOICEBOX_REFERENCE_POLICY.license === "MIT License" &&
        VOICEBOX_CAPTURE_LEDGER_FIELDS.some((field) => field.id === "capture_id" && field.requiredForComplete) &&
        VOICEBOX_CAPTURE_LEDGER_FIELDS.some((field) => field.id === "linked_prompt_outputs") &&
        VOICEBOX_CAPTURE_ACTIONS.includes("re-transcribe") &&
        VOICEBOX_CAPTURE_ACTIONS.includes("open folder") &&
        ["Fast", "Balanced", "Accurate", "Maximum Accuracy"].every((label) =>
          VOICEBOX_STT_MODEL_LADDER.some(
            (lane) => lane.label === label && lane.readinessState === "missing_or_not_checked",
          ),
        ) &&
        VOICEBOX_STT_MODEL_LADDER.every((lane) => lane.verificationRequired.includes("source/license documented")) &&
        VOICEBOX_QUEUE_DIAGNOSTIC_CODES.includes("JOB_STALE_RECOVERED") &&
        VOICEBOX_QUEUE_DIAGNOSTIC_CODES.includes("JOB_OUTPUT_NOT_VERIFIED") &&
        VOICEBOX_QUEUE_TARGETS.includes("mastering jobs") &&
        VOICEBOX_LOCAL_LLM_REFINEMENT_MODES.every(
          (mode) =>
            mode.cloudEnabledByDefault === false &&
            mode.draftOnly === true &&
            mode.transcriptTextLoggedByDefault === false &&
            mode.readiness === "local_model_required",
        ) &&
        VOICEBOX_POST_PROCESSING_PRESETS.some((preset) => preset.label === "Voice Cleanup") &&
        VOICEBOX_POST_PROCESSING_PRESETS.every((preset) => preset.destructive === false) &&
        VOICEBOX_PEDALBOARD_REVIEW.openStemDecision === "do_not_add_now" &&
        VOICEBOX_PEDALBOARD_REVIEW.optionalOnly === true &&
        VOICEBOX_MIC_DICTATION_POLICY.voiceCloningEnabledByDefault === false &&
        VOICEBOX_MIC_DICTATION_POLICY.globalHotkeysApproved === false &&
        VOICEBOX_PROFILE_PRESET_TYPES.includes("Session Transcription Profile") &&
        VOICEBOX_PROFILE_PRESET_TYPES.includes("Music Mastering Profile") &&
        VOICEBOX_API_MCP_POLICY.status === "future_only" &&
        VOICEBOX_API_MCP_POLICY.disabledByDefault === true &&
        VOICEBOX_TAURI_ELECTRON_LESSONS.switchFrameworkNow === false &&
        voiceboxReferenceDoesNotAffectReleaseGate().includes("do not approve Beta Candidate"),
      "Test 11.0z.34a: Voicebox reference policy preserves local-first workflow ideas without proof or branding drift",
      "Voicebox policy lost reference-only metadata, capture/STT/queue/local-LLM/effects rules, or proof boundaries",
    );
    assert(
      voiceboxReferenceAuditContent.includes("Voicebox Reference Audit") &&
        voiceboxReferenceAuditContent.includes(
          "Local checkout: local external reference checkout, not committed to OpenStem.",
        ) &&
        voiceboxReferenceAuditContent.includes("b35b90961d5bc83a8b4e96e8b6ccde2a03152ff9") &&
        voiceboxReferenceAuditContent.includes("MIT License") &&
        voiceboxReferenceAuditContent.includes("SECURITY.md") &&
        voiceboxReferenceAuditContent.includes("No Voicebox source files were copied") &&
        voiceboxReferenceAuditContent.includes("Capture Ledger Adaptation") &&
        voiceboxReferenceAuditContent.includes("STT Model Ladder Adaptation") &&
        voiceboxReferenceAuditContent.includes("Queue, Retry, And Recovery Adaptation") &&
        voiceboxReferenceAuditContent.includes("Local LLM Refinement Adaptation") &&
        voiceboxReferenceAuditContent.includes("Post-Processing Effects Adaptation") &&
        voiceboxReferenceAuditContent.includes("Pedalboard Dependency Review") &&
        voiceboxReferenceAuditContent.includes("Tauri vs Electron Lessons") &&
        voiceboxReferenceAuditContent.includes("do not approve Beta Candidate") &&
        referenceProjectIndexContent.includes("Voicebox") &&
        referenceProjectIndexContent.includes("Reference only; no code bundled") &&
        referenceProjectIndexContent.includes("OpenStem is not affiliated with or endorsed by Voicebox") &&
        localTranscriptionWorkflowDocContent.includes("Voicebox Reference Adaptation") &&
        localTranscriptionWorkflowDocContent.includes("Voicebox-Informed STT Model Ladder") &&
        transcriptionAutomationWorkflowDocContent.includes("Voicebox-Informed Queue And Recovery") &&
        workflowRunLedgerDocContent.includes("Voicebox Capture Ledger Mapping") &&
        masteringWorkflowDocContent.includes("Voicebox Post-Processing Reference") &&
        masteringReferenceAuditContent.includes("Voicebox Post-Processing Findings"),
      "Test 11.0z.34b: Voicebox audit, index, and workflow docs capture reference-only adaptations",
      "Voicebox docs are missing audit/index/adaptation sections or proof-boundary language",
    );
    assert(
      skillsReadmeContent.includes("voicebox-reference-workflow") &&
        voiceboxReferenceSkillContent.includes("Use Voicebox as a reference, not branding.") &&
        voiceboxReferenceSkillContent.includes("Do not copy Voicebox code without license review.") &&
        voiceboxReferenceSkillContent.includes("Do not add voice cloning by default.") &&
        voiceboxReferenceSkillContent.includes("Cloud upload is disabled by default.") &&
        voiceboxReferenceSkillContent.includes("Effects and mastering must verify output files.") &&
        voiceboxReferenceSkillContent.includes("This workflow does not approve Beta Candidate.") &&
        voiceboxReferenceSkillContent.includes("This workflow does not satisfy stem-separation proof.") &&
        legalContent.includes("Voicebox was studied as a local-first voice I/O workflow reference.") &&
        legalContent.includes("OpenStem is not affiliated with or endorsed by Voicebox.") &&
        !packageJsonContent.includes('"pedalboard"') &&
        !packageJsonContent.toLowerCase().includes("voicebox") &&
        voiceboxReferenceWorkflowContent.includes("voiceCloningEnabledByDefault: false") &&
        voiceboxReferenceWorkflowContent.includes("globalHotkeysApproved: false") &&
        voiceboxReferenceWorkflowContent.includes("cloudUploadByDefault: false") &&
        voiceboxReferenceWorkflowContent.includes("copiedSourceFiles: []"),
      "Test 11.0z.34c: Voicebox skill, legal notice, and dependency guards are present",
      "Voicebox skill/legal guardrails regressed or a premature Voicebox/pedalboard dependency was added",
    );
    assert(
      guiConsistencyAuditContent.includes("GUI Consistency Audit") &&
        guiConsistencyAuditContent.includes("Legal/About did not yet list Local Transcription") &&
        legalAboutUpdateDocContent.includes("Non-Affiliation Language Added") &&
        dependencySecurityAuditContent.includes("No new dependency was added") &&
        dependencySecurityAuditContent.includes("@google/genai") &&
        crashRiskAuditContent.includes("AppErrorBoundary") &&
        crashRiskAuditContent.includes("Long transcript and prompt-output rendering may need virtualization"),
      "Test 11.0z.35: GUI/legal/dependency/security/crash audit docs exist and record remaining risks",
      "Post-transcription/mastering hardening docs are missing findings, dependency posture, or crash risks",
    );
    assert(
      [
        "recordings/",
        "local_recordings/",
        "openstem-recordings/",
        "transcripts/",
        "local_transcripts/",
        "transcription_outputs/",
        "transcript_exports/",
        "prompt_outputs/",
        "document_exports/",
        "archive_exports/",
        "*.vtt.imported.json",
        "*.transcript.json",
        "*.prompt-output.txt",
      ].every((entry) => gitignoreContent.includes(entry)) &&
        packageJsonContent.includes("!**/recordings/**") &&
        packageJsonContent.includes("!**/transcripts/**") &&
        packageJsonContent.includes("!**/prompt_outputs/**") &&
        packageJsonContent.includes("!**/document_exports/**") &&
        verifyElectronArtifactsContent.includes("recordings") &&
        verifyElectronArtifactsContent.includes("transcripts") &&
        verifyElectronArtifactsContent.includes("prompt outputs") &&
        verifyElectronArtifactsContent.includes("document exports") &&
        releaseChecklistContent.includes("local recordings, imported VTT/transcript archives") &&
        releaseChecklistContent.includes("Do not bundle user audio, recordings, transcripts"),
      "Test 11.0z.36: Generated recordings, transcripts, prompt outputs, and document exports stay out of git and packages",
      "Local artifact ignore/package verification/release checklist guardrails regressed",
    );
    const pendingClinicalResults = buildPendingClinicalSectionResults();
    const clinicalReadinessCodes = getDefaultClinicalWorkflowReadiness().map((item) => item.code);
    const clinicalCombinedContent = [
      clinicalWorkflowContent,
      clinicalPromptWorkflowContent,
      clinicalPrivacyPolicyContent,
      localClinicalModelPolicyContent,
      clinicalPromptWorkflowDocContent,
      clinicalPrivacySecurityNotesContent,
      clinicalWorkflowReferenceAuditContent,
      clinicalWorkflowRiskRegisterContent,
      localClinicalModelGuideContent,
      localClinicalModelReferenceAuditContent,
      clinicalPromptSkillContent,
      clinicalPrivacySkillContent,
      manualsContent,
    ].join("\n");
    const clinicalCombinedLower = clinicalCombinedContent.toLowerCase();
    const cloudPhiDecision = canSendPhiToCloud({
      cloudEnabled: false,
      explicitConsent: false,
      baaDocumented: false,
    });
    const sanitizedClinicalLogEvent = sanitizeClinicalLogEvent({
      transcriptText: "private transcript",
      generatedNote: "private note",
      clientName: "private name",
      status: "ok",
    });
    assert(
      appContent.includes("clinical_workflow") &&
        appContent.includes("ClinicalWorkflowBuilder") &&
        appContent.includes("Clinical Workflow") &&
        appContent.includes("Draft notes / Local-first") &&
        manualsContent.includes('sectionId: "clinical_workflow"') &&
        clinicalWorkflowContent.includes("Clinical Workflow Builder") &&
        clinicalWorkflowContent.includes("Prompt Workflow Builder") &&
        clinicalWorkflowContent.includes("HIPAA-aware local-first draft workflow") &&
        clinicalPromptWorkflowContent.includes("Draft only - clinician review required before EHR entry.") &&
        clinicalWorkflowContent.includes("Transcript Input") &&
        clinicalWorkflowContent.includes("Workflow Template") &&
        clinicalWorkflowContent.includes("Prompt Sections") &&
        clinicalWorkflowContent.includes("Section Outputs") &&
        clinicalWorkflowContent.includes("Unified EHR Text Box") &&
        clinicalWorkflowContent.includes("Local Model / Engine") &&
        clinicalWorkflowContent.includes("Run Workflow - Local model not configured") &&
        clinicalPromptWorkflowContent.includes("Section output pending - local LLM not configured.") &&
        DEFAULT_CLINICAL_PROMPT_TEMPLATE.sections.length === 5 &&
        DEFAULT_CLINICAL_PROMPT_TEMPLATE.sections.every((section) =>
          clinicalPromptWorkflowContent.includes(section.title),
        ) &&
        pendingClinicalResults.every((result) => result.status === "LOCAL_LLM_NOT_CONFIGURED" && !result.verified),
      "Test 11.0j: Clinical Workflow submenu is present, sectioned, and draft-only",
      "Clinical Workflow Builder is missing navigation, default sections, pending outputs, or review wording",
    );
    assert(
      clinicalReadinessCodes.includes("CLINICAL_BROWSER_PREVIEW_ONLY") &&
        clinicalReadinessCodes.includes("CLINICAL_TRANSCRIPT_INPUT_MISSING") &&
        clinicalReadinessCodes.includes("LOCAL_LLM_NOT_CONFIGURED") &&
        clinicalReadinessCodes.includes("CLOUD_LLM_DISABLED") &&
        clinicalWorkflowContent.includes("CLOUD_LLM_DISABLED") &&
        clinicalWorkflowContent.includes("LOCAL_LLM_NOT_CONFIGURED") &&
        clinicalWorkflowContent.includes("Browser Preview / Manual Paste Only") &&
        clinicalWorkflowContent.includes("No PHI is uploaded by default.") &&
        clinicalWorkflowContent.includes("getCloudPhiWarning") &&
        clinicalPrivacyPolicyContent.includes("BAA required for cloud PHI processing") &&
        clinicalWorkflowContent.includes("History disabled") &&
        clinicalWorkflowContent.includes("Metadata-only history") &&
        clinicalWorkflowContent.includes("Clear transcript from screen") &&
        clinicalWorkflowContent.includes("Export requires user-selected output path") &&
        clinicalWorkflowContent.includes("Export file verification required") &&
        clinicalPromptWorkflowDocContent.includes("not automatic HIPAA compliance") &&
        clinicalPrivacySecurityNotesContent.includes("HHS Security Rule") &&
        clinicalPrivacySecurityNotesContent.includes("Microsoft HIPAA/HITECH") &&
        clinicalPrivacySkillContent.includes("cloud PHI processing disabled by default") &&
        CLINICAL_PRIVACY_LANGUAGE.notComplianceClaim.includes("not automatic HIPAA compliance") &&
        cloudPhiDecision.allowed === false &&
        shouldStoreTranscriptText("disabled") === false &&
        sanitizedClinicalLogEvent.status === "ok" &&
        !("transcriptText" in sanitizedClinicalLogEvent) &&
        !("generatedNote" in sanitizedClinicalLogEvent) &&
        !("clientName" in sanitizedClinicalLogEvent) &&
        clinicalWorkflowDoesNotAffectReleaseGate().includes("does not approve Beta Candidate") &&
        getClinicalDraftDisclaimer().includes("clinician review required"),
      "Test 11.0k: Clinical privacy gates keep cloud disabled, PHI out of logs, and output review-gated",
      "Clinical privacy/service gates regressed or missing official-reference wording",
    );
    assert(
      [
        "Psychoeducation Topics Reviewed",
        "Benefit From Techniques",
        "Response to Risk Interventions",
        "Plan for Next Session",
        "Talking Points Summary",
        "Do not identify the counselor",
        "Insufficient evidence",
      ].every((label) => clinicalCombinedContent.includes(label)) &&
        ![
          "hipaa compliant",
          "hipaa certified",
          "fully secure",
          "zero risk",
          "medical-device certified",
          "autonomous clinical decision",
        ].some((forbidden) => clinicalCombinedLower.includes(forbidden)),
      "Test 11.0l: Clinical prompt docs preserve evidence limits and avoid privacy/medical overclaims",
      "Clinical prompt workflow lost required sections or gained overclaiming language",
    );
    const defaultClinicalModel = getDefaultClinicalLocalModel();
    const laptopClinicalModels = getClinicalModelsByTier("laptop_fast");
    const balancedClinicalModels = getClinicalModelsByTier("balanced_quality");
    const clinicalLanguageModels = getClinicalModelsByTier("clinical_language_review");
    const localClinicalModelProofReadiness = getClinicalPromptTestReadiness();
    const passingSyntheticOutput = evaluateClinicalDraftOutput(
      "The client reviewed sleep disruption, anxiety before work, paced breathing, and grounding practice.",
      { requiredPrefix: "The client", prohibitCounselorMention: true },
    );
    const counselorMentionOutput = evaluateClinicalDraftOutput("The client and counselor reviewed sleep disruption.", {
      requiredPrefix: "The client",
      prohibitCounselorMention: true,
    });
    assert(
      localClinicalModelPolicyContent.includes("CLINICAL_LOCAL_MODEL_CATALOG") &&
        CLINICAL_LOCAL_MODEL_CATALOG.length >= 6 &&
        laptopClinicalModels.length >= 3 &&
        balancedClinicalModels.length >= 3 &&
        clinicalLanguageModels.length >= 2 &&
        defaultClinicalModel.id === "qwen3-4b-instruct-2507-q4km-ollama" &&
        defaultClinicalModel.tier === "laptop_fast" &&
        defaultClinicalModel.defaultEnabled &&
        defaultClinicalModel.recommendedForProofOfConcept &&
        defaultClinicalModel.license === "Apache-2.0" &&
        defaultClinicalModel.expectedChecksum === null &&
        CLINICAL_LOCAL_MODEL_CATALOG.every((model) => !model.displayName.toLowerCase().includes("hipaa")) &&
        CLINICAL_LOCAL_MODEL_CATALOG.every((model) => !model.displayName.toLowerCase().includes("diagnosis")) &&
        REJECTED_CLINICAL_MODEL_CANDIDATES.some((candidate) => candidate.reason.includes("stable clinical wording")),
      "Test 11.0m: Curated clinical local model policy has laptop, balanced, and review-only tiers",
      "Clinical local model catalog is missing curated tiers, default POC model, or rejection rationale",
    );
    assert(
      CLINICAL_LOCAL_MODEL_PROVIDER_STRATEGY.some(
        (strategy) => strategy.provider === "ollama" && strategy.defaultState === "OLLAMA_NOT_RUNNING",
      ) &&
        CLINICAL_LOCAL_MODEL_PROVIDER_STRATEGY.some(
          (strategy) => strategy.provider === "llama.cpp" && strategy.defaultState === "LLAMA_CPP_NOT_CONFIGURED",
        ) &&
        CLINICAL_LOCAL_MODEL_PROVIDER_STRATEGY.some(
          (strategy) => strategy.provider === "gpt4all" && strategy.defaultState === "GPT4ALL_REFERENCE_ONLY",
        ) &&
        CLINICAL_LOCAL_MODEL_PROVIDER_STRATEGY.some(
          (strategy) => strategy.provider === "cloud" && strategy.defaultState === "CLOUD_LLM_DISABLED",
        ) &&
        clinicalWorkflowContent.includes("Drafting Model") &&
        clinicalWorkflowContent.includes("Clinical Local Model Lane") &&
        clinicalWorkflowContent.includes("Check Local Provider") &&
        clinicalWorkflowContent.includes("Refresh Local Models") &&
        clinicalWorkflowContent.includes("Pull/Install Model - Planned / Manual setup required") &&
        clinicalWorkflowContent.includes("Run Clinical Draft Test") &&
        clinicalWorkflowContent.includes("Clear Model Selection") &&
        clinicalWorkflowContent.includes("Open Setup Guide") &&
        clinicalWorkflowContent.includes("Run one section - Planned") &&
        clinicalWorkflowContent.includes("Run all sections sequentially - Planned") &&
        clinicalWorkflowContent.includes("Rerun failed section - Planned") &&
        clinicalWorkflowContent.includes("Transcript may exceed selected model context") &&
        clinicalLocalModelDoesNotAffectReleaseGate().includes("does not approve Beta Candidate"),
      "Test 11.0n: Clinical model selector UI exposes provider states without claiming readiness",
      "Clinical model selector lost provider states, setup actions, sequential prompt workflow, or release boundary",
    );
    assert(
      CLINICAL_SYNTHETIC_NON_PHI_TRANSCRIPT.includes("sleep disruption") &&
        CLINICAL_SYNTHETIC_NON_PHI_TRANSCRIPT.includes("paced breathing") &&
        CLINICAL_PROMPT_PROOF_TESTS.length === 3 &&
        CLINICAL_PROMPT_PROOF_TESTS.every((test) => test.requiredPrefix === "The client") &&
        CLINICAL_PROMPT_PROOF_TESTS.some((test) => test.sectionTitle === "Psychoeducation Topics Reviewed") &&
        CLINICAL_DRAFT_QUALITY_CHECKS.some((check) => check.label === "Required prefix check") &&
        CLINICAL_DRAFT_QUALITY_CHECKS.some((check) => check.label === "No counselor mention check") &&
        CLINICAL_DRAFT_QUALITY_CHECKS.some((check) => check.label === "Insufficient evidence fallback") &&
        CLINICAL_DRAFT_QUALITY_CHECKS.some((check) => check.label === "Draft-only warning") &&
        localClinicalModelProofReadiness.status === "CLINICAL_LLM_NOT_CONFIGURED" &&
        passingSyntheticOutput.ok &&
        passingSyntheticOutput.status === "CLINICAL_LLM_PROOF_PASSED" &&
        !counselorMentionOutput.ok &&
        counselorMentionOutput.status === "CLINICAL_LLM_OUTPUT_FORMAT_FAILED",
      "Test 11.0o: Clinical local model proof test uses synthetic non-PHI transcript and quality gates",
      "Clinical local model proof test lost synthetic transcript, prefix, counselor, evidence, or draft-only checks",
    );
    assert(
      localClinicalModelGuideContent.includes("Surface Pro 3 or higher") &&
        localClinicalModelGuideContent.includes("Modern 8 GB RAM laptop") &&
        localClinicalModelGuideContent.includes("Modern 16 GB RAM laptop") &&
        localClinicalModelGuideContent.includes("Modern 32 GB RAM laptop/desktop") &&
        localClinicalModelGuideContent.includes("BAA required for cloud PHI processing") &&
        localClinicalModelGuideContent.includes("Clinical proof-of-concept does not satisfy `proof:check`") &&
        localClinicalModelReferenceAuditContent.includes("Selected Proof-Of-Concept Recommendation") &&
        localClinicalModelReferenceAuditContent.includes("Qwen3 4B Instruct 2507") &&
        localClinicalModelReferenceAuditContent.includes("Rejected Defaults") &&
        localClinicalModelReferenceAuditContent.includes("Cloud remains disabled by default") &&
        clinicalPromptWorkflowDocContent.includes(
          "Clinical local model proof-of-concept is not OpenStem separator proof.",
        ) &&
        clinicalPromptSkillContent.includes("Clinical local/chat model readiness is separate") &&
        clinicalPromptSkillContent.includes("Laptop Fast: 3B to 4B local instruct models."),
      "Test 11.0p: Clinical local model docs and skill preserve hardware, cloud, proof, and setup boundaries",
      "Clinical local model guide/reference docs or skill are missing required boundaries",
    );
    const longTranscriptRecommendation = getRecommendedTranscriptWorkflowMode({
      wordCount: 2500,
      sectionCount: 3,
      evidenceRequired: false,
    });
    const complexTranscriptRecommendation = getRecommendedTranscriptWorkflowMode({
      wordCount: 9200,
      sectionCount: 6,
      evidenceRequired: true,
    });
    const transcriptContextMap = buildPreviewContextMap({
      wordCount: 9200,
      themes: ["sleep disruption", "paced breathing"],
      repeatedTopics: ["grounding skills", "work anxiety"],
      timeline: ["concern discussed", "technique reviewed", "plan formed"],
    });
    const dapTemplate = DEFAULT_PROMPT_LIBRARY_TEMPLATES.find((template) => template.templateName === "DAP Note");
    const psychotherapyTemplate = DEFAULT_PROMPT_LIBRARY_TEMPLATES.find(
      (template) => template.templateName === "Psychotherapy Notes",
    );
    const subQuestionPlans = buildSubQuestionPlans(
      (dapTemplate?.sections ?? []).map((section) => ({
        sectionId: section.sectionId,
        label: section.label,
        prompt: section.instructionText,
        maxWords: section.maxWords,
        noBullets: section.noBullets,
        noTables: section.noTables,
        evidenceRequired: section.evidenceRequired,
        insufficientEvidenceFallback: section.insufficientEvidenceFallback,
      })),
      transcriptContextMap,
    );
    const evidenceIndex = buildTranscriptEvidenceIndex(
      "The transcript data supports the assessment and plan. The team reviewed timeline risks, customer feedback, and next sprint actions.",
    );
    const firstEvidence = retrieveEvidenceForPlan(evidenceIndex, subQuestionPlans[0]);
    const draftAnswer = buildDraftSectionAnswer(subQuestionPlans[0], firstEvidence);
    const draftAnswerQuality = evaluateTranscriptSectionAnswer(draftAnswer, subQuestionPlans[0]);
    const finalLineBreakOutput = assemblePlainTextOutput([
      "The client reviewed paced breathing and grounding skills.",
      "The client plans to practice grounding before the next appointment.",
    ]);
    const synthesisPolicy = getTranscriptAnswerSynthesisPolicy();
    assert(
      appContent.includes("transcript_workflow") &&
        appContent.includes("TranscriptWorkflowBuilder") &&
        appContent.includes("Transcript Workflows") &&
        appContent.includes("Prompt library / Not proof") &&
        manualsContent.includes('sectionId: "transcript_workflow"') &&
        transcriptWorkflowContent.includes("Transcript Workflow Builder") &&
        transcriptWorkflowContent.includes("Prompt Library and SubQ + Evidence Workflow") &&
        transcriptWorkflowContent.includes("Quick Mode") &&
        transcriptWorkflowContent.includes("Deep Read Mode") &&
        transcriptWorkflowContent.includes("SubQ + Evidence Mode") &&
        transcriptWorkflowContent.includes("SubQ + Evidence Mode, then assemble plain text outputs with line breaks") &&
        transcriptWorkflowContent.includes("Final Plain Text Output") &&
        transcriptWorkflowContent.includes("No bullets, tables, markdown") &&
        transcriptWorkflowContent.includes("Template dropdown") &&
        transcriptWorkflowContent.includes("Category filter") &&
        transcriptWorkflowContent.includes("Favorites / pinned templates") &&
        transcriptWorkflowContent.includes("Recently used") &&
        transcriptWorkflowContent.includes("Duplicate template") &&
        transcriptWorkflowContent.includes("Rename template") &&
        transcriptWorkflowContent.includes("Add prompt section") &&
        transcriptWorkflowContent.includes("Disable/enable section") &&
        transcriptWorkflowContent.includes("Export library") &&
        transcriptWorkflowContent.includes("Import library") &&
        transcriptWorkflowContent.includes("Native prompt storage available") &&
        transcriptWorkflowContent.includes("Preview failed section preservation") &&
        transcriptWorkflowContent.includes("Run workflow - Local model not configured"),
      "Test 11.0q: Transcript Workflow Builder exposes prompt library and mode selector without claiming runtime",
      "Transcript Workflow Builder navigation, mode selector, final output, or blocked runtime wording is missing",
    );
    assert(
      skillsReadmeContent.includes("subq-rag-transcript-workflow") &&
        skillsReadmeContent.includes("prompt-library-workflow") &&
        subqRagTranscriptSkillContent.includes("SubQ and RAG should work together") &&
        subqRagTranscriptSkillContent.includes("Use Deep Read first for long transcripts") &&
        subqRagTranscriptSkillContent.includes("Do not expose hidden chain-of-thought") &&
        promptLibrarySkillContent.includes("Clinical templates are one category") &&
        promptLibrarySkillContent.includes("Auto-save should be debounced and recoverable") &&
        promptLibrarySkillContent.includes("Do not store transcript text inside prompt templates") &&
        transcriptPromptWorkflowDocContent.includes(
          "Prompt Library lets users quickly switch saved prompt workflows",
        ) &&
        deepTranscriptDocContent.includes("context map") &&
        deepTranscriptReferenceAuditContent.includes("LlamaIndex Sub Question Query Engine") &&
        subqRagReferenceAuditContent.includes("OpenStem-native lightweight services first") &&
        promptLibraryWorkflowDocContent.includes("Built-in templates are read-only originals"),
      "Test 11.0r: Transcript workflow skills and docs preserve SubQ, RAG, prompt-library, and privacy rules",
      "Transcript workflow docs or skills are missing required staged-reading, prompt-library, or privacy boundaries",
    );
    assert(
      deepTranscriptServiceContent.includes("TRANSCRIPT_WORKFLOW_MODES") &&
        TRANSCRIPT_WORKFLOW_MODES.some((mode) => mode.id === "quick" && mode.label === "Quick Mode") &&
        TRANSCRIPT_WORKFLOW_MODES.some((mode) => mode.id === "deep_read" && mode.label === "Deep Read Mode") &&
        TRANSCRIPT_WORKFLOW_MODES.some(
          (mode) => mode.id === "subq_evidence" && mode.label === "SubQ + Evidence Mode",
        ) &&
        longTranscriptRecommendation.status === "DEEP_READ_RECOMMENDED" &&
        complexTranscriptRecommendation.status === "SUBQ_EVIDENCE_RECOMMENDED" &&
        transcriptContextMap.status === "CONTEXT_MAP_PREVIEW_ONLY" &&
        transcriptContextMap.transcriptTextLogged === false &&
        subQuestionPlannerContent.includes("hiddenReasoningExposed: false") &&
        subQuestionPlannerDoesNotExposeChainOfThought() &&
        subQuestionPlans.length === dapTemplate?.sections.length &&
        subQuestionPlans.every(
          (plan) => plan.contextMapRequired && plan.outputRules.finalOutputSeparator === "line_break",
        ) &&
        transcriptEvidenceIndexContent.includes("EVIDENCE_INSUFFICIENT") &&
        evidenceIndex.status === "EVIDENCE_INDEX_READY" &&
        evidenceIndex.cloudEmbeddingsEnabled === false &&
        evidenceIndex.cloudVectorStoreEnabled === false &&
        firstEvidence.status === "EVIDENCE_FOUND" &&
        transcriptAnswerSynthesisContent.includes("SECTION_NEEDS_REVIEW") &&
        synthesisPolicy.noHiddenChainOfThought &&
        synthesisPolicy.noCloudByDefault &&
        draftAnswer.length > 0 &&
        draftAnswerQuality.status !== "SECTION_FAILED" &&
        finalLineBreakOutput.includes("\n\n") &&
        !finalLineBreakOutput.includes("\n-") &&
        !finalLineBreakOutput.includes("|"),
      "Test 11.0s: Deep Read, SubQ planner, evidence index, and answer synthesis stay local and line-break oriented",
      "Transcript SubQ/RAG services lost context-map, evidence, no-cloud, no-chain-of-thought, or final-output guardrails",
    );
    const promptTemplateNames = DEFAULT_PROMPT_LIBRARY_TEMPLATES.map((template) => template.templateName);
    const builtInCopy = duplicatePromptLibraryTemplate(dapTemplate!);
    const validPromptImport = validatePromptLibraryImport({ templates: [builtInCopy] });
    const invalidPromptImport = validatePromptLibraryImport({ templates: [{ templateId: "bad" }] });
    const transcriptTextPromptImport = validatePromptLibraryImport({
      templates: [{ ...builtInCopy, transcriptText: "must not import" }],
    });
    const editablePromptLibrary = ensureEditablePromptLibraryTemplate(DEFAULT_PROMPT_LIBRARY_TEMPLATES, "dap-note");
    const renamedPromptLibrary = renamePromptLibraryTemplate(
      editablePromptLibrary.templates,
      editablePromptLibrary.editableTemplateId,
      "DAP Note Custom Rename",
    );
    const addedPromptSection = addPromptLibrarySection(renamedPromptLibrary, editablePromptLibrary.editableTemplateId);
    const toggledPromptSection = togglePromptLibrarySection(
      addedPromptSection.templates,
      editablePromptLibrary.editableTemplateId,
      addedPromptSection.sectionId,
    );
    const promptUserDocument = createPromptLibraryDocument(toggledPromptSection);
    const importedPromptLibrary = importPromptLibraryTemplates(DEFAULT_PROMPT_LIBRARY_TEMPLATES, [builtInCopy]);
    const exportedPromptLibrary = exportPromptLibraryDocument(DEFAULT_PROMPT_LIBRARY_TEMPLATES);
    const promptLibraryMainContent = fs.readFileSync(path.join(rootDir, "electron-shell", "main.cjs"), "utf8");
    const promptLibraryPreloadContent = fs.readFileSync(path.join(rootDir, "electron-shell", "preload.cjs"), "utf8");
    assert(
      promptLibraryServiceContent.includes("PromptLibraryTemplate") &&
        promptLibraryServiceContent.includes("openstem-prompt-library.json") &&
        promptLibraryServiceContent.includes("ensureEditablePromptLibraryTemplate") &&
        promptLibraryServiceContent.includes("importPromptLibraryTemplates") &&
        promptLibraryServiceContent.includes("PROMPT_LIBRARY_RUN_POLICY") &&
        promptTemplateNames.includes("DAP Note") &&
        promptTemplateNames.includes("Assessment") &&
        promptTemplateNames.includes("Summary / Review") &&
        promptTemplateNames.includes("Review") &&
        promptTemplateNames.includes("Psychotherapy Notes") &&
        promptTemplateNames.includes("Business Meeting Summary") &&
        promptTemplateNames.includes("Legal Review") &&
        promptTemplateNames.includes("Coaching Notes") &&
        promptTemplateNames.includes("Custom Blank Workflow") &&
        !!psychotherapyTemplate &&
        psychotherapyTemplate.category === "clinical" &&
        DEFAULT_PROMPT_LIBRARY_TEMPLATES.some((template) => template.category !== "clinical") &&
        DEFAULT_PROMPT_LIBRARY_TEMPLATES.every(
          (template) => template.outputFormatRules.noBullets && template.outputFormatRules.noTables,
        ) &&
        PROMPT_LIBRARY_AUTOSAVE_POLICY.debounceMs >= 500 &&
        PROMPT_LIBRARY_AUTOSAVE_POLICY.builtInEditBehavior.includes("custom copy") &&
        PROMPT_LIBRARY_STORAGE_POLICY.transcriptTextStoredInTemplates === false &&
        builtInCopy.builtIn === false &&
        builtInCopy.templateName.includes("Custom") &&
        editablePromptLibrary.createdCustomCopy &&
        renamedPromptLibrary.some((template) => template.templateName === "DAP Note Custom Rename") &&
        addedPromptSection.templates.some((template) =>
          template.sections.some((section) => section.sectionId === addedPromptSection.sectionId),
        ) &&
        toggledPromptSection.some((template) =>
          template.sections.some((section) => section.sectionId === addedPromptSection.sectionId && !section.enabled),
        ) &&
        promptUserDocument.templates.every((template) => !template.builtIn) &&
        getUserPromptLibraryTemplates(toggledPromptSection).length === promptUserDocument.templates.length &&
        importedPromptLibrary.importedCount === 1 &&
        PROMPT_LIBRARY_RUN_POLICY.preserveCompletedSectionOutputsOnFailure &&
        validPromptImport.ok &&
        !invalidPromptImport.ok &&
        !transcriptTextPromptImport.ok &&
        !("transcriptText" in exportedPromptLibrary) &&
        promptLibraryMainContent.includes("openstem-prompt-library.json") &&
        promptLibraryMainContent.includes("load-prompt-library") &&
        promptLibraryMainContent.includes("save-prompt-library") &&
        promptLibraryMainContent.includes("validatePromptLibraryDocument") &&
        promptLibraryPreloadContent.includes("loadPromptLibrary") &&
        promptLibraryPreloadContent.includes("savePromptLibrary") &&
        promptLibraryDoesNotAffectReleaseGate().includes("do not approve Beta Candidate") &&
        DEEP_TRANSCRIPT_PRIVACY_POLICY.cloudRagDefault === "disabled" &&
        DEEP_TRANSCRIPT_PRIVACY_POLICY.cloudEmbeddingsDefault === "disabled" &&
        deepTranscriptWorkflowDoesNotAffectReleaseGate().includes("does not approve Beta Candidate") &&
        gitignoreContent.includes("openstem-prompt-library.json"),
      "Test 11.0t: Prompt Library templates, auto-save policy, import/export, storage, and proof boundaries are safe",
      "Prompt Library lost built-ins, custom-copy behavior, import/export validation, local-first storage, or proof boundaries",
    );
    assert(
      basicPitchContent.includes('proofStatus: "DRY_RUN_ONLY"') &&
        basicPitchContent.includes("Browser preflight preview compiled") &&
        basicPitchContent.includes("<INPUT_AUDIO_REQUIRED>") &&
        basicPitchContent.includes("<OUTPUT_FOLDER_REQUIRED>") &&
        basicPitchContent.includes("Preview label only") &&
        !basicPitchContent.includes("C:\\\\Users\\\\Consumer") &&
        !basicPitchContent.includes("C:\\\\FakePath") &&
        !basicPitchContent.includes('proofStatus: "PASS",'),
      "Test 11.1: Basic Pitch browser preview stays dry-run-only and never fake PASS",
      "Basic Pitch browser preview can still report PASS instead of DRY_RUN_ONLY",
    );
    assert(
      basicPitchContent.includes("Browser Preview / Not runnable for local MIDI generation") &&
        basicPitchContent.includes("No local MIDI, WAV, CSV, or") &&
        basicPitchContent.includes("NPZ files were written.") &&
        basicPitchContent.includes("Code: BASIC_PITCH_DRY_RUN_ONLY") &&
        basicPitchContent.includes(
          "Basic Pitch requirements checked on this machine. This does not count as UVR separation proof.",
        ),
      "Test 11.2: Basic Pitch browser preview cannot claim local files or UVR proof",
      "Basic Pitch is missing no-local-file or not-UVR-proof wording",
    );
    assert(
      sunoContent.includes(
        "Sandbox Preview Mode is active. No local PyTorch preflight or model inference is running.",
      ) &&
        sunoContent.includes("No proof report generated") &&
        sunoContent.includes("localFilePath: null") &&
        sunoContent.includes("fileExists: false") &&
        sunoContent.includes("canSendToSeparator: false") &&
        sunoContent.includes("generatedByProof: false") &&
        sunoContent.includes("Generative audio does not") &&
        sunoContent.includes("count as UVR-style AI") &&
        sunoContent.includes("separation proof"),
      "Test 11.3: YuE/generative sandbox cannot claim proof, inference, or local output files",
      "YuE sandbox/generative UI is missing preview-only, no-proof, or no-local-file guards",
    );
    assert(
      !sunoContent.includes("Not bundled with UVR") &&
        sunoContent.includes("External third-party service") &&
        sunoContent.includes("not bundled with OpenStem") &&
        sunoContent.includes("Suno Connector: Not configured") &&
        sunoContent.includes("Generation unavailable until a supported connector is configured.") &&
        sunoContent.includes("This panel can prepare prompts and") &&
        sunoContent.includes("settings") &&
        sunoContent.includes("it cannot generate or fetch songs until a supported") &&
        sunoContent.includes("user-authorized connector is configured.") &&
        sunoContent.includes("Suno Draft Parameters") &&
        sunoContent.includes("Preview Only") &&
        sunoContent.includes("These settings are for planning and copy/paste preparation only.") &&
        sunoContent.includes("Blocked: Connector not configured") &&
        sunoContent.includes("Code: GENERATIVE_CONNECTOR_NOT_CONFIGURED") &&
        sunoContent.includes("disabled={true}"),
      "Test 11.3a: Suno connector remains not configured and draft-parameters-only",
      "Suno connector wording or disabled generation state regressed",
    );
    assert(
      sunoContent.includes("Connector configured:") &&
        sunoContent.includes("Supported auth method:") &&
        sunoContent.includes("Not configured") &&
        sunoContent.includes("Local connector/server reachable:") &&
        sunoContent.includes("Not checked") &&
        sunoContent.includes("Output folder selected:") &&
        sunoContent.includes("Terms and rights warning:") &&
        sunoContent.includes("Not acknowledged"),
      "Test 11.3b: Suno preflight labels use precise blocked connector wording",
      "Suno preflight wording regressed",
    );
    assert(
      !sunoContent.includes("Synthesize ready-to-paste lyrics") &&
        sunoContent.includes("Draft ready-to-paste lyrics, structural segments, and style tags.") &&
        sunoContent.includes("Text-only assistant. Does not create WAV, MP3, stems, or generated audio.") &&
        sunoContent.includes("Gemini API not configured / text assistant unavailable") &&
        sunoContent.includes("Gemini-backed text assistance") &&
        sunoContent.includes("No audio generation, music synthesis, or song rendering") &&
        sunoContent.includes("Draft Text-Only Lyrics, Tags & Title") &&
        !sunoContent.includes("Gemini Compiling Creative Score"),
      "Test 11.3c: Lyric Coprocessor is text-only and does not claim audio synthesis",
      "Lyric/Gemini assistant wording can still imply audio generation",
    );
    assert(
      sunoContent.includes("YuE generation is separate from OpenStem's source-separation proof") &&
        sunoContent.includes("A YuE run does not count as UVR-style AI stem-separation proof") &&
        sunoContent.includes("Planned / Not active") &&
        sunoContent.includes("Not wired / local weights missing") &&
        sunoContent.includes("Code: YUE_LOCAL_ENGINE_NOT_WIRED") &&
        sunoContent.includes("Backend missing") &&
        sunoContent.includes("Dry-run preflight ready") &&
        sunoContent.includes("generatedByProof: false") &&
        !sunoContent.includes("YuE local generation proof passed.") &&
        !sunoContent.includes("PASS: Verified Locally!") &&
        !sunoContent.includes("PASS: proven locally!") &&
        !sunoContent.includes("Generate Sandbox Simulation Track"),
      "Test 11.3d: YuE remains not active and excluded from separation proof",
      "YuE wording can still imply active backend generation or proof",
    );
    assert(
      !sunoContent.includes("fileVerified = true; // fallback") &&
        sunoContent.includes("Local output verification failed; track will not be reusable.") &&
        sunoContent.includes("Native audio-file verifier is unavailable; track will not be reusable.") &&
        sunoContent.includes("canSendToSeparator: fileVerified") &&
        sunoContent.includes("canSendToMixer: fileVerified"),
      "Test 11.3d.1: YuE local output reuse requires verified non-empty audio file",
      "YuE local generation can still mark unverified local outputs reusable",
    );
    assert(
      sunoContent.includes("Use only supported, user-authorized connection methods.") &&
        sunoContent.includes("OpenStem does not support raw cookies") &&
        sunoContent.includes("session-token pasting") &&
        sunoContent.includes("service-limit bypassing") &&
        sunoContent.includes("paywall bypassing") &&
        sunoContent.includes("unauthorized account access") &&
        !sunoContent.includes("paste raw browser cookies") &&
        !sunoContent.includes("session-token header forwarding") &&
        !sunoContent.includes("bypass service limits"),
      "Test 11.3e: Generative connectors do not encourage unsafe auth or bypass workflows",
      "Unsafe cookie/session-token or bypass language regressed",
    );
    assert(
      classicConsoleContent.includes("FFmpeg Executable Path") &&
        classicConsoleContent.includes("customFFmpegPath") &&
        classicConsoleContent.includes("Select a local ffmpeg executable") &&
        classicConsoleContent.includes("FFmpeg readiness does not verify model weights") &&
        !classicConsoleContent.includes(': ["tracking_demo_44k.wav"]') &&
        !classicConsoleContent.includes('selectedOutput || "C:\\\\Users\\\\Consumer\\\\Music_Stems\\\\"') &&
        !classicConsoleContent.includes('<option value="dml"'),
      "Test 11.3f: Classic Console starts without fake paths and supports selected FFmpeg path recovery",
      "Classic Console regressed to fake defaults, legacy DML option, or PATH-only FFmpeg recovery",
    );
    assert(
      classicConsoleContent.includes("Browser Preview / Not runnable for native AI separation") &&
        classicConsoleContent.includes("getDiagnosticCodeForLegacyBlocker") &&
        classicConsoleContent.includes("Code: {b.diagnosticCode}") &&
        downloaderContent.includes("Browser Preview / Not runnable") &&
        basicPitchContent.includes("Browser Preview / Not runnable for local MIDI generation") &&
        legalContent.includes(
          "Actions are preview-only and cannot run native downloads, model verification, or real audio separation.",
        ),
      "Test 11.4: Browser mode truth states remain not-runnable and cannot claim native access",
      "Browser-mode UI is missing explicit not-runnable/native-disabled wording",
    );
    assert(
      !combinedTruthContent.includes("Browser Preview Mode: Native backend active") &&
        !combinedTruthContent.includes("Browser Preview Mode: packaged runtime diagnostics passed") &&
        !combinedTruthContent.includes("Browser Preview Mode: local file path verified"),
      "Test 11.5: Browser mode cannot claim native backend, packaged runtime, or verified local paths",
      "Browser preview contains forbidden native/runtime/local-path success wording",
    );
    assert(
      downloaderContent.includes("OpenStem Model Manager & Proof Gate") &&
        downloaderContent.includes("Local Weights") &&
        downloaderContent.includes("Imported / Hash unavailable") &&
        downloaderContent.includes("It remains not proof-eligible until") &&
        downloaderContent.includes("expected SHA-256 metadata is supplied and matched.") &&
        downloaderContent.includes("Auth Required") &&
        downloaderContent.includes("Access Denied / Gated") &&
        downloaderContent.includes("This source returned HTTP 401.") &&
        downloaderContent.includes("This source returned HTTP 404 / Not Found.") &&
        downloaderContent.includes("Network Unavailable") &&
        downloaderContent.includes("DNS Failed") &&
        downloaderContent.includes("Source Timeout") &&
        downloaderContent.includes("Resolve Source") &&
        downloaderContent.includes("Reconnect Local File") &&
        downloaderContent.includes("Search Selected Folder") &&
        downloaderContent.includes("Search Model Library") &&
        downloaderContent.includes("Use Verified Match") &&
        downloaderContent.includes("Blocked: Hash Required") &&
        downloaderContent.includes("Retry Source Check: CLI only / Not active in UI") &&
        downloaderContent.includes("Lane 1 - Curated OpenStem Catalog") &&
        downloaderContent.includes("Lane 2 - User Custom Model Library") &&
        downloaderContent.includes("Managed Local Model Index") &&
        downloaderContent.includes("openstem-models.local.json in app data") &&
        downloaderContent.includes("Local-AI-style cache ledger") &&
        downloaderContent.includes("OpenStem separates model compatibility from hardware fit.") &&
        downloaderContent.includes("Large or GPU-heavy models show warnings, not") &&
        downloaderContent.includes("automatic rejection, unless backend, source metadata, or SHA-256 rules fail.") &&
        downloaderContent.includes("Supported devices") &&
        downloaderContent.includes("Estimated RAM") &&
        downloaderContent.includes("Local Index State") &&
        downloaderContent.includes("Import Metadata JSON") &&
        downloaderContent.includes("Custom / Hash unavailable") &&
        downloaderContent.includes("Remove Entry") &&
        downloaderContent.includes("Recommended action:") &&
        downloaderContent.includes("filename matches are candidates only until SHA-256 matches expected metadata") &&
        downloaderContent.includes("Golden CPU Proof Model Lane") &&
        downloaderContent.includes("Golden proof model not ready - expected SHA-256 match required") &&
        downloaderContent.includes("Golden proof model ready for CPU E2E proof") &&
        downloaderContent.includes("Hugging Face authentication: Planned / Not active.") &&
        downloaderContent.includes("Candidate sources remain unverified until expected SHA-256") &&
        downloaderContent.includes("Strict metadata") &&
        downloaderContent.includes("JSON import rejects malformed hashes or missing licenses") &&
        downloaderContent.includes("Code: {sourceStatusUi.diagnosticCode}") &&
        downloaderContent.includes("Configured Hugging Face Source Entries") &&
        !downloaderContent.includes("Trusted Hugging Face Model Library Sources"),
      "Test 11.6: Model Manager preserves proof gate, local-weight, manual-import, and broken-source truth",
      "Model Manager proof/source wording regressed",
    );
    assert(
      downloaderContent.includes('item.verifiedStatus !== "verified"') &&
        downloaderContent.includes('filterState === "Download Available"') &&
        downloaderContent.includes('item.verifiedStatus === "verified"'),
      "Test 11.6a: Auth-required sources cannot enter normal download-ready flow",
      "ModelDownloader no longer gates download-ready UI by verified source status",
    );
    assert(
      batchEncoderContent.includes("No files currently selected in transcode queue.") &&
        batchEncoderContent.includes("Output directory folder target path is missing.") &&
        batchEncoderContent.includes("BATCH_QUEUE_EMPTY") &&
        batchEncoderContent.includes("BATCH_OUTPUT_FOLDER_MISSING") &&
        batchEncoderContent.includes("Code: {block.diagnosticCode}"),
      "Test 11.6b: Batch Encoder queue and output blockers expose diagnostic codes",
      "Batch Encoder blockers are missing structured diagnostic codes",
    );
    assert(
      batchEncoderContent.includes("customFFmpegPath") &&
        batchEncoderContent.includes("Select FFmpeg Executable") &&
        batchEncoderContent.includes("BATCH_ENCODER_FFMPEG_MISSING") &&
        batchEncoderContent.includes("BATCH_ENCODER_DRY_RUN_ONLY") &&
        batchEncoderContent.includes("No output files were written") &&
        batchEncoderContent.includes("No subprocess executed") &&
        batchEncoderContent.includes("OpenStem does not bundle FFmpeg") &&
        batchEncoderContent.includes("Codec support is FFmpeg-build-dependent") &&
        batchEncoderContent.includes("conversion readiness is not AI proof") &&
        batchEncoderContent.includes("Preview FFmpeg CLI command (not executed)") &&
        !batchEncoderContent.includes("C:\\\\Users\\\\Consumer") &&
        !batchEncoderContent.includes("Vocals_Split_Original.wav") &&
        !batchEncoderContent.includes("Drums_Stem_High_Gain.wav") &&
        !batchEncoderContent.includes("Exit Code: 0 (Success)") &&
        !batchEncoderContent.includes("Conversion run successful") &&
        !batchEncoderContent.includes("system-bundled executables"),
      "Test 11.6c: Batch Encoder remains dry-run/non-AI until real FFmpeg conversion writes verified outputs",
      "Batch Encoder regressed to fake paths, fake success, bundled-FFmpeg wording, or proof ambiguity",
    );

    const brokenOrUnavailableModels = MODEL_REGISTRY.filter(
      (model) =>
        model.verifiedStatus === "auth_required" ||
        model.verifiedStatus === "broken_link" ||
        model.verifiedStatus === "unavailable" ||
        model.verifiedStatus === "source_unavailable" ||
        model.verifiedStatus === "access_denied" ||
        model.verifiedStatus === "rate_limited",
    );
    assert(
      MODEL_REGISTRY.filter((model) => model.verifiedStatus === "auth_required").length >= 22 &&
        MODEL_REGISTRY.filter((model) => model.verifiedStatus === "broken_link").length === 2 &&
        brokenOrUnavailableModels.length >= 24 &&
        brokenOrUnavailableModels.every((model) => model.verifiedStatus !== "verified"),
      "Test 11.7: Auth-required, broken-link, and unavailable model sources remain blocked",
      "A broken/unavailable registry source was treated as verified",
    );

    const ensembleModels = MODEL_REGISTRY.filter((model) => model.architecture === "Ensemble");
    const manualImportWithoutHash = getModelProofEligibility(
      {
        architecture: "VR",
        name: "manual_without_hash.pth",
        sourceType: "manual_import",
        downloaded: true,
        license: "MIT",
      } as any,
      { exists: true, status: "installed_hash_unavailable", hashChecked: false },
    );
    assert(
      ensembleModels.length > 0 &&
        ensembleModels.every(
          (model) =>
            getModelProofEligibility(model as any, {
              exists: true,
              status: "hash_verified",
              hashChecked: true,
              hashMatches: true,
            }).proofEligible === false,
        ) &&
        manualImportWithoutHash.proofEligible === false &&
        manualImportWithoutHash.reason === "manual_import_required",
      "Test 11.8: Ensemble presets and manual imports without SHA-256 are never proof-eligible weights",
      "Ensemble preset or manual import without expected SHA-256 became proof-eligible",
    );
    assert(
      ensemblePlannerContent.includes("Ensemble Mode: Planning View / Not active") &&
        ensemblePlannerContent.includes("Code: ENSEMBLE_PLANNER_ONLY") &&
        ensemblePlannerContent.includes("panel plans ensemble workflows only.") &&
        ensemblePlannerContent.includes("does not run model aggregation") &&
        ensemblePlannerContent.includes("create output files") &&
        ensemblePlannerContent.includes("count as AI") &&
        !ensemblePlannerContent.includes("Build or preview multi-model separation workflows."),
      "Test 11.8a: Ensemble planner top status is planner-only and not executable",
      "Ensemble planner header still implies executable preview or proof",
    );
    assert(
      ensemblePlannerContent.includes("Input File:") &&
        ensemblePlannerContent.includes("Input Metadata:") &&
        ensemblePlannerContent.includes("Execution Status:") &&
        ensemblePlannerContent.includes("Planner only") &&
        !ensemblePlannerContent.includes("Input file selected"),
      "Test 11.8b: Ensemble planner does not claim input selected when metadata is unchecked",
      "Ensemble planner regressed to fake input-selected wording",
    );
    assert(
      ensemblePlannerContent.includes("Model Slots:") &&
        ensemblePlannerContent.includes("Selected Models:") &&
        ensemblePlannerContent.includes("verified model files selected") &&
        ensemblePlannerContent.includes("Verified Model Files Selected") &&
        ensemblePlannerContent.includes("verifiedSelectedModelFiles = 0") &&
        ensemblePlannerContent.includes("Verified File Selected:") &&
        ensemblePlannerContent.includes(
          "Required for Execution: 2 or more verified model outputs or compatible models",
        ) &&
        !ensemblePlannerContent.includes("At least 2 models selected"),
      "Test 11.8c: Ensemble planner separates placeholder slots from selected verified model files",
      "Ensemble planner counts placeholder slots as selected models",
    );
    assert(
      ensemblePlannerContent.includes("Execution unavailable - planner only") &&
        ensemblePlannerContent.includes("Backend runner not implemented. Several runtime checks remain not checked.") &&
        ensemblePlannerContent.includes("Code: ENSEMBLE_BACKEND_NOT_IMPLEMENTED") &&
        ensemblePlannerContent.includes("Required checks not completed:") &&
        ensemblePlannerContent.includes("input file verification") &&
        ensemblePlannerContent.includes("model file verification") &&
        ensemblePlannerContent.includes("Python/audio-separator readiness") &&
        ensemblePlannerContent.includes("FFmpeg readiness") &&
        ensemblePlannerContent.includes("output folder verification") &&
        ensemblePlannerContent.includes("disk space check") &&
        ensemblePlannerContent.includes("device mode check") &&
        ensemblePlannerContent.includes("backend implementation") &&
        !ensemblePlannerContent.includes("Blocked: 2 requirements missing") &&
        !ensemblePlannerContent.includes("Blocked: {blockers.length} requirements missing"),
      "Test 11.8d: Ensemble planner blocker summary does not fake a small blocker count",
      "Ensemble planner blocker summary regressed to inaccurate count wording",
    );
    assert(
      ensemblePlannerContent.includes("Static VRAM Estimate") &&
        ensemblePlannerContent.includes("Live VRAM Check:") &&
        ensemblePlannerContent.includes("Static planning estimate / Not a live VRAM check") &&
        !ensemblePlannerContent.includes("Estimated Peak VRAM"),
      "Test 11.8e: Ensemble planner labels VRAM as static planning estimate",
      "Ensemble planner VRAM wording implies a live hardware check",
    );
    assert(
      ensemblePlannerContent.includes("Planned Output Target") &&
        ensemblePlannerContent.includes(
          "Output target reference only. No files are generated from this planner view.",
        ) &&
        ensemblePlannerContent.includes(
          "If implemented, an ensemble workflow may compare, subtract, or combine outputs",
        ) &&
        ensemblePlannerContent.includes("This planner does not execute those operations.") &&
        ensemblePlannerContent.includes("does not run ensemble") &&
        ensemblePlannerContent.includes("create verified stems") &&
        !ensemblePlannerContent.includes("4-Stem Output Target") &&
        !ensemblePlannerContent.includes("Subtracting Model A's output"),
      "Test 11.8f: Ensemble planner output and math stages are reference-only",
      "Ensemble planner output or math wording implies execution or generated files",
    );
    assert(
      ensemblePlannerContent.includes("<button") &&
        ensemblePlannerContent.includes("disabled") &&
        ensemblePlannerContent.includes("Run Ensemble Pipeline") &&
        ensemblePlannerContent.includes("Backend not implemented") &&
        manualsContent.includes("This panel plans future ensemble workflows without running them.") &&
        manualsContent.includes("Do not treat planner output as generated stems or AI proof.") &&
        !manualsContent.includes("Run or preview the pipeline layout."),
      "Test 11.8g: Ensemble planner run path and manual remain blocked/non-proof",
      "Ensemble planner run button or manual implies active execution",
    );
    const noSessionMixerState = getMixerSessionState({
      useDemo: false,
      stemsCount: 0,
      activeVerifiedStemsCount: 0,
      anyMissingStems: true,
    });
    const demoMixerState = getMixerSessionState({
      useDemo: true,
      stemsCount: 4,
      activeVerifiedStemsCount: 0,
      anyMissingStems: true,
    });
    const missingFilesMixerState = getMixerSessionState({
      useDemo: false,
      stemsCount: 2,
      activeVerifiedStemsCount: 0,
      anyMissingStems: true,
    });
    const verifiedMixerState = getMixerSessionState({
      useDemo: false,
      stemsCount: 2,
      activeVerifiedStemsCount: 2,
      anyMissingStems: false,
    });
    const blockedExportState = getMixerExportState({
      contentState: verifiedMixerState,
      isExporterImplemented: false,
      outputFolderSelected: true,
      isOutputFolderWritable: true,
      activeVerifiedStemsCount: 2,
      anyMissingStems: false,
    });
    const readyExportState = getMixerExportState({
      contentState: verifiedMixerState,
      isExporterImplemented: true,
      outputFolderSelected: true,
      isOutputFolderWritable: true,
      activeVerifiedStemsCount: 2,
      anyMissingStems: false,
    });
    assert(
      noSessionMixerState === "no_session" &&
        demoMixerState === "demo_preview" &&
        missingFilesMixerState === "missing_files" &&
        verifiedMixerState === "verified_session_loaded" &&
        blockedExportState === "export_blocked" &&
        readyExportState === "export_ready",
      "Test 11.9: Stem Mixer computes explicit session and export truth states",
      "Stem Mixer session/export state helper regressed",
    );
    assert(
      mixerContent.includes("No verified stem session loaded") &&
        mixerContent.includes("No verified job loaded") &&
        mixerContent.includes("Not available — no verified separation job loaded") &&
        mixerContent.includes("No backend task active in mixer") &&
        mixerContent.includes("0 — no verified stems") &&
        !mixerContent.includes("Original_Track.wav") &&
        !mixerContent.includes("mel_band_roformer_karaoke_sg.onnx") &&
        !mixerContent.includes("bs_roformer"),
      "Test 11.9a: Stem Mixer no-session metadata stays unavailable instead of fake job metadata",
      "Stem Mixer no-session metadata can still show fake model, input, or category values",
    );
    assert(
      mixerContent.includes("Demo Preview Only") &&
        mixerContent.includes("Demo stems are preview-only and cannot") &&
        mixerContent.includes("be exported") &&
        mixerContent.includes("Demo or unverified stems cannot be exported.") &&
        mixerContent.includes("canExport: false") &&
        mixerContent.includes('proofSource: "demo"') &&
        mixerContent.includes("demo preview only / not AI proof"),
      "Test 11.9b: Stem Mixer demo preview remains non-proof and non-exportable",
      "Stem Mixer demo preview can be mistaken for proof or export-ready stems",
    );
    assert(
      mixerContent.includes("Planned bleed-reduction tools may attempt") &&
        mixerContent.includes("reduce overlapping frequencies between stems after") &&
        mixerContent.includes("legacy/reference control") &&
        mixerContent.includes("not wired to an active") &&
        mixerContent.includes("backend.") &&
        mixerContent.includes("Passive Isolation") &&
        mixerContent.includes("Legacy reference / Not wired") &&
        mixerContent.includes("High-Frequency Trim") &&
        mixerContent.includes("Planned / Not active") &&
        mixerContent.includes("This planned tool would reduce content above a selected cutoff if wired.") &&
        mixerContent.includes("It is not currently applied to") &&
        mixerContent.includes("loaded audio.") &&
        mixerContent.includes("Planned normalization would balance stem loudness") &&
        mixerContent.includes("playback/export backends") &&
        mixerContent.includes("not currently active") &&
        !mixerContent.includes("adaptive isolation models") &&
        !mixerContent.includes("Affects preview playback only"),
      "Test 11.9c: Stem Mixer planned post-processing does not claim active backend behavior",
      "Stem Mixer post-processing wording implies active processing",
    );
    assert(
      mixerContent.includes("Exporter backend not implemented.") &&
        mixerContent.includes("No stem session loaded.") &&
        mixerContent.includes("Output folder not selected.") &&
        mixerContent.includes("One or more missing stem files detected (cannot export demo or unverified stems).") &&
        mixerContent.includes("Code: {blocker.diagnosticCode}") &&
        mixerContent.includes("MIXER_NO_VERIFIED_SESSION") &&
        mixerContent.includes("MIXER_EXPORT_BACKEND_MISSING") &&
        mixerContent.includes("MIXER_STEM_FILES_MISSING") &&
        mixerContent.includes("Exporter Disabled") &&
        mixerContent.includes("Export Mixdown") &&
        mixerContent.includes("Planned / Not active"),
      "Test 11.9d: Stem Mixer export remains disabled without verified real stems",
      "Stem Mixer export blockers or disabled state regressed",
    );
    assert(
      globalSettingsContent.includes("cleanup preview only. Native Electron is required to delete temp files.") &&
        globalSettingsContent.includes("failed-download cleanup preview only. Native Electron is required.") &&
        globalSettingsContent.includes("model cache reset preview only. Native Electron is required.") &&
        globalSettingsContent.includes("customFFmpegPath") &&
        globalSettingsContent.includes("Select FFmpeg Executable") &&
        globalSettingsContent.includes("OpenStem does not bundle FFmpeg") &&
        globalSettingsContent.includes("FFmpeg readiness is not model proof") &&
        globalSettingsContent.includes("checked={state.saveNoisyOutput}") &&
        globalSettingsContent.includes("Legacy reference / Not wired") &&
        globalSettingsContent.includes("Global defaults apply to newly initialized jobs") &&
        !globalSettingsContent.includes(
          "Browser Preview Mode: All simulated process runtime temporary directories wiped clean!",
        ) &&
        !globalSettingsContent.includes(
          "Browser Preview Mode: Purged corrupt partial download registers successfully.",
        ),
      "Test 11.10: Global Settings browser cleanup and stored/planned settings cannot claim real proof or deletion",
      "Global Settings browser cleanup or stored-setting wording regressed",
    );
    assert(
      skillsReadmeContent.includes("music-midi-workflow") &&
        skillsReadmeContent.includes("audio-format-workflow") &&
        skillsReadmeContent.includes("local-transcription-workflow") &&
        musicMidiSkillContent.includes("Basic Pitch is audio-to-MIDI only") &&
        musicMidiSkillContent.includes("MIDI, YuE, Suno, and generation never satisfy stem-separation proof") &&
        musicMidiSkillContent.includes("BASIC_PITCH_DRY_RUN_ONLY") &&
        audioFormatSkillContent.includes("Format conversion is not stem separation") &&
        audioFormatSkillContent.includes("FFmpeg readiness is required for real conversion") &&
        audioFormatSkillContent.includes("BATCH_ENCODER_DRY_RUN_ONLY") &&
        localTranscriptionSkillContent.includes("Whisper model readiness is separate from separator model readiness") &&
        localTranscriptionSkillContent.includes("PDF export is not AI proof"),
      "Test 11.10a: Music/MIDI, audio-format, and transcription workflow skills preserve proof boundaries",
      "Workflow skills are missing or no longer describe MIDI/generation/audio-format/transcription proof boundaries",
    );
    assert(
      UPDATE_READINESS_LANES.length === 3 &&
        updateReadinessSummary.includes("APP_UPDATE_BACKEND_NOT_CONFIGURED") &&
        updateReadinessSummary.includes("MODEL_UPDATE_MANIFEST_MISSING") &&
        updateReadinessSummary.includes("MODEL_UPDATE_HASH_REQUIRED") &&
        UPDATE_READINESS_LANES.every((lane) => lane.autoInstallAllowed === false) &&
        downloaderContent.includes("Update Readiness Center") &&
        downloaderContent.includes("No update check has run.") &&
        downloaderContent.includes("No silent installs") &&
        downloaderContent.includes("Check Program Updates - Not configured") &&
        downloaderContent.includes("Check Catalog Manifest - Not configured") &&
        downloaderContent.includes("Auto Replace Weights - Not allowed") &&
        downloaderContent.includes("Download and verify replacement") &&
        downloaderContent.includes("Blocked: source not verified") &&
        downloaderContent.includes("Blocked: SHA-256 required") &&
        downloaderContent.includes("Catalog metadata cannot make a model proof-eligible by itself") &&
        globalSettingsContent.includes("Program & Model Update Policy") &&
        globalSettingsContent.includes("No automatic background downloads") &&
        globalSettingsContent.includes("Program") &&
        globalSettingsContent.includes("updates require a signed release manifest") &&
        globalSettingsContent.includes("model updates require source/license metadata and expected") &&
        globalSettingsContent.includes("Manual updates only") &&
        classicConsoleContent.includes("Future Model Catalog Manifest Source") &&
        classicConsoleContent.includes("Reference-only future update lane") &&
        classicConsoleContent.includes("No catalog refresh, model download, or verification state") &&
        classicConsoleContent.includes("changes occur from this field.") &&
        !classicConsoleContent.includes("Allows instant updates of model weights listings schemas") &&
        !downloaderContent.toLowerCase().includes("up to date") &&
        !downloaderContent.includes("Update Weights"),
      "Test 11.10b: Update UI stays manifest/hash gated and avoids fake freshness claims",
      "Update UI can imply a live updater, silent install, or unverified model replacement",
    );
    assert(
      skillsReadmeContent.includes("update-workflow") &&
        updateWorkflowSkillContent.includes("Do not fake update checks.") &&
        updateWorkflowSkillContent.includes("Do not silently install updates.") &&
        updateWorkflowSkillContent.includes("Do not silently replace model weights.") &&
        updateWorkflowSkillContent.includes("Use `MODEL_UPDATE_HASH_REQUIRED`") &&
        updateStrategyContent.includes("No app-update feed is configured.") &&
        updateStrategyContent.includes("No signed update manifest is configured.") &&
        updateStrategyContent.includes("No automatic update installer is wired.") &&
        updateStrategyContent.includes("signed release artifacts or a documented trusted digest policy") &&
        updateStrategyContent.includes("Remote catalog metadata is untrusted until validated.") &&
        updateStrategyContent.includes("Catalog metadata alone cannot make a model proof-eligible.") &&
        updateStrategyContent.includes("Download completion is not verification.") &&
        securityPolicyContent.includes("Do not include secrets, private audio files, private model weights") &&
        securityPolicyContent.includes("renderer code cannot execute arbitrary commands") &&
        securityPolicyContent.includes("Passing an app update check is not AI proof.") &&
        securityPolicyContent.includes("Passing a model catalog update is not model proof.") &&
        securityPolicyContent.includes("Beta Candidate is not approved by this security policy draft.") &&
        !packageJsonContent.includes('"electron-updater"') &&
        !packageJsonContent.includes('"update-electron-app"') &&
        releaseChecklistContent.includes("## Update Readiness Gate") &&
        releaseChecklistContent.includes("## Security Policy Gate") &&
        releaseChecklistContent.includes("signed release manifest") &&
        releaseChecklistContent.includes("download completion is not treated as model verification"),
      "Test 11.10c: Update skill, strategy doc, and release checklist preserve future-update gates",
      "Update helper docs or checklist no longer preserve app/catalog/model update boundaries",
    );
    assert(
      brandingContent.includes('RELEASE_STATE = "Hardened Functional Alpha"') &&
        legalContent.includes("One verified local CPU E2E stem-separation proof lane has completed") &&
        legalContent.includes("A single golden proof model may validate one CPU E2E vertical slice only.") &&
        readmeContent.includes(
          "`release:check` verifies application tooling, packaging, and registry safety. Passing it does not by itself approve Beta Candidate status;",
        ) &&
        proofCheckContent.includes("RESULT: BLOCKED") &&
        proofCheckContent.includes("Code: PROOF_BETA_BLOCKED") &&
        proofCheckContent.includes("Code: PROOF_MODEL_MISSING") &&
        proofCheckContent.includes("Code: PROOF_E2E_NOT_RUN") &&
        proofModelEvaluatorContent.includes("MODEL_LOCAL_HASH_MISMATCH") &&
        proofCheckContent.includes("Do not run CPU AI proof until a proof-eligible model asset exists.") &&
        proofCheckContent.includes("Golden proof model readiness:") &&
        proofCheckContent.includes("proof model configured:") &&
        proofCheckContent.includes("proof ready:") &&
        proofCheckContent.includes("CPU proof attempted:") &&
        proofCheckContent.includes("RESULT: CPU_E2E_PROOF_PASSED") &&
        proofAssetChecklistContent.includes("## Golden CPU Proof Model Lane") &&
        proofAssetChecklistContent.includes(
          "This proves the OpenStem local AI separation pipeline for that one model/backend/device combination only.",
        ) &&
        releaseChecklistContent.includes("## Golden Proof Model Gate") &&
        releaseChecklistContent.includes("It does not prove the full model catalog") &&
        manualsContent.includes("FFmpeg utility processing does not count as AI proof."),
      "Test 11.11: Release/proof wording preserves Alpha state, Beta blocker, proof blocker, and FFmpeg non-AI truth",
      "Release/proof wording no longer protects Alpha/Beta/proof/FFmpeg boundaries",
    );
    assert(
      !combinedTruthLower.includes("production ready") &&
        !combinedTruthLower.includes("official release mode") &&
        !/\bcertified\b/i.test(combinedTruthContent) &&
        !combinedTruthLower.includes("perfect separation") &&
        !combinedTruthLower.includes("perfect separations") &&
        !combinedTruthLower.includes("ai proof passed"),
      "Test 11.12: Forbidden release/proof hype wording stays out of UI and docs",
      "Forbidden wording found: production ready, official release mode, certified, perfect separation, or AI proof passed",
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
