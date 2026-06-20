import type { TranscriptionExportFormat } from "../types";
import {
  SYNTHETIC_VTT_FIXTURE,
  TRANSCRIPTION_INTAKE_FOLDER_POLICY,
  applySpeakerRenameMap,
  buildSpeakerRenameMap,
  buildTranscriptArchiveExportPlan,
  parseVttTranscriptContent,
  type SpeakerRenameEntry,
  type TranscriptArchiveExportPlan,
  type VttParseResult,
} from "./vttTranscriptImport";

export type TranscriptionAutomationModeId = "automatic" | "manual" | "automatic_then_review";

export type TranscriptionAutomationSourceType = "recording" | "imported_audio" | "vtt";

export type TranscriptionWorkflowStageStatus = "pending" | "ready" | "running" | "complete" | "failed" | "skipped";

export type TranscriptionOverwritePolicyId =
  | "never_overwrite"
  | "ask_before_overwrite"
  | "overwrite_previous_export"
  | "save_new_copy_with_suffix";

export type TranscriptionOverwriteState =
  | "OVERWRITE_NOT_ALLOWED"
  | "OVERWRITE_CONFIRMATION_REQUIRED"
  | "EXPORT_OVERWRITTEN"
  | "EXPORT_SAVED_AS_NEW_COPY"
  | "EXPORT_REGENERATION_FAILED"
  | "EXPORT_OUTPUT_NOT_VERIFIED";

export type TranscriptionAutomationStatus =
  | "automation_preview_only"
  | "vtt_parse_ready"
  | "vtt_imported_export_ready"
  | "recording_planned_not_active"
  | "imported_audio_native_required"
  | "native_writer_required"
  | "history_record_preview";

export interface TranscriptionAutomationMode {
  id: TranscriptionAutomationModeId;
  label: "Automatic" | "Manual" | "Automatic then Review";
  userLabel: string;
  description: string;
  defaultSelected: boolean;
}

export interface TranscriptionWorkflowStage {
  id:
    | "source"
    | "intake"
    | "clean_normalize"
    | "transcribe_parse"
    | "edit_speakers_title"
    | "export_archive"
    | "done";
  label:
    | "Source"
    | "Intake"
    | "Clean/Normalize"
    | "Transcribe/Parse"
    | "Edit Speakers/Title"
    | "Export/Archive"
    | "Done";
  status: TranscriptionWorkflowStageStatus;
  diagnosticCode?: string;
  userMessage: string;
}

export interface TranscriptionAutomationFolderPolicy {
  label:
    | "In-Session Recordings"
    | "Imported Audio Sessions"
    | "Imported VTT Source Folder"
    | "Renamed Transcript Archive"
    | "Transcript Export Folder"
    | "PDF Export Folder"
    | "DOCX Export Folder";
  logicalPath: string;
  status: "ready_after_native_check" | "missing" | "not_writable";
  chooseFolderAction: string;
  openFolderAction: string;
  resetAction: string;
}

export interface TranscriptionAutoExportSettings {
  autoExportAfterVttImport: boolean;
  autoExportAfterRecordingTranscription: boolean;
  autoExportAfterImportedAudioTranscription: boolean;
  autoCreateHistoryRecord: boolean;
  autoOpenExportFolderAfterExport: boolean;
  autoCopyFinalPlainTextToClipboard: boolean;
  autoOverwrite: false;
  exportFormats: Record<
    Extract<TranscriptionExportFormat, "txt" | "pdf" | "docx" | "json" | "vtt" | "srt">,
    {
      selectedByDefault: boolean;
      status: "native_writer_required" | "planned_not_active";
      note: string;
    }
  >;
}

export interface TranscriptionHistoryOverwriteEvent {
  policy: TranscriptionOverwritePolicyId;
  state: TranscriptionOverwriteState;
  at: string;
  message: string;
}

export interface TranscriptionAutomationHistoryRecord {
  sourceType: TranscriptionAutomationSourceType;
  originalFilePath: string;
  managedCopyPath?: string;
  archivePath?: string;
  exportPaths: Partial<Record<TranscriptionExportFormat, string>>;
  title: string;
  sessionNumber: string;
  speakerMap: SpeakerRenameEntry[];
  duration: string;
  createdOrImportedAt: string;
  lastEditedAt: string;
  workflowMode: TranscriptionAutomationModeId;
  status: TranscriptionAutomationStatus;
  overwriteHistory: TranscriptionHistoryOverwriteEvent[];
  errors: string[];
}

