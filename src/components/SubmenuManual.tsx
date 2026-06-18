import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, ChevronDown, ChevronUp, AlertTriangle, Lightbulb } from "lucide-react";
import { submenuManuals, ManualContent } from "../data/submenuManuals";

interface SubmenuManualProps {
  sectionId: string;
}

export default function SubmenuManual({ sectionId }: SubmenuManualProps) {
  const manual: ManualContent | undefined = submenuManuals[sectionId];

  // Global manual enable toggle
  const [globalEnabled, setGlobalEnabled] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem("uvr6_manual_global_enabled");
      return val !== "false"; // default to true
    } catch (e) {
      console.warn("Storage error while loading global manual enabled", e);
      return true;
    }
  });

  // Local open/expanded state for this specific section
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("uvr6_manual_sections");
      if (stored) {
        const sections = JSON.parse(stored);
        return !!sections[sectionId]; // default to closed (false) unless stored as true
      }
      return false; // Collapsed by default as requested
    } catch (e) {
      console.warn("Storage error while loading manual sections state", e);
      return false;
    }
  });

  // Effect to sync localStorage if modified externally or in session
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const val = localStorage.getItem("uvr6_manual_global_enabled");
        setGlobalEnabled(val !== "false");

        const stored = localStorage.getItem("uvr6_manual_sections");
        if (stored) {
          const sections = JSON.parse(stored);
          setIsOpen(!!sections[sectionId]);
        }
      } catch (e) {
        console.warn("Storage sync failed", e);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("uvr_manual_state_changed", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("uvr_manual_state_changed", handleStorageChange);
    };
  }, [sectionId]);

  const toggleManual = useCallback(() => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    try {
      const stored = localStorage.getItem("uvr6_manual_sections");
      const sections = stored ? JSON.parse(stored) : {};
      sections[sectionId] = nextState;
      localStorage.setItem("uvr6_manual_sections", JSON.stringify(sections));
    } catch (e) {
      console.error("Failed to persist manual section open state", e);
    }
    window.dispatchEvent(new Event("uvr_manual_state_changed"));
  }, [isOpen, sectionId]);

  const toggleGlobal = useCallback(() => {
    const nextVal = !globalEnabled;
    setGlobalEnabled(nextVal);
    try {
      localStorage.setItem("uvr6_manual_global_enabled", String(nextVal));
    } catch (e) {
      console.error("Failed to persist manual global enable", e);
    }
    window.dispatchEvent(new Event("uvr_manual_state_changed"));
  }, [globalEnabled]);

  // If no manual data exists, render nothing
  if (!manual) {
    return null;
  }

  // If globally disabled, render a tiny ribbon to re-enable, so the user never gets locked out of the help panels
  if (!globalEnabled) {
    return (
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleGlobal}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0b130f]/60 hover:bg-[#0b130f]/90 border border-green-500/15 text-green-400 hover:text-green-300 font-mono text-[10px] uppercase font-bold tracking-wider transition-all select-none"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Enable Reference Guides
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl bg-[#090c15]/60 hover:bg-[#090c15]/80 border border-indigo-500/10 hover:border-indigo-500/20 shadow-lg backdrop-blur-xl transition-all duration-300 overflow-hidden">
      {/* HEADER BAR */}
      <div 
        onClick={toggleManual}
        className="p-4 flex items-center justify-between cursor-pointer select-none gap-4"
        role="button"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleManual();
          }
        }}
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-mono">
              Manual / Help Guide
            </h3>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5 line-clamp-1 max-w-[280px] sm:max-w-md md:max-w-2xl">
              {manual.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleGlobal();
            }}
            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-slate-700/50 hover:bg-black/70 hover:border-slate-500 text-[9px] text-slate-400 font-mono uppercase font-semibold transition-all"
            title="Hide all manuals across the app"
          >
            Hide All Guides
          </button>
          <div className="p-1 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-indigo-300">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE BODY */}
      {isOpen && (
        <div className="p-5 border-t border-indigo-500/10 bg-black/35 text-xs text-slate-300 font-sans leading-relaxed space-y-5">
          {/* Subtitle / Intro */}
          <div className="text-slate-200 bg-indigo-950/10 border-l-2 border-indigo-500/30 pl-3 py-1">
            <p className="text-slate-300">{manual.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Left Column: Core Description & Workflow */}
            <div className="space-y-4">
              {/* What It Does Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                  1. What This Section Does
                </span>
                <p className="text-slate-300 bg-[#0d0e19]/40 p-3 rounded-xl border border-slate-800/60 leading-relaxed font-sans">
                  {manual.whatItDoes}
                </p>
              </div>

              {/* Best Used For Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                  2. Best Used For
                </span>
                <ul className="list-disc list-inside pl-1 space-y-1 text-slate-300">
                  {manual.whenToUse.map((item, idx) => (
                    <li key={idx} className="whitespace-normal break-words leading-relaxed pl-1">{item}</li>
                  ))}
                </ul>
              </div>

              {/* Basic Workflow Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                  3. Basic Workflow
                </span>
                <ol className="list-decimal list-inside pl-1 space-y-1.5 text-slate-300">
                  {manual.workflow.map((item, idx) => (
                    <li key={idx} className="whitespace-normal break-words leading-relaxed pl-1 font-sans">
                      <span className="text-slate-300">{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Right Column: Settings, Mistakes & FAQ */}
            <div className="space-y-4">
              {/* Settings that matter */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                  4. Crucial Settings
                </span>
                <div className="space-y-2">
                  {manual.settingsThatMatter.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-black/40 border border-[#ffffff]/5">
                      <span className="font-mono text-[10px] uppercase font-bold text-indigo-300 block mb-0.5">
                        {item.name}
                      </span>
                      <p className="text-slate-400 text-[11px] leading-relaxed font-sans">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Mistakes */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-amber-500 font-bold block flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  5. Common Mistakes to Avoid
                </span>
                <ul className="list-disc list-inside pl-1 space-y-1 text-slate-300">
                  {manual.commonMistakes.map((item, idx) => (
                    <li key={idx} className="whitespace-normal break-words leading-relaxed pl-1 text-[11px]">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Honest Limitations Panel */}
          <div className="p-4 rounded-xl bg-purple-950/10 border border-purple-500/15 space-y-1.5 text-slate-300">
            <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
              Honest Architecture Limitations
            </span>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 pl-1 list-disc list-inside text-[11px]">
              {manual.limitations.map((limit, idx) => (
                    <li key={idx} className="whitespace-normal break-words leading-relaxed pl-1">{limit}</li>
              ))}
            </ul>
          </div>

          {/* FAQ Section */}
          <div className="space-y-3 pt-2 border-t border-[#ffffff]/5">
            <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
              Frequently Asked Questions (FAQ)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {manual.faq.map((item, idx) => (
                <div key={idx} className="space-y-1 bg-[#090b14]/50 p-3 rounded-lg border border-slate-900 leading-normal">
                  <span className="font-semibold text-slate-200 block text-[11px] font-sans">
                    Q: {item.q}
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
                    A: {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
