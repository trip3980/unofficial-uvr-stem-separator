import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Copy,
  Download,
  FileText,
  GitBranch,
  Library,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Star,
  Upload,
} from "lucide-react";

import {
  DEEP_TRANSCRIPT_PRIVACY_POLICY,
  TRANSCRIPT_WORKFLOW_MODES,
  buildPreviewContextMap,
  deepTranscriptWorkflowDoesNotAffectReleaseGate,
  getRecommendedTranscriptWorkflowMode,
  type TranscriptWorkflowModeId,
} from "../services/deepTranscriptComprehension";
import {
  DEFAULT_PROMPT_LIBRARY_TEMPLATES,
  PROMPT_LIBRARY_AUTOSAVE_POLICY,
  PROMPT_LIBRARY_RUN_POLICY,
  PROMPT_LIBRARY_STORAGE_POLICY,
  addPromptLibrarySection,
  archivePromptLibraryTemplate,
  createPromptLibraryDocument,
  duplicatePromptLibraryTemplate,
  ensureEditablePromptLibraryTemplate,
  exportPromptLibraryDocument,
  getDefaultPromptLibraryTemplate,
  getUserPromptLibraryTemplates,
  importPromptLibraryTemplates,
  mergePromptLibraryTemplates,
  promptLibraryDoesNotAffectReleaseGate,
  renamePromptLibraryTemplate,
  setPromptLibraryFavorite,
  togglePromptLibrarySection,
  updatePromptLibrarySection,
  validatePromptLibraryImport,
  type PromptLibraryCategory,
  type PromptLibraryDocument,
  type PromptLibrarySaveState,
  type PromptLibrarySection,
  type PromptLibraryTemplate,
} from "../services/promptLibrary";
import {
  DOCUMENT_IMPORT_FORMAT_POLICIES,
  DOCUMENT_OUTPUT_FORMAT_POLICIES,
  documentFormatsDoNotAffectReleaseGate,
} from "../services/documentFormatPolicy";
import { buildDocumentImportPlan } from "../services/documentImportPolicy";
import { buildDocumentExportPlan, buildExternalOfficeConverterPlan } from "../services/documentExportPolicy";
import { assemblePlainTextOutput, getTranscriptAnswerSynthesisPolicy } from "../services/transcriptAnswerSynthesis";
import {
  DEFAULT_TRANSCRIPTION_AUTOMATION_MODE,
  TRANSCRIPTION_AUTOMATION_MODES,
  buildVttAutomationWorkflowPlan,
  transcriptionAutomationDoesNotAffectReleaseGate,
} from "../services/transcriptionAutomationWorkflow";
import {
  CHECKPOINT_AUTOMATION_PRESETS,
  buildCheckpointWorkflowPlan,
  checkpointAutomationDoesNotAffectReleaseGate,
} from "../services/transcriptionWorkflowPipeline";
import {
  WORKFLOW_RUN_PRESETS,
  applyWorkflowEdit,
  createWorkflowArtifactRecord,
  createWorkflowRunRecord,
  getWorkflowStatusSummary,
  workflowRunLedgerDoesNotAffectReleaseGate,
} from "../services/workflowRunLedger";
import { buildSubQuestionPlans } from "../services/subQuestionPlanner";
import { buildTranscriptEvidenceIndex, retrieveEvidenceForPlan } from "../services/transcriptEvidenceIndex";

const SAMPLE_TRANSCRIPT =
  "The team reviewed timeline risks, customer feedback, action items for the next sprint, and a follow-up plan for unresolved blockers.";
const SUBQ_WORKFLOW_SUMMARY = "SubQ + Evidence Mode, then assemble plain text outputs with line breaks";
const BROWSER_STORAGE_KEY = "openstem.promptLibrary.preview";

const DEFAULT_TEMPLATE = getDefaultPromptLibraryTemplate();
const DEFAULT_SECTION_ID = DEFAULT_TEMPLATE.sections[0].sectionId;

type PromptLibraryBridge = {
  loadPromptLibrary?: () => Promise<{
    success: boolean;
    document?: PromptLibraryDocument;
    path?: string;
    error?: string;
  }>;
  savePromptLibrary?: (
    document: PromptLibraryDocument,
  ) => Promise<{ success: boolean; document?: PromptLibraryDocument; path?: string; error?: string }>;
  getPromptLibraryPath?: () => Promise<{ success: boolean; path?: string; error?: string }>;
};

function getPromptLibraryBridge(): PromptLibraryBridge | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { uvr?: PromptLibraryBridge }).uvr ?? null) as PromptLibraryBridge | null;
}

function getPromptTemplateById(templates: PromptLibraryTemplate[], templateId: string) {
  return templates.find((template) => template.templateId === templateId) ?? DEFAULT_TEMPLATE;
}

function getFirstSectionId(template: PromptLibraryTemplate) {
  return template.sections[0]?.sectionId ?? DEFAULT_SECTION_ID;
}

function toSaveStatusLabel(saveState: PromptLibrarySaveState) {
  if (saveState === "saving") return "Saving...";
  if (saveState === "saved") return "Saved";
  if (saveState === "unsaved") return "Unsaved changes";
  if (saveState === "error") return "Save error";
  return "Preview storage only";
}

function constraintButtonClass(active: boolean) {
  return `rounded-lg border px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider ${
    active ? "border-cyan-400/30 bg-cyan-950/20 text-cyan-100" : "border-slate-600/50 bg-slate-900/50 text-slate-400"
  }`;
}