export interface TranscriptionPostProcessingEditorState {
  editableFields: string[];
  actions: string[];
  overwritePolicy: TranscriptionOverwritePolicyId;
  regenerateExportAvailable: boolean;
  message: string;
}

export interface TranscriptionAutomationWorkflowPlan {
  sourceType: TranscriptionAutomationSourceType;
  mode: TranscriptionAutomationModeId;
  stages: TranscriptionWorkflowStage[];
  status: TranscriptionAutomationStatus;
  summary: string;
  vtt?: VttParseResult;
  archiveExportPlan?: TranscriptArchiveExportPlan;
  historyRecord: TranscriptionAutomationHistoryRecord;
  completedStepsPreservedOnFailure: true;
  nativeWriteRequired: boolean;
  proofBoundary: string;
}

export const DEFAULT_TRANSCRIPTION_AUTOMATION_MODE: TranscriptionAutomationModeId = "automatic_then_review";

export const TRANSCRIPTION_AUTOMATION_MODES: TranscriptionAutomationMode[] = [
  {
    id: "automatic",
    label: "Automatic",
    userLabel: "Run the full workflow with defaults.",
    description:
      "OpenStem advances through parse/transcribe, speaker-map reuse, archive/export, and history when every required native check is available.",
    defaultSelected: false,
  },
  {
    id: "manual",
    label: "Manual",
    userLabel: "Let me confirm each step.",
    description: "OpenStem pauses before each step so title, speakers, transcript text, folders, and exports can be edited.",
    defaultSelected: false,
  },
  {
    id: "automatic_then_review",
    label: "Automatic then Review",
    userLabel: "Process now, edit title/speakers/export later.",
    description:
      "OpenStem does the low-risk work first, then keeps title, speaker names, filename, export formats, and destination editable.",
    defaultSelected: true,
  },
];

export const DEFAULT_TRANSCRIPTION_OVERWRITE_POLICY: TranscriptionOverwritePolicyId = "ask_before_overwrite";

export const TRANSCRIPTION_OVERWRITE_POLICY_OPTIONS = [
  {
    id: "never_overwrite",
    label: "Never overwrite",
    defaultSelected: false,
    requiresConfirmation: false,
    sourceFilesAffected: false,
  },
  {
    id: "ask_before_overwrite",
    label: "Ask before overwrite",
    defaultSelected: true,
    requiresConfirmation: true,
    sourceFilesAffected: false,
  },
  {
    id: "overwrite_previous_export",
    label: "Overwrite previous export",
    defaultSelected: false,
    requiresConfirmation: true,
    sourceFilesAffected: false,
  },
  {
    id: "save_new_copy_with_suffix",
    label: "Save new copy with suffix",
    defaultSelected: false,
    requiresConfirmation: false,
    sourceFilesAffected: false,
  },
] as const;

export const TRANSCRIPTION_AUTOMATION_DIAGNOSTIC_CODES = [
  "VTT_SELECTED",
  "VTT_VERIFIED",
  "VTT_PARSE_READY",
  "VTT_PARSE_RUNNING",
  "VTT_IMPORTED",
  "VTT_PARSE_FAILED",
  "SPEAKER_LABELS_DETECTED",
  "SPEAKER_LABELS_NOT_FOUND",
  "MIC_INPUT_SELECTED",
  "RECORDING_READY",
  "RECORDING_RUNNING",
  "RECORDING_STOPPED",
  "RECORDING_FILE_WRITTEN",
  "RECORDING_OUTPUT_NOT_VERIFIED",
  "NORMALIZATION_RUNNING",
  "NORMALIZATION_COMPLETE",
  "NORMALIZATION_FAILED",
  "TRANSCRIPTION_READY",
  "TRANSCRIPTION_RUNNING",
  "TRANSCRIPTION_COMPLETE",
  "TRANSCRIPTION_FAILED",
  "ARCHIVE_EXPORT_READY",
  "ARCHIVE_EXPORT_RUNNING",
  "ARCHIVE_EXPORT_COMPLETE",
  "ARCHIVE_EXPORT_PARTIAL",
  "ARCHIVE_EXPORT_FAILED",
  "EXPORT_OUTPUT_NOT_VERIFIED",
  "OVERWRITE_NOT_ALLOWED",
  "OVERWRITE_CONFIRMATION_REQUIRED",
  "EXPORT_OVERWRITTEN",
  "EXPORT_SAVED_AS_NEW_COPY",
  "EXPORT_REGENERATION_FAILED",
] as const;

