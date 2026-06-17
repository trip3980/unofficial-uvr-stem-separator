/**
 * UVR ARCHITECTURAL COUPLING SYSTEM & BACKEND ADAPTER LAYER
 *
 * =====================================================================================
 * FORK SPECIFIC DECAY & ADAPTATION NOTES (Rule 19):
 * 1. Anjok07 (ultimatevocalremovergui):
 *    - Treated strictly as our core Legacy Menu and workflow reference.
 *    - Pioneered high-quality wave blending/ phase cancels.
 *    - But heavily plagued by Tkinter monolithic blocks. We emulate this classic screen structure.
 * 2. nomadkaraoke (python-audio-separator) & streichgeorg fork:
 *    - Treated as our Primary Production Backend Candidate.
 *    - Extremely lightweight, programmatic, ONNX runtime powered, zero Tkinter bloat.
 *    - We default to constructing its CLI args.
 * 3. Eddycrack864 (UVR5-UI):
 *    - Treated as our Web UI Reference (Gradio grids).
 *    - High-velocity proof of web operations; but limited by Gradio rigid layouts.
 * 4. facebookresearch (demucs):
 *    - Treated as our Official Stem-Separation Model Reference.
 *    - Highly intensive memory demands; requires isolated submixes and split chunk protection.
 * 5. ZFTurbo (Music-Source-Separation-Training) & lucidrains (BS-RoFormer):
 *    - Treated as our Modern Model-Expansion Reference.
 *    - SOTA transformers with Rotary Position Embedding.
 * =====================================================================================
 */

import {
  ModelRegistryEntry,
  ProcessMethod,
  SettingSchemaEntry,
  ProcessingRequest,
  OutputFormat,
} from "../types";

// --- 1. PROCESS METHODS REGISTRY (Rule 3 & 7) ---
export const PROCESS_METHODS: ProcessMethod[] = [
  {
    id: "vr",
    name: "VR Architecture (Vocal Remover)",
    category: "VR Architecture",
    description:
      "Traditional Time-Frequency domain convolution models optimized for clean vocals or instrumentals on legacy computers.",
    defaultModelId: "vr_5_hp_karaoke",
  },
  {
    id: "mdx",
    name: "MDX-Net Engine",
    category: "MDX-Net",
    description:
      "Multi-band separation utilizing deep convolutional networks and raw spectrogram sliding-window overlaps.",
    defaultModelId: "kim_vocal_2_mdx",
  },
  {
    id: "demucs",
    name: "Demucs v3 / v4 (Hybrid Stems)",
    category: "Demucs v3",
    description:
      "Meta AI's multi-stem neural network. Splitting tracks into Vocals, Drums, Bass, and Melody simultaneously.",
    defaultModelId: "htdemucs_v4_pt",
  },
  {
    id: "bs_roformer",
    name: "BS-Roformer (Neural Transformer)",
    category: "Advanced Models",
    description:
      "Cutting-edge Band-Split Transformer models with Rotary Attention. The absolute benchmark for high-fidelity vocal recovery.",
    defaultModelId: "mel_band_roformer_karaoke",
  },
  {
    id: "ensemble",
    name: "Ensemble Mode (Multi-AI Fusion)",
    category: "Ensemble Mode",
    description:
      "Stitches together the mathematical outputs from different models via Phase-Inversion Cancel or Spectrogram average curves.",
    defaultModelId: "multi_ai_ensemble_preset",
  },
  {
    id: "custom",
    name: "Custom / Unknown Architecture",
    category: "Custom Models",
    description:
      "Locally imported models downloaded from Hugging Face or user's local hardware without pre-configured engine routing.",
    defaultModelId: "",
  },
];

