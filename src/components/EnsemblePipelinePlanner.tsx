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
  Check,
} from "lucide-react";
import { HelpToggle, HelpText } from "./HelpSystem";

// Backend readiness input props
export interface EnsembleReadiness {
  inputFileSelected: boolean;
  modelFilesInstalled: boolean;
  pythonReady: boolean;
  audioSeparatorReady: boolean;
  ffmpegReady: boolean;
  outputFolderSelected: boolean;
  outputFolderWritable?: boolean;
  ensembleBackendImplemented: boolean;
  diskSpaceChecked: boolean;
  diskSpaceOk?: boolean;
  deviceModeSelected: boolean;
  cudaProofPassed?: boolean;
}

export interface EnsemblePipelinePlannerProps {
  readiness?: EnsembleReadiness;
  inputMetadata?: {
    filename?: string;
    sampleRate?: number;
    channels?: number;
    duration?: number;
    exists?: boolean;
  };
  deviceMode?: string;
}

interface PipelineNode {
  id: string;
  type: "input" | "model" | "math" | "output";
  label: string;
  modelType?: string;
  parameters?: string;
  estimatedVramGb?: number; // Numeric VRAM totals
  bleedDepth?: string;
  statusNote?: string; // Renamed from proofStatus
  registryRequired?: boolean;
}

type ChecklistStatus = "planner_only" | "not_checked" | "missing" | "blocked" | "warning" | "ready" | "not_applicable";

interface ChecklistItem {
  id: string;
  name: string;
  status: ChecklistStatus;
  required: boolean;
  note?: string;
  source?: "real_diagnostic" | "user_selection" | "static_planner" | "not_wired";
}

const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  planner_only: "Planner only / Not executed",
  not_checked: "Not checked",
  missing: "Missing",
  blocked: "Blocked",
  warning: "Warning",
  ready: "Ready",
  not_applicable: "Not applicable",
};

const CHECKLIST_STATUS_CLASSES: Record<ChecklistStatus, string> = {
  planner_only: "text-indigo-400 font-semibold uppercase",
  not_checked: "text-slate-400 font-semibold uppercase",
  missing: "text-rose-400 font-bold uppercase",
  blocked: "text-red-500 font-semibold uppercase",
  warning: "text-amber-500 font-semibold uppercase",
  ready: "text-emerald-500 font-semibold uppercase",
  not_applicable: "text-slate-500 font-semibold uppercase",
};

const PRESETS = [
  {
    id: "dual",
    name: "Standard Dual Model Ensemble",
    complexity: "Requires 2 model outputs. Allows comparison or combination if backend supports it.",
  },
  {
    id: "subtraction",
    name: "Vocal-Focused Two-Model Pipeline",
    complexity: "Reference workflow for vocal-focused cleanup. Not guaranteed to improve output.",
  },
  {
    id: "ensemble_4",
    name: "Advanced 4-Stem Ensemble Pipeline",
    complexity: "Reference 4-stem ensemble plan. Higher CPU/VRAM demand if implemented.",
  },
];