export const TRANSCRIPTION_WORKFLOW_STAGE_ORDER: TranscriptionWorkflowStage["label"][] = [
  "Source",
  "Intake",
  "Clean/Normalize",
  "Transcribe/Parse",
  "Edit Speakers/Title",
  "Export/Archive",
  "Done",
];

export const TRANSCRIPTION_AUTOMATION_FOLDER_POLICY: TranscriptionAutomationFolderPolicy[] = [
  {
    label: "In-Session Recordings",
    logicalPath: "{userData}/OpenStem/Transcription/In-Session Recordings",
    status: "ready_after_native_check",
    chooseFolderAction: "Choose recordings folder",
    openFolderAction: "Open recordings folder",
    resetAction: "Reset recordings folder to default",
  },
  {
    label: "Imported Audio Sessions",
    logicalPath: "{userData}/OpenStem/Transcription/Imported Audio Sessions",
    status: "ready_after_native_check",
    chooseFolderAction: "Choose imported audio folder",
    openFolderAction: "Open imported audio folder",
    resetAction: "Reset imported audio folder to default",
  },
  {
    label: "Imported VTT Source Folder",
    logicalPath: "{userData}/OpenStem/Transcription/Imported VTT Transcripts",
    status: "ready_after_native_check",
    chooseFolderAction: "Choose VTT source folder",
    openFolderAction: "Open VTT source folder",
    resetAction: "Reset VTT source folder to default",
  },
  {
    label: "Renamed Transcript Archive",
    logicalPath: "{userData}/OpenStem/Transcription/Renamed Transcript Archive",
    status: "ready_after_native_check",
    chooseFolderAction: "Choose archive folder",
    openFolderAction: "Open archive folder",
    resetAction: "Reset archive folder to default",
  },
  {
    label: "Transcript Export Folder",
    logicalPath: "{userData}/OpenStem/Transcription/Exports/TXT-JSON-SRT-VTT",
    status: "ready_after_native_check",
    chooseFolderAction: "Choose transcript export folder",
    openFolderAction: "Open transcript export folder",
    resetAction: "Reset transcript export folder to default",
  },
  {
    label: "PDF Export Folder",
    logicalPath: "{userData}/OpenStem/Transcription/Exports/PDF",
    status: "ready_after_native_check",
    chooseFolderAction: "Choose PDF export folder",
    openFolderAction: "Open PDF export folder",
    resetAction: "Reset PDF export folder to default",
  },
  {
    label: "DOCX Export Folder",
    logicalPath: "{userData}/OpenStem/Transcription/Exports/DOCX",
    status: "ready_after_native_check",
    chooseFolderAction: "Choose DOCX export folder",
    openFolderAction: "Open DOCX export folder",
    resetAction: "Reset DOCX export folder to default",
  },
];

export const DEFAULT_TRANSCRIPTION_AUTO_EXPORT_SETTINGS: TranscriptionAutoExportSettings = {
  autoExportAfterVttImport: false,
  autoExportAfterRecordingTranscription: false,
  autoExportAfterImportedAudioTranscription: false,
  autoCreateHistoryRecord: true,
  autoOpenExportFolderAfterExport: false,
  autoCopyFinalPlainTextToClipboard: false,
  autoOverwrite: false,
  exportFormats: {
    txt: {
      selectedByDefault: true,
      status: "native_writer_required",
      note: "TXT is the first intended automatic export after a native writer verifies nonzero output.",
    },
    pdf: {
      selectedByDefault: false,
      status: "planned_not_active",
      note: "PDF export stays off until a stable local PDF exporter is wired and verified.",
    },
    docx: {
      selectedByDefault: false,
      status: "planned_not_active",
      note: "DOCX export stays off until a stable local DOCX exporter is wired and verified.",
    },
    json: {
      selectedByDefault: true,
      status: "native_writer_required",
      note: "JSON metadata export requires native write verification.",
    },
    vtt: {
      selectedByDefault: true,
      status: "native_writer_required",
      note: "Renamed VTT copy requires native write verification.",
    },
    srt: {
      selectedByDefault: false,
      status: "planned_not_active",
      note: "SRT conversion remains planned until conversion logic is implemented.",
    },
  },
};

