export type AudioEffectChainId =
  | "voice_cleanup"
  | "gentle_master"
  | "streaming_ready"
  | "podcast_normalize"
  | "reference_match_prep"
  | "transcription_prep"
  | "custom_chain";

export type AudioEffectChainStatus = "planned_not_active" | "native_backend_required" | "ready";
export type AudioEffectBackendRequirement = "web_audio_or_ffmpeg" | "ffmpeg_required" | "native_writer_required";
export type AudioEffectChainStepStatus =
  | "planned"
  | "backend_required"
  | "analysis_required"
  | "output_verification_required";
export type AudioFormatStatus = "supported" | "ffmpeg_dependent" | "planned" | "unsupported" | "not_checked";
export type AudioFormatDirection = "input" | "output" | "input_output";

export type AudioEffectChainDiagnosticCode =
  | "CHAIN_INPUT_MISSING"
  | "CHAIN_OUTPUT_FOLDER_MISSING"
  | "CHAIN_BACKEND_NOT_IMPLEMENTED"
  | "CHAIN_FFMPEG_REQUIRED"
  | "CHAIN_ANALYSIS_NOT_MEASURED"
  | "CHAIN_OUTPUT_NOT_VERIFIED"
  | "CHAIN_READY";

export interface AudioEffectChainStep {
  id: string;
  label: string;
  purpose: string;
  status: AudioEffectChainStepStatus;
  requiresMeasurement: boolean;
  ffmpegDependent: boolean;
}

export interface AudioEffectChainPolicy {
  id: AudioEffectChainId;
  name: string;
  purpose: string;
  steps: AudioEffectChainStep[];
  requiredBackend: AudioEffectBackendRequirement;
  parameters: string[];
  inputRequirements: string[];
  outputArtifactType: "mastered_audio_copy" | "normalized_audio_copy" | "analysis_report" | "planned_chain";
  verificationRequirements: string[];
  destructive: false;
  proofBoundary: string;
  status: AudioEffectChainStatus;
  batchEligible: boolean;
  recordingApplicable: boolean;
}

export interface AudioEffectChainReadinessInput {
  chainId: AudioEffectChainId;
  inputVerified: boolean;
  outputFolderWritable: boolean;
  processingBackendReady: boolean;
  ffmpegReady: boolean;
  analysisMeasured: boolean;
}

export interface AudioEffectChainReadiness {
  status: "blocked" | "planned" | "ready";
  diagnosticCode: AudioEffectChainDiagnosticCode;
  blockers: AudioEffectChainDiagnosticCode[];
  userMessage: string;
}

export interface AudioFormatPolicy {
  id: string;
  label: string;
  extensions: string[];
  direction: AudioFormatDirection;
  status: AudioFormatStatus;
  ffmpegRequired: boolean;
  verificationRequired: string;
  userMessage: string;
}

const PROOF_BOUNDARY =
  "Effects chains, mastering, recording, and import/export are not AI stem-separation proof and do not approve Beta Candidate.";

const COMMON_VERIFICATION_REQUIREMENTS = [
  "processing returned success",
  "native write verified",
  "output file exists",
  "output file size is greater than 0",
  "expected extension matches",
  "output path is inside the selected output folder unless explicitly allowed",
  "before/after values are measured or shown as Not measured",
];

function step(
  id: string,
  label: string,
  purpose: string,
  status: AudioEffectChainStepStatus,
  options: { requiresMeasurement?: boolean; ffmpegDependent?: boolean } = {},
): AudioEffectChainStep {
  return {
    id,
    label,
    purpose,
    status,
    requiresMeasurement: options.requiresMeasurement ?? false,
    ffmpegDependent: options.ffmpegDependent ?? false,
  };
}

export const AUDACITY_REFERENCE_WORKFLOW_POLICY = {
  source: "https://github.com/audacity/audacity",
  referenceOnly: true,
  copiedSourceFiles: [] as string[],
  codeLicenseGuardrail:
    "Audacity is GPL-family licensed. OpenStem may adapt workflow concepts, but direct source copying requires an explicit license decision.",
  adaptedConcepts: [
    "recording/import/export as first-class workflows",
    "FFmpeg as an optional format-extension layer",
    "macros as reusable effect-chain inspiration",
    "analysis values must come from measurement",
    "history/recovery should preserve source audio",
  ],
} as const;

