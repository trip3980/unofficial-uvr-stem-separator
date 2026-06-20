import type { TranscriptionExportFormat } from "../types";
import {
  TRANSCRIPT_DOCX_EXPORT_TEMPLATE,
  TRANSCRIPT_JSON_EXPORT_TEMPLATE,
  TRANSCRIPT_PDF_EXPORT_TEMPLATE,
  TRANSCRIPT_TXT_EXPORT_TEMPLATE,
  VTT_ARCHIVE_FILENAME_TEMPLATE,
  buildTranscriptionFilenamePreview,
} from "./transcriptionFilenamePolicy";

export type VttImportState =
  | "VTT_FILE_MISSING"
  | "VTT_PARSE_READY"
  | "VTT_PARSE_FAILED"
  | "VTT_IMPORTED"
  | "VTT_SPEAKERS_DETECTED"
  | "VTT_NO_SPEAKERS_DETECTED"
  | "VTT_ARCHIVE_READY"
  | "VTT_ARCHIVE_WRITTEN"
  | "VTT_ARCHIVE_FAILED";

export type RecordingIntakeState =
  | "MIC_PERMISSION_NEEDED"
  | "MIC_PERMISSION_DENIED"
  | "MIC_INPUTS_AVAILABLE"
  | "MIC_INPUT_NOT_SELECTED"
  | "RECORDING_READY"
  | "RECORDING_RUNNING"
  | "RECORDING_STOPPED"
  | "RECORDING_FAILED"
  | "RECORDING_OUTPUT_NOT_VERIFIED";

export type NormalizerState =
  | "NORMALIZER_NOT_AVAILABLE"
  | "NORMALIZER_FFMPEG_MISSING"
  | "NORMALIZER_READY"
  | "NORMALIZATION_RUNNING"
  | "NORMALIZATION_COMPLETE"
  | "NORMALIZED_OUTPUT_NOT_VERIFIED"
  | "NORMALIZATION_FAILED";

export type TranscriptArchiveExportState =
  | "ARCHIVE_EXPORT_READY"
  | "ARCHIVE_EXPORT_RUNNING"
  | "ARCHIVE_EXPORT_COMPLETE"
  | "ARCHIVE_EXPORT_PARTIAL"
  | "ARCHIVE_EXPORT_FAILED"
  | "EXPORT_OUTPUT_NOT_VERIFIED"
  | "EXPORT_OUTPUT_ZERO_BYTES";

export type SpeakerRenameState =
  | "SPEAKER_LABELS_DETECTED"
  | "SPEAKER_RENAME_READY"
  | "SPEAKER_RENAME_APPLIED"
  | "SPEAKER_RENAME_RESET"
  | "SPEAKER_LABELS_NOT_FOUND";

export interface TranscriptionIntakeFolderPolicy {
  id:
    | "in_session_recordings"
    | "imported_audio_sessions"
    | "imported_vtt_transcripts"
    | "renamed_transcript_archive"
    | "exported_pdfs"
    | "exported_word_documents"
    | "exported_text_json_subtitles";
  label: string;
  logicalPath: string;
  missingCode:
    | "RECORDING_FOLDER_MISSING"
    | "IMPORT_AUDIO_FOLDER_MISSING"
    | "VTT_SOURCE_FOLDER_MISSING"
    | "ARCHIVE_FOLDER_MISSING"
    | "EXPORT_FOLDER_MISSING";
  notWritableCode:
    | "RECORDING_FOLDER_NOT_WRITABLE"
    | "IMPORT_AUDIO_FOLDER_NOT_WRITABLE"
    | "ARCHIVE_FOLDER_NOT_WRITABLE"
    | "EXPORT_FOLDER_NOT_WRITABLE";
  userCanChange: boolean;
  createsFilesOnlyAfterNativeVerification: boolean;
}

export interface RecordingQualityPreset {
  id: "low" | "medium" | "high";
  label: "Low" | "Medium" | "High";
  fileSize: string;
  intent: string;
  implementationNote: string;
}

export interface VttTranscriptSegment {
  id: string;
  cueIndex: number;
  start: string;
  end: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
  originalText: string;
  speakerLabel?: string;
  originalSpeakerLabel?: string;
}

