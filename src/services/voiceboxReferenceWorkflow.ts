export type VoiceboxCaptureSourceType =
  | "recording"
  | "imported_audio"
  | "imported_vtt"
  | "pasted_transcript"
  | "transcribed_file"
  | "prompt_workflow_output";

export type VoiceboxJobDiagnosticCode =
  | "JOB_QUEUED"
  | "JOB_RUNNING"
  | "JOB_COMPLETE"
  | "JOB_FAILED"
  | "JOB_CANCELED"
  | "JOB_RETRY_READY"
  | "JOB_STALE_RECOVERED"
  | "JOB_OUTPUT_NOT_VERIFIED";

export interface VoiceboxCaptureLedgerField {
  id: string;
  label: string;
  requiredForComplete: boolean;
  privacyNote: string;
}

export interface VoiceboxSttModelLane {
  id: "fast" | "balanced" | "accurate" | "maximum_accuracy";
  label: "Fast" | "Balanced" | "Accurate" | "Maximum Accuracy";
  whisperFamilyMapping: string[];
  speedEstimate: string;
  accuracyEstimate: string;
  languageSupport: string;
  cpuRecommendation: string;
  gpuRecommendation: string;
  readinessState: "missing_or_not_checked";
  verificationRequired: string[];
}

export interface VoiceboxLocalLlmRefinementMode {
  id: string;
  label: string;
  purpose: string;
  cloudEnabledByDefault: false;
  draftOnly: true;
  transcriptTextLoggedByDefault: false;
  readiness: "local_model_required";
}

export interface VoiceboxPostProcessingPreset {
  id: string;
  label: string;
  purpose: string;
  destructive: false;
  requiredVerification: string[];
  status: "planned_not_active" | "reference_only";
}

export const VOICEBOX_REFERENCE_POLICY = {
  repoUrl: "https://github.com/jamiepine/voicebox",
  repoPath: "C:\\Users\\trip3\\Downloads\\reference-repos\\voicebox",
  inspectedCommit: "b35b90961d5bc83a8b4e96e8b6ccde2a03152ff9",
  license: "MIT License",
  securityPolicy: "SECURITY.md present; supported version policy and private vulnerability email documented.",
  referenceOnly: true,
  copiedSourceFiles: [] as string[],
  adaptedConcepts: [
    "capture ledger for recordings, imports, transcripts, and prompt outputs",
    "simple STT model ladder",
    "serialized queue with retry, cancel, stale recovery, and output verification",
    "local LLM transcript cleanup modes",
    "non-destructive post-processing preset model",
    "recording and dictation readiness checks",
    "profile and preset management for repeatable workflows",
    "local API/MCP as a future disabled-by-default lane",
    "native process separation lessons without switching OpenStem away from Electron",
  ],
  rejectedConcepts: [
    "Voicebox branding or affiliation claims",
    "voice cloning as a default OpenStem feature",
    "global hotkeys or OS paste automation without separate approval",
    "remote API/MCP exposure by default",
    "cloud upload of audio or transcripts by default",
    "Tauri migration in this task",
    "using transcription, dictation, or effects as stem-separation proof",
  ],
} as const;