export const AUDIO_EFFECT_CHAINS: AudioEffectChainPolicy[] = [
  {
    id: "voice_cleanup",
    name: "Voice Cleanup",
    purpose: "Prepare spoken audio with conservative leveling before transcription, podcast export, or review.",
    steps: [
      step(
        "analyze_loudness",
        "Analyze loudness",
        "Measure existing loudness before changing audio.",
        "analysis_required",
        {
          requiresMeasurement: true,
        },
      ),
      step(
        "normalize_loudness",
        "Normalize loudness",
        "Create a leveled copy after measurements exist.",
        "backend_required",
      ),
      step("peak_limit", "Peak limit", "Prevent clipping in the exported copy.", "backend_required"),
      step(
        "export_copy",
        "Export copy",
        "Write a new output file without replacing the source.",
        "output_verification_required",
      ),
    ],
    requiredBackend: "web_audio_or_ffmpeg",
    parameters: ["targetLufs", "peakCeilingDb", "preserveDynamics", "outputFormat"],
    inputRequirements: ["verified local audio file", "writable output folder"],
    outputArtifactType: "normalized_audio_copy",
    verificationRequirements: COMMON_VERIFICATION_REQUIREMENTS,
    destructive: false,
    proofBoundary: PROOF_BOUNDARY,
    status: "planned_not_active",
    batchEligible: true,
    recordingApplicable: true,
  },
  {
    id: "gentle_master",
    name: "Gentle Master",
    purpose: "Apply light final polish while preserving dynamics and source character.",
    steps: [
      step("analyze_loudness", "Analyze loudness", "Measure input loudness and peak.", "analysis_required", {
        requiresMeasurement: true,
      }),
      step("normalize_loudness", "Normalize loudness", "Move toward a conservative target.", "backend_required"),
      step(
        "peak_limit",
        "Peak limit",
        "Use a safe peak ceiling only after real processing exists.",
        "backend_required",
      ),
      step(
        "export_copy",
        "Export copy",
        "Create a mastered copy with output verification.",
        "output_verification_required",
      ),
    ],
    requiredBackend: "web_audio_or_ffmpeg",
    parameters: ["targetLufs", "peakCeilingDb", "intensity", "outputFormat"],
    inputRequirements: ["verified local audio file", "writable output folder"],
    outputArtifactType: "mastered_audio_copy",
    verificationRequirements: COMMON_VERIFICATION_REQUIREMENTS,
    destructive: false,
    proofBoundary: PROOF_BOUNDARY,
    status: "planned_not_active",
    batchEligible: true,
    recordingApplicable: false,
  },
  {
    id: "streaming_ready",
    name: "Streaming Ready",
    purpose: "Prepare a measured final copy for common streaming loudness targets.",
    steps: [
      step("analyze_loudness", "Analyze loudness", "Measure input LUFS before processing.", "analysis_required", {
        requiresMeasurement: true,
      }),
      step("normalize_loudness", "Normalize loudness", "Target streaming-oriented loudness.", "backend_required"),
      step("peak_limit", "Peak limit", "Keep peaks below the selected ceiling.", "backend_required"),
      step(
        "export_format",
        "Export format",
        "Write WAV first; compressed formats depend on FFmpeg.",
        "output_verification_required",
        {
          ffmpegDependent: true,
        },
      ),
    ],
    requiredBackend: "web_audio_or_ffmpeg",
    parameters: ["targetLufs", "peakCeilingDb", "outputFormat", "codecSupport"],
    inputRequirements: ["verified local audio file", "writable output folder", "codec check for compressed export"],
    outputArtifactType: "mastered_audio_copy",
    verificationRequirements: COMMON_VERIFICATION_REQUIREMENTS,
    destructive: false,
    proofBoundary: PROOF_BOUNDARY,
    status: "planned_not_active",
    batchEligible: true,
    recordingApplicable: false,
  },
  {
    id: "podcast_normalize",
    name: "Podcast Normalize",
    purpose: "Create a speech-friendly normalized copy with measured loudness and clipping checks.",
    steps: [
      step("analyze_loudness", "Analyze loudness", "Measure input before normalization.", "analysis_required", {
        requiresMeasurement: true,
      }),
      step(
        "convert_mono_stereo",
        "Convert mono/stereo",
        "Optionally preserve or convert channel layout.",
        "backend_required",
        {
          ffmpegDependent: true,
        },
      ),
      step("normalize_loudness", "Normalize loudness", "Level the copy for speech delivery.", "backend_required"),
      step(
        "export_copy",
        "Export copy",
        "Verify the output file before marking complete.",
        "output_verification_required",
      ),
    ],
    requiredBackend: "ffmpeg_required",
    parameters: ["targetLufs", "peakCeilingDb", "channelMode", "outputFormat"],
    inputRequirements: ["verified local audio file", "writable output folder", "FFmpeg ready"],
    outputArtifactType: "normalized_audio_copy",
    verificationRequirements: COMMON_VERIFICATION_REQUIREMENTS,
    destructive: false,
    proofBoundary: PROOF_BOUNDARY,
    status: "planned_not_active",
    batchEligible: true,
    recordingApplicable: true,
  },
  {
    id: "reference_match_prep",
    name: "Reference Match Prep",
    purpose: "Prepare source and reference files for future measured reference matching.",
    steps: [
      step("analyze_loudness", "Analyze source", "Measure source file before comparison.", "analysis_required", {
        requiresMeasurement: true,
      }),
      step(
        "analyze_reference",
        "Analyze reference",
        "Measure the reference track; do not infer values.",
        "analysis_required",
        {
          requiresMeasurement: true,
        },
      ),
      step(
        "export_report",
        "Export report",
        "Create a report only after real analysis exists.",
        "output_verification_required",
      ),
    ],
    requiredBackend: "ffmpeg_required",
    parameters: ["referenceFile", "analysisOnly", "outputReportFormat"],
    inputRequirements: ["verified source audio", "verified reference audio", "writable output folder", "FFmpeg ready"],
    outputArtifactType: "analysis_report",
    verificationRequirements: [
      "source analysis measured",
      "reference analysis measured",
      "report output file exists",
      "report output file size is greater than 0",
    ],
    destructive: false,
    proofBoundary: PROOF_BOUNDARY,
    status: "planned_not_active",
    batchEligible: false,
    recordingApplicable: false,
  },
  {
    id: "transcription_prep",
    name: "Transcription Prep",
    purpose: "Create a clearer copy for speech-to-text without modifying the source recording.",
    steps: [
      step("trim_silence", "Trim silence", "Optional trim should create a copy only.", "backend_required", {
        ffmpegDependent: true,
      }),
      step(
        "convert_sample_rate",
        "Convert sample rate",
        "Use a transcription-friendly format when verified.",
        "backend_required",
        {
          ffmpegDependent: true,
        },
      ),
      step(
        "normalize_loudness",
        "Normalize loudness",
        "Make speech easier to transcribe after measurement.",
        "backend_required",
      ),
      step(
        "export_copy",
        "Export copy",
        "Verify saved copy before sending to transcription.",
        "output_verification_required",
      ),
    ],
    requiredBackend: "ffmpeg_required",
    parameters: ["targetSampleRate", "channelMode", "targetLufs", "outputFormat"],
    inputRequirements: ["verified local audio file", "writable output folder", "FFmpeg ready"],
    outputArtifactType: "normalized_audio_copy",
    verificationRequirements: COMMON_VERIFICATION_REQUIREMENTS,
    destructive: false,
    proofBoundary: PROOF_BOUNDARY,
    status: "planned_not_active",
    batchEligible: true,
    recordingApplicable: true,
  },
  {
    id: "custom_chain",
    name: "Custom Chain",
    purpose: "Future user-defined chain assembled from verified, recoverable steps.",
    steps: [
      step("choose_steps", "Choose steps", "User-defined steps require schema validation.", "planned"),
      step("validate_chain", "Validate chain", "Each step must declare backend and verification needs.", "planned"),
      step(
        "export_copy",
        "Export copy",
        "Output still requires verified native file creation.",
        "output_verification_required",
      ),
    ],
    requiredBackend: "native_writer_required",
    parameters: ["chainJson", "overwritePolicy", "outputFormat"],
    inputRequirements: ["validated chain schema", "verified local audio file", "writable output folder"],
    outputArtifactType: "planned_chain",
    verificationRequirements: COMMON_VERIFICATION_REQUIREMENTS,
    destructive: false,
    proofBoundary: PROOF_BOUNDARY,
    status: "planned_not_active",
    batchEligible: false,
    recordingApplicable: false,
  },
];