export interface VttParseResult {
  ok: boolean;
  status: VttImportState;
  speakerStatus: Extract<VttImportState, "VTT_SPEAKERS_DETECTED" | "VTT_NO_SPEAKERS_DETECTED">;
  sourcePath: string;
  segments: VttTranscriptSegment[];
  speakers: string[];
  errors: string[];
  message: string;
}

export interface SpeakerRenameEntry {
  originalLabel: string;
  displayName: string;
  modified: boolean;
}

export interface SpeakerRenameResult {
  state: SpeakerRenameState;
  segments: VttTranscriptSegment[];
  speakerMap: SpeakerRenameEntry[];
  message: string;
}

export interface TranscriptArchiveExportPlanInput {
  title: string;
  sessionNumber: string;
  date: string;
  durationMin: number | string;
  durationHhmmss?: string;
  sourceBasename?: string;
  transcriptId?: string;
  folder?: string;
  speakerCount: number;
  existingFilenames?: string[];
}

export interface TranscriptArchiveExportItem {
  format: TranscriptionExportFormat;
  label: string;
  filename: string;
  status: "native_writer_required" | "planned_not_active";
  verificationRule: string;
}

export interface TranscriptArchiveExportPlan {
  state: TranscriptArchiveExportState;
  autoExportAfterRename: false;
  keepOriginalVtt: true;
  overwriteOriginalVtt: false;
  sourceFilesDeletedByDefault: false;
  outputs: TranscriptArchiveExportItem[];
  message: string;
}

export interface TranscriptExportVerificationInput {
  path: string;
  exists: boolean;
  sizeBytes: number;
}

export const TRANSCRIPTION_INTAKE_FOLDER_POLICY: TranscriptionIntakeFolderPolicy[] = [
  {
    id: "in_session_recordings",
    label: "In-Session Recordings",
    logicalPath: "{userData}/OpenStem/Transcription/In-Session Recordings",
    missingCode: "RECORDING_FOLDER_MISSING",
    notWritableCode: "RECORDING_FOLDER_NOT_WRITABLE",
    userCanChange: true,
    createsFilesOnlyAfterNativeVerification: true,
  },
  {
    id: "imported_audio_sessions",
    label: "Imported Audio Sessions",
    logicalPath: "{userData}/OpenStem/Transcription/Imported Audio Sessions",
    missingCode: "IMPORT_AUDIO_FOLDER_MISSING",
    notWritableCode: "IMPORT_AUDIO_FOLDER_NOT_WRITABLE",
    userCanChange: true,
    createsFilesOnlyAfterNativeVerification: true,
  },
  {
    id: "imported_vtt_transcripts",
    label: "Imported VTT Transcripts",
    logicalPath: "{userData}/OpenStem/Transcription/Imported VTT Transcripts",
    missingCode: "VTT_SOURCE_FOLDER_MISSING",
    notWritableCode: "IMPORT_AUDIO_FOLDER_NOT_WRITABLE",
    userCanChange: true,
    createsFilesOnlyAfterNativeVerification: true,
  },
  {
    id: "renamed_transcript_archive",
    label: "Renamed Transcript Archive",
    logicalPath: "{userData}/OpenStem/Transcription/Renamed Transcript Archive",
    missingCode: "ARCHIVE_FOLDER_MISSING",
    notWritableCode: "ARCHIVE_FOLDER_NOT_WRITABLE",
    userCanChange: true,
    createsFilesOnlyAfterNativeVerification: true,
  },
  {
    id: "exported_pdfs",
    label: "Exported PDFs",
    logicalPath: "{userData}/OpenStem/Transcription/Exports/PDF",
    missingCode: "EXPORT_FOLDER_MISSING",
    notWritableCode: "EXPORT_FOLDER_NOT_WRITABLE",
    userCanChange: true,
    createsFilesOnlyAfterNativeVerification: true,
  },
  {
    id: "exported_word_documents",
    label: "Exported Word Documents",
    logicalPath: "{userData}/OpenStem/Transcription/Exports/DOCX",
    missingCode: "EXPORT_FOLDER_MISSING",
    notWritableCode: "EXPORT_FOLDER_NOT_WRITABLE",
    userCanChange: true,
    createsFilesOnlyAfterNativeVerification: true,
  },
  {
    id: "exported_text_json_subtitles",
    label: "Exported TXT/JSON/SRT/VTT",
    logicalPath: "{userData}/OpenStem/Transcription/Exports/TXT-JSON-SRT-VTT",
    missingCode: "EXPORT_FOLDER_MISSING",
    notWritableCode: "EXPORT_FOLDER_NOT_WRITABLE",
    userCanChange: true,
    createsFilesOnlyAfterNativeVerification: true,
  },
];

