import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Radio,
  Music,
  Users,
  Drum,
  Guitar,
  Download,
  RefreshCcw,
  AlertTriangle,
  Folder,
  XCircle,
} from "lucide-react";

export interface LoadedStem {
  id: string;
  name: string;
  stemType: "vocals" | "drums" | "bass" | "other" | "instrumental" | "custom";
  filePath: string;
  fileExists: boolean;
  fileSizeBytes?: number;
  durationSeconds?: number;
  sourceModel?: string;
  sourceEngine?: string;
  waveformPeaks?: number[];
  peakDataSource?: "real" | "placeholder" | "not_loaded";
  isDemo?: boolean;
  canPlay?: boolean;
  canExport?: boolean;
  proofSource?: "real_separation_output" | "demo" | "placeholder" | "unknown";
}

const DEMO_STEMS: LoadedStem[] = [
  {
    id: "vocals",
    name: "Vocals Split (Demo)",
    stemType: "vocals",
    filePath: "",
    fileExists: false,
    fileSizeBytes: 2048500,
    durationSeconds: 192,
    sourceModel: "Demo Model v4",
    sourceEngine: "Prism-RoFormer vocal extractor",
    waveformPeaks: [
      15, 30, 45, 10, 60, 80, 45, 90, 75, 40, 25, 70, 85, 30, 60, 40, 80, 95,
      20, 50, 65, 30, 45, 20,
    ],
    peakDataSource: "placeholder",
    isDemo: true,
    canPlay: false,
    canExport: false,
    proofSource: "demo",
  },
  {
    id: "drums",
    name: "Drums Stem (Demo)",
    stemType: "drums",
    filePath: "",
    fileExists: false,
    fileSizeBytes: 4194304,
    durationSeconds: 192,
    sourceModel: "Demo Model v4",
    sourceEngine: "Demucs-v4 Pro drum separator",
    waveformPeaks: [
      40, 80, 20, 90, 30, 85, 40, 75, 20, 85, 45, 90, 15, 80, 30, 85, 40, 80,
      10, 85, 30, 70, 20, 90,
    ],
    peakDataSource: "placeholder",
    isDemo: true,
    canPlay: false,
    canExport: false,
    proofSource: "demo",
  },
  {
    id: "bass",
    name: "Bass Stem (Demo)",
    stemType: "bass",
    filePath: "",
    fileExists: false,
    fileSizeBytes: 3048500,
    durationSeconds: 192,
    sourceModel: "Demo Model v4",
    sourceEngine: "MDX-23C Sub bass filter",
    waveformPeaks: [
      60, 40, 50, 70, 40, 60, 80, 50, 40, 60, 70, 50, 40, 50, 80, 40, 60, 70,
      50, 40, 62, 45, 55, 30,
    ],
    peakDataSource: "placeholder",
    isDemo: true,
    canPlay: false,
    canExport: false,
    proofSource: "demo",
  },
  {
    id: "other",
    name: "Melody Instrumental (Demo)",
    stemType: "other",
    filePath: "",
    fileExists: false,
    fileSizeBytes: 5242880,
    durationSeconds: 192,
    sourceModel: "Demo Model v4",
    sourceEngine: "VR spectral background partition",
    waveformPeaks: [
      30, 45, 60, 50, 75, 55, 60, 80, 70, 55, 40, 75, 65, 50, 70, 80, 60, 45,
      50, 65, 40, 55, 35, 45,
    ],
    peakDataSource: "placeholder",
    isDemo: true,
    canPlay: false,
    canExport: false,
    proofSource: "demo",
  },
];

const getIconForStemType = (stemType: string) => {
  switch (stemType) {
    case "vocals":
      return Users;
    case "drums":
      return Drum;
    case "bass":
      return Guitar;
    case "other":
    case "instrumental":
      return Music;
    default:
      return Music;
  }
};

const getColorForStemType = (stemType: string) => {
  switch (stemType) {
    case "vocals":
      return "from-blue-400 to-indigo-500";
    case "drums":
      return "from-purple-500 to-pink-500";
    case "bass":
      return "from-emerald-400 to-teal-500";
    case "other":
    case "instrumental":
      return "from-amber-400 to-orange-500";
    default:
      return "from-slate-400 to-slate-500";
  }
};