export const AUDIO_EFFECT_CHAIN_RUN_PLAN = [
  "Input audio",
  "Analyze",
  "Apply chain",
  "Export copy",
  "Verify output",
  "Show report",
] as const;

export const AUDIO_FORMAT_SUPPORT_MATRIX: AudioFormatPolicy[] = [
  {
    id: "wav_input",
    label: "WAV input",
    extensions: [".wav"],
    direction: "input",
    status: "not_checked",
    ffmpegRequired: false,
    verificationRequired: "native input file check and decoder probe",
    userMessage: "WAV is the first expected local input lane, but this build has not run a decoder probe.",
  },
  {
    id: "wav_output",
    label: "WAV output",
    extensions: [".wav"],
    direction: "output",
    status: "planned",
    ffmpegRequired: false,
    verificationRequired: "native writer success plus file exists and size > 0",
    userMessage: "WAV is the first planned output target. It is not complete until native write verification passes.",
  },
  {
    id: "flac_input_output",
    label: "FLAC input/output",
    extensions: [".flac"],
    direction: "input_output",
    status: "ffmpeg_dependent",
    ffmpegRequired: true,
    verificationRequired: "selected FFmpeg build must prove decode/encode support",
    userMessage: "FLAC support depends on the selected FFmpeg build and output verification.",
  },
  {
    id: "mp3_input_output",
    label: "MP3 input/output",
    extensions: [".mp3"],
    direction: "input_output",
    status: "ffmpeg_dependent",
    ffmpegRequired: true,
    verificationRequired: "selected FFmpeg build must prove decode/encode support",
    userMessage: "MP3 is lossy and FFmpeg-dependent; codec support is not assumed.",
  },
  {
    id: "m4a_aac_input_output",
    label: "M4A/AAC input/output",
    extensions: [".m4a", ".aac"],
    direction: "input_output",
    status: "ffmpeg_dependent",
    ffmpegRequired: true,
    verificationRequired: "selected FFmpeg build must prove decode/encode support",
    userMessage: "AAC/M4A support depends on the selected FFmpeg build.",
  },
  {
    id: "ogg_opus_input_output",
    label: "OGG/OPUS input/output",
    extensions: [".ogg", ".opus"],
    direction: "input_output",
    status: "ffmpeg_dependent",
    ffmpegRequired: true,
    verificationRequired: "selected FFmpeg build must prove decode/encode support",
    userMessage: "OGG/OPUS support depends on the selected FFmpeg build.",
  },
  {
    id: "aiff_input_output",
    label: "AIFF input/output",
    extensions: [".aiff", ".aif"],
    direction: "input_output",
    status: "ffmpeg_dependent",
    ffmpegRequired: true,
    verificationRequired: "selected FFmpeg build must prove decode/encode support",
    userMessage: "AIFF support is FFmpeg-dependent until a local codec check passes.",
  },
  {
    id: "wma_input",
    label: "WMA input",
    extensions: [".wma"],
    direction: "input",
    status: "ffmpeg_dependent",
    ffmpegRequired: true,
    verificationRequired: "selected FFmpeg build must prove decode support",
    userMessage: "WMA import is FFmpeg-dependent and may not be available in every build.",
  },
  {
    id: "mp4_mov_audio_input",
    label: "MP4/MOV audio input",
    extensions: [".mp4", ".mov"],
    direction: "input",
    status: "ffmpeg_dependent",
    ffmpegRequired: true,
    verificationRequired: "selected FFmpeg build must prove audio stream decode support",
    userMessage: "Video-container audio import depends on FFmpeg stream probing and decode support.",
  },
];