export function buildVttAutomationWorkflowPlan(input: {
  mode?: TranscriptionAutomationModeId;
  vttContent?: string;
  sourcePath?: string;
  title?: string;
  sessionNumber?: string;
  speakerOverrides?: Record<string, string>;
} = {}): TranscriptionAutomationWorkflowPlan {
  const mode = input.mode ?? DEFAULT_TRANSCRIPTION_AUTOMATION_MODE;
  const vtt = parseVttTranscriptContent(input.vttContent ?? SYNTHETIC_VTT_FIXTURE, input.sourcePath ?? "synthetic_vtt_fixture.vtt");
  const speakerMap = buildSpeakerRenameMap(vtt.speakers, input.speakerOverrides ?? {});
  const renamed = applySpeakerRenameMap(vtt.segments, speakerMap);
  const title = input.title ?? deriveDefaultSessionTitle(input.sourcePath ?? "synthetic_vtt_fixture.vtt");
  const sessionNumber = input.sessionNumber ?? "001";
  const archiveExportPlan = buildTranscriptArchiveExportPlan({
    title,
    sessionNumber,
    date: "01-01-2026",
    durationMin: 1,
    durationHhmmss: "00h00m08s",
    sourceBasename: input.sourcePath ?? "synthetic_vtt_fixture.vtt",
    transcriptId: "vtt_import_pending",
    folder: "Renamed Transcript Archive",
    speakerCount: vtt.speakers.length,
  });

  const parseSucceeded = vtt.ok;
  const stages = buildWorkflowStages({
    source: parseSucceeded ? "complete" : "ready",
    intake: parseSucceeded ? "complete" : "failed",
    clean_normalize: "skipped",
    transcribe_parse: parseSucceeded ? "complete" : "failed",
    edit_speakers_title: parseSucceeded ? "ready" : "pending",
    export_archive: parseSucceeded ? "ready" : "pending",
    done: "pending",
  });

  return {
    sourceType: "vtt",
    mode,
    stages,
    status: parseSucceeded ? "vtt_imported_export_ready" : "vtt_parse_ready",
    summary: parseSucceeded
      ? "VTT imported. Speakers detected. Export ready."
      : "VTT parse failed. Original file is preserved; retry or manual text import is available.",
    vtt,
    archiveExportPlan,
    historyRecord: buildHistoryRecord({
      sourceType: "vtt",
      title,
      sessionNumber,
      speakerMap: renamed.speakerMap,
      originalFilePath: input.sourcePath ?? "synthetic_vtt_fixture.vtt",
      archivePath: archiveExportPlan.outputs.find((output) => output.format === "vtt")?.filename,
      workflowMode: mode,
      status: "history_record_preview",
      errors: vtt.errors,
    }),
    completedStepsPreservedOnFailure: true,
    nativeWriteRequired: true,
    proofBoundary: transcriptionAutomationDoesNotAffectReleaseGate(),
  };
}

