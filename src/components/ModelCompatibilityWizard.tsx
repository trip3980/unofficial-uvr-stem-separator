import React, { useState } from "react";
import { Sparkles, AlertCircle, FileCode, Search, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { HelpToggle, HelpText, AccessibleTooltipWrapper } from "./HelpSystem";

interface ArchDetail {
  id: string;
  name: string;
  package: string;
  relativeRuntimeEstimate: string;
  description: string;
  bestUsedFor: string;
  formats: string[];
  cpuSupport: boolean;
  cudaSupport: boolean;
  mpsSupport: boolean;
  dmlSupport: "none" | "experimental" | "delegated" | "supported_structural";
  cudaProofStatus: "not_tested" | "passed" | "failed";
  mpsProofStatus: "not_tested" | "passed" | "failed";
  dmlProofStatus: "not_supported" | "experimental_delegated" | "not_tested";
  onnxSupport: string;
  commonBlockers: string[];
  setupCommandHints: string;
}

const ARCHITECTURES: ArchDetail[] = [
  {
    id: "VR",
    name: "VR (Vocal Remover)",
    package: "audio-separator",
    relativeRuntimeEstimate: "Moderate to Fast",
    description: "Legacy vocal-removal architecture used by older UVR workflows. Useful for some 2-stem separation tasks, but output quality varies.",
    bestUsedFor: "Legacy studio acapellas, basic vocal separation, and general instrumentation isolation.",
    formats: [".pth", ".ckpt"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: "experimental",
    cudaProofStatus: "not_tested",
    mpsProofStatus: "not_tested",
    dmlProofStatus: "experimental_delegated",
    onnxSupport: "Delegated to audio-separator backend / Not directly configured by this UI",
    commonBlockers: ["Unexpected sample rate, channel layout, or preprocessing mismatch.", "CUDA Out of Memory on 4GB cards on high window sizes"],
    setupCommandHints: "pip install audio-separator[gpu]"
  },
  {
    id: "MDX",
    name: "MDX-Net / MDX",
    package: "audio-separator",
    relativeRuntimeEstimate: "Extremely Fast",
    description: "ONNX-based frequency-domain separation architecture commonly used for fast vocal/instrumental models. Results vary by model and input audio.",
    bestUsedFor: "High-speed batch extractions, drum stem isolate, backing vocal sweeps.",
    formats: [".onnx"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: "experimental",
    cudaProofStatus: "not_tested",
    mpsProofStatus: "not_tested",
    dmlProofStatus: "experimental_delegated",
    onnxSupport: "Delegated to audio-separator backend. Provider selection is backend/runtime dependent. Backend-dependent / Not locally proven",
    commonBlockers: ["ONNX Runtime CUDA version mismatch with cudnn dlls", "Segment overlap parameter set too high"],
    setupCommandHints: "pip install audio-separator[gpu] onnxruntime-gpu"
  },
  {
    id: "Demucs",
    name: "Demucs (v3 / v4)",
    package: "audio-separator",
    relativeRuntimeEstimate: "Moderate to Heavy",
    description: "Hybrid neural source-separation architecture commonly used for 4-stem workflows such as drums, bass, vocals, and other. Output quality depends on model, input mix, and runtime configuration.",
    bestUsedFor: "Dynamic music-band deconstruction (Drums, Bass, Vocals, Other).",
    formats: [".yaml config + weights", ".th/ckpt"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: false,
    dmlSupport: "none",
    cudaProofStatus: "not_tested",
    mpsProofStatus: "not_tested",
    dmlProofStatus: "not_supported",
    onnxSupport: "Delegated to audio-separator backend (Uses raw torch model graph)",
    commonBlockers: ["PyTorch/Demucs installation may fail if Python, PyTorch, CUDA, or build-tool versions are incompatible.", "Extremely high memory footprint on CPU mode"],
    setupCommandHints: "pip install audio-separator torch"
  },
  {
    id: "RoFormer",
    name: "RoFormer (Rotary Transformer)",
    package: "audio-separator",
    relativeRuntimeEstimate: "Moderate",
    description: "Transformer-based separation architecture used by some modern vocal/instrumental models. It may perform well on complex material, but artifacts and bleed can still occur.",
    bestUsedFor: "Isolate of complex music tracks and vocal overlapping.",
    formats: [".onnx", ".ckpt"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: "experimental",
    cudaProofStatus: "not_tested",
    mpsProofStatus: "not_tested",
    dmlProofStatus: "experimental_delegated",
    onnxSupport: "Delegated to audio-separator backend. Provider selection is backend/runtime dependent. Backend-dependent / Not locally proven",
    commonBlockers: ["Slow startup initialization on first-run execution", "Model download may fail due to network, source URL, or cache configuration issues."],
    setupCommandHints: "pip install audio-separator[gpu] transformers"
  },
  {
    id: "MDXC",
    name: "MDXC (MDX-Net Multi-Stem)",
    package: "audio-separator",
    relativeRuntimeEstimate: "Fast",
    description: "MDX-family multi-stem or extended workflow variant, depending on the specific model and backend adapter.",
    bestUsedFor: "Multi-stem separations on compatible hardware platforms.",
    formats: [".onnx"],
    cpuSupport: true,
    cudaSupport: true,
    mpsSupport: true,
    dmlSupport: "experimental",
    cudaProofStatus: "not_tested",
    mpsProofStatus: "not_tested",
    dmlProofStatus: "experimental_delegated",
    onnxSupport: "Delegated to audio-separator backend. Provider selection is backend/runtime dependent. Backend-dependent / Not locally proven",
    commonBlockers: ["Dynamic memory expansion errors on mid-range GPU environments", "Overlapping chunk dimensions mismatch"],
    setupCommandHints: "pip install audio-separator[gpu]"
  },
  {
    id: "Custom",
    name: "Custom / Manual Adapter",
    package: "custom-adapter",
    relativeRuntimeEstimate: "Varies",
    description: "User-supplied models require compatible metadata, file format, and backend mapping. Compatibility is unknown until tested.",
    bestUsedFor: "Sideloading fine-tuned custom models or proprietary model weights. Custom runtime support depends on adapter implementation.",
    formats: [".onnx", ".pth", ".ckpt", "*"],
    cpuSupport: true,
    cudaSupport: false,
    mpsSupport: false,
    dmlSupport: "none",
    cudaProofStatus: "not_tested",
    mpsProofStatus: "not_tested",
    dmlProofStatus: "not_supported",
    onnxSupport: "Delegated to audio-separator backend / Not directly configured by this UI",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-100 uppercase tracking-wide font-mono text-[11px]">Backend Hardware Compatibility Reference</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpToggle sectionId="model_compatibility" label="Show Help" />
          <span className="text-[9px] text-amber-400 uppercase font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Reference only / Not local proof
          </span>
          <span className="text-[9px] text-[#38bdf8] uppercase font-mono bg-[#001f3f]/50 px-2 py-0.5 rounded border border-cyan-500/20 font-bold whitespace-nowrap">
            Hardened Functional Alpha
          </span>
        </div>
      </div>

      <p className="text-slate-400 leading-relaxed text-[11px] font-sans">
        UVR models utilize diverse underlying machine-learning framework architectures. Use this reference matrix to inspect structural hardware acceleration pathways, package dependencies, and relative performance estimates. This database lists structural capabilities, not local installation status.
      </p>

      <HelpText
        sectionId="model_compatibility"
        text="Help: This database acts as a reference directory for UVR's underlying machine learning blocks. Select an architecture from the left menu to view reference file format patterns, supported backend mappings, and common runtime blockers."
      />

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
                aria-pressed={selectedArch === arch.id}
                aria-label={`Select ${arch.name} compatibility reference`}
                onClick={() => setSelectedArch(arch.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all duration-200 font-mono text-[10px] flex flex-col gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60
                  ${selectedArch === arch.id 
                    ? "bg-[#0b1329] border-cyan-500/40 text-cyan-200 shadow-sm" 
                    : "bg-black/20 hover:bg-black/45 border-white/5 text-slate-400 hover:text-slate-200"
                  }`}
              >
                <div className="flex justify-between items-center w-full font-bold">
                  <span>{arch.name}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-extrabold uppercase
                    ${arch.relativeRuntimeEstimate.includes("Fast") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}
                  >
                    {arch.relativeRuntimeEstimate.split(" ")[0]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1 text-[9px] text-slate-500 font-sans">
                  {arch.id === "Custom" ? (
                    <span className="text-slate-400">Device support: Unknown / adapter-dependent</span>
                  ) : (
                    <>
                      <span className="flex items-center gap-0.5">CPU</span>
                      <span className="flex items-center gap-0.5">
                        • CUDA{arch.cudaSupport ? "*" : " (No)"}
                      </span>
                      {arch.dmlSupport !== "none" && (
                        <span className="flex items-center gap-0.5">
                          • DML Exp
                        </span>
                      )}
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
          {filteredArches.length === 0 && (
            <div className="text-center py-6 text-slate-500 font-mono text-[11px] bg-black/20 rounded-lg border border-white/5">
              No architecture references match the current search.
            </div>
          )}
          {filteredArches.length > 0 && (
            <div className="text-[8.5px] text-slate-500 italic font-mono mt-2.5 pl-1 leading-normal">
              *CUDA support is structural only until a local E2E proof passes.
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
            <div className="flex flex-col items-end gap-1">
              <span className="bg-slate-900 border border-white/10 text-slate-300 px-2 py-0.5 rounded-md text-[9px] font-mono whitespace-nowrap">
                Est: {activeArch.relativeRuntimeEstimate}
              </span>
              <span className="text-[8px] text-slate-500 font-sans text-right hidden sm:block">
                Actual speed depends on model, device, file length, chunk size, and backend.
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
              <span className="text-slate-500 font-mono uppercase text-[9px] font-bold block tracking-wider">Common / Expected Model File Patterns</span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {activeArch.formats.map((f, i) => (
                  <span key={i} className="bg-slate-900 border border-white/5 text-amber-300 px-2 py-1 rounded-md font-mono text-[9px] flex items-center gap-1">
                    <FileCode className="w-3 h-3 text-amber-500" />
                    {f}
                  </span>
                ))}
              </div>
              <div className="text-[8px] text-slate-500 italic mt-0.5">
                Actual compatibility depends on the model registry entry and backend adapter. Extension compatibility is not absolute.
              </div>
            </div>
          </div>

          {/* Accelerators Row */}
          <div className="space-y-1.5 pt-1">
            <span className="text-slate-500 font-mono uppercase text-[9px] font-bold block tracking-wider">Compatible Hardware Accelerators</span>
            
            {activeArch.id === "Custom" ? (
              <div className="bg-amber-500/5 border border-amber-500/25 p-3 rounded-lg text-[10.5px] font-mono text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <strong>Custom device support:</strong> Unknown / adapter-dependent. Custom runtime support depends on adapter implementation.
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-0.5">
                <AccessibleTooltipWrapper content="CPU: Supported baseline runtime, but performance varies. No GPU acceleration.">
                  <span className="bg-slate-900/60 text-slate-300 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5 text-[10px] font-mono hover:border-green-500/30 transition-all cursor-help">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    CPU: Supported baseline runtime
                  </span>
                </AccessibleTooltipWrapper>

                <AccessibleTooltipWrapper content="CUDA Acceleration: Structural support only. Not locally proven until E2E check.">
                  <span className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[10px] font-mono hover:border-green-500/30 transition-all cursor-help
                    ${activeArch.cudaSupport 
                      ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" 
                      : "bg-slate-950/40 border-white/[0.03] text-slate-650 opacity-45 cursor-not-allowed"}`}>
                    {activeArch.cudaSupport ? (
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 text-slate-600 shrink-0" />
                    )}
                    CUDA Mode: {activeArch.cudaSupport ? "Structurally supported / Not locally proven" : "Unsupported"}
                  </span>
                </AccessibleTooltipWrapper>

                <AccessibleTooltipWrapper content="MPS Acceleration: Backend-dependent MPS. Not locally proven.">
                  <span className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[10px] font-mono hover:border-green-500/30 transition-all cursor-help
                    ${activeArch.mpsSupport 
                      ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" 
                      : "bg-slate-950/40 border-white/[0.03] text-slate-650 opacity-45 cursor-not-allowed"}`}>
                    {activeArch.mpsSupport ? (
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 text-slate-600 shrink-0" />
                    )}
                    Apple MPS: {activeArch.mpsSupport ? "Backend-dependent / Not locally proven" : "Unsupported"}
                  </span>
                </AccessibleTooltipWrapper>

                <AccessibleTooltipWrapper content="DirectML: Experimental pathway. Supported structurally, but not locally proven.">
                  <span className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[10px] font-mono hover:border-cyan-500/30 transition-all cursor-help
                    ${activeArch.dmlSupport !== "none" 
                      ? "bg-cyan-950/20 border-cyan-500/20 text-cyan-300" 
                      : "bg-slate-950/40 border-white/[0.03] text-slate-650 opacity-45 cursor-not-allowed"}`}>
                    {activeArch.dmlSupport !== "none" ? (
                      <AlertTriangle className="w-3 h-3 text-cyan-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 text-slate-600 shrink-0" />
                    )}
                    DirectML Mode: {activeArch.dmlSupport !== "none" ? "Experimental / Delegated / Not locally proven" : "Unsupported"}
                  </span>
                </AccessibleTooltipWrapper>
              </div>
            )}
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
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                Common Architecture Blockers
              </div>
              <ul className="list-disc pl-3.5 space-y-0.5 text-slate-400 text-[10px]">
                {activeArch.commonBlockers.map((bl, i) => (
                  <li key={i}>{bl}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-white/5 text-[9.5px] font-mono text-slate-400 space-y-1">
              <div>
                <span className="text-indigo-400 font-bold">Example setup hint only: </span>
                <code className="bg-black/45 px-1.5 py-0.5 rounded text-indigo-300 font-semibold select-all">{activeArch.setupCommandHints}</code>
              </div>
              <div className="text-[8.5px] text-slate-500 italic font-sans leading-relaxed">
                Verify against current backend requirements before installing. Example only — actual setup depends on Python version, CUDA version, PyTorch build, and audio-separator release. This command does not guarantee GPU support. Do not execute these terminal blocks blindly without confirming local environment layout.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proof Boundary Notice & Status Legend */}
      <div className="border-t border-white/5 pt-4 space-y-3">
        <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span className="font-mono text-[9px] text-[#38bdf8] font-bold tracking-widest uppercase">
              System Release Status
            </span>
            <div className="flex gap-2">
              <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                Hardened Functional Alpha
              </span>
              <span className="text-[9px] font-mono bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                Beta Candidate Blocked
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
            <strong>Proof Boundary Warning:</strong> This database is a reference guide only. It does not prove that any model, GPU, ONNX provider, or backend operates on this machine. Local proof requires a successful real E2E run with a real model, input audio, backend runtime, and non-empty output files. No model architecture is guaranteed to yield artifact-free separation or zero bleeding.
          </p>
        </div>

        {/* Status Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 p-3 bg-black/20 rounded-xl border border-white/[0.02] text-[9.5px] font-mono leading-relaxed text-slate-400">
          <div className="space-y-0.5">
            <div className="text-amber-400 font-bold">● Structural Support</div>
            <p className="text-[8.5px] font-sans">The backend is expected to support this mode, but this UI has not proven it locally.</p>
          </div>
          <div className="space-y-0.5">
            <div className="text-emerald-400 font-bold">● Local Proof</div>
            <p className="text-[8.5px] font-sans">Requires a successful real E2E run on the current machine with active audio outputs.</p>
          </div>
          <div className="space-y-0.5">
            <div className="text-cyan-400 font-bold">● Delegated</div>
            <p className="text-[8.5px] font-sans">Provider/device behavior is controlled by the backend library, not this UI.</p>
          </div>
          <div className="space-y-0.5">
            <div className="text-orange-400 font-bold">● Experimental</div>
            <p className="text-[8.5px] font-sans">Feature may be incomplete, unstable, or environment-dependent.</p>
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-500 font-bold">● Not Supported</div>
            <p className="text-[8.5px] font-sans">No known adapter path currently exposed within the engine or front-end configuration.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