// --- 2. GLOBAL MODEL REGISTRY (Rule 5) ---
export const MODEL_REGISTRY: ModelRegistryEntry[] = [
  // VR-Style Models
  {
    id: "vr_5_hp_karaoke",
    name: "5_HP-Karaoke-UVR.pth",
    architecture: "VR",
    filePath: "models/VR/5_HP-Karaoke-UVR.pth",
    stemType: "vocals",
    gpuSupport: false, // VR runs extremely fast on standard CPUs
    memoryRisk: "low",
    downloaded: true,
    description:
      "Excels at removing backup chants and maintaining transients, but lacks deep multi-stem separation.",
    fileSize: "148 MB",
  },
  {
    id: "vr_8_hp2_vocal",
    name: "8_HP2-UVR.pth",
    architecture: "VR",
    filePath: "models/VR/8_HP2-UVR.pth",
    stemType: "vocals",
    gpuSupport: false,
    memoryRisk: "low",
    downloaded: false,
    description:
      "Excels at filtering mid-frequency instruments, but lacks precision for extreme vocal artifact suppression.",
    fileSize: "290 MB",
  },
  {
    id: "vr_1_hp",
    name: "1_HP-UVR.pth",
    architecture: "VR",
    filePath: "models/VR/1_HP-UVR.pth",
    stemType: "instrumental",
    gpuSupport: false,
    memoryRisk: "low",
    downloaded: false,
    description: "Excels at standard instrumental extraction, but lacks fine artifact control on complex tracks.",
    fileSize: "145 MB",
  },
  {
    id: "vr_2_hp",
    name: "2_HP-UVR.pth",
    architecture: "VR",
    filePath: "models/VR/2_HP-UVR.pth",
    stemType: "instrumental",
    gpuSupport: false,
    memoryRisk: "low",
    downloaded: false,
    description: "Excels at heavy-duty instrumental extraction, but lacks vocal preservation, often bleeding frequencies.",
    fileSize: "145 MB",
  },
  {
    id: "vr_uvr_de_echo_normal",
    name: "UVR-De-Echo-Normal.pth",
    architecture: "VR",
    filePath: "models/VR/UVR-De-Echo-Normal.pth",
    stemType: "variable",
    gpuSupport: false,
    memoryRisk: "low",
    downloaded: false,
    description: "Excels at removing echo/reverb from vocals, but lacks capability for heavy instrument separation.",
    fileSize: "155 MB",
  },
  {
    id: "vr_uvr_denoise",
    name: "UVR-DeNoise.pth",
    architecture: "VR",
    filePath: "models/VR/UVR-DeNoise.pth",
    stemType: "variable",
    gpuSupport: false,
    memoryRisk: "low",
    downloaded: false,
    description: "Excels at denoising artifact removal, but lacks primary vocal separation capability.",
    fileSize: "150 MB",
  },
  // MDX-Net Models
  {
    id: "kim_vocal_2_mdx",
    name: "Kim_Vocal_2.onnx",
    architecture: "MDX-Net",
    filePath: "models/MDX_Net/Kim_Vocal_2.onnx",
    stemType: "vocals",
    gpuSupport: true,
    memoryRisk: "med",
    downloaded: true,
    description:
      "Excels at superb vocal isolation with minimal bleeding, but lacks support for multi-stem instrument outputs.",
    fileSize: "310 MB",
  },
  {
    id: "uvr_mdx_net_kara",
    name: "UVR_MDX_NET_KARA.onnx",
    architecture: "MDX-Net",
    filePath: "models/MDX_Net/UVR_MDX_NET_KARA.onnx",
    stemType: "vocals",
    gpuSupport: true,
    memoryRisk: "med",
    downloaded: false,
    description:
      "Excels at removing extreme reverb for karaoke, but lacks dedicated bass and drum separation.",
    fileSize: "280 MB",
  },
  {
    id: "uvr_mdx_net_main",
    name: "UVR_MDXNET_Main.onnx",
    architecture: "MDX-Net",
    filePath: "models/MDX_Net/UVR_MDXNET_Main.onnx",
    stemType: "variable",
    gpuSupport: true,
    memoryRisk: "med",
    downloaded: false,
    description: "Excels as a solid main all-around separator, but lacks the extreme detail of specialized models.",
    fileSize: "284 MB",
  },
  {
    id: "uvr_mdx_net_inst_hq_1",
    name: "UVR-MDX-NET-Inst_HQ_1.onnx",
    architecture: "MDX-Net",
    filePath: "models/MDX_Net/UVR-MDX-NET-Inst_HQ_1.onnx",
    stemType: "instrumental",
    gpuSupport: true,
    memoryRisk: "med",
    downloaded: false,
    description: "Excels at extracting high-quality instrumentals, but lacks focus on vocal clarity.",
    fileSize: "320 MB",
  },
  {
    id: "mdx_reverb_hq",
    name: "Reverb_HQ_By_FoxJoy.onnx",
    architecture: "MDX-Net",
    filePath: "models/MDX_Net/Reverb_HQ_By_FoxJoy.onnx",
    stemType: "variable",
    gpuSupport: true,
    memoryRisk: "med",
    downloaded: false,
    description: "Excels at reverb removal (FoxJoy tuning), but lacks multi-stem bass and drum tracking.",
    fileSize: "290 MB",
  },
  {
    id: "mdx_kuielab_a_vocal",
    name: "Kuielab_a_vocals.onnx",
    architecture: "MDX-Net",
    filePath: "models/MDX_Net/Kuielab_a_vocals.onnx",
    stemType: "vocals",
    gpuSupport: true,
    memoryRisk: "high",
    downloaded: false,
    description: "Excels at accurate vocal separation for pop genres, but lacks stability on low-quality MP3s.",
    fileSize: "330 MB",
  },
  // Demucs Models
  {
    id: "htdemucs_v4_pt",
    name: "htdemucs_v4.pt",
    architecture: "Demucs",
    filePath: "models/Demucs/htdemucs_v4.pt",
    stemType: "4stem",
    gpuSupport: true,
    memoryRisk: "high", // Requires safe OOM boundaries!
    downloaded: true,
    description:
      "Excels at resolving clean 4-stems (drums/bass/vocals/other), but lacks efficiency, demanding high GPU RAM.",
    fileSize: "680 MB",
  },
  {
    id: "mdx_extra_q_demucs",
    name: "mdx_extra_q.pt",
    architecture: "Demucs",
    filePath: "models/Demucs/mdx_extra_q.pt",
    stemType: "4stem",
    gpuSupport: true,
    memoryRisk: "high",
    downloaded: false,
    description:
      "Excels at high-fidelity bass and sub-frequency separation, but lacks speed due to large quantized sizes.",
    fileSize: "820 MB",
  },
  {
    id: "htdemucs_6s_pt",
    name: "htdemucs_6s.pt",
    architecture: "Demucs",
    filePath: "models/Demucs/htdemucs_6s.pt",
    stemType: "variable",
    gpuSupport: true,
    memoryRisk: "high",
    downloaded: false,
    description: "Excels at 6-stem separation (incl. piano/guitar), but lacks low-memory compatibility.",
    fileSize: "750 MB",
  },
  {
    id: "hdemucs_mmi",
    name: "hdemucs_mmi.pt",
    architecture: "Demucs",
    filePath: "models/Demucs/hdemucs_mmi.pt",
    stemType: "4stem",
    gpuSupport: true,
    memoryRisk: "high",
    downloaded: false,
    description: "Excels at optimizing instrument integrity, but lacks the aggressive vocal isolation of MDX-Net.",
    fileSize: "860 MB",
  },
  // RoFormer Models
  {
    id: "mel_band_roformer_karaoke",
    name: "mel_band_roformer_karaoke_sg.onnx",
    architecture: "RoFormer",
    filePath: "models/RoFormer/mel_band_roformer_karaoke_sg.onnx",
    stemType: "vocals",
    gpuSupport: true,
    memoryRisk: "high",
    downloaded: true,
    description:
      "Excels at removing heavy autotune artifacts, but lacks general instrumental multi-stem capability.",
    fileSize: "450 MB",
  },
  {
    id: "bs_roformer_vocal_hq",
    name: "bs_roformer_vocal_by_vocal_remover.onnx",
    architecture: "RoFormer",
    filePath: "models/RoFormer/bs_roformer_vocal_by_vocal_remover.onnx",
    stemType: "vocals",
    gpuSupport: true,
    memoryRisk: "high",
    downloaded: false,
    description:
      "Excels at solo dry acapellas on high-res audio, but lacks tolerance for low-res or distorted inputs.",
    fileSize: "512 MB",
  },
  {
    id: "bs_roformer_ep_317",
    name: "bs_roformer_ep_317_sdr_12.9755.ckpt",
    architecture: "RoFormer",
    filePath: "models/RoFormer/bs_roformer_ep_317_sdr_12.9755.ckpt",
    stemType: "variable",
    gpuSupport: true,
    memoryRisk: "high",
    downloaded: false,
    description: "Excels at high SDR validation score separation, but lacks low-end system compatibility.",
    fileSize: "490 MB",
  },
  {
    id: "viperx_roformer",
    name: "viperx_roformer.ckpt",
    architecture: "RoFormer",
    filePath: "models/RoFormer/viperx_roformer.ckpt",
    stemType: "variable",
    gpuSupport: true,
    memoryRisk: "high",
    downloaded: false,
    description: "Excels at custom targeted drum separation, but lacks vocal isolation features.",
    fileSize: "505 MB",
  },
  {
    id: "mel_band_roformer_srd_11_43",
    name: "mel_band_roformer_ep_3005_sdr_11.4360.ckpt",
    architecture: "RoFormer",
    filePath: "models/RoFormer/mel_band_roformer_ep_3005_sdr_11.4360.ckpt",
    stemType: "vocals",
    gpuSupport: true,
    memoryRisk: "high",
    downloaded: false,
    description: "Excels at cutting-edge Mel-Band vocal isolation, but lacks fast processing speeds.",
    fileSize: "460 MB",
  },
  // Ensemble Presets
  {
    id: "multi_ai_ensemble_preset",
    name: "Multi-AI Ensemble",
    architecture: "Ensemble",
    filePath: "presets/multi_ai.json",
    stemType: "vocals",
    gpuSupport: true,
    memoryRisk: "med",
    downloaded: true,
    description:
      "Excels at blending algorithms for extreme isolation, but lacks single-pass processing speed.",
    fileSize: "N/A",
  },
  {
    id: "manual_ensemble_preset",
    name: "Manual Ensemble Spec",
    architecture: "Ensemble",
    filePath: "CUSTOM",
    stemType: "vocals",
    gpuSupport: false,
    memoryRisk: "low",
    downloaded: true,
    description:
      "Excels at custom phase wave cancellations, but lacks automated 1-click convenience.",
    fileSize: "N/A",
  },
];