export const RECORDING_QUALITY_PRESETS: RecordingQualityPreset[] = [
  {
    id: "low",
    label: "Low",
    fileSize: "Small file",
    intent: "Speech-first intake for notes and quick review.",
    implementationNote: "Codec and sample-rate control depend on MediaRecorder and native save support.",
  },
  {
    id: "medium",
    label: "Medium",
    fileSize: "Balanced file",
    intent: "Default voice capture target for transcription preparation.",
    implementationNote: "This is a planning preset until recording output is verified on disk.",
  },
  {
    id: "high",
    label: "High",
    fileSize: "Larger file",
    intent: "Preserve more source detail before local transcription or normalization.",
    implementationNote: "Do not promise WAV unless FFmpeg conversion and output verification pass.",
  },
];

export const TRANSCRIPTION_INTAKE_DIAGNOSTIC_CODES = [
  "RECORDING_FOLDER_MISSING",
  "RECORDING_FOLDER_NOT_WRITABLE",
  "IMPORT_AUDIO_FOLDER_MISSING",
  "IMPORT_AUDIO_FOLDER_NOT_WRITABLE",
  "VTT_SOURCE_FOLDER_MISSING",
  "ARCHIVE_FOLDER_MISSING",
  "ARCHIVE_FOLDER_NOT_WRITABLE",
  "EXPORT_FOLDER_MISSING",
  "EXPORT_FOLDER_NOT_WRITABLE",
  "MIC_PERMISSION_NEEDED",
  "MIC_PERMISSION_DENIED",
  "MIC_INPUT_NOT_SELECTED",
  "RECORDING_OUTPUT_NOT_VERIFIED",
  "NORMALIZER_FFMPEG_MISSING",
  "NORMALIZED_OUTPUT_NOT_VERIFIED",
  "VTT_FILE_MISSING",
  "VTT_PARSE_FAILED",
  "VTT_IMPORTED",
  "VTT_SPEAKERS_DETECTED",
  "VTT_NO_SPEAKERS_DETECTED",
  "SPEAKER_LABELS_DETECTED",
  "SPEAKER_RENAME_READY",
  "SPEAKER_RENAME_APPLIED",
  "SPEAKER_RENAME_RESET",
  "SPEAKER_LABELS_NOT_FOUND",
  "ARCHIVE_EXPORT_READY",
  "ARCHIVE_EXPORT_RUNNING",
  "ARCHIVE_EXPORT_COMPLETE",
  "ARCHIVE_EXPORT_PARTIAL",
  "ARCHIVE_EXPORT_FAILED",
  "EXPORT_OUTPUT_NOT_VERIFIED",
  "EXPORT_OUTPUT_ZERO_BYTES",
] as const;

export const TRANSCRIPT_ARCHIVE_EXPORT_POLICY = {
  autoExportAfterRename: false,
  keepOriginalVtt: true,
  overwriteOriginalVtt: false,
  sourceFilesDeletedByDefault: false,
  txtJsonVttStatus: "native_writer_required",
  pdfStatus: "planned_not_active",
  docxStatus: "planned_not_active",
  successRule: "Export success requires a native write result plus path existence and nonzero size.",
} as const;

export const SYNTHETIC_VTT_FIXTURE = `WEBVTT

00:00:01.000 --> 00:00:04.000
Speaker 1: Welcome to the local transcript intake test.

00:00:04.500 --> 00:00:08.000
Speaker 2: This synthetic fixture contains no private transcript text.
`;

