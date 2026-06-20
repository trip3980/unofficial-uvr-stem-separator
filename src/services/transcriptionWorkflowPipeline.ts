import type { TranscriptionAutomationModeId } from "./transcriptionAutomationWorkflow";

export type CheckpointWorkflowStageStatus =
  | "Not Started"
  | "Waiting"
  | "Ready"
  | "Running"
  | "Complete"
  | "Skipped"
  | "Needs Review"
  | "Failed"
  | "Blocked"
  | "Output Not Verified";

export type CheckpointWorkflowDiagnosticCode =
  | "WORKFLOW_SOURCE_MISSING"
  | "WORKFLOW_STAGE_BLOCKED"
  | "WORKFLOW_STAGE_FAILED"
  | "WORKFLOW_STAGE_SKIPPED"
  | "WORKFLOW_OUTPUT_NOT_VERIFIED"
  | "WORKFLOW_RESUME_READY"
  | "WORKFLOW_REGENERATE_REQUIRED"
  | "WORKFLOW_MANUAL_REVIEW_REQUIRED"
  | "WORKFLOW_AUTOMATION_COMPLETE"
  | "WORKFLOW_AUTOMATION_STOPPED_BY_USER";

export type CheckpointWorkflowStageId =
  | "source_intake"
  | "recording_complete"
  | "audio_saved"
  | "audio_normalized"
  | "transcription_ready"
  | "whisper_transcription_complete"
  | "transcript_preview"
  | "speaker_review"
  | "title_filename_review"
  | "transcript_archive_saved"
  | "transcript_export_saved"
  | "prompt_library_selected"
  | "prompt_workflow_complete"
  | "prompt_output_review"
  | "prompt_output_export_saved"
  | "workflow_complete";

export type CheckpointWorkflowSourceType =
  | "recorded_audio"
  | "imported_audio"
  | "imported_vtt"
  | "imported_txt"
  | "imported_srt"
  | "pasted_transcript"
  | "existing_history_item";

export type CheckpointAutomationPresetId =
  | "full_auto"
  | "stop_at_transcript"
  | "stop_at_rename"
  | "export_only"
  | "prompt_only"
  | "manual_review";

export interface CheckpointVerificationResult {
  required: boolean;
  status: "not_required" | "pending_native_verification" | "verified" | "failed";
  rule: string;
}

export interface CheckpointWorkflowStage {
  id: CheckpointWorkflowStageId;
  label: string;
  shortLabel: string;
  description: string;
  inputRequirements: string[];
  outputArtifacts: string[];
  automationEnabled: boolean;
  stopAfterStage: boolean;
  canRerun: boolean;
  canSkip: boolean;
  status: CheckpointWorkflowStageStatus;
  errorCode: CheckpointWorkflowDiagnosticCode;
  userMessage: string;
  timestamps: {
    startedAt: string | null;
    completedAt: string | null;
  };
  verificationResult: CheckpointVerificationResult;
}

export interface CheckpointAutomationPreset {
  id: CheckpointAutomationPresetId;
  label: string;
  description: string;
  startStageId: CheckpointWorkflowStageId;
  stopAfterStageId: CheckpointWorkflowStageId | null;
  enabledStageIds: CheckpointWorkflowStageId[];
}

export interface CheckpointWorkflowHistoryState {
  sourceType: CheckpointWorkflowSourceType;
  sourcePath: string;
  managedSourcePath: string | null;
  normalizedPath: string | null;
  transcriptTextPath: string | null;
  parsedSegmentsPath: string | null;
  speakerMap: Record<string, string>;
  titleSessionMetadata: {
    title: string;
    sessionNumber: string;
    date: string;
  };
  selectedPromptLibrary: string | null;
  sectionOutputs: Record<string, string>;
  exportPaths: Record<string, string>;
  checkpointStatuses: Record<CheckpointWorkflowStageId, CheckpointWorkflowStageStatus>;
  lastCompletedStage: CheckpointWorkflowStageId | null;
  failedStage: CheckpointWorkflowStageId | null;
  overwriteHistory: string[];
  userEdits: string[];
  metadataOnly: boolean;
  storesTranscriptText: boolean;
}

