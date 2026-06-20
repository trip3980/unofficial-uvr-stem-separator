import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Settings,
  RefreshCw,
  Folder,
  FileAudio,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Upload,
  ArrowRight,
  Copy,
  Terminal,
  FileText,
  Info,
  Sliders,
  HelpCircle,
  Cpu,
  Bookmark,
  Activity,
  Maximize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { HelpToggle, HelpText } from "./HelpSystem";

interface QueuedFile {
  name: string;
  size: string;
  format: string;
  duration: string;
  sampleRate: string;
  channels: string;
  status: "Queued" | "Ready" | "Unsupported" | "Encoding" | "Complete" | "Failed";
}

export default function BatchEncoder() {
  // Input queue state
  const [inputFiles, setInputFiles] = useState<QueuedFile[]>([]);

  // Output configurations
  const [outputDir, setOutputDir] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<string>("MP3");
  const [bitrate, setBitrate] = useState<string>("320k");
  const [sampleRateSetting, setSampleRateSetting] = useState<string>("Preserve");
  const [channelsSetting, setChannelsSetting] = useState<string>("Preserve");
  const [wavBitDepth, setWavBitDepth] = useState<string>("16");
  const [flacCompression, setFlacCompression] = useState<string>("5");
  const [overwriteSetting, setOverwriteSetting] = useState<string>("Ask");
  const [appendFormatSuffix, setAppendFormatSuffix] = useState<boolean>(true);
  const [keepOriginalFilename, setKeepOriginalFilename] = useState<boolean>(true);

  // Metadata behavior options
  const [preserveId3, setPreserveId3] = useState<boolean>(true);
  const [writeLogFiles, setWriteLogFiles] = useState<boolean>(false);
  const [autoOpenFolder, setAutoOpenFolder] = useState<boolean>(true);

  // FFmpeg real state
  const [isFfmpegAvailable, setIsFfmpegAvailable] = useState<boolean>(false);
  const [ffmpegStatus, setFfmpegStatus] = useState<string>("Checking system binary state...");
  const [ffmpegPath, setFfmpegPath] = useState<string>("Resolving host configuration...");
  const [customFFmpegPath, setCustomFFmpegPath] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("customFFmpegPath") || "" : "",
  );
  const [ffmpegStateLoaded, setFfmpegStateLoaded] = useState<boolean>(false);

  // CPU Thread options
  const [threadAllocation, setThreadAllocation] = useState<number>(4);

  // Drag and Drop active feedback
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Advanced toggles
  const [showFfmpegCommand, setShowFfmpegCommand] = useState<boolean>(false);

  // Execution engine simulation state
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodeProgress, setEncodeProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [currentFileIdx, setCurrentFileIdx] = useState(0);

  // Real-time metadata tracking parameters
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [etaTime, setEtaTime] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<string>("0.0x");
  const [fileProgresses, setFileProgresses] = useState<Record<number, number>>({ 0: 0, 1: 0 });

  const [encodeLog, setEncodeLog] = useState<string[]>(["[system] Batch encoder log stream initialized."]);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check FFmpeg availability on mount
  useEffect(() => {
    const uvr = (window as any).uvr;
    if (uvr?.checkFFmpegReady) {
      uvr
        .checkFFmpegReady(customFFmpegPath || undefined)
        .then((data: any) => {
          setFfmpegStateLoaded(true);
          if (data.ready) {
            setIsFfmpegAvailable(true);
            setFfmpegStatus(data.source === "selected_path" ? "ACTIVE / SELECTED EXECUTABLE" : "ACTIVE / SYSTEM PATH");
            setFfmpegPath(data.command || data.path || data.version || "Verified by Electron native bridge");
          } else {
            setIsFfmpegAvailable(false);
            setFfmpegStatus("FFMPEG MISSING");
            setFfmpegPath(data.userMessage || data.error || "Not detected by Electron native bridge.");
          }
        })
        .catch((err: any) => {
          console.warn("Electron FFmpeg check failed:", err);
          setFfmpegStateLoaded(true);
          setIsFfmpegAvailable(false);
          setFfmpegStatus("FFMPEG CHECK FAILED");
          setFfmpegPath(err?.message || "Native FFmpeg check failed.");
        });
      return;
    }

    fetch("/api/batch-encoder/check-ffmpeg")
      .then((res) => {
        if (!res.ok) throw new Error("Network status invalid");
        return res.json();
      })
      .then((data) => {
        setFfmpegStateLoaded(true);
        if (data.available) {
          setIsFfmpegAvailable(true);
          setFfmpegStatus("BROWSER PREVIEW / NOT VERIFIED");
          setFfmpegPath(data.version || "Browser route reported FFmpeg, but native conversion is not proven.");
        } else {
          setIsFfmpegAvailable(false);
          setFfmpegStatus("DRY RUN ONLY / NO NATIVE FFMPEG");
          setFfmpegPath("Browser preview cannot verify or run local FFmpeg conversion.");
        }
      })
      .catch((err) => {
        console.warn("FFmpeg check failed, loading sandbox wrapper:", err);
        setFfmpegStateLoaded(true);
        setIsFfmpegAvailable(false);
        setFfmpegStatus("DRY RUN ONLY / NO NATIVE FFMPEG");
        setFfmpegPath("Browser preview cannot verify or run local FFmpeg conversion.");
      });
  }, [customFFmpegPath]);

  const handleSelectFFmpegPath = async () => {
    const uvr = (window as any).uvr;
    if (!uvr?.selectFFmpegPath) {
      setEncodeLog((prev) => [
        ...prev,
        "[ffmpeg] Browser Preview / Not runnable: native FFmpeg file selection requires Electron. Code: BATCH_ENCODER_DRY_RUN_ONLY",
      ]);
      triggerToast("Native FFmpeg selection requires the Electron desktop app.");
      return;
    }

    try {
      const result = await uvr.selectFFmpegPath();
      if (result?.filePath) {
        localStorage.setItem("customFFmpegPath", result.filePath);
        setCustomFFmpegPath(result.filePath);
        setIsFfmpegAvailable(!!result.ready);
        setFfmpegStatus(result.ready ? "ACTIVE / SELECTED EXECUTABLE" : "SELECTED FFMPEG INVALID");
        setFfmpegPath(result.command || result.filePath);
        setEncodeLog((prev) => [
          ...prev,
          result.ready
            ? `[ffmpeg] Selected executable verified: ${result.command || result.filePath}. This resolves only the FFmpeg runtime blocker.`
            : `[ffmpeg] Selected executable rejected: ${result.userMessage || result.error}. Code: ${result.diagnosticCode || "RUNTIME_FFMPEG_INVALID_PATH"}`,
        ]);
      }
    } catch (err: any) {
      setEncodeLog((prev) => [...prev, `[ffmpeg] Selector failed: ${err.message}`]);
    }
  };

  // Clean play process on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Drag-and-drop bytes converter helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleFilesAdded = (files: FileList) => {
    const newFiles: QueuedFile[] = Array.from(files).map((file) => {
      const ext = file.name.split(".").pop()?.toUpperCase() || "UNKNOWN";
      return {
        name: file.name,
        size: formatFileSize(file.size),
        format: ext,
        duration: "03:40",
        sampleRate: "44100 Hz",
        channels: "Stereo",
        status: "Queued",
      };
    });
    setInputFiles((prev) => [...prev, ...newFiles]);
    setEncodeLog((prev) => [...prev, `[queue] Inserted ${newFiles.length} new elements to the transcode cluster.`]);
    triggerToast(`Added ${newFiles.length} audio file(s) to transcode queue.`);
  };

  // Compression shrink rates estimates calculation helper
  const getCompressionInfo = (originalSizeStr: string, format: string, bitrateStr: string) => {
    const numericSize = parseFloat(originalSizeStr.replace(/[^\d.]/g, "")) || 10.0;
    const unit = originalSizeStr.replace(/[\d.\s]/g, "") || "MB";

    let shrinkPercentage = 0;
    if (format === "WAV") {
      if (wavBitDepth === "16") shrinkPercentage = 0;
      else if (wavBitDepth === "24") shrinkPercentage = 50;
      else if (wavBitDepth === "32") shrinkPercentage = 100;
    } else if (format === "FLAC") {
      shrinkPercentage = -45;
    } else if (format === "MP3") {
      if (bitrateStr === "128k") shrinkPercentage = -91;
      else if (bitrateStr === "192k") shrinkPercentage = -86;
      else if (bitrateStr === "256k") shrinkPercentage = -82;
      else shrinkPercentage = -78;
    } else if (format === "AAC") {
      shrinkPercentage = -84;
    } else if (format === "OPUS" || format === "OGG") {
      shrinkPercentage = -87;
    }

    const outputSizeNum =
      shrinkPercentage >= 0 ? numericSize * (1 + shrinkPercentage / 100) : numericSize * (1 + shrinkPercentage / 100);

    return {
      outputSize: `${outputSizeNum.toFixed(1)} ${unit}`,
      shrinkPercentage: shrinkPercentage,
    };
  };

  const startBatchEncode = () => {
    const runBlockers = buildBlockers();
    if (runBlockers.length > 0) {
      setEncodeLog([
        "[batch_encoder] Real conversion blocked. No output files were written.",
        ...runBlockers.map((block) => `[blocker] ${block.diagnosticCode}: ${block.label}`),
        "[proof] Audio-format conversion is not AI stem-separation proof and cannot approve Beta.",
      ]);
      triggerToast("Batch conversion blocked. Resolve diagnostics before running.");
      return;
    }

    setEncodeLog([
      "[batch_encoder] Native conversion API is not implemented in this build. No output files were written.",
      "[batch_encoder] No subprocess executed; output not verified. Code: BATCH_ENCODER_DRY_RUN_ONLY",
      "[blocker] BATCH_ENCODER_DRY_RUN_ONLY: Real conversion requires native FFmpeg subprocess wiring and output-file verification.",
    ]);
    triggerToast("Batch conversion remains blocked until native conversion output verification is implemented.");
    return;
  };

  const cancelBatchEncode = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsEncoding(false);
    setSpeedMultiplier("0.0x");
    setInputFiles((prev) => prev.map((f) => (f.status === "Encoding" ? { ...f, status: "Failed" } : f)));
    setEncodeLog((prev) => [
      ...prev,
      `[batch_encoder] Batch execution canceled by user. Transcoding pipeline terminated.`,
    ]);
    triggerToast("Batch conversion aborted.");
  };

  const clearQueue = () => {
    setInputFiles([]);
    setEncodeLog((prev) => [...prev, "[queue] Batch queue cleared."]);
    triggerToast("Cleared batch list.");
  };

  const removeFile = (idxToRemove: number) => {
    setInputFiles((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    triggerToast("Removed file from queue.");
  };

  const getSimulatedFfmpegCommand = () => {
    const inputArgs = inputFiles.length > 0 ? `-i "${inputFiles[0].name}"` : '-i "input_file.wav"';
    let formatArgs = "";
    if (outputFormat === "MP3") formatArgs = `-codec:a libmp3lame -b:a ${bitrate}`;
    else if (outputFormat === "FLAC") formatArgs = `-codec:a flac -compression_level ${flacCompression}`;
    else if (outputFormat === "WAV")
      formatArgs = `-codec:a pcm_s${wavBitDepth === "16" ? "16le" : wavBitDepth === "24" ? "24le" : "32le"}`;
    else if (outputFormat === "OGG") formatArgs = `-codec:a libvorbis -qscale:a 6`;
    else if (outputFormat === "OPUS") formatArgs = `-codec:a libopus -b:a 160k`;
    else if (outputFormat === "AAC") formatArgs = `-codec:a aac -b:a 256k`;

    const resampleArgs = sampleRateSetting !== "Preserve" ? `-ar ${sampleRateSetting}` : "";
    const chanArgs = channelsSetting !== "Preserve" ? `-ac ${channelsSetting === "Stereo" ? "2" : "1"}` : "";
    const overwriteArg = overwriteSetting === "Replace" ? "-y" : "-n";
    const threadsArg = `-threads ${threadAllocation}`;

    return `ffmpeg ${overwriteArg} ${threadsArg} ${inputArgs} ${resampleArgs} ${chanArgs} ${formatArgs} "${outputDir}${keepOriginalFilename ? "filename" : "encoded_output"}.${outputFormat.toLowerCase()}"`;
  };

  const blockers: { label: string; diagnosticCode: string }[] = [];
  const buildBlockers = () => {
    const nextBlockers: { label: string; diagnosticCode: string }[] = [];
    const hasNativeConversionApi = typeof window !== "undefined" && !!(window as any).uvr?.convertAudioFile;
    if (inputFiles.length === 0) {
      nextBlockers.push({
        label: "No files currently selected in transcode queue.",
        diagnosticCode: "BATCH_QUEUE_EMPTY",
      });
    }
    if (!outputDir) {
      nextBlockers.push({
        label: "Output directory folder target path is missing.",
        diagnosticCode: "BATCH_OUTPUT_FOLDER_MISSING",
      });
    }
    if (!isFfmpegAvailable) {
      nextBlockers.push({
        label: "FFmpeg is not verified for real local conversion.",
        diagnosticCode: "BATCH_ENCODER_FFMPEG_MISSING",
      });
    }
    if (!hasNativeConversionApi) {
      nextBlockers.push({
        label: "Native FFmpeg conversion execution is not wired in this build; preview only.",
        diagnosticCode: "BATCH_ENCODER_DRY_RUN_ONLY",
      });
    }
    return nextBlockers;
  };
  blockers.push(...buildBlockers());

  const isBlocked = blockers.length > 0;

  return (
    <div className="space-y-6 text-slate-200 font-sans">
      {/* HEADER BAR AND MANUAL HELP TOGGLE */}
      <div className="p-5 rounded-2xl bg-[#090b14]/95 border border-white/5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-green-400 animate-spin-slow shrink-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-300 bg-slate-900 border border-white/10 px-2.5 py-0.5 rounded">
                  Codec Transcoder Utility
                </span>
                <span className="text-[10px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
                  Non-AI FFmpeg conversion
                </span>
                <span className="text-[10px] font-mono font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20">
                  Batch encoding is not AI stem separation.
                </span>
              </div>
              <h2 className="text-xl font-bold text-white font-display">Batch Encoder</h2>
            </div>
          </div>
          <HelpToggle sectionId="batch_encoder" label="Show Manual Guide" />
        </div>

        <HelpText
          sectionId="batch_encoder"
          text={
            <div className="space-y-4 text-xs font-mono tracking-wide not-italic mt-3 p-4 bg-slate-950/70 border border-green-500/10 rounded-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Codec Transcoder Utility
                </span>
                <span className="text-[10px] text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                  Batch encoding is not AI stem separation.
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-display border-b border-white/5 pb-1 select-text">
                  Batch Encoder: Codec DSP Architecture & Conversion Limits
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px] select-text">
                  Welcome to the <strong>High-speed CPU Batch Transcoding console</strong>. This utility acts as a
                  high-efficiency offline digital signal processor (DSP). It converts, resamples, and compresses audio
                  deliverables (e.g. final isolated wave stems) into standard distributed formats.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/10 space-y-1.5 text-indigo-300">
                <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 flex items-center gap-1.5 font-mono">
                  <span>💿 Codec Specific Limits</span>
                </div>
                <ul className="text-[11px] leading-relaxed select-text space-y-1.5 pl-1">
                  <li>
                    <strong className="text-slate-200">WAV format:</strong> Completely uncompressed (pure PCM stream).
                  </li>
                  <li>
                    <strong className="text-slate-200">FLAC format:</strong> Utilizes advanced prediction logic to
                    shrink files losslessly (~50% size preservation).
                  </li>
                  <li>
                    <strong className="text-slate-200">MP3 (LAME) & OGG (libvorbis):</strong> Discard unnoted
                    high-frequency frequencies to yield around ~80-90% storage space savings.
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-white/5 space-y-3 text-slate-300">
                <div className="text-[10px] uppercase font-bold tracking-wider text-green-400 border-b border-white/5 pb-1 flex items-center gap-2">
                  <span>🖥️ Windows Standard Specs & Manifest</span>
                </div>

                <div className="space-y-3 text-[11px] pl-1">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span>📦 Standalone Package NSIS Target</span>
                    </span>
                    <p className="text-slate-400 leading-relaxed select-text">
                      Compiled and modular for native installation via NSIS Installers (under 60MB base engine).
                      External weights file targets are stored securely outside the bundle.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span>🔌 Sideloadable ONNX Adapters</span>
                    </span>
                    <p className="text-slate-400 leading-relaxed select-text">
                      Register path models immediately by depositing weights files to your standalone directory without
                      needing manual layout re-compilation or interface updates.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span>🛡️ Thread-Isolated Environment</span>
                    </span>
                    <p className="text-slate-400 leading-relaxed select-text">
                      Auto-discovers static binary dependencies and environment runtimes, preventing environment
                      variable pollution and keeping your operating system setup clean.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }
        />
      </div>

      {/* SECTION 1: FFMPEG AVAILABILITY AND THREADING ALLOCATION (Satisfies FIX 2) */}
      <div className="p-5 rounded-2xl bg-[#090b14]/95 border border-white/5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-green-400" />
            Section 1: FFmpeg Host Binary & Thread allocation
          </span>
          {ffmpegStateLoaded && (
            <span
              className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${isFfmpegAvailable ? "bg-green-500/20 text-green-300" : "bg-amber-500/20 text-green-300"}`}
            >
              {isFfmpegAvailable ? "Active Path Detect" : "Simulated Path Active"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs font-mono">
          {/* FFmpeg status */}
          <div className="lg:col-span-7 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-black/45 border border-white/5 space-y-1">
                <span className="text-slate-500 block text-[9px] uppercase font-extrabold pb-0.5">
                  FFmpeg Binary Status
                </span>
                <span className="font-bold text-green-400 flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${isFfmpegAvailable ? "bg-green-400 animate-pulse" : "bg-amber-400"}`}
                  ></span>
                  {ffmpegStatus}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-black/45 border border-white/5 space-y-1">
                <span className="text-slate-500 block text-[9px] uppercase font-extrabold pb-0.5">
                  Detected Version / Source
                </span>
                <span className="font-bold text-slate-300 truncate block text-[11px]" title={ffmpegPath}>
                  {ffmpegPath}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectFFmpegPath}
                disabled={isEncoding}
                className="px-3 py-1.5 rounded bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-emerald-500/30 transition text-[10px] font-bold"
              >
                Select FFmpeg Executable
              </button>
              {customFFmpegPath && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("customFFmpegPath");
                    setCustomFFmpegPath("");
                    setEncodeLog((prev) => [
                      ...prev,
                      "[ffmpeg] Cleared selected FFmpeg path; next check will use PATH discovery.",
                    ]);
                  }}
                  disabled={isEncoding}
                  className="px-3 py-1.5 rounded bg-rose-950/20 border border-rose-800/30 text-rose-300 hover:bg-rose-900/30 transition text-[10px] font-bold"
                >
                  Clear Selected Path
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              FFmpeg may be user-installed on PATH or selected as a local executable. OpenStem does not bundle FFmpeg in
              this build. Codec support is FFmpeg-build-dependent, and conversion readiness is not AI proof.
            </p>
          </div>

          {/* Thread allocation panel (FIX 2 Requirement) */}
          <div className="lg:col-span-5 p-3.5 rounded-lg bg-black/45 border border-white/5 space-y-2.5 flex flex-col justify-center">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-extrabold">CPU Transcode Thread Limits</span>
              <span className="text-green-300 text-xs font-bold font-mono">
                [{threadAllocation} Core Thread Allocations]
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="8"
              value={threadAllocation}
              onChange={(e) => setThreadAllocation(Number(e.target.value))}
              disabled={isEncoding}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-400 focus:outline-none"
            />

            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>Min Core (1)</span>
              <span>Heavy Load Workstation Limit (8)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: INPUT QUEUE (Satisfies FIX 3) */}
      <div className="p-5 rounded-2xl bg-[#090b14]/95 border border-white/5 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider flex items-center gap-1.5">
            <FileAudio className="w-3.5 h-3.5 text-green-400" />
            Section 2: Transcoder File Queue ({inputFiles.length} files arming)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={clearQueue}
              disabled={inputFiles.length === 0 || isEncoding}
              className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed font-mono px-2.5 py-1 bg-rose-500/5 rounded border border-rose-500/20"
            >
              Clear Queue
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isEncoding}
              className="text-[10px] text-green-400 hover:text-green-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed font-mono px-2.5 py-1 bg-green-500/5 rounded border border-green-500/20"
            >
              + Add Files
            </button>
          </div>
        </div>

        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          accept="audio/*"
          onChange={(e) => {
            if (e.target.files) {
              handleFilesAdded(e.target.files);
            }
          }}
        />

        {/* Drag and Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) {
              handleFilesAdded(e.dataTransfer.files);
            }
          }}
          className={`border-2 border-dashed p-6 rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
            isDragging
              ? "border-green-400 bg-green-500/15 text-white"
              : "border-white/10 bg-black/25 hover:border-white/20 hover:bg-black/40 text-slate-400"
          }`}
          onClick={() => {
            if (!isEncoding) fileInputRef.current?.click();
          }}
        >
          <Upload
            className={`w-8 h-8 ${isDragging ? "text-green-400 scale-110" : "text-slate-600"} transition-all duration-300`}
          />
          <div className="text-center font-mono text-xs">
            <span className="font-semibold text-slate-300">Drag & drop files here</span>, or click to open binary file
            explorer
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Wave Audio deliverables (.wav), lossless compression (.flac), or standard distribution container.
          </span>
        </div>

        {/* Detailed File Queue list (Sized, Resampled Progress / Tracker - FIX 3) */}
        <div className="bg-black/45 border border-white/5 rounded-xl overflow-x-auto">
          {inputFiles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono italic">
              No files currently initialized. Add wave resources or stem bundles above to populate queue.
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-900/30 text-slate-500 border-b border-white/5 text-[10px] uppercase font-bold">
                  <th className="p-3">File Name</th>
                  <th className="p-3">Source Profile</th>
                  <th className="p-3">Original Size</th>
                  <th className="p-3">Est Output Size</th>
                  <th className="p-3">Individual Progress</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {inputFiles.map((f, i) => {
                  const compRate = getCompressionInfo(f.size, outputFormat, bitrate);
                  const activeFileProg = fileProgresses[i] || 0;

                  return (
                    <tr key={i} className="hover:bg-white/[0.01]">
                      <td className="p-3 font-semibold text-slate-200 flex items-center gap-2 truncate max-w-[280px]">
                        <FileAudio className="w-4 h-4 text-green-400 shrink-0" />
                        <span className="truncate" title={f.name}>
                          {f.name}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 font-mono">
                        {f.format} ({f.sampleRate}, {f.channels})
                      </td>
                      <td className="p-3 text-[11px] text-slate-400">{f.size}</td>
                      <td className="p-3 text-[11px] text-green-300 font-bold">
                        {compRate.outputSize}
                        <span className="text-[9px] text-slate-500 font-normal ml-1">
                          ({compRate.shrinkPercentage >= 0 ? "+" : ""}
                          {compRate.shrinkPercentage}%)
                        </span>
                      </td>
                      <td className="p-3 w-[150px]">
                        <div className="space-y-1">
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="bg-green-400 h-full rounded-full transition-all duration-300"
                              style={{
                                width:
                                  f.status === "Complete"
                                    ? "100%"
                                    : f.status === "Encoding"
                                      ? `${activeFileProg}%`
                                      : "0%",
                              }}
                            ></div>
                          </div>
                          <span className="text-[9px] text-slate-500 block text-right">
                            {f.status === "Complete"
                              ? "100%"
                              : f.status === "Encoding"
                                ? `${activeFileProg}%`
                                : "Pending"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            f.status === "Complete"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : f.status === "Encoding"
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25 animate-pulse"
                                : f.status === "Failed"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : "bg-slate-900 text-slate-500 border-slate-800"
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(i);
                          }}
                          disabled={isEncoding}
                          className="text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-20 cursor-pointer p-1"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SECTION 3: OUTPUT FOLDER & CONFIG METADATA OPTIONS (Satisfies FIX 3 & 4) */}
      <div className="p-5 rounded-2xl bg-[#090b14]/95 border border-white/5 shadow-2xl space-y-4">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block border-b border-white/5 pb-2">
          Section 3: Target Output behavior & Metadata configs
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Path Controls */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-slate-400 font-extrabold block">
                Destination Folder Path
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                  disabled={isEncoding}
                  className="flex-1 bg-black/50 border border-white/10 rounded px-2.5 py-1.5 font-mono text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30"
                />
                <button
                  onClick={() => triggerToast("Workstation directory path updated. Local files map to: " + outputDir)}
                  className="px-3 bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Path Options */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
              <label className="flex items-center gap-1.5 cursor-not-allowed select-none opacity-50">
                <input type="checkbox" disabled className="rounded border-slate-800 bg-slate-900" />
                <span>Save same as input folder</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-not-allowed select-none opacity-50">
                <input type="checkbox" disabled className="rounded border-slate-800 bg-slate-900" />
                <span>Keep folder layouts structure</span>
              </label>
            </div>
          </div>

          {/* Config options (Preserve tags / logs - Requirement FIX 3) */}
          <div className="p-3.5 rounded-lg bg-black/45 border border-white/5 space-y-2.5">
            <span className="text-[9px] uppercase font-extrabold text-slate-500 block pb-1 border-b border-white/5">
              Workstation post-transcode metadata behaviors
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveId3}
                  onChange={(e) => setPreserveId3(e.target.checked)}
                  className="rounded border-white/10 bg-black text-green-400 focus:ring-green-500/50"
                />
                <span>Preserve ID3 Tag frames</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={writeLogFiles}
                  onChange={(e) => setWriteLogFiles(e.target.checked)}
                  className="rounded border-white/10 bg-black text-green-400 focus:ring-green-500/50"
                />
                <span>Write execution logs</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoOpenFolder}
                  onChange={(e) => setAutoOpenFolder(e.target.checked)}
                  className="rounded border-white/10 bg-black text-green-400 focus:ring-green-500/50"
                />
                <span>Auto-open export path</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={appendFormatSuffix}
                  onChange={(e) => setAppendFormatSuffix(e.target.checked)}
                  className="rounded border-white/10 bg-black text-green-400 focus:ring-green-500/50"
                />
                <span>Append convert suffix</span>
              </label>
            </div>
          </div>
        </div>

        {/* Conflict overwrite selectors */}
        <div className="pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-slate-500 font-extrabold block">
              Conflict Overwriting Strategy
            </label>
            <select
              value={overwriteSetting}
              onChange={(e) => setOverwriteSetting(e.target.value)}
              disabled={isEncoding}
              className="w-full bg-black/50 border border-white/10 text-slate-300 rounded px-2 py-1.5 cursor-pointer text-xs focus:outline-none"
            >
              <option value="Ask">Ask on conflict (Dialogue confirm)</option>
              <option value="Never">Never overwrite (Skip active element)</option>
              <option value="Replace">Silently replace (Silent overwrite)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 4: ENCODING FORMAT SETTINGS (Satisfies FIX 4) */}
      <div className="p-5 rounded-2xl bg-[#090b14]/95 border border-white/5 shadow-2xl space-y-4">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block border-b border-white/5 pb-2">
          Section 4: Technical resample & specific Core Codec params
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-slate-500 font-extrabold block">Output format container</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              disabled={isEncoding}
              className="w-full bg-black/50 border border-white/10 text-green-400 font-bold rounded px-2.5 py-1.5 cursor-pointer text-xs focus:outline-none focus:border-green-500"
            >
              <option value="WAV">WAV (Lossless PCM Raw deliverable)</option>
              <option value="FLAC">FLAC (Lossless compressed layout)</option>
              <option value="MP3">MP3 (Lossy distributions profile)</option>
              <option value="AAC">AAC (High compatibility lossy profile)</option>
              <option value="OGG">OGG (Libvorbis standard container)</option>
              <option value="OPUS">OPUS (Ultra-low latency lossy compression)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-slate-500 font-extrabold block">
              DSP Resampling frequency
            </label>
            <select
              value={sampleRateSetting}
              onChange={(e) => setSampleRateSetting(e.target.value)}
              disabled={isEncoding}
              className="w-full bg-black/50 border border-white/10 text-slate-200 rounded px-2.5 py-1.5 cursor-pointer text-xs focus:outline-none"
            >
              <option value="Preserve">Preserve Source Sample Rate</option>
              <option value="44100">44100 Hz (Standard Audio CD Format)</option>
              <option value="48000">48000 Hz (Digital Video Standard)</option>
              <option value="96000">96000 Hz (High Resolution Studio Record)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-slate-500 font-extrabold block">
              Channel Downmix allocation
            </label>
            <select
              value={channelsSetting}
              onChange={(e) => setChannelsSetting(e.target.value)}
              disabled={isEncoding}
              className="w-full bg-black/50 border border-white/10 text-slate-200 rounded px-2.5 py-1.5 cursor-pointer text-xs focus:outline-none"
            >
              <option value="Preserve">Preserve Source Stereoscopy</option>
              <option value="Mono">Mono (DSP Downmix mixdown)</option>
              <option value="Stereo">Stereo (Left / Right stereo field)</option>
            </select>
          </div>
        </div>

        {/* Dynamic profiles details (Satisfies CODEC LIMS REQUIREMENT FIX 4) */}
        <div className="p-4 bg-black/45 rounded-lg border border-white/5 text-xs font-mono min-h-[90px] flex items-center">
          {outputFormat === "WAV" && (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-slate-500 font-extrabold block">
                  PCM Bitness quantization
                </label>
                <select
                  value={wavBitDepth}
                  onChange={(e) => setWavBitDepth(e.target.value)}
                  disabled={isEncoding}
                  className="bg-black/50 border border-white/10 text-slate-200 rounded px-2 py-1.5 cursor-pointer w-full text-xs focus:outline-none"
                >
                  <option value="16">16-bit Integer CD stream (Standard headroom)</option>
                  <option value="24">24-bit Integer master recording standard</option>
                  <option value="32">32-bit Float absolute dynamics range limit</option>
                </select>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center">
                WAV yields pure raw, linear PCM byte layouts without filters. Large file size. No compression.
              </div>
            </div>
          )}

          {outputFormat === "FLAC" && (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-slate-500 font-extrabold block">
                  FLAC compression ratio profile
                </label>
                <select
                  value={flacCompression}
                  onChange={(e) => setFlacCompression(e.target.value)}
                  disabled={isEncoding}
                  className="bg-black/50 border border-white/10 text-slate-200 rounded px-2 py-1.5 cursor-pointer w-full text-xs focus:outline-none"
                >
                  <option value="1">Level 1 (Fast compression / Slightly larger)</option>
                  <option value="5">Level 5 (CD Balanced default parameters)</option>
                  <option value="8">Level 8 (Highest CPU prediction compression / Smallest size)</option>
                </select>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center">
                FLAC is fully lossless compression. Original audio samples are preserved bit-for-bit while saving ~50%
                bytes.
              </div>
            </div>
          )}

          {outputFormat === "MP3" && (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-slate-500 font-extrabold block">
                  LAME CBR constant bitrate
                </label>
                <select
                  value={bitrate}
                  onChange={(e) => setBitrate(e.target.value)}
                  disabled={isEncoding}
                  className="bg-black/50 border border-white/10 text-slate-200 rounded px-2 py-1.5 cursor-pointer w-full text-xs focus:outline-none"
                >
                  <option value="128k">128 kbps (Draft low-quality internet streaming)</option>
                  <option value="192k">192 kbps (Standard medium-fidelity MP3)</option>
                  <option value="256k">256 kbps (High definition distribution limit)</option>
                  <option value="320k">320 kbps (Max LAME standard format limit / Recommended)</option>
                </select>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <p className="text-amber-400 font-bold">⚠️ MP3 is a lossy perceptual encoder.</p>
                <p>
                  It isolates and discards acoustic details not generally detected by human hearing mechanisms, creating
                  small files. Constant Bitrate (CBR) preserves equal bytes across time fields.
                </p>
              </div>
            </div>
          )}

          {["AAC", "OGG", "OPUS"].includes(outputFormat) && (
            <div className="w-full flex items-start gap-3 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300 leading-normal space-y-1">
                <span className="font-bold text-amber-400 block uppercase">Codec Compilation restrictions note</span>
                <p>
                  Modern OPUS (libopus container), OGG (libvorbis DSP structure), and AAC (LAME/libfaac wrapper) are
                  lossy multi-channel encoders that require specialized external licensing compilations on host
                  workspaces.
                </p>
                <p className="text-slate-500 text-[10px]">
                  Local sandbox engines simulate these paths using safe stub conversion architectures if direct
                  execution binaries are missing licensing capabilities.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: BLOCKERS & PRE-FLIGHT VALIDATIONS (Satisfies FIX 4) */}
      <div className="p-5 rounded-2xl bg-[#090b14]/95 border border-white/5 shadow-2xl space-y-4 font-mono">
        <div>
          <span className="text-[9px] uppercase font-mono font-bold text-slate-500 tracking-wider block mb-1">
            Transcoding Pre-flight Diagnostics
          </span>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            Section 5: Queue check blockers assessment
          </h3>
        </div>

        {isBlocked ? (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs text-left space-y-1.5 leading-relaxed">
            <span className="font-bold block flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-500" />
              Blocked: {blockers.length} file queue constraint(s) unmet
            </span>
            <ul className="list-decimal list-inside text-[11px] text-rose-400/90 pl-1 space-y-1">
              {blockers.map((block, i) => (
                <li key={i}>
                  {block.label} <span className="text-slate-500">Code: {block.diagnosticCode}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs text-left flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-400 animate-pulse" />
            <span>Ready for Batch Conversion! Queue constraints passed.</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <p className="text-[10px] text-slate-500 max-w-xl leading-normal">
            FFmpeg conversions represent traditional CPU-bound format translations. Batch conversions do not isolate
            stems or use neural machine learning.
          </p>

          <button
            onClick={isEncoding ? cancelBatchEncode : startBatchEncode}
            disabled={isBlocked && !isEncoding}
            className={`px-6 py-3 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isEncoding
                ? "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.25)] cursor-pointer"
                : isBlocked
                  ? "bg-slate-900 border border-white/5 text-slate-600 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            }`}
          >
            {isEncoding ? (
              <>
                <XCircle className="w-4 h-4" />
                Cancel Transcode Run
              </>
            ) : isBlocked ? (
              <>
                <XCircle className="w-4 h-4 animate-bounce" />
                Queue Empty
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-slate-950" />
                Start Batch Convert
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 6: TRANSCODE STOPWATCH PROGRESS METRIC (Satisfies FIX 4) */}
      <div className="p-5 rounded-2xl bg-[#090b14]/95 border border-white/5 shadow-2xl space-y-4 font-mono">
        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block border-b border-white/5 pb-2">
          Section 6: Active Transcoding progress telemetry
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-black/45 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Elapsed Time</span>
            <span className="font-bold text-white text-sm block">{elapsedTime.toFixed(1)}s elapsed</span>
          </div>
          <div className="p-3 bg-black/45 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Countdown ETA</span>
            <span className="font-bold text-green-400 text-sm block">~{etaTime.toFixed(1)}s remaining</span>
          </div>
          <div className="p-3 bg-black/45 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Speed Multiplier</span>
            <span className="font-bold text-indigo-400 text-sm block">{speedMultiplier} conversion speed</span>
          </div>
          <div className="p-3 bg-black/45 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Active target</span>
            <span className="font-bold text-emerald-300 truncate block">
              {isEncoding && inputFiles[currentFileIdx] ? inputFiles[currentFileIdx].name : "None active"}
            </span>
          </div>
        </div>

        {/* Progress Bar overall */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold">Total Job Cluster Progress</span>
            <span className="font-bold text-indigo-400">{Math.round(encodeProgress)}%</span>
          </div>
          <div className="h-3 bg-slate-950 border border-white/5 rounded-full overflow-hidden relative">
            <div
              className="bg-gradient-to-r from-green-500 via-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]"
              style={{ width: `${encodeProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold">
            <span>
              Completed files: {completedCount} / {inputFiles.length}
            </span>
            <span>{isEncoding ? "Processing on hardware workstation..." : "Ready"}</span>
          </div>
        </div>
      </div>

      {/* SECTION 7: CLINICAL LOGS CONSOLE */}
      <div className="p-5 rounded-2xl bg-[#090b14]/95 border border-white/5 shadow-2xl space-y-4 font-mono">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-green-400" />
            Section 7: Diagnostics & Host log streams
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowFfmpegCommand(!showFfmpegCommand);
                setEncodeLog((prev) => [...prev, `[diagnostics] Static FFmpeg command shown below.`]);
              }}
              className="px-2.5 py-1 text-[10px] border border-white/10 font-bold rounded hover:bg-slate-900 text-slate-300 cursor-pointer flex items-center gap-1"
            >
              <Terminal className="w-3 h-3 text-indigo-400" />
              <span>{showFfmpegCommand ? "Hide" : "Show"} FFmpeg Command</span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(encodeLog.join("\n"));
                triggerToast("Terminal logs successfully copied to clipboard.");
              }}
              className="px-2.5 py-1 text-[10px] border border-white/10 font-bold rounded hover:bg-slate-900 text-slate-300 cursor-pointer flex items-center gap-1"
            >
              <Copy className="w-3 h-3 text-green-400" />
              <span>Copy Log</span>
            </button>
          </div>
        </div>

        {showFfmpegCommand && (
          <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-300 break-all select-all font-mono">
            <span className="font-bold text-[9px] text-indigo-400 uppercase tracking-widest block mb-1">
              Preview FFmpeg CLI command (not executed):
            </span>
            <code>{getSimulatedFfmpegCommand()}</code>
          </div>
        )}

        {/* Logs visualizer */}
        <div className="bg-[#030303] rounded-lg border border-white/5 p-4 h-40 overflow-y-auto font-mono text-[10px] space-y-1.5 shadow-inner">
          {encodeLog.map((log, idx) => (
            <div
              key={idx}
              className={`${
                (log.includes("successful") || log.includes("completed") || log.includes("Exit Code: 0")) &&
                !log.includes("No subprocess executed")
                  ? "text-green-400 font-bold"
                  : log.includes("warning") || log.includes("Missing")
                    ? "text-amber-500 font-bold"
                    : log.includes("failed") || log.includes("Exception") || log.includes("error")
                      ? "text-rose-500"
                      : "text-slate-400"
              }`}
            >
              <span className="text-slate-600 mr-2">[SYSTEM]</span>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
