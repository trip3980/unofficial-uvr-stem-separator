import {
  MASTERING_MODES,
  type MasteringDiagnosticCode,
  type MasteringModeId,
  type MasteringOutputFormat,
} from "./masteringWorkflow";

export type MasteringChainBackend =
  | "ffmpeg_loudnorm"
  | "matchering_optional_backend"
  | "web_audio_planned"
  | "native_writer";
export type MasteringChainStatus = "single_file_ready" | "planned_requires_backend" | "blocked";
export type MasteringChainStepStatus =
  | "ready_with_ffmpeg"
  | "measurement_required"
  | "output_verification_required"
  | "planned";
export type MasteringExportPolicyId =
  | "save_mastered_copy"
  | "save_as_new_version"
  | "overwrite_previous_mastered_export"
  | "export_to_new_folder";

export interface MasteringGoalPolicy {
  modeId: MasteringModeId;
  displayName: string;
  plainLanguagePurpose: string;
  targetLufs: number | null;
  peakCeilingDb: number;
  backend: MasteringChainBackend;
  status: MasteringChainStatus;
  userFacingStatus: string;
}

export interface MasteringChainStep {
  id: string;
  label: string;
  purpose: string;
  status: MasteringChainStepStatus;
}

export interface MasteringChainPolicy {
  chainId: MasteringModeId;
  displayName: string;
  purpose: string;
  requiredBackend: MasteringChainBackend;
  steps: MasteringChainStep[];
  settings: string[];
  inputRequirements: string[];
  outputFormats: MasteringOutputFormat[];
  verificationRequirements: string[];
  destructive: false;
  status: MasteringChainStatus;
  proofBoundary: string;
}

export interface MasteringChainReadinessInput {
  modeId: MasteringModeId;
  inputFileSelected: boolean;
  outputFolderSelected: boolean;
  outputFolderWritable: boolean;
  ffmpegReady: boolean;
  analysisComplete: boolean;
  referenceFileSelected?: boolean;
}

export interface MasteringChainReadiness {
  status: "blocked" | "ready" | "planned";
  diagnosticCode: MasteringDiagnosticCode;
  blockers: MasteringDiagnosticCode[];
  userMessage: string;
}

export interface MasteringExportPolicy {
  id: MasteringExportPolicyId;
  label: string;
  default: boolean;
  destructive: false;
  diagnosticCode: MasteringDiagnosticCode;
  userMessage: string;
}

export const MASTERING_PROOF_BOUNDARY =
  "Mastering is audio finalization, not AI stem-separation proof, and does not approve Beta Candidate.";

export const MASTERING_GOALS: MasteringGoalPolicy[] = MASTERING_MODES.map((mode) => ({
  modeId: mode.id,
  displayName: mode.label,
  plainLanguagePurpose: mode.description,
  targetLufs: mode.targetLufs,
  peakCeilingDb: mode.peakCeilingDb,
  backend:
    mode.id === "reference_match"
      ? "matchering_optional_backend"
      : mode.implemented
        ? "ffmpeg_loudnorm"
        : "web_audio_planned",
  status:
    mode.id === "reference_match" || !mode.implemented ? "planned_requires_backend" : "single_file_ready",
  userFacingStatus:
    mode.id === "reference_match"
      ? "Planned - requires reference-match backend"
      : mode.implemented
        ? "Ready when FFmpeg is verified"
        : "Planned",
}));

const COMMON_STEPS: MasteringChainStep[] = [
  {
    id: "analyze_input",
    label: "Analyze input",
    purpose: "Read duration, format, sample rate, channels, file size, and peak if FFmpeg can measure it.",
    status: "measurement_required",
  },
  {
    id: "normalize_loudness",
    label: "Normalize loudness",
    purpose: "Use FFmpeg loudnorm toward the selected target without promising professional mastering.",
    status: "ready_with_ffmpeg",
  },
  {
    id: "limit_peak",
    label: "Apply peak ceiling",
    purpose: "Ask FFmpeg loudnorm to respect the selected true-peak ceiling.",
    status: "ready_with_ffmpeg",
  },
  {
    id: "export_copy",
    label: "Export copy",
    purpose: "Write a new WAV or FLAC file in the selected folder without overwriting the source.",
    status: "output_verification_required",
  },
  {
    id: "analyze_output",
    label: "Analyze output",
    purpose: "Run the same measured metadata pass on the exported copy.",
    status: "measurement_required",
  },
];

