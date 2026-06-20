import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, CloudOff, Copy, FileText, FolderOpen, Shield } from "lucide-react";

import {
  DEFAULT_CLINICAL_PROMPT_TEMPLATE,
  buildPendingClinicalSectionResults,
  clinicalWorkflowDoesNotAffectReleaseGate,
  getClinicalDraftDisclaimer,
  getDefaultClinicalWorkflowReadiness,
} from "../services/clinicalPromptWorkflow";
import {
  CLINICAL_PRIVACY_LANGUAGE,
  canSendPhiToCloud,
  getClinicalPrivacyMode,
  getCloudPhiWarning,
} from "../services/clinicalPrivacyPolicy";
import {
  CLINICAL_DRAFT_QUALITY_CHECKS,
  CLINICAL_LOCAL_MODEL_CATALOG,
  CLINICAL_LOCAL_MODEL_PROVIDER_STRATEGY,
  CLINICAL_PROMPT_PROOF_TESTS,
  CLINICAL_SYNTHETIC_NON_PHI_TRANSCRIPT,
  clinicalLocalModelDoesNotAffectReleaseGate,
  getClinicalPromptTestReadiness,
  getClinicalProviderStrategy,
  getDefaultClinicalLocalModel,
} from "../services/localClinicalModelPolicy";

