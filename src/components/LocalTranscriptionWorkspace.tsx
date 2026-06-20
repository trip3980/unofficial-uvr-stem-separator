import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle,
  Clock,
  Download,
  FileAudio,
  FileText,
  FolderOpen,
  Mic,
  RefreshCw,
  Save,
  Shield,
  SlidersHorizontal,
  Upload,
  Users,
  Volume2,
} from "lucide-react";

import {
  DEFAULT_TRANSCRIPTION_FILENAME_TEMPLATE,
  buildTranscriptionFilenamePreview,
} from "../services/transcriptionFilenamePolicy";
import {
  DOCUMENT_IMPORT_FORMAT_POLICIES,
  DOCUMENT_OUTPUT_FORMAT_POLICIES,
  documentFormatsDoNotAffectReleaseGate,
} from "../services/documentFormatPolicy";
import { buildDocumentImportPlan } from "../services/documentImportPolicy";
import {
  DOCUMENT_EXPORT_FILENAME_TEMPLATES,
  buildDocumentExportPlan,
  buildExternalOfficeConverterPlan,
} from "../services/documentExportPolicy";
import {
  DEFAULT_TRANSCRIPTION_AUTOMATION_MODE,
  DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS,
  DEFAULT_TRANSCRIPTION_OVERWRITE_POLICY,
  TRANSCRIPTION_AUTOMATION_FOLDER_POLICY,
  TRANSCRIPTION_AUTOMATION_MODES,
  TRANSCRIPTION_OVERWRITE_POLICY_OPTIONS,
  buildImportedAudioAutomationWorkflowPlan,
  buildPostProcessingEditorState,
  buildRecordingAutomationWorkflowPlan,
  buildVttAutomationWorkflowPlan,
  evaluateOverwritePolicy,
  transcriptionAutomationDoesNotAffectReleaseGate,
  type TranscriptionAutomationModeId,
  type TranscriptionOverwritePolicyId,
} from "../services/transcriptionAutomationWorkflow";
import {
  CHECKPOINT_AUTOMATION_CONTROLS,
  CHECKPOINT_AUTOMATION_PRESETS,
  DEFAULT_CHECKPOINT_STOP_STAGE_ID,
  buildCheckpointWorkflowPlan,
  checkpointAutomationDoesNotAffectReleaseGate,
  getCheckpointResumeSummary,
  type CheckpointAutomationPresetId,
  type CheckpointWorkflowSourceType,
  type CheckpointWorkflowStageId,
} from "../services/transcriptionWorkflowPipeline";
import {
  WORKFLOW_RUN_PRESETS,
  applyWorkflowEdit,
  createWorkflowArtifactRecord,
  createWorkflowRunRecord,
  failWorkflowStage,
  getWorkflowPresetById,
  getWorkflowStatusSummary,
  workflowRunLedgerDoesNotAffectReleaseGate,
  type WorkflowRunPresetId,
} from "../services/workflowRunLedger";
import {
  SUPPORTED_TRANSCRIPTION_INPUT_FORMATS,
  TRANSCRIPTION_BACKEND_OPTIONS,
  TRANSCRIPTION_BULK_ACTIONS,
  TRANSCRIPTION_DASHBOARD_FOLDERS,
  TRANSCRIPTION_EXPORT_FORMAT_POLICIES,
  TRANSCRIPTION_LANGUAGE_OPTIONS,
  TRANSCRIPTION_MODE_PRESETS,
  TRANSCRIPTION_SPEAKER_COUNT_OPTIONS,
  WHISPER_MODEL_OPTIONS,
  getDefaultTranscriptionReadiness,
  transcriptionDoesNotAffectReleaseGate,
} from "../services/transcriptionPolicy";
import {
  RECORDING_QUALITY_PRESETS,
  SYNTHETIC_VTT_FIXTURE,
  TRANSCRIPTION_INTAKE_FOLDER_POLICY,
  TRANSCRIPT_ARCHIVE_EXPORT_POLICY,
  applySpeakerRenameMap,
  buildSpeakerRenameMap,
  buildTranscriptArchiveExportPlan,
  parseVttTranscriptContent,
  segmentsToCleanTranscript,
  vttWorkflowDoesNotAffectReleaseGate,
} from "../services/vttTranscriptImport";
import type { WhisperModelSize } from "../types";

