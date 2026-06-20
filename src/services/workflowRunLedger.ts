import type {
  CheckpointWorkflowStageId,
  CheckpointWorkflowStageStatus,
} from "./transcriptionWorkflowPipeline";
import type { TranscriptionAutomationModeId, TranscriptionOverwritePolicyId } from "./transcriptionAutomationWorkflow";

export type WorkflowRunSourceType =
  | "recording"
  | "imported_audio"
  | "imported_vtt"
  | "pasted_text"
  | "existing_history";

export type WorkflowArtifactType =
  | "recording"
  | "normalized_audio"
  | "imported_copy"
  | "parsed_transcript"
  | "renamed_vtt"
  | "txt_export"
  | "pdf_export"
  | "docx_export"
  | "json_export"
  | "prompt_output";

export type WorkflowRunSimpleStatus =
  | "Ready"
  | "Running"
  | "Complete"
  | "Needs Review"
  | "Failed"
  | "Regenerate Recommended"
  | "Output Verified"
  | "Output Missing";

export type WorkflowRunEditType =
  | "transcript_text"
  | "speaker_names"
  | "title"
  | "session_number"
  | "filename_template"
  | "prompt_library"
  | "prompt_output";

export type WorkflowHistoryMode = "metadata_only" | "full_history";

export type WorkflowRunPresetId =
  | "fast_transcript_only"
  | "archive_transcript"
  | "prompt_output_only"
  | "full_auto_then_review"
  | "manual_step_by_step";

export interface WorkflowArtifactRecord {
  artifactId: string;
  artifactType: WorkflowArtifactType;
  path: string;
  format: string;
  sizeBytes: number;
  createdAt: string;
  verified: boolean;
  verificationError: string | null;
  sourceStage: CheckpointWorkflowStageId;
  overwrittenPreviousFile: boolean;
  previousVersionPath?: string;
  expectedExtension: string;
  verificationRecorded: boolean;
  regenerateRecommended: boolean;
}

export interface WorkflowPromptOutputRecord {
  sectionId: string;
  outputPath: string | null;
  status: WorkflowRunSimpleStatus;
  regenerateRecommended: boolean;
}

export interface WorkflowRunEditRecord {
  editId: string;
  editType: WorkflowRunEditType;
  editedAt: string;
  downstreamStages: CheckpointWorkflowStageId[];
  downstreamArtifactTypes: WorkflowArtifactType[];
  message: string;
}

export interface WorkflowRunRecord {
  workflowRunId: string;
  sourceType: WorkflowRunSourceType;
  sourceOriginalPath: string | null;
  sourceManagedPath: string | null;
  sourceDuration: string | null;
  sourceSize: number | null;
  sourceFormat: string | null;
  transcriptTextPath: string | null;
  transcriptPreviewText: string | null;
  parsedSegmentsPath: string | null;
  speakerMap: Record<string, string>;
  title: string;
  sessionNumber: string;
  date: string;
  selectedPromptLibraryId: string | null;
  selectedPromptTemplateName: string | null;
  selectedModelId: string | null;
  workflowMode: TranscriptionAutomationModeId;
  checkpointStatuses: Record<CheckpointWorkflowStageId, CheckpointWorkflowStageStatus>;
  generatedFiles: WorkflowArtifactRecord[];
  exportFiles: WorkflowArtifactRecord[];
  promptOutputs: WorkflowPromptOutputRecord[];
  lastCompletedStage: CheckpointWorkflowStageId | null;
  currentStage: CheckpointWorkflowStageId;
  failedStage: CheckpointWorkflowStageId | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedByUser: boolean;
  notes: string;
  historyMode: WorkflowHistoryMode;
  storesTranscriptText: boolean;
  edits: WorkflowRunEditRecord[];
}

export interface WorkflowRunPreset {
  id: WorkflowRunPresetId;
  label: string;
  description: string;
  workflowMode: TranscriptionAutomationModeId;
  enabledStageIds: CheckpointWorkflowStageId[];
  stopAfterStageId: CheckpointWorkflowStageId | null;
  manualReviewEveryStage: boolean;
  defaultExportFormats: string[];
}

