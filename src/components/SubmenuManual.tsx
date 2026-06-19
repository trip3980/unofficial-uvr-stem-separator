import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, ChevronDown, ChevronUp, AlertTriangle, Lightbulb } from "lucide-react";
import { submenuManuals, ManualContent } from "../data/submenuManuals";

const MANUAL_STATE_EVENT = "uvr_manual_state_changed";

// Centralized safe localStorage helpers to prevent any runtime crashes or malformed JSON parsing failures
const safeReadManualGlobalEnabled = (): boolean => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return true;
    const val = localStorage.getItem("uvr6_manual_global_enabled");
    return val !== "false"; // default to true
  } catch (e) {
    console.warn("Storage error while loading global manual enabled", e);
    return true;
  }
};

const safeWriteManualGlobalEnabled = (value: boolean): void => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("uvr6_manual_global_enabled", String(value));
    }
  } catch (e) {
    console.warn("Failed to persist manual global enable status", e);
  }
};

const safeReadManualSections = (): Record<string, boolean> => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return {};
    const stored = localStorage.getItem("uvr6_manual_sections");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, boolean>;
      }
    }
    return {};
  } catch (e) {
    console.warn("Storage error while parsing manual sections state", e);
    return {};
  }
};

const safeWriteManualSections = (sections: Record<string, boolean>): void => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("uvr6_manual_sections", JSON.stringify(sections));
    }
  } catch (e) {
    console.warn("Failed to persist manual sections state", e);
  }
};

const safeReadSectionOpen = (id: string): boolean => {
  const sections = safeReadManualSections();
  return !!sections[id]; // default to closed (false)
};

interface SubmenuManualProps {
  sectionId: string;
}

