import React, { useState } from "react";
import {
  Layers,
  Plus,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  FileAudio,
  Shield,
  Sliders,
  Check,
} from "lucide-react";
import { HelpToggle, HelpText } from "./HelpSystem";

interface PipelineNode {
  id: string;
  type: "input" | "model" | "math" | "output";
  label: string;
  modelType?: string;
  parameters?: string;
  vramUsage?: string;
  bleedDepth?: string;
  proofStatus?: string;
}

const PRESETS = [
  {
    id: "dual",
    name: "Standard Dual Model Ensemble",
    complexity: "Requires 2 model outputs. Offers comparative submixing.",
  },
  {
    id: "subtraction",
    name: "Vocal-Focused Two-Model Pipeline",
    complexity: "Attempts instrumental cleanup after vocal extraction.",
  },
  {
    id: "ensemble_4",
    name: "Advanced 4-Stem Ensemble Pipeline",
    complexity: "Aggregates multiple outputs. Higher VRAM/CPU demand.",
  },
];

export default function EnsemblePipelinePlanner() {
  const [pipelineNodes, setPipelineNodes] = useState<PipelineNode[]>([
    { id: "input-1", type: "input", label: "Audio Load (Stereo Wav 44kHz)" },
    {
      id: "model-1",
      type: "model",
      label: "Extractor A: BS-RoFormer v2",
      modelType: "BS-RoFormer (Vocal Isolation)",
      vramUsage: "4.2 GB VRAM",
      parameters: "Overlap: 4x, Splits: 12",
    },
    {
      id: "math-1",
      type: "math",
      label: "Bleed Reduction / Phase Processing",
      bleedDepth: "Estimated / Not measured",
    },
    {
      id: "model-2",
      type: "model",
      label: "Extractor B: Demucs-v4 Rhythm",
      modelType: "Demucs-v4 (Drums & Bass isolation)",
      vramUsage: "3.1 GB VRAM",
      parameters: "Shifts: 2, Split Size: 1024",
    },
    {
      id: "output-1",
      type: "output",
      label: "4-Stem Output Target",
      proofStatus: "Planned / Output target: separated stem files will appear here after a successful ensemble run."
    },
  ]);

  const [subtractPhase, setSubtractPhase] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("subtraction");

  const addCustomModelNode = () => {
    const newNodeId = `model-${Date.now()}`;
    const newNode: PipelineNode = {
      id: newNodeId,
      type: "model",
      label: "Aux Model Node: MDX-v5 De-echo",
      modelType: "MDX Spectral (Reverb Correction)",
      vramUsage: "1.8 GB VRAM",
      parameters: "Hop overlap: 2x, Denoise enabled",
    };

    // Insert before output node (which is the last item)
    setPipelineNodes((prev) => {
      const copy = [...prev];
      copy.splice(copy.length - 1, 0, newNode);
      return copy;
    });
  };

  const removeNode = (id: string) => {
    // Keep at least input, math, output and 1 model
    const modelNodes = pipelineNodes.filter(n => n.type === "model");
    if (pipelineNodes.length <= 3 || modelNodes.length <= 1) return;
    setPipelineNodes((prev) => prev.filter((node) => node.id !== id));
  };

  const loadPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId === "dual") {
      setPipelineNodes([
        {
          id: "input-1",
          type: "input",
          label: "Audio Load (Stereo Wav 44kHz)",
        },
        {
          id: "model-1",
          type: "model",
          label: "Prism-RoFormer Vocals",
          modelType: "BS-RoFormer",
          vramUsage: "3.8 GB VRAM",
          parameters: "Overlap: 4x, Splits: 12",
        },
        {
          id: "model-2",
          type: "model",
          label: "MDX-Net Instrumental Submix",
          modelType: "MDX-v5",
          vramUsage: "2.5 GB VRAM",
          parameters: "Overlap: 6x, Denoise: 50%",
        },
        {
          id: "output-1",
          type: "output",
          label: "2-Stem Submix Target",
          proofStatus: "Planned / Output target: separated stem files will appear here after a successful ensemble run."
        },
      ]);
    } else if (presetId === "subtraction") {
      setPipelineNodes([
        {
          id: "input-1",
          type: "input",
          label: "Audio Load (Stereo Wav 44kHz)",
        },
        {
          id: "model-1",
          type: "model",
          label: "Extractor A: BS-RoFormer v2",
          modelType: "BS-RoFormer (Vocal Isolation)",
          vramUsage: "4.2 GB VRAM",
          parameters: "Overlap: 4x, Splits: 12",
        },
        {
          id: "math-1",
          type: "math",
          label: "Bleed Reduction / Phase Processing",
          bleedDepth: "Estimated / Not measured",
        },
        {
          id: "model-2",
          type: "model",
          label: "Extractor B: Demucs-v4 Rhythm",
          modelType: "Demucs-v4 (Drums & Bass isolation)",
          vramUsage: "3.1 GB VRAM",
          parameters: "Shifts: 2, Split Size: 1024",
        },
        {
          id: "output-1",
          type: "output",
          label: "4-Stem Output Target",
          proofStatus: "Planned / Output target: separated stem files will appear here after a successful ensemble run."
        },
      ]);
    } else if (presetId === "ensemble_4") {
      setPipelineNodes([
        {
          id: "input-1",
          type: "input",
          label: "Audio Load (Stereo Wav 44kHz)",
        },
        {
          id: "model-1",
          type: "model",
          label: "Lead Vocals BS-RoFormer",
          modelType: "BS-RoFormer",
          vramUsage: "4.5 GB VRAM",
        },
        {
          id: "model-2",
          type: "model",
          label: "Backing Vocals MDX23C",
          modelType: "MDX23C",
          vramUsage: "3.5 GB VRAM",
        },
        {
          id: "math-1",
          type: "math",
          label: "Ensemble Average Aggregator",
          bleedDepth: "Estimated / Not measured",
        },
        {
          id: "model-3",
          type: "model",
          label: "Rhythm Demucs HQ",
          modelType: "Demucs-v4",
          vramUsage: "4.0 GB VRAM",
        },
        { 
          id: "output-1", 
          type: "output", 
          label: "Studio Stem Output Target",
          proofStatus: "Planned / Output target: separated stem files will appear here after a successful ensemble run."
        },
      ]);
    }
  };

  const totalEstimatedVram = pipelineNodes
    .reduce((acc, node) => {
      if (!node.vramUsage) return acc;
      const num = parseFloat(node.vramUsage);
      return acc + num;
    }, 0)
    .toFixed(1);

  // Derive model count
  const modelNodesCount = pipelineNodes.filter(n => n.type === "model").length;
  const isMinModelsMet = modelNodesCount >= 2;

  // Checklist items
  const checklist = [
    { name: "Input file selected", met: true, required: true },
    { name: `At least 2 models selected (Currently: ${modelNodesCount})`, met: isMinModelsMet, required: true },
    { name: "Required model files installed", met: false, required: true, note: "Models mapped are planned reference only" },
    { name: "Python / audio-separator environment available", met: true, required: true },
    { name: "FFmpeg configured", met: true, required: true },
    { name: "Output folder selected", met: true, required: true },
    { name: "Ensemble backend implemented", met: false, required: true, note: "Backend planning only / Not active" },
    { name: "Enough disk space estimate", met: true, required: true },
    { name: "Device mode selected", met: true, required: true },
    { name: "CUDA / GPU proof status", met: false, required: false, note: "CUDA Structurally supported / Not locally proven in browser" },
  ];

  const missingItems = checklist.filter(item => item.required && !item.met);
  const isEnsembleReady = missingItems.length === 0;

  return (
    <div className="p-6 rounded-2xl bg-[#0a0c14]/40 border border-[#00ff00]/10 shadow-xl backdrop-blur-xl space-y-6">
      
      {/* SECTION 1: HEADER SECTION TITLE & DESCRIPTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
              Pipeline Planner
            </span>
            <span className="text-[10px] font-mono font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Ensemble Mode: Planning View — Planned / Not active
            </span>
          </div>
          <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Ensemble Manager
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Build or preview multi-model separation workflows. Ensemble processing can compare or combine outputs from multiple models, but results vary by song, model quality, and backend support.
          </p>
        </div>
        <HelpToggle sectionId="ensemble" label="Show Help" />
      </div>

      <HelpText
        sectionId="ensemble"
        text="The Ensemble Manager is currently configured as a legacy UVR5 reference pipeline planner. You can pick dual or advanced multi-stem blueprints or customize your sequential workflow structure. No active model execution occurs on this dashboard."
      />

      {/* SECTION 2: PIPELINE BLUEPRINTS */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
          Select Blueprint Preset
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => loadPreset(p.id)}
              className={`p-4 text-left rounded-xl border transition-all duration-200 cursor-pointer ${
                selectedPreset === p.id
                  ? "bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-indigo-500/40 shadow-inner"
                  : "bg-black/30 border-white/5 hover:bg-black/20 hover:border-white/10"
              }`}
            >
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-indigo-400 block mb-1">
                Pipeline Blueprint
              </span>
              <h4 className="text-xs font-bold text-white leading-snug">
                {p.name}
              </h4>
              <p className="text-[10px] text-slate-400 mt-2 font-mono leading-normal">
                {p.complexity}
              </p>
            </button>
          ))}
        </div>

        {/* Blueprint guidelines / notes */}
        <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800 text-[11px] text-slate-400 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 font-mono">•</span>
            <span>Requires installed model files.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 font-mono">•</span>
            <span>Requires local AI backend readiness.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 font-mono">•</span>
            <span>Requires at least 2 model outputs or compatible models.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 font-mono">•</span>
            <span>May increase processing time and memory usage.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-indigo-400 font-mono">•</span>
            <span>Results vary by source material.</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: PIPELINE FLOWCHART VISUALIZER */}
      <div className="space-y-3">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
          Sequential Pipeline Nodes Map
        </span>
        <div className="p-5 bg-black/60 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-5%] w-[40%] h-[60%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-center gap-3 relative z-10 transition-all">
            {pipelineNodes.map((node, index) => {
              const isModel = node.type === "model";
              const isMath = node.type === "math";
              const isInput = node.type === "input";
              const isOutput = node.type === "output";

              return (
                <React.Fragment key={node.id}>
                  {/* Node Box card representation */}
                  <div
                    className={`p-4 rounded-xl border transition-all duration-300 relative group flex-1 self-stretch flex flex-col justify-between ${
                      isModel
                        ? "bg-gradient-to-b from-blue-500/10 to-indigo-500/5 border-blue-500/25 hover:border-blue-500/50 hover:bg-white/[0.04]"
                        : isMath
                          ? "bg-purple-950/25 border-purple-500/20 text-purple-300"
                          : isInput
                            ? "bg-slate-900/50 border-slate-700/50 text-slate-300"
                            : "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-[8px] uppercase tracking-wider font-mono font-extrabold opacity-60">
                          {node.type.toUpperCase()} NODE
                        </span>
                        {isModel && (
                          <button
                            onClick={() => removeNode(node.id)}
                            className="text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5 cursor-pointer"
                            title="Remove Model Node"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white mb-2 font-mono">
                        {node.label}
                      </h4>
                    </div>

                    <div>
                      {isModel && (
                        <div className="space-y-1 text-[10px] font-mono text-slate-400">
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span>Base Engine:</span>
                            <span className="text-blue-300 font-bold">
                              {node.modelType}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>VRAM Estimate:</span>
                            <span className="text-slate-300">{node.vramUsage || "1.5 GB VRAM"}</span>
                          </div>
                          {node.parameters && (
                            <div className="text-[9px] text-slate-500 leading-tight pt-1 border-t border-white/5 text-purple-300">
                              {node.parameters}
                            </div>
                          )}
                        </div>
                      )}

                      {isMath && (
                        <div className="space-y-1 text-[10px] font-mono">
                          <div className="flex justify-between border-b border-white/5 pb-1 text-[9px] text-purple-400">
                            <span>Isolation Level:</span>
                            <span className="text-purple-300 font-bold">
                              {node.bleedDepth}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-500 leading-normal pt-1">
                            Voxel / Average processing. May reduce vocal bleed, but results vary.
                          </p>
                        </div>
                      )}

                      {isInput && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          Decoupled raw master stereo source input config
                        </p>
                      )}

                      {isOutput && (
                        <div className="text-[10px] text-emerald-400 font-mono space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Output planned — not yet generated</span>
                          </div>
                          <span className="text-[8px] text-slate-500 block leading-tight">
                            {node.proofStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow spacing */}
                  {index < pipelineNodes.length - 1 && (
                    <div className="flex items-center justify-center shrink-0 py-1 xl:py-0">
                      <ArrowRight className="w-4 h-4 text-slate-600 transform rotate-90 xl:rotate-0" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Append button */}
          <div className="mt-5 flex justify-center border-t border-white/5 pt-3">
            <button
              onClick={addCustomModelNode}
              className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-300 border border-blue-500/20 rounded-xl text-xs hover:from-blue-600/30 hover:to-indigo-600/30 hover:border-blue-500/40 transition-all cursor-pointer font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              ADD SEPARATION STAGE MODEL NODE
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: UNWIRED / LEGACY COMPUTATION SETTINGS */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
          Configure Mathematical Weighting (Legacy UVR5 Planner References)
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-purple-400 font-bold block text-[10px] uppercase font-mono tracking-wider">
                Phase Inversion / Cleanup Process
              </label>
              <span className="text-[8px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-800">
                Planner Param
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Injects subtraction-based cleanup, if implemented. Subtracts opposing segment patterns to filter high-frequency resonance.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[9px] text-slate-400 uppercase font-semibold">Enabled</span>
              <button
                onClick={() => setSubtractPhase(!subtractPhase)}
                className="text-slate-300 hover:text-white cursor-pointer focus:outline-none"
              >
                {subtractPhase ? (
                  <ToggleRight className="w-7 h-7 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-slate-600" />
                )}
              </button>
            </div>
          </div>

          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-blue-400 font-bold block text-[10px] uppercase font-mono tracking-wider">
                Min Spec Weighted Filter
              </label>
              <span className="text-[8px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-800">
                Legacy / Not wired
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Narrow limits for transient extraction. Employs median/average blending, if implemented.
            </p>
            <div className="pt-2">
              <input
                type="range"
                disabled
                min="0"
                max="100"
                value="45"
                className="w-full h-1 bg-slate-800 rounded-full cursor-not-allowed appearance-none outline-none accent-slate-600"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span>Value: 45</span>
                <span>Unwired</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-amber-400 font-bold block text-[10px] uppercase font-mono tracking-wider">
                Max Spec Weighted Filter
              </label>
              <span className="text-[8px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-800">
                Legacy / Not wired
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Determines peak frequency capping for sequential model aggregation.
            </p>
            <div className="pt-2">
              <input
                type="range"
                disabled
                min="0"
                max="100"
                value="85"
                className="w-full h-1 bg-slate-800 rounded-full cursor-not-allowed appearance-none outline-none accent-slate-600"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span>Value: 85</span>
                <span>Unwired</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: ESTIMATED PEAK VRAM & HARDWARE GUIDES */}
      <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center font-mono">
        <div className="space-y-1.5 text-xs">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-400" />
            Ensemble Workflow Considerations
          </h4>
          <p className="text-slate-400 leading-relaxed max-w-xl">
            Subtracting Model A's output from the original audio source creates an isolated instrumental submix. Subsequent model stages must be sequentially processed on your system, multiplying execution timeline lengths.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center shrink-0 w-full md:w-auto p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <div className="text-left">
            <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
              Estimated Peak VRAM
            </span>
            <span className="font-bold text-white text-base">
              {totalEstimatedVram} GB estimate
            </span>
            <span className="text-[9px] text-slate-400 block max-w-[210px] leading-normal mt-0.5">
              Memory Safety: May exceed available VRAM depending on model, segment size, input length, and backend. 
              <span className="text-yellow-500 block font-semibold">(Estimated only / Not live hardware check)</span>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 6: COMPREHENSIVE PREFLIGHT CHECKLIST & REQ BANNER */}
      <div className="p-5 rounded-2xl bg-[#090b14]/90 border border-slate-800 shadow-lg space-y-4 font-mono">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider block mb-1">
            Preflight Stage Validation
          </span>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            Ensemble Pipeline Readiness & Requirements
          </h3>
        </div>

        {/* Requirements missing banner */}
        {!isEnsembleReady && (
          <div className="p-3 rounded-lg border bg-rose-500/10 border-rose-500/30 text-rose-400 flex items-start gap-2.5 text-xs">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                Blocked: Ensemble requirements missing
              </span>
              <p className="text-[11px] text-rose-400/80 mt-0.5 leading-relaxed">
                The pipeline is not ready for execution because multiple validation markers are unmet or represent planned implementation features. 
                Missing items: {missingItems.map(m => m.name).join(", ")}.
              </p>
            </div>
          </div>
        )}

        {isEnsembleReady && (
          <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center gap-2.5 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-bold">All Checklist Metrics Met (Local Dry-run Only)</span>
            </div>
          </div>
        )}

        {/* 10-Item validation checklist grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-1 text-xs">
          {checklist.map((item, index) => (
            <div
              key={index}
              className={`p-2.5 rounded-lg border flex flex-col justify-between h-[85px] transition-all bg-black/45 ${
                item.met
                  ? "border-[#00ff00]/10 hover:border-[#00ff00]/25"
                  : item.required
                    ? "border-rose-950/40 hover:border-rose-950/70"
                    : "border-slate-800"
              }`}
            >
              <div className="flex items-start gap-1.5 justify-between">
                <span className="font-semibold text-slate-300 text-[10px] leading-tight">
                  {item.name}
                </span>
                {item.met ? (
                  <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                ) : item.required ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                )}
              </div>

              <div className="text-[9px] text-slate-500 leading-tight">
                {item.met ? (
                  <span className="text-emerald-500 font-semibold uppercase">Verified</span>
                ) : item.required ? (
                  <span className="text-rose-500 font-bold uppercase">Missing / Planned</span>
                ) : (
                  <span className="text-amber-500 uppercase">Warning</span>
                )}
                {item.note && (
                  <span className="block text-[8px] text-slate-600 truncate" title={item.note}>
                    {item.note}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* RUN PIPELINE PROCESS BUTTON */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-3 border-t border-white/5">
          <p className="text-[10px] text-slate-500 max-w-md leading-normal">
            Ensemble model aggregation cannot occur inside web client frames. Always ensure required model binaries are downloaded into your local environment directory first.
          </p>
          <button
            disabled
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-500 rounded-xl text-xs font-bold font-mono cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Run Ensemble Pipeline — Blocked / Planned/Not active
          </button>
        </div>
      </div>
    </div>
  );
}