export interface WorkflowStatusSummary {
  currentStage: CheckpointWorkflowStageId;
  currentStageLabel: WorkflowRunSimpleStatus;
  lastCompletedStage: CheckpointWorkflowStageId | null;
  nextRecommendedAction: string;
  completedArtifacts: WorkflowArtifactRecord[];
  failedArtifacts: WorkflowArtifactRecord[];
  regenerateRecommendedArtifacts: WorkflowArtifactRecord[];
  controls: string[];
  proofBoundary: string;
}

export const WORKFLOW_RUN_SIMPLE_STATUS_LABELS: WorkflowRunSimpleStatus[] = [
  "Ready",
  "Running",
  "Complete",
  "Needs Review",
  "Failed",
  "Regenerate Recommended",
  "Output Verified",
  "Output Missing",
];

export const WORKFLOW_FILE_WRITING_STAGE_IDS: CheckpointWorkflowStageId[] = [
  "audio_saved",
  "audio_normalized",
  "transcript_archive_saved",
  "transcript_export_saved",
  "prompt_output_export_saved",
];

export const WORKFLOW_RECOVERY_ACTIONS = [
  "Continue automation",
  "Rerun failed step",
  "Rerun selected step",
  "Regenerate exports",
  "Regenerate prompt output",
  "Restore previous export",
  "Save as new copy",
  "Overwrite previous export if policy allows",
  "Clear failed stage and retry",
] as const;

export const WORKFLOW_RUN_PRESETS: WorkflowRunPreset[] = [
  {
    id: "fast_transcript_only",
    label: "Fast Transcript Only",
    description: "Record/import -> transcribe/parse -> show transcript -> stop.",
    workflowMode: "automatic_then_review",
    enabledStageIds: ["source_intake", "transcription_ready", "whisper_transcription_complete", "transcript_preview"],
    stopAfterStageId: "transcript_preview",
    manualReviewEveryStage: false,
    defaultExportFormats: [],
  },
  {
    id: "archive_transcript",
    label: "Archive Transcript",
    description: "Import/record -> transcribe/parse -> rename -> export TXT/PDF -> archive.",
    workflowMode: "automatic_then_review",
    enabledStageIds: [
      "source_intake",
      "transcription_ready",
      "whisper_transcription_complete",
      "transcript_preview",
      "speaker_review",
      "title_filename_review",
      "transcript_archive_saved",
      "transcript_export_saved",
    ],
    stopAfterStageId: "transcript_export_saved",
    manualReviewEveryStage: false,
    defaultExportFormats: ["txt", "pdf"],
  },
  {
    id: "prompt_output_only",
    label: "Prompt Output Only",
    description: "Import/paste transcript -> choose prompt library -> run prompt workflow -> final text output.",
    workflowMode: "automatic_then_review",
    enabledStageIds: [
      "source_intake",
      "transcript_preview",
      "prompt_library_selected",
      "prompt_workflow_complete",
      "prompt_output_review",
    ],
    stopAfterStageId: "prompt_output_review",
    manualReviewEveryStage: false,
    defaultExportFormats: [],
  },
  {
    id: "full_auto_then_review",
    label: "Full Auto then Review",
    description:
      "Source -> normalize -> transcribe/parse -> rename -> export -> prompt library -> prompt output -> stop for review.",
    workflowMode: "automatic_then_review",
    enabledStageIds: [
      "source_intake",
      "audio_normalized",
      "transcription_ready",
      "whisper_transcription_complete",
      "transcript_preview",
      "speaker_review",
      "title_filename_review",
      "transcript_archive_saved",
      "transcript_export_saved",
      "prompt_library_selected",
      "prompt_workflow_complete",
      "prompt_output_review",
    ],
    stopAfterStageId: "prompt_output_review",
    manualReviewEveryStage: false,
    defaultExportFormats: ["txt", "json", "pdf"],
  },
  {
    id: "manual_step_by_step",
    label: "Manual Step-by-Step",
    description: "Stops at every stage.",
    workflowMode: "manual",
    enabledStageIds: [
      "source_intake",
      "recording_complete",
      "audio_saved",
      "audio_normalized",
      "transcription_ready",
      "whisper_transcription_complete",
      "transcript_preview",
      "speaker_review",
      "title_filename_review",
      "transcript_archive_saved",
      "transcript_export_saved",
      "prompt_library_selected",
      "prompt_workflow_complete",
      "prompt_output_review",
      "prompt_output_export_saved",
      "workflow_complete",
    ],
    stopAfterStageId: null,
    manualReviewEveryStage: true,
    defaultExportFormats: [],
  },
];