interface FourTrackMixerProps {
  inputFileName: string;
  separationGoal: string;
  selectedCategory: string;
  selectedModelName: string;
  parameters?: string;
  loadedStems?: LoadedStem[];
  jobId?: string;
}

export default function FourTrackMixer({
  inputFileName,
  separationGoal,
  selectedCategory,
  selectedModelName,
  parameters,
  loadedStems,
  jobId,
}: FourTrackMixerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos] = useState(0);
  const [activeSolo, setActiveSolo] = useState<string | null>(null);
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [pans, setPans] = useState<Record<string, number>>({});
  const [exportInclusion, setExportInclusion] = useState<Record<string, boolean>>({});

  const [exportFormat, setExportFormat] = useState("wav_16");
  const [exportDest, setExportDest] = useState("");
  const [overwriteBehavior, setOverwriteBehavior] = useState<"ask" | "skip" | "replace">("ask");

  const [useDemo, setUseDemo] = useState(false);
  const [verifiedFiles, setVerifiedFiles] = useState<Record<string, {
    exists: boolean;
    sizeBytes: number;
    extension: string;
    isAudio: boolean;
    durationSeconds?: number;
  }>>({});

  const timerRef = useRef<number | null>(null);

  const stemsToUse = loadedStems && loadedStems.length > 0
    ? loadedStems
    : (useDemo ? DEMO_STEMS : []);

  useEffect(() => {
    // Playback is NOT wired
    if (isPlaying) {
      setIsPlaying(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    const verifyFiles = async () => {
      const bridge = (window as any).uvr;
      const newVerified: typeof verifiedFiles = {};
      for (const track of stemsToUse) {
        if (track.filePath && !track.isDemo) {
          if (bridge && typeof bridge.verifyAudioFile === "function") {
            try {
              const res = await bridge.verifyAudioFile(track.filePath);
              if (res) {
                newVerified[track.id] = {
                  exists: !!res.exists,
                  sizeBytes: Number(res.sizeBytes || 0),
                  extension: String(res.extension || ""),
                  isAudio: !!res.isAudio,
                  durationSeconds: res.durationSeconds,
                };
              }
            } catch (e) {
              console.error("Verification failed for path:", track.filePath, e);
            }
          }
        }
      }
      setVerifiedFiles(newVerified);
    };
    verifyFiles();
  }, [stemsToUse]);

  const handleMuteToggle = (id: string) => {
    setMutes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSoloToggle = (id: string) => {
    setActiveSolo((prev) => (prev === id ? null : id));
  };

  const handleVolumeChange = (id: string, value: number) => {
    setVolumes((prev) => ({ ...prev, [id]: value }));
  };

  const handlePanChange = (id: string, value: number) => {
    setPans((prev) => ({ ...prev, [id]: value }));
  };

  const handleExportToggle = (id: string) => {
    setExportInclusion((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatTime = () => {
    const durationSecs = stemsToUse.find(t => t.durationSeconds)?.durationSeconds;
    if (durationSecs === undefined || durationSecs <= 0) {
      return "Duration not checked";
    }
    const mins = Math.floor(durationSecs / 60);
    const secs = durationSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const renderedTracks = stemsToUse.filter((track) => {
    if (separationGoal === "vocals" && track.stemType !== "vocals") return false;
    if (separationGoal === "instrumental" && track.stemType === "vocals") return false;
    if (separationGoal === "karaoke") {
      return track.stemType === "vocals" || track.stemType === "instrumental" || track.stemType === "other";
    }
    return true; // 4stem shows everything
  });

  const isExporterImplemented = false;
  const outputFolderSelected = exportDest.trim() !== "";
  const isOutputFolderWritable = false;

  const activeVerifiedStemsCount = stemsToUse.filter((track) => {
    if (track.isDemo) return false;
    if (!track.filePath) return false;
    if (verifiedFiles[track.id]) {
      return verifiedFiles[track.id].exists && verifiedFiles[track.id].isAudio;
    }
    return track.fileExists === true;
  }).length;

  const anyMissingStems = stemsToUse.length === 0 || stemsToUse.some(track => {
    if (track.isDemo) return true;
    if (!track.filePath) return true;
    if (verifiedFiles[track.id]) {
      return !verifiedFiles[track.id].exists;
    }
    return track.fileExists !== true;
  });

  const blockers: string[] = [];
  blockers.push("Exporter backend not implemented.");
  if (stemsToUse.length === 0) {
    blockers.push("No stem session loaded.");
  } else if (activeVerifiedStemsCount === 0) {
    blockers.push("No verified local stems loaded.");
  }
  if (!outputFolderSelected) {
    blockers.push("Output folder not selected.");
  } else if (!isOutputFolderWritable) {
    blockers.push("Output folder write permission verification pending / not writable.");
  }
  if (anyMissingStems) {
    blockers.push("One or more missing stem files detected (cannot export demo or unverified stems).");
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1: LOADED STEM SESSION */}
      <div className="p-5 rounded-2xl bg-[#090b14]/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                Stem Mixer Workspace
              </span>
              <span className="text-[10px] font-mono font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Mixer Mode: {stemsToUse.length === 0 ? "No verified stem session loaded" : useDemo ? "Demo Preview Only" : "Verified Stem Session Loaded"}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-indigo-400" />
              Post-Separation Stem Review & Mixdown
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Reviews verified output stems from previous local separation runs. Demo stems are preview-only and cannot be exported.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setUseDemo(!useDemo)}
              disabled={!!(loadedStems && loadedStems.length > 0)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition-colors ${
                loadedStems && loadedStems.length > 0
                  ? "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed"
                  : useDemo
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {useDemo ? "Disable Sandbox Demo Stems" : "Enable Sandbox Demo Stems"}
            </button>
          </div>
        </div>

        {/* PROOF & SOURCE CARD */}
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
              AI Proof & Separation Metadata
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              Job ID: {jobId || "No active job context"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-0.5">
                Stem Source / Type
              </span>
              <span className={`font-bold ${useDemo ? "text-amber-500" : stemsToUse.length > 0 ? "text-emerald-500" : "text-rose-400"}`}>
                {stemsToUse.length === 0 ? "No verified stem session loaded" : useDemo ? "Preview-only demo stems" : "Verified local AI output"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-0.5">
                Model Source
              </span>
              <span className="font-bold text-blue-400 truncate max-w-[170px] block">
                {selectedModelName || "Model not reported"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-0.5">
                Separation Category
              </span>
              <span className="font-bold text-purple-400">
                {selectedCategory || "Not reported"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-0.5">
                Compute Source
              </span>
              <span className="font-bold text-slate-400 text-[10px]">
                No GPU task active in mixer
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 italic mt-1 leading-normal">
            * Hardware GPU acceleration is strictly confined to backend job processing; browser playback and mixdown utilize zero GPU resources.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-slate-900/40 p-3 rounded-lg border border-slate-800">
          <div>
            <span className="text-slate-500">Separation Input File:</span>
            <span className="text-slate-200 ml-1.5 break-all">{inputFileName || "Input file not reported"}</span>
          </div>
          <div>
            <span className="text-slate-500">Loaded Stems Count:</span>
            <span className="text-slate-200 ml-1.5">
              {stemsToUse.length === 0 ? "0 (No stems)" : `${renderedTracks.length} tracks active`}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: PLAYBACK TIMELINE */}
      <div className="p-4 bg-[#0a0c16]/90 rounded-2xl border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
            Playback Timeline Controls
          </span>
          <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/10 px-2.5 py-1 rounded border border-rose-900/20">
            Playback preview not wired in custom electron mixer (planned feature)
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 justify-between opacity-50 pointer-events-none">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              disabled
              className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 text-slate-500 cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-current translate-x-0.5" />
            </button>

            {/* Stop Button */}
            <button
              disabled
              className="w-10 h-10 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center cursor-not-allowed"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            {/* Restart Button */}
            <button
              disabled
              className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center cursor-not-allowed"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-bold text-slate-500 bg-black/50 px-2.5 py-1.5 rounded border border-slate-800 ml-1">
              {formatTime()}
            </span>
          </div>

          {/* Seekbar Slider */}
          <div className="flex-1 w-full relative">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
              <div
                className="bg-slate-700 h-full rounded-full"
                style={{ width: `0%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: STEM CHANNELS */}
      <div className="space-y-3">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
          Stem Mixing Console Channels
        </span>

        {renderedTracks.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-900/10 border border-slate-800/50 text-slate-500 text-xs font-mono">
            No active stems loaded or visible for this separation goal.
          </div>
        ) : (
          renderedTracks.map((track) => {
            const volume = volumes[track.id] !== undefined ? volumes[track.id] : 75;
            const pan = pans[track.id] !== undefined ? pans[track.id] : 0;
            const isMuted = mutes[track.id] || false;
            const isAnySoloActive = activeSolo !== null;
            const isSoloed = activeSolo === track.id;

            // Determine if track audio is fundamentally silent based on mutes and solo overlays
            const isSilent = isMuted || (isAnySoloActive && !isSoloed);

            const isDemoOrMissing = track.isDemo || (verifiedFiles[track.id] ? !verifiedFiles[track.id].exists : !track.fileExists);
            const isExportChecked = !isDemoOrMissing && (exportInclusion[track.id] !== undefined ? exportInclusion[track.id] : true);

            // File status label/color
            let fileStatusLabel = "";
            let fileStatusColor = "";
            let resolvedFilePath = "";

            if (track.isDemo) {
              fileStatusLabel = "(Demo) Sandbox Preview";
              fileStatusColor = "text-amber-500";
              resolvedFilePath = "File: (Demo Mode - No local file)";
            } else {
              const checked = verifiedFiles[track.id];
              if (checked && checked.exists) {
                fileStatusLabel = "Verified Local Audio";
                fileStatusColor = "text-emerald-500";
                resolvedFilePath = `File: ${track.filePath}`;
              } else {
                fileStatusLabel = "File missing / unverified";
                fileStatusColor = "text-rose-400";
                resolvedFilePath = `File: Not loaded / no verified local path`;
              }
            }

            return (
              <div
                key={track.id}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  isSilent
                    ? "bg-black/20 border-slate-900 opacity-60"
                    : "bg-[#0c0e1a] border-slate-800 hover:border-slate-700 shadow-md"
                }`}
              >
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
                  {/* 1. Track Metadata Info (Col 1-3) */}
                  <div className="xl:col-span-3 flex items-start gap-3">
                    {/* Export inclusion checkbox */}
                    <div className="mt-1" title={isDemoOrMissing ? "Cannot export demo or missing/unverified stems" : "Include in Export mixdown"}>
                      <input
                        type="checkbox"
                        id={`export-${track.id}`}
                        checked={isExportChecked}
                        disabled={isDemoOrMissing}
                        onChange={() => handleExportToggle(track.id)}
                        className={`w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500 ${isDemoOrMissing ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-6 h-6 rounded bg-gradient-to-br ${getColorForStemType(track.stemType)} text-white flex items-center justify-center shrink-0`}>
                          {React.createElement(getIconForStemType(track.stemType), { className: "w-3.5 h-3.5" })}
                        </div>
                        <h4 className="text-xs font-bold text-white truncate font-mono">
                          {track.name}
                        </h4>
                      </div>

                      <div className="mt-1.5 space-y-0.5 text-[9px] font-mono text-slate-500 leading-tight">
                        <div>
                          <span className="text-slate-600 font-bold">Base Engine:</span> {track.sourceEngine || "No source engine reported"}
                        </div>
                        <div>
                          <span className="text-slate-600 font-bold">Original model mapping:</span> {track.sourceModel || selectedModelName || "Model not reported"}
                        </div>
                        <div>
                          <span className="text-slate-600 font-bold">File status:</span> <span className={`${fileStatusColor} font-semibold`}>{fileStatusLabel}</span>
                        </div>
                        <div className="truncate text-slate-600" title={resolvedFilePath}>
                          {resolvedFilePath}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Waveform Preview & Meters (Col 4-6) */}
                  <div className="xl:col-span-4 flex items-center gap-3">
                    {/* Inactive Peak meter */}
                    <div className="flex flex-col items-center justify-center w-11 shrink-0">
                      <div className="w-10 h-7 bg-black/45 rounded border border-slate-800 p-0.5 flex flex-col justify-end overflow-hidden">
                        <div className="flex justify-between items-end gap-[1px] h-full opacity-30">
                          {Array.from({ length: 8 }).map((_, segmentIndex) => {
                            return (
                              <div
                                key={segmentIndex}
                                style={{
                                  height: `${(segmentIndex + 1) * 12.5}%`,
                                  backgroundColor: "rgba(255,255,255,0.05)",
                                }}
                                className="w-1 rounded-sm"
                              />
                            );
                          })}
                        </div>
                      </div>
                      <span className="text-[7px] font-mono text-slate-600 mt-1 uppercase text-center block leading-none">
                        Meter Inactive
                      </span>
                    </div>

                    {/* Waveform graphic */}
                    <div className="flex-1 h-9 bg-black/50 rounded-lg relative overflow-hidden border border-slate-900 flex items-center justify-center px-1">
                      {track.waveformPeaks && track.waveformPeaks.length > 0 ? (
                        <div className="w-full h-full flex items-center gap-[1px]">
                          {track.waveformPeaks.map((height, i) => {
                            const activeBg = isSilent
                              ? "bg-slate-850"
                              : "bg-gradient-to-t " + getColorForStemType(track.stemType);

                            return (
                              <div
                                key={i}
                                style={{ height: `${height}%` }}
                                className={`flex-1 rounded-sm transition-all duration-300 ${activeBg}`}
                              />
                            );
                          })}
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                            <span className="text-[7.5px] font-mono font-bold tracking-wider text-slate-400 bg-slate-950/90 px-1 py-0.5 rounded border border-white/5 uppercase">
                              Demo Static Peaks
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] font-mono text-slate-500 italic block text-center leading-none">
                          Waveform preview unavailable for unverified file
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3. Audio Console Controls [Volume/Pan/Mute/Solo] (Col 7-12) */}
                  <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Volume Slider */}
                    <div className="sm:col-span-5 space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 font-bold">
                        <span>VOLUME</span>
                        <span className="text-slate-300">{isMuted ? "MUTE" : `${volume}%`}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded border border-slate-900 opacity-50 cursor-not-allowed">
                        <button disabled className="text-slate-600 focus:outline-none shrink-0">
                          <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <input
                          type="range"
                          disabled
                          min="0"
                          max="100"
                          step="5"
                          value={isMuted ? 0 : volume}
                          className="w-full h-1 bg-slate-800 rounded-full cursor-not-allowed appearance-none accent-indigo-500"
                        />
                      </div>
                      <p className="text-[8px] font-mono text-slate-600 text-center uppercase tracking-wider leading-none">
                        Preview control not wired
                      </p>
                    </div>

                    {/* Pan Slider */}
                    <div className="sm:col-span-4 space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 font-bold">
                        <span>PANNING</span>
                        <span className="text-slate-400">
                          {pan === 0 ? "C" : pan < 0 ? `L${Math.abs(pan)}` : `R${pan}`}
                        </span>
                      </div>
                      <div className="bg-black/20 p-1.5 rounded border border-slate-900 flex items-center opacity-50 cursor-not-allowed">
                        <input
                          type="range"
                          disabled
                          min="-50"
                          max="50"
                          step="5"
                          value={pan}
                          className="w-full h-1 bg-slate-800 rounded-full cursor-not-allowed appearance-none accent-indigo-500"
                        />
                      </div>
                      <p className="text-[8px] font-mono text-slate-600 text-center uppercase tracking-wider leading-none">
                        Preview-only / Not wired
                      </p>
                    </div>

                    {/* Mute / Solo Buttons */}
                    <div className="sm:col-span-3 flex gap-1 justify-end opacity-50 cursor-not-allowed">
                      <button
                        disabled
                        className="flex-1 sm:flex-none px-2 py-1.5 rounded text-[9px] font-bold tracking-wider uppercase transition-all border bg-slate-950 text-slate-600 border-slate-900"
                      >
                        Mute
                      </button>
                      <button
                        disabled
                        className="flex-1 sm:flex-none px-2 py-1.5 rounded text-[9px] font-bold tracking-wider uppercase transition-all border bg-slate-950 text-slate-600 border-slate-900"
                      >
                        Solo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SECTION 4: MIX PROCESSING */}
      <div className="p-4 rounded-xl bg-[#090b14]/90 border border-slate-800 shadow-md space-y-4">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
          Mix Post-Processing Engine Guidelines
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-1.5">
            <label className="text-slate-300 font-bold block text-[10px] uppercase font-mono tracking-wider">
              Phase Cancellation / Bleed Reduction
            </label>
            <p className="text-[11px] text-slate-500 leading-normal">
              Attempts to cancel overlapping bleed frequencies between adjacent stems using adaptive isolation models (not a simple 180° static phase inversion). Results vary and may introduce structural frequency comb filters or phase artifacts.
            </p>
            <span className="text-slate-500 font-mono text-[10px] bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800 block w-max mt-auto">
              Passive Isolation — Legacy reference / Not wired
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-1.5 flex flex-col justify-between">
            <div>
              <label className="text-slate-300 font-bold block text-[10px] uppercase font-mono tracking-wider">
                High-Frequency Trim
              </label>
              <p className="text-[11px] text-slate-500 leading-normal">
                Reduces very high-frequency artifacts above the selected cutoff using a low-pass filter. Removes content above the cutoff. May reduce brightness.
              </p>
            </div>
            <span className="text-purple-400/80 font-mono text-[10px] bg-purple-950/20 px-2 py-0.5 rounded border border-purple-900/30 block w-max">
              Cutoff: 16.5 kHz — Planned / Not active
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-1.5 flex flex-col justify-between">
            <div>
              <label className="text-slate-300 font-bold block text-[10px] uppercase font-mono tracking-wider">
                Playback / Export Normalization
              </label>
              <p className="text-[11px] text-slate-500 leading-normal">
                Balances stem loudness for preview or export. This does not improve AI separation quality. Affects preview playback only.
              </p>
            </div>
            <span className="text-emerald-400/80 font-mono text-[10px] bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30 block w-max">
              Loudness Normalizer — Planned / Not active
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 5: EXPORT MIXDOWN */}
      <div className="p-4 rounded-xl bg-[#090b14]/90 border border-slate-800 shadow-md space-y-4">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
          Section 5: Export Mixdown Configuration (Exporter Disabled)
        </span>

        {/* Real Preflight Blocker Alert Container */}
        {blockers.length > 0 && (
          <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-rose-400 font-mono flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Required Export Preflight Blockers ({blockers.length})
            </span>
            <ul className="list-disc list-inside font-mono text-[10.5px] text-rose-300/80 space-y-0.5 pl-1.5">
              {blockers.map((blocker, idx) => (
                <li key={idx}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono opacity-50">
          {/* Format */}
          <div className="space-y-1.5">
            <label className="text-slate-400 block text-[10px] uppercase font-bold">
              Output Render Format
            </label>
            <select
              disabled
              value={exportFormat}
              className="w-full bg-black/50 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed"
            >
              <option value="wav_16">WAV 16-bit Lossless (Original quality)</option>
              <option value="flac">FLAC Lossless (Compressed WAV)</option>
              <option value="mp3">MP3 320kbps (Compact sharing)</option>
            </select>
          </div>

          {/* Dest */}
          <div className="space-y-1.5">
            <label className="text-slate-400 block text-[10px] uppercase font-bold">
              Destination Folder Path
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                disabled
                placeholder="Export folder not selected"
                value={exportDest}
                className="flex-1 bg-black/50 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-500 font-mono cursor-not-allowed"
              />
              <button
                disabled
                className="px-2.5 bg-slate-800 border border-slate-800 text-slate-500 rounded cursor-not-allowed"
              >
                <Folder className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Overwrite Safety Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-400 block text-[10px] uppercase font-bold">
              Conflict Overwrite Safety
            </label>
            <select
              disabled
              value={overwriteBehavior}
              className="w-full bg-black/50 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed"
            >
              <option value="ask">Ask behavior (Safest / prompt confirmation)</option>
              <option value="skip">Skip files already present</option>
              <option value="replace">Silent replace (Overwrite)</option>
            </select>
          </div>
        </div>

        {/* Stem Inclusion summary */}
        <div className="p-3 rounded bg-black/25 border border-slate-900 text-[11px] font-mono text-slate-400 space-y-1">
          <div>
            <span className="font-bold text-slate-300">Queued Stems for Mixdown:</span>{" "}
            {stemsToUse.filter(t => !t.isDemo && (verifiedFiles[t.id] ? verifiedFiles[t.id].exists : t.fileExists) && exportInclusion[t.id] !== false).map(t => t.name).join(", ") || "(No verified real stems selected)"}
          </div>
          <div className="text-[10px] text-rose-450 flex items-center gap-1.5 font-bold pt-1">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Mixdown Exporter Engine — Planned / Not active</span>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            disabled
            className="w-full md:w-auto px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-600 rounded-xl text-xs font-bold font-mono cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Export Mixdown — Planned / Not active
          </button>
        </div>
      </div>

    </div>
  );
}