export const VOICEBOX_CAPTURE_LEDGER_FIELDS: VoiceboxCaptureLedgerField[] = [
  {
    id: "capture_id",
    label: "Capture ID",
    requiredForComplete: true,
    privacyNote: "Stable local identifier only; no transcript text in logs by default.",
  },
  {
    id: "source_type",
    label: "Source type",
    requiredForComplete: true,
    privacyNote: "Allowed values map to recording, imported audio, VTT, pasted transcript, transcription, and prompt output.",
  },
  {
    id: "original_file_path",
    label: "Original file path",
    requiredForComplete: false,
    privacyNote: "Preserve the original path locally; do not export it unless the user chooses.",
  },
  {
    id: "managed_local_path",
    label: "Managed local path",
    requiredForComplete: false,
    privacyNote: "Only set after a native copy/write is verified on disk.",
  },
  {
    id: "transcript_path",
    label: "Transcript path",
    requiredForComplete: false,
    privacyNote: "Store transcript file path, not transcript body, in metadata-only history.",
  },
  {
    id: "duration",
    label: "Duration",
    requiredForComplete: false,
    privacyNote: "Must come from decoder/probe metadata, not a placeholder.",
  },
  {
    id: "language",
    label: "Language",
    requiredForComplete: false,
    privacyNote: "Must come from the user choice or backend result.",
  },
  {
    id: "model_used",
    label: "Model used",
    requiredForComplete: false,
    privacyNote: "Model readiness and hash state stay separate from separator proof.",
  },
  {
    id: "status",
    label: "Status",
    requiredForComplete: true,
    privacyNote: "Complete requires verified artifacts, not optimistic UI state.",
  },
  {
    id: "retries",
    label: "Retries",
    requiredForComplete: false,
    privacyNote: "Retry metadata is safe; do not include transcript snippets in retry logs.",
  },
  {
    id: "errors",
    label: "Errors",
    requiredForComplete: false,
    privacyNote: "Use diagnostic codes; do not log transcript text by default.",
  },
  {
    id: "history_entry",
    label: "History entry",
    requiredForComplete: false,
    privacyNote: "Metadata-only is the default; full transcript history is opt-in.",
  },
  {
    id: "linked_exports",
    label: "Linked exports",
    requiredForComplete: false,
    privacyNote: "Every export path must pass native output verification before complete.",
  },
  {
    id: "linked_prompt_outputs",
    label: "Linked prompt outputs",
    requiredForComplete: false,
    privacyNote: "Prompt output is draft-only until reviewed and exported by a real writer.",
  },
];

export const VOICEBOX_CAPTURE_ACTIONS = [
  "replay source audio",
  "re-transcribe",
  "edit transcript inline",
  "rename speakers",
  "rename title/session",
  "send to prompt workflow",
  "export/archive",
  "regenerate output",
  "open folder",
] as const;

export const VOICEBOX_STT_MODEL_LADDER: VoiceboxSttModelLane[] = [
  {
    id: "fast",
    label: "Fast",
    whisperFamilyMapping: ["base", "base.en"],
    speedEstimate: "Fast local draft lane.",
    accuracyEstimate: "Good for quick review, not final clinical or legal use.",
    languageSupport: "English-optimized option plus multilingual base option.",
    cpuRecommendation: "CPU usable for short audio after backend is installed.",
    gpuRecommendation: "GPU optional.",
    readinessState: "missing_or_not_checked",
    verificationRequired: ["backend installed", "model file exists", "source/license documented", "hash checked when expected hash exists"],
  },
  {
    id: "balanced",
    label: "Balanced",
    whisperFamilyMapping: ["small", "small.en"],
    speedEstimate: "Balanced speed for everyday transcription.",
    accuracyEstimate: "Higher accuracy than Fast with moderate runtime cost.",
    languageSupport: "English-optimized option plus multilingual small option.",
    cpuRecommendation: "CPU usable but slower on long files.",
    gpuRecommendation: "GPU helpful for longer sessions.",
    readinessState: "missing_or_not_checked",
    verificationRequired: ["backend installed", "model file exists", "source/license documented", "hash checked when expected hash exists"],
  },
  {
    id: "accurate",
    label: "Accurate",
    whisperFamilyMapping: ["medium", "medium.en"],
    speedEstimate: "Slow on CPU.",
    accuracyEstimate: "High accuracy lane after hardware fit is checked.",
    languageSupport: "English-optimized option plus multilingual medium option.",
    cpuRecommendation: "CPU can be slow; warn before long jobs.",
    gpuRecommendation: "GPU recommended.",
    readinessState: "missing_or_not_checked",
    verificationRequired: ["backend installed", "model file exists", "source/license documented", "hash checked when expected hash exists"],
  },
  {
    id: "maximum_accuracy",
    label: "Maximum Accuracy",
    whisperFamilyMapping: ["large", "large-v3", "turbo"],
    speedEstimate: "Highest-cost lane; turbo may be faster when supported.",
    accuracyEstimate: "Best planned local transcription lane, still not separator proof.",
    languageSupport: "Large-family multilingual transcription; selected backend decides exact support.",
    cpuRecommendation: "CPU use may be impractical for long audio.",
    gpuRecommendation: "GPU strongly recommended.",
    readinessState: "missing_or_not_checked",
    verificationRequired: ["backend installed", "model file exists", "source/license documented", "hash checked when expected hash exists"],
  },
];