export interface CheckpointWorkflowPlan {
  mode: TranscriptionAutomationModeId;
  sourceType: CheckpointWorkflowSourceType;
  preset: CheckpointAutomationPreset;
  defaultStopStageId: CheckpointWorkflowStageId;
  stages: CheckpointWorkflowStage[];
  startFromSourceOptions: CheckpointWorkflowSourceType[];
  controls: string[];
  transcriptPreviewBox: {
    enabled: boolean;
    scrollable: true;
    actions: string[];
    downstreamRegenerationOnEdit: string[];
  };
  promptOutputBox: {
    enabled: boolean;
    scrollable: true;
    actions: string[];
    sectionSeparator: "line_breaks";
    noBulletsByDefault: true;
    noTablesByDefault: true;
  };
  downstreamRegenerationRules: string[];
  historyState: CheckpointWorkflowHistoryState;
  fileVerificationPolicy: string[];
  proofBoundary: string;
}

export const DEFAULT_CHECKPOINT_STOP_STAGE_ID: CheckpointWorkflowStageId = "transcript_preview";

export const CHECKPOINT_WORKFLOW_DIAGNOSTIC_CODES: CheckpointWorkflowDiagnosticCode[] = [
  "WORKFLOW_SOURCE_MISSING",
  "WORKFLOW_STAGE_BLOCKED",
  "WORKFLOW_STAGE_FAILED",
  "WORKFLOW_STAGE_SKIPPED",
  "WORKFLOW_OUTPUT_NOT_VERIFIED",
  "WORKFLOW_RESUME_READY",
  "WORKFLOW_REGENERATE_REQUIRED",
  "WORKFLOW_MANUAL_REVIEW_REQUIRED",
  "WORKFLOW_AUTOMATION_COMPLETE",
  "WORKFLOW_AUTOMATION_STOPPED_BY_USER",
];

export const CHECKPOINT_WORKFLOW_STAGE_DEFINITIONS: Omit<
  CheckpointWorkflowStage,
  "automationEnabled" | "stopAfterStage" | "status" | "errorCode" | "userMessage" | "timestamps" | "verificationResult"
