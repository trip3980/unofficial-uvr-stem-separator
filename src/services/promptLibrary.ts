import type { TranscriptWorkflowModeId } from "./deepTranscriptComprehension";

export type PromptLibraryCategory =
  | "clinical"
  | "business"
  | "interview"
  | "legal"
  | "education"
  | "research"
  | "coaching"
  | "project"
  | "podcast"
  | "custom";

export type PromptLibrarySaveState = "idle" | "saving" | "saved" | "unsaved" | "error" | "preview_storage_only";

export interface PromptLibrarySection {
  sectionId: string;
  label: string;
  instructionText: string;
  requiredPrefix?: string;
  maxWords: number;
  maxSentences?: number;
  noBullets: boolean;
  noTables: boolean;
  noLineBreaksInsideSection: boolean;
  evidenceRequired: boolean;
  insufficientEvidenceFallback: string;
  enabled: boolean;
  outputOrder: number;
}

export interface PromptLibraryVersion {
  version: number;
  modifiedAt: string;
  note: string;
}

export interface PromptLibraryTemplate {
  templateId: string;
  sourceTemplateId?: string;
  templateName: string;
  category: PromptLibraryCategory;
  description: string;
  tags: string[];
  builtIn: boolean;
  sections: PromptLibrarySection[];
  outputFormatRules: {
    finalSeparator: "line_break";
    noBullets: boolean;
    noTables: boolean;
    noMarkdownTables: boolean;
    extraExplanation: false;
  };
  defaultModelPreference?: "laptop_local" | "balanced_local" | "custom_local";
  recommendedMode: TranscriptWorkflowModeId;
  createdAt: string;
  modifiedAt: string;
  versionNumber: number;
  versions: PromptLibraryVersion[];
  favorite: boolean;
  archived: boolean;
  lastUsedAt?: string;
}

export interface PromptLibraryDocument {
  schemaVersion: 1;
  updatedAt: string;
  templates: PromptLibraryTemplate[];
}

export const PROMPT_LIBRARY_STORAGE_POLICY = {
  preferredFileName: "openstem-prompt-library.json",
  preferredLocation: "Electron app user data folder",
  browserPreviewStorage: "Preview/session/local browser storage only when clearly labeled",
  transcriptTextStoredInTemplates: false,
  cloudSyncDefault: "disabled",
  autoSaveDebounceMs: 750,
  importRunsCode: false,
};

export const PROMPT_LIBRARY_AUTOSAVE_POLICY = {
  debounceMs: 750,
  saveStatusLabels: ["Saving...", "Saved", "Unsaved changes", "Preview storage only", "Native app-data storage active"],
  builtInEditBehavior: "create custom copy before saving",
  recoverable: true,
};

export const PROMPT_LIBRARY_RUN_POLICY = {
  runRequiresConfiguredLocalModel: true,
  preserveCompletedSectionOutputsOnFailure: true,
  preservePromptEditsOnFailure: true,
  finalOutputSeparator: "line_break",
  noBulletsByDefault: true,
  noTablesByDefault: true,
};

function section(
  sectionId: string,
  label: string,
  instructionText: string,
  outputOrder: number,
  options: Partial<PromptLibrarySection> = {},
): PromptLibrarySection {
  return {
    sectionId,
    label,
    instructionText,
    requiredPrefix: options.requiredPrefix,
    maxWords: options.maxWords ?? 80,
    maxSentences: options.maxSentences ?? 2,
    noBullets: options.noBullets ?? true,
    noTables: options.noTables ?? true,
    noLineBreaksInsideSection: options.noLineBreaksInsideSection ?? true,
    evidenceRequired: options.evidenceRequired ?? true,
    insufficientEvidenceFallback: options.insufficientEvidenceFallback ?? "Insufficient evidence",
    enabled: options.enabled ?? true,
    outputOrder,
  };
}

