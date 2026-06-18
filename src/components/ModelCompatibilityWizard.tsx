import React, { useState } from "react";
import { Cpu, Zap, Layers, Sparkles, AlertCircle, HelpCircle, FileCode, Search, CheckCircle2, XCircle } from "lucide-react";

interface ArchDetail {
  id: string;
  name: string;
  package: string;
  speed: string;
  description: string;
  bestUsedFor: string;
  formats: string[];
  cpuSupport: boolean;
  cudaSupport: boolean;
  mpsSupport: boolean;
  dmlSupport: string; // "experimental" | "supported" | "none"
  onnxSupport: string; // details
  commonBlockers: string[];
  setupCommandHints: string;
}

const ARCHITECTURES: ArchDetail[] = [
  {
    id: "VR",
    name: "VR (Vocal Remover)",
    package: "audio-separator",
    speed: "Moderate to Fast",
    description: "Traditional high-quality magnitude-spectrogram separation. Excellent for classic 2-stem vocal/instrumental splitting with lower computational overhead.",
    bestUsedFor: "Legacy studio acapellas, basic vocal separation, and general instrumentation isolation.",
    formats: [".pth", ".ckpt"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: "experimental",
    onnxSupport: "Delegated to audio-separator backend (PyTorch native weights runtime)",
    commonBlockers: ["Incorrect sample rate downmixing", "CUDA Out of Memory on 4GB cards on high window sizes"],
    setupCommandHints: "pip install audio-separator[gpu]"
  },
  {
    id: "MDX",
    name: "MDX-Net / MDX",
    package: "audio-separator",
    speed: "Extremely Fast",
    description: "Frequency-domain neural extraction framework. Known for its punchy transient preservation and incredibly clean vocal bands.",
    bestUsedFor: "High-speed batch extractions, drum stem isolate, backing vocal sweeps.",
    formats: [".onnx"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: "experimental",
    onnxSupport: "Delegated to audio-separator backend (Uses onnxruntime-gpu configuration)",
    commonBlockers: ["ONNX Runtime CUDA version mismatch with cudnn dlls", "Segment overlap parameter set too high"],
    setupCommandHints: "pip install audio-separator[gpu] onnxruntime-gpu"
  },
  {
    id: "Demucs",
    name: "Demucs (v3 / v4)",
    package: "audio-separator",
    speed: "Moderate to Heavy",
    description: "Meta AI's premier hybrid hybrid-transformer source separation. Splits audio authoritatively into 4 custom master stems directly in a single pass.",
    bestUsedFor: "Dynamic music-band deconstruction (Drums, Bass, Vocals, Other).",
    formats: [".yaml config + weights", ".th/ckpt"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: false,
    dmlSupport: "none",
    onnxSupport: "Delegated to audio-separator backend (Uses raw torch model graph)",
    commonBlockers: ["PyTorch Demucs binary wheel compiler errors on Windows without VC++ tools", "Extremely high memory footprint on CPU mode"],
    setupCommandHints: "pip install audio-separator torch"
  },
  {
    id: "RoFormer",
    name: "RoFormer (Rotary Transformer)",
    package: "audio-separator",
    speed: "Moderate",
    description: "Top-tier AI transformer network featuring rotary position embeddings. Delivers unprecedented surgical acapella isolations with almost zero bleeding.",
    bestUsedFor: "Ultra-precise studio-grade isolate of complex master tracks and vocal overlapping.",
    formats: [".onnx", ".ckpt"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: "experimental",
    onnxSupport: "Delegated to audio-separator backend (ONNX execution runtime)",
    commonBlockers: ["Slow startup initialization on first-run execution", "HuggingFace Hub timeout during weight downloading"],
    setupCommandHints: "pip install audio-separator[gpu] transformers"
  },
  {
    id: "MDXC",
    name: "MDXC (MDX-Net Multi-Stem)",
    package: "audio-separator",
    speed: "Fast",
    description: "Modernized custom iterative-overlap ensemble variant of standard MDX, enabling dynamic batching and advanced multi-track averaging.",
    bestUsedFor: "Maximum accuracy studio stem separations on high-end hardware platforms.",
    formats: [".onnx"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: "experimental",
    onnxSupport: "Delegated to audio-separator backend (ONNX runtime provider)",
    commonBlockers: ["Dynamic memory expansion errors on mid-range GPU environments", "Overlapping chunk dimensions mismatch"],
    setupCommandHints: "pip install audio-separator[gpu]"
  },
  {
    id: "Custom",
    name: "Custom / Manual Adapter",
    package: "custom-adapter",
    speed: "Varies",
    description: "User-supplied weight tensors and custom metadata-driven mapping interfaces. Bridges custom python scripts into the main Electron runner.",
    bestUsedFor: "Sideloading fine-tuned custom models or proprietary model weights.",
    formats: [".onnx", ".pth", ".ckpt", "*"],
    cpuSupport: true,
    cudaSupport: false,
    mpsSupport: false,
    dmlSupport: "none",
    onnxSupport: "Delegated to audio-separator backend (or custom execution handler)",
    commonBlockers: ["Schema configuration keys missing", "Incompatible model tensor dimensions"],
    setupCommandHints: "Custom local script setup required"
  }
];

export const ModelCompatibilityWizard: React.FC = () => {
  const [selectedArch, setSelectedArch] = useState<string>("VR");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredArches = ARCHITECTURES.filter(arch => 
    arch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    arch.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    arch.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeArch = ARCHITECTURES.find(a => a.id === selectedArch) || ARCHITECTURES[0];

  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-4 font-sans text-xs text-slate-300">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-100 uppercase tracking-wide font-mono text-[11px]">Model Compatibility Wizard</span>
        </div>
        <span className="text-[9px] text-[#38bdf8] uppercase font-mono bg-[#001f3f]/50 px-2 py-0.5 rounded border border-cyan-500/20">
          Interactive Architecture Database
        </span>
      </div>

      <p className="text-slate-400 leading-relaxed text-[11px] font-sans">
        UVR models utilize diverse underlying machine-learning framework architectures. Use this matrix to inspect structural hardware acceleration, required packages, and optimal environment configurations.
      </p>

      {/* Modern Search Row */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-3.5 h-3.5 text-slate-500" />
        </span>
        <input
          type="text"
          placeholder="Filter architectures (e.g. 'RoFormer', 'ONNX', 'v4')..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-8 py-2 bg-black/60 border border-white/10 hover:border-white/20 rounded-lg text-[11px] font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder-slate-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
        {/* Architectures Selection Grid */}
        <div className="space-y-2 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-white/5 pb-3 lg:pb-0 lg:pr-3.5 max-h-[360px] overflow-y-auto">
          <div className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider mb-2.5">Select Architecture</div>
          <div className="space-y-1.5">
            {filteredArches.map((arch) => (
              <button
                key={arch.id}
                type="button"
                onClick={() => setSelectedArch(arch.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all duration-200 font-mono text-[10px] flex flex-col gap-1 cursor-pointer
                  ${selectedArch === arch.id 
                    ? "bg-[#0b1329] border-cyan-500/40 text-cyan-200 shadow-sm" 
                    : "bg-black/20 hover:bg-black/45 border-white/5 text-slate-400 hover:text-slate-200"
                  }`}
              >
                <div className="flex justify-between items-center w-full font-bold">
                  <span>{arch.name}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-extrabold uppercase
                    ${arch.speed.includes("Fast") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}
                  >
                    {arch.speed.split(" ")[0]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1 text-[9px] text-slate-500 font-sans">
                  <span className="flex items-center gap-0.5">CPU: <span className="text-green-400">Yes</span></span>
                  <span className="flex items-center gap-0.5">CUDA: <span className={arch.cudaSupport ? "text-green-400" : "text-slate-600 font-light"}>{arch.cudaSupport ? "Yes" : "No"}</span></span>
                  <span className="flex items-center gap-0.5">DML: <span className={arch.dmlSupport === "experimental" ? "text-cyan-400 font-semibold" : "text-slate-600 font-light"}>{arch.dmlSupport === "experimental" ? "Exp" : "No"}</span></span>
                </div>
              </button>
            ))}
          </div>
          {filteredArches.length === 0 && (
            <div className="text-center py-6 text-slate-500 font-mono text-[11px] bg-black/20 rounded-lg border border-white/5">
              No matching model engines found.
            </div>
          )}
        </div>

        {/* Selected Architecture Detail Section */}
        <div className="lg:col-span-2 space-y-3 bg-[#070911]/60 p-4 rounded-xl border border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
            <div>
              <h6 className="font-bold text-slate-100 text-[13px] font-mono tracking-tight">{activeArch.name}</h6>
              <span className="text-[9px] text-slate-500 font-mono">Backend Engine: {activeArch.package}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="bg-slate-900 border border-white/10 text-slate-300 px-2 py-0.5 rounded-md text-[9px] font-mono">
                {activeArch.speed} Speed
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{activeArch.description}</p>

          {/* Grid properties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] pt-1">
            <div className="space-y-1">
              <span className="text-slate-500 font-mono uppercase text-[9px] font-bold block tracking-wider">Required package</span>
              <div className="font-mono bg-black/45 p-2 rounded-lg border border-white/5 select-all break-all text-violet-300 text-[10px]">
                {activeArch.package}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-mono uppercase text-[9px] font-bold block tracking-wider">Accepted File Formats</span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {activeArch.formats.map((f, i) => (
                  <span key={i} className="bg-slate-9ml0 border border-white/5 text-amber-300 px-2 py-1 rounded-md font-mono text-[9px] flex items-center gap-1 bg-black/20">
                    <FileCode className="w-3 h-3 text-amber-500" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Accelerators Row */}
          <div className="space-y-1.5 pt-1">
            <span className="text-slate-500 font-mono uppercase text-[9px] font-bold block tracking-wider">Compatible Hardware Accelerators</span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <span className="bg-slate-900/60 text-slate-300 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5 text-[10px] font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                CPU (Core)
              </span>
              <span className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[10px] font-mono
                ${activeArch.cudaSupport 
                  ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" 
                  : "bg-slate-950/40 border-white/[0.03] text-slate-600"}`}>
                {activeArch.cudaSupport ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <XCircle className="w-3 h-3 text-slate-600" />
                )}
                NVIDIA CUDA
              </span>
              <span className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[10px] font-mono
                ${activeArch.mpsSupport 
                  ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" 
                  : "bg-slate-950/40 border-white/[0.03] text-slate-600"}`}>
                {activeArch.mpsSupport ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <XCircle className="w-3 h-3 text-slate-600" />
                )}
                Apple MPS
              </span>
              <span className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[10px] font-mono
                ${activeArch.dmlSupport === "experimental" 
                  ? "bg-cyan-950/20 border-cyan-500/20 text-cyan-300" 
                  : "bg-slate-950/40 border-white/[0.03] text-slate-600"}`}>
                <CheckCircle2 className={activeArch.dmlSupport === "experimental" ? "w-3 h-3 text-cyan-400" : "w-3 h-3 text-slate-600"} />
                DirectML Mode {activeArch.dmlSupport === "experimental" && "(Experimental / Delegated / Not locally proven)"}
              </span>
            </div>
          </div>

          {/* ONNX Run-times */}
          <div className="space-y-1 pt-1 border-t border-white/5 mt-2">
            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 font-mono">ONNX Provider Engine</span>
            <div className="text-[10px] font-mono text-cyan-400 font-semibold">
              {activeArch.onnxSupport}
            </div>
          </div>

          {/* Details & Recommended */}
          <div className="bg-[#0b101c]/60 p-3 rounded-lg border border-cyan-500/10 text-[10px] text-slate-300 leading-relaxed font-sans space-y-1.5 mt-2">
            <div>
              <strong className="text-cyan-300 font-semibold font-mono">Recommended use: </strong>
              <span>{activeArch.bestUsedFor}</span>
            </div>
            
            <div className="pt-1.5 border-t border-white/5 space-y-1">
              <div className="text-[8px] uppercase font-mono font-bold tracking-wider text-amber-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                Common Architecture Blockers
              </div>
              <ul className="list-disc pl-3.5 space-y-0.5 text-slate-400 text-[10px]">
                {activeArch.commonBlockers.map((bl, i) => (
                  <li key={i}>{bl}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 text-[9px] font-mono text-slate-400">
              <span className="text-indigo-400">Setup command hint: </span>
              <code className="bg-black/45 px-1.5 py-0.5 rounded text-indigo-300 font-semibold select-all">{activeArch.setupCommandHints}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