const TIMESTAMP_LINE_PATTERN = /^(.+?)\s+-->\s+(.+?)(?:\s+.*)?$/;
const VOICE_TAG_PATTERN = /<v(?:\.[^\s>]+)?\s+([^>]+)>/i;
const SPEAKER_PREFIX_PATTERN = /^([A-Za-z][A-Za-z0-9 ._'()&-]{0,48}):\s+(.+)$/;

export function parseVttTranscriptContent(content: string, sourcePath = "browser-selected.vtt"): VttParseResult {
  const normalized = normalizeVttContent(content);
  if (!normalized.trim()) {
    return createVttParseFailure("VTT_FILE_MISSING", sourcePath, "No VTT text was provided for local parsing.");
  }

  const firstNonEmptyLine = normalized
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstNonEmptyLine?.startsWith("WEBVTT")) {
    return createVttParseFailure("VTT_PARSE_FAILED", sourcePath, "VTT import requires a WEBVTT file signature.");
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const segments: VttTranscriptSegment[] = [];
  const errors: string[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0 || lines[0].startsWith("WEBVTT") || isNonCueBlock(lines[0])) {
      continue;
    }

    const timestampLineIndex = findTimestampLineIndex(lines);
    if (timestampLineIndex < 0) {
      errors.push(`Skipped non-cue block ${segments.length + errors.length + 1}.`);
      continue;
    }

    const timestampMatch = lines[timestampLineIndex].match(TIMESTAMP_LINE_PATTERN);
    if (!timestampMatch) {
      errors.push(`Skipped malformed timestamp in block ${segments.length + errors.length + 1}.`);
      continue;
    }

    const start = sanitizeTimestampText(timestampMatch[1]);
    const end = sanitizeTimestampText(timestampMatch[2]);
    const startSeconds = parseTimestampToSeconds(start);
    const endSeconds = parseTimestampToSeconds(end);
    const textLines = lines.slice(timestampLineIndex + 1);
    const joinedText = textLines.join(" ").trim();
    const parsedText = extractSpeakerAndText(joinedText);

    if (!joinedText || !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
      errors.push(`Skipped empty or invalid cue ${segments.length + errors.length + 1}.`);
      continue;
    }

    segments.push({
      id: `cue-${String(segments.length + 1).padStart(3, "0")}`,
      cueIndex: segments.length + 1,
      start,
      end,
      startSeconds,
      endSeconds,
      text: parsedText.text,
      originalText: joinedText,
      speakerLabel: parsedText.speakerLabel,
      originalSpeakerLabel: parsedText.speakerLabel,
    });
  }

  if (segments.length === 0) {
    return {
      ok: false,
      status: "VTT_PARSE_FAILED",
      speakerStatus: "VTT_NO_SPEAKERS_DETECTED",
      sourcePath,
      segments: [],
      speakers: [],
      errors: errors.length > 0 ? errors : ["No valid VTT cues were found."],
      message: "VTT parsing failed. No valid timestamped cues were found.",
    };
  }

  const speakers = getDetectedVttSpeakers(segments);
  return {
    ok: true,
    status: "VTT_IMPORTED",
    speakerStatus: speakers.length > 0 ? "VTT_SPEAKERS_DETECTED" : "VTT_NO_SPEAKERS_DETECTED",
    sourcePath,
    segments,
    speakers,
    errors,
    message:
      speakers.length > 0
        ? "VTT imported locally. Speaker labels were detected from cue text."
        : "VTT imported locally. No speaker labels were detected.",
  };
}

export function getDetectedVttSpeakers(segments: VttTranscriptSegment[]): string[] {
  const speakers = new Set<string>();
  for (const segment of segments) {
    if (segment.speakerLabel) {
      speakers.add(segment.speakerLabel);
    }
  }
  return [...speakers].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function buildSpeakerRenameMap(
  speakers: string[],
  overrides: Record<string, string> = {},
): SpeakerRenameEntry[] {
  return speakers.map((speaker) => {
    const displayName = sanitizeSpeakerDisplayName(overrides[speaker] ?? speaker);
    return {
      originalLabel: speaker,
      displayName,
      modified: displayName !== speaker,
    };
  });
}

export function applySpeakerRenameMap(
  segments: VttTranscriptSegment[],
  speakerMap: SpeakerRenameEntry[],
): SpeakerRenameResult {
  if (speakerMap.length === 0) {
    return {
      state: "SPEAKER_LABELS_NOT_FOUND",
      segments,
      speakerMap,
      message: "No speaker labels were found. Speaker rename cannot imply diarization.",
    };
  }

  const lookup = new Map(speakerMap.map((entry) => [entry.originalLabel, entry.displayName]));
  const renamedSegments = segments.map((segment) => {
    if (!segment.speakerLabel) {
      return segment;
    }
    const displayName = lookup.get(segment.originalSpeakerLabel ?? segment.speakerLabel) ?? segment.speakerLabel;
    return {
      ...segment,
      speakerLabel: displayName,
    };
  });

  const modified = speakerMap.some((entry) => entry.modified);
  return {
    state: modified ? "SPEAKER_RENAME_APPLIED" : "SPEAKER_RENAME_READY",
    segments: renamedSegments,
    speakerMap,
    message: modified
      ? "Speaker rename applied to labels only. No diarization was inferred or changed."
      : "Speaker labels are ready to rename. Existing labels remain unchanged.",
  };
}

export function segmentsToCleanTranscript(
  segments: VttTranscriptSegment[],
  options: { includeTimestamps?: boolean; includeSpeakers?: boolean } = {},
): string {
  return segments
    .map((segment) => {
      const parts: string[] = [];
      if (options.includeTimestamps) {
        parts.push(`[${segment.start} - ${segment.end}]`);
      }
      if (options.includeSpeakers && segment.speakerLabel) {
        parts.push(`${segment.speakerLabel}:`);
      }
      parts.push(segment.text);
      return parts.join(" ");
    })
    .join("\n");
}

export function segmentsToRenamedVttContent(segments: VttTranscriptSegment[]): string {
  const cueBlocks = segments.map((segment) => {
    const label = segment.speakerLabel ? `${segment.speakerLabel}: ` : "";
    return `${segment.start} --> ${segment.end}\n${label}${segment.text}`;
  });
  return ["WEBVTT", ...cueBlocks].join("\n\n") + "\n";
}

export function segmentsToJsonArchive(
  segments: VttTranscriptSegment[],
  speakerMap: SpeakerRenameEntry[],
  metadata: { title: string; sourcePath?: string },
): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      generatedBy: "OpenStem AI Audio Workstation",
      proofBoundary: vttWorkflowDoesNotAffectReleaseGate(),
      title: metadata.title,
      sourcePath: metadata.sourcePath,
      speakerMap,
      segments,
    },
    null,
    2,
  );
}

