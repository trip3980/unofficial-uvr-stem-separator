import React, { useState } from "react";
import { Copy, Check, Terminal, TerminalSquare, Sparkles, Cpu, Layers, HelpCircle, HardDrive } from "lucide-react";
import { HelpToggle, HelpText, HelpTooltipIcon, AccessibleTooltipWrapper } from "./HelpSystem";

interface StepItem {
  id: string;
  name: string;
  purpose: string;
  command: string;
}

const WINDOWS_STEPS: StepItem[] = [
  {
    id: "create_env",
    name: "1. Create Python Sandbox",
    purpose: "Create isolated virtual environment in local folder .venv-ai to avoid package pollution.",
    command: "python -m venv .venv-ai"
  },
  {
    id: "activate_env",
    name: "2. Activate Virtual Env",
    purpose: "Enable sandbox variables in Windows PowerShell shell context.",
    command: ".\\.venv-ai\\Scripts\\Activate.ps1"
  },
  {
    id: "install_cpu",
    name: "3. Install General CPU Backend",
    purpose: "Installs CPU-only PyTorch and base python separator package.",
    command: "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu\npip install audio-separator"
  },
  {
    id: "install_cuda",
    name: "4. Install Hardware CUDA Wheels",
    purpose: "Install compatible NVIDIA CUDA-Toolkit bindings and deep learning dependencies.",
    command: "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121\npip install audio-separator[gpu] --upgrade"
  },
  {
    id: "verify_backend",
    name: "5. Verify Torch and GPU Drivers",
    purpose: "Confirm CUDA drivers, PyTorch GPU bindings, audio separator status & check system environment path binary status.",
    command: "nvidia-smi\nffmpeg -version\npython -c \"import audio_separator; print('audio_separator OK')\"\npython -c \"import torch; print('Torch:', torch.__version__); print('CUDA Available:', torch.cuda.is_available()); print('CUDA Version:', torch.version.cuda); print('Device Count:', torch.cuda.device_count()); print('Device Name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')\""
  },
  {
    id: "run_e2e",
    name: "6. Run AI E2E Proof (CUDA Separation)",
    purpose: "Execute full command-line neural separation run mapping custom device directly in electron backend subprocess.",
    command: "# Windows CMD Version:\nnode electron-shell/test-ai-e2e.cjs --python \"%PYTHON_EXE_PATH%\" --model \"%MODEL_FILE_PATH%\" --input \"%INPUT_AUDIO_PATH%\" --output \"%OUTPUT_FOLDER_PATH%\" --device cuda\n\n# PowerShell Version:\nnode electron-shell/test-ai-e2e.cjs --python \"$PYTHON_EXE_PATH\" --model \"$MODEL_FILE_PATH\" --input \"$INPUT_AUDIO_PATH\" --output \"$OUTPUT_FOLDER_PATH\" --device cuda"
  }
];

const MAC_LINUX_STEPS: StepItem[] = [
  {
    id: "mac_create",
    name: "1. Create Python Sandbox",
    purpose: "Provision clean environment inside uvr_env directory sandbox.",
    command: "python3 -m venv uvr_env"
  },
  {
    id: "mac_activate",
    name: "2. Activate Environment",
    purpose: "Initialize macOS / Linux shell context paths safely.",
    command: "source uvr_env/bin/activate"
  },
  {
    id: "mac_install_base",
    name: "3. Upgrade Base Assembler wheels",
    purpose: "Ensure pip, wheel & setuptools structures are up-to-date.",
    command: "pip install -U pip setuptools wheel"
  },
  {
    id: "mac_install_sep",
    name: "4. Install audio-separator",
    purpose: "Install separation engine package. PyTorch matches metal acceleration libraries automatically.",
    command: "pip install audio-separator[gpu]"
  },
  {
    id: "mac_verify",
    name: "5. Verify Platform Readiness",
    purpose: "Check FFmpeg and running framework state under virtual environment context.",
    command: "ffmpeg -version\npython3 -c \"import torch; print('MPS Available:', torch.backends.mps.is_available() if hasattr(torch.backends, 'mps') else 'No')\""
  },
  {
    id: "mac_e2e",
    name: "6. Run AI E2E Proof",
    purpose: "Run complete local separation runner directly in native Apple Silicon layout.",
    command: "node electron-shell/test-ai-e2e.cjs --python \"./uvr_env/bin/python\" --model \"<MODEL_FILE_PATH>\" --input \"<INPUT_AUDIO_PATH>\" --output \"<OUTPUT_FOLDER_PATH>\" --device mps"
  }
];

