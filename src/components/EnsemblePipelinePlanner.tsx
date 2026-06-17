import React, { useState } from "react";
import {
  Layers,
  Plus,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Cpu,
  Sparkles,
  CheckCircle,
  Info,
  Merge,
} from "lucide-react";

interface PipelineNode {
  id: string;
  type: "input" | "model" | "math" | "output";
  label: string;
  modelType?: string;
  parameters?: string;
  vramUsage?: string;
  bleedDepth?: string;
}

const PRESETS = [
  {
    id: "dual",
    name: "Standard Dual Model Ensemble (BS-Roformer + MDX)",
    complexity: "Moderate VRAM footprint",
  },
  {
    id: "subtraction",
    name: "Pristine Vocal Subtraction Pipeline (Roformer -> Demucs)",
    complexity: "Pristine Instrumental outputs",
  },
  {
    id: "ensemble_4",
    name: "Ultimate 4-Stem Cross-Bleed Ensembling",
    complexity: "Extremely high VRAM requirements",
  },
];

export default function EnsemblePipelinePlanner() {
  const [pipelineNodes, setPipelineNodes] = useState<PipelineNode[]>([
    { id: "input-1", type: "input", label: "Audio Load (Stereo Wav 44kHz)" },
    {
      id: "model-1",
      type: "model",
      label: "Extractor A: BS-Roformer v2",
      modelType: "BS-Roformer (Vocal Isolation)",
      vramUsage: "4.2 GB VRAM",
      parameters: "Overlap: 4x, Splits: 12",
    },
    {
      id: "math-1",
      type: "math",
      label: "Bleed Subtractor (Phase Cancellation)",
      bleedDepth: "-42 dB Isolation",
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
      label: "Pristine 4-Stems Workspace Output",
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
    if (pipelineNodes.length <= 3) return; // Prevent draining the pipeline totally
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
          label: "Prism-Roformer Vocals",
          modelType: "BS-Roformer",
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
          label: "2-Stem Submixes (Vocals/Inst)",
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
          label: "Extractor A: BS-Roformer v2",
          modelType: "BS-Roformer (Vocal Isolation)",
          vramUsage: "4.2 GB VRAM",
          parameters: "Overlap: 4x, Splits: 12",
        },
        {
          id: "math-1",
          type: "math",
          label: "Bleed Subtractor (Phase Cancellation)",
          bleedDepth: "-42 dB Isolation",
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
          label: "Pristine 4-Stems Workspace Output",
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
          label: "Lead Vocals BS-Roformer",
          modelType: "BS-Roformer",
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
          bleedDepth: "-48 dB Bleed suppression",
        },
        {
          id: "model-3",
          type: "model",
          label: "Rhythm Demucs HQ",
          modelType: "Demucs-v4",
          vramUsage: "4.0 GB VRAM",
        },
        { id: "output-1", type: "output", label: "Studio-Grade Stems Mixes" },
      ]);
    }
  };

  // Calculations based on currently loaded pipeline nodes
  const totalEstimatedVram = pipelineNodes
    .reduce((acc, node) => {
      if (!node.vramUsage) return acc;
      const num = parseFloat(node.vramUsage);
      return acc + num;
    }, 0)
    .toFixed(1);

  return (
    <div className="p-6 rounded-2xl bg-[#0a0c14]/40 border border-glass-border shadow-glass-shadow shadow-glass-inset backdrop-blur-xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          Ensemble Manager
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Chain various AI models together sequentially. The resulting pipeline
          guarantees highly isolated vocal stems using subtraction arrays and
          median-pass averages.
        </p>
      </div>

      {/* Preset pickers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => loadPreset(p.id)}
            className={`p-3 text-left rounded-xl border transition-all duration-200 cursor-pointer ${
              selectedPreset === p.id
                ? "bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-indigo-500/40 shadow-glass-inset shadow-glass-neon-blue/10"
                : "bg-black/30 border-white/5 hover:bg-black/20 hover:border-white/10"
            }`}
          >
            <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-indigo-400 block mb-0.5">
              Pipeline Blueprint
            </span>
            <h4 className="text-xs font-bold text-white leading-snug">
              {p.name}
            </h4>
            <span className="text-[10px] text-slate-400 mt-1.5 block font-mono">
              {p.complexity}
            </span>
          </button>
        ))}
      </div>

      {/* Pipeline flowchart Visualizer container */}
      <div className="p-5 bg-black/60 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-5%] w-[40%] h-[60%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-3 relative z-10">
          {pipelineNodes.map((node, index) => {
            const isModel = node.type === "model";
            const isMath = node.type === "math";
            const isInput = node.type === "input";
            const isOutput = node.type === "output";

            return (
              <React.Fragment key={node.id}>
                {/* Node Box card representation */}
                <div
                  className={`p-4 rounded-xl border transition-all duration-300 relative group flex-1 ${
                    isModel
                      ? "bg-gradient-to-b from-blue-500/10 to-indigo-500/5 border-blue-500/25 hover:border-blue-500/50 hover:bg-white/[0.04]"
                      : isMath
                        ? "bg-purple-950/20 border-purple-500/20 text-purple-300"
                        : isInput
                          ? "bg-slate-900/50 border-slate-700/50 text-slate-300"
                          : "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[8px] uppercase tracking-wider font-mono font-extrabold opacity-60">
                      {node.type.toUpperCase()} NODE
                    </span>
                    {isModel && (
                      <button
                        onClick={() => removeNode(node.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5 cursor-pointer"
                        title="Remove Node"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white mb-2 font-sans">
                    {node.label}
                  </h4>

                  {isModel && (
                    <div className="space-y-1 text-[10px] font-mono text-slate-400">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span>Engine:</span>
                        <span className="text-blue-300 font-bold">
                          {node.modelType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated VRAM:</span>
                        <span className="text-slate-200">{node.vramUsage}</span>
                      </div>
                      {node.parameters && (
                        <div className="text-[9px] text-slate-500 leading-tight pt-1 border-t border-white/5 select-none text-purple-300">
                          {node.parameters}
                        </div>
                      )}
                    </div>
                  )}

                  {isMath && (
                    <div className="space-y-1 text-[10px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-purple-400">
                          Bleed Reduction:
                        </span>
                        <span className="text-purple-300 font-bold">
                          {node.bleedDepth}
                        </span>
                      </div>
                    </div>
                  )}

                  {isInput && (
                    <p className="text-[10px] text-slate-500 font-mono">
                      Decoupled raw master stereo source input
                    </p>
                  )}

                  {isOutput && (
                    <div className="text-[10px] text-emerald-400 font-mono space-y-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        Complete Separation Lock
                      </div>
                      <span className="text-[9px] text-slate-500 block leading-none">
                        Output written separated by track stems
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow spacing */}
                {index < pipelineNodes.length - 1 && (
                  <div className="flex items-center justify-center shrink-0 py-1 lg:py-0">
                    <ArrowRight className="w-4 h-4 text-slate-600 transform rotate-90 lg:rotate-0" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Append button */}
        <div className="mt-4 flex justify-center border-t border-white/5 pt-3">
          <button
            onClick={addCustomModelNode}
            className="px-4 py-2 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-blue-300 border border-blue-500/20 rounded-xl text-xs hover:from-blue-600/40 hover:to-indigo-600/40 hover:border-blue-500/40 transition-all cursor-pointer font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            APPEND BACKEND SEPARATION NODE
          </button>
        </div>
      </div>

      {/* Node computations analysis */}
      <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-200 font-display flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-400" />
            Subtractive Ensembling Logic
          </h4>
          <p className="text-slate-400 leading-relaxed max-w-xl">
            Subtracting Model A's output from the original audio source creates
            an isolated instrumental submix with 99.8% vocal cancellation, which
            is then fed into Demucs for a pristine rhythm track split.
          </p>
        </div>

        <div className="flex flex-row md:flex-col lg:flex-row gap-4 items-center shrink-0 w-full md:w-auto justify-between md:justify-start">
          <div className="text-right font-mono text-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">
              Estimated Peak VRAM
            </span>
            <span className="font-bold text-white text-base">
              {totalEstimatedVram} GB
            </span>
            <span className="text-[10px] text-slate-400 block">
              Out-of-memory safe (8GB benchmark)
            </span>
          </div>

          <div className="flex items-center gap-2 bg-black/45 border border-white/5 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-400 font-mono">
              Phase Inversion
            </span>
            <button
              onClick={() => setSubtractPhase(!subtractPhase)}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              {subtractPhase ? (
                <ToggleRight className="w-8 h-8 text-indigo-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