export function getAudioEffectChain(chainId: AudioEffectChainId): AudioEffectChainPolicy {
  return AUDIO_EFFECT_CHAINS.find((chain) => chain.id === chainId) ?? AUDIO_EFFECT_CHAINS[1];
}

export function buildAudioEffectChainRunPlan(chainId: AudioEffectChainId): string[] {
  const chain = getAudioEffectChain(chainId);
  return AUDIO_EFFECT_CHAIN_RUN_PLAN.map((stage) => (stage === "Apply chain" ? `${stage}: ${chain.name}` : stage));
}

export function evaluateAudioEffectChainReadiness(input: AudioEffectChainReadinessInput): AudioEffectChainReadiness {
  const chain = getAudioEffectChain(input.chainId);
  const blockers: AudioEffectChainDiagnosticCode[] = [];

  if (!input.inputVerified) blockers.push("CHAIN_INPUT_MISSING");
  if (!input.outputFolderWritable) blockers.push("CHAIN_OUTPUT_FOLDER_MISSING");
  if (chain.requiredBackend === "ffmpeg_required" && !input.ffmpegReady) blockers.push("CHAIN_FFMPEG_REQUIRED");
  if (!input.processingBackendReady) blockers.push("CHAIN_BACKEND_NOT_IMPLEMENTED");
  if (!input.analysisMeasured && chain.steps.some((item) => item.requiresMeasurement)) {
    blockers.push("CHAIN_ANALYSIS_NOT_MEASURED");
  }

  if (blockers.length > 0) {
    return {
      status: blockers.includes("CHAIN_BACKEND_NOT_IMPLEMENTED") ? "planned" : "blocked",
      diagnosticCode: blockers[0],
      blockers,
      userMessage:
        blockers[0] === "CHAIN_BACKEND_NOT_IMPLEMENTED"
          ? "Effects chains are planned until real Web Audio or FFmpeg processing is wired and verified."
          : "Select verified input audio, choose a writable output folder, measure required values, and verify the backend.",
    };
  }

  return {
    status: "ready",
    diagnosticCode: "CHAIN_READY",
    blockers: [],
    userMessage: "Chain can run only after its real processing path is verified.",
  };
}

export function getAudioFormatPolicy(formatId: string): AudioFormatPolicy | null {
  return AUDIO_FORMAT_SUPPORT_MATRIX.find((format) => format.id === formatId) ?? null;
}

export function audioEffectChainsDoNotAffectReleaseGate(): string {
  return PROOF_BOUNDARY;
}