export function addModelToRegistry(model: ModelRegistryEntry) {
  MODEL_REGISTRY.push(model);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("modelRegistryChanged"));
  }
}

// --- 3. DYNAMIC SETTINGS SCHEMAS BY METHOD (Rule 18) ---
export const SETTINGS_SCHEMAS: Record<string, SettingSchemaEntry[]> = {
  vr: [
    {
      key: "chunks",
      label: "VR Segment Window Size",
      type: "select",
      allowedValues: ["512", "1024", "2048"],
      defaultValue: "512",
      helpText:
        "Slices spectrogram frequencies. Smaller values save local CPU caches but decrease subharmonic resolution.",
    },
    {
      key: "noiseReduction",
      label: "Post-Process Spectral Threshold",
      type: "slider",
      min: 0,
      max: 100,
      step: 5,
      defaultValue: 15,
      helpText:
        "Damping threshold for leftover digital harmonic squeals. High values risk gating quiet vocal dynamics.",
    },
  ],
  mdx: [
    {
      key: "chunks",
      label: "MDX Spectrogram Overlap",
      type: "select",
      allowedValues: ["2", "4", "6", "8"],
      defaultValue: "6",
      helpText:
        "Spectrogram sliding window overlay intensity. Higher values prevent transient click artifacts.",
    },
    {
      key: "noiseReduction",
      label: "Denoise Floor Intensity",
      type: "select",
      allowedValues: ["None", "Standard", "Aggressive"],
      defaultValue: "Standard",
      helpText:
        "Removes background analog microphone noise using simple gate algorithms.",
    },
  ],
  demucs: [
    {
      key: "chunks",
      label: "Demucs Model Shift Overlaps",
      type: "slider",
      min: 1,
      max: 8,
      step: 1,
      defaultValue: 2,
      helpText:
        "Averages shifting overlaps for seamless transitions. NOTE: High shifts drastically multiply VRAM usage!",
    },
    {
      key: "segmentSize",
      label: "Demucs Split Block Width",
      type: "select",
      allowedValues: ["256", "512", "1024", "2048"],
      defaultValue: "1024",
      utilityRule: "split_mode_dependent", // Rule 10: disabled if Split Mode (Auto chunks) is active
      helpText:
        "Waved block partition sizing. Disabled if Split Mode is checked (managed automatically).",
    },
  ],
  bs_roformer: [
    {
      key: "chunks",
      label: "Mel Band Divisions",
      type: "select",
      allowedValues: ["12", "24", "36"],
      defaultValue: "12",
      helpText:
        "The number of mathematical band splittings. Higher values capture clean backing choirs but amplify GPU tape backpropagation.",
    },
    {
      key: "noiseReduction",
      label: "Spectral Crossfade Overlap",
      type: "slider",
      min: 1,
      max: 8,
      step: 1,
      defaultValue: 4,
      helpText:
        "Blending window width between discrete transformer attention sequence calculations.",
    },
  ],
  ensemble: [
    {
      key: "chunks",
      label: "Wave Cancellation Algorithm",
      type: "select",
      allowedValues: [
        "Phase Inversion Cancel",
        "Spectrogram Peak Average",
        "Mel Harmonic Blending",
      ],
      defaultValue: "Phase Inversion Cancel",
      helpText:
        "How models outputs are merged. Phase Inversion subtracts signals, Averaging stitches grids.",
    },
  ],
  custom: [
    {
      key: "chunks",
      label: "Processing Strategy",
      type: "select",
      allowedValues: ["Auto", "Small", "Large"],
      defaultValue: "Auto",
      helpText: "General chunking logic if applicable. Heuristically bypassed if unsupported.",
    },
    {
      key: "noiseReduction",
      label: "General Soft Gate Threshold",
      type: "slider",
      min: 0,
      max: 10,
      step: 1,
      defaultValue: 0,
      helpText: "Fallback artifact dampening tool if applicable.",
    },
  ],
};

