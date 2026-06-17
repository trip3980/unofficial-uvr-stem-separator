import React from "react";
import {
  Settings,
  Cpu,
  HardDrive,
  RefreshCw,
  Volume2,
  Save,
  TerminalSquare,
} from "lucide-react";

export default function GlobalSettings() {
  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      <div className="p-6 rounded-2xl bg-black/60 border border-green-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)] backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>

        <div className="flex items-center gap-4 border-b border-green-500/10 pb-5 mb-5">
          <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
            <Settings className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-green-400">
              Global Configuration
            </h2>
            <p className="text-sm font-mono text-green-500/60 uppercase tracking-widest mt-1">
              System-wide preferences and engine behavior
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
          {/* General Audio Setup */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-green-400 border-b border-green-500/10 pb-2 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Audio Output Encoding
            </h3>

            <div className="space-y-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-mono text-green-500/80">
                  Default Output Format
                </span>
                <select className="w-full bg-black/50 border border-green-500/20 rounded-lg px-3 py-2 text-sm text-green-300 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-500/20 transition-all font-mono">
                  <option value="WAV">WAV (Linear PCM)</option>
                  <option value="FLAC">FLAC (Lossless Compress)</option>
                  <option value="MP3">MP3 (Variable Bit Rate 320k)</option>
                </select>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-green-500/10 cursor-pointer hover:bg-green-500/5 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-green-500/30 bg-black text-green-500 focus:ring-0 focus:ring-green-500/20 accent-green-500"
                  defaultChecked
                />
                <span className="text-sm text-green-100">
                  Normalize Audio Volumes
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-green-500/10 cursor-pointer hover:bg-green-500/5 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-green-500/30 bg-black text-green-500 focus:ring-0 focus:ring-green-500/20 accent-green-500"
                />
                <span className="text-sm text-green-100">
                  Preserve Input Directory Structure
                </span>
              </label>
            </div>
          </div>

          {/* Acceleration Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-green-400 border-b border-green-500/10 pb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Engine & Execution Environment
            </h3>

            <div className="space-y-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-mono text-green-500/80">
                  Primary Compute Device
                </span>
                <select className="w-full bg-black/50 border border-green-500/20 rounded-lg px-3 py-2 text-sm text-green-300 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-500/20 transition-all font-mono">
                  <option value="cuda">CUDA GPU Device [Fastest]</option>
                  <option value="mps">Apple MPS / Metal [M-Series]</option>
                  <option value="openvino">
                    Intel OpenVINO [Optimized CPU]
                  </option>
                  <option value="cpu" selected>
                    Basic x64 CPU [Compatible]
                  </option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-green-500/80">
                    CPU Render Threads
                  </span>
                  <span className="text-xs font-mono font-bold text-green-400">
                    8 Cores
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="16"
                  defaultValue="8"
                  className="w-full h-1 accent-green-500 bg-black/50 border border-green-500/20 rounded-lg outline-none"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-green-500/10 flex justify-end">
          <button className="px-6 py-2.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 font-bold font-mono transition-all flex items-center gap-2">
            <Save className="w-4 h-4" />
            Write Master Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