const DEFAULT_TIMESTAMP = "2026-01-01T00:00:00.000Z";

export function createWorkflowRunRecord(
  input: Partial<WorkflowRunRecord> & {
    workflowRunId: string;
    sourceType: WorkflowRunSourceType;
  },
): WorkflowRunRecord {
  const historyMode = input.historyMode ?? "metadata_only";

  return {
    workflowRunId: input.workflowRunId,
    sourceType: input.sourceType,
    sourceOriginalPath: input.sourceOriginalPath ?? null,
    sourceManagedPath: input.sourceManagedPath ?? null,
    sourceDuration: input.sourceDuration ?? null,
    sourceSize: input.sourceSize ?? null,
    sourceFormat: input.sourceFormat ?? null,
    transcriptTextPath: input.transcriptTextPath ?? null,
    transcriptPreviewText: historyMode === "full_history" ? (input.transcriptPreviewText ?? null) : null,
    parsedSegmentsPath: input.parsedSegmentsPath ?? null,
    speakerMap: input.speakerMap ?? {},
    title: input.title ?? "Untitled workflow run",
    sessionNumber: input.sessionNumber ?? "001",
    date: input.date ?? "01-01-2026",
    selectedPromptLibraryId: input.selectedPromptLibraryId ?? null,
    selectedPromptTemplateName: input.selectedPromptTemplateName ?? null,
    selectedModelId: input.selectedModelId ?? null,
    workflowMode: input.workflowMode ?? "automatic_then_review",
    checkpointStatuses: input.checkpointStatuses ?? buildDefaultCheckpointStatuses(),
    generatedFiles: input.generatedFiles ?? [],
    exportFiles: input.exportFiles ?? [],
    promptOutputs: input.promptOutputs ?? [],
    lastCompletedStage: input.lastCompletedStage ?? null,
    currentStage: input.currentStage ?? "source_intake",
    failedStage: input.failedStage ?? null,
    errorCode: input.errorCode ?? null,
    createdAt: input.createdAt ?? DEFAULT_TIMESTAMP,
    updatedAt: input.updatedAt ?? DEFAULT_TIMESTAMP,
    reviewedByUser: input.reviewedByUser ?? false,
    notes: input.notes ?? "",
    historyMode,
    storesTranscriptText: historyMode === "full_history",
    edits: input.edits ?? [],
  };
}

export function createWorkflowArtifactRecord(
  input: Omit<
    Partial<WorkflowArtifactRecord>,
    "artifactId" | "artifactType" | "sourceStage" | "path" | "format"
  > & {
    artifactId: string;
    artifactType: WorkflowArtifactType;
    sourceStage: CheckpointWorkflowStageId;
    path?: string;
    format?: string;
  },
): WorkflowArtifactRecord {
  return {
    artifactId: input.artifactId,
    artifactType: input.artifactType,
    path: input.path ?? "",
    format: input.format ?? "",
    sizeBytes: input.sizeBytes ?? 0,
    createdAt: input.createdAt ?? DEFAULT_TIMESTAMP,
    verified: input.verified ?? false,
    verificationError: input.verificationError ?? "Output Missing",
    sourceStage: input.sourceStage,
    overwrittenPreviousFile: input.overwrittenPreviousFile ?? false,
    previousVersionPath: input.previousVersionPath,
    expectedExtension: input.expectedExtension ?? "",
    verificationRecorded: input.verificationRecorded ?? false,
    regenerateRecommended: input.regenerateRecommended ?? false,
  };
}