function template(args: {
  templateId: string;
  templateName: string;
  category: PromptLibraryCategory;
  description: string;
  tags: string[];
  recommendedMode: TranscriptWorkflowModeId;
  sections: PromptLibrarySection[];
  favorite?: boolean;
}): PromptLibraryTemplate {
  const now = "2026-06-19T00:00:00.000Z";
  return {
    ...args,
    builtIn: true,
    outputFormatRules: {
      finalSeparator: "line_break",
      noBullets: true,
      noTables: true,
      noMarkdownTables: true,
      extraExplanation: false,
    },
    defaultModelPreference: "laptop_local",
    createdAt: now,
    modifiedAt: now,
    versionNumber: 1,
    versions: [{ version: 1, modifiedAt: now, note: "Built-in starter template" }],
    favorite: args.favorite ?? false,
    archived: false,
  };
}

export const DEFAULT_PROMPT_LIBRARY_TEMPLATES: PromptLibraryTemplate[] = [
  template({
    templateId: "dap-note",
    templateName: "DAP Note",
    category: "clinical",
    description: "Draft-only Data, Assessment, and Plan sections for review.",
    tags: ["clinical", "dap", "draft-only"],
    recommendedMode: "subq_evidence",
    favorite: true,
    sections: [
      section("data", "Data", "Summarize transcript-supported data from the session in one concise paragraph.", 1),
      section(
        "assessment",
        "Assessment",
        "Draft a transcript-supported assessment line without inventing clinical facts.",
        2,
      ),
      section("plan", "Plan", "State the transcript-supported plan or next steps.", 3),
    ],
  }),
  template({
    templateId: "assessment",
    templateName: "Assessment",
    category: "clinical",
    description: "Draft assessment sections from transcript evidence.",
    tags: ["clinical", "assessment"],
    recommendedMode: "subq_evidence",
    sections: [
      section(
        "presenting-concerns",
        "Presenting concerns",
        "Identify presenting concerns supported by the transcript.",
        1,
      ),
      section(
        "relevant-symptoms",
        "Relevant symptoms",
        "List relevant symptoms only if transcript evidence supports them.",
        2,
      ),
      section("functional-impact", "Functional impact", "Describe functional impact supported by the transcript.", 3),
      section(
        "strengths-resources",
        "Strengths/resources",
        "Identify strengths or resources stated in the transcript.",
        4,
      ),
      section(
        "risk-protective",
        "Risk/protective factors",
        "Summarize risk or protective factors only if supported.",
        5,
      ),
      section(
        "clinical-impression",
        "Clinical impression draft",
        "Write a brief draft impression for clinician review.",
        6,
      ),
    ],
  }),
  template({
    templateId: "summary-review",
    templateName: "Summary / Review",
    category: "research",
    description: "General-purpose review workflow for any transcript.",
    tags: ["summary", "review", "any-industry"],
    recommendedMode: "deep_read",
    sections: [
      section("main-topics", "Main topics", "Identify the main transcript-supported topics.", 1),
      section("key-developments", "Key developments", "Summarize key developments in chronological context.", 2),
      section("actions-taken", "Actions taken", "Identify actions taken or agreed to.", 3),
      section("follow-up-items", "Follow-up items", "List follow-up items supported by transcript evidence.", 4),
      section("concise-summary", "Concise paragraph summary", "Write one concise paragraph summary.", 5),
    ],
  }),
  template({
    templateId: "review",
    templateName: "Review",
    category: "research",
    description: "General review workflow for recorded discussions, notes, or transcripts.",
    tags: ["review", "summary", "any-industry"],
    recommendedMode: "deep_read",
    sections: [
      section("scope", "Review scope", "State what the transcript appears to cover.", 1),
      section("important-points", "Important points", "Summarize important transcript-supported points.", 2),
      section("open-questions", "Open questions", "Identify open questions or unresolved items.", 3),
      section("next-review", "Next review step", "State a concise next review step if supported.", 4),
    ],
  }),
  template({
    templateId: "psychotherapy-notes",
    templateName: "Psychotherapy Notes",
    category: "clinical",
    description: "Draft-only psychotherapy note sections for user review.",
    tags: ["clinical", "psychotherapy", "draft-only"],
    recommendedMode: "subq_evidence",
    sections: [
      section("psychoeducation", "Psychoeducation topics reviewed", "Identify psychoeducation topics reviewed.", 1),
      section("interventions", "Interventions used", "Identify interventions discussed or used.", 2),
      section("client-response", "Client response", "Summarize the client's response from transcript evidence.", 3),
      section(
        "benefit",
        "Benefit from techniques",
        "State how the client benefited, as evidenced by the transcript.",
        4,
      ),
      section(
        "risk-response",
        "Risk intervention response",
        "State risk-intervention response only if evidence exists.",
        5,
      ),
      section("next-session-plan", "Plan for next session", "State the plan for next session.", 6),
      section("talking-points", "Talking points summary", "Create a short review summary.", 7),
    ],
  }),
  template({
    templateId: "coaching-notes",
    templateName: "Coaching Notes",
    category: "coaching",
    description: "Plain-text coaching session notes with goals, observations, and next actions.",
    tags: ["coaching", "goals", "notes"],
    recommendedMode: "subq_evidence",
    sections: [
      section("goals", "Goals discussed", "Identify goals discussed in the transcript.", 1),
      section("observations", "Observations", "Summarize transcript-supported observations.", 2),
      section("practice-items", "Practice items", "Identify practice items or commitments if stated.", 3),
      section("next-steps", "Next steps", "State next steps supported by the transcript.", 4),
    ],
  }),
  template({
    templateId: "legal-review",
    templateName: "Legal Review",
    category: "legal",
    description: "Evidence-oriented review notes for legal or compliance transcript review.",
    tags: ["legal", "review", "evidence"],
    recommendedMode: "subq_evidence",
    sections: [
      section(
        "matter-summary",
        "Matter summary",
        "Summarize the matter discussed without adding legal conclusions.",
        1,
      ),
      section("key-statements", "Key statements", "Identify key statements directly supported by the transcript.", 2),
      section("dates-deadlines", "Dates/deadlines", "List dates or deadlines only when explicitly stated.", 3),
      section("follow-up", "Follow-up needed", "Identify follow-up items or missing information.", 4),
    ],
  }),
  template({
    templateId: "business-meeting-summary",
    templateName: "Business Meeting Summary",
    category: "business",
    description: "Plain-text meeting summary with decisions and follow-up.",
    tags: ["business", "meeting", "actions"],
    recommendedMode: "deep_read",
    sections: [
      section("purpose", "Meeting purpose", "State the meeting purpose.", 1),
      section("decisions", "Decisions", "Summarize decisions made.", 2),
      section("action-items", "Action items", "Summarize action items and owners when stated.", 3),
      section("risks-blockers", "Risks/blockers", "Identify risks or blockers.", 4),
      section("follow-up-plan", "Follow-up plan", "State follow-up plan.", 5),
    ],
  }),
  template({
    templateId: "interview-notes",
    templateName: "Interview Notes",
    category: "interview",
    description: "Capture themes, quotes, and follow-up ideas from an interview.",
    tags: ["interview", "research", "notes"],
    recommendedMode: "subq_evidence",
    sections: [
      section("background", "Background", "Summarize relevant background.", 1),
      section("main-themes", "Main themes", "Identify main themes.", 2),
      section("notable-quotes", "Notable quotes", "Capture short transcript-supported quotes only if present.", 3),
      section(
        "follow-up",
        "Follow-up questions",
        "Suggest follow-up questions supported by gaps in the transcript.",
        4,
      ),
    ],
  }),
  template({
    templateId: "podcast-notes",
    templateName: "Podcast Notes",
    category: "podcast",
    description: "Show-note workflow for episodes and interviews.",
    tags: ["podcast", "show-notes"],
    recommendedMode: "deep_read",
    sections: [
      section("episode-summary", "Episode summary", "Write a concise episode summary.", 1),
      section("segments", "Segments", "Identify major segments in chronological order.", 2),
      section("pull-quotes", "Pull quotes", "Identify short pull quotes if directly present.", 3),
      section("description", "Description", "Draft a short plain-text description.", 4),
    ],
  }),
  template({
    templateId: "project-review",
    templateName: "Project Review",
    category: "project",
    description: "Project notes for construction, operations, and team reviews.",
    tags: ["project", "review", "follow-up"],
    recommendedMode: "subq_evidence",
    sections: [
      section("status", "Status", "Summarize project status.", 1),
      section("decisions", "Decisions", "Identify decisions.", 2),
      section("blockers", "Blockers", "Identify blockers or risks.", 3),
      section("next-actions", "Next actions", "Identify next actions.", 4),
    ],
  }),
  template({
    templateId: "custom-blank-workflow",
    templateName: "Custom Blank Workflow",
    category: "custom",
    description: "Starter workflow for user-defined prompt sections.",
    tags: ["custom", "blank"],
    recommendedMode: "quick",
    sections: [
      section("section-1", "Section 1", "Write the first transcript-supported answer.", 1),
      section("section-2", "Section 2", "Write the second transcript-supported answer.", 2),
      section("section-3", "Section 3", "Write the third transcript-supported answer.", 3),
    ],
  }),
];

