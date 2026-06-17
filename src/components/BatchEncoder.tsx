import React, { useState, useRef } from "react";
import {
  Play,
  Settings,
  RefreshCw,
  Folder,
  FileAudio,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function BatchEncoder() {
  const [inputFiles, setInputFiles] = useState<string[]>([]);
  const [outputDir, setOutputDir] = useState<string>(
    "C:\\Users\\Consumer\\Encoded_Audio\\",
  );
  const [outputFormat, setOutputFormat] = useState<string>("MP3");
  const [bitrate, setBitrate] = useState<string>("320k");
  const [sampleRate, setSampleRate] = useState<string>("44100");

  const [isEncoding, setIsEncoding] = useState(false);
  const [encodeProgress, setEncodeProgress] = useState(0);
  const [encodeLog, setEncodeLog] = useState<string[]>([]);
  const intervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startBatchEncode = () => {
    if (inputFiles.length === 0) return;
    setIsEncoding(true);
    setEncodeProgress(0);
    setEncodeLog([
      "[batch_encoder] Initializing Batch Encoder Engine (FFmpeg backend)...",
    ]);

    let currentFileIdx = 0;

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      setEncodeProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsEncoding(false);
          setEncodeLog((current) => [
            ...current,
            "[batch_encoder] Batch encoding completed successfully!",
          ]);
          return 100;
        }

        // Simulate file progression
        const increment = 100 / (inputFiles.length * 5); // 5 steps per file
        const next = Math.min(100, prev + increment);

        const fileProgressFactor =
          (prev % (100 / inputFiles.length)) / (100 / inputFiles.length);

        if (fileProgressFactor === 0 && currentFileIdx < inputFiles.length) {
          setEncodeLog((current) => [
            ...current,
            `[encoder] Starting conversion: ${inputFiles[currentFileIdx]} -> ${outputFormat}`,
          ]);
          currentFileIdx++;
        }

        return next;
      });
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-glass-card border border-glass-border shadow-glass-inset backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <RefreshCw className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white font-display">
            Batch Encoder
          </h2>
        </div>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Convert and compress multiple audio files in batch mode using the
          embedded FFmpeg engine. Select input files, choose target format and
          quality parameters.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-4">
            <label className="text-xs uppercase text-slate-400 justify-between items-center font-bold tracking-wider mb-2 flex font-mono">
              <span>Input Files ({inputFiles.length})</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInputFiles([])}
                  disabled={inputFiles.length === 0 || isEncoding}
                  className="text-[10px] text-red-500 hover:text-red-300 transition-colors bg-white/5 px-2 py-1 rounded disabled:opacity-50"
                  title="Clear All"
                >
                  Clear
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isEncoding}
                  className="text-[10px] text-cyan-500 hover:text-cyan-300 transition-colors bg-white/5 px-2 py-1 rounded disabled:opacity-50"
                >
                  + Add Files
                </button>
              </div>
            </label>
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              accept="audio/*"
              onChange={(e) => {
                if (e.target.files) {
                  const newFiles = Array.from(e.target.files).map(
                    (f: any) => f.name,
                  );
                  setInputFiles((prev) => [...prev, ...newFiles]);
                }
              }}
            />
            <div className="bg-black/30 border border-white/5 rounded-xl h-32 p-3 overflow-y-auto space-y-2">
              {inputFiles.length === 0 && (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono italic">
                  No files selected. Add files to batch queue.
                </div>
              )}
              {inputFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center gap-2 text-xs font-mono text-slate-300 bg-white/5 px-2 py-1.5 rounded"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileAudio className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                  <button
                    onClick={() =>
                      setInputFiles((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remove File"
                    disabled={isEncoding}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider font-mono">
                Output Path
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                  className="flex-1 bg-black/40 border border-[#ffffff]/10 hover:border-white/20 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
                />
                <button className="bg-black/50 border border-white/10 hover:border-white/20 hover:bg-white/5 rounded-lg px-3 flex items-center justify-center transition-all group">
                  <Folder className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2 relative z-20">
              <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-2 block font-mono">
                Output Format
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full bg-black/40 border border-[#ffffff]/10 hover:border-white/20 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-mono transition-all appearance-none"
              >
                <option value="WAV">WAV (Lossless)</option>
                <option value="FLAC">FLAC (Lossless Compressed)</option>
                <option value="MP3">MP3 (Lossy)</option>
                <option value="OGG">OGG Vorbis (Lossy)</option>
                <option value="OPUS">OPUS</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative z-10">
                <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block font-mono">
                  Bitrate
                </label>
                <select
                  value={bitrate}
                  onChange={(e) => setBitrate(e.target.value)}
                  className="w-full bg-black/40 border border-[#ffffff]/10 hover:border-white/20 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-mono transition-all appearance-none"
                >
                  <option value="128k">128 kbps</option>
                  <option value="192k">192 kbps</option>
                  <option value="256k">256 kbps</option>
                  <option value="320k">320 kbps</option>
                </select>
              </div>
              <div className="space-y-2 relative z-0">
                <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block font-mono">
                  Sample Rate
                </label>
                <select
                  value={sampleRate}
                  onChange={(e) => setSampleRate(e.target.value)}
                  className="w-full bg-black/40 border border-[#ffffff]/10 hover:border-white/20 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-mono transition-all appearance-none"
                >
                  <option value="44100">44100 Hz</option>
                  <option value="48000">48000 Hz</option>
                  <option value="96000">96000 Hz</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={startBatchEncode}
                disabled={isEncoding || inputFiles.length === 0}
                className={`w-full py-3 rounded-lg font-bold font-display uppercase tracking-widest text-sm transition-all duration-300 relative overflow-hidden group
                  ${
                    isEncoding || inputFiles.length === 0
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                      : "bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-400/30"
                  }`}
              >
                {isEncoding && (
                  <div
                    className="absolute inset-0 bg-indigo-500/20"
                    style={{
                      width: `${encodeProgress}%`,
                      transition: "width 0.4s ease-out",
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isEncoding ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isEncoding
                    ? `Encoding... ${Math.round(encodeProgress)}%`
                    : "Start Batch Encode"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Encode Logs */}
        <AnimatePresence>
          {encodeLog.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mt-6 border-t border-white/5 pt-6"
            >
              <div className="bg-[#050505] rounded-xl border border-white/5 p-4 h-40 overflow-y-auto font-mono text-[10px] space-y-1.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                {encodeLog.map((log, idx) => (
                  <div
                    key={idx}
                    className={`${
                      log.includes("successfully")
                        ? "text-green-400"
                        : log.includes("warning")
                          ? "text-amber-400"
                          : "text-slate-400"
                    }`}
                  >
                    <span className="text-slate-600 mr-2">
                      {new Date().toISOString().split("T")[1].slice(0, 8)}
                    </span>
                    {log}
                  </div>
                ))}
                {encodeProgress >= 100 && (
                  <div className="text-green-400 font-bold mt-2 flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" /> All files processed
                    successfully.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
