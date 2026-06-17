import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Shield,
  Play,
  Settings,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Sliders,
  Cpu,
  Activity,
  Download,
  RefreshCw,
  Eye,
  Folder,
  File,
  FileCheck,
  ArrowRight,
  Layers,
  FileCode,
  CheckSquare,
  Square,
  DownloadCloud,
  Info,
  Check,
  AlertCircle,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  Workflow,
  Network,
  GitFork,
  Music,
  FileAudio,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import FourTrackMixer from "./components/FourTrackMixer";
import ModelDownloader from "./components/ModelDownloader";
import EnsemblePipelinePlanner from "./components/EnsemblePipelinePlanner";
import ClassicConsole from "./components/ClassicConsole";
import BatchEncoder from "./components/BatchEncoder";
import GlobalSettings from "./components/GlobalSettings";

// --- Types & Interfaces ---

export default function App() {
  const [activeTab, setActiveTab] = useState<
    | "classic_console"
    | "mixer"
    | "ensemble"
    | "downloads"
    | "batch_encoder"
    | "global_settings"
  >("classic_console");

  // --- Separation Simulator State ---
  const [selectedInputs, setSelectedInputs] = useState<string[]>([
    "tracking_demo_44k.wav",
  ]);
  const [selectedOutput, setSelectedOutput] = useState<string>(
    "C:\\Users\\Consumer\\Music_Stems\\",
  );
  const [separationGoal, setSeparationGoal] = useState<
    "vocals" | "instrumental" | "karaoke" | "4stem"
  >("vocals");
  const [selectedCategory, setSelectedCategory] =
    useState<string>("bs_roformer");
  const [selectedModelName, setSelectedModelName] = useState<string>(
    "mel_band_roformer_karaoke_sg.onnx",
  );

  // Sync state from ClassicConsole for tabs sharing
  const [dropdownSettings, setDropdownSettings] = useState<any>({});
  const [checkboxSettings, setCheckboxSettings] = useState<any>({});
  useEffect(() => {
    if (!checkboxSettings || Object.keys(checkboxSettings).length === 0) return;

    if (
      checkboxSettings.saveVocalsOnly &&
      !checkboxSettings.saveInstrumentalOnly
    ) {
      setSeparationGoal("vocals");
    } else if (
      !checkboxSettings.saveVocalsOnly &&
      checkboxSettings.saveInstrumentalOnly
    ) {
      setSeparationGoal("instrumental");
    } else {
      setSeparationGoal("karaoke");
    }
  }, [checkboxSettings]);

  return (
    <div className="w-full min-h-screen bg-[#07080c] text-slate-200 font-sans overflow-x-hidden relative flex antialiased">
      {/* Absolute Fluid Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-green-600/10 rounded-full blur-[160px] animate-float-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-emerald-600/10 rounded-full blur-[200px] animate-float-slower"></div>
        <div className="absolute top-[30%] right-[15%] w-[45%] h-[45%] bg-green-500/10 rounded-full blur-[140px] animate-float-slow"></div>
      </div>

      {/* Sidebar Layout */}
      <div className="w-72 border-r border-[#00ff00]/10 bg-black/80 backdrop-blur-2xl flex flex-col p-6 sticky top-0 h-screen shrink-0 z-20 shadow-[4px_0_24px_rgba(0,255,0,0.05)]">
        <div className="flex items-center gap-3.5 mb-10 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center justify-center text-black font-bold font-display text-lg tracking-widest border border-green-400/50">
            U
          </div>
          <div>
            <span className="font-bold font-display text-lg tracking-tight block text-green-300">
              UVR Stem Separator
            </span>
            <span className="text-[10px] uppercase font-bold text-green-500/70 tracking-widest font-mono shadow-green-500/20 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
              Audio Source Separation
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5 flex-1">
          {(
            [
              { id: "classic_console", label: "Audio Separator", icon: Play },
              { id: "mixer", label: "Stem Mixer", icon: Music },
              { id: "ensemble", label: "Ensemble Manager", icon: Workflow },
              { id: "batch_encoder", label: "Batch Encoder", icon: FileAudio },
              { id: "downloads", label: "Model Manager", icon: DownloadCloud },
              {
                id: "global_settings",
                label: "Global Settings",
                icon: Settings,
              },
            ] as const
          ).map(({ id, label, icon: IconIcon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 text-sm font-medium relative group focus:outline-none ${
                  isActive
                    ? "text-green-300"
                    : "text-green-600/50 hover:text-green-400"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabSidebarBackdrop"
                    className="absolute inset-0 bg-green-500/[0.08] border border-green-500/20 rounded-xl shadow-[inset_0_1px_1px_rgba(0,255,0,0.1),0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-md"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}

                {/* Accent neon line indicator */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-green-400 to-emerald-500 rounded-r-md z-10 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}

                <div className="relative z-10 flex items-center gap-3 w-full font-mono uppercase tracking-wider text-[11px] font-bold">
                  <IconIcon
                    className={`w-4 h-4 transition-all duration-300 ${isActive ? "text-green-400 scale-110 opacity-100" : "opacity-50 group-hover:opacity-80 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]"}`}
                  />
                  <span
                    className={`transition-all duration-300 ${isActive ? "tracking-widest" : "tracking-wide"}`}
                  >
                    {label}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Grid View */}
      <div
        className="flex-1 min-w-0 p-4 md:p-8 pr-8 md:pr-12 overflow-y-auto overflow-x-hidden max-w-full w-full relative z-10 box-border"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        {/* APP HEADER */}
        <header className="mb-10 border-b border-green-500/20 pb-6">
          <div className="flex flex-col flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight mb-2 text-green-50">
                UVR Stem Separator{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-green-400 to-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                  (Unofficial)
                </span>
              </h1>
              <p className="text-green-500/60 font-mono text-sm max-w-3xl leading-relaxed mt-2 uppercase tracking-wide">
                An unofficial Windows desktop stem-separation application inspired by UVR-style workflows, designed around a React/Electron desktop interface, safe local processing architecture, model registry planning, backend adapter separation, FFmpeg readiness checks, and future support for VR, MDX, MDX23C, Demucs, RoFormer, Mel-Band RoFormer, BS-RoFormer, and user-imported models.
              </p>
              <div className="text-green-500/40 font-mono text-xs mt-4 uppercase tracking-widest font-bold">
                Created by Robert Sawin (GitHub: Trip3980)
              </div>
              <div className="text-red-500/60 font-mono text-xs mt-2 max-w-3xl leading-relaxed tracking-wider border border-red-500/20 p-2 rounded bg-red-500/5">
                <p className="mb-2"><strong>Disclaimer:</strong> This project is not affiliated with, endorsed by, or maintained by the Ultimate Vocal Remover developers. UVR language refers only to workflow inspiration and source-separation interface patterns. The project is not trying to replace Ultimate Vocal Remover or claim official UVR succession. It is an unofficial classic-style desktop stem separator built around safer packaging, readiness checks, model registry planning, backend adapters, and future model support.</p>
                <p>Unofficial UVR Stem Separator exists for two reasons:</p>
                <ul className="list-decimal list-inside pl-1 space-y-1 mt-1">
                  <li>To future-proof the classic UVR-style workflow so newer models, model categories, and backend libraries can be added through adapters instead of rewrites.</li>
                  <li>To preserve the familiar standalone desktop experience of the older UVR-style app while supporting newer separation technology inside a modern executable Windows shell.</li>
                </ul>
              </div>
            </div>
          </div>
        </header>

        {/* TAB 3: ENSEMBLE MANAGER */}
        {activeTab === "ensemble" && (
          <div className="space-y-6">
            <EnsemblePipelinePlanner />
          </div>
        )}

        {/* TAB 4: MODEL MANAGER */}
        {activeTab === "downloads" && (
          <div className="space-y-6">
            <ModelDownloader />
          </div>
        )}

        {/* TAB 5: BATCH ENCODER */}
        {activeTab === "batch_encoder" && (
          <div className="space-y-6">
            <BatchEncoder />
          </div>
        )}

        {/* TAB 6: GLOBAL SETTINGS */}
        {activeTab === "global_settings" && (
          <div className="space-y-6">
            <GlobalSettings />
          </div>
        )}

        {/* TAB 2: MIXER */}
        {activeTab === "mixer" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-glass-card border border-glass-border shadow-glass-shadow shadow-glass-inset backdrop-blur-xl">
              <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-2 block font-mono">
                Separation Goal Focus
              </label>
              <select
                value={separationGoal}
                onChange={(e) => setSeparationGoal(e.target.value as any)}
                className="w-full md:w-1/2 bg-black/40 border border-[#ffffff]/10 hover:border-white/20 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-mono transition-all appearance-none"
              >
                <option value="vocals">Vocals Only</option>
                <option value="instrumental">Instrumental Only</option>
                <option value="karaoke">Karaoke (Vocals + Instrumental)</option>
                <option value="4stem">
                  4-Stem (Vocals, Drums, Bass, Other)
                </option>
              </select>
            </div>

            <FourTrackMixer
              inputFileName={selectedInputs[0] || "Original_Track.wav"}
              separationGoal={separationGoal}
              selectedCategory={selectedCategory}
              selectedModelName={selectedModelName}
              parameters={`Category: ${selectedCategory} | Model: ${selectedModelName} | Chunk Size: ${dropdownSettings.chunks || "Auto"}`}
            />
          </div>
        )}

        {/* TAB 1: AUDIO SEPARATOR */}
        {activeTab === "classic_console" && (
          <div className="space-y-6">
            <ClassicConsole
              selectedInputs={selectedInputs}
              setSelectedInputs={setSelectedInputs}
              selectedOutput={selectedOutput}
              setSelectedOutput={setSelectedOutput}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedModelName={selectedModelName}
              setSelectedModelName={setSelectedModelName}
              dropdownSettings={dropdownSettings}
              setDropdownSettings={setDropdownSettings}
              checkboxSettings={checkboxSettings}
              setCheckboxSettings={setCheckboxSettings}
            />
          </div>
        )}
      </div>
    </div>
  );
}