export default function SubmenuManual({ sectionId }: SubmenuManualProps) {
  const manual: ManualContent | undefined = submenuManuals[sectionId];

  // Global manual enabled toggle state
  const [globalEnabled, setGlobalEnabled] = useState<boolean>(() => safeReadManualGlobalEnabled());

  // Local open/expanded state for this specific section
  const [isOpen, setIsOpen] = useState<boolean>(() => safeReadSectionOpen(sectionId));

  // Reload section open state when sectionId changes (e.g. if component stays mounted across submenu changes)
  useEffect(() => {
    setIsOpen(safeReadSectionOpen(sectionId));
  }, [sectionId]);

  // Effect to sync localStorage if modified externally or in session
  useEffect(() => {
    const handleStorageChange = () => {
      setGlobalEnabled(safeReadManualGlobalEnabled());
      setIsOpen(safeReadSectionOpen(sectionId));
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(MANUAL_STATE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(MANUAL_STATE_EVENT, handleStorageChange);
    };
  }, [sectionId]);

  const toggleManual = useCallback(() => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    const sections = safeReadManualSections();
    sections[sectionId] = nextState;
    safeWriteManualSections(sections);
    try {
      window.dispatchEvent(new CustomEvent(MANUAL_STATE_EVENT, {
        detail: { sectionId, globalEnabled, isOpen: nextState }
      }));
    } catch (e) {
      window.dispatchEvent(new Event(MANUAL_STATE_EVENT));
    }
  }, [isOpen, sectionId, globalEnabled]);

  const toggleGlobal = useCallback(() => {
    const nextVal = !globalEnabled;
    setGlobalEnabled(nextVal);
    safeWriteManualGlobalEnabled(nextVal);
    try {
      window.dispatchEvent(new CustomEvent(MANUAL_STATE_EVENT, {
        detail: { sectionId, globalEnabled: nextVal, isOpen }
      }));
    } catch (e) {
      window.dispatchEvent(new Event(MANUAL_STATE_EVENT));
    }
  }, [globalEnabled, sectionId, isOpen]);

  // If no manual data exists, render nothing
  if (!manual) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`No SubmenuManual content found for sectionId: ${sectionId}`);
    }
    return null;
  }

  // Safe manual content fallback values to ensure partial or malformed manual records can never crash rendering
  const subtitle = manual.subtitle || "Reference guide";
  const whatItDoes = manual.whatItDoes || "";
  const whenToUse = Array.isArray(manual.whenToUse) ? manual.whenToUse : [];
  const workflow = Array.isArray(manual.workflow) ? manual.workflow : [];
  const settingsThatMatter = Array.isArray(manual.settingsThatMatter) ? manual.settingsThatMatter : [];
  const commonMistakes = Array.isArray(manual.commonMistakes) ? manual.commonMistakes : [];
  const limitations = Array.isArray(manual.limitations) ? manual.limitations : [];
  const faq = Array.isArray(manual.faq) ? manual.faq : [];

  // If globally disabled, render a clear, highly visible and mobile/desktop accessible button to re-enable
  if (!globalEnabled) {
    return (
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleGlobal}
          title="Reference guides are hidden globally. Click to show them again."
          aria-pressed={false}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b130f]/60 hover:bg-[#0b130f]/90 border border-green-500/15 text-green-400 hover:text-green-300 font-mono text-[10px] uppercase font-bold tracking-wider transition-all select-none focus:outline-none focus-visible:ring focus-visible:ring-indigo-500/40 focus-visible:ring-offset-0 whitespace-nowrap cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          Show Reference Guides
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl bg-[#090c15]/60 hover:bg-[#090c15]/80 border border-indigo-500/10 hover:border-indigo-500/20 shadow-lg backdrop-blur-xl transition-all duration-300 overflow-hidden min-w-0">
      {/* HEADER BAR (No nested interactive elements; accessible sibling triggers) */}
      <div className="p-4 flex items-center justify-between gap-4 select-none flex-wrap sm:flex-nowrap">
        <button
          id={`manual-header-${sectionId}`}
          aria-expanded={isOpen}
          aria-controls={`manual-panel-${sectionId}`}
          onClick={toggleManual}
          className="flex-1 flex items-center justify-between text-left group focus:outline-none focus-visible:ring focus-visible:ring-indigo-500/40 focus-visible:ring-offset-0 rounded-lg p-1 transition-all min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 shrink-0 transition-colors" />
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-mono truncate">
                Manual / Help Guide
              </h3>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5 line-clamp-1 max-w-[280px] sm:max-w-md md:max-w-2xl break-words whitespace-normal">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="p-1 rounded-lg bg-indigo-500/5 group-hover:bg-indigo-500/10 border border-indigo-500/10 group-hover:border-indigo-500/20 text-indigo-300 shrink-0 transition-all ml-2">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Global guide status toggle (distinct sibling element, not nested, fully mobile-visible) */}
        <div className="shrink-0 flex items-center justify-end w-full sm:w-auto">
          <button
            aria-pressed={true}
            onClick={toggleGlobal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 border border-slate-700/50 hover:bg-black/70 hover:border-slate-500 text-[9px] text-slate-400 font-mono uppercase font-semibold transition-all focus:outline-none focus-visible:ring focus-visible:ring-indigo-500/40 focus-visible:ring-offset-0 cursor-pointer whitespace-nowrap"
            title="Hide reference guides globally"
            aria-label="Hide reference guides globally"
          >
            <span className="hidden xs:inline">Hide Guides</span>
            <span className="xs:hidden">Hide</span>
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE BODY */}
      {isOpen && (
        <div
          id={`manual-panel-${sectionId}`}
          role="region"
          aria-labelledby={`manual-header-${sectionId}`}
          className="p-5 border-t border-indigo-500/10 bg-black/35 text-xs text-slate-300 font-sans leading-relaxed space-y-5 min-w-0 break-words"
        >
          {/* Subtitle / Intro */}
          <div className="text-slate-200 bg-indigo-950/10 border-l-2 border-indigo-500/30 pl-3 py-1 min-w-0 leading-normal">
            <p className="text-slate-300 break-words whitespace-normal font-sans">{subtitle}</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Left Column: Core Description & Workflow */}
            <div className="space-y-4 min-w-0">
              {/* What It Does Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                  1. What This Section Does
                </span>
                {whatItDoes ? (
                  <p className="text-slate-300 bg-[#0d0e19]/40 p-3 rounded-xl border border-slate-800/60 leading-relaxed font-sans break-words whitespace-normal">
                    {whatItDoes}
                  </p>
                ) : (
                  <p className="text-slate-500 italic p-2 leading-relaxed">No description configured for this section.</p>
                )}
              </div>

              {/* Best Used For Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                  2. Best Used For
                </span>
                {whenToUse.length > 0 ? (
                  <ul className="list-disc list-inside pl-1 space-y-1 text-slate-300">
                    {whenToUse.map((item, idx) => (
                      <li key={idx} className="whitespace-normal break-words leading-relaxed pl-1">{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 italic p-2">No guide entries configured for this section.</p>
                )}
              </div>

              {/* Basic Workflow Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                  3. Basic Workflow
                </span>
                {workflow.length > 0 ? (
                  <ol className="list-decimal list-inside pl-1 space-y-1.5 text-slate-300">
                    {workflow.map((item, idx) => (
                      <li key={idx} className="whitespace-normal break-words leading-relaxed pl-1 font-sans">
                        <span className="text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-slate-500 italic p-2">No workflow items configured for this section.</p>
                )}
              </div>
            </div>

            {/* Right Column: Settings, Mistakes & FAQ */}
            <div className="space-y-4 min-w-0">
              {/* Settings that matter */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                  4. Crucial Settings
                </span>
                {settingsThatMatter.length > 0 ? (
                  <div className="space-y-2">
                    {settingsThatMatter.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-black/40 border border-[#ffffff]/5 min-w-0 break-words">
                        <span className="font-mono text-[10px] uppercase font-bold text-indigo-300 block mb-0.5">
                          {item.name}
                        </span>
                        <p className="text-slate-400 text-[11px] leading-relaxed font-sans break-words whitespace-normal">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic p-2">No specific settings guidelines configured.</p>
                )}
              </div>

              {/* Common Mistakes */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-amber-500 font-bold block flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  5. Common Mistakes to Avoid
                </span>
                {commonMistakes.length > 0 ? (
                  <ul className="list-disc list-inside pl-1 space-y-1 text-slate-300">
                    {commonMistakes.map((item, idx) => (
                      <li key={idx} className="whitespace-normal break-words leading-relaxed pl-1 text-[11px]">{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 italic p-2">No recorded mistakes configured.</p>
                )}
              </div>
            </div>
          </div>

          {/* Honest Limitations Panel */}
          <div className="p-4 rounded-xl bg-purple-950/10 border border-purple-500/15 space-y-1.5 text-slate-300 min-w-0">
            <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
              Honest Architecture Limitations
            </span>
            {limitations.length > 0 ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 pl-1 list-disc list-inside text-[11px]">
                {limitations.map((limit, idx) => (
                  <li key={idx} className="whitespace-normal break-words leading-relaxed pl-1">{limit}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 italic text-[11px]">No architecture limits listed.</p>
            )}
          </div>

          {/* FAQ Section */}
          <div className="space-y-3 pt-2 border-t border-[#ffffff]/5 min-w-0">
            <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
              Frequently Asked Questions (FAQ)
            </span>
            {faq.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {faq.map((item, idx) => (
                  <div key={idx} className="space-y-1 bg-[#090b14]/50 p-3 rounded-lg border border-slate-900 leading-normal min-w-0 break-words">
                    <span className="font-semibold text-slate-200 block text-[11px] font-sans break-words whitespace-normal">
                      Q: {item.q}
                    </span>
                    <p className="text-slate-400 text-[11px] leading-relaxed font-sans break-words whitespace-normal">
                      A: {item.a}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic select-none">No FAQ entries configured.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