>[] = [
  {
    id: "source_intake",
    label: "Source Intake",
    shortLabel: "Record/import audio",
    description: "Choose recorded audio, imported audio, imported VTT/TXT/SRT, pasted transcript, or history item.",
    inputRequirements: ["source selected or pasted text"],
    outputArtifacts: ["source reference"],
    canRerun: true,
    canSkip: false,
  },
  {
    id: "recording_complete",
    label: "Recording Complete",
    shortLabel: "Recording complete",
    description: "Applies only when the source is microphone recording.",
    inputRequirements: ["microphone selected", "recording stopped"],
    outputArtifacts: ["recording buffer"],
    canRerun: true,
    canSkip: true,
  },
  {
    id: "audio_saved",
    label: "Audio Saved",
    shortLabel: "Save audio",
    description: "Recording or imported audio has a verified local file.",
    inputRequirements: ["recording buffer or imported audio path", "writable audio folder"],
    outputArtifacts: ["verified audio file"],
    canRerun: true,
    canSkip: false,
  },
  {
    id: "audio_normalized",
    label: "Audio Normalized",
    shortLabel: "Normalize audio",
    description: "Optional speech-level helper creates and verifies a normalized copy.",
    inputRequirements: ["verified audio file", "FFmpeg ready", "normalizer enabled"],
    outputArtifacts: ["verified normalized audio copy"],
    canRerun: true,
    canSkip: true,
  },
  {
    id: "transcription_ready",
    label: "Transcription Ready",
    shortLabel: "Transcribe with Whisper",
    description: "Whisper/local transcription model and FFmpeg are ready.",
    inputRequirements: ["verified audio file", "Whisper backend ready", "FFmpeg ready"],
    outputArtifacts: ["transcription run plan"],
    canRerun: true,
    canSkip: true,
  },
  {
    id: "whisper_transcription_complete",
    label: "Whisper Transcription Complete",
    shortLabel: "Whisper complete",
    description: "Audio has been transcribed into text or segments by a real local backend.",
    inputRequirements: ["transcription ready", "local backend completed"],
    outputArtifacts: ["transcript text", "segments"],
    canRerun: true,
    canSkip: true,
  },
  {
    id: "transcript_preview",
    label: "Transcript Preview",
    shortLabel: "Review transcript",
    description: "Transcript is shown in a scrolling text box for review and editing.",
    inputRequirements: ["parsed VTT, pasted text, or completed transcription"],
    outputArtifacts: ["edited transcript draft"],
    canRerun: false,
    canSkip: false,
  },
  {
    id: "speaker_review",
    label: "Speaker Review",
    shortLabel: "Rename speakers",
    description: "User can rename speakers, apply speaker map, or skip.",
    inputRequirements: ["transcript preview"],
    outputArtifacts: ["speaker map"],
    canRerun: false,
    canSkip: true,
  },
  {
    id: "title_filename_review",
    label: "Title / Filename Review",
    shortLabel: "Rename title/file",
    description: "User can rename title, session number, date, and filename template.",
    inputRequirements: ["transcript preview"],
    outputArtifacts: ["safe filename plan"],
    canRerun: false,
    canSkip: false,
  },
  {
    id: "transcript_archive_saved",
    label: "Transcript Archive Saved",
    shortLabel: "Save transcript archive",
    description: "Renamed transcript archive is written and verified.",
    inputRequirements: ["safe filename plan", "archive folder writable", "native writer"],
    outputArtifacts: ["verified transcript archive"],
    canRerun: true,
    canSkip: true,
  },
  {
    id: "transcript_export_saved",
    label: "Transcript Export Saved",
    shortLabel: "Export PDF/TXT/DOCX",
    description: "PDF, DOCX, TXT, JSON, SRT, or VTT export is written and verified.",
    inputRequirements: ["edited transcript", "export folder writable", "native writer"],
    outputArtifacts: ["verified transcript exports"],
    canRerun: true,
    canSkip: true,
  },
  {
    id: "prompt_library_selected",
    label: "Prompt Library Selected",
    shortLabel: "Choose prompt library",
    description: "User chooses prompt workflow library or template.",
    inputRequirements: ["transcript preview"],
    outputArtifacts: ["selected prompt template"],
    canRerun: false,
    canSkip: true,
  },
  {
    id: "prompt_workflow_complete",
    label: "Prompt Workflow Complete",
    shortLabel: "Run prompt workflow",
    description: "Prompt sections run and show outputs in scrolling boxes.",
    inputRequirements: ["selected prompt template", "local model ready"],
    outputArtifacts: ["prompt section outputs"],
    canRerun: true,
    canSkip: true,
  },
  {
    id: "prompt_output_review",
    label: "Prompt Output Review",
    shortLabel: "Review prompt output",
    description: "User can edit prompt results manually.",
    inputRequirements: ["prompt section outputs"],
    outputArtifacts: ["edited prompt output"],
    canRerun: false,
    canSkip: true,
  },
  {
    id: "prompt_output_export_saved",
    label: "Prompt Output Export Saved",
    shortLabel: "Export prompt output",
    description: "Final prompt output is saved or exported and verified.",
    inputRequirements: ["edited prompt output", "output folder writable", "native writer"],
    outputArtifacts: ["verified prompt output export"],
    canRerun: true,
    canSkip: true,
  },
  {
    id: "workflow_complete",
    label: "Workflow Complete",
    shortLabel: "Done",
    description: "All selected stages are complete or intentionally skipped.",
    inputRequirements: ["selected stages complete or skipped"],
    outputArtifacts: ["workflow history state"],
    canRerun: false,
    canSkip: false,
  },
];

export const CHECKPOINT_WORKFLOW_STAGE_ORDER = CHECKPOINT_WORKFLOW_STAGE_DEFINITIONS.map((stage) => stage.label);

export const CHECKPOINT_START_FROM_SOURCE_OPTIONS: CheckpointWorkflowSourceType[] = [
  "recorded_audio",
  "imported_audio",
  "imported_vtt",
  "imported_txt",
  "imported_srt",
  "pasted_transcript",
  "existing_history_item",
];