export function buildRecordingAutomationWorkflowPlan(input: {
  mode?: TranscriptionAutomationModeId;
  nativeRecordingImplemented?: boolean;
  normalizerEnabled?: boolean;
} = {}): TranscriptionAutomationWorkflowPlan {
  const mode = input.mode ?? DEFAULT_TRANSCRIPTION_AUTOMATION_MODE;
  const nativeRecordingImplemented = input.nativeRecordingImplemented === true;
  const stages = buildWorkflowStages({
    source: nativeRecordingImplemented ? "ready" : "pending",
    intake: nativeRecordingImplemented ? "ready" : "pending",
    clean_normalize: input.normalizerEnabled ? "pending" : "skipped",
    transcribe_parse: "pending",
    edit_speakers_title: "pending",
    export_archive: "pending",
    done: "pending",
  });

  return {
    sourceType: "recording",
    mode,
    stages,
    status: nativeRecordingImplemented ? "native_writer_required" : "recording_planned_not_active",
    summary: nativeRecordingImplemented
      ? "Recording can continue only after native save returns a verified nonzero file."
      : "Recording workflow is Planned / Not active. Import workflow remains available first.",
    historyRecord: buildHistoryRecord({
      sourceType: "recording",
      title: "Recording intake pending",
      sessionNumber: "001",
      speakerMap: [],
      originalFilePath: "native_recording_not_created",
      workflowMode: mode,
      status: "recording_planned_not_active",
      errors: nativeRecordingImplemented ? [] : ["Native recording is not implemented."],
    }),
    completedStepsPreservedOnFailure: true,
    nativeWriteRequired: true,
    proofBoundary: transcriptionAutomationDoesNotAffectReleaseGate(),
  };
}

export function buildImportedAudioAutomationWorkflowPlan(input: {
  mode?: TranscriptionAutomationModeId;
  copyIntoLibrary?: boolean;
} = {}): TranscriptionAutomationWorkflowPlan {
  const mode = input.mode ?? DEFAULT_TRANSCRIPTION_AUTOMATION_MODE;
  const copyIntoLibrary = input.copyIntoLibrary !== false;
  const stages = buildWorkflowStages({
    source: "ready",
    intake: "pending",
    clean_normalize: "pending",
    transcribe_parse: "pending",
    edit_speakers_title: "pending",
    export_archive: "pending",
    done: "pending",
  });

  return {
    sourceType: "imported_audio",
    mode,
    stages,
    status: "imported_audio_native_required",
    summary: copyIntoLibrary
      ? "Imported audio copy requires native write verification before transcription queueing."
      : "Imported audio will keep its original location; verification still requires native file access.",
    historyRecord: buildHistoryRecord({
      sourceType: "imported_audio",
      title: "Imported audio intake pending",
      sessionNumber: "001",
      speakerMap: [],
      originalFilePath: "native_file_not_selected",
      managedCopyPath: copyIntoLibrary ? TRANSCRIPTION_INTAKE_FOLDER_POLICY[1].logicalPath : undefined,
      workflowMode: mode,
      status: "imported_audio_native_required",
      errors: ["Native file verification is required before queueing transcription."],
    }),
    completedStepsPreservedOnFailure: true,
    nativeWriteRequired: true,
    proofBoundary: transcriptionAutomationDoesNotAffectReleaseGate(),
  };
}

export function buildPostProcessingEditorState(
  overwritePolicy: TranscriptionOverwritePolicyId = DEFAULT_TRANSCRIPTION_OVERWRITE_POLICY,
): TranscriptionPostProcessingEditorState {
  return {
    editableFields: [
      "title",
      "session number",
      "date",
      "speaker names",
      "speaker map",
      "transcript text",
      "output filename template",
      "export formats",
      "destination folder",
      "overwrite policy",
    ],
    actions: [
      "Save changes",
      "Regenerate exports",
      "Export to same folder",
      "Export to new folder",
      "Overwrite previous export",
      "Save as new export",
      "Open export folder",
      "Reset speaker names",
      "Restore original transcript",
    ],
    overwritePolicy,
    regenerateExportAvailable: true,
    message:
      "Post-processing edits can be made after automation; export regeneration still requires native writer verification.",
  };
}

export function evaluateOverwritePolicy(input: {
  policy: TranscriptionOverwritePolicyId;
  previousExportExists: boolean;
  nativeWriteVerified: boolean;
}): { state: TranscriptionOverwriteState; message: string } {
  if (!input.previousExportExists) {
    return {
      state: input.nativeWriteVerified ? "EXPORT_SAVED_AS_NEW_COPY" : "EXPORT_OUTPUT_NOT_VERIFIED",
      message: "No previous export exists. Save as a new verified export after native write.",
    };
  }

  if (input.policy === "never_overwrite") {
    return {
      state: "OVERWRITE_NOT_ALLOWED",
      message: "Overwrite is blocked by policy. Save a new copy with a suffix.",
    };
  }

  if (input.policy === "ask_before_overwrite") {
    return {
      state: "OVERWRITE_CONFIRMATION_REQUIRED",
      message: "User confirmation is required before replacing a previous export.",
    };
  }

  if (!input.nativeWriteVerified) {
    return {
      state: "EXPORT_OUTPUT_NOT_VERIFIED",
      message: "Overwrite cannot be marked complete until the replacement file is verified.",
    };
  }

  if (input.policy === "overwrite_previous_export") {
    return {
      state: "EXPORT_OVERWRITTEN",
      message: "Previous export was replaced only after native output verification.",
    };
  }

  return {
    state: "EXPORT_SAVED_AS_NEW_COPY",
    message: "A new copy with suffix was saved only after native output verification.",
  };
}