// --- 4. BACKEND ADAPTER LAYER & SERVICE SCHEMIC (Rule 6 & 20) ---

export interface BackendAdapter {
  id: string;
  name: string;
  description: string;
  supportsModel(architecture: string): boolean;
  buildCLICommand(request: ProcessingRequest): string;
  simulateLogs(
    request: ProcessingRequest,
    onProgress: (step: string, percent: number) => void,
  ): Promise<string[]>;
}

export class AudioSeparatorAdapter implements BackendAdapter {
  id = "audio_separator_core";
  name = "python-audio-separator CLI Adapter";
  description =
    "High performance programmatic ONNX model execution command pipeline.";

  supportsModel(arch: string): boolean {
    return (
      arch === "MDX-Net" ||
      arch === "RoFormer" ||
      arch === "MDXC" ||
      arch === "VR" ||
      arch === "Custom"
    );
  }

  buildCLICommand(request: ProcessingRequest): string {
    const inputStr = request.inputs.map((i) => `"${i}"`).join(" ");
    const dev = request.parameters.executionDevice === "cpu" ? "cpu" : "cuda";

    let extraArgs = "";
    if (request.model.architecture === "MDX-Net") {
      const overlapVal = Number(request.parameters.chunks) / 10;
      extraArgs += ` --mdx_overlap ${overlapVal || 0.6}`;
      if (request.options.postProcessActive) extraArgs += ` --denoise true`;
    } else if (request.model.architecture === "RoFormer") {
      extraArgs += ` --mdx_segment_size 256 --overlap ${request.options.ttaActive ? 8 : 4}`;
    } else if (request.model.architecture === "VR") {
      extraArgs += ` --vr_window_size ${request.parameters.chunks || 512}`;
    }

    return `audio-separator ${inputStr} --model_filename "${request.model.name}" --output_dir "${request.outputFolder || "./output/"}" --output_format ${request.format} --device ${dev}${extraArgs}`;
  }

