import type { TranscriptionExportFormat, WhisperModelSize } from "../types";

export const DEFAULT_TRANSCRIPTION_FILENAME_TEMPLATE =
  "{safe_title}_session_number_{session_number}_{date}_{duration_min}_min.pdf";

export const VTT_ARCHIVE_FILENAME_TEMPLATE =
  "{safe_title}_session_{session_number}_{date}_{duration_min}_min_renamed.vtt";

export const TRANSCRIPT_PDF_EXPORT_TEMPLATE = "{safe_title}_session_{session_number}_{date}_{duration_min}_min.pdf";

export const TRANSCRIPT_DOCX_EXPORT_TEMPLATE = "{safe_title}_session_{session_number}_{date}_{duration_min}_min.docx";

export const TRANSCRIPT_TXT_EXPORT_TEMPLATE = "{safe_title}_session_{session_number}_{date}_{duration_min}_min.txt";

export const TRANSCRIPT_JSON_EXPORT_TEMPLATE = "{safe_title}_session_{session_number}_{date}_{duration_min}_min.json";

export const TRANSCRIPTION_FILENAME_TOKENS = [
  "title",
  "safe_title",
  "session_number",
  "date",
  "time",
  "duration_min",
  "duration_hhmmss",
  "model",
  "language",
  "source_basename",
  "transcript_id",
  "folder",
  "status",
  "speaker_count",
] as const;

export type TranscriptionFilenameToken = (typeof TRANSCRIPTION_FILENAME_TOKENS)[number];

export interface TranscriptionFilenamePreviewInput {
  template: string;
  title: string;
  sessionNumber: string;
  date: string;
  time?: string;
  durationMin: number | string;
  durationHhmmss?: string;
  model?: WhisperModelSize;
  language?: string;
  sourceBasename?: string;
  transcriptId?: string;
  folder?: string;
  status?: string;
  speakerCount?: number | string;
  format?: TranscriptionExportFormat;
  existingFilenames?: string[];
}

export interface TranscriptionFilenamePreview {
  ok: boolean;
  filename: string;
  blockedTokens: string[];
  sanitizedTitle: string;
  message: string;
}

const WINDOWS_RESERVED_BASENAMES = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

export function sanitizeTranscriptionFilenamePart(value: string, fallback = "untitled"): string {
  const trimmed = String(value ?? "").trim();
  let safe = trimmed
    .replace(/\.\.+/g, "_")
    .split("")
    .map((char) => (isInvalidFilenameCharacter(char) ? "_" : char))
    .join("")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
    .replace(/[.\s_]+$/, "");

  if (!safe) {
    safe = fallback;
  }

  if (WINDOWS_RESERVED_BASENAMES.has(safe.toUpperCase())) {
    safe = `_${safe}`;
  }

  return safe.slice(0, 160);
}

export function buildTranscriptionFilenamePreview(
  input: TranscriptionFilenamePreviewInput,
): TranscriptionFilenamePreview {
  const format = sanitizeExtension(input.format ?? "pdf");
  const safeTitle = sanitizeTranscriptionFilenamePart(input.title, "untitled");
  const sourceBasename = input.sourceBasename
    ? sanitizeTranscriptionFilenamePart(input.sourceBasename.replace(/\.[^.]+$/, ""), safeTitle)
    : safeTitle;

  const tokenValues: Record<TranscriptionFilenameToken, string> = {
    title: input.title,
    safe_title: safeTitle,
    session_number: sanitizeTranscriptionFilenamePart(input.sessionNumber, "000"),
    date: sanitizeTranscriptionFilenamePart(input.date, "undated"),
    time: sanitizeTranscriptionFilenamePart(input.time ?? "notime", "notime"),
    duration_min: sanitizeTranscriptionFilenamePart(String(input.durationMin), "0"),
    duration_hhmmss: sanitizeTranscriptionFilenamePart(input.durationHhmmss ?? "00h00m00s", "00h00m00s"),
    model: sanitizeTranscriptionFilenamePart(input.model ?? "model_not_selected", "model_not_selected"),
    language: sanitizeTranscriptionFilenamePart(input.language ?? "language_unknown", "language_unknown"),
    source_basename: sourceBasename,
    transcript_id: sanitizeTranscriptionFilenamePart(input.transcriptId ?? "transcript_id_pending", "transcript_id_pending"),
    folder: sanitizeTranscriptionFilenamePart(input.folder ?? "uncategorized", "uncategorized"),
    status: sanitizeTranscriptionFilenamePart(input.status ?? "status_pending", "status_pending"),
    speaker_count: sanitizeTranscriptionFilenamePart(String(input.speakerCount ?? "0"), "0"),
  };

  const blockedTokens: string[] = [];
  const withoutExtension = stripKnownExtension(input.template);
  const replaced = withoutExtension.replace(/\{([^}]+)\}/g, (match, tokenName: string) => {
    if (isTranscriptionFilenameToken(tokenName)) {
      return tokenValues[tokenName];
    }
    blockedTokens.push(match);
    return "blocked_token";
  });

  const sanitizedBase = sanitizeTranscriptionFilenamePart(replaced, safeTitle);
  const baseWithLimit = sanitizedBase.slice(0, Math.max(1, 180 - format.length - 1));
  const filename = addDuplicateSuffix(`${baseWithLimit}.${format}`, input.existingFilenames ?? []);

  return {
    ok: blockedTokens.length === 0,
    filename,
    blockedTokens,
    sanitizedTitle: safeTitle,
    message:
      blockedTokens.length === 0
        ? "Filename preview is deterministic and safe for local export."
        : "Filename template contains unsupported tokens.",
  };
}

function isTranscriptionFilenameToken(tokenName: string): tokenName is TranscriptionFilenameToken {
  return TRANSCRIPTION_FILENAME_TOKENS.includes(tokenName as TranscriptionFilenameToken);
}

function isInvalidFilenameCharacter(char: string): boolean {
  return char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char);
}

function stripKnownExtension(template: string): string {
  return template.replace(/\.(pdf|docx|txt|srt|vtt|csv|json|html)$/i, "");
}

function sanitizeExtension(format: TranscriptionExportFormat): string {
  return format.replace(/[^a-z0-9]/gi, "").toLowerCase() || "pdf";
}

function addDuplicateSuffix(filename: string, existingFilenames: string[]): string {
  const existing = new Set(existingFilenames.map((name) => name.toLowerCase()));
  if (!existing.has(filename.toLowerCase())) {
    return filename;
  }

  const dot = filename.lastIndexOf(".");
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  const extension = dot >= 0 ? filename.slice(dot) : "";
  let counter = 2;
  let candidate = `${base}_${counter}${extension}`;
  while (existing.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${base}_${counter}${extension}`;
  }
  return candidate;
}