export function verifyWorkflowArtifact(input: {
  artifact: WorkflowArtifactRecord;
  fileExists: boolean;
  sizeBytes: number;
  expectedExtension: string;
  verificationRecorded: boolean;
}): WorkflowArtifactRecord {
  const extensionMatches =
    input.expectedExtension.length === 0 || input.artifact.path.toLowerCase().endsWith(input.expectedExtension);
  const verified = input.fileExists && input.sizeBytes > 0 && extensionMatches && input.verificationRecorded;

  return {
    ...input.artifact,
    sizeBytes: input.sizeBytes,
    expectedExtension: input.expectedExtension,
    verified,
    verificationRecorded: input.verificationRecorded,
    verificationError: verified
      ? null
      : input.verificationRecorded
        ? "Output Missing"
        : "Verification not recorded",
  };
}

export function requireArtifactVerificationForStage(
  stageId: CheckpointWorkflowStageId,
  artifacts: WorkflowArtifactRecord[],
): { ok: boolean; status: WorkflowRunSimpleStatus; missingArtifactTypes: WorkflowArtifactType[] } {
  if (!WORKFLOW_FILE_WRITING_STAGE_IDS.includes(stageId)) {
    return { ok: true, status: "Ready", missingArtifactTypes: [] };
  }

  const stageArtifacts = artifacts.filter((artifact) => artifact.sourceStage === stageId);
  const missingArtifactTypes = stageArtifacts
    .filter((artifact) => !artifact.verified)
    .map((artifact) => artifact.artifactType);

  return {
    ok: stageArtifacts.length > 0 && missingArtifactTypes.length === 0,
    status: stageArtifacts.length > 0 && missingArtifactTypes.length === 0 ? "Output Verified" : "Output Missing",
    missingArtifactTypes,
  };
}

export function failWorkflowStage(
  record: WorkflowRunRecord,
  stageId: CheckpointWorkflowStageId,
  errorCode: string,
): WorkflowRunRecord {
  return {
    ...record,
    currentStage: stageId,
    failedStage: stageId,
    errorCode,
    checkpointStatuses: {
      ...record.checkpointStatuses,
      [stageId]: "Failed",
    },
    updatedAt: DEFAULT_TIMESTAMP,
  };
}

export function clearFailedStageAndRetry(record: WorkflowRunRecord): WorkflowRunRecord {
  if (!record.failedStage) return record;

  return {
    ...record,
    currentStage: record.failedStage,
    failedStage: null,
    errorCode: null,
    checkpointStatuses: {
      ...record.checkpointStatuses,
      [record.failedStage]: "Ready",
    },
    updatedAt: DEFAULT_TIMESTAMP,
  };
}

export function resumeWorkflowRun(record: WorkflowRunRecord): {
  canResume: boolean;
  resumeFromStage: CheckpointWorkflowStageId | null;
  nextRecommendedAction: string;
} {
  if (record.failedStage) {
    return {
      canResume: true,
      resumeFromStage: record.failedStage,
      nextRecommendedAction: "Rerun failed step",
    };
  }

  if (record.lastCompletedStage) {
    return {
      canResume: true,
      resumeFromStage: record.currentStage,
      nextRecommendedAction: "Continue automation",
    };
  }

  return {
    canResume: false,
    resumeFromStage: null,
    nextRecommendedAction: "Select source",
  };
}

export function rerunWorkflowStage(
  record: WorkflowRunRecord,
  stageId: CheckpointWorkflowStageId,
): WorkflowRunRecord {
  return {
    ...record,
    currentStage: stageId,
    failedStage: record.failedStage === stageId ? null : record.failedStage,
    errorCode: record.failedStage === stageId ? null : record.errorCode,
    checkpointStatuses: {
      ...record.checkpointStatuses,
      [stageId]: "Ready",
    },
    updatedAt: DEFAULT_TIMESTAMP,
  };
}