  async simulateLogs(
    request: ProcessingRequest,
    onProgress: (step: string, percent: number) => void,
  ): Promise<string[]> {
    const logs: string[] = [];
    const pushLog = (msg: string) => {
      logs.push(msg);
      onProgress(msg, 0); // Trigger live console progress emission
    };

    pushLog(
      `[audio-separator] INITIALIZING: Spawning process thread under isolated user space...`,
    );
    await sleep(200);
    pushLog(
      `[audio-separator] CUDA Acceleration provider: ${request.parameters.executionDevice === "cpu" ? "CPU-Only fallback active." : "CUDA Execution Provider Registered."}`,
    );
    await sleep(300);
    pushLog(
      `[audio-separator] Preflight checksum scan... PASS (SHA-256 matches verified Model Registry weight).`,
    );
    await sleep(400);
    pushLog(
      `[audio-separator] Streaming input stream into memory block frames. SampleRate: 44100Hz, Mode: Stereo`,
    );
    await sleep(200);

    // Dynamic output filename previews matching user parameters
    const outputNames = buildOutputNames(request);
    pushLog(`[audio-separator] Planned outputs directory mapped:`);
    outputNames.forEach((name) => {
      pushLog(`  ---> Destination path: ${request.outputFolder}${name}`);
    });

    const segmentsCount = request.model.architecture === "RoFormer" ? 18 : 12;
    for (let i = 1; i <= segmentsCount; i++) {
      const percent = Math.round((i / segmentsCount) * 100);
      await sleep(150);
      const vramStr =
        request.parameters.executionDevice === "cpu"
          ? "0.0 GB"
          : `${(3.5 + Math.random() * 0.8).toFixed(1)} GB`;
      onProgress(
        `[audio-separator] Running model graph matrix calculation: Section [${i}/${segmentsCount}] | GPU Memory: ${vramStr}`,
        percent,
      );
    }

    await sleep(200);
    if (request.options.postProcessActive) {
      pushLog(
        `[audio-separator] Post-separation spectral filter pass active... suppressing high frequency digital feedback.`,
      );
      await sleep(150);
    }

    outputNames.forEach((name) => {
      pushLog(
        `[audio-separator] Output written: "${name}" completed successfully.`,
      );
    });
    pushLog(
      `[audio-separator] TERMINATED: Subprocess completed with Exit Code: 0 (Successful separation).`,
    );
    return logs;
  }
}