export const CHECKPOINT_FILE_WRITING_STAGE_IDS: CheckpointWorkflowStageId[] = [
  "audio_saved",
  "audio_normalized",
  "transcript_archive_saved",
  "transcript_export_saved",
  "prompt_output_export_saved",
];

export const CHECKPOINT_AUTOMATION_CONTROLS = [
  "Start automation",
  "Continue from here",
  "Stop after this step",
  "Run selected steps",
  "Rerun this step",
  "Skip this step",
  "Manual review required",
  "Open output",
  "Regenerate downstream outputs",
];

export const CHECKPOINT_DOWNSTREAM_REGENERATION_RULES = [
  "Editing transcript marks transcript exports and prompt outputs Regenerate recommended.",
  "Editing speakers marks transcript archive and export Regenerate recommended.",
  "Editing title/session/date/filename marks archive and transcript exports Regenerate recommended.",
  "Editing prompt output does not rerun the local model unless the user chooses rerun.",
];

export const CHECKPOINT_FILE_VERIFICATION_POLICY = [
  "File exists.",
  "Size is greater than 0.",
  "Extension matches expected.",
  "Path is inside selected/default output folder unless the user chose another folder.",
  "No overwrite occurred unless overwrite policy allowed it.",
];

const ALL_STAGE_IDS = CHECKPOINT_WORKFLOW_STAGE_DEFINITIONS.map((stage) => stage.id);
const TRANSCRIPT_STAGE_IDS: CheckpointWorkflowStageId[] = [
  "source_intake",
  "transcript_preview",
  "speaker_review",
  "title_filename_review",
  "transcript_archive_saved",
  "transcript_export_saved",
];
const PROMPT_STAGE_IDS: CheckpointWorkflowStageId[] = [
  "source_intake",
  "transcript_preview",
  "prompt_library_selected",
  "prompt_workflow_complete",
  "prompt_output_review",
  "prompt_output_export_saved",
];

export const CHECKPOINT_AUTOMATION_PRESETS: CheckpointAutomationPreset[] = [
  {
    id: "full_auto",
    label: "Full Auto",
    description: "Run every enabled stage through final prompt output export when native checks pass.",
    startStageId: "source_intake",
    stopAfterStageId: null,
    enabledStageIds: ALL_STAGE_IDS,
  },
  {
    id: "stop_at_transcript",
    label: "Stop at Transcript",
    description: "Run source intake through transcript preview, then stop for review.",
    startStageId: "source_intake",
    stopAfterStageId: "transcript_preview",
    enabledStageIds: ALL_STAGE_IDS,
  },
  {
    id: "stop_at_rename",
    label: "Stop at Rename",
    description: "Run through speaker and title rename checkpoints, then stop.",
    startStageId: "source_intake",
    stopAfterStageId: "title_filename_review",
    enabledStageIds: ALL_STAGE_IDS,
  },
  {
    id: "export_only",
    label: "Export Only",
    description: "Start from existing transcript text and export selected formats.",
    startStageId: "transcript_preview",
    stopAfterStageId: "transcript_export_saved",
    enabledStageIds: TRANSCRIPT_STAGE_IDS,
  },
  {
    id: "prompt_only",
    label: "Prompt Only",
    description: "Start from transcript text and run the selected prompt library.",
    startStageId: "transcript_preview",
    stopAfterStageId: "prompt_output_review",
    enabledStageIds: PROMPT_STAGE_IDS,
  },
  {
    id: "manual_review",
    label: "Manual Review",
    description: "Stop at every major checkpoint for user confirmation.",
    startStageId: "source_intake",
    stopAfterStageId: "source_intake",
    enabledStageIds: ALL_STAGE_IDS,
  },
];

