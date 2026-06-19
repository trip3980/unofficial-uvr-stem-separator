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
  Disc,
  Binary,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import FourTrackMixer from "./components/FourTrackMixer";
import ModelDownloader from "./components/ModelDownloader";
import EnsemblePipelinePlanner from "./components/EnsemblePipelinePlanner";
import ClassicConsole from "./components/ClassicConsole";
import BatchEncoder from "./components/BatchEncoder";
import GlobalSettings from "./components/GlobalSettings";
import LegalAbout from "./components/LegalAbout";
import SubmenuManual from "./components/SubmenuManual";
import SunoMusicLab from "./components/SunoMusicLab";
import BasicPitchMidiLab from "./components/BasicPitchMidiLab";
import { HelpToggle, HelpText, AccessibleTooltipWrapper } from "./components/HelpSystem";
import { initializeModelRegistry } from "./services/audioEngine";
import {
  APP_NAME,
  APP_SHORT_NAME,
  RELEASE_STATE,
  BETA_STATUS,
  INDEPENDENT_PROJECT_NOTICE,
} from "./config/branding";

// --- Types & Interfaces ---

export default function App() {
  const [activeTab, setActiveTab] = useState<
    | "about_project"
    | "classic_console"
    | "mixer"
    | "ensemble"
    | "downloads"
    | "batch_encoder"
    | "global_settings"
    | "hardware_db"
    | "suno_api"
    | "basic_pitch"
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

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    initializeModelRegistry();
  }, []);

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
    <div className="w-full min-h-screen bg-[#07080c] text-slate-200 font-sans overflow-x-hidden relative flex flex-col md:flex-row antialiased">
      {/* Absolute Fluid Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-green-600/10 rounded-full blur-[160px] animate-float-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-emerald-600/10 rounded-full blur-[200px] animate-float-slower"></div>
        <div className="absolute top-[30%] right-[15%] w-[45%] h-[45%] bg-green-500/10 rounded-full blur-[140px] animate-float-slow"></div>
      </div>

      {/* Sidebar Layout */}
      <div className={`w-full md:w-72 border-b md:border-b-0 md:border-r border-[#00ff00]/10 bg-black/80 backdrop-blur-2xl flex flex-col p-4 md:p-6 sticky top-0 shrink-0 z-30 shadow-[4px_0_24px_rgba(0,255,0,0.05)] transition-all duration-300 ${isMobileNavOpen ? 'h-[85vh] md:h-screen overflow-y-auto' : 'h-auto md:h-screen md:overflow-y-auto'}`}>
        <div className="flex items-center justify-between md:mb-10 mb-4 px-2">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.35)] flex items-center justify-center text-black font-bold font-display text-lg tracking-widest border border-green-400/50">
              O
            </div>
            <div>
              <span className="font-bold font-display text-lg tracking-tight block text-green-300">
                {APP_SHORT_NAME}
              </span>
              <span className="text-[10px] uppercase font-bold text-green-500/70 tracking-widest font-mono shadow-green-500/20 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
                AI Audio Workstation
              </span>
            </div>
          </div>
          <button 
            className="md:hidden p-2 text-green-400 hover:text-green-300 bg-green-500/10 rounded border border-green-500/20"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          >
            <div className="space-y-1">
              <span className="block w-5 h-0.5 bg-current"></span>
              <span className="block w-5 h-0.5 bg-current"></span>
              <span className="block w-5 h-0.5 bg-current"></span>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className={`space-y-1.5 flex-1 ${isMobileNavOpen ? 'block' : 'hidden md:block'}`}>
          {(
            [
              { id: "classic_console", label: "Audio Separator", icon: Play },
              { id: "mixer", label: "Stem Mixer", icon: Music },
              { id: "suno_api", label: "Generative AI Music Lab", icon: Disc },
              { id: "basic_pitch", label: "Basic Pitch MIDI Lab", icon: Binary },
              { id: "ensemble", label: "Ensemble Manager", icon: Workflow },
              { id: "batch_encoder", label: "Batch Encoder", icon: FileAudio },
              { id: "downloads", label: "Model Manager", icon: DownloadCloud },
              {
                id: "global_settings",
                label: "Global Settings",
                icon: Settings,
              },
              { id: "hardware_db", label: "Hardware Database", icon: Cpu },
              { id: "about_project", label: "About OpenStem", icon: Info },
            ] as const
          ).map(({ id, label, icon: IconIcon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  if (window.innerWidth < 768) {
                    setIsMobileNavOpen(false);
                  }
                }}
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
        <header className="mb-8 border-b border-green-500/10 pb-4 space-y-4">
          <div className="flex flex-col flex-wrap justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-green-50">
                {APP_NAME}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-green-400 to-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] text-base md:text-lg block sm:inline-block sm:ml-2 uppercase font-mono">
                  v1.0.0 — {RELEASE_STATE}
                </span>
              </h1>
              <p className="text-[11px] text-green-500/50 font-mono tracking-widest uppercase mt-1.5">
                Local AI audio separation and stem workflow tools.
              </p>
            </div>
          </div>
        </header>

        {/* TAB 0: ABOUT THE PROJECT */}
        {activeTab === "about_project" && (
          <div className="space-y-6 animate-fade-in pb-16">
            <LegalAbout />
          </div>
        )}

        {/* TAB 7: HARDWARE COMPATIBILITY DATABASE */}
        {activeTab === "hardware_db" && (
          <div className="space-y-6 animate-fade-in">
            <SubmenuManual sectionId="hardware_db" />
            <div className="p-6 rounded-2xl bg-[#080a13]/85 border border-green-500/15 shadow-2xl relative space-y-5 backdrop-blur-3xl overflow-hidden text-slate-200">
              <div className="border-b border-green-500/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-green-300 font-display flex items-center gap-2.5">
                    <Cpu className="w-5 h-5 text-green-400" />
                    Backend Hardware Compatibility Database
                  </h2>
                  <p className="text-xs text-slate-400 mt-2">
                    Detailed diagnostic matrix mapping PyTorch source-separation model architectures to system-level physical accelerators.
                  </p>
                </div>
                <HelpToggle sectionId="hardware_db" label="Show Help" />
              </div>

              <HelpText
                sectionId="hardware_db"
                text="Help: This database logs core deep-learning architectures of separator algorithms. Look up your target model category to determine package prerequisites, supported run flags, and whether specific hardware accelerators like NVIDIA CUDA or Apple MPS are structurally supported versus locally proven."
              />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[
                  {
                    name: "VR Architecture",
                    backend: "audio-separator VR",
                    ext: ".pth, .ckpt (onnx only if supported by adapter)",
                    overallState: "Supported",
                    stateColor: "border-green-500/30 text-green-400 bg-green-950/20",
                    cpu: "Supported",
                    cpuColor: "text-green-400",
                    cuda: "Structurally supported / Not locally proven",
                    cudaColor: "text-amber-300",
                    mps: "Structurally supported / Not locally proven",
                    mpsColor: "text-amber-300",
                    dml: "Experimental / Delegated / Not locally proven",
                    dmlColor: "text-pink-400",
                    onnxProvider: "Delegated to audio-separator backend, if applicable",
                    packages: ["audio-separator", "torch", "onnxruntime-gpu (where applicable)"],
                    flags: ["--device cpu", "--device cuda", "--device mps", "--device dml"],
                    notes: "Requires local validation. DirectML acceleration is highly experimental and carries performance overheads on low-VRAM GPUs."
                  },
                  {
                    name: "MDX-Net / MDXC",
                    backend: "audio-separator MDX",
                    ext: ".onnx",
                    overallState: "Supported",
                    stateColor: "border-green-500/30 text-green-400 bg-green-950/20",
                    cpu: "Supported",
                    cpuColor: "text-green-400",
                    cuda: "Structurally supported / Not locally proven",
                    cudaColor: "text-amber-300",
                    mps: "Structurally supported / Not locally proven",
                    mpsColor: "text-amber-300",
                    dml: "Experimental / Delegated / Not locally proven",
                    dmlColor: "text-pink-400",
                    onnxProvider: "Delegated to audio-separator backend",
                    packages: ["audio-separator", "torch", "onnxruntime-gpu"],
                    flags: ["--device cpu", "--device cuda", "--device mps", "--device dml"],
                    notes: "Execution runtime delegated entirely to active audio-separator instance. ONNX acceleration requires specific CUDA and cuDNN dll file matching."
                  },
                  {
                    name: "Demucs",
                    backend: "audio-separator Demucs / PyTorch native",
                    ext: ".pt, .yaml (config-driven)",
                    overallState: "Partial",
                    stateColor: "border-amber-500/30 text-amber-400 bg-amber-950/20",
                    cpu: "Supported",
                    cpuColor: "text-green-400",
                    cuda: "Structurally supported / Not locally proven",
                    cudaColor: "text-amber-300",
                    mps: "Partial / framework-dependent / not locally proven",
                    mpsColor: "text-amber-500",
                    dml: "Not supported unless proven",
                    dmlColor: "text-rose-500",
                    onnxProvider: "N/A — PyTorch native",
                    packages: ["audio-separator", "torch"],
                    flags: ["--device cpu", "--device cuda"],
                    notes: "Relies heavily on native PyTorch tensors. Demucs is GPU-intensive and does not natively support DirectML without conversion."
                  },
                  {
                    name: "RoFormer / Mel-Band / BS",
                    backend: "audio-separator RoFormer",
                    ext: ".ckpt, .pth (.onnx only if supported)",
                    overallState: "Supported",
                    stateColor: "border-green-500/30 text-green-400 bg-green-950/20",
                    cpu: "Supported",
                    cpuColor: "text-green-400",
                    cuda: "Structurally supported / Not locally proven",
                    cudaColor: "text-amber-300",
                    mps: "Structurally supported / Not locally proven",
                    mpsColor: "text-amber-300",
                    dml: "Experimental / Delegated / Not locally proven",
                    dmlColor: "text-pink-400",
                    onnxProvider: "Delegated to audio-separator backend where applicable",
                    packages: ["audio-separator", "torch", "onnxruntime (where applicable)"],
                    flags: ["--device cpu", "--device cuda", "--device mps", "--device dml"],
                    notes: "RoFormer pipelines use mixed model weights. CUDA requires torch-cuda compatibility."
                  },
                  {
                    name: "Custom / Imported Models",
                    backend: "custom-adapter",
                    ext: "Varies (model-dependent)",
                    overallState: "Unknown",
                    stateColor: "border-slate-500/30 text-slate-400 bg-slate-950/20",
                    cpu: "Supported only if compatible",
                    cpuColor: "text-amber-400",
                    cuda: "Unknown / model-dependent",
                    cudaColor: "text-slate-400",
                    mps: "Unknown / model-dependent",
                    mpsColor: "text-slate-400",
                    dml: "Unknown / not proven",
                    dmlColor: "text-slate-400",
                    onnxProvider: "Model-dependent / delegated",
                    packages: ["Depends on model architecture"],
                    flags: ["Auto fallback"],
                    notes: "No predefined execution adapter is active. Requires local validation and custom adapter bindings."
                  }
                ].map((arch, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-black/45 border border-white/5 hover:border-green-500/10 transition-all flex flex-col justify-between space-y-4">
                    {/* Header section with Name and Overall State */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{arch.name}</h4>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          <span className="text-green-400">Backend:</span> {arch.backend}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] uppercase font-mono font-bold rounded-md border ${arch.stateColor} shrink-0`}>
                        State: {arch.overallState}
                      </span>
                    </div>

                    {/* Extensions */}
                    <div className="text-[11px] font-mono text-slate-300 border-t border-white/5 pt-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Extensions:</span>
                      {arch.ext}
                    </div>

                    {/* Accelerators Status Grid */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Accelerators Status:</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/30 border border-white/5 rounded-lg p-2 flex flex-col justify-between min-h-[48px]">
                          <span className="text-[9px] uppercase font-bold text-slate-500 font-mono">CPU</span>
                          <span className={`text-[10px] font-medium font-mono leading-tight ${arch.cpuColor}`}>{arch.cpu}</span>
                        </div>
                        <div className="bg-black/30 border border-white/5 rounded-lg p-2 flex flex-col justify-between min-h-[48px]">
                          <span className="text-[9px] uppercase font-bold text-slate-500 font-mono">CUDA</span>
                          <span className={`text-[10px] font-medium font-mono leading-tight ${arch.cudaColor}`}>{arch.cuda}</span>
                        </div>
                        <div className="bg-black/30 border border-white/5 rounded-lg p-2 flex flex-col justify-between min-h-[48px]">
                          <span className="text-[9px] uppercase font-bold text-slate-500 font-mono">Apple MPS</span>
                          <span className={`text-[10px] font-medium font-mono leading-tight ${arch.mpsColor}`}>{arch.mps}</span>
                        </div>
                        <div className="bg-black/30 border border-white/5 rounded-lg p-2 flex flex-col justify-between min-h-[48px]">
                          <span className="text-[9px] uppercase font-bold text-slate-500 font-mono">DirectML</span>
                          <span className={`text-[10px] font-medium font-mono leading-tight ${arch.dmlColor}`}>{arch.dml}</span>
                        </div>
                      </div>
                    </div>

                    {/* Details & Packages & Flags */}
                    <div className="space-y-3.5 bg-black/20 p-3 rounded-lg border border-white/5 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">ONNX Provider:</span>
                        <span className="font-mono text-[10px] text-slate-300 leading-normal">{arch.onnxProvider}</span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Required Packages:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {arch.packages.map((pkg, pIdx) => (
                            <span key={pIdx} className="px-1.5 py-0.5 rounded bg-purple-950/30 border border-purple-500/10 text-purple-300 font-mono text-[9px] whitespace-normal">
                              {pkg}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Command Flags:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {arch.flags.map((flag, fIdx) => (
                            <span key={fIdx} className="px-1.5 py-0.5 rounded bg-[#090d16] border border-cyan-500/10 text-cyan-300 font-mono text-[9px] break-all whitespace-normal">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-2">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Notes:</span>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{arch.notes}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ENSEMBLE MANAGER */}
        {activeTab === "ensemble" && (
          <div className="space-y-6">
            <SubmenuManual sectionId="ensemble" />
            <EnsemblePipelinePlanner />
          </div>
        )}

        {/* TAB: SUNO AI MUSIC LAB */}
        {activeTab === "suno_api" && (
          <div className="space-y-6">
            <SubmenuManual sectionId="generative_ai_music_lab" />
            <SunoMusicLab
              selectedInputs={selectedInputs}
              setSelectedInputs={setSelectedInputs}
              setActiveTab={setActiveTab}
            />
          </div>
        )}

        {/* TAB: BASIC PITCH MIDI LAB */}
        {activeTab === "basic_pitch" && (
          <div className="space-y-6">
            <BasicPitchMidiLab />
          </div>
        )}

        {/* TAB 4: MODEL MANAGER */}
        {activeTab === "downloads" && (
          <div className="space-y-6">
            <SubmenuManual sectionId="downloads" />
            <ModelDownloader />
          </div>
        )}

        {/* TAB 5: BATCH ENCODER */}
        {activeTab === "batch_encoder" && (
          <div className="space-y-6">
            <SubmenuManual sectionId="batch_encoder" />
            <BatchEncoder />
          </div>
        )}

        {/* TAB 6: GLOBAL SETTINGS */}
        {activeTab === "global_settings" && (
          <div className="space-y-6">
            <SubmenuManual sectionId="global_settings" />
            <GlobalSettings />
          </div>
        )}

        {/* TAB 2: MIXER */}
        {activeTab === "mixer" && (
          <div className="space-y-6">
            <SubmenuManual sectionId="mixer" />
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
            <SubmenuManual sectionId="classic_console" />
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