export class DemucsAdapter implements BackendAdapter {
  id = "demucs_native";
  name = "Meta Demucs Model Execution Adapter";
  description = "Isolated wave-hybrid separation algorithm interface.";

  supportsModel(arch: string): boolean {
    return arch === "Demucs";
  }

  buildCLICommand(request: ProcessingRequest): string {
    const inputStr = request.inputs.map((i) => `"${i}"`).join(" ");
    // Rule 10 - Demucs handles shifts natively
    const shifts = request.parameters.chunks || "2";
    // Split mode constraint
    const splitBlock = request.options.splitMode
      ? ""
      : ` --segment_size ${request.parameters.segmentSize || "1024"}`;

    return `python -m demucs.api ${inputStr} --model "${request.model.name}" --shifts ${shifts}${splitBlock} --output_format ${request.format} --out "${request.outputFolder || "./output/"}"`;
  }

  async simulateLogs(
    request: ProcessingRequest,
    onProgress: (step: string, percent: number) => void,
  ): Promise<string[]> {
    const logs: string[] = [];
    const pushLog = (msg: string) => {
      logs.push(msg);
      onProgress(msg, 0);
    };

    pushLog(
      `[demucs] INITIALIZING: Spawning PyTorch Demucs hybrid attention daemon process...`,
    );
    await sleep(250);
    pushLog(
      `[demucs] WARNING: High Memory parameters requested. VRAM guard dynamic limit mapped to 8.0GB.`,
    );
    await sleep(350);
    pushLog(
      `[demucs] Loading neural weight tapes into active CUDA GPU memory blocks...`,
    );
    await sleep(400);
    pushLog(
      `[demucs] Slicing source tracks using shifting alignment boundaries to prevent seam phase artifacts... Shifts active: ${request.parameters.chunks}`,
    );
    await sleep(300);

    const outputNames = buildOutputNames(request);
    outputNames.forEach((name) => {
      pushLog(`  ---> Destination target path: ${request.outputFolder}${name}`);
    });

    const steps = ["Vocals", "Drums", "Bass", "Accompany"];
    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx];
      pushLog(`[demucs] Separating target stem: [${step.toUpperCase()}]`);
      for (let sub = 1; sub <= 4; sub++) {
        const totalPct = Math.round(((idx * 4 + sub) / 16) * 100);
        await sleep(150);
        onProgress(
          `[demucs] Synthesizing convolutional wave sequences -> Track Slice [${sub}/4] | VRAM: 5.9 GB`,
          totalPct,
        );
      }
    }

    outputNames.forEach((name) => {
      pushLog(`[demucs] Stem exported: "${name}" successfully compiled.`);
    });
    pushLog(`[demucs] TERMINATED: Demucs engine exited safely.`);
    return logs;
  }
}