export const HostSetupGuide: React.FC = () => {
  const [osTab, setOsTab] = useState<"win" | "mac-linux">("win");
  const [activeStepId, setActiveStepId] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const activeSteps = osTab === "win" ? WINDOWS_STEPS : MAC_LINUX_STEPS;
  const currentStep = activeSteps.find(s => s.id === activeStepId) || activeSteps[0];

  if (!activeStepId && activeSteps.length > 0) {
    setActiveStepId(activeSteps[0].id);
  }

  const handleCopy = (cmd: string, keyId: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedText(keyId);
    setTimeout(() => {
      setCopiedText(null);
    }, 1500);
  };

  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-4 font-sans text-xs text-slate-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-100 uppercase tracking-wide font-mono text-[11px]">Terminal Host Setup Environment Guide</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpToggle sectionId="host_setup_guide" label="Show Help" />
          <span className="text-[10px] text-slate-500 font-mono">Setup Workflow Guide</span>
        </div>
      </div>

      <HelpText
        sectionId="host_setup_guide"
        text="Help: This setup panel outlines direct bash commands or commands for Windows PowerShell to prepare your host system to run local AI operations safely. Copy each block in order to initialize your sandbox environment."
      />

      <div className="bg-emerald-950/20 px-3 py-2.5 border border-emerald-500/10 rounded-xl text-[11px] text-emerald-300 leading-relaxed space-y-1.5 font-sans">
        <div className="flex items-center gap-1.5 font-bold text-emerald-200 uppercase tracking-wide text-[10px]">
          <TerminalSquare className="w-4 h-4 text-emerald-400" />
          Prerequisites Verification Instructions
        </div>
        <p className="text-slate-400">
          UVR operates locally by running Python subprocess calls utilizing deep neural networks. Let's configure your native environment accurately. No automated changes will modify your global workspace path.
        </p>
      </div>

      {/* OS Target Tabs */}
      <div className="flex bg-black/45 p-1 rounded-lg border border-white/5 font-mono">
        <button
          type="button"
          onClick={() => {
            setOsTab("win");
            setActiveStepId(WINDOWS_STEPS[0].id);
          }}
          className={`flex-grow py-1.5 rounded-md text-center transition-all cursor-pointer text-[10px] uppercase font-bold
            ${osTab === "win" 
              ? "bg-slate-800/80 text-emerald-300 border border-white/10 shadow-sm" 
              : "hover:text-slate-300 text-slate-500"
            }`}
        >
          🗔 Windows (PowerShell)
        </button>
        <button
          type="button"
          onClick={() => {
            setOsTab("mac-linux");
            setActiveStepId(MAC_LINUX_STEPS[0].id);
          }}
          className={`flex-grow py-1.5 rounded-md text-center transition-all cursor-pointer text-[10px] uppercase font-bold
            ${osTab === "mac-linux" 
              ? "bg-slate-800/80 text-emerald-300 border border-white/10 shadow-sm" 
              : "hover:text-slate-300 text-slate-500"
            }`}
        >
          🍎/🐧 macOS / Linux Terminal
        </button>
      </div>

      {/* Vertical Steps + Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
        {/* Step Selector Buttons List */}
        <div className="space-y-1.5 md:col-span-1 border-b md:border-b-0 md:border-r border-white/5 pb-3 md:pb-0 md:pr-3 max-h-[320px] overflow-y-auto">
          {activeSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStepId(step.id)}
              className={`w-full text-left p-2 rounded-lg border transition-all duration-200 font-mono text-[10px] flex items-center justify-between cursor-pointer
                ${activeStepId === step.id 
                  ? "bg-slate-850 border-emerald-500/20 text-emerald-300 font-bold" 
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
            <pre className="p-3.5 pr-12 overflow-x-auto text-emerald-300 font-mono leading-relaxed select-all max-h-[160px] whitespace-pre-wrap select-text">
              {currentStep.command}
            </pre>
            <div className="absolute top-2.5 right-2.5">
              <AccessibleTooltipWrapper content="Click to copy this terminal command block to clipboard safely." position="top">
                <button
                  type="button"
                  onClick={() => handleCopy(currentStep.command, currentStep.id)}
                  className="p-2 rounded-md bg-slate-900 border border-white/10 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center shadow-md-indigo hover:border-emerald-500/20"
                  title="Copy Command Block"
                >
                  {copiedText === currentStep.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </AccessibleTooltipWrapper>
            </div>
          </div>

          <div className="bg-[#0b101c]/40 p-2.5 rounded-lg border border-slate-800/80 text-[10px] text-slate-400 italic">
            <span className="font-semibold text-slate-300 font-sans not-italic block mb-0.5">💡 Execution Guidance Note:</span>
            Make sure to apply these steps directly into your system-level command line interface where Python is fully initialized.
          </div>
        </div>
      </div>
    </div>
  );
};