export function applyWorkflowEdit(record: WorkflowRunRecord, editType: WorkflowRunEditType): WorkflowRunRecord {
  const downstreamArtifactTypes = getDownstreamArtifactTypesForEdit(editType);
  const downstreamStages = getDownstreamStagesForEdit(editType);
  const editRecord: WorkflowRunEditRecord = {
    editId: `edit-${record.edits.length + 1}`,
    editType,
    editedAt: DEFAULT_TIMESTAMP,
    downstreamStages,
    downstreamArtifactTypes,
    message: getEditMessage(editType),
  };

  const markArtifact = (artifact: WorkflowArtifactRecord): WorkflowArtifactRecord =>
    downstreamArtifactTypes.includes(artifact.artifactType)
      ? { ...artifact, regenerateRecommended: true, verificationError: "REGENERATE_RECOMMENDED" }
      : artifact;

  return {
    ...record,
    generatedFiles: record.generatedFiles.map(markArtifact),
    exportFiles: record.exportFiles.map(markArtifact),
    promptOutputs: record.promptOutputs.map((output) =>
      editType === "transcript_text" || editType === "prompt_library"
        ? { ...output, regenerateRecommended: true, status: "Regenerate Recommended" }
        : output,
    ),
    checkpointStatuses: downstreamStages.reduce(
      (statuses, stageId) => ({
        ...statuses,
        [stageId]: "Needs Review" as CheckpointWorkflowStageStatus,
      }),
      record.checkpointStatuses,
    ),
    edits: [...record.edits, editRecord],
    updatedAt: DEFAULT_TIMESTAMP,
  };
}

export function evaluateWorkflowOverwritePolicy(input: {
  policy: TranscriptionOverwritePolicyId;
  previousArtifact: WorkflowArtifactRecord | null;
  replacementArtifact: WorkflowArtifactRecord;
  userConfirmedOverwrite?: boolean;
}): {
  canOverwrite: boolean;
  preservePreviousArtifact: boolean;
  action: "save_new_copy" | "overwrite_previous" | "ask_user" | "blocked";
  message: string;
} {
  if (!input.previousArtifact) {
    return {
      canOverwrite: false,
      preservePreviousArtifact: false,
      action: "save_new_copy",
      message: "No previous export exists. Save as a new copy.",
    };
  }

  if (!input.replacementArtifact.verified) {
    return {
      canOverwrite: false,
      preservePreviousArtifact: true,
      action: "blocked",
      message: "Prior successful export remains until replacement output is verified.",
    };
  }

  if (input.policy === "never_overwrite" || input.policy === "save_new_copy_with_suffix") {
    return {
      canOverwrite: false,
      preservePreviousArtifact: true,
      action: "save_new_copy",
      message: "Overwrite is not allowed by policy. Save as a new copy.",
    };
  }

  if (input.policy === "ask_before_overwrite" && input.userConfirmedOverwrite !== true) {
    return {
      canOverwrite: false,
      preservePreviousArtifact: true,
      action: "ask_user",
      message: "Ask before overwrite is active. User confirmation is required.",
    };
  }

  return {
    canOverwrite: true,
    preservePreviousArtifact: false,
    action: "overwrite_previous",
    message: "Overwrite is allowed only after replacement output verification.",
  };
}

export function getWorkflowStatusSummary(record: WorkflowRunRecord): WorkflowStatusSummary {
  const allArtifacts = [...record.generatedFiles, ...record.exportFiles];
  const resume = resumeWorkflowRun(record);
  const failedArtifacts = allArtifacts.filter((artifact) => artifact.verificationRecorded && !artifact.verified);
  const regenerateRecommendedArtifacts = allArtifacts.filter((artifact) => artifact.regenerateRecommended);

  return {
    currentStage: record.currentStage,
    currentStageLabel: getSimpleStatusForRecord(record),
    lastCompletedStage: record.lastCompletedStage,
    nextRecommendedAction: resume.nextRecommendedAction,
    completedArtifacts: allArtifacts.filter((artifact) => artifact.verified),
    failedArtifacts,
    regenerateRecommendedArtifacts,
    controls: [
      "Open output folder",
      "Continue automation",
      "Rerun failed step",
      "Edit title/speakers",
      "Export again",
    ],
    proofBoundary: workflowRunLedgerDoesNotAffectReleaseGate(),
  };
}