export const VOICEBOX_QUEUE_DIAGNOSTIC_CODES: VoiceboxJobDiagnosticCode[] = [
  "JOB_QUEUED",
  "JOB_RUNNING",
  "JOB_COMPLETE",
  "JOB_FAILED",
  "JOB_CANCELED",
  "JOB_RETRY_READY",
  "JOB_STALE_RECOVERED",
  "JOB_OUTPUT_NOT_VERIFIED",
];

export const VOICEBOX_QUEUE_TARGETS = [
  "transcription jobs",
  "normalization jobs",
  "VTT parsing jobs",
  "export jobs",
  "prompt workflow jobs",
  "mastering jobs",
] as const;

export const VOICEBOX_LOCAL_LLM_REFINEMENT_MODES: VoiceboxLocalLlmRefinementMode[] = [
  {
    id: "clean_transcript",
    label: "Clean transcript",
    purpose: "Remove obvious transcription artifacts while preserving meaning.",
    cloudEnabledByDefault: false,
    draftOnly: true,
    transcriptTextLoggedByDefault: false,
    readiness: "local_model_required",
  },
  {
    id: "preserve_technical_terms",
    label: "Preserve technical terms",
    purpose: "Prefer transcript corrections that keep domain-specific terms stable.",
    cloudEnabledByDefault: false,
    draftOnly: true,
    transcriptTextLoggedByDefault: false,
    readiness: "local_model_required",
  },
  {
    id: "remove_filler_words",
    label: "Remove filler words",
    purpose: "Create a cleaner draft for review without changing source transcript storage.",
    cloudEnabledByDefault: false,
    draftOnly: true,
    transcriptTextLoggedByDefault: false,
    readiness: "local_model_required",
  },
  {
    id: "format_into_prompt_workflow",
    label: "Format into prompt workflow",
    purpose: "Prepare transcript text for selected prompt sections.",
    cloudEnabledByDefault: false,
    draftOnly: true,
    transcriptTextLoggedByDefault: false,
    readiness: "local_model_required",
  },
  {
    id: "run_prompt_library",
    label: "Run prompt library",
    purpose: "Use the selected local prompt library after model readiness passes.",
    cloudEnabledByDefault: false,
    draftOnly: true,
    transcriptTextLoggedByDefault: false,
    readiness: "local_model_required",
  },
  {
    id: "rewrite_for_clarity",
    label: "Rewrite for clarity",
    purpose: "Create an optional reviewed draft, not a replacement for the original transcript.",
    cloudEnabledByDefault: false,
    draftOnly: true,
    transcriptTextLoggedByDefault: false,
    readiness: "local_model_required",
  },
];