export function buildTranscriptArchiveExportPlan(
  input: TranscriptArchiveExportPlanInput,
): TranscriptArchiveExportPlan {
  const outputs: TranscriptArchiveExportItem[] = [
    buildExportItem(input, "vtt", "Renamed VTT archive", VTT_ARCHIVE_FILENAME_TEMPLATE, "native_writer_required"),
    buildExportItem(input, "txt", "Clean TXT transcript", TRANSCRIPT_TXT_EXPORT_TEMPLATE, "native_writer_required"),
    buildExportItem(input, "json", "JSON metadata archive", TRANSCRIPT_JSON_EXPORT_TEMPLATE, "native_writer_required"),
    buildExportItem(input, "pdf", "PDF transcript", TRANSCRIPT_PDF_EXPORT_TEMPLATE, "planned_not_active"),
    buildExportItem(input, "docx", "Word document", TRANSCRIPT_DOCX_EXPORT_TEMPLATE, "planned_not_active"),
  ];

  return {
    state: "ARCHIVE_EXPORT_READY",
    autoExportAfterRename: false,
    keepOriginalVtt: true,
    overwriteOriginalVtt: false,
    sourceFilesDeletedByDefault: false,
    outputs,
    message:
      "Archive/export is ready to hand to native Electron writers. No file is complete until it exists and has nonzero size.",
  };
}