export function getWorkflowPresetById(presetId: WorkflowRunPresetId): WorkflowRunPreset {
  return WORKFLOW_RUN_PRESETS.find((preset) => preset.id === presetId) ?? WORKFLOW_RUN_PRESETS[0];
}

export function workflowRunLedgerDoesNotAffectReleaseGate(): string {
  return "This Workflow Run Ledger recovery, artifact tracking, transcript history, and prompt output recovery layer is not stem separation proof and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.";
}

function buildDefaultCheckpointStatuses(): Record<CheckpointWorkflowStageId, CheckpointWorkflowStageStatus> {
  const stageIds: CheckpointWorkflowStageId[] = [
    "source_intake",
    "recording_complete",
    "audio_saved",
    "audio_normalized",
    "transcription_ready",
    "whisper_transcription_complete",
    "transcript_preview",
    "speaker_review",
    "title_filename_review",
    "transcript_archive_saved",
    "transcript_export_saved",
    "prompt_library_selected",
    "prompt_workflow_complete",
    "prompt_output_review",
    "prompt_output_export_saved",
    "workflow_complete",
  ];

  return Object.fromEntries(stageIds.map((stageId) => [stageId, "Not Started"])) as Record<
    CheckpointWorkflowStageId,
    CheckpointWorkflowStageStatus
  >;
}

function getSimpleStatusForRecord(record: WorkflowRunRecord): WorkflowRunSimpleStatus {
  if (record.failedStage) return "Failed";
  if (record.edits.length > 0) return "Regenerate Recommended";
  const currentStatus = record.checkpointStatuses[record.currentStage];
  if (currentStatus === "Complete") return "Complete";
  if (currentStatus === "Running") return "Running";
  if (currentStatus === "Needs Review") return "Needs Review";
  return "Ready";
}

function getDownstreamArtifactTypesForEdit(editType: WorkflowRunEditType): WorkflowArtifactType[] {
  if (editType === "speaker_names") return ["renamed_vtt", "txt_export", "pdf_export", "docx_export", "json_export"];
  if (editType === "title" || editType === "session_number" || editType === "filename_template") {
    return ["renamed_vtt", "txt_export", "pdf_export", "docx_export", "json_export", "prompt_output"];
  }
  if (editType === "transcript_text" || editType === "prompt_library") {
    return ["prompt_output"];
  }
  if (editType === "prompt_output") return ["prompt_output"];
  return [];
}

function getDownstreamStagesForEdit(editType: WorkflowRunEditType): CheckpointWorkflowStageId[] {
  if (editType === "speaker_names") return ["transcript_archive_saved", "transcript_export_saved"];
  if (editType === "title" || editType === "session_number" || editType === "filename_template") {
    return ["title_filename_review", "transcript_archive_saved", "transcript_export_saved"];
  }
  if (editType === "transcript_text" || editType === "prompt_library") {
    return ["prompt_workflow_complete", "prompt_output_review", "prompt_output_export_saved"];
  }
  if (editType === "prompt_output") return ["prompt_output_export_saved"];
  return [];
}

function getEditMessage(editType: WorkflowRunEditType): string {
  if (editType === "speaker_names") return "Speaker rename changed; transcript archive and exports should be regenerated.";
  if (editType === "transcript_text") return "Transcript text changed; prompt outputs should be regenerated.";
  if (editType === "prompt_library") return "Prompt library changed; prompt outputs should be regenerated.";
  if (editType === "title") return "Title changed; export filenames should be regenerated.";
  if (editType === "session_number") return "Session number changed; export filenames should be regenerated.";
  if (editType === "filename_template") return "Filename template changed; export filenames should be regenerated.";
  return "Prompt output changed; downstream exports should be regenerated.";
}
