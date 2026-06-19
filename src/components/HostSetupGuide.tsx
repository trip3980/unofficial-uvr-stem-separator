import React, { useState, useEffect, useCallback } from "react";
import { Copy, Check, Terminal, TerminalSquare, AlertTriangle, AlertCircle } from "lucide-react";
import { HelpToggle, HelpText, AccessibleTooltipWrapper } from "./HelpSystem";

interface StepItem {
  id: string;
  name: string;
  purpose: string;
  command: string;
}

const PROOF_SUBMISSION_TEMPLATE = `=== REAL LOCAL AI GATE PROOF SUBMISSION ===

Final Result: [PASS / BLOCKED / FAIL]
Process Exit Code: [0 / 1 / 2 / ...]
Python Path:
Python Version:
audio-separator Status:
PyTorch Status:
CUDA/MPS Status:
FFmpeg Status:
Model Path:
Model File Size:
Input Track Path:
Input Track Size:
Output Folder Path:
Exact Command Executed:
stdout Summary:
stderr Summary:
Output Stem Files:
Output Stem Sizes:
Separation Method:
Final Release Label: Hardened Functional Alpha`;

const WINDOWS_STEPS: StepItem[] = [
  {
    id: "win_verify_project",
    name: "1. Verify Project Build",
    purpose: "Perform production build check (npm run build) and TypeScript check (npx tsc --noEmit) before local runtime configuration.",
    command: `cd "<PROJECT_PATH>"
npm install
npm run build
npx tsc --noEmit`
  },
  {
    id: "win_create_env",
    name: "2. Create Python 3.10 Sandbox",
    purpose: "Create isolated local Python sandbox to avoid package conflicts. Python 3.10 is preferred for structural stability.",
    command: `py -3.10 -m venv .venv-ai
# Fallback if py launcher is not installed:
python -m venv .venv-ai`
  },
  {
    id: "win_activate_env",
    name: "3. Activate Environment",
    purpose: "Activate the sandboxed environment context in Windows PowerShell. Note: ExecutionPolicy configuration changes apply only to the current PowerShell process session and do not permanently change global system policy.",
    command: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
.\\.venv-ai\\Scripts\\Activate.ps1`
  },
  {
    id: "win_upgrade_pip",
    name: "4. Upgrade Pip Tooling",
    purpose: "Ensure core python packaging utilities are up-to-date inside your sandbox.",
    command: "python -m pip install --upgrade pip setuptools wheel"
  },
  {
    id: "win_install_cpu",
    name: "5a. Install (CPU Path - Default)",
    purpose: "CPU proof path / recommended first proof path. Simple local AI E2E proof with CPU-only PyTorch.",
    command: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install "audio-separator"`
  },
  {
    id: "win_install_cuda",
    name: "5b. Install (Optional CUDA Path)",
    purpose: "Optional CUDA path / only if NVIDIA driver and compatible PyTorch CUDA wheel are present. Install PyTorch CUDA wheels compatible with your NVIDIA driver and CUDA runtime. Replaces/upgrades the PyTorch wheel set.",
    command: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install "audio-separator[gpu]" --upgrade`
  },
  {
    id: "win_verify_paths",
    name: "6. Verify Drivers & Paths",
    purpose: "Check PyTorch runtime, GPU availability, and FFmpeg path. Note: FFmpeg may be available through system PATH or through the app’s configured FFmpeg path in Global Settings. If using a custom FFmpeg path, verify it through Global Settings diagnostics.",
    command: `nvidia-smi
ffmpeg -version
.\\.venv-ai\\Scripts\\python.exe -c "import audio_separator; print('audio_separator OK')"
.\\.venv-ai\\Scripts\\python.exe -c "import torch; print('Torch:', torch.__version__); print('CUDA Available:', torch.cuda.is_available())"`
  },
  {
    id: "win_run_e2e",
    name: "7. Run AI E2E Proof",
    purpose: "Conduct E2E separation checks. CPU proof is the simplest local AI E2E proof path. CUDA is optional and not locally proven until this CUDA E2E proof passes with real non-empty separated stems.",
    command: `# Define proof paths first:
$PYTHON_EXE_PATH = ".\\.venv-ai\\Scripts\\python.exe"
$MODEL_FILE_PATH = "<MODEL_FILE_PATH>"
$INPUT_AUDIO_PATH = "<INPUT_AUDIO_PATH>"
$OUTPUT_FOLDER_PATH = "<OUTPUT_FOLDER_PATH>"

# Conduct path and requirements checks:
Test-Path "$PYTHON_EXE_PATH"
Test-Path "$MODEL_FILE_PATH"
Test-Path "$INPUT_AUDIO_PATH"

# Create output folder if missing:
New-Item -ItemType Directory -Force -Path "$OUTPUT_FOLDER_PATH"
Test-Path "$OUTPUT_FOLDER_PATH"

# 1. Run CPU E2E Proof (Recommended baseline proof - simplest local AI E2E proof path):
node electron-shell/test-ai-e2e.cjs --python "$PYTHON_EXE_PATH" --model "$MODEL_FILE_PATH" --input "$INPUT_AUDIO_PATH" --output "$OUTPUT_FOLDER_PATH" --device cpu

# 2. Run CUDA E2E Proof (Optional CUDA path - CUDA is not locally proven until this CUDA E2E proof passes with real non-empty separated stems):
node electron-shell/test-ai-e2e.cjs --python "$PYTHON_EXE_PATH" --model "$MODEL_FILE_PATH" --input "$INPUT_AUDIO_PATH" --output "$OUTPUT_FOLDER_PATH" --device cuda`
  },
  {
    id: "win_interpret_proof",
    name: "8. Interpret Proof Result",
    purpose: "Analyze local terminal output values to verify local AI backend readiness vs. sandbox blockages.",
    command: `PASS / exit code 0:
Only valid if real AI-separated output stems exist on disk and are greater than 0 bytes.

BLOCKED / exit code 2:
A dependency, model, input file, output folder, Python path, FFmpeg path, or backend requirement is missing.

FAIL / exit code 1:
The command ran but failed. Keep the release at Hardened Functional Alpha.

FFmpeg fallback:
Does not count as AI separation proof.

Beta Candidate:
Remains blocked until UVR local AI E2E separation proof passes.`
  }
];

const MACOS_STEPS: StepItem[] = [
  {
    id: "mac_verify_project",
    name: "1. Verify Project Build",
    purpose: "Perform production build check (npm run build) and TypeScript check (npx tsc --noEmit) before local runtime configuration.",
    command: `cd "<PROJECT_PATH>"
npm install
npm run build
npx tsc --noEmit`
  },
  {
    id: "mac_create_env",
    name: "2. Create Python Sandbox",
    purpose: "Create isolated virtual environment sandbox inside .venv-ai.",
    command: "python3 -m venv .venv-ai"
  },
  {
    id: "mac_activate_env",
    name: "3. Activate Environment",
    purpose: "Initialize macOS terminal session context and paths safely.",
    command: "source .venv-ai/bin/activate"
  },
  {
    id: "mac_upgrade_pip",
    name: "4. Upgrade Pip & Wheels",
    purpose: "Ensure core python packaging utilities are up-to-date inside your sandbox.",
    command: "python -m pip install --upgrade pip setuptools wheel"
  },
  {
    id: "mac_install_sep",
    name: "5. Install audio-separator",
    purpose: "Install package using quotes for extra brackets parameter targeting shell compatibility.",
    command: 'pip install "audio-separator"'
  },
  {
    id: "mac_verify",
    name: "6. Verify MPS Acceleration",
    purpose: "Verify macOS local environment readiness. PyTorch may expose Apple MPS when the installed PyTorch build, macOS version, and hardware support it.",
    command: `ffmpeg -version
python -c "import torch; print('Torch:', torch.__version__); print('MPS Available:', torch.backends.mps.is_available() if hasattr(torch.backends, 'mps') else False)"`
  },
  {
    id: "mac_e2e",
    name: "7. Run AI E2E Proof",
    purpose: "Execute local E2E proof script. CPU check is recommended first. Apple MPS is available only on supported macOS/PyTorch/Apple Silicon setups and is not locally proven until a real E2E run passes.",
    command: `# Define proof paths first:
PYTHON_EXE_PATH="./.venv-ai/bin/python"
MODEL_FILE_PATH="<MODEL_FILE_PATH>"
INPUT_AUDIO_PATH="<INPUT_AUDIO_PATH>"
OUTPUT_FOLDER_PATH="<OUTPUT_FOLDER_PATH>"

# Create output folder if missing:
mkdir -p "$OUTPUT_FOLDER_PATH"

# 1. Run CPU E2E Proof first (Recommended baseline proof - simplest local AI E2E proof path):
node electron-shell/test-ai-e2e.cjs --python "$PYTHON_EXE_PATH" --model "$MODEL_FILE_PATH" --input "$INPUT_AUDIO_PATH" --output "$OUTPUT_FOLDER_PATH" --device cpu

# 2. Run MPS E2E Proof (Apple Silicon only; only proven if this command passes successfully - MPS is not locally proven until a real E2E run passes):
node electron-shell/test-ai-e2e.cjs --python "$PYTHON_EXE_PATH" --model "$MODEL_FILE_PATH" --input "$INPUT_AUDIO_PATH" --output "$OUTPUT_FOLDER_PATH" --device mps`
  },
  {
    id: "mac_interpret_proof",
    name: "8. Interpret Proof Result",
    purpose: "Analyze local terminal output values to verify local AI backend readiness vs. sandbox blockages.",
    command: `PASS / exit code 0:
Only valid if real AI-separated output stems exist on disk and are greater than 0 bytes.

BLOCKED / exit code 2:
A dependency, model, input file, output folder, Python path, FFmpeg path, or backend requirement is missing.

FAIL / exit code 1:
The command ran but failed. Keep the release at Hardened Functional Alpha.

FFmpeg fallback:
Does not count as AI separation proof.

Beta Candidate:
Remains blocked until UVR local AI E2E separation proof passes.`
  }
];

const LINUX_STEPS: StepItem[] = [
  {
    id: "linux_verify_project",
    name: "1. Verify Project Build",
    purpose: "Perform production build check (npm run build) and TypeScript check (npx tsc --noEmit) before local runtime configuration.",
    command: `cd "<PROJECT_PATH>"
npm install
npm run build
npx tsc --noEmit`
  },
  {
    id: "linux_create_env",
    name: "2. Create Python Sandbox",
    purpose: "Create isolated virtual environment sandbox inside .venv-ai.",
    command: "python3 -m venv .venv-ai"
  },
  {
    id: "linux_activate_env",
    name: "3. Activate Environment",
    purpose: "Initialize Linux shell context safely.",
    command: "source .venv-ai/bin/activate"
  },
  {
    id: "linux_upgrade_pip",
    name: "4. Upgrade Pip & Wheels",
    purpose: "Ensure core python packaging tools are up-to-date inside your sandbox.",
    command: "python -m pip install --upgrade pip setuptools wheel"
  },
  {
    id: "linux_install_cpu",
    name: "5a. Install (CPU Path - Default)",
    purpose: "CPU proof path / recommended first proof path. Simple local AI E2E proof with CPU-only PyTorch.",
    command: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install "audio-separator"`
  },
  {
    id: "linux_install_cuda",
    name: "5b. Install (Optional CUDA Path)",
    purpose: "Optional CUDA path / only for NVIDIA systems. Install PyTorch CUDA wheels compatible with your NVIDIA driver and CUDA runtime. Replaces/upgrades the PyTorch wheel set.",
    command: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install "audio-separator[gpu]" --upgrade`
  },
  {
    id: "linux_verify",
    name: "6. Verify Drivers & Paths",
    purpose: "Confirm Linux environment state, PyTorch CUDA GPU indicators, and FFmpeg capability. Note: FFmpeg may be available through system PATH or through the app’s configured FFmpeg path in Global Settings. If using a custom FFmpeg path, verify it through Global Settings diagnostics.",
    command: `nvidia-smi
ffmpeg -version
python -c "import torch; print(torch.cuda.is_available()); print(torch.version.cuda); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"`
  },
  {
    id: "linux_e2e",
    name: "7. Run AI E2E Proof",
    purpose: "Execute local E2E proof script. CPU check is recommended first. CUDA is optional and not locally proven until this CUDA E2E proof passes with real non-empty separated stems.",
    command: `# Define proof paths first:
PYTHON_EXE_PATH="./.venv-ai/bin/python"
MODEL_FILE_PATH="<MODEL_FILE_PATH>"
INPUT_AUDIO_PATH="<INPUT_AUDIO_PATH>"
OUTPUT_FOLDER_PATH="<OUTPUT_FOLDER_PATH>"

# Create output folder if missing:
mkdir -p "$OUTPUT_FOLDER_PATH"

# 1. Run CPU E2E Proof first (Recommended baseline proof - simplest local AI E2E proof path):
node electron-shell/test-ai-e2e.cjs --python "$PYTHON_EXE_PATH" --model "$MODEL_FILE_PATH" --input "$INPUT_AUDIO_PATH" --output "$OUTPUT_FOLDER_PATH" --device cpu

# 2. Run CUDA E2E Proof (Linux NVIDIA only; only proven if this command passes successfully - CUDA is not locally proven until this CUDA E2E proof passes with real non-empty separated stems):
node electron-shell/test-ai-e2e.cjs --python "$PYTHON_EXE_PATH" --model "$MODEL_FILE_PATH" --input "$INPUT_AUDIO_PATH" --output "$OUTPUT_FOLDER_PATH" --device cuda`
  },
  {
    id: "linux_interpret_proof",
    name: "8. Interpret Proof Result",
    purpose: "Analyze local terminal output values to verify local AI backend readiness vs. sandbox blockages.",
    command: `PASS / exit code 0:
Only valid if real AI-separated output stems exist on disk and are greater than 0 bytes.

BLOCKED / exit code 2:
A dependency, model, input file, output folder, Python path, FFmpeg path, or backend requirement is missing.

FAIL / exit code 1:
The command ran but failed. Keep the release at Hardened Functional Alpha.

FFmpeg fallback:
Does not count as AI separation proof.

Beta Candidate:
Remains blocked until UVR local AI E2E separation proof passes.`
  }
];

export const HostSetupGuide: React.FC = () => {
  const [osTab, setOsTab] = useState<"win" | "mac" | "linux">("win");
  const [activeStepId, setActiveStepId] = useState<string>("win_verify_project");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const activeSteps = osTab === "win" 
    ? WINDOWS_STEPS 
    : osTab === "mac" 
    ? MACOS_STEPS 
    : LINUX_STEPS;

  const currentStep = activeSteps.find(s => s.id === activeStepId) || activeSteps[0];

  useEffect(() => {
    if (osTab === "win") {
      setActiveStepId("win_verify_project");
    } else if (osTab === "mac") {
      setActiveStepId("mac_verify_project");
    } else if (osTab === "linux") {
      setActiveStepId("linux_verify_project");
    }
  }, [osTab]);

  const handleCopy = useCallback(async (cmd: string, keyId: string) => {
    try {
      if (typeof window === "undefined" || !navigator || !navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API not available");
      }
      await navigator.clipboard.writeText(cmd);
      setCopiedText(keyId);
      setTimeout(() => {
        setCopiedText(null);
      }, 1500);
    } catch (err) {
      setCopiedText("failed");
      setTimeout(() => {
        setCopiedText(null);
      }, 2500);
    }
  }, []);

  return (
    <div className="p-4 bg-[#0a0e17]/80 border border-slate-800/80 rounded-xl space-y-4 font-sans text-xs text-slate-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-slate-100 uppercase tracking-wide font-mono text-[11px]">Terminal Host Setup Environment Guide</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpToggle sectionId="host_setup_guide" label="Show Help" />
          <span className="text-[10px] text-slate-500 font-mono">Setup Template</span>
        </div>
      </div>

      <HelpText
        sectionId="host_setup_guide"
        text="Help: This setup panel outlines direct bash commands or commands for Windows PowerShell to prepare your host system to run local AI operations safely. Copy each block in order to initialize your sandbox environment."
      />

      <div className="bg-emerald-950/20 px-3 py-2.5 border border-emerald-500/10 rounded-xl text-[11px] text-emerald-300 leading-relaxed space-y-1.5 font-sans">
        <div className="flex items-center gap-1.5 font-bold text-emerald-200 uppercase tracking-wide text-[10px]">
          <TerminalSquare className="w-4 h-4 text-emerald-400 shrink-0" />
          Prerequisites Verification Instructions
        </div>
        <p className="text-slate-400 text-[10.5px]">
          By default, UVR operates locally by running local Python backend processes for AI model execution. This guide helps prepare a local environment. Setup alone does not prove the AI backend. Copy and paste instructions into your command terminal interface manually. Note: No automated scripts or hidden packages will alter your system global configurations unless run manually on your end.
        </p>
      </div>

      {/* OS Target Tabs */}
      <div className="flex bg-black/45 p-1 rounded-lg border border-white/5 font-mono gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => setOsTab("win")}
          aria-pressed={osTab === "win"}
          className={`flex-grow py-1.5 px-3 rounded-md text-center transition-all cursor-pointer text-[10px] uppercase font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
            ${osTab === "win" 
              ? "bg-[#101827] text-emerald-300 border border-white/10 shadow-sm" 
              : "hover:text-slate-300 text-slate-500"
            }`}
        >
          🗔 Windows PowerShell
        </button>
        <button
          type="button"
          onClick={() => setOsTab("mac")}
          aria-pressed={osTab === "mac"}
          className={`flex-grow py-1.5 px-3 rounded-md text-center transition-all cursor-pointer text-[10px] uppercase font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
            ${osTab === "mac" 
              ? "bg-[#101827] text-emerald-300 border border-white/10 shadow-sm" 
              : "hover:text-slate-300 text-slate-500"
            }`}
        >
          🍎 macOS Terminal
        </button>
        <button
          type="button"
          onClick={() => setOsTab("linux")}
          aria-pressed={osTab === "linux"}
          className={`flex-grow py-1.5 px-3 rounded-md text-center transition-all cursor-pointer text-[10px] uppercase font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
            ${osTab === "linux" 
              ? "bg-[#101827] text-emerald-300 border border-white/10 shadow-sm" 
              : "hover:text-slate-300 text-slate-500"
            }`}
        >
          🐧 Linux Terminal
        </button>
      </div>

      {/* Vertical Steps + Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
        {/* Step Selector Buttons List */}
        <div className="space-y-1.5 md:col-span-1 border-b md:border-b-0 md:border-r border-white/5 pb-3 md:pb-0 md:pr-3 max-h-[340px] overflow-y-auto">
          {activeSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStepId(step.id)}
              aria-pressed={activeStepId === step.id}
              aria-label={`Select setup step ${step.name}`}
              className={`w-full text-left p-2 rounded-lg border transition-all duration-200 font-mono text-[10px] flex items-center justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                ${activeStepId === step.id 
                  ? "bg-[#101827] border-emerald-500/20 text-emerald-300 font-bold" 
                  : "bg-black/10 hover:bg-black/25 border-transparent text-slate-400 hover:text-slate-200"
                }`}
            >
              <span>{step.name}</span>
            </button>
          ))}
        </div>

        {/* Step Content Box with Copy Button */}
        <div className="md:col-span-2 space-y-3 bg-[#080b13]/60 p-3.5 rounded-xl border border-white/5 font-sans">
          <div className="border-b border-white/5 pb-1.5">
            <h6 className="font-bold text-slate-200 text-[11px] uppercase tracking-wide font-mono text-emerald-400">{currentStep.name}</h6>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug font-sans">{currentStep.purpose}</p>
          </div>

          <div className="relative group rounded-lg border border-black bg-black/85 font-mono text-[10px] overflow-hidden">
            <pre className="p-3.5 pr-12 overflow-x-auto text-emerald-300 font-mono leading-relaxed select-all max-h-[180px] whitespace-pre-wrap select-text">
              {currentStep.command}
            </pre>
            <div className="absolute top-2.5 right-2.5">
              <AccessibleTooltipWrapper content="Click to copy this terminal command block to clipboard safely." position="top">
                <button
                  type="button"
                  onClick={() => handleCopy(currentStep.command, currentStep.id)}
                  aria-label={copiedText === "failed" ? "Copy failed — select command manually." : copiedText === currentStep.id ? "Copied command block" : `Copy command for ${currentStep.name}`}
                  className="p-2 rounded-md bg-slate-900 border border-white/10 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center shadow-md-indigo hover:border-emerald-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  title={copiedText === currentStep.id ? "Copied!" : copiedText === "failed" ? "Copy failed — select command manually." : "Copy Command Block"}
                >
                  {copiedText === currentStep.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                  ) : copiedText === "failed" ? (
                    <span className="text-[9px] text-red-400 font-sans font-semibold shrink-0">failed</span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </AccessibleTooltipWrapper>
            </div>
          </div>

          {copiedText === "failed" && (
            <div className="text-[10px] text-red-400 font-sans font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Copy failed — select command manually.
            </div>
          )}

          <div className="space-y-1.5 text-[9.5px] text-slate-400 font-sans border-t border-white/5 pt-2">
            <div className="text-amber-500 font-semibold uppercase font-mono tracking-wider text-[8.5px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Environment & Command Warnings (Do not execute blindly)
            </div>
            <ul className="list-disc pl-3.5 space-y-1 text-slate-400">
              <li>Review placeholders before running. These commands are copied for manual terminal use only. The app does not execute them from this panel.</li>
              <li>Package versions may need adjustment depending on Python version, OS, CUDA version, GPU driver, and audio-separator release.</li>
              <li>Installing packages depending on environment configuration can sometimes fail. CPU checks remain the highest compatibility baseline.</li>
            </ul>
          </div>

          <div className="bg-[#0b101c]/40 p-2.5 rounded-lg border border-slate-800/80 text-[10px] text-slate-400 italic">
            <span className="font-semibold text-slate-300 font-sans not-italic block mb-0.5">💡 Execution Guidance Note:</span>
            Make sure to apply these steps directly into your system-level command line interface where Python is fully initialized.
          </div>
        </div>
      </div>

      {/* Proof Boundary Notice & Status Legend */}
      <div className="border-t border-white/5 pt-4 space-y-4">
        <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2.5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span className="font-mono text-[9px] text-[#38bdf8] font-bold tracking-widest uppercase">
              Environment Verification & Proof Boundary
            </span>
            <div className="flex gap-2">
              <span className="text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                Hardened Functional Alpha
              </span>
              <span className="text-[9px] font-mono bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                Beta Candidate Blocked
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
            <strong>Proof Boundary Statement:</strong> This guide outlines reference setup pathways. Simply running these commands manually does not verify host AI compliance within this applet context. AI proof strictly requires executing <code>test-ai-e2e.cjs</code> resulting in a successful <strong>PASS / exit code 0</strong> with files greater than 0 bytes written to disk. The <strong>Beta Candidate release state remains blocked</strong>.
          </p>
        </div>

        {/* Local Proof Interpretation Guide */}
        <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-2.5">
          <span className="font-mono text-[9.5px] uppercase font-bold text-amber-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            Local Proof Interpretation
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] leading-relaxed">
            <div className="space-y-1.5">
              <div>
                <strong className="text-emerald-400">● PASS (exit code 0):</strong>
                <p className="text-slate-400 text-[9px]">Only valid if actual physical AI-separated output stems (.wav, .mp3, etc.) exist inside your designated folder, and are greater than 0 bytes. FFmpeg fallback does NOT count as local AI separation proof.</p>
              </div>
              <div>
                <strong className="text-red-400">● FAIL (exit code 1):</strong>
                <p className="text-slate-400 text-[9px]">The setup script was loaded but failed during execution or modeling. Verify configuration or review full terminal stacktrace output. Keep release label as Alpha.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div>
                <strong className="text-amber-400">● BLOCKED (exit code 2):</strong>
                <p className="text-slate-400 text-[9px]">E2E test failed due to a missing/invalid requirement: bad Python path, missing audio-separator package, model file not found at path, or bad input audio files.</p>
              </div>
              <div>
                <strong className="text-slate-400">● FFmpeg Path fallback:</strong>
                <p className="text-slate-400 text-[9px]">FFmpeg must be configured correctly in your system PATH or defined inside Global Settings. Fallback mode is a secondary mechanism and cannot serve as AI proof validation.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submission Template */}
        <div className="p-3 bg-slate-950/45 rounded-xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="font-mono text-[9.5px] uppercase font-bold text-indigo-400">
              Optional Real AI Gate Proof Submission Template
            </span>
            <button
              type="button"
              onClick={() => handleCopy(PROOF_SUBMISSION_TEMPLATE, "proof_template")}
              aria-label="Copy optional real AI Gate proof template"
              className="px-2 py-1 text-[9px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {copiedText === "proof_template" ? <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> : <Copy className="w-2.5 h-2.5 shrink-0" />}
              {copiedText === "proof_template" ? "Copied!" : "Copy Template"}
            </button>
          </div>
          <p className="text-[9.5px] text-slate-400 font-sans leading-relaxed">
            When reporting a successful local setup run, you may manually fill and submit this standardized E2E gate validation template. Note that Beta Candidate remains blocked.
          </p>
          <pre className="p-2.5 rounded bg-black/60 font-mono text-[8.5px] text-slate-400 overflow-x-auto max-h-[140px] whitespace-pre-wrap select-text border border-white/[0.02]">
            {PROOF_SUBMISSION_TEMPLATE}
          </pre>
        </div>
      </div>
    </div>
  );
};