export function buildCheckpointWorkflowPlan(
  input: {
    mode?: TranscriptionAutomationModeId;
    sourceType?: CheckpointWorkflowSourceType;
    presetId?: CheckpointAutomationPresetId;
    stopAfterStageId?: CheckpointWorkflowStageId;
    editedTranscript?: boolean;
    editedSpeakers?: boolean;
    editedTitleOrFilename?: boolean;
    editedPromptOutput?: boolean;
    completedStageIds?: CheckpointWorkflowStageId[];
    failedStageId?: CheckpointWorkflowStageId | null;
    metadataOnlyHistory?: boolean;
  } = {},
): CheckpointWorkflowPlan {
  const mode = input.mode ?? "automatic_then_review";
  const sourceType = input.sourceType ?? "imported_vtt";
  const preset =
    CHECKPOINT_AUTOMATION_PRESETS.find((candidate) => candidate.id === input.presetId) ??
    CHECKPOINT_AUTOMATION_PRESETS[1];
  const stopAfterStageId = input.stopAfterStageId ?? preset.stopAfterStageId ?? null;
  const completedStageIds = new Set(input.completedStageIds ?? defaultCompletedStagesForSource(sourceType));
  const failedStageId = input.failedStageId ?? null;
  const regenerationStageIds = getRegenerationStageIds(input);
  const stages = CHECKPOINT_WORKFLOW_STAGE_DEFINITIONS.map((definition) => {
    const automationEnabled = preset.enabledStageIds.includes(definition.id);
    const fileVerificationRequired = CHECKPOINT_FILE_WRITING_STAGE_IDS.includes(definition.id);
    const isFailed = failedStageId === definition.id;
    const isRegenerateRecommended = regenerationStageIds.includes(definition.id);
    const status = getCheckpointStageStatus({
      stageId: definition.id,
      sourceType,
      automationEnabled,
      stopAfterStageId,
      completedStageIds,
      isFailed,
      isRegenerateRecommended,
      fileVerificationRequired,
    });
    const errorCode = getCheckpointErrorCode(status, isRegenerateRecommended);

    return {
      ...definition,
      automationEnabled,
      stopAfterStage: stopAfterStageId === definition.id || mode === "manual",
      status,
      errorCode,
      userMessage: getCheckpointUserMessage(definition.id, status, sourceType),
      timestamps: {
        startedAt: completedStageIds.has(definition.id) ? "2026-01-01T00:00:00.000Z" : null,
        completedAt: completedStageIds.has(definition.id) ? "2026-01-01T00:00:01.000Z" : null,
      },
      verificationResult: getCheckpointVerificationResult(definition.id, status, fileVerificationRequired),
    };
  });

  return {
    mode,
    sourceType,
    preset,
    defaultStopStageId: DEFAULT_CHECKPOINT_STOP_STAGE_ID,
    stages,
    startFromSourceOptions: CHECKPOINT_START_FROM_SOURCE_OPTIONS,
    controls: CHECKPOINT_AUTOMATION_CONTROLS,
    transcriptPreviewBox: {
      enabled: true,
      scrollable: true,
      actions: ["edit text", "save transcript changes", "reset to original parsed transcript", "continue automation", "export transcript"],
      downstreamRegenerationOnEdit: ["Transcript Export Saved", "Prompt Workflow Complete", "Prompt Output Export Saved"],
    },
    promptOutputBox: {
      enabled: true,
      scrollable: true,
      actions: ["edit output", "rerun section", "copy section", "copy all", "save/export prompt output"],
      sectionSeparator: "line_breaks",
      noBulletsByDefault: true,
      noTablesByDefault: true,
    },
    downstreamRegenerationRules: CHECKPOINT_DOWNSTREAM_REGENERATION_RULES,
    historyState: buildCheckpointHistoryState({
      sourceType,
      stages,
      failedStageId,
      metadataOnlyHistory: input.metadataOnlyHistory !== false,
      userEdits: getUserEdits(input),
    }),
    fileVerificationPolicy: CHECKPOINT_FILE_VERIFICATION_POLICY,
    proofBoundary:
      "Checkpoint automation is not stem separation proof and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.",
  };
}