export default function TranscriptWorkflowBuilder() {
  const [templates, setTemplates] = useState<PromptLibraryTemplate[]>(DEFAULT_PROMPT_LIBRARY_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATE.templateId);
  const [activeSectionId, setActiveSectionId] = useState(DEFAULT_SECTION_ID);
  const [workflowModeId, setWorkflowModeId] = useState<TranscriptWorkflowModeId>(DEFAULT_TEMPLATE.recommendedMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<PromptLibraryCategory | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [saveState, setSaveState] = useState<PromptLibrarySaveState>("preview_storage_only");
  const [storageMessage, setStorageMessage] = useState("Storage not checked yet.");
  const [importMessage, setImportMessage] = useState("Import preview not run.");
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>([]);
  const [sectionOutputs, setSectionOutputs] = useState<Record<string, string>>({});
  const [failedSectionId, setFailedSectionId] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const selectedTemplate = useMemo(
    () => getPromptTemplateById(templates, selectedTemplateId),
    [selectedTemplateId, templates],
  );
  const activeSection =
    selectedTemplate.sections.find((section) => section.sectionId === activeSectionId) ?? selectedTemplate.sections[0];
  const selectedMode =
    TRANSCRIPT_WORKFLOW_MODES.find((mode) => mode.id === workflowModeId) ??
    TRANSCRIPT_WORKFLOW_MODES.find((mode) => mode.id === selectedTemplate.recommendedMode) ??
    TRANSCRIPT_WORKFLOW_MODES[0];
  const categories = useMemo(
    () => Array.from(new Set(DEFAULT_PROMPT_LIBRARY_TEMPLATES.map((template) => template.category))).sort(),
    [],
  );
  const filteredTemplates = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return templates.filter((template) => {
      if (!showArchived && template.archived) return false;
      if (categoryFilter !== "all" && template.category !== categoryFilter) return false;
      if (!normalizedSearch) return true;
      const haystack = `${template.templateName} ${template.category} ${template.tags.join(" ")} ${template.sections
        .map((section) => `${section.label} ${section.instructionText}`)
        .join(" ")}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [categoryFilter, searchQuery, showArchived, templates]);
  const pinnedTemplates = templates.filter((template) => template.favorite && !template.archived).slice(0, 4);
  const recentTemplates = recentTemplateIds
    .map((templateId) => templates.find((template) => template.templateId === templateId))
    .filter((template): template is PromptLibraryTemplate => Boolean(template))
    .slice(0, 4);

  const recommendation = getRecommendedTranscriptWorkflowMode({
    wordCount: 9200,
    sectionCount: selectedTemplate.sections.length,
    evidenceRequired: selectedTemplate.sections.some((section) => section.evidenceRequired),
  });
  const contextMap = buildPreviewContextMap({
    wordCount: 9200,
    themes: ["timeline risks", "customer feedback"],
    repeatedTopics: ["follow-up plan", "unresolved blockers"],
    timeline: ["review", "decision", "follow-up"],
  });
  const subQuestionPlans = buildSubQuestionPlans(
    selectedTemplate.sections
      .filter((section) => section.enabled)
      .map((section) => ({
        sectionId: section.sectionId,
        label: section.label,
        prompt: section.instructionText,
        requiredPrefix: section.requiredPrefix,
        maxWords: section.maxWords,
        noBullets: section.noBullets,
        noTables: section.noTables,
        evidenceRequired: section.evidenceRequired,
        insufficientEvidenceFallback: section.insufficientEvidenceFallback,
      })),
    contextMap,
  );
  const evidenceIndex = buildTranscriptEvidenceIndex(SAMPLE_TRANSCRIPT);
  const firstEvidenceResult = retrieveEvidenceForPlan(evidenceIndex, subQuestionPlans[0]);
  const synthesisPolicy = getTranscriptAnswerSynthesisPolicy();
  const exportPreview = exportPromptLibraryDocument(templates);
  const importPreview = validatePromptLibraryImport({ templates: getUserPromptLibraryTemplates(templates) });
  const customCopyPreview = duplicatePromptLibraryTemplate(selectedTemplate);
  const intakeAutomationPlan = buildVttAutomationWorkflowPlan({
    mode: DEFAULT_TRANSCRIPTION_AUTOMATION_MODE,
    title: "Transcript workflow handoff preview",
    sessionNumber: "001",
  });
  const checkpointPromptPlan = buildCheckpointWorkflowPlan({
    mode: DEFAULT_TRANSCRIPTION_AUTOMATION_MODE,
    sourceType: "existing_history_item",
    presetId: "prompt_only",
    stopAfterStageId: "prompt_output_review",
    metadataOnlyHistory: true,
  });
  const completedOutputSections = selectedTemplate.sections
    .filter((section) => section.enabled)
    .map((section) => sectionOutputs[section.sectionId] ?? "Insufficient evidence");
  const finalOutputPreview = assemblePlainTextOutput(completedOutputSections);
  const nativeBridge = getPromptLibraryBridge();
  const nativeStorageAvailable = Boolean(nativeBridge?.loadPromptLibrary && nativeBridge?.savePromptLibrary);
  const documentHandoffImportPlan = useMemo(
    () => buildDocumentImportPlan({ formatId: "txt", nativeFileVerified: true }),
    [],
  );
  const documentPromptExportPlan = useMemo(
    () =>
      buildDocumentExportPlan({
        formatId: "docx",
        nativeWriteVerified: false,
        exists: false,
        sizeBytes: 0,
        extensionMatches: false,
        insideSelectedFolder: false,
        overwritePolicyAllows: false,
      }),
    [],
  );
  const documentConverterPlan = useMemo(() => buildExternalOfficeConverterPlan(), []);
  const workflowLedgerPreview = useMemo(() => {
    const promptOutputArtifact = createWorkflowArtifactRecord({
      artifactId: "artifact-prompt-output-preview",
      artifactType: "prompt_output",
      sourceStage: "prompt_output_export_saved",
      path: "{userData}/OpenStem/Transcription/Exports/Prompt_Output/final_prompt_output.txt",
      format: "txt",
      sizeBytes: 0,
      verified: false,
      verificationError: "Output Missing",
      expectedExtension: ".txt",
      verificationRecorded: true,
    });
    const baseRun = createWorkflowRunRecord({
      workflowRunId: "prompt-workflow-run-preview",
      sourceType: "pasted_text",
      transcriptTextPath: "{userData}/OpenStem/Transcription/History/transcript.txt",
      selectedPromptLibraryId: selectedTemplate.templateId,
      selectedPromptTemplateName: selectedTemplate.templateName,
      selectedModelId: "local_llm_not_configured",
      workflowMode: "automatic_then_review",
      generatedFiles: [],
      exportFiles: [promptOutputArtifact],
      promptOutputs: [
        {
          sectionId: activeSection.sectionId,
          outputPath: null,
          status: "Output Missing",
          regenerateRecommended: false,
        },
      ],
      lastCompletedStage: "prompt_library_selected",
      currentStage: "prompt_output_review",
      historyMode: "metadata_only",
      notes: "Prompt workflow ledger preview stores prompt metadata and output paths, not transcript text.",
    });

    return applyWorkflowEdit(baseRun, "prompt_library");
  }, [activeSection.sectionId, selectedTemplate.templateId, selectedTemplate.templateName]);
  const workflowStatusSummary = useMemo(
    () => getWorkflowStatusSummary(workflowLedgerPreview),
    [workflowLedgerPreview],
  );

  useEffect(() => {
    let cancelled = false;
    const bridge = getPromptLibraryBridge();

    if (bridge?.loadPromptLibrary) {
      bridge
        .loadPromptLibrary()
        .then((result) => {
          if (cancelled) return;
          if (result?.success && result.document) {
            const validation = validatePromptLibraryImport(result.document);
            if (validation.ok) {
              setTemplates(mergePromptLibraryTemplates(result.document.templates));
              setStorageMessage(
                `Native app-data storage active: ${result.path ?? PROMPT_LIBRARY_STORAGE_POLICY.preferredFileName}`,
              );
              setSaveState("saved");
              return;
            }
            setStorageMessage(`Native prompt library ignored: ${validation.reason}`);
            setSaveState("error");
            return;
          }

          setStorageMessage("Native app-data storage active; no custom prompt templates saved yet.");
          setSaveState("saved");
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setStorageMessage(
            `Native prompt library load failed: ${error instanceof Error ? error.message : "unknown error"}`,
          );
          setSaveState("error");
        });
    } else {
      Promise.resolve().then(() => {
        if (cancelled || typeof window === "undefined") return;
        try {
          const raw = window.localStorage.getItem(BROWSER_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as PromptLibraryDocument;
            const validation = validatePromptLibraryImport(parsed);
            if (validation.ok) {
              setTemplates(mergePromptLibraryTemplates(parsed.templates));
              setStorageMessage("Browser Preview / localStorage prompt library preview.");
            } else {
              setStorageMessage(`Browser prompt library ignored: ${validation.reason}`);
            }
          } else {
            setStorageMessage(
              "Browser Preview / local component state only until Electron native storage is available.",
            );
          }
          setSaveState("preview_storage_only");
        } catch {
          setStorageMessage("Browser prompt library preview storage could not be read.");
          setSaveState("error");
        }
      });
    }

    return () => {
      cancelled = true;
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const scheduleTemplateSave = (nextTemplates: PromptLibraryTemplate[]) => {
    setSaveState("saving");
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(async () => {
      const document = createPromptLibraryDocument(nextTemplates);
      const bridge = getPromptLibraryBridge();

      if (bridge?.savePromptLibrary) {
        try {
          const result = await bridge.savePromptLibrary(document);
          if (result.success) {
            setSaveState("saved");
            setStorageMessage(
              `Saved to native app data: ${result.path ?? PROMPT_LIBRARY_STORAGE_POLICY.preferredFileName}`,
            );
            return;
          }
          setSaveState("error");
          setStorageMessage(`Native prompt library save blocked: ${result.error ?? "unknown error"}`);
          return;
        } catch (error) {
          setSaveState("error");
          setStorageMessage(
            `Native prompt library save failed: ${error instanceof Error ? error.message : "unknown error"}`,
          );
          return;
        }
      }

      try {
        window.localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(document));
        setSaveState("preview_storage_only");
        setStorageMessage("Browser Preview / changes saved to localStorage preview only.");
      } catch {
        setSaveState("error");
        setStorageMessage("Browser prompt library preview save failed.");
      }
    }, PROMPT_LIBRARY_AUTOSAVE_POLICY.debounceMs);
  };

  const commitTemplates = (nextTemplates: PromptLibraryTemplate[], nextTemplateId = selectedTemplateId) => {
    setTemplates(nextTemplates);
    setSelectedTemplateId(nextTemplateId);
    scheduleTemplateSave(nextTemplates);
  };

  const applyEditableTemplateMutation = (
    mutator: (nextTemplates: PromptLibraryTemplate[], editableTemplateId: string) => PromptLibraryTemplate[],
  ) => {
    const editable = ensureEditablePromptLibraryTemplate(templates, selectedTemplate.templateId);
    const nextTemplates = mutator(editable.templates, editable.editableTemplateId);
    commitTemplates(nextTemplates, editable.editableTemplateId);
    if (editable.createdCustomCopy) {
      setStorageMessage(
        `Created custom copy before editing: ${getPromptTemplateById(nextTemplates, editable.editableTemplateId).templateName}`,
      );
    }
  };

  const handleTemplateChange = (nextTemplateId: string) => {
    const nextTemplate = getPromptTemplateById(templates, nextTemplateId);
    setSelectedTemplateId(nextTemplateId);
    setActiveSectionId(getFirstSectionId(nextTemplate));
    setWorkflowModeId(nextTemplate.recommendedMode);
    setRecentTemplateIds((current) =>
      [nextTemplateId, ...current.filter((templateId) => templateId !== nextTemplateId)].slice(0, 6),
    );
  };

  const handleTemplateNameChange = (nextName: string) => {
    applyEditableTemplateMutation((nextTemplates, editableTemplateId) =>
      renamePromptLibraryTemplate(nextTemplates, editableTemplateId, nextName),
    );
  };

  const handleSectionPatch = (patch: Partial<PromptLibrarySection>) => {
    if (!activeSection) return;
    applyEditableTemplateMutation((nextTemplates, editableTemplateId) =>
      updatePromptLibrarySection(nextTemplates, editableTemplateId, activeSection.sectionId, patch),
    );
  };

  const handleDuplicateTemplate = () => {
    const duplicate = duplicatePromptLibraryTemplate(selectedTemplate);
    const nextTemplates = [...templates, duplicate];
    setActiveSectionId(getFirstSectionId(duplicate));
    commitTemplates(nextTemplates, duplicate.templateId);
    setStorageMessage(`Duplicate template created: ${duplicate.templateName}`);
  };

  const handleAddSection = () => {
    const editable = ensureEditablePromptLibraryTemplate(templates, selectedTemplate.templateId);
    const result = addPromptLibrarySection(editable.templates, editable.editableTemplateId);
    setActiveSectionId(result.sectionId);
    commitTemplates(result.templates, editable.editableTemplateId);
  };

  const handleToggleActiveSection = () => {
    if (!activeSection) return;
    applyEditableTemplateMutation((nextTemplates, editableTemplateId) =>
      togglePromptLibrarySection(nextTemplates, editableTemplateId, activeSection.sectionId),
    );
  };

  const handleToggleFavorite = () => {
    applyEditableTemplateMutation((nextTemplates, editableTemplateId) =>
      setPromptLibraryFavorite(nextTemplates, editableTemplateId, !selectedTemplate.favorite),
    );
  };

  const handleResetTemplate = () => {
    if (selectedTemplate.builtIn) {
      setStorageMessage("Selected built-in template is already the factory default.");
      return;
    }

    const fallbackId =
      selectedTemplate.sourceTemplateId &&
      DEFAULT_PROMPT_LIBRARY_TEMPLATES.some((template) => template.templateId === selectedTemplate.sourceTemplateId)
        ? selectedTemplate.sourceTemplateId
        : DEFAULT_TEMPLATE.templateId;
    const nextTemplates = archivePromptLibraryTemplate(templates, selectedTemplate.templateId, true);
    const fallbackTemplate = getPromptTemplateById(nextTemplates, fallbackId);
    setActiveSectionId(getFirstSectionId(fallbackTemplate));
    commitTemplates(nextTemplates, fallbackId);
    setStorageMessage("Custom template archived. Factory default restored.");
  };

  const handleExportLibrary = () => {
    const exportDocument = exportPromptLibraryDocument(templates);
    const blob = new Blob([JSON.stringify(exportDocument, null, 2)], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = PROMPT_LIBRARY_STORAGE_POLICY.preferredFileName;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
    setStorageMessage("Prompt library JSON export prepared locally by user action.");
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as PromptLibraryDocument;
      const validation = validatePromptLibraryImport(parsed);
      if (!validation.ok) {
        setImportMessage(`Import rejected: ${validation.reason}`);
        return;
      }
      const imported = importPromptLibraryTemplates(templates, parsed.templates);
      commitTemplates(
        imported.templates,
        imported.templates[imported.templates.length - 1]?.templateId ?? selectedTemplateId,
      );
      setImportMessage(`Import preview valid. Imported templates: ${imported.importedCount}.`);
    } catch {
      setImportMessage("Import rejected: JSON could not be parsed.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const handleSimulateSectionFailure = () => {
    const enabledSections = selectedTemplate.sections.filter((section) => section.enabled);
    const failed = enabledSections[enabledSections.length - 1];
    const preservedOutputs = Object.fromEntries(
      enabledSections.slice(0, -1).map((section) => [section.sectionId, "Completed section output preserved."]),
    );
    setSectionOutputs(preservedOutputs);
    setFailedSectionId(failed?.sectionId ?? null);
  };

  const handleClearRunPreview = () => {
    setSectionOutputs({});
    setFailedSectionId(null);
  };

  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-2xl border border-cyan-500/15 bg-[#080a13]/85 p-6 shadow-2xl backdrop-blur-3xl">
        <div className="flex flex-col gap-4 border-b border-cyan-500/15 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-cyan-400/25 bg-cyan-950/25 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                Transcript Workflow Builder
              </span>
              <span className="rounded-md border border-amber-400/25 bg-amber-950/25 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                {nativeStorageAvailable ? "Native prompt storage available" : "Browser Preview / Not runnable"}
              </span>
              <span className="rounded-md border border-slate-500/30 bg-slate-950/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Any-industry prompt workflows
              </span>
            </div>
            <h2 className="flex items-center gap-3 font-display text-2xl font-bold text-cyan-100">
              <GitBranch className="h-6 w-6 text-cyan-300" />
              Prompt Library and SubQ + Evidence Workflow
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Choose reusable prompt workflows, edit sections inline, choose Quick Mode, Deep Read Mode, or SubQ +
              Evidence Mode, then assemble plain text outputs with line breaks. No model execution or cloud RAG is
              active in this scaffold.
            </p>
            <p className="mt-2 text-xs leading-5 text-cyan-200/80">
              Available modes: Quick Mode, Deep Read Mode, SubQ + Evidence Mode. {SUBQ_WORKFLOW_SUMMARY}.
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/25 bg-rose-950/20 p-4 text-sm text-rose-100 lg:max-w-sm">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              Release boundary
            </div>
            <p className="leading-6">{deepTranscriptWorkflowDoesNotAffectReleaseGate()}</p>
            <p className="mt-3 text-xs leading-5 text-rose-200/90">{promptLibraryDoesNotAffectReleaseGate()}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-emerald-500/15 bg-black/35 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h3 className="font-display text-lg font-bold text-emerald-100">
                Transcription automation handoff
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Local Transcription can prepare VTT/import/recording history records in Automatic,
                Manual, or Automatic then Review mode. This builder can consume those records later
                without rerunning intake or pretending local model output exists.
              </p>
            </div>
            <span className="rounded border border-emerald-400/20 bg-emerald-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-100">
              Default intake mode: {DEFAULT_TRANSCRIPTION_AUTOMATION_MODE}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {TRANSCRIPTION_AUTOMATION_MODES.map((mode) => (
              <div key={mode.id} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="text-sm font-bold text-slate-100">{mode.label}</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">{mode.userLabel}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs leading-5 text-slate-300">
              Handoff status: {intakeAutomationPlan.status}. History title:{" "}
              {intakeAutomationPlan.historyRecord.title}. Completed steps preserved on failure:{" "}
              {String(intakeAutomationPlan.completedStepsPreservedOnFailure)}.
            </div>
            <div className="rounded-lg border border-rose-400/15 bg-rose-950/10 p-3 text-xs leading-5 text-rose-100">
              {transcriptionAutomationDoesNotAffectReleaseGate()}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-sky-500/15 bg-black/35 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h3 className="font-display text-lg font-bold text-sky-100">
                Automation Checkpoints
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Prompt workflows can start from a pasted transcript, imported VTT handoff, or existing
                history item, then stop before prompt library, after prompt output, or before export.
              </p>
              <p className="mt-2 text-xs leading-5 text-sky-200/80">
                Prompt checkpoints: Prompt Library Selected, Prompt Workflow Complete, Prompt Output Review,
                Prompt Output Export Saved.
              </p>
            </div>
            <span className="rounded border border-sky-400/20 bg-sky-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-sky-100">
              Preset: {checkpointPromptPlan.preset.label}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-200">
                  Automation templates
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CHECKPOINT_AUTOMATION_PRESETS.map((preset) => (
                    <span
                      key={preset.id}
                      className="rounded border border-sky-400/15 bg-sky-950/20 px-2 py-1 font-mono text-[10px] text-sky-100"
                    >
                      {preset.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs leading-5 text-slate-300">
                Last completed stage: {checkpointPromptPlan.historyState.lastCompletedStage}. Metadata-only
                history stores transcript text: {String(checkpointPromptPlan.historyState.storesTranscriptText)}.
              </div>
              <div className="rounded-lg border border-rose-400/15 bg-rose-950/10 p-3 text-xs leading-5 text-rose-100">
                {checkpointAutomationDoesNotAffectReleaseGate()}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-2">
                {checkpointPromptPlan.stages
                  .filter(
                    (stage) =>
                      stage.id === "transcript_preview" ||
                      stage.id === "prompt_library_selected" ||
                      stage.id === "prompt_workflow_complete" ||
                      stage.id === "prompt_output_review" ||
                      stage.id === "prompt_output_export_saved",
                  )
                  .map((stage) => (
                    <div key={stage.id} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-bold text-slate-100">{stage.label}</div>
                        <span className="rounded border border-amber-400/15 bg-amber-950/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                          {stage.status}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input type="checkbox" checked={stage.automationEnabled} readOnly />
                          Include in automation
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input type="checkbox" checked={stage.stopAfterStage} readOnly />
                          Stop after this stage
                        </label>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-400">{stage.userMessage}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-emerald-500/15 bg-black/35 p-4">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h3 className="font-display text-lg font-bold text-emerald-100">Workflow Status</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                The Workflow Run Ledger keeps prompt-library choice, section outputs, failed exports,
                and resume/rerun state together without storing transcript text in prompt templates.
              </p>
            </div>
            <span className="rounded border border-amber-400/20 bg-amber-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
              {workflowStatusSummary.currentStageLabel}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Current stage
              </div>
              <div className="mt-1 text-sm font-bold text-slate-100">
                {workflowStatusSummary.currentStage}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Next recommended action: {workflowStatusSummary.nextRecommendedAction}.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-amber-200">
                Regenerate recommended
              </div>
              <div className="mt-1 text-2xl font-bold text-amber-100">
                {workflowStatusSummary.regenerateRecommendedArtifacts.length}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Prompt library changed; prompt outputs should be regenerated before export.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-rose-200">
                Output status
              </div>
              <div className="mt-1 text-sm font-bold text-slate-100">
                {workflowStatusSummary.failedArtifacts.length > 0 ? "Output Missing" : "Ready"}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Prompt output export remains disabled until a native writer verifies a nonzero file.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {["Continue automation", "Rerun failed step", "Regenerate prompt output", "Export again"].map(
              (control) => (
                <button
                  key={control}
                  type="button"
                  disabled
                  className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
                >
                  {control}
                </button>
              ),
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {WORKFLOW_RUN_PRESETS.map((preset) => (
              <span
                key={preset.id}
                className="rounded border border-emerald-400/15 bg-emerald-950/20 px-2 py-1 font-mono text-[10px] text-emerald-100"
              >
                {preset.label}
              </span>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-rose-400/15 bg-rose-950/10 p-3 text-xs leading-5 text-rose-100">
            {workflowRunLedgerDoesNotAffectReleaseGate()}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-indigo-500/15 bg-black/35 p-4">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h3 className="font-display text-lg font-bold text-indigo-100">
                Document Import / Export Handoff
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Import transcript document, export final prompt output, export section outputs, or
                export transcript + prompt output together. No cloud conversion by default.
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-rose-200">
                Document output status code: DOCUMENT_OUTPUT_NOT_VERIFIED until a real file passes checks.
              </p>
            </div>
            <span className="rounded border border-rose-400/20 bg-rose-950/20 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-200">
              {documentPromptExportPlan.completionState}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                Transcript document intake
              </h4>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                {DOCUMENT_IMPORT_FORMAT_POLICIES.slice(0, 10).map((format) => (
                  <div key={format.id} className="rounded border border-white/10 bg-black/30 p-2">
                    <div className="text-xs font-bold text-slate-100">{format.label}</div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                      {format.status}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Import preview: {documentHandoffImportPlan.diagnosticCode}. Extracted text must be
                reviewed in a scroll box before prompt workflow use.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                Prompt output documents
              </h4>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {DOCUMENT_OUTPUT_FORMAT_POLICIES.map((format) => (
                  <div key={format.id} className="rounded border border-white/10 bg-black/30 p-2">
                    <div className="text-xs font-bold text-slate-100">{format.label}</div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                      {format.status}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded border border-amber-400/15 bg-amber-950/10 p-3 text-xs leading-5 text-amber-100">
                External converter: {documentConverterPlan.status}. DOCX/PDF/ODT export actions stay
                disabled until dependencies or converter paths are verified and real output files pass
                checks.
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Import transcript document - Native required",
              "Export final prompt output - Output not verified",
              "Export section outputs - Output not verified",
              "Export transcript + prompt output together - Output not verified",
            ].map((label) => (
              <button
                key={label}
                type="button"
                disabled
                className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-rose-400/15 bg-rose-950/10 p-3 text-xs leading-5 text-rose-100">
            {documentFormatsDoNotAffectReleaseGate()}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {TRANSCRIPT_WORKFLOW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setWorkflowModeId(mode.id)}
              className={`rounded-xl border p-4 text-left transition ${
                workflowModeId === mode.id
                  ? "border-cyan-400/40 bg-cyan-950/25"
                  : "border-white/10 bg-black/35 hover:border-cyan-500/25"
              }`}
            >
              <div className="text-sm font-bold text-slate-100">{mode.label}</div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{mode.description}</p>
              <div className="mt-3 rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-cyan-200">
                {mode.recommendedFor}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-violet-500/15 bg-black/40 p-5">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-violet-300" />
            <h3 className="font-display text-xl font-bold text-violet-100">Prompt Library</h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Template changes are local-first. Native app-data persistence uses{" "}
            {PROMPT_LIBRARY_STORAGE_POLICY.preferredFileName}; browser mode is labeled as preview storage only.
          </p>

          <label className="mt-4 block text-xs font-semibold text-slate-300">
            Template dropdown
            <select
              value={selectedTemplateId}
              onChange={(event) => handleTemplateChange(event.target.value)}
              className="mt-2 w-full rounded-lg border border-violet-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-violet-100 outline-none"
            >
              {templates
                .filter((template) => showArchived || !template.archived)
                .map((template) => (
                  <option key={template.templateId} value={template.templateId}>
                    {template.templateName}
                  </option>
                ))}
            </select>
          </label>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-300">
              Search templates
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-[#07080c] px-3 py-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
                  placeholder="Search by name, category, tag, or prompt text"
                />
              </div>
            </label>

            <label className="block text-xs font-semibold text-slate-300">
              Category filter
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as PromptLibraryCategory | "all")}
                className="mt-2 w-full rounded-lg border border-white/10 bg-[#07080c] px-3 py-2 font-mono text-xs text-slate-200 outline-none"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <button
                  key={template.templateId}
                  type="button"
                  onClick={() => handleTemplateChange(template.templateId)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    template.templateId === selectedTemplateId
                      ? "border-violet-400/40 bg-violet-950/25"
                      : "border-white/10 bg-[#07080c] hover:border-violet-500/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-100">{template.templateName}</span>
                    {template.favorite ? <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> : null}
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">
                    {template.category} / {template.recommendedMode}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-white/10 bg-[#07080c] p-3 text-xs text-slate-400">
                No templates match current filters.
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#07080c] p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Favorites / pinned templates
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                {pinnedTemplates.length > 0
                  ? pinnedTemplates.map((template) => template.templateName).join(", ")
                  : "None pinned yet."}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#07080c] p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Recently used
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                {recentTemplates.length > 0
                  ? recentTemplates.map((template) => template.templateName).join(", ")
                  : "No recent templates yet."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleDuplicateTemplate}
              className="flex items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-950/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-violet-100"
            >
              <Copy className="h-4 w-4" />
              Duplicate template
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-950/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-100"
            >
              <Star className="h-4 w-4" />
              Favorites / pinned templates
            </button>
            <button
              type="button"
              onClick={handleAddSection}
              className="flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-950/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-100"
            >
              <Plus className="h-4 w-4" />
              Add prompt section
            </button>
            <button
              type="button"
              onClick={handleToggleActiveSection}
              className="flex items-center gap-2 rounded-lg border border-slate-500/40 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200"
            >
              <Pencil className="h-4 w-4" />
              Disable/enable section
            </button>
            <button
              type="button"
              onClick={handleResetTemplate}
              className="flex items-center gap-2 rounded-lg border border-rose-400/25 bg-rose-950/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-100"
            >
              <RotateCcw className="h-4 w-4" />
              Reset template
            </button>
            <button
              type="button"
              onClick={() => setShowArchived((current) => !current)}
              className="rounded-lg border border-slate-500/40 bg-slate-900/50 px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200"
            >
              {showArchived ? "Hide archived templates" : "Show archived templates"}
            </button>
            <button
              type="button"
              onClick={handleExportLibrary}
              className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-950/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-100"
            >
              <Download className="h-4 w-4" />
              Export library
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-blue-400/25 bg-blue-950/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-100"
            >
              <Upload className="h-4 w-4" />
              Import library
            </button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void handleImportFile(event.target.files?.[0])}
          />

          <div className="mt-4 rounded-xl border border-white/10 bg-[#07080c] p-4 text-xs leading-5 text-slate-300">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Storage status
            </div>
            <p className="mt-2">{storageMessage}</p>
            <p className="mt-2 text-violet-200">{importMessage}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-500/15 bg-black/40 p-5">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-violet-100">Prompt Sections</h3>
              <p className="mt-1 text-xs text-slate-400">{selectedTemplate.description}</p>
            </div>
            <span className="rounded-md border border-emerald-400/25 bg-emerald-950/25 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              {toSaveStatusLabel(saveState)}
            </span>
          </div>

          <label className="mt-4 block text-xs font-semibold text-slate-300">
            Rename template
            <input
              value={selectedTemplate.templateName}
              onChange={(event) => handleTemplateNameChange(event.target.value)}
              className="mt-2 w-full rounded-lg border border-violet-500/20 bg-black/60 px-3 py-2 text-sm text-violet-100 outline-none"
            />
          </label>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {selectedTemplate.sections.map((section) => (
              <button
                key={section.sectionId}
                type="button"
                onClick={() => setActiveSectionId(section.sectionId)}
                className={`rounded-xl border p-4 text-left transition ${
                  section.sectionId === activeSection.sectionId
                    ? "border-cyan-400/40 bg-cyan-950/15"
                    : "border-white/10 bg-[#07080c] hover:border-cyan-500/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-100">{section.label}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      Max words: {section.maxWords} / Evidence required: {section.evidenceRequired ? "yes" : "no"}
                    </div>
                  </div>
                  <span className="rounded border border-white/10 bg-black/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                    {section.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{section.instructionText}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-cyan-500/15 bg-cyan-950/10 p-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">
              Inline section editor
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-300">
                Section label field
                <input
                  value={activeSection.label}
                  onChange={(event) => handleSectionPatch({ label: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-cyan-500/15 bg-black/50 p-3 text-sm text-slate-200 outline-none"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Required prefix field
                <input
                  value={activeSection.requiredPrefix ?? ""}
                  onChange={(event) => handleSectionPatch({ requiredPrefix: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-cyan-500/15 bg-black/50 p-3 text-sm text-slate-200 outline-none"
                  placeholder="Optional prefix"
                />
              </label>
            </div>

            <label className="mt-3 block text-xs font-semibold text-slate-300">
              Prompt instruction text area
              <textarea
                value={activeSection.instructionText}
                onChange={(event) => handleSectionPatch({ instructionText: event.target.value })}
                className="mt-2 min-h-28 w-full resize-y rounded-lg border border-cyan-500/15 bg-black/50 p-3 text-sm leading-6 text-slate-200 outline-none"
              />
            </label>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-xs font-semibold text-slate-300">
                Word limit field
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={activeSection.maxWords}
                  onChange={(event) => handleSectionPatch({ maxWords: Number(event.target.value) })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/50 p-3 text-sm text-slate-200 outline-none"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Sentence limit field
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={activeSection.maxSentences ?? 2}
                  onChange={(event) => handleSectionPatch({ maxSentences: Number(event.target.value) })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/50 p-3 text-sm text-slate-200 outline-none"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Output style dropdown
                <select
                  value={activeSection.noLineBreaksInsideSection ? "one_line" : "paragraph"}
                  onChange={(event) =>
                    handleSectionPatch({ noLineBreaksInsideSection: event.target.value === "one_line" })
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/50 p-3 text-sm text-slate-200 outline-none"
                >
                  <option value="paragraph">Paragraph only</option>
                  <option value="one_line">One line</option>
                </select>
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  handleSectionPatch({ requiredPrefix: activeSection.requiredPrefix ? "" : activeSection.label })
                }
                className={constraintButtonClass(Boolean(activeSection.requiredPrefix))}
              >
                Require prefix
              </button>
              <button
                type="button"
                onClick={() => handleSectionPatch({ noBullets: !activeSection.noBullets })}
                className={constraintButtonClass(activeSection.noBullets)}
              >
                No bullets
              </button>
              <button
                type="button"
                onClick={() => handleSectionPatch({ noTables: !activeSection.noTables })}
                className={constraintButtonClass(activeSection.noTables)}
              >
                No tables
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSectionPatch({ noLineBreaksInsideSection: !activeSection.noLineBreaksInsideSection })
                }
                className={constraintButtonClass(activeSection.noLineBreaksInsideSection)}
              >
                One line
              </button>
              <button
                type="button"
                onClick={() => handleSectionPatch({ noLineBreaksInsideSection: false })}
                className={constraintButtonClass(!activeSection.noLineBreaksInsideSection)}
              >
                Paragraph only
              </button>
              <button
                type="button"
                onClick={() => handleSectionPatch({ evidenceRequired: !activeSection.evidenceRequired })}
                className={constraintButtonClass(activeSection.evidenceRequired)}
              >
                Evidence required
              </button>
              <button
                type="button"
                onClick={() =>
                  setStorageMessage("Constraint noted in prompt policy; no transcript speaker claims are invented.")
                }
                className={constraintButtonClass(true)}
              >
                Do not mention counselor/speaker
              </button>
              <button
                type="button"
                onClick={() => handleSectionPatch({ insufficientEvidenceFallback: "Insufficient evidence" })}
                className={constraintButtonClass(true)}
              >
                Insufficient evidence fallback
              </button>
              <button
                type="button"
                onClick={() => setStorageMessage("More options remain intentionally compact in this first view.")}
                className={constraintButtonClass(false)}
              >
                More options
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-cyan-500/15 bg-black/40 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-cyan-100">
            <BookOpen className="h-5 w-5 text-cyan-300" />
            Deep Read and SubQ stages
          </h3>
          <div className="mt-4 space-y-3">
            {selectedMode.stageOrder.map((stage) => (
              <div key={stage} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">{stage}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 text-xs leading-5 text-slate-300">
            Long transcript recommendation: {recommendation.status}. {recommendation.reason}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-black/40 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-emerald-100">
            <Shield className="h-5 w-5 text-emerald-300" />
            Evidence and answer policy
          </h3>
          <div className="mt-4 space-y-3 text-xs leading-5 text-slate-300">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              Evidence index: {evidenceIndex.status} / {evidenceIndex.retrievalKind}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              First section evidence: {firstEvidenceResult.status}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              Hidden chain-of-thought exposed: {String(!synthesisPolicy.noHiddenChainOfThought)}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              Final output separator: {synthesisPolicy.finalOutputSeparator}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              Workflow failure preserves completed outputs:{" "}
              {String(PROMPT_LIBRARY_RUN_POLICY.preserveCompletedSectionOutputsOnFailure)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-500/15 bg-black/40 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-rose-100">
            <FileText className="h-5 w-5 text-rose-300" />
            Privacy and storage
          </h3>
          <div className="mt-4 space-y-3 text-xs leading-5 text-slate-300">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              No transcript text logged by default:{" "}
              {String(DEEP_TRANSCRIPT_PRIVACY_POLICY.transcriptTextLoggedByDefault)}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              Cloud RAG: {DEEP_TRANSCRIPT_PRIVACY_POLICY.cloudRagDefault}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              Cloud embeddings: {DEEP_TRANSCRIPT_PRIVACY_POLICY.cloudEmbeddingsDefault}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              Built-in edit behavior: {PROMPT_LIBRARY_AUTOSAVE_POLICY.builtInEditBehavior}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              Import preview: {importPreview.reason}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              Export includes transcript text: {String("transcriptText" in exportPreview)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-500/15 bg-[#080a13]/80 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h3 className="font-display text-xl font-bold text-cyan-100">Final Plain Text Output</h3>
            <p className="mt-1 text-xs text-slate-400">
              Each enabled section response is separated by line breaks. No bullets, tables, markdown table, or model
              commentary by default.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Object.keys(sectionOutputs).length === 0}
              className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
            >
              <Copy className="h-4 w-4" />
              Copy final output - Disabled until real section outputs exist
            </button>
            <button
              type="button"
              disabled
              className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
            >
              <CheckCircle className="h-4 w-4" />
              Run workflow - Local model not configured
            </button>
            <button
              type="button"
              onClick={handleSimulateSectionFailure}
              className="rounded-lg border border-amber-400/25 bg-amber-950/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-100"
            >
              Preview failed section preservation
            </button>
            <button
              type="button"
              onClick={handleClearRunPreview}
              className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300"
            >
              Clear preview outputs
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {selectedTemplate.sections
            .filter((section) => section.enabled)
            .map((section) => (
              <div key={section.sectionId} className="rounded-xl border border-white/10 bg-[#07080c] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-slate-100">{section.label}</div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {failedSectionId === section.sectionId ? "Failed / rerun allowed" : "Not run"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {failedSectionId === section.sectionId
                    ? "This section failed in the preview. Completed section outputs and prompt edits remain preserved."
                    : (sectionOutputs[section.sectionId] ??
                      "Section output will appear here after a real local model run.")}
                </p>
              </div>
            ))}
        </div>

        <textarea
          readOnly
          value={finalOutputPreview}
          className="mt-4 min-h-44 w-full resize-y rounded-xl border border-cyan-500/15 bg-[#07080c] p-4 text-sm leading-6 text-slate-200 outline-none"
        />
        <div className="mt-3 rounded-lg border border-violet-500/15 bg-violet-950/10 p-3 text-xs leading-5 text-violet-100">
          Built-in template edit creates custom copy preview: {customCopyPreview.templateName}
        </div>
      </section>
    </div>
  );
}