export const VOICEBOX_POST_PROCESSING_PRESETS: VoiceboxPostProcessingPreset[] = [
  {
    id: "voice_cleanup",
    label: "Voice Cleanup",
    purpose: "Conservative speech cleanup before review, podcast export, or transcription.",
    destructive: false,
    requiredVerification: ["verified input audio", "backend ready", "output file exists", "output file size greater than 0"],
    status: "planned_not_active",
  },
  {
    id: "podcast_dialogue",
    label: "Podcast / Dialogue",
    purpose: "Level spoken audio for podcast, narration, or interview delivery.",
    destructive: false,
    requiredVerification: ["measured analysis where claimed", "native write verified", "output copy verified"],
    status: "planned_not_active",
  },
  {
    id: "gentle_mastering",
    label: "Gentle Mastering",
    purpose: "Create a lightly processed music copy while preserving source audio.",
    destructive: false,
    requiredVerification: ["FFmpeg or Web Audio backend ready", "source not overwritten", "output copy verified"],
    status: "planned_not_active",
  },
  {
    id: "ai_music_cleanup",
    label: "AI Music Cleanup",
    purpose: "Future artifact cleanup lane after measured processing exists.",
    destructive: false,
    requiredVerification: ["analysis values measured", "processing path implemented", "output copy verified"],
    status: "planned_not_active",
  },
  {
    id: "custom_preset",
    label: "Custom Preset",
    purpose: "User-defined chain after schema validation and output verification are implemented.",
    destructive: false,
    requiredVerification: ["chain schema validated", "backend declared", "output copy verified"],
    status: "planned_not_active",
  },
];

export const VOICEBOX_PEDALBOARD_REVIEW = {
  packageName: "pedalboard",
  upstreamSource: "https://github.com/spotify/pedalboard",
  license: "GPL-3.0 with statically included third-party components documented upstream",
  latestCheckedVersion: "0.9.23",
  latestWheelSizeRange: "about 2.4 MB to 5.2 MB per wheel on PyPI for version 0.9.23",
  usefulFor: ["gain", "compressor", "high-pass", "low-pass", "limiter", "reverb", "delay", "chorus", "pitch shift"],
  openStemDecision: "do_not_add_now",
  reason:
    "Useful effects model, but GPL/native packaging and cross-platform plugin behavior need an explicit license and release decision before dependency use.",
  optionalOnly: true,
  ffmpegInteraction: "Complementary for effects; FFmpeg remains the simpler first lane for decode/probe/encode and verified exports.",
} as const;

export const VOICEBOX_MIC_DICTATION_POLICY = {
  inAppMicRecording: "future_after_native_permission_and_file_verification",
  microphoneSelection: "future_required",
  recordingStatus: "status pill should reflect real permission, recording, saved, and verified states",
  transcriptStatus: "must be driven by native transcription result",
  captureHistory: "metadata-only by default",
  voiceCloningEnabledByDefault: false,
  globalHotkeysApproved: false,
  osPasteAutomationApproved: false,
} as const;

export const VOICEBOX_PROFILE_PRESET_TYPES = [
  "Session Transcription Profile",
  "Zoom VTT Intake Profile",
  "Podcast Notes Profile",
  "Clinical Draft Profile",
  "Music Mastering Profile",
  "Voice Cleanup Profile",
] as const;

export const VOICEBOX_API_MCP_POLICY = {
  status: "future_only",
  disabledByDefault: true,
  localhostOnlyIfImplemented: true,
  remoteApiByDefault: false,
  cloudUploadByDefault: false,
  phiUploadByDefault: false,
  implementationDecision: "Do not implement API or MCP in the Voicebox reference pass.",
} as const;

export const VOICEBOX_TAURI_ELECTRON_LESSONS = {
  voiceboxUsesTauri: true,
  openStemUsesElectron: true,
  switchFrameworkNow: false,
  usefulLesson:
    "Keep IPC narrow, use native helpers through controlled boundaries, and verify packaged runtime behavior instead of changing frameworks.",
  electronAcceptableWhen: [
    "preload surface is narrow",
    "native helper execution is controlled",
    "packaging is verified",
    "local files and output artifacts are checked by Electron/native code",
  ],
} as const;

export function voiceboxReferenceDoesNotAffectReleaseGate(): string {
  return "Voicebox-style captures, transcription, local LLM refinement, dictation, post-processing, profiles, API/MCP planning, and Tauri comparison do not approve Beta Candidate and do not satisfy OpenStem stem-separation proof.";
}