export function getCheckpointResumeSummary(plan: CheckpointWorkflowPlan): {
  status: "WORKFLOW_RESUME_READY" | "WORKFLOW_SOURCE_MISSING";
  lastCompletedStage: CheckpointWorkflowStageId | null;
  nextStage: CheckpointWorkflowStageId | null;
  message: string;
} {
  const lastCompletedStage = plan.historyState.lastCompletedStage;
  const nextStage = plan.stages.find((stage) => stage.status === "Ready" || stage.status === "Needs Review")?.id ?? null;

  if (!lastCompletedStage) {
    return {
      status: "WORKFLOW_SOURCE_MISSING",
      lastCompletedStage,
      nextStage,
      message: "Select or paste a source before automation can resume.",
    };
  }

  return {
    status: "WORKFLOW_RESUME_READY",
    lastCompletedStage,
    nextStage,
    message: `Continue from ${lastCompletedStage}; completed checkpoints remain preserved.`,
  };
}

export function checkpointAutomationDoesNotAffectReleaseGate(): string {
  return "This checkpoint automation, transcription, export, prompt workflow, and history resume flow is not stem separation proof and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.";
}

function defaultCompletedStagesForSource(sourceType: CheckpointWorkflowSourceType): CheckpointWorkflowStageId[] {
  if (sourceType === "imported_vtt" || sourceType === "imported_txt" || sourceType === "imported_srt") {
    return ["source_intake", "transcript_preview"];
  }

  if (sourceType === "pasted_transcript") {
    return ["source_intake", "transcript_preview"];
  }

  if (sourceType === "existing_history_item") {
    return ["source_intake", "transcript_preview", "speaker_review", "title_filename_review"];
  }

  return ["source_intake"];
}

function getRegenerationStageIds(input: {
  editedTranscript?: boolean;
  editedSpeakers?: boolean;
  editedTitleOrFilename?: boolean;
  editedPromptOutput?: boolean;
}): CheckpointWorkflowStageId[] {
  const stageIds = new Set<CheckpointWorkflowStageId>();

  if (input.editedTranscript) {
    stageIds.add("transcript_export_saved");
    stageIds.add("prompt_workflow_complete");
    stageIds.add("prompt_output_export_saved");
  }

  if (input.editedSpeakers) {
    stageIds.add("transcript_archive_saved");
    stageIds.add("transcript_export_saved");
  }

  if (input.editedTitleOrFilename) {
    stageIds.add("transcript_archive_saved");
    stageIds.add("transcript_export_saved");
  }

  if (input.editedPromptOutput) {
    stageIds.add("prompt_output_export_saved");
  }

  return Array.from(stageIds);
}

function getCheckpointStageStatus(input: {
  stageId: CheckpointWorkflowStageId;
  sourceType: CheckpointWorkflowSourceType;
  automationEnabled: boolean;
  stopAfterStageId: CheckpointWorkflowStageId | null;
  completedStageIds: Set<CheckpointWorkflowStageId>;
  isFailed: boolean;
  isRegenerateRecommended: boolean;
  fileVerificationRequired: boolean;
}): CheckpointWorkflowStageStatus {
  if (!input.automationEnabled) return "Skipped";
  if (input.isFailed) return "Failed";
  if (input.isRegenerateRecommended) return "Needs Review";
  if (input.completedStageIds.has(input.stageId)) return "Complete";
  if (input.fileVerificationRequired) return "Output Not Verified";
  if (input.stageId === input.stopAfterStageId) return "Needs Review";
  if (input.stageId === "recording_complete" && input.sourceType !== "recorded_audio") return "Skipped";
  if (input.stageId === "audio_saved" && !["recorded_audio", "imported_audio"].includes(input.sourceType)) return "Skipped";
  if (input.stageId === "audio_normalized" && !["recorded_audio", "imported_audio"].includes(input.sourceType)) return "Skipped";
  if (
    (input.stageId === "transcription_ready" || input.stageId === "whisper_transcription_complete") &&
    !["recorded_audio", "imported_audio"].includes(input.sourceType)
  ) {
    return "Skipped";
  }
  if (input.stageId === "workflow_complete") return "Blocked";
  return "Ready";
}