export default function ClinicalWorkflowBuilder() {
  const [activeSectionId, setActiveSectionId] = useState(DEFAULT_CLINICAL_PROMPT_TEMPLATE.sections[0].id);
  const [selectedModelId, setSelectedModelId] = useState(getDefaultClinicalLocalModel().id);
  const readiness = useMemo(() => getDefaultClinicalWorkflowReadiness(), []);
  const sectionResults = useMemo(() => buildPendingClinicalSectionResults(), []);
  const privacyMode = useMemo(() => getClinicalPrivacyMode(), []);
  const promptTestReadiness = useMemo(() => getClinicalPromptTestReadiness(), []);
  const cloudDecision = useMemo(
    () => canSendPhiToCloud({ cloudEnabled: false, explicitConsent: false, baaDocumented: false }),
    [],
  );
  const selectedModel =
    CLINICAL_LOCAL_MODEL_CATALOG.find((model) => model.id === selectedModelId) ?? getDefaultClinicalLocalModel();
  const selectedProviderStrategy = getClinicalProviderStrategy(selectedModel.provider);
  const activeSection =
    DEFAULT_CLINICAL_PROMPT_TEMPLATE.sections.find((section) => section.id === activeSectionId) ??
    DEFAULT_CLINICAL_PROMPT_TEMPLATE.sections[0];
  const activeResult = sectionResults.find((result) => result.sectionId === activeSection.id) ?? sectionResults[0];

  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-2xl border border-sky-500/15 bg-[#080a13]/85 p-6 shadow-2xl backdrop-blur-3xl">
        <div className="flex flex-col gap-4 border-b border-sky-500/15 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-amber-400/25 bg-amber-950/25 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                LOCAL_LLM_NOT_CONFIGURED
              </span>
              <span className="rounded-md border border-sky-400/25 bg-sky-950/25 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-sky-200">
                HIPAA-aware local-first draft workflow
              </span>
              <span className="rounded-md border border-slate-500/30 bg-slate-950/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Browser Preview / Manual Paste Only
              </span>
            </div>
            <h2 className="flex items-center gap-3 font-display text-2xl font-bold text-sky-100">
              <FileText className="h-6 w-6 text-sky-300" />
              Clinical Workflow Builder
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Prompt Workflow Builder for converting a local transcript into clinician-reviewed draft
              sections. No generated content exists yet, no PHI is uploaded by default, and cloud model
              use stays disabled.
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/25 bg-rose-950/20 p-4 text-sm text-rose-100 lg:max-w-sm">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              Review required
            </div>
            <p className="leading-6">{getClinicalDraftDisclaimer()}</p>
            <p className="mt-3 text-xs leading-5 text-rose-200/90">{clinicalWorkflowDoesNotAffectReleaseGate()}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {readiness.map((item) => (
            <div key={item.code} className="rounded-xl border border-white/10 bg-black/35 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-100">{item.label}</h3>
                <span className="rounded border border-white/10 bg-black/50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
                  {item.code}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{item.message}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-500/15 bg-[#080a13]/80 p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-emerald-400/25 bg-emerald-950/25 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                Clinical Local Model Lane
              </span>
              <span className="rounded-md border border-amber-400/25 bg-amber-950/25 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                {promptTestReadiness.status}
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-emerald-100">Drafting Model</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Choose a curated local chat model for short structured clinical draft sections. This lane is
              local-first, draft-only, and separate from stem-separation proof.
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/25 bg-rose-950/20 p-4 text-xs leading-5 text-rose-100 lg:max-w-sm">
            {clinicalLocalModelDoesNotAffectReleaseGate()}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-white/10 bg-black/35 p-4">
            <label className="block text-xs font-semibold text-slate-300">
              Selected model
              <select
                value={selectedModelId}
                onChange={(event) => setSelectedModelId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-emerald-500/20 bg-black/60 px-3 py-2 font-mono text-xs text-emerald-100 outline-none"
              >
                {CLINICAL_LOCAL_MODEL_CATALOG.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.tierLabel} - {model.displayName}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["Provider", selectedProviderStrategy.label],
                ["Model tier", selectedModel.tierLabel],
                ["Installed/missing", selectedModel.localInstalledState],
                ["Recommended RAM", selectedModel.ramEstimate],
                ["Expected speed", selectedModel.speedEstimate],
                ["Quality estimate", selectedModel.qualityEstimate],
                ["Context size", selectedModel.contextLength],
                ["Privacy mode", "Local-first / no PHI uploaded by default"],
                ["Proof-of-concept status", selectedModel.proofTaskStatus],
                ["License", selectedModel.license],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {label}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-200">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Clinical caution
              </div>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                {selectedModel.clinicalCautionNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-4">
            <h4 className="font-display text-lg font-bold text-emerald-100">Provider readiness</h4>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Local provider checks are Planned / Manual setup required until Electron IPC probes are
              implemented. Ollama is the first target; llama.cpp and GPT4All stay future/reference lanes.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {CLINICAL_LOCAL_MODEL_PROVIDER_STRATEGY.map((strategy) => (
                <div key={strategy.provider} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-100">{strategy.label}</span>
                    <span className="rounded border border-white/10 bg-black/50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
                      {strategy.defaultState}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{strategy.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {[
                "Check Local Provider",
                "Refresh Local Models",
                "Pull/Install Model - Planned / Manual setup required",
                "Run Clinical Draft Test",
                "Clear Model Selection",
                "Open Setup Guide",
              ].map((label) => (
                <button
                  key={label}
                  disabled
                  className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              disabled
              className="mt-3 w-full rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-200 opacity-70"
            >
              Run Workflow - Local model not configured
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-white/10 bg-black/35 p-4">
            <h4 className="font-display text-lg font-bold text-emerald-100">Synthetic clinical draft test</h4>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Test transcript: {CLINICAL_SYNTHETIC_NON_PHI_TRANSCRIPT}
            </p>
            <div className="mt-3 space-y-2">
              {CLINICAL_PROMPT_PROOF_TESTS.map((test) => (
                <div key={test.id} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {test.sectionTitle}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{test.prompt}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-4">
            <h4 className="font-display text-lg font-bold text-emerald-100">Quality guardrails</h4>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Transcript may exceed selected model context. Use chunking or choose a larger-context model.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CLINICAL_DRAFT_QUALITY_CHECKS.map((check) => (
                <div key={check.id} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    {check.label}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{check.rule}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-sky-500/15 bg-black/40 p-5">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-sky-100">Transcript Input</h3>
              <p className="mt-1 text-xs text-slate-400">
                Paste-only preview. TXT, VTT, SRT, PDF, DOCX, and Zoom transcript import are Planned /
                Not active until native import and privacy checks exist.
              </p>
            </div>
            <button
              disabled
              className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Import transcript - Native required
            </button>
          </div>
          <textarea
            readOnly
            value=""
            placeholder="Paste transcript text here after local transcription output is verified. This scaffold does not run a model or save PHI."
            className="mt-4 min-h-64 w-full resize-y rounded-xl border border-sky-500/15 bg-[#07080c] p-4 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600"
          />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {["TXT/VTT/SRT import - Planned", "PDF/DOCX import - Planned", "Zoom transcript import - Planned"].map(
              (label) => (
                <div key={label} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    {label}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Import must verify local file type and avoid logging transcript text.
                  </p>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/15 bg-black/40 p-5">
          <h3 className="font-display text-xl font-bold text-sky-100">Workflow Template</h3>
          <p className="mt-1 text-xs text-slate-400">{DEFAULT_CLINICAL_PROMPT_TEMPLATE.description}</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-[#07080c] p-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Active template
            </div>
            <div className="mt-2 text-sm font-bold text-slate-100">{DEFAULT_CLINICAL_PROMPT_TEMPLATE.name}</div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Each section is generated separately later, then manually reviewed before the unified EHR
              text box can be copied or exported.
            </p>
          </div>
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Evidence rule
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              If a section is not supported by the transcript, the output must say Insufficient evidence
              instead of filling the gap.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-sky-500/15 bg-black/40 p-5">
          <h3 className="font-display text-xl font-bold text-sky-100">Prompt Sections</h3>
          <p className="mt-1 text-xs text-slate-400">
            Default prompts are editable later, but this alpha keeps them visible and inactive.
          </p>
          <div className="mt-4 space-y-3">
            {DEFAULT_CLINICAL_PROMPT_TEMPLATE.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionId(section.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  section.id === activeSection.id
                    ? "border-sky-400/40 bg-sky-950/20"
                    : "border-white/10 bg-[#07080c] hover:border-sky-500/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-bold text-slate-100">{section.title}</span>
                  <span className="rounded border border-amber-400/20 bg-amber-950/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
                    {section.outputStatus}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{section.prompt}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/15 bg-black/40 p-5">
          <h3 className="font-display text-xl font-bold text-sky-100">Section Outputs</h3>
          <p className="mt-1 text-xs text-slate-400">
            Separate boxes prevent one successful-looking paragraph from implying the whole workflow ran.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-[#07080c] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-100">{activeSection.title}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Required prefix: {activeSection.requiredPrefix}
                </div>
              </div>
              <span className="rounded border border-amber-400/20 bg-amber-950/20 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
                {activeResult.status}
              </span>
            </div>
            <textarea
              readOnly
              value={activeResult.text}
              className="mt-4 min-h-36 w-full resize-y rounded-lg border border-slate-600/30 bg-black/50 p-3 text-sm leading-6 text-slate-300 outline-none"
            />
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Output verification pending. Generated clinical text cannot be marked verified until a real
              local model run completes and the clinician reviews it.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-500/15 bg-black/40 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-100">
            <Shield className="h-5 w-5 text-sky-300" />
            Prompt run controls
          </h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Local Model / Engine remains not configured. Run each prompt section separately once a real
            local provider passes checks.
          </p>
          <div className="mt-4 space-y-3">
            {[
              "Run one section - Planned",
              "Run all sections sequentially - Planned",
              "Rerun failed section - Planned",
              "Copy section output - Disabled until verified draft exists",
              "Combine outputs into unified EHR draft - Review required",
            ].map((label) => (
              <div key={label} className="rounded-lg border border-white/10 bg-[#07080c] p-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  {label}
                </div>
              </div>
            ))}
          </div>
          <button
            disabled
            className="mt-4 w-full rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-200 opacity-70"
          >
            Run Workflow - Local model not configured
          </button>
        </div>

        <div className="rounded-2xl border border-slate-500/15 bg-black/40 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-100">
            <CloudOff className="h-5 w-5 text-rose-300" />
            Cloud and privacy boundary
          </h3>
          <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-950/10 p-3">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-200">
              CLOUD_LLM_DISABLED
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Cloud model disabled by default. No PHI is uploaded by default. {getCloudPhiWarning()}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Decision: {cloudDecision.state}. {cloudDecision.reason}
            </p>
          </div>
          <div className="mt-3 rounded-lg border border-sky-500/15 bg-sky-950/10 p-3">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-200">
              {privacyMode.label}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              {CLINICAL_PRIVACY_LANGUAGE.notComplianceClaim}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-500/15 bg-black/40 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-100">
            <FolderOpen className="h-5 w-5 text-cyan-300" />
            History and export
          </h3>
          <div className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                History disabled
              </div>
              <p className="mt-2">Metadata-only history can be added later with transcript text off by default.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#07080c] p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Export requires user-selected output path
              </div>
              <p className="mt-2">Export file verification required before any local file is shown as complete.</p>
            </div>
            <button
              disabled
              className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Clear transcript from screen - Planned
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-sky-500/15 bg-[#080a13]/80 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h3 className="font-display text-xl font-bold text-sky-100">Unified EHR Text Box</h3>
            <p className="mt-1 text-xs text-slate-400">
              The unified box stays empty until each section has real draft text and clinician review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled
              className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
            >
              <Copy className="h-4 w-4" />
              Copy disabled until verified local draft exists
            </button>
            <button
              disabled
              className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
            >
              <CheckCircle className="h-4 w-4" />
              Mark reviewed - Planned
            </button>
          </div>
        </div>
        <textarea
          readOnly
          value=""
          placeholder="Unified EHR-ready text appears here only after local draft generation and clinician review. Draft only - clinician review required before EHR entry."
          className="mt-4 min-h-44 w-full resize-y rounded-xl border border-sky-500/15 bg-[#07080c] p-4 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600"
        />
      </section>
    </div>
  );
}