export default function LocalTranscriptionWorkspace() {
  const [selectedModel, setSelectedModel] = useState<WhisperModelSize>("base.en");
  const [selectedModeId, setSelectedModeId] = useState("balanced");
  const [selectedLanguageId, setSelectedLanguageId] = useState("auto");
  const [selectedSpeakerCount, setSelectedSpeakerCount] = useState("Detect Automatically");
  const [filenameTemplate, setFilenameTemplate] = useState(DEFAULT_TRANSCRIPTION_FILENAME_TEMPLATE);
  const [recordingQualityId, setRecordingQualityId] = useState<"low" | "medium" | "high">("medium");
  const [normalizerEnabled, setNormalizerEnabled] = useState(false);
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  const [copyImportedAudio, setCopyImportedAudio] = useState(true);
  const [keepOriginalLocation, setKeepOriginalLocation] = useState(true);
  const [sessionName, setSessionName] = useState("Imported meeting transcript");
  const [sessionNumber, setSessionNumber] = useState("001");
  const [sessionDate, setSessionDate] = useState("01-01-2026");
  const [automationModeId, setAutomationModeId] =
    useState<TranscriptionAutomationModeId>(DEFAULT_TRANSCRIPTION_AUTOMATION_MODE);
  const [overwritePolicyId, setOverwritePolicyId] =
    useState<TranscriptionOverwritePolicyId>(DEFAULT_TRANSCRIPTION_OVERWRITE_POLICY);
  const [checkpointPresetId, setCheckpointPresetId] =
    useState<CheckpointAutomationPresetId>("stop_at_transcript");
  const [workflowPresetId, setWorkflowPresetId] =
    useState<WorkflowRunPresetId>("full_auto_then_review");
  const [checkpointSourceType, setCheckpointSourceType] =
    useState<CheckpointWorkflowSourceType>("imported_vtt");
  const [checkpointStopAfterStageId, setCheckpointStopAfterStageId] =
    useState<CheckpointWorkflowStageId>(DEFAULT_CHECKPOINT_STOP_STAGE_ID);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [speakerOverrides, setSpeakerOverrides] = useState<Record<string, string>>({
    "Speaker 1": "Interviewer",
    "Speaker 2": "Guest",
  });
  const readiness = useMemo(() => getDefaultTranscriptionReadiness(), []);
  const vttPreview = useMemo(
    () => parseVttTranscriptContent(SYNTHETIC_VTT_FIXTURE, "synthetic_vtt_fixture.vtt"),
    [],
  );
  const speakerRenameMap = useMemo(
    () => buildSpeakerRenameMap(vttPreview.speakers, speakerOverrides),
    [speakerOverrides, vttPreview.speakers],
  );
  const renamedVttPreview = useMemo(
    () => applySpeakerRenameMap(vttPreview.segments, speakerRenameMap),
    [speakerRenameMap, vttPreview.segments],
  );
  const cleanTranscriptPreview = useMemo(
    () => segmentsToCleanTranscript(renamedVttPreview.segments, { includeSpeakers: true, includeTimestamps: true }),
    [renamedVttPreview.segments],
  );
  const displayedTranscriptDraft = transcriptDraft || cleanTranscriptPreview;
  const archiveExportPlan = useMemo(
    () =>
      buildTranscriptArchiveExportPlan({
        title: sessionName,
        sessionNumber,
        date: sessionDate,
        durationMin: 1,
        durationHhmmss: "00h00m08s",
        sourceBasename: "synthetic_vtt_fixture.vtt",
        transcriptId: "vtt_import_pending",
        folder: "Renamed Transcript Archive",
        speakerCount: vttPreview.speakers.length,
      }),
    [sessionDate, sessionName, sessionNumber, vttPreview.speakers.length],
  );
  const vttAutomationPlan = useMemo(
    () =>
      buildVttAutomationWorkflowPlan({
        mode: automationModeId,
        title: sessionName,
        sessionNumber,
        sourcePath: "synthetic_vtt_fixture.vtt",
        speakerOverrides,
      }),
    [automationModeId, sessionName, sessionNumber, speakerOverrides],
  );
  const recordingAutomationPlan = useMemo(
    () =>
      buildRecordingAutomationWorkflowPlan({
        mode: automationModeId,
        nativeRecordingImplemented: false,
        normalizerEnabled,
      }),
    [automationModeId, normalizerEnabled],
  );
  const importedAudioAutomationPlan = useMemo(
    () =>
      buildImportedAudioAutomationWorkflowPlan({
        mode: automationModeId,
        copyIntoLibrary: copyImportedAudio,
      }),
    [automationModeId, copyImportedAudio],
  );
  const postProcessingEditorState = useMemo(
    () => buildPostProcessingEditorState(overwritePolicyId),
    [overwritePolicyId],
  );
  const overwritePreview = useMemo(
    () =>
      evaluateOverwritePolicy({
        policy: overwritePolicyId,
        previousExportExists: true,
        nativeWriteVerified: false,
      }),
    [overwritePolicyId],
  );
  const selectedAutomationMode =
    TRANSCRIPTION_AUTOMATION_MODES.find((mode) => mode.id === automationModeId) ?? TRANSCRIPTION_AUTOMATION_MODES[2];
  const checkpointWorkflowPlan = useMemo(
    () =>
      buildCheckpointWorkflowPlan({
        mode: automationModeId,
        sourceType: checkpointSourceType,
        presetId: checkpointPresetId,
        stopAfterStageId: checkpointStopAfterStageId,
        editedTranscript: transcriptDraft.length > 0,
        editedSpeakers: Object.entries(speakerOverrides).some(([original, next]) => original !== next),
        editedTitleOrFilename: sessionName !== "Imported meeting transcript" || sessionNumber !== "001",
        metadataOnlyHistory: true,
      }),
    [
      automationModeId,
      checkpointPresetId,
      checkpointSourceType,
      checkpointStopAfterStageId,
      sessionName,
      sessionNumber,
      speakerOverrides,
      transcriptDraft.length,
    ],
  );
  const checkpointResumeSummary = useMemo(
    () => getCheckpointResumeSummary(checkpointWorkflowPlan),
    [checkpointWorkflowPlan],
  );
  const selectedWorkflowPreset = useMemo(() => getWorkflowPresetById(workflowPresetId), [workflowPresetId]);
  const workflowLedgerPreview = useMemo(() => {
    const txtExport = createWorkflowArtifactRecord({
      artifactId: "artifact-txt-export-preview",
      artifactType: "txt_export",
      sourceStage: "transcript_export_saved",
      path: "{userData}/OpenStem/Transcription/Exports/TXT-JSON-SRT-VTT/Imported_meeting_transcript.txt",
      format: "txt",
      sizeBytes: 2048,
      verified: true,
      verificationError: null,
      expectedExtension: ".txt",
      verificationRecorded: true,
    });
    const pdfExport = createWorkflowArtifactRecord({
      artifactId: "artifact-pdf-export-preview",
      artifactType: "pdf_export",
      sourceStage: "transcript_export_saved",
      path: "{userData}/OpenStem/Transcription/Exports/PDF/Imported_meeting_transcript.pdf",
      format: "pdf",
      sizeBytes: 0,
      verified: false,
      verificationError: "Output Missing",
      expectedExtension: ".pdf",
      verificationRecorded: true,
    });
    const baseRun = createWorkflowRunRecord({
      workflowRunId: "workflow-run-preview",
      sourceType: "imported_vtt",
      sourceOriginalPath: "synthetic_vtt_fixture.vtt",
      sourceDuration: "00:00:08",
      sourceSize: SYNTHETIC_VTT_FIXTURE.length,
      sourceFormat: "vtt",
      transcriptTextPath: "{userData}/OpenStem/Transcription/Renamed Transcript Archive/transcript.txt",
      parsedSegmentsPath: "{userData}/OpenStem/Transcription/Renamed Transcript Archive/segments.json",
      speakerMap: Object.fromEntries(speakerRenameMap.map((entry) => [entry.originalLabel, entry.displayName])),
      title: sessionName,
      sessionNumber,
      date: sessionDate,
      selectedPromptLibraryId: "general_summary",
      selectedPromptTemplateName: "General Summary",
      selectedModelId: selectedModel,
      workflowMode: selectedWorkflowPreset.workflowMode,
      generatedFiles: [],
      exportFiles: [txtExport, pdfExport],
      promptOutputs: [
        {
          sectionId: "summary",
          outputPath: null,
          status: "Output Missing",
          regenerateRecommended: false,
        },
      ],
      lastCompletedStage: "transcript_preview",
      currentStage: "transcript_export_saved",
      reviewedByUser: false,
      historyMode: "metadata_only",
      notes: "Workflow ledger preview stores metadata and paths only.",
    });

    return failWorkflowStage(applyWorkflowEdit(baseRun, "speaker_names"), "transcript_export_saved", "PDF_OUTPUT_NOT_VERIFIED");
  }, [selectedModel, selectedWorkflowPreset.workflowMode, sessionDate, sessionName, sessionNumber, speakerRenameMap]);
  const workflowStatusSummary = useMemo(
    () => getWorkflowStatusSummary(workflowLedgerPreview),
    [workflowLedgerPreview],
  );
  const selectedMode = useMemo(
    () => TRANSCRIPTION_MODE_PRESETS.find((mode) => mode.id === selectedModeId) ?? TRANSCRIPTION_MODE_PRESETS[1],
    [selectedModeId],
  );
  const filenamePreview = useMemo(
    () =>
      buildTranscriptionFilenamePreview({
        template: filenameTemplate,
        title: "Joe Dirt",
        sessionNumber: "003",
        date: "01-01-2026",
        durationMin: 124,
        model: selectedModel,
        language: "English",
        sourceBasename: "Joe Dirt interview.wav",
        transcriptId: "transcript_pending",
        folder: "Uncategorized",
        status: "draft",
        speakerCount: vttPreview.speakers.length,
        format: "pdf",
      }),
    [filenameTemplate, selectedModel, vttPreview.speakers.length],
  );
  const documentImportPreview = useMemo(
    () => buildDocumentImportPlan({ formatId: "vtt", nativeFileVerified: true }),
    [],
  );
  const documentPdfImportPreview = useMemo(
    () => buildDocumentImportPlan({ formatId: "pdf", nativeFileVerified: true }),
    [],
  );
  const documentOutputPreview = useMemo(
    () =>
      buildDocumentExportPlan({
        formatId: "pdf",
        nativeWriteVerified: false,
        exists: false,
        sizeBytes: 0,
        extensionMatches: false,
        insideSelectedFolder: false,
        overwritePolicyAllows: false,
        speakerRenameApplied: true,
      }),
    [],
  );
  const officeConverterPreview = useMemo(() => buildExternalOfficeConverterPlan(), []);

  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-2xl border border-cyan-500/15 bg-[#070b12]/85 p-6 shadow-2xl backdrop-blur-3xl">
        <div className="flex flex-col gap-4 border-b border-cyan-500/15 pb-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-cyan-400/25 bg-cyan-950/25 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-100">
                Record or Import
              </span>
              <span className="rounded-md border border-amber-400/25 bg-amber-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Native Electron writer required for durable files
              </span>
            </div>
            <h2 className="flex items-center gap-3 font-display text-2xl font-bold text-cyan-100">
              <Mic className="h-6 w-6 text-cyan-300" />
              Record or Import
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Local intake path: record or import audio, import VTT/TXT/SRT transcripts, rename the
              session, rename speaker labels, then archive/export only after a native file write can be
              verified. This workflow does not satisfy stem-separation proof.
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/25 bg-rose-950/20 p-4 text-sm text-rose-100 xl:max-w-md">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              Intake proof boundary
            </div>
            <p className="leading-6">{vttWorkflowDoesNotAffectReleaseGate()}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-xl border border-cyan-500/15 bg-black/35 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-cyan-100">Workflow mode</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Default: Automatic then Review. Let OpenStem handle the boring parts when possible,
                  then keep title, speakers, transcript text, export settings, and folders editable.
                </p>
              </div>
              <span className="rounded border border-cyan-400/20 bg-cyan-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-100">
                {selectedAutomationMode.label}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
              {TRANSCRIPTION_AUTOMATION_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setAutomationModeId(mode.id)}
                  className={`rounded-lg border px-3 py-3 text-left ${
                    mode.id === automationModeId
                      ? "border-cyan-400/40 bg-cyan-950/25"
                      : "border-white/10 bg-[#07080c]"
                  }`}
                >
                  <div className="text-sm font-bold text-slate-100">{mode.label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{mode.userLabel}</div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">{selectedAutomationMode.description}</p>
            <p className="mt-2 text-xs leading-5 text-cyan-200/80">
              Modes: Automatic, Manual, Automatic then Review. Automatic: Run the full workflow with
              defaults. Manual: Let me confirm each step. Automatic then Review: Process now, edit
              title/speakers/export later.
            </p>
            <p className="mt-1 text-xs leading-5 text-cyan-200/80">
              Default automation mode: Automatic then Review - Process now, edit title/speakers/export later.
            </p>
          </div>

          <div className="rounded-xl border border-cyan-500/15 bg-black/35 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-cyan-100">End-to-end flow</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Source - Intake - Clean/Normalize - Transcribe/Parse - Edit Speakers/Title -
                  Export/Archive - Done
                </p>
              </div>
              <span className="rounded border border-amber-400/20 bg-amber-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Browser Preview / Native writes required
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
              {vttAutomationPlan.stages.map((stage) => (
                <div key={stage.id} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                  <div className="text-xs font-bold text-slate-100">{stage.label}</div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-cyan-200">
                    {stage.status}
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">
                    {stage.diagnosticCode}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-green-400/15 bg-green-950/10 p-3 text-xs leading-5 text-green-100">
              {vttAutomationPlan.summary}
            </div>
            <div className="mt-3 rounded-lg border border-rose-400/15 bg-rose-950/10 p-3 text-xs leading-5 text-rose-100">
              {transcriptionAutomationDoesNotAffectReleaseGate()}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-emerald-500/15 bg-black/35 p-4">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h3 className="font-display text-lg font-bold text-emerald-100">Workflow Status</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                One Workflow Run Ledger keeps source, transcript, exports, prompts, recovery actions,
                and user edits together without storing transcript text in metadata-only history.
              </p>
            </div>
            <span className="rounded border border-amber-400/20 bg-amber-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
              {workflowStatusSummary.currentStageLabel}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Current stage
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-100">
                    {workflowStatusSummary.currentStage}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Last completed stage
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-100">
                    {workflowStatusSummary.lastCompletedStage ?? "none"}
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded border border-emerald-400/15 bg-emerald-950/10 p-3 text-xs leading-5 text-emerald-100">
                Next recommended action: {workflowStatusSummary.nextRecommendedAction}. Failed later
                stages preserve earlier verified artifacts.
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  "Ready",
                  "Running",
                  "Complete",
                  "Needs Review",
                  "Failed",
                  "Regenerate Recommended",
                  "Output Verified",
                  "Output Missing",
                ].map(
                  (label) => (
                    <span
                      key={label}
                      className="rounded border border-white/10 bg-black/30 px-2 py-1 text-xs font-semibold text-slate-200"
                    >
                      {label}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-green-200">
                    Completed artifacts
                  </div>
                  <div className="mt-2 text-2xl font-bold text-green-100">
                    {workflowStatusSummary.completedArtifacts.length}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-rose-200">
                    Failed artifacts
                  </div>
                  <div className="mt-2 text-2xl font-bold text-rose-100">
                    {workflowStatusSummary.failedArtifacts.length}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-amber-200">
                    Regenerate recommended
                  </div>
                  <div className="mt-2 text-2xl font-bold text-amber-100">
                    {workflowStatusSummary.regenerateRecommendedArtifacts.length}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {workflowStatusSummary.controls.map((control) => (
                  <button
                    key={control}
                    type="button"
                    disabled
                    className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    {control}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Previous successful export remains until a replacement file is verified and overwrite
                policy allows it.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-[#07080c] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                  Workflow presets
                </h4>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Presets only change stage behavior and export defaults. The user can still customize
                  every checkbox and stop point.
                </p>
              </div>
              <span className="rounded border border-emerald-400/20 bg-emerald-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                {selectedWorkflowPreset.label}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
              {WORKFLOW_RUN_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setWorkflowPresetId(preset.id)}
                  className={`rounded-lg border px-3 py-3 text-left ${
                    preset.id === workflowPresetId
                      ? "border-emerald-400/40 bg-emerald-950/20"
                      : "border-white/10 bg-black/30"
                  }`}
                >
                  <div className="text-xs font-bold text-slate-100">{preset.label}</div>
                  <div className="mt-1 text-[10px] leading-4 text-slate-400">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-rose-400/15 bg-rose-950/10 p-3 text-xs leading-5 text-rose-100">
            {workflowRunLedgerDoesNotAffectReleaseGate()}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-sky-500/15 bg-black/35 p-4">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h3 className="font-display text-lg font-bold text-sky-100">Automation Checkpoints</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Include stages, stop after any checkpoint, continue from the last completed checkpoint,
                or rerun one step without restarting the workflow. Default stop point: Transcript Preview.
              </p>
            </div>
            <span className="rounded border border-amber-400/20 bg-amber-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
              {checkpointResumeSummary.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Start from source
                <select
                  value={checkpointSourceType}
                  onChange={(event) => setCheckpointSourceType(event.target.value as CheckpointWorkflowSourceType)}
                  className="mt-2 w-full rounded-lg border border-sky-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-sky-100 outline-none"
                >
                  {checkpointWorkflowPlan.startFromSourceOptions.map((sourceType) => (
                    <option key={sourceType} value={sourceType}>
                      {sourceType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold text-slate-300">
                Automation preset
                <select
                  value={checkpointPresetId}
                  onChange={(event) => {
                    const nextPresetId = event.target.value as CheckpointAutomationPresetId;
                    setCheckpointPresetId(nextPresetId);
                    const nextPreset = CHECKPOINT_AUTOMATION_PRESETS.find((preset) => preset.id === nextPresetId);
                    setCheckpointStopAfterStageId(nextPreset?.stopAfterStageId ?? DEFAULT_CHECKPOINT_STOP_STAGE_ID);
                  }}
                  className="mt-2 w-full rounded-lg border border-sky-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-sky-100 outline-none"
                >
                  {CHECKPOINT_AUTOMATION_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs leading-5 text-slate-300">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-200">
                  Resume behavior
                </div>
                <p className="mt-2">{checkpointResumeSummary.message}</p>
                <p className="mt-2">
                  Last completed stage: {checkpointWorkflowPlan.historyState.lastCompletedStage ?? "none"}.
                  Metadata-only history stores transcript text:{" "}
                  {String(checkpointWorkflowPlan.historyState.storesTranscriptText)}.
                </p>
                <p className="mt-2">
                  Controls include Start automation, Continue from here, Stop after this step, Run selected steps,
                  Rerun this step, Skip this step, Manual review required, Open output, and Regenerate downstream outputs.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {CHECKPOINT_AUTOMATION_CONTROLS.map((control) => (
                  <button
                    key={control}
                    type="button"
                    disabled={!["Continue from here", "Stop after this step"].includes(control)}
                    className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 disabled:text-slate-600"
                  >
                    {control}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[34rem] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-2">
                {checkpointWorkflowPlan.stages.map((stage) => (
                  <div key={stage.id} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.75fr_0.75fr_1.5fr_auto] lg:items-center">
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input type="checkbox" checked={stage.automationEnabled} readOnly />
                        Include in automation
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={stage.stopAfterStage}
                          onChange={() => setCheckpointStopAfterStageId(stage.id)}
                        />
                        Stop after this stage
                      </label>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-100">{stage.shortLabel}</span>
                          <span className="rounded border border-sky-400/15 bg-sky-950/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-sky-100">
                            {stage.status}
                          </span>
                          <span className="rounded border border-amber-400/15 bg-amber-950/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                            {stage.errorCode}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{stage.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled
                          className="rounded border border-slate-600/50 bg-slate-900/50 px-2 py-1 font-mono text-[9px] font-bold uppercase text-slate-500"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          disabled={!stage.canRerun}
                          className="rounded border border-slate-600/50 bg-slate-900/50 px-2 py-1 font-mono text-[9px] font-bold uppercase text-slate-500 disabled:text-slate-600"
                        >
                          Rerun this step
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{stage.userMessage}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-300">
              Transcript Preview Box
              <textarea
                value={displayedTranscriptDraft}
                onChange={(event) => setTranscriptDraft(event.target.value)}
                className="mt-2 max-h-60 min-h-44 w-full resize-y overflow-y-auto rounded-lg border border-sky-500/15 bg-[#05070b] p-3 text-xs leading-5 text-slate-300 outline-none"
              />
              <span className="mt-2 block text-slate-400">
                Editing transcript marks downstream outputs: Regenerate recommended.
              </span>
            </label>
            <label className="block text-xs font-semibold text-slate-300">
              Prompt Output Box
              <textarea
                readOnly
                value={[
                  "Prompt output sections will appear here after a real local model run.",
                  "No bullets by default.",
                  "No tables by default.",
                  "Manual edits do not rerun the model automatically.",
                ].join("\n\n")}
                className="mt-2 max-h-60 min-h-44 w-full resize-y overflow-y-auto rounded-lg border border-violet-500/15 bg-[#05070b] p-3 text-xs leading-5 text-slate-300 outline-none"
              />
              <span className="mt-2 block text-slate-400">
                Prompt output export stays Output Not Verified until native write verification passes.
              </span>
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-rose-400/15 bg-rose-950/10 p-3 text-xs leading-5 text-rose-100">
            {checkpointAutomationDoesNotAffectReleaseGate()}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-indigo-500/15 bg-black/35 p-4">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h3 className="font-display text-lg font-bold text-indigo-100">Document Import / Export</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                TXT / VTT local-first. PDF import Planned until a local parser dependency exists. DOCX
                import Planned until a local parser dependency exists. ODT requires external converter.
              </p>
              <p className="mt-2 text-xs leading-5 text-indigo-200/80">
                No cloud conversion by default. Extracted text appears in the transcript review box
                before prompt workflow handoff.
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-rose-200">
                Document output status code: DOCUMENT_OUTPUT_NOT_VERIFIED until a real file passes checks.
              </p>
            </div>
            <span className="rounded border border-rose-400/20 bg-rose-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-200">
              {documentOutputPreview.completionState}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                  Import formats
                </h4>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  VTT preview: {documentImportPreview.diagnosticCode}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {DOCUMENT_IMPORT_FORMAT_POLICIES.map((format) => (
                  <div key={format.id} className="rounded border border-white/10 bg-black/30 p-2">
                    <div className="text-xs font-bold text-slate-100">{format.label}</div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                      {format.status}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                PDF diagnostic: {documentPdfImportPreview.diagnosticCode}. Source files are preserved;
                malformed documents must return structured errors.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                  Export formats
                </h4>
                <span className="font-mono text-[10px] uppercase tracking-wider text-amber-200">
                  {officeConverterPreview.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {DOCUMENT_OUTPUT_FORMAT_POLICIES.map((format) => (
                  <div key={format.id} className="rounded border border-white/10 bg-black/30 p-2">
                    <div className="text-xs font-bold text-slate-100">{format.label}</div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                      {format.status}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded border border-indigo-400/15 bg-indigo-950/10 p-3 text-xs leading-5 text-indigo-100">
                Speaker rename applies to document exports after regeneration. Filename templates:
                {" "}{DOCUMENT_EXPORT_FILENAME_TEMPLATES.txt},{" "}
                {DOCUMENT_EXPORT_FILENAME_TEMPLATES.pdf},{" "}
                {DOCUMENT_EXPORT_FILENAME_TEMPLATES.docx},{" "}
                {DOCUMENT_EXPORT_FILENAME_TEMPLATES.json}.
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-rose-400/15 bg-rose-950/10 p-3 text-xs leading-5 text-rose-100">
            {documentFormatsDoNotAffectReleaseGate()}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 2xl:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/35 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cyan-100">
                <Mic className="h-5 w-5 text-cyan-300" />
                In-Session Recording
              </h3>
              <span className="rounded border border-amber-400/20 bg-amber-950/20 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
                MIC_PERMISSION_NEEDED
              </span>
            </div>

            <label className="mt-4 block text-xs font-semibold text-slate-300">
              Microphone input selector
              <select
                disabled
                className="mt-2 w-full rounded-lg border border-slate-600/40 bg-black/60 px-3 py-2 font-mono text-xs text-slate-500 outline-none"
              >
                <option>No microphone selected - MIC_INPUT_NOT_SELECTED</option>
              </select>
            </label>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                disabled
                className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                <RefreshCw className="mr-2 inline h-4 w-4" />
                Refresh input devices
              </button>
              <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  Input status
                </div>
                <p className="mt-1 text-xs text-slate-400">Permission and device enumeration are not active here.</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 text-xs leading-5 text-amber-100">
              {recordingAutomationPlan.summary} Status: {recordingAutomationPlan.status}.
              Recording automation status code: recording_planned_not_active.
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-slate-300">Low / Medium / High recording quality</div>
              <div className="grid grid-cols-3 gap-2">
                {RECORDING_QUALITY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setRecordingQualityId(preset.id)}
                    className={`rounded-lg border px-3 py-2 text-left ${
                      preset.id === recordingQualityId
                        ? "border-cyan-400/40 bg-cyan-950/25"
                        : "border-white/10 bg-[#07080c]"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-100">{preset.label}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{preset.fileSize}</div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {RECORDING_QUALITY_PRESETS.find((preset) => preset.id === recordingQualityId)?.implementationNote}
              </p>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={normalizerEnabled}
                onChange={(event) => setNormalizerEnabled(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="flex items-center gap-2 font-semibold text-slate-100">
                  <Volume2 className="h-4 w-4 text-cyan-300" />
                  Make speech louder for transcription
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-amber-300">
                  {normalizerEnabled ? "NORMALIZER_FFMPEG_MISSING" : "NORMALIZER_NOT_AVAILABLE"}
                </span>
                <span className="mt-1 block text-slate-400">
                  Normalization creates a verified copy only after FFmpeg is ready and native output exists.
                </span>
              </span>
            </label>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {["Start Recording - Native required", "Pause - Not active", "Stop - Not active"].map((label) => (
                <button
                  key={label}
                  disabled
                  className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-2 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-slate-500">Timer</span>
                <span className="font-mono text-cyan-100">00:00:00</span>
              </div>
              <div className="mt-2 break-all font-mono text-slate-400">
                Preview filename: openstem_recording_session_001.webm
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-cyan-500/15 bg-cyan-950/10 p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                Recordings folder selector
              </div>
              <p className="mt-2 break-all text-xs text-slate-400">
                {TRANSCRIPTION_INTAKE_FOLDER_POLICY[0].logicalPath}
              </p>
              <button
                disabled
                className="mt-3 rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Open recordings folder - Native required
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cyan-100">
                <Upload className="h-5 w-5 text-cyan-300" />
                Imported Audio Sessions
              </h3>
              <span className="rounded border border-amber-400/20 bg-amber-950/20 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
                IMPORT_AUDIO_FOLDER_MISSING
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Source files stay where they are unless the user chooses to copy them into the imported
              audio folder. No source file is deleted or overwritten by default.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {["Import audio/video file - Native required", "Import folder - Native required"].map((label) => (
                <button
                  key={label}
                  disabled
                  className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: "Include subfolders",
                  checked: includeSubfolders,
                  onChange: setIncludeSubfolders,
                  note: "Off by default for safer import review.",
                },
                {
                  label: "Copy into Imported Audio Sessions folder",
                  checked: copyImportedAudio,
                  onChange: setCopyImportedAudio,
                  note: "Copy requires native write verification before success.",
                },
                {
                  label: "Keep original location",
                  checked: keepOriginalLocation,
                  onChange: setKeepOriginalLocation,
                  note: "Original files are never deleted by default.",
                },
              ].map((option) => (
                <label
                  key={option.label}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={(event) => option.onChange(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-slate-100">{option.label}</span>
                    <span className="mt-1 block text-slate-400">{option.note}</span>
                  </span>
                </label>
              ))}
            </div>

            <button
              disabled
              className="mt-4 w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
            >
              Verify files - Native required
            </button>

            <div className="mt-4 space-y-3">
              {TRANSCRIPTION_INTAKE_FOLDER_POLICY.slice(1, 2).map((folder) => (
                <div key={folder.id} className="rounded-lg border border-cyan-500/15 bg-cyan-950/10 p-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                    {folder.label} folder selector
                  </div>
                  <p className="mt-2 break-all text-xs text-slate-400">{folder.logicalPath}</p>
                </div>
              ))}
              <button
                disabled
                className="rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                Open imported audio folder - Native required
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs text-slate-400">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Source-vs-archive boundary
              </div>
              <p className="mt-2 leading-5">
                Importing audio does not create transcript outputs. It only prepares verified source paths
                for a later native transcription runner.
              </p>
              <p className="mt-2 leading-5 text-amber-100">
                {importedAudioAutomationPlan.summary} Status: {importedAudioAutomationPlan.status}.
                Imported-audio automation status code: imported_audio_native_required.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cyan-100">
                <FileText className="h-5 w-5 text-cyan-300" />
                Transcript/VTT Intake
              </h3>
              <span className="rounded border border-green-400/20 bg-green-950/20 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-green-200">
                {vttPreview.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                "Import VTT file - Native required",
                "Import transcript TXT - Planned / Not active",
                "Import SRT - Planned / Not active",
                "Import VTT folder - Native required",
              ].map((label) => (
                <button
                  key={label}
                  disabled
                  className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-2 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-cyan-500/15 bg-cyan-950/10 p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                VTT source folder selector
              </div>
              <p className="mt-2 break-all text-xs text-slate-400">
                {TRANSCRIPTION_INTAKE_FOLDER_POLICY[2].logicalPath}
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-green-200">
                  Parsed transcript preview
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  {vttPreview.segments.length} cues / {vttPreview.speakers.length} speakers
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{vttPreview.message}</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-xs font-semibold text-slate-300 sm:col-span-3">
                Rename session title
                <input
                  value={sessionName}
                  onChange={(event) => setSessionName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-cyan-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-cyan-100 outline-none"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Session number
                <input
                  value={sessionNumber}
                  onChange={(event) => setSessionNumber(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-cyan-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-cyan-100 outline-none"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-300 sm:col-span-2">
                Date
                <input
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-cyan-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-cyan-100 outline-none"
                />
              </label>
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                <Users className="h-4 w-4" />
                Rename speakers
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Speaker rename changes labels only; it is not diarization and does not invent speakers.
              </p>
              <div className="mt-3 space-y-2">
                {speakerRenameMap.map((entry) => (
                  <label key={entry.originalLabel} className="grid grid-cols-[0.9fr_1.1fr] items-center gap-2 text-xs">
                    <span className="font-mono text-slate-500">{entry.originalLabel}</span>
                    <input
                      value={speakerOverrides[entry.originalLabel] ?? entry.displayName}
                      onChange={(event) =>
                        setSpeakerOverrides((current) => ({
                          ...current,
                          [entry.originalLabel]: event.target.value,
                        }))
                      }
                      className="rounded-lg border border-cyan-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-cyan-100 outline-none"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded border border-green-400/15 bg-green-950/20 px-2 py-1 font-mono text-[10px] text-green-100">
                  {renamedVttPreview.state}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSpeakerOverrides(Object.fromEntries(vttPreview.speakers.map((speaker) => [speaker, speaker])))
                  }
                  className="rounded border border-cyan-400/20 bg-cyan-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase text-cyan-100"
                >
                  Reset names
                </button>
              </div>
            </div>

            <label className="mt-4 block text-xs font-semibold text-slate-300">
              Transcript text editor
              <textarea
                value={displayedTranscriptDraft}
                onChange={(event) => setTranscriptDraft(event.target.value)}
                className="mt-2 max-h-52 min-h-40 w-full resize-y rounded-lg border border-white/10 bg-[#05070b] p-3 text-xs leading-5 text-slate-300 outline-none"
              />
            </label>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TRANSCRIPTION_INTAKE_FOLDER_POLICY.slice(3).map((folder) => (
                <div key={folder.id} className="rounded-lg border border-cyan-500/15 bg-cyan-950/10 p-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                    {folder.label}
                  </div>
                  <p className="mt-2 break-all text-[11px] text-slate-400">{folder.logicalPath}</p>
                </div>
              ))}
            </div>

            <button
              disabled
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600/50 bg-slate-900/50 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              <Archive className="h-4 w-4" />
              Archive & Export - Native writer required
            </button>

            <div className="mt-4 rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                <Save className="h-4 w-4" />
                One-click export plan
              </div>
              <div className="mt-3 space-y-2">
                {archiveExportPlan.outputs.map((output) => (
                  <div key={output.format} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="break-all text-slate-300">{output.filename}</span>
                    <span className="rounded border border-amber-400/20 bg-amber-950/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-amber-200">
                      {output.status === "native_writer_required" ? "Native writer required" : "Planned / Not active"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Auto export after rename: off by default. Original VTT stays untouched.{" "}
                {TRANSCRIPT_ARCHIVE_EXPORT_POLICY.successRule}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-violet-500/15 bg-black/35 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-violet-100">Post-processing editor</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Edit title, session number, date, speaker names, speaker map, transcript text, output
                  filename template, export formats, destination folder, and overwrite policy after the
                  automation pass.
                </p>
              </div>
              <span className="rounded border border-violet-400/20 bg-violet-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-violet-100">
                {postProcessingEditorState.overwritePolicy}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
              {postProcessingEditorState.editableFields.map((field) => (
                <div key={field} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-300">{field}</div>
                </div>
              ))}
            </div>

            <label className="mt-4 block text-xs font-semibold text-slate-300">
              Overwrite policy
              <select
                value={overwritePolicyId}
                onChange={(event) => setOverwritePolicyId(event.target.value as TranscriptionOverwritePolicyId)}
                className="mt-2 w-full rounded-lg border border-violet-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-violet-100 outline-none"
              >
                {TRANSCRIPTION_OVERWRITE_POLICY_OPTIONS.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 rounded-lg border border-amber-400/15 bg-amber-950/10 p-3 text-xs leading-5 text-amber-100">
              {overwritePreview.state}: {overwritePreview.message}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
              {postProcessingEditorState.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={action !== "Reset speaker names" && action !== "Restore original transcript"}
                  onClick={() => {
                    if (action === "Reset speaker names") {
                      setSpeakerOverrides(
                        Object.fromEntries(vttPreview.speakers.map((speaker) => [speaker, speaker])),
                      );
                    }
                    if (action === "Restore original transcript") {
                      setTranscriptDraft("");
                    }
                  }}
                  className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 disabled:text-slate-600"
                >
                  {action}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-violet-100/80">
              Actions: Save changes, Regenerate exports, Export to same folder, Export to new folder,
              Overwrite previous export, Save as new export, Open export folder, Reset speaker names,
              Restore original transcript.
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-400">{postProcessingEditorState.message}</p>
          </div>

          <div className="rounded-xl border border-violet-500/15 bg-black/35 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-violet-100">Auto-export and history</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Automation can prepare selected formats, but completion still requires native output
                  files with nonzero size. Failed later steps preserve completed earlier steps.
                </p>
              </div>
              <span className="rounded border border-emerald-400/20 bg-emerald-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                History record preview
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ["Auto-export after VTT import", String(DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoExportAfterVttImport)],
                [
                  "Auto-export after recording transcription",
                  String(DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoExportAfterRecordingTranscription),
                ],
                [
                  "Auto-export after imported audio transcription",
                  String(DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoExportAfterImportedAudioTranscription),
                ],
                ["Auto-create history record", String(DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoCreateHistoryRecord)],
                ["Auto-open export folder after export", String(DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoOpenExportFolderAfterExport)],
                [
                  "Auto-copy final plain text to clipboard",
                  String(DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoCopyFinalPlainTextToClipboard),
                ],
                ["Auto-overwrite", String(DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.autoOverwrite)],
                ["Auto-export TXT", DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.exportFormats.txt.status],
                ["Auto-export PDF", DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.exportFormats.pdf.status],
                ["Auto-export DOCX", DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS.exportFormats.docx.status],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                  <div className="text-xs font-semibold text-slate-100">{label}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-200">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs leading-5 text-slate-300">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-violet-200">
                History item preview
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <span>Source type: {vttAutomationPlan.historyRecord.sourceType}</span>
                <span>Workflow mode: {vttAutomationPlan.historyRecord.workflowMode}</span>
                <span>Original file path: {vttAutomationPlan.historyRecord.originalFilePath}</span>
                <span>Archive path: {vttAutomationPlan.historyRecord.archivePath ?? "native writer required"}</span>
                <span>Title: {vttAutomationPlan.historyRecord.title}</span>
                <span>Session number: {vttAutomationPlan.historyRecord.sessionNumber}</span>
                <span>Overwrite history: {vttAutomationPlan.historyRecord.overwriteHistory[0].state}</span>
                <span>Errors preserved: {vttAutomationPlan.historyRecord.errors.length}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "reopen",
                  "edit metadata",
                  "rename speakers",
                  "regenerate exports",
                  "open source",
                  "open archive",
                  "open export folder",
                  "remove from history",
                  "delete managed copy only with confirmation",
                ].map((action) => (
                  <span
                    key={action}
                    className="rounded border border-violet-400/15 bg-violet-950/20 px-2 py-1 font-mono text-[10px] text-violet-100"
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-cyan-500/15 bg-black/35 p-5">
          <h3 className="font-display text-lg font-bold text-cyan-100">Automation folder policy</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {TRANSCRIPTION_AUTOMATION_FOLDER_POLICY.map((folder) => (
              <div key={folder.label} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="text-sm font-semibold text-slate-100">{folder.label}</div>
                <p className="mt-2 break-all text-[11px] leading-5 text-slate-400">{folder.logicalPath}</p>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-amber-200">
                  {folder.status}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[folder.chooseFolderAction, folder.openFolderAction, folder.resetAction].map((action) => (
                    <span
                      key={action}
                      className="rounded border border-cyan-400/15 bg-cyan-950/20 px-2 py-1 font-mono text-[9px] text-cyan-100"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-green-500/15 bg-[#080a13]/85 p-6 shadow-2xl backdrop-blur-3xl">
        <div className="flex flex-col gap-4 border-b border-green-500/15 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-amber-400/25 bg-amber-950/25 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                TRANSCRIPTION_DRY_RUN_ONLY
              </span>
              <span className="rounded-md border border-slate-500/30 bg-slate-950/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Speech-to-text / Not stem separation proof
              </span>
            </div>
            <h2 className="flex items-center gap-3 font-display text-2xl font-bold text-green-200">
              <FileText className="h-6 w-6 text-green-300" />
              Local Transcription Workspace
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Plan a local speech-to-text job: select input, choose output, choose a Whisper-family
              model, check readiness, run natively later, then verify real transcript files on disk.
              Transcription is not stem separation proof.
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/25 bg-rose-950/20 p-4 text-sm text-rose-100 lg:max-w-sm">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              Beta boundary
            </div>
            <p className="leading-6">{transcriptionDoesNotAffectReleaseGate()}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
          {[
            {
              title: "Select input",
              detail: "Single file, multiple files, video file, or directory.",
              state: "Planned / Not active",
              icon: FileAudio,
            },
            {
              title: "Select output",
              detail: "Choose a writable output folder before creating transcript files.",
              state: "Output folder missing",
              icon: FolderOpen,
            },
            {
              title: "Choose model",
              detail: "Whisper model files must stay external until source, license, and hash are documented.",
              state: "Whisper model missing",
              icon: SlidersHorizontal,
            },
            {
              title: "Verify outputs",
              detail: "Completion requires real local files with size greater than 0.",
              state: "Transcript output not verified",
              icon: CheckCircle,
            },
          ].map(({ title, detail, state, icon: Icon }) => (
            <div key={title} className="rounded-xl border border-white/10 bg-black/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <Icon className="h-5 w-5 text-green-300" />
                <span className="rounded border border-amber-500/20 bg-amber-950/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
                  {state}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-100">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-cyan-500/15 bg-black/40 p-5">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-cyan-100">Recent Files</h3>
              <p className="mt-1 text-xs text-slate-400">
                Queue and history are empty until real native jobs complete. No remote upload queue is active.
              </p>
            </div>
            <button
              disabled
              className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Transcribe Files - Native required
            </button>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-cyan-500/25 bg-[#07080c] p-6 text-center">
            <div className="font-display text-base font-bold text-slate-200">No recent files</div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              A recent file appears only after verified local transcription output exists.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {TRANSCRIPTION_BULK_ACTIONS.map((action) => (
              <button
                key={action}
                disabled
                className="rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/15 bg-black/40 p-5">
          <h3 className="font-display text-xl font-bold text-cyan-100">Folders</h3>
          <p className="mt-1 text-xs text-slate-400">
            Folder labels are local organization metadata only. They do not move source files.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TRANSCRIPTION_DASHBOARD_FOLDERS.map((folder) => (
              <div key={folder} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-100">{folder}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">0 files</span>
                </div>
              </div>
            ))}
            <button
              disabled
              className="rounded-lg border border-dashed border-slate-500/30 bg-slate-900/25 p-3 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
            >
              New Folder - Planned / Not active
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-green-500/15 bg-black/40 p-5">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-green-200">Input and directory mode</h3>
              <p className="mt-1 text-xs text-slate-400">
                Browser Preview / Not runnable: these controls describe the native workflow but do not
                claim local file access.
              </p>
            </div>
            <button
              disabled
              className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Choose File - Native required
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              ["Single audio file", "Planned / Not active"],
              ["Multiple audio files", "Planned / Not active"],
              ["Video file through FFmpeg", "WHISPER_FFMPEG_MISSING"],
              ["Directory mode", "Non-destructive / Planned"],
              ["Recursive directory scan", "Off by default"],
              ["Recent files/history", "Empty until real jobs complete"],
            ].map(([label, state]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="text-sm font-semibold text-slate-100">{label}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                  {state}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-cyan-500/15 bg-cyan-950/10 p-4">
            <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-200">
              Supported input formats depend on FFmpeg
            </h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUPPORTED_TRANSCRIPTION_INPUT_FORMATS.map((format) => (
                <span
                  key={format}
                  className="rounded border border-cyan-400/15 bg-cyan-950/20 px-2 py-1 font-mono text-[10px] text-cyan-100"
                >
                  {format}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              FFmpeg required for audio/video decoding. No source files are deleted, moved, or
              overwritten by default.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/15 bg-black/40 p-5">
          <h3 className="font-display text-xl font-bold text-amber-100">Readiness check</h3>
          <p className="mt-1 text-xs text-slate-400">
            Native transcription runner is Planned / Not active. Missing states are structured, not
            vague failures.
          </p>
          <div className="mt-4 space-y-3">
            {readiness.map((item) => (
              <div key={item.code} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-100">{item.label}</span>
                  <span className="rounded border border-white/10 bg-black/50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
                    {item.code}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-2xl border border-green-500/15 bg-black/40 p-5">
          <h3 className="font-display text-xl font-bold text-green-200">Transcription mode</h3>
          <p className="mt-1 text-xs text-slate-400">
            Mode changes are planning labels until a native backend maps them to real model settings.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {TRANSCRIPTION_MODE_PRESETS.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSelectedModeId(mode.id)}
                className={`rounded-lg border px-3 py-3 text-left ${
                  mode.id === selectedMode.id
                    ? "border-green-400/40 bg-green-950/20"
                    : "border-white/10 bg-[#07080c]"
                }`}
              >
                <div className="text-sm font-bold text-slate-100">{mode.label}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                  Planned / Not active
                </div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Selected: {selectedMode.label}. Suggested model: {selectedMode.modelHint}. {selectedMode.note}
          </p>
        </div>

        <div className="rounded-2xl border border-green-500/15 bg-black/40 p-5">
          <h3 className="font-display text-xl font-bold text-green-200">Language</h3>
          <p className="mt-1 text-xs text-slate-400">
            Auto Detect is the safe default until native backend confidence and language output are
            available.
          </p>
          <label className="mt-4 block text-xs font-semibold text-slate-300">
            Language selector
            <select
              value={selectedLanguageId}
              onChange={(event) => setSelectedLanguageId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-green-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-green-100 outline-none"
            >
              {TRANSCRIPTION_LANGUAGE_OPTIONS.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Popular languages", "More languages", "Other languages"].map((label) => (
              <span
                key={label}
                className="rounded border border-green-400/15 bg-green-950/20 px-2 py-1 font-mono text-[10px] text-green-100"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-green-500/15 bg-black/40 p-5">
          <h3 className="font-display text-xl font-bold text-green-200">Task and pre-processing</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-semibold text-slate-100">Transcribe original language</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Default planned task
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-semibold text-slate-100">Translate/transcribe to English</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                Planned / backend dependent
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-semibold text-slate-100">Restore audio</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                Planned / Not active
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Pre-processing, not transcription model proof. Not AI stem separation proof.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-green-500/15 bg-[#080a13]/80 p-5">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-green-200">Whisper model selection</h3>
            <p className="mt-1 text-xs text-slate-400">
              Model readiness here is transcription-only. It never verifies source-separation weights.
            </p>
          </div>
          <label className="flex flex-col gap-2 text-xs text-slate-300">
            Selected model
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value as WhisperModelSize)}
              className="rounded-lg border border-green-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-green-100 outline-none"
            >
              {WHISPER_MODEL_OPTIONS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {WHISPER_MODEL_OPTIONS.map((model) => (
            <div
              key={model.id}
              className={`rounded-xl border p-4 ${
                model.id === selectedModel
                  ? "border-green-400/40 bg-green-950/15"
                  : "border-white/10 bg-black/35"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-mono text-sm font-bold text-slate-100">{model.label}</h4>
                  <p className="mt-1 text-[11px] text-slate-400">{model.sizeLabel}</p>
                </div>
                <span className="rounded border border-rose-400/25 bg-rose-950/20 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-rose-200">
                  WHISPER_MODEL_MISSING
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <span>Memory: {model.approximateRamVram}</span>
                <span>Speed: {model.speedEstimate}</span>
                <span>Accuracy: {model.accuracyEstimate}</span>
                <span>Language: {model.languageSupport}</span>
                <span>CPU usable: {model.cpuUsable ? "yes" : "no"}</span>
                <span>GPU recommended: {model.gpuRecommended ? "yes" : "no"}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">{model.sourceLicenseStatus}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-green-500/15 bg-black/40 p-5">
          <h3 className="font-display text-xl font-bold text-green-200">Filename template preview</h3>
          <p className="mt-1 text-xs text-slate-400">
            Invalid characters, path traversal, Windows reserved names, and unknown tokens are blocked
            before export.
          </p>
          <label className="mt-4 block text-xs font-semibold text-slate-300">
            Template
            <input
              value={filenameTemplate}
              onChange={(event) => setFilenameTemplate(event.target.value)}
              className="mt-2 w-full rounded-lg border border-green-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-green-100 outline-none"
            />
          </label>
          <div className="mt-4 rounded-xl border border-white/10 bg-[#07080c] p-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Preview
            </div>
            <div className="mt-2 break-all font-mono text-sm text-green-100">{filenamePreview.filename}</div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{filenamePreview.message}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Example default: Joe_Dirt_session_number_003_01-01-2026_124_min.pdf
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Additional safe tokens: {"{folder}"}, {"{status}"}, and {"{speaker_count}"}.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-green-500/15 bg-black/40 p-5">
          <h3 className="font-display text-xl font-bold text-green-200">Export panel</h3>
          <p className="mt-1 text-xs text-slate-400">
            PDF export Planned / Not active. TXT and JSON should be first after native transcription is
            wired.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {TRANSCRIPTION_EXPORT_FORMAT_POLICIES.map((format) => (
              <div key={format.id} className="rounded-xl border border-white/10 bg-[#07080c] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-mono text-sm font-bold text-slate-100">
                    <Download className="h-4 w-4 text-green-300" />
                    {format.label}
                  </span>
                  <span className="rounded border border-amber-400/20 bg-amber-950/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-amber-200">
                    {format.status === "planned_not_active" ? "Planned / Not active" : "After native runner"}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">{format.completionRule}</p>
                {format.requiresTimestamps && (
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                    Requires segment timestamps
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-500/15 bg-black/40 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-100">
            <Clock className="h-5 w-5 text-amber-300" />
            Timestamp and diarization
          </h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Timestamps unavailable
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Segment or word timestamps are shown only if a backend returns them.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Diarization unavailable
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Speaker recognition Planned / Requires diarization backend. Speaker labels require
                separate local diarization dependencies and must be marked estimated.
              </p>
            </div>
            <label className="block rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs text-slate-300">
              Speaker count
              <select
                value={selectedSpeakerCount}
                onChange={(event) => setSelectedSpeakerCount(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-600/40 bg-black/60 px-3 py-2 font-mono text-xs text-slate-200 outline-none"
              >
                {TRANSCRIPTION_SPEAKER_COUNT_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                DIARIZATION_BACKEND_MISSING / DIARIZATION_MODEL_MISSING
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Do not show speaker names or counts as verified until the backend returns them.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-500/15 bg-black/40 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-100">
            <Shield className="h-5 w-5 text-green-300" />
            Local privacy policy
          </h3>
          <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-400">
            <li>No user audio is uploaded by this workspace.</li>
            <li>History stays local and starts empty.</li>
            <li>Transcript text is not written to logs by default.</li>
            <li>Private file paths are not exported unless the user chooses that later.</li>
            <li>Whisper weights must not be committed or silently downloaded.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-500/15 bg-black/40 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-100">
            <FolderOpen className="h-5 w-5 text-cyan-300" />
            History
          </h3>
          <div className="mt-4 rounded-xl border border-dashed border-slate-500/30 bg-[#07080c] p-5 text-center">
            <div className="font-display text-base font-bold text-slate-200">History starts empty</div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              A history entry requires a real completed native transcription job.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/15 bg-amber-950/10 p-5">
        <h3 className="font-display text-xl font-bold text-amber-100">Backend candidates</h3>
        <p className="mt-1 text-xs text-slate-400">
          These are planning lanes only. Backend readiness must be checked through native Electron
          IPC before the run button becomes active.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {TRANSCRIPTION_BACKEND_OPTIONS.map((backend) => (
            <div key={backend.id} className="rounded-xl border border-white/10 bg-black/35 p-4">
              <div className="font-mono text-sm font-bold text-slate-100">{backend.label}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                {backend.state === "planned_not_active" ? "Planned / Not active" : "Reference only"}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">{backend.note}</p>
            </div>
          ))}
        </div>
        <button
          disabled
          className="mt-5 w-full rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-200 opacity-70"
        >
          Start Transcription - Planned / Not active
        </button>
      </section>
    </div>
  );
}