// --- 5. ENSEMBLE ORCHESTRATION FALLBACK & PRESET ADAPTER ---
export class EnsembleAdapter implements BackendAdapter {
  id = "ensemble_mode_adapter";
  name = "Multi-AI Model Ensemble Mixer";
  description =
    "Bivalve cross-model cancel processes and spectrographic peak mergers.";

  supportsModel(arch: string): boolean {
    return arch === "Ensemble";
  }

  buildCLICommand(request: ProcessingRequest): string {
    const inputStr = request.inputs.map((i) => `"${i}"`).join(" ");
    const mode = request.parameters.chunks || "Phase Inversion Cancel";
    const outputsAll = request.options.saveAllOutputs
      ? " --save_all_intermediates"
      : "";
    // NOTE: uvr_ensemble.mixer is a planned internal module to be authored
    return `python -m uvr_ensemble.mixer ${inputStr} --method "${mode}" --out_dir "${request.outputFolder}"${outputsAll}`;
  }

  async simulateLogs(
    request: ProcessingRequest,
    onProgress: (step: string, percent: number) => void,
  ): Promise<string[]> {
    const logs: string[] = [];
    const pushLog = (msg: string) => {
      logs.push(msg);
      onProgress(msg, 0);
    };

    pushLog(
      `[ensemble-mixer] INITIALIZING: Formulating multi-model submix ensembling formulas...`,
    );
    await sleep(200);
    pushLog(
      `[ensemble-mixer] Rule Check: A minimum of 2 tracks are present in processing buffer.`,
    );
    await sleep(250);
    pushLog(`[ensemble-mixer] Load mode: ${request.parameters.chunks}`);
    await sleep(200);

    if (request.options.saveAllOutputs) {
      pushLog(
        `[ensemble-mixer] PRESET REQUIREMENT ACTIVE -> "Save All Intermediates" enabled. Creating submix records.`,
      );
      await sleep(200);
    }

    const outputNames = buildOutputNames(request);
    outputNames.forEach((name) => {
      pushLog(`  ---> Destination master: ${request.outputFolder}${name}`);
    });

    const stages = [
      "Loading Model Bounces",
      "Peak Phase Alignment",
      "Wave Inversion Subtracting",
      "Pristine Seam Synthesis",
    ];
    for (let i = 0; i < stages.length; i++) {
      pushLog(`[ensemble-mixer] Operational phase: [${stages[i]}]`);
      const score = Math.round(((i + 1) / stages.length) * 100);
      await sleep(350);
      onProgress(
        `[ensemble-mixer] Aligning sample wave peaks on subharmonic channels... | CPU Thread: 100%`,
        score,
      );
    }

    outputNames.forEach((name) => {
      pushLog(
        `[ensemble-mixer] Ensembled file written successfully: "${name}"`,
      );
    });
    return logs;
  }
}

// --- 6. UTILITIES CORE (Rule 11 & 14) ---

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * NAMING ENGINE GENERATOR (Rule 11 & 14)
 * Generates clear file patterns before real processing starts
 */
