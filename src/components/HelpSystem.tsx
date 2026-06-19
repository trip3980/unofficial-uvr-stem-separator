import React, { useState, useEffect, useCallback, useRef } from "react";
import { HelpCircle, ToggleLeft, ToggleRight, Info } from "lucide-react";
import InteractiveTooltip from "./InteractiveTooltip";

// Safe JSON parser helper
function getLocalStorageJSON<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error parsing localStorage key: ${key}`, e);
    return defaultValue;
  }
}

export interface UseHelpResult {
  globalEnabled: boolean;
  sectionEnabled: boolean;
  toggleGlobal: () => void;
  toggleSection: () => void;
  showHelp: boolean; // Computed: True if both global and section are enabled
}

export function useHelp(sectionId: string): UseHelpResult {
  const [globalEnabled, setGlobalEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("uvr6_help_global_enabled");
      return stored !== "false"; // Default to true if not present
    } catch {
      return true;
    }
  });

  const [sectionEnabled, setSectionEnabled] = useState<boolean>(() => {
    const sections = getLocalStorageJSON<Record<string, boolean>>("uvr6_help_sections", {});
    return sections[sectionId] !== false; // Default section help as enabled unless explicitly set false
  });

  // Keep state synchronized across instances/tabs
  useEffect(() => {
    const syncState = () => {
      try {
        const storedGlobal = localStorage.getItem("uvr6_help_global_enabled");
        setGlobalEnabled(storedGlobal !== "false");

        const sections = getLocalStorageJSON<Record<string, boolean>>("uvr6_help_sections", {});
        setSectionEnabled(sections[sectionId] !== false);
      } catch (e) {
        console.error("Error synchronizing help state:", e);
      }
    };

    window.addEventListener("storage", syncState);
    window.addEventListener("uvr_help_state_changed", syncState);
    return () => {
      window.removeEventListener("storage", syncState);
      window.removeEventListener("uvr_help_state_changed", syncState);
    };
  }, [sectionId]);

  const toggleGlobal = useCallback(() => {
    const nextVal = !globalEnabled;
    try {
      localStorage.setItem("uvr6_help_global_enabled", String(nextVal));
    } catch (e) {
      console.error(e);
    }
    setGlobalEnabled(nextVal);
    window.dispatchEvent(new Event("uvr_help_state_changed"));
  }, [globalEnabled]);

  const toggleSection = useCallback(() => {
    const nextVal = !sectionEnabled;
    try {
      const sections = getLocalStorageJSON<Record<string, boolean>>("uvr6_help_sections", {});
      sections[sectionId] = nextVal;
      localStorage.setItem("uvr6_help_sections", JSON.stringify(sections));
    } catch (e) {
      console.error(e);
    }
    setSectionEnabled(nextVal);
    window.dispatchEvent(new Event("uvr_help_state_changed"));
  }, [sectionEnabled, sectionId]);

  return {
    globalEnabled,
    sectionEnabled,
    toggleGlobal,
    toggleSection,
    showHelp: globalEnabled && sectionEnabled,
  };
}

interface HelpToggleProps {
  sectionId: string;
  label?: string;
  className?: string;
}

export function HelpToggle({ sectionId, label = "Inline Help", className = "" }: HelpToggleProps) {
  const { globalEnabled, sectionEnabled, toggleSection } = useHelp(sectionId);

  // Return empty if globally disabled, but according to user guidelines, we can show it so the user can easily toggle.
  if (!globalEnabled) {
    return null;
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        toggleSection();
      }}
      aria-label={`Toggle inline help for ${label}`}
      className={`flex items-center gap-1.5 px-2 py-1 rounded bg-[#0b130e]/40 border border-green-500/20 text-green-400 hover:text-green-300 hover:bg-[#0b130e]/75 hover:border-green-400/40 font-mono text-[9px] uppercase font-bold tracking-wider transition-all select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-400 ${className}`}
    >
      <HelpCircle className="w-3.5 h-3.5" />
      <span>{label}:</span>
      {sectionEnabled ? (
        <span className="text-emerald-400 font-extrabold flex items-center gap-1">
          ON <ToggleRight className="w-4 h-4 text-emerald-400" />
        </span>
      ) : (
        <span className="text-slate-500 font-normal flex items-center gap-1">
          OFF <ToggleLeft className="w-4 h-4 text-slate-500" />
        </span>
      )}
    </button>
  );
}

interface HelpTextProps {
  sectionId: string;
  text: React.ReactNode;
  className?: string;
}

export function HelpText({ sectionId, text, className = "" }: HelpTextProps) {
  const { showHelp } = useHelp(sectionId);

  if (!showHelp) return null;

  return (
    <div className={`mt-1.5 text-[10px] leading-relaxed text-slate-400 font-sans italic bg-emerald-950/10 border-l border-emerald-500/20 pl-2 py-0.5 select-none ${className}`}>
      {text}
    </div>
  );
}

interface AccessibleTooltipWrapperProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
  position?: "top" | "bottom";
}

export function AccessibleTooltipWrapper({
  content,
  children,
  className = "",
  position = "bottom",
}: AccessibleTooltipWrapperProps) {
  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility triggers
  const handleFocus = () => setShow(true);
  const handleBlur = () => setShow(false);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShow(false);
    }
  };

  // Clone child to apply keyboard event handlers and styling classes
  const childElement = children as React.ReactElement<any>;
  const interactiveChild = React.cloneElement(childElement, {
    onFocus: (e: React.FocusEvent) => {
      handleFocus();
      if (childElement.props.onFocus) childElement.props.onFocus(e);
    },
    onBlur: (e: React.FocusEvent) => {
      handleBlur();
      if (childElement.props.onBlur) childElement.props.onBlur(e);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      handleKeyDown(e);
      if (childElement.props.onKeyDown) childElement.props.onKeyDown(e);
    },
    className: `${childElement.props.className || ""} focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-400`,
    tabIndex: childElement.props.tabIndex ?? 0,
    "aria-describedby": "uvr-context-help-tooltip",
  });

  return (
    <InteractiveTooltip content={content} position={position} className={className}>
      <div
        ref={triggerRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="inline-flex items-center"
      >
        {interactiveChild}
      </div>
    </InteractiveTooltip>
  );
}

interface HelpTooltipIconProps {
  content: React.ReactNode;
  className?: string;
}

export function HelpTooltipIcon({ content, className = "" }: HelpTooltipIconProps) {
  return (
    <AccessibleTooltipWrapper content={content}>
      <button
        type="button"
        className={`text-slate-400 hover:text-green-400 mx-1 p-0.5 rounded transition-all focus-visible:ring-1 focus-visible:ring-green-400 ${className}`}
        aria-label="View explanation helper"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    </AccessibleTooltipWrapper>
  );
}