export function getDefaultPromptLibraryTemplate(): PromptLibraryTemplate {
  return DEFAULT_PROMPT_LIBRARY_TEMPLATES[0];
}

export function duplicatePromptLibraryTemplate(
  templateToCopy: PromptLibraryTemplate,
  newName?: string,
): PromptLibraryTemplate {
  const now = new Date().toISOString();
  const nextTemplateName = newName ?? `${templateToCopy.templateName} - Custom`;
  return {
    ...templateToCopy,
    templateId: `${templateToCopy.templateId}-custom-copy-${Date.now()}`,
    sourceTemplateId: templateToCopy.sourceTemplateId ?? templateToCopy.templateId,
    templateName: nextTemplateName,
    builtIn: false,
    sections: templateToCopy.sections.map((sectionToCopy) => ({ ...sectionToCopy })),
    createdAt: now,
    modifiedAt: now,
    versionNumber: templateToCopy.versionNumber + 1,
    versions: [
      ...templateToCopy.versions,
      { version: templateToCopy.versionNumber + 1, modifiedAt: now, note: "Custom copy created before editing" },
    ],
  };
}

export function getUserPromptLibraryTemplates(templates: PromptLibraryTemplate[]): PromptLibraryTemplate[] {
  return templates.filter((templateEntry) => !templateEntry.builtIn);
}