export function buildOutputNames(request: ProcessingRequest): string[] {
  const ext = request.format.toLowerCase();

  if (request.model.architecture === "Ensemble") {
    if (request.model.id === "manual_ensemble_preset") {
      return [`Unified_Ensemble_Subset_(Min_Spec).${ext}`];
    }
    // Preset
    const outputs = [`Original_Multi-AI_Ensemble.${ext}`];
    if (request.options.saveAllOutputs) {
      outputs.push(`Intermediate_VR_Sample_Hp_UVR.${ext}`);
      outputs.push(`Intermediate_MDX_Vocal_Kim.${ext}`);
    }
    return outputs;
  }

  // Model test mode comparison outputs (Rule 16)
  if (request.options.modelTestMode) {
    if (request.model.architecture === "Demucs") {
      return [
        `Sample_Track_Stem_Vocals_TEST_${request.model.name}.${ext}`,
        `Sample_Track_Stem_Drums_TEST_${request.model.name}.${ext}`,
        `Sample_Track_Stem_Bass_TEST_${request.model.name}.${ext}`,
        `Sample_Track_Stem_Accompaniment_TEST_${request.model.name}.${ext}`,
      ];
    }
    return [
      `Sample_Track_(Vocals)_TEST_${request.model.name}.${ext}`,
      `Sample_Track_(Instrumental)_TEST_${request.model.name}.${ext}`,
    ];
  }

  // Single model normal processing (Rule 11)
  const baseFile = request.inputs[0]
    ? request.inputs[0].split(".")[0]
    : "OriginalName";
  const folderPrefix = request.options.createFolderPerTrack
    ? `${baseFile}/`
    : "";
  const modelSuffix = request.model.name.replace(/\.[^/.]+$/, ""); // Strip extension

  if (request.model.architecture === "Demucs") {
    if (request.options.vocalsOnly) {
      return [`${folderPrefix}${baseFile}_(Vocals)_${modelSuffix}.${ext}`];
    }
    if (request.options.instrumentalOnly) {
      return [
        `${folderPrefix}${baseFile}_(Instrumental)_${modelSuffix}.${ext}`,
      ];
    }
    return [
      `${folderPrefix}${baseFile}_(Vocals)_${modelSuffix}.${ext}`,
      `${folderPrefix}${baseFile}_(Drums)_${modelSuffix}.${ext}`,
      `${folderPrefix}${baseFile}_(Bass)_${modelSuffix}.${ext}`,
      `${folderPrefix}${baseFile}_(Accompaniment)_${modelSuffix}.${ext}`,
    ];
  }

  // VR & MDX-Net
  const list: string[] = [];
  if (!request.options.instrumentalOnly) {
    list.push(`${folderPrefix}${baseFile}_(Vocals)_${modelSuffix}.${ext}`);
  }
  if (!request.options.vocalsOnly) {
    list.push(
      `${folderPrefix}${baseFile}_(Instrumental)_${modelSuffix}.${ext}`,
    );
  }
  return list;
}

// --- 7. DISPATCHER ROUTING UTILITY (Rule 6) ---
export function getAdapterForModel(model: ModelRegistryEntry): BackendAdapter {
  if (model.architecture === "Ensemble") {
    return new EnsembleAdapter();
  }
  if (model.architecture === "Demucs") {
    return new DemucsAdapter();
  }
  if (model.architecture === "RoFormer") {
    return new AudioSeparatorAdapter();
  }
  if (model.architecture === "VR") {
    // Can use Legacy or Core
    return new AudioSeparatorAdapter();
  }
  // Standard Default
  return new AudioSeparatorAdapter();
}

/**
 * Core validation routine (Rule 8 & 9 & 10)
 */
export interface ValidationError {
  field: string;
  message: string;
}

export function validateState(state: {
  selectedInputs: string[];
  selectedOutputFolder: string;
  processMethodId: string;
  selectedModelId: string;
  outputFormat: OutputFormat;
  checkboxSettings: {
    saveVocalsOnly: boolean;
    saveInstrumentalOnly: boolean;
  };
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check inputs count
  if (!state.selectedInputs || state.selectedInputs.length === 0) {
    errors.push({
      field: "selectedInputs",
      message:
        "No input audio files specified! Please select or search an input track.",
    });
  }

  // Check output folder
  if (!state.selectedOutputFolder || state.selectedOutputFolder.trim() === "") {
    errors.push({
      field: "selectedOutputFolder",
      message:
        "No output destination directory configured! Please input or select a path.",
    });
  }

  // Check Model Selection is present
  if (!state.selectedModelId) {
    errors.push({
      field: "selectedModelId",
      message:
        "No separation model selected. Please select a dynamic model inside the registry dropdown.",
    });
  }

  // Check Ensemble rule (Rule 9)
  if (state.processMethodId === "ensemble") {
    if (state.selectedInputs && state.selectedInputs.length < 2) {
      errors.push({
        field: "selectedInputs",
        message: "A minimum of 2 inputs is required to ensemble!",
      });
    }
  }

  return errors;
}