export default function EnsemblePipelinePlanner({
  readiness,
  inputMetadata,
  deviceMode,
}: EnsemblePipelinePlannerProps = {}) {
  const [pipelineNodes, setPipelineNodes] = useState<PipelineNode[]>([
    {
      id: "input-1",
      type: "input",
      label: "Input Audio",
    },
    {
      id: "model-1",
      type: "model",
      label: "Reference Model Slot (e.g. BS-RoFormer v2)",
      modelType: "Model not selected",
      parameters: "Parameters not configured",
      estimatedVramGb: 4.2,
      registryRequired: true,
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
      label: "Reference Model Slot (e.g. Demucs-v4 Rhythm)",
      modelType: "Model not selected",
      parameters: "Parameters not configured",
      estimatedVramGb: 3.1,
      registryRequired: true,
    },
    {
      id: "output-1",
      type: "output",
      label: "Planned Output Target",
      statusNote: "Output target reference only. No files are generated from this planner view.",
    },
  ]);

  const [subtractPhase, setSubtractPhase] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("subtraction");

  const addCustomModelNode = () => {
    const newNodeId = `model-${Date.now()}`;
    const newNode: PipelineNode = {
      id: newNodeId,
      type: "model",
      label: "New Model Slot",
      modelType: "Model not selected",
      parameters: "Parameters not configured",
      estimatedVramGb: undefined, // Show VRAM estimate unavailable
      registryRequired: true,
    };

    setPipelineNodes((prev) => {
      const copy = [...prev];
      copy.splice(copy.length - 1, 0, newNode);
      return copy;
    });
  };

  const removeNode = (id: string) => {
    setPipelineNodes((prev) => {
      const target = prev.find((n) => n.id === id);
      if (!target || target.type !== "model") return prev;

      // Always allow removing model slots, but keeps at least 1 slot for custom planning
      const modelNodesCount = prev.filter((n) => n.type === "model").length;
      if (modelNodesCount <= 1) return prev;

      return prev.filter((node) => node.id !== id);
    });
  };

  const loadPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId === "dual") {
      setPipelineNodes([
        {
          id: "input-1",
          type: "input",
          label: "Input Audio",
        },
        {
          id: "model-1",
          type: "model",
          label: "Reference Model Slot (e.g. Prism-RoFormer Vocals)",
          modelType: "Model not selected",
          parameters: "Parameters not configured",
          estimatedVramGb: 3.8,
          registryRequired: true,
        },
        {
          id: "model-2",
          type: "model",
          label: "Reference Model Slot (e.g. MDX-Net Instrumental Submix)",
          modelType: "Model not selected",
          parameters: "Parameters not configured",
          estimatedVramGb: 2.5,
          registryRequired: true,
        },
        {
          id: "output-1",
          type: "output",
          label: "Planned Output Target",
          statusNote: "Output target reference only. No files are generated from this planner view.",
        },
      ]);
    } else if (presetId === "subtraction") {
      setPipelineNodes([
        {
          id: "input-1",
          type: "input",
          label: "Input Audio",
        },
        {
          id: "model-1",
          type: "model",
          label: "Reference Model Slot (e.g. BS-RoFormer v2)",
          modelType: "Model not selected",
          parameters: "Parameters not configured",
          estimatedVramGb: 4.2,
          registryRequired: true,
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
          label: "Reference Model Slot (e.g. Demucs-v4 Rhythm)",
          modelType: "Model not selected",
          parameters: "Parameters not configured",
          estimatedVramGb: 3.1,
          registryRequired: true,
        },
        {
          id: "output-1",
          type: "output",
          label: "Planned Output Target",
          statusNote: "Output target reference only. No files are generated from this planner view.",
        },
      ]);
    } else if (presetId === "ensemble_4") {
      setPipelineNodes([
        {
          id: "input-1",
          type: "input",
          label: "Input Audio",
        },
        {
          id: "model-1",
          type: "model",
          label: "Reference Model Slot (e.g. Lead Vocals BS-RoFormer)",
          modelType: "Model not selected",
          parameters: "Parameters not configured",
          estimatedVramGb: 4.5,
          registryRequired: true,
        },
        {
          id: "model-2",
          type: "model",
          label: "Reference Model Slot (e.g. Backing Vocals MDX23C)",
          modelType: "Model not selected",
          parameters: "Parameters not configured",
          estimatedVramGb: 3.5,
          registryRequired: true,
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
          label: "Reference Model Slot (e.g. Rhythm Demucs HQ)",
          modelType: "Model not selected",
          parameters: "Parameters not configured",
          estimatedVramGb: 4.0,
          registryRequired: true,
        },
        {
          id: "output-1",
          type: "output",
          label: "Planned Output Target",
          statusNote: "Output target reference only. No files are generated from this planner view.",
        },
      ]);
    }
  };

  const totalEstimatedVram = pipelineNodes.reduce((acc, node) => {
    if (node.estimatedVramGb === undefined) return acc;
    return acc + node.estimatedVramGb;
  }, 0);

  const modelNodesCount = pipelineNodes.filter((n) => n.type === "model").length;
  const verifiedSelectedModelFiles = 0;
  const backendRunnerImplemented = readiness?.ensembleBackendImplemented === true;
  const verifiedInputReady = readiness?.inputFileSelected === true && inputMetadata?.exists === true;
  const inputFileStatusText = verifiedInputReady ? "Ready" : "Not checked";
  const inputMetadataStatusText = inputMetadata?.exists === true ? "Ready" : "Not checked";

  const requiredChecksNotCompleted = [
    "input file verification",
    "model file verification",
    "Python/audio-separator readiness",
    "FFmpeg readiness",
    "output folder verification",
    "disk space check",
    "device mode check",
    "backend implementation",
  ];

  // Build the 10-Item validation checklist using strictly verified props
  const checklist: ChecklistItem[] = [
    {
      id: "input_file",
      name: `Input File: ${inputFileStatusText}`,
      status: verifiedInputReady ? "ready" : "not_checked",
      required: true,
      note: verifiedInputReady
        ? "Input metadata exists and parent readiness reports an input."
        : "Input Metadata: Not checked",
      source: readiness ? "user_selection" : "not_wired",
    },
    {
      id: "input_metadata",
      name: `Input Metadata: ${inputMetadataStatusText}`,
      status: inputMetadata?.exists === true ? "ready" : "not_checked",
      required: true,
      note: inputMetadata?.exists === true ? "Metadata supplied by parent view." : "Input Metadata: Not checked",
      source: inputMetadata ? "user_selection" : "not_wired",
    },
    {
      id: "model_slots",
      name: `Model Slots: ${modelNodesCount}`,
      status: "planner_only",
      required: false,
      note: "Reference slots only. They are not selected model files.",
      source: "static_planner",
    },
    {
      id: "verified_models",
      name: `Verified Model Files Selected: ${verifiedSelectedModelFiles}`,
      status: verifiedSelectedModelFiles >= 2 ? "ready" : "missing",
      required: true,
      note: "Required for Execution: 2 or more verified model outputs or compatible models",
      source: "not_wired",
    },
    {
      id: "models_installed",
      name: "Model file verification",
      status: readiness ? (readiness.modelFilesInstalled ? "ready" : "missing") : "not_checked",
      required: true,
      note: readiness?.modelFilesInstalled
        ? "Model availability reported by parent readiness."
        : "Not checked - backend runner not implemented",
      source: readiness ? "real_diagnostic" : "not_wired",
    },
    {
      id: "python_env",
      name: "Python & audio-separator readiness",
      status: readiness
        ? readiness.pythonReady && readiness.audioSeparatorReady
          ? "ready"
          : "missing"
        : "not_checked",
      required: true,
      note: readiness?.pythonReady
        ? "Runtime readiness reported by parent view."
        : "Not checked - backend runner not implemented",
      source: readiness ? "real_diagnostic" : "not_wired",
    },
    {
      id: "ffmpeg_env",
      name: "FFmpeg configured",
      status: readiness ? (readiness.ffmpegReady ? "ready" : "missing") : "not_checked",
      required: true,
      note: readiness?.ffmpegReady
        ? "Executables detected by parent readiness."
        : "Not checked - backend runner not implemented",
      source: readiness ? "real_diagnostic" : "not_wired",
    },
    {
      id: "output_folder",
      name: "Output folder selected",
      status: readiness ? (readiness.outputFolderSelected ? "ready" : "missing") : "not_checked",
      required: true,
      note: readiness?.outputFolderSelected
        ? "Destination reported by parent readiness."
        : "Output folder verification not checked",
      source: readiness ? "user_selection" : "not_wired",
    },
    {
      id: "ensemble_backend",
      name: "Backend implementation",
      status: backendRunnerImplemented ? "ready" : "blocked",
      required: true,
      note: backendRunnerImplemented
        ? "Backend runner reported by parent readiness."
        : "Backend runner not implemented. Planner only / Not executed.",
      source: "not_wired",
    },
    {
      id: "disk_space",
      name: "Disk space check",
      status: readiness && readiness.diskSpaceChecked ? (readiness.diskSpaceOk ? "ready" : "warning") : "not_checked",
      required: true,
      note:
        readiness && readiness.diskSpaceChecked
          ? "Drive check completed."
          : "Not checked - backend runner not implemented",
      source: readiness?.diskSpaceChecked ? "real_diagnostic" : "not_wired",
    },
    {
      id: "device_mode",
      name: "Device mode check",
      status: readiness ? (readiness.deviceModeSelected ? "ready" : "missing") : "not_checked",
      required: true,
      note: deviceMode
        ? deviceMode === "auto"
          ? "Auto selected / Backend decides device"
          : `Forced to ${deviceMode}`
        : "Not checked - backend runner not implemented",
      source: readiness ? "real_diagnostic" : "not_wired",
    },
    {
      id: "cuda_proof",
      name: "CUDA / GPU proof status",
      status: readiness ? (readiness.cudaProofPassed ? "ready" : "warning") : "not_applicable",
      required: false,
      note: "Static planning estimate / Not a live VRAM check. Not locally proven until a real E2E proof passes.",
      source: readiness ? "real_diagnostic" : "not_wired",
    },
  ];
  const executionUnavailable = !backendRunnerImplemented || verifiedSelectedModelFiles < 2 || !verifiedInputReady;

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
              Ensemble Mode: Planning View / Not active
            </span>
            <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Code: ENSEMBLE_PLANNER_ONLY
            </span>
          </div>
          <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Ensemble Manager
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
            Plan multi-model separation workflows and review requirements before execution support is available. This
            panel plans ensemble workflows only. It does not run model aggregation, create output files, or count as AI
            proof.
          </p>
        </div>
        <HelpToggle sectionId="ensemble" label="Show Help" />
      </div>

      <HelpText
        sectionId="ensemble"
        text="The Ensemble Manager is currently configured as a legacy UVR5 reference pipeline planner. You can pick dual or advanced multi-stem blueprints or customize your sequential workflow structure. No active model execution occurs on this dashboard, and planner output does not count as AI proof."
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
              aria-pressed={selectedPreset === p.id}
              aria-label={`Select ensemble preset ${p.name}`}
              className={`p-4 text-left rounded-xl border transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                selectedPreset === p.id
                  ? "bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-indigo-500/40 shadow-inner"
                  : "bg-black/30 border-white/5 hover:bg-black/20 hover:border-white/10"
              }`}
            >
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-indigo-400 block mb-1">
                Pipeline Blueprint
              </span>
              <h4 className="text-xs font-bold text-white leading-snug">{p.name}</h4>
              <p className="text-[10px] text-slate-400 mt-2 font-mono leading-normal">{p.complexity}</p>
            </button>
          ))}
        </div>

        {/* Blueprint guidelines / notes */}
        <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-800 text-[11px] text-slate-400 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
          <div className="flex items-start gap-1.5 font-mono">
            <span className="text-indigo-400">•</span>
            <span>Requires verified model files before execution.</span>
          </div>
          <div className="flex items-start gap-1.5 font-mono">
            <span className="text-indigo-400">•</span>
            <span>Requires a future native backend runner.</span>
          </div>
          <div className="flex items-start gap-1.5 font-mono">
            <span className="text-indigo-400">•</span>
            <span>Requires at least 2 model outputs or compatible models.</span>
          </div>
          <div className="flex items-start gap-1.5 font-mono">
            <span className="text-indigo-400">•</span>
            <span>Static planning only; no stems are created here.</span>
          </div>
          <div className="flex items-start gap-1.5 font-mono">
            <span className="text-indigo-400">•</span>
            <span>Planner output does not count as AI proof.</span>
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
                            aria-label={`Remove model stage ${node.label}`}
                            className="text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5 cursor-pointer outline-none focus-visible:opacity-100"
                            title="Remove model stage node"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white mb-2 font-mono">{node.label}</h4>
                    </div>

                    <div>
                      {isModel && (
                        <div className="space-y-1 text-[10px] font-mono text-slate-400">
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span>Base Engine Slot:</span>
                            <span className="text-slate-505 font-medium">{node.modelType}</span>
                          </div>
                          <div className="flex justify-between pb-1 border-b border-white/5">
                            <span>Static VRAM Estimate:</span>
                            <span className="text-slate-300">
                              {node.estimatedVramGb !== undefined
                                ? `${node.estimatedVramGb.toFixed(1)} GB estimate`
                                : "VRAM estimate unavailable"}
                            </span>
                          </div>
                          <div className="flex justify-between pb-1 border-b border-white/5 text-yellow-500/80 font-bold">
                            <span>Live VRAM Check:</span>
                            <span>Not checked</span>
                          </div>

                          <div className="pt-1.5 space-y-0.5 text-[9px] text-slate-500 leading-tight">
                            <div className="flex justify-between">
                              <span>Model Registry ID:</span>
                              <span className="text-slate-500">None linked</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Verified File Selected:</span>
                              <span className="text-slate-500 font-bold">No</span>
                            </div>
                            <div className="flex justify-between text-yellow-500/80 font-bold">
                              <span>Model Registry Link:</span>
                              <span>Planned / Not active</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Installed Status:</span>
                              <span className="text-slate-500">not checked</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Hash Status:</span>
                              <span className="text-slate-500 font-bold">not checked</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Local File Status:</span>
                              <span className="text-slate-500">not checked</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {isMath && (
                        <div className="space-y-1 text-[10px] font-mono">
                          <div className="flex justify-between border-b border-white/5 pb-1 text-[9px] text-purple-400">
                            <span>Isolation Level:</span>
                            <span className="text-purple-300 font-bold">{node.bleedDepth}</span>
                          </div>
                          <p className="text-[9px] text-slate-500 leading-normal pt-1">
                            Reference math stage only. Actual ensemble math is not implemented in this planner.
                          </p>
                          <p className="text-[9px] text-purple-400/80 leading-normal">
                            Bleed reduction / phase processing reference. Results vary if implemented.
                          </p>
                        </div>
                      )}

                      {isInput && (
                        <div className="space-y-1 text-[10px] font-mono text-slate-400">
                          {inputMetadata ? (
                            <div className="pt-1.5 space-y-0.5 border-t border-white/5 text-[9px]">
                              <div className="flex justify-between">
                                <span>Filename:</span>
                                <span className="text-slate-300 truncate max-w-[120px]" title={inputMetadata.filename}>
                                  {inputMetadata.filename}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Sample Rate:</span>
                                <span className="text-slate-400">
                                  {inputMetadata.sampleRate ? `${inputMetadata.sampleRate} Hz` : "n/a"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Channels:</span>
                                <span className="text-slate-400">
                                  {inputMetadata.channels ? (inputMetadata.channels === 2 ? "Stereo" : "Mono") : "n/a"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Duration:</span>
                                <span className="text-slate-400">
                                  {inputMetadata.duration ? `${inputMetadata.duration}s` : "n/a"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>File Exists:</span>
                                <span
                                  className={`${inputMetadata.exists ? "text-emerald-400" : "text-rose-400"} font-bold`}
                                >
                                  {inputMetadata.exists ? "Yes" : "No"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-1.5 space-y-0.5 border-t border-white/5 text-[9px]">
                              <div className="flex justify-between">
                                <span>Input File:</span>
                                <span className="text-slate-500 font-bold">Not checked</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Input Metadata:</span>
                                <span className="text-slate-500 font-bold">Not checked</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Execution Status:</span>
                                <span className="text-indigo-400 font-bold">Planner only</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isOutput && (
                        <div className="text-[10px] text-emerald-400 font-mono space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Output target reference only</span>
                          </div>
                          <span className="text-[8.5px] text-slate-500 block leading-normal pt-1 border-t border-white/5">
                            {node.statusNote}
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
          <div className="mt-5 flex justify-center border-t border-white/5 pt-3 animate-fade-in">
            <button
              onClick={addCustomModelNode}
              className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-300 border border-blue-500/20 rounded-xl text-xs hover:from-blue-600/30 hover:to-indigo-600/30 hover:border-blue-500/40 transition-all cursor-pointer font-bold flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Plus className="w-4 h-4" />
              ADD SEPARATION STAGE MODEL SLOT
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
          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1.5">
                <label className="text-purple-400 font-bold block text-[10px] uppercase font-mono tracking-wider">
                  Phase Inversion / Cleanup Process
                </label>
                <span className="text-[8px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-800 shrink-0">
                  Planner Param
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal mt-1.5">
                Reference toggle only. If implemented, subtraction or phase-based processing may attempt to reduce bleed
                between model outputs, but it can introduce artifacts and must be validated per track.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[9px] text-slate-400 uppercase font-semibold">
                  Planner parameter / Not active
                </span>
                <button
                  onClick={() => setSubtractPhase(!subtractPhase)}
                  aria-pressed={subtractPhase}
                  aria-label="Toggle subtraction-based phase processing note (planner parameter only)"
                  className="text-indigo-400 hover:text-indigo-3 w-7 h-7 flex items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                >
                  {subtractPhase ? (
                    <ToggleRight className="w-7 h-7 text-indigo-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600" />
                  )}
                </button>
              </div>
              <span className="block text-[8px] text-slate-600 text-right mt-1">
                Stored planner note only / not executed
              </span>
            </div>
          </div>

          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1.5">
                <label className="text-blue-400 font-bold block text-[10px] uppercase font-mono tracking-wider">
                  Min Spec Weighted Filter
                </label>
                <span className="text-[8px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-800 shrink-0">
                  Legacy / Not wired
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal mt-1.5">
                Reference limits for transient extraction. Median or average blending would require a future backend
                runner.
              </p>
            </div>
            <div className="pt-2 border-t border-white/5">
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

          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1.5">
                <label className="text-amber-400 font-bold block text-[10px] uppercase font-mono tracking-wider">
                  Max Spec Weighted Filter
                </label>
                <span className="text-[8px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-800 shrink-0">
                  Legacy / Not wired
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal mt-1.5">
                Reference cap for future sequential model aggregation. This control is not wired to active audio.
              </p>
            </div>
            <div className="pt-2 border-t border-white/5">
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
          <p className="text-slate-400 leading-relaxed max-w-xl font-sans">
            If implemented, an ensemble workflow may compare, subtract, or combine outputs from multiple verified model
            runs. This planner does not execute those operations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center shrink-0 w-full md:w-auto p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <div className="text-left">
            <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
              Static Planning VRAM Estimate
            </span>
            <span className="font-bold text-white text-base">
              {totalEstimatedVram > 0 ? `${totalEstimatedVram.toFixed(1)} GB estimate` : "VRAM estimate unavailable"}
            </span>
            <span className="text-[9px] text-slate-400 block max-w-[210px] leading-normal mt-0.5 font-sans">
              Static planning estimate / Not a live VRAM check. Actual memory use cannot be verified until a backend
              runner inspects hardware and executes real model runs.
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 6: COMPREHENSIVE PREFLIGHT CHECKLIST & REQ BANNER */}
      <div className="p-5 rounded-2xl bg-[#090b14]/90 border border-slate-800 shadow-lg space-y-4 font-mono">
        {/* HEADER */}
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider block mb-1">
            Preflight Stage Validation
          </span>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            Ensemble Pipeline Readiness & Requirements
          </h3>
        </div>

        {/* PLANNER SOURCE SESSION METADATA PANEL */}
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-900 space-y-3">
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
            Planner Source Session Metadata
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 text-[11px] text-slate-400">
            <div>
              <span className="text-slate-600 font-bold block text-[9px] uppercase tracking-wider">
                Preset Selected:
              </span>
              <span className="text-slate-300 font-mono font-semibold">
                {PRESETS.find((p) => p.id === selectedPreset)?.name || "Custom Layout"}
              </span>
            </div>
            <div>
              <span className="text-slate-600 font-bold block text-[9px] uppercase tracking-wider">Model Slots:</span>
              <span className="text-indigo-400 font-mono font-bold">{modelNodesCount}</span>
            </div>
            <div>
              <span className="text-slate-600 font-bold block text-[9px] uppercase tracking-wider">
                Verified Model Files Selected:
              </span>
              <span className="text-slate-500 font-mono font-bold">{verifiedSelectedModelFiles}</span>
            </div>
            <div>
              <span className="text-slate-600 font-bold block text-[9px] uppercase tracking-wider">
                Selected Models:
              </span>
              <span className="text-slate-500 font-mono font-bold">
                {verifiedSelectedModelFiles} verified model files selected
              </span>
            </div>
            <div>
              <span className="text-slate-600 font-bold block text-[9px] uppercase tracking-wider">Input File:</span>
              <span className="text-slate-500 font-mono font-bold">{inputFileStatusText}</span>
            </div>
            <div>
              <span className="text-slate-600 font-bold block text-[9px] uppercase tracking-wider">
                Input Metadata:
              </span>
              <span className="text-slate-500 font-mono font-bold">{inputMetadataStatusText}</span>
            </div>
            <div>
              <span className="text-slate-600 font-bold block text-[9px] uppercase tracking-wider">
                Backend Status:
              </span>
              <span className="text-rose-400 font-mono font-bold">Backend runner not implemented</span>
            </div>
            <div>
              <span className="text-slate-600 font-bold block text-[9px] uppercase tracking-wider">
                Planned Output Target:
              </span>
              <span className="text-slate-500 font-mono">Reference only</span>
            </div>
            <div>
              <span className="text-slate-600 font-bold block text-[9px] uppercase tracking-wider">Proof Status:</span>
              <span className="text-slate-500 font-mono font-medium">No active E2E proof</span>
            </div>
            <div>
              <span className="text-slate-600 font-bold block text-[9px] uppercase tracking-wider">Export Status:</span>
              <span className="text-slate-500 font-mono">Disabled</span>
            </div>
          </div>
          <div className="text-[9.5px] text-yellow-500/80 font-semibold border-t border-white/5 pt-1.5">
            Required for Execution: 2 or more verified model outputs or compatible models. Model Registry Integration:
            Planned / Not active.
          </div>
        </div>

        {/* Execution Scope Notice */}
        <div className="p-3.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-yellow-300/80">
          <Info className="w-4 h-4 shrink-0 text-yellow-400 mt-0.5" />
          <p className="leading-relaxed font-sans">
            <strong>Execution Scope Notice:</strong> This panel is a planning/reference tool. It does not run ensemble
            separation, create verified stems, or count as AI proof unless a backend ensemble runner is implemented and
            all preflight requirements pass.
          </p>
        </div>

        {/* Requirements Blocked Banner Summary */}
        {executionUnavailable && (
          <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-rose-400 font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Execution unavailable - planner only
            </span>
            <p className="font-sans text-[11px] text-rose-300/80 leading-relaxed">
              Backend runner not implemented. Several runtime checks remain not checked.
            </p>
            <div className="text-[10px] text-slate-500 font-mono">
              Code: ENSEMBLE_BACKEND_NOT_IMPLEMENTED
            </div>
            <div className="text-[10px] uppercase font-bold text-rose-300/70 pt-1">Required checks not completed:</div>
            <ul className="list-disc list-inside font-mono text-[11px] text-rose-300/80 space-y-1 pl-1">
              {requiredChecksNotCompleted.map((check) => (
                <li key={check} className="leading-snug">
                  {check}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!executionUnavailable && (
          <div className="p-3.5 rounded-lg border bg-emerald-500/10 border-[#00ff00]/30 text-emerald-450 flex items-center gap-2.5 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
            <div>
              <span className="font-bold">Planning checklist complete / execution backend reported by parent view</span>
            </div>
          </div>
        )}

        {/* 10-Item validation checklist grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pt-1 text-xs">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`p-2.5 rounded-lg border flex flex-col justify-between h-[95px] transition-all bg-black/45 ${
                item.status === "ready"
                  ? "border-[#00ff00]/10 hover:border-[#00ff00]/25"
                  : item.status === "missing" || item.status === "blocked"
                    ? "border-rose-950/40 hover:border-rose-950/70"
                    : item.status === "warning"
                      ? "border-amber-950/40 hover:border-amber-950/70"
                      : item.status === "planner_only"
                        ? "border-indigo-950/40 hover:border-indigo-950/70"
                        : item.status === "not_checked"
                          ? "border-slate-800 hover:border-slate-700"
                          : "border-slate-900 hover:border-slate-800"
              }`}
            >
              <div className="flex items-start gap-1.5 justify-between">
                <span className="font-semibold text-slate-300 text-[10px] leading-tight">{item.name}</span>
                {item.status === "ready" ? (
                  <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                ) : item.status === "missing" ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                ) : item.status === "blocked" ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                ) : item.status === "warning" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold">?</span>
                )}
              </div>

              <div className="text-[9px] text-slate-500 leading-tight">
                <span className={CHECKLIST_STATUS_CLASSES[item.status]}>{CHECKLIST_STATUS_LABELS[item.status]}</span>
                {item.note && (
                  <span className="block text-[8px] text-slate-600 truncate mt-1" title={item.note}>
                    {item.note}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* RUN PIPELINE PROCESS BUTTON */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 items-center gap-4 pt-3 border-t border-white/5">
          <p className="text-[10px] text-slate-500 max-w-md leading-normal col-span-2">
            Ensemble execution requires a future native backend runner. This planner view does not run model
            aggregation, verify input files, inspect live VRAM, or create output stems. Required model files must be
            verified before execution can be considered.
          </p>
          <div className="flex justify-end w-full col-span-1">
            <button
              disabled
              className="w-full lg:w-auto px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-600 rounded-xl text-xs font-bold font-mono cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Ensemble Pipeline — Backend not implemented
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