export function createPromptLibraryDocument(templates: PromptLibraryTemplate[]): PromptLibraryDocument {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    templates: getUserPromptLibraryTemplates(templates),
  };
}

export function mergePromptLibraryTemplates(customTemplates: PromptLibraryTemplate[]): PromptLibraryTemplate[] {
  const builtInIds = new Set(DEFAULT_PROMPT_LIBRARY_TEMPLATES.map((templateEntry) => templateEntry.templateId));
  const safeCustomTemplates = customTemplates
    .filter((templateEntry) => templateEntry && !builtInIds.has(templateEntry.templateId))
    .map((templateEntry) => ({
      ...templateEntry,
      builtIn: false,
      sections: Array.isArray(templateEntry.sections) ? [...templateEntry.sections] : [],
    }));

  return [...DEFAULT_PROMPT_LIBRARY_TEMPLATES, ...safeCustomTemplates];
}

export function ensureEditablePromptLibraryTemplate(
  templates: PromptLibraryTemplate[],
  templateId: string,
): { templates: PromptLibraryTemplate[]; editableTemplateId: string; createdCustomCopy: boolean } {
  const targetTemplate = templates.find((templateEntry) => templateEntry.templateId === templateId);
  if (!targetTemplate) {
    return { templates, editableTemplateId: templateId, createdCustomCopy: false };
  }

  if (!targetTemplate.builtIn) {
    return { templates, editableTemplateId: templateId, createdCustomCopy: false };
  }

  const customCopy = duplicatePromptLibraryTemplate(targetTemplate);
  return {
    templates: [...templates, customCopy],
    editableTemplateId: customCopy.templateId,
    createdCustomCopy: true,
  };
}

function replaceTemplate(
  templates: PromptLibraryTemplate[],
  templateId: string,
  updater: (templateEntry: PromptLibraryTemplate) => PromptLibraryTemplate,
): PromptLibraryTemplate[] {
  return templates.map((templateEntry) =>
    templateEntry.templateId === templateId ? updater(templateEntry) : templateEntry,
  );
}