export function transcriptionAutomationDoesNotAffectReleaseGate(): string {
  return "This automated transcription intake, recording, VTT parsing, archive/export, and history workflow is not stem separation proof and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.";
}

function buildWorkflowStages(overrides: Record<TranscriptionWorkflowStage["id"], TranscriptionWorkflowStageStatus>): TranscriptionWorkflowStage[] {
  return [
    {
      id: "source",
      label: "Source",
      status: overrides.source,
      diagnosticCode: "VTT_SELECTED",
      userMessage: "Select VTT, recording, or imported audio source.",
    },
    {
      id: "intake",
      label: "Intake",
      status: overrides.intake,
      diagnosticCode: "VTT_VERIFIED",
      userMessage: "Verify file extension, native path, and copy policy.",
    },
    {
      id: "clean_normalize",
      label: "Clean/Normalize",
      status: overrides.clean_normalize,
      diagnosticCode: "NORMALIZATION_RUNNING",
      userMessage: "Normalize only when FFmpeg is ready and output can be verified.",
    },
    {
      id: "transcribe_parse",
      label: "Transcribe/Parse",
      status: overrides.transcribe_parse,
      diagnosticCode: "VTT_IMPORTED",
      userMessage: "Parse VTT locally or transcribe through a verified native backend.",
    },
    {
      id: "edit_speakers_title",
      label: "Edit Speakers/Title",
      status: overrides.edit_speakers_title,
      diagnosticCode: "SPEAKER_LABELS_DETECTED",
      userMessage: "Edit title, session number, speaker names, and transcript text.",
    },
    {
      id: "export_archive",
      label: "Export/Archive",
      status: overrides.export_archive,
      diagnosticCode: "ARCHIVE_EXPORT_READY",
      userMessage: "Write archive and exports only after native writer verification.",
    },
    {
      id: "done",
      label: "Done",
      status: overrides.done,
      diagnosticCode: "EXPORT_OUTPUT_NOT_VERIFIED",
      userMessage: "Done requires verified output paths and nonzero files.",
    },
  ];
}

function buildHistoryRecord(input: {
  sourceType: TranscriptionAutomationSourceType;
  originalFilePath: string;
  managedCopyPath?: string;
  archivePath?: string;
  title: string;
  sessionNumber: string;
  speakerMap: SpeakerRenameEntry[];
  workflowMode: TranscriptionAutomationModeId;
  status: TranscriptionAutomationStatus;
  errors: string[];
}): TranscriptionAutomationHistoryRecord {
  const timestamp = "2026-01-01T00:00:00.000Z";
  return {
    sourceType: input.sourceType,
    originalFilePath: input.originalFilePath,
    managedCopyPath: input.managedCopyPath,
    archivePath: input.archivePath,
    exportPaths: {},
    title: input.title,
    sessionNumber: input.sessionNumber,
    speakerMap: input.speakerMap,
    duration: "00:00:08",
    createdOrImportedAt: timestamp,
    lastEditedAt: timestamp,
    workflowMode: input.workflowMode,
    status: input.status,
    overwriteHistory: [
      {
        policy: DEFAULT_TRANSCRIPTION_OVERWRITE_POLICY,
        state: "OVERWRITE_CONFIRMATION_REQUIRED",
        at: timestamp,
        message: "Default overwrite policy asks before replacing exports.",
      },
    ],
    errors: input.errors,
  };
}

function deriveDefaultSessionTitle(sourcePath: string): string {
  const lastPart = sourcePath.split(/[\\/]/).pop() ?? sourcePath;
  return lastPart.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Imported transcript";
}