const COMMON_VERIFICATION_REQUIREMENTS = [
  "FFmpeg returned success",
  "Electron native write verified",
  "output file exists",
  "output file size is greater than 0",
  "output extension matches selected format",
  "output path is inside the selected output folder",
  "source file path is not overwritten",
];

export const MASTERING_CHAIN_POLICIES: MasteringChainPolicy[] = MASTERING_GOALS.map((goal) => ({
  chainId: goal.modeId,
  displayName: goal.displayName,
  purpose: goal.plainLanguagePurpose,
  requiredBackend: goal.backend,
  steps:
    goal.modeId === "reference_match"
      ? [
          COMMON_STEPS[0],
          {
            id: "analyze_reference",
            label: "Analyze reference",
            purpose: "Measure a selected reference track before any match attempt.",
            status: "planned",
          },
          {
            id: "match_reference",
            label: "Reference match",
            purpose: "Requires a verified Matchering-style backend before it can run.",
            status: "planned",
          },
          COMMON_STEPS[3],
          COMMON_STEPS[4],
        ]
      : COMMON_STEPS,
  settings: ["targetLufs", "peakCeilingDb", "intensity", "outputFormat", "overwritePolicy"],
  inputRequirements:
    goal.modeId === "reference_match"
      ? ["verified local input audio", "verified local reference audio", "writable output folder", "FFmpeg ready"]
      : ["verified local input audio", "writable output folder", "FFmpeg ready"],
  outputFormats: goal.modeId === "reference_match" ? ["wav", "flac"] : ["wav", "flac"],
  verificationRequirements: COMMON_VERIFICATION_REQUIREMENTS,
  destructive: false,
  status: goal.status,
  proofBoundary: MASTERING_PROOF_BOUNDARY,
}));

export const MASTERING_EXPORT_POLICIES: MasteringExportPolicy[] = [
  {
    id: "save_mastered_copy",
    label: "Save mastered copy",
    default: true,
    destructive: false,
    diagnosticCode: "MASTERING_EXPORT_READY",
    userMessage: "Default. Create a new mastered copy and preserve the original.",
  },
  {
    id: "save_as_new_version",
    label: "Save as new version",
    default: false,
    destructive: false,
    diagnosticCode: "MASTERING_SAVED_AS_NEW_COPY",
    userMessage: "Add a version suffix when a mastered export already exists.",
  },
  {
    id: "overwrite_previous_mastered_export",
    label: "Overwrite previous mastered export",
    default: false,
    destructive: false,
    diagnosticCode: "MASTERING_OVERWRITE_BLOCKED",
    userMessage: "Only a previous mastered export can be replaced. The source audio is never overwritten.",
  },
  {
    id: "export_to_new_folder",
    label: "Export to new folder",
    default: false,
    destructive: false,
    diagnosticCode: "MASTERING_EXPORT_READY",
    userMessage: "Choose another writable output folder before running.",
  },
];

export const MASTERING_ANALYSIS_POLICY = {
  implementedMeasurements: ["duration", "sample rate", "channels", "file format", "file size", "sample peak dBFS"],
  notMeasuredUntilReviewed: ["integrated loudness / LUFS", "true peak / dBTP"],
  clippingWarningThresholdDbfs: -0.1,
  diagnosticCodes: [
    "MASTERING_ANALYSIS_NOT_STARTED",
    "MASTERING_ANALYSIS_RUNNING",
    "MASTERING_ANALYSIS_COMPLETE",
    "MASTERING_ANALYSIS_FAILED",
    "MASTERING_LOUDNESS_NOT_MEASURED",
    "MASTERING_CLIPPING_WARNING",
  ] as MasteringDiagnosticCode[],
} as const;