export function renamePromptLibraryTemplate(
  templates: PromptLibraryTemplate[],
  templateId: string,
  nextName: string,
): PromptLibraryTemplate[] {
  const sanitizedName = nextName.trim().slice(0, 80);
  if (!sanitizedName) return templates;
  return replaceTemplate(templates, templateId, (templateEntry) => ({
    ...templateEntry,
    templateName: sanitizedName,
    modifiedAt: new Date().toISOString(),
    versionNumber: templateEntry.versionNumber + 1,
  }));
}

export function setPromptLibraryFavorite(
  templates: PromptLibraryTemplate[],
  templateId: string,
  favorite: boolean,
): PromptLibraryTemplate[] {
  return replaceTemplate(templates, templateId, (templateEntry) => ({
    ...templateEntry,
    favorite,
    modifiedAt: new Date().toISOString(),
  }));
}

export function addPromptLibrarySection(
  templates: PromptLibraryTemplate[],
  templateId: string,
): { templates: PromptLibraryTemplate[]; sectionId: string } {
  const targetTemplate = templates.find((templateEntry) => templateEntry.templateId === templateId);
  const nextOrder = (targetTemplate?.sections.length ?? 0) + 1;
  const sectionId = `section-${nextOrder}-${Date.now()}`;
  const nextSection = section(
    sectionId,
    `Section ${nextOrder}`,
    "Write a transcript-supported answer for this section.",
    nextOrder,
  );
  return {
    sectionId,
    templates: replaceTemplate(templates, templateId, (templateEntry) => ({
      ...templateEntry,
      sections: [...templateEntry.sections, nextSection],
      modifiedAt: new Date().toISOString(),
      versionNumber: templateEntry.versionNumber + 1,
    })),
  };
}

export function updatePromptLibrarySection(
  templates: PromptLibraryTemplate[],
  templateId: string,
  sectionId: string,
  patch: Partial<PromptLibrarySection>,
): PromptLibraryTemplate[] {
  return replaceTemplate(templates, templateId, (templateEntry) => ({
    ...templateEntry,
    sections: templateEntry.sections.map((sectionEntry) =>
      sectionEntry.sectionId === sectionId
        ? {
            ...sectionEntry,
            ...patch,
            label: patch.label === undefined ? sectionEntry.label : patch.label.trim().slice(0, 80),
            instructionText:
              patch.instructionText === undefined ? sectionEntry.instructionText : patch.instructionText.slice(0, 4000),
            requiredPrefix:
              patch.requiredPrefix === undefined ? sectionEntry.requiredPrefix : patch.requiredPrefix.slice(0, 120),
            maxWords:
              patch.maxWords === undefined
                ? sectionEntry.maxWords
                : Math.max(10, Math.min(500, Number(patch.maxWords) || sectionEntry.maxWords)),
            maxSentences:
              patch.maxSentences === undefined
                ? sectionEntry.maxSentences
                : Math.max(1, Math.min(20, Number(patch.maxSentences) || sectionEntry.maxSentences || 2)),
          }
        : sectionEntry,
    ),
    modifiedAt: new Date().toISOString(),
    versionNumber: templateEntry.versionNumber + 1,
  }));
}

export function togglePromptLibrarySection(
  templates: PromptLibraryTemplate[],
  templateId: string,
  sectionId: string,
): PromptLibraryTemplate[] {
  return updatePromptLibrarySection(templates, templateId, sectionId, {
    enabled: !templates
      .find((templateEntry) => templateEntry.templateId === templateId)
      ?.sections.find((sectionEntry) => sectionEntry.sectionId === sectionId)?.enabled,
  });
}

export function archivePromptLibraryTemplate(
  templates: PromptLibraryTemplate[],
  templateId: string,
  archived: boolean,
): PromptLibraryTemplate[] {
  return replaceTemplate(templates, templateId, (templateEntry) => ({
    ...templateEntry,
    archived,
    modifiedAt: new Date().toISOString(),
  }));
}

function hasForbiddenPromptLibraryKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasForbiddenPromptLibraryKey);
  return Object.entries(value).some(
    ([key, childValue]) =>
      key === "transcriptText" ||
      key === "__proto__" ||
      key === "constructor" ||
      hasForbiddenPromptLibraryKey(childValue),
  );
}

export function validatePromptLibraryImport(candidate: unknown): { ok: boolean; reason: string } {
  if (!candidate || typeof candidate !== "object") {
    return { ok: false, reason: "Import must be a JSON object." };
  }

  if (hasForbiddenPromptLibraryKey(candidate)) {
    return { ok: false, reason: "Import must not include transcript text, prototype keys, or executable structure." };
  }

  const templates = (candidate as { templates?: unknown }).templates;
  if (!Array.isArray(templates)) {
    return { ok: false, reason: "Import must include a templates array." };
  }

  const malformed = templates.some((entry) => {
    if (!entry || typeof entry !== "object") return true;
    const templateEntry = entry as Partial<PromptLibraryTemplate>;
    return (
      typeof templateEntry.templateId !== "string" ||
      typeof templateEntry.templateName !== "string" ||
      typeof templateEntry.category !== "string" ||
      !Array.isArray(templateEntry.sections) ||
      templateEntry.sections.some(
        (sectionEntry) =>
          !sectionEntry ||
          typeof sectionEntry !== "object" ||
          typeof (sectionEntry as Partial<PromptLibrarySection>).sectionId !== "string" ||
          typeof (sectionEntry as Partial<PromptLibrarySection>).label !== "string" ||
          typeof (sectionEntry as Partial<PromptLibrarySection>).instructionText !== "string",
      )
    );
  });

  return malformed
    ? { ok: false, reason: "One or more templates are malformed." }
    : { ok: true, reason: "Import preview valid." };
}

export function importPromptLibraryTemplates(
  currentTemplates: PromptLibraryTemplate[],
  incomingTemplates: PromptLibraryTemplate[],
): { templates: PromptLibraryTemplate[]; importedCount: number } {
  const existingIds = new Set(currentTemplates.map((templateEntry) => templateEntry.templateId));
  const existingNames = new Set(currentTemplates.map((templateEntry) => templateEntry.templateName.toLowerCase()));
  const importedTemplates = incomingTemplates.map((templateEntry) => {
    let templateId = templateEntry.templateId.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
    while (existingIds.has(templateId)) {
      templateId = `${templateId}-imported-${Date.now()}`;
    }
    existingIds.add(templateId);

    let templateName = templateEntry.templateName.trim() || "Imported Prompt Workflow";
    if (existingNames.has(templateName.toLowerCase())) {
      templateName = `${templateName} Imported`;
    }
    existingNames.add(templateName.toLowerCase());

    return {
      ...templateEntry,
      templateId,
      templateName,
      builtIn: false,
      sourceTemplateId: templateEntry.sourceTemplateId,
      modifiedAt: new Date().toISOString(),
      sections: templateEntry.sections.map((sectionEntry, index) => ({
        ...sectionEntry,
        outputOrder: sectionEntry.outputOrder ?? index + 1,
        noBullets: sectionEntry.noBullets ?? true,
        noTables: sectionEntry.noTables ?? true,
        noLineBreaksInsideSection: sectionEntry.noLineBreaksInsideSection ?? true,
        evidenceRequired: sectionEntry.evidenceRequired ?? true,
        insufficientEvidenceFallback: sectionEntry.insufficientEvidenceFallback ?? "Insufficient evidence",
        enabled: sectionEntry.enabled ?? true,
      })),
    };
  });

  return {
    templates: [...currentTemplates, ...importedTemplates],
    importedCount: importedTemplates.length,
  };
}

export function exportPromptLibraryDocument(templates: PromptLibraryTemplate[]): PromptLibraryDocument {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    templates: templates.map(({ lastUsedAt, ...templateEntry }) => ({
      ...templateEntry,
      lastUsedAt,
      sections: templateEntry.sections.map((sectionEntry) => ({ ...sectionEntry })),
    })),
  };
}

export function promptLibraryDoesNotAffectReleaseGate(): string {
  return "Prompt Library templates are workflow text presets only. They do not approve Beta Candidate or satisfy stem-separation proof.";
}
