import type { SubQuestionPlan } from "./subQuestionPlanner";

export type EvidenceIndexStatus =
  | "EVIDENCE_INDEX_NOT_BUILT"
  | "EVIDENCE_INDEX_READY"
  | "EVIDENCE_RETRIEVAL_SKIPPED"
  | "EVIDENCE_FOUND"
  | "EVIDENCE_INSUFFICIENT"
  | "EVIDENCE_RETRIEVAL_FAILED";

export interface TranscriptEvidenceChunk {
  id: string;
  index: number;
  text: string;
  speaker?: string;
  timestamp?: string;
  keywords: string[];
}

export interface TranscriptEvidenceIndex {
  status: EvidenceIndexStatus;
  retrievalKind: "keyword_preview";
  chunks: TranscriptEvidenceChunk[];
  transcriptTextLogged: false;
  cloudEmbeddingsEnabled: false;
  cloudVectorStoreEnabled: false;
}

export interface TranscriptEvidenceResult {
  status: EvidenceIndexStatus;
  sectionId: string;
  snippets: TranscriptEvidenceChunk[];
  insufficientEvidenceFallback: string;
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "begin",
  "client",
  "does",
  "each",
  "from",
  "into",
  "line",
  "only",
  "prompt",
  "section",
  "should",
  "that",
  "the",
  "this",
  "what",
  "with",
]);

function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
    ),
  );
}

export function chunkTranscriptForEvidence(transcript: string, maxChars = 700): TranscriptEvidenceChunk[] {
  const paragraphs = transcript
    .split(/\n{2,}|\r\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const source = paragraphs.length > 0 ? paragraphs : transcript.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (const part of source) {
    if (part.length <= maxChars) {
      chunks.push(part);
      continue;
    }

    for (let start = 0; start < part.length; start += maxChars) {
      chunks.push(part.slice(start, start + maxChars).trim());
    }
  }

  return chunks.filter(Boolean).map((text, index) => ({
    id: `chunk-${index + 1}`,
    index,
    text,
    keywords: tokenize(text),
  }));
}

export function buildTranscriptEvidenceIndex(transcript: string): TranscriptEvidenceIndex {
  if (!transcript.trim()) {
    return {
      status: "EVIDENCE_INDEX_NOT_BUILT",
      retrievalKind: "keyword_preview",
      chunks: [],
      transcriptTextLogged: false,
      cloudEmbeddingsEnabled: false,
      cloudVectorStoreEnabled: false,
    };
  }

  return {
    status: "EVIDENCE_INDEX_READY",
    retrievalKind: "keyword_preview",
    chunks: chunkTranscriptForEvidence(transcript),
    transcriptTextLogged: false,
    cloudEmbeddingsEnabled: false,
    cloudVectorStoreEnabled: false,
  };
}

export function retrieveEvidenceForPlan(
  index: TranscriptEvidenceIndex,
  plan: SubQuestionPlan,
  maxSnippets = 3,
): TranscriptEvidenceResult {
  if (index.status !== "EVIDENCE_INDEX_READY") {
    return {
      status: "EVIDENCE_INDEX_NOT_BUILT",
      sectionId: plan.sectionId,
      snippets: [],
      insufficientEvidenceFallback: plan.outputRules.insufficientEvidenceFallback,
    };
  }

  const queryTerms = tokenize([plan.sectionLabel, plan.originalPrompt, ...plan.decomposedSubQuestions].join(" "));
  const scored = index.chunks
    .map((chunk) => ({
      chunk,
      score: chunk.keywords.filter((keyword) => queryTerms.includes(keyword)).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.index - b.chunk.index);

  const snippets = scored.slice(0, maxSnippets).map((entry) => entry.chunk);

  return {
    status: snippets.length > 0 ? "EVIDENCE_FOUND" : "EVIDENCE_INSUFFICIENT",
    sectionId: plan.sectionId,
    snippets,
    insufficientEvidenceFallback: plan.outputRules.insufficientEvidenceFallback,
  };
}