export const REFERENCE_MATCH_POLICY = {
  status: "planned",
  requiredStates: [
    "MATCHERING_REFERENCE_MISSING",
    "MATCHERING_BACKEND_NOT_CONFIGURED",
    "MATCHERING_READY",
    "MATCHERING_RUNNING",
    "MATCHERING_COMPLETE",
    "MATCHERING_FAILED",
    "MATCHERING_OUTPUT_NOT_VERIFIED",
  ] as MasteringDiagnosticCode[],
  userMessage: "Reference Match is planned and requires a verified Matchering-style backend. It must not fake a match.",
} as const;

export const BATCH_MASTERING_POLICY = {
  status: "planned_after_single_file_verified",
  rules: [
    "apply one mastering goal to selected files",
    "verify each output independently",
    "skip failed files without stopping the whole batch",
    "preserve every original file",
    "export a per-file report before calling the batch complete",
  ],
} as const;

export const CLOUD_MASTERING_POLICY = {
  enabledByDefault: false,
  userMessage: "Cloud mastering is disabled by default. Local audio is not uploaded by this workflow.",
} as const;

export function getMasteringChainPolicy(modeId: MasteringModeId): MasteringChainPolicy {
  return MASTERING_CHAIN_POLICIES.find((policy) => policy.chainId === modeId) ?? MASTERING_CHAIN_POLICIES[1];
}

export function buildMasteringChainRunPlan(modeId: MasteringModeId): string[] {
  return getMasteringChainPolicy(modeId).steps.map((step) => step.label);
}

export function evaluateMasteringChainReadiness(input: MasteringChainReadinessInput): MasteringChainReadiness {
  const policy = getMasteringChainPolicy(input.modeId);
  const blockers: MasteringDiagnosticCode[] = [];

  if (!input.inputFileSelected) blockers.push("MASTERING_INPUT_MISSING");
  if (!input.outputFolderSelected || !input.outputFolderWritable) blockers.push("MASTERING_OUTPUT_FOLDER_MISSING");
  if (!input.ffmpegReady) blockers.push("MASTERING_FFMPEG_MISSING");
  if (input.modeId === "reference_match" && !input.referenceFileSelected) {
    blockers.push("MATCHERING_REFERENCE_MISSING");
  }
  if (policy.requiredBackend === "matchering_optional_backend") {
    blockers.push("MATCHERING_BACKEND_NOT_CONFIGURED");
  }
  if (!input.analysisComplete && input.inputFileSelected && input.ffmpegReady) {
    blockers.push("MASTERING_ANALYSIS_NOT_STARTED");
  }

  if (blockers.length > 0) {
    return {
      status:
        policy.status === "planned_requires_backend" || blockers.includes("MATCHERING_BACKEND_NOT_CONFIGURED")
          ? "planned"
          : "blocked",
      diagnosticCode: blockers[0],
      blockers,
      userMessage:
        blockers[0] === "MASTERING_ANALYSIS_NOT_STARTED"
          ? "Analyze the input before exporting a mastered copy."
          : blockers[0] === "MASTERING_FFMPEG_MISSING"
            ? "FFmpeg is required for local analysis and export."
            : blockers[0] === "MATCHERING_BACKEND_NOT_CONFIGURED"
              ? "Reference Match is planned until a verified backend is configured."
              : "Select input audio, choose a writable output folder, and verify FFmpeg.",
    };
  }

  return {
    status: "ready",
    diagnosticCode: "MASTERING_READY",
    blockers: [],
    userMessage: "Ready to create a non-destructive mastered copy with FFmpeg.",
  };
}

export function masteringChainDoesNotAffectReleaseGate(): string {
  return MASTERING_PROOF_BOUNDARY;
}