function getCheckpointErrorCode(
  status: CheckpointWorkflowStageStatus,
  regenerateRecommended: boolean,
): CheckpointWorkflowDiagnosticCode {
  if (regenerateRecommended) return "WORKFLOW_REGENERATE_REQUIRED";
  if (status === "Skipped") return "WORKFLOW_STAGE_SKIPPED";
  if (status === "Failed") return "WORKFLOW_STAGE_FAILED";
  if (status === "Blocked") return "WORKFLOW_STAGE_BLOCKED";
  if (status === "Output Not Verified") return "WORKFLOW_OUTPUT_NOT_VERIFIED";
  if (status === "Needs Review") return "WORKFLOW_MANUAL_REVIEW_REQUIRED";
  if (status === "Complete") return "WORKFLOW_RESUME_READY";
  return "WORKFLOW_STAGE_BLOCKED";
}

function getCheckpointUserMessage(
  stageId: CheckpointWorkflowStageId,
  status: CheckpointWorkflowStageStatus,
  sourceType: CheckpointWorkflowSourceType,
): string {
  if (status === "Output Not Verified") {
    return "Native file write and nonzero output verification are required before this stage can be complete.";
  }

  if (status === "Needs Review") {
    return "Manual review required; edits are allowed before continuing automation.";
  }

  if (status === "Skipped") {
    return `Skipped for ${sourceType} unless the user explicitly enables this checkpoint.`;
  }

  if (stageId === "transcript_preview") {
    return "Transcript Preview scrolling box is the default stop point for new users.";
  }

  if (stageId === "prompt_output_review") {
    return "Prompt Output scrolling boxes stay editable and line-break oriented.";
  }

  return "Checkpoint state is visible, recoverable, and does not claim proof.";
}

function getCheckpointVerificationResult(
  stageId: CheckpointWorkflowStageId,
  status: CheckpointWorkflowStageStatus,
  required: boolean,
): CheckpointVerificationResult {
  if (!required) {
    return {
      required: false,
      status: "not_required",
      rule: "No durable file is written by this checkpoint.",
    };
  }

  return {
    required: true,
    status: status === "Complete" ? "verified" : "pending_native_verification",
    rule: CHECKPOINT_FILE_VERIFICATION_POLICY.join(" "),
  };
}

function buildCheckpointHistoryState(input: {
  sourceType: CheckpointWorkflowSourceType;
  stages: CheckpointWorkflowStage[];
  failedStageId: CheckpointWorkflowStageId | null;
  metadataOnlyHistory: boolean;
  userEdits: string[];
}): CheckpointWorkflowHistoryState {
  const completedStages = input.stages.filter((stage) => stage.status === "Complete");
  const lastCompletedStage = completedStages[completedStages.length - 1]?.id ?? null;

  return {
    sourceType: input.sourceType,
    sourcePath: "source_path_pending_native_selection",
    managedSourcePath: null,
    normalizedPath: null,
    transcriptTextPath: input.metadataOnlyHistory ? null : "transcript_text_path_after_native_write",
    parsedSegmentsPath: "parsed_segments_path_pending_native_write",
    speakerMap: {
      "Speaker 1": "Interviewer",
      "Speaker 2": "Guest",
    },
    titleSessionMetadata: {
      title: "Imported meeting transcript",
      sessionNumber: "001",
      date: "01-01-2026",
    },
    selectedPromptLibrary: null,
    sectionOutputs: {},
    exportPaths: {},
    checkpointStatuses: Object.fromEntries(input.stages.map((stage) => [stage.id, stage.status])) as Record<
      CheckpointWorkflowStageId,
      CheckpointWorkflowStageStatus
    >,
    lastCompletedStage,
    failedStage: input.failedStageId,
    overwriteHistory: ["Ask before overwrite"],
    userEdits: input.userEdits,
    metadataOnly: input.metadataOnlyHistory,
    storesTranscriptText: !input.metadataOnlyHistory,
  };
}

function getUserEdits(input: {
  editedTranscript?: boolean;
  editedSpeakers?: boolean;
  editedTitleOrFilename?: boolean;
  editedPromptOutput?: boolean;
}): string[] {
  return [
    input.editedTranscript ? "transcript text edited; downstream exports/prompts need regeneration" : "",
    input.editedSpeakers ? "speaker names edited; archive/export need regeneration" : "",
    input.editedTitleOrFilename ? "title or filename edited; archive/export filenames need regeneration" : "",
    input.editedPromptOutput ? "prompt output edited; export needs regeneration" : "",
  ].filter(Boolean);
}