export function verifyTranscriptExportResult(input: TranscriptExportVerificationInput): {
  ok: boolean;
  state: TranscriptArchiveExportState;
  message: string;
} {
  if (!input.path || !input.exists) {
    return {
      ok: false,
      state: "EXPORT_OUTPUT_NOT_VERIFIED",
      message: "Export output was not verified on disk.",
    };
  }

  if (input.sizeBytes <= 0) {
    return {
      ok: false,
      state: "EXPORT_OUTPUT_ZERO_BYTES",
      message: "Export output exists but is zero bytes.",
    };
  }

  return {
    ok: true,
    state: "ARCHIVE_EXPORT_COMPLETE",
    message: "Export output exists and has nonzero size.",
  };
}

export function vttWorkflowDoesNotAffectReleaseGate(): string {
  return "This recording, VTT import, speaker rename, and transcript export workflow is not stem separation proof and does not approve Beta Candidate; Beta status is governed by separator proof evidence and final release checklist review.";
}

function buildExportItem(
  input: TranscriptArchiveExportPlanInput,
  format: TranscriptionExportFormat,
  label: string,
  template: string,
  status: TranscriptArchiveExportItem["status"],
): TranscriptArchiveExportItem {
  const preview = buildTranscriptionFilenamePreview({
    template,
    title: input.title,
    sessionNumber: input.sessionNumber,
    date: input.date,
    durationMin: input.durationMin,
    durationHhmmss: input.durationHhmmss,
    sourceBasename: input.sourceBasename,
    transcriptId: input.transcriptId,
    folder: input.folder,
    speakerCount: input.speakerCount,
    format,
    existingFilenames: input.existingFilenames,
  });

  return {
    format,
    label,
    filename: preview.filename,
    status,
    verificationRule: "Native write must return a path, then path exists and size is greater than 0.",
  };
}

function createVttParseFailure(status: Extract<VttImportState, "VTT_FILE_MISSING" | "VTT_PARSE_FAILED">, sourcePath: string, message: string): VttParseResult {
  return {
    ok: false,
    status,
    speakerStatus: "VTT_NO_SPEAKERS_DETECTED",
    sourcePath,
    segments: [],
    speakers: [],
    errors: [message],
    message,
  };
}

function normalizeVttContent(content: string): string {
  return String(content ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function isNonCueBlock(firstLine: string): boolean {
  return firstLine.startsWith("NOTE") || firstLine.startsWith("STYLE") || firstLine.startsWith("REGION");
}

function findTimestampLineIndex(lines: string[]): number {
  return lines.findIndex((line) => TIMESTAMP_LINE_PATTERN.test(line));
}

function sanitizeTimestampText(value: string): string {
  return value.trim().split(/\s+/)[0].replace(",", ".");
}

function parseTimestampToSeconds(value: string): number {
  const normalized = sanitizeTimestampText(value);
  const parts = normalized.split(":");
  const secondsPart = parts.at(-1) ?? "0";
  const seconds = Number(secondsPart);
  const minutes = Number(parts.at(-2) ?? "0");
  const hours = Number(parts.at(-3) ?? "0");
  if (![seconds, minutes, hours].every(Number.isFinite)) {
    return Number.NaN;
  }
  return hours * 3600 + minutes * 60 + seconds;
}

function extractSpeakerAndText(rawText: string): { speakerLabel?: string; text: string } {
  const voiceMatch = rawText.match(VOICE_TAG_PATTERN);
  const withoutTags = decodeVttEntities(
    rawText
      .replace(/<\d{2}:\d{2}(?::\d{2})?\.\d{3}>/g, "")
      .replace(/<\/?[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
  const prefixMatch = withoutTags.match(SPEAKER_PREFIX_PATTERN);

  if (prefixMatch) {
    return {
      speakerLabel: sanitizeSpeakerDisplayName(prefixMatch[1]),
      text: prefixMatch[2].trim(),
    };
  }

  if (voiceMatch) {
    return {
      speakerLabel: sanitizeSpeakerDisplayName(voiceMatch[1]),
      text: withoutTags,
    };
  }

  return { text: withoutTags };
}

function sanitizeSpeakerDisplayName(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[<>:"/\\|?*]/g, "")
    .slice(0, 64);
}

function decodeVttEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
