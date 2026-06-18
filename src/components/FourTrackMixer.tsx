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
  Sparkles,
  Download,
  Flame,
  RefreshCcw,
  Merge,
  Info,
  AlertTriangle,
  Sliders,
  Folder,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface StemTrack {
  id: string;
  name: string;
  engine: string;
  icon: React.ElementType;
  color: string;
  intensity: number[]; // mock peak data for waveform visualizer
}

const STEM_TRACKS: StemTrack[] = [
  {
    id: "vocals",
    name: "Vocals Split",
    engine: "Prism-RoFormer vocal extractor",
    icon: Users,
    color: "from-blue-400 to-indigo-500",
    intensity: [
      15, 30, 45, 10, 60, 80, 45, 90, 75, 40, 25, 70, 85, 30, 60, 40, 80, 95,
      20, 50, 65, 30, 45, 20,
    ],
  },
  {
    id: "drums",
    name: "Drums Stem",
    engine: "Demucs-v4 Pro drum separator",
    icon: Drum,
    color: "from-purple-500 to-pink-500",
    intensity: [
      40, 80, 20, 90, 30, 85, 40, 75, 20, 85, 45, 90, 15, 80, 30, 85, 40, 80,
      10, 85, 30, 70, 20, 90,
    ],
  },
  {
    id: "bass",
    name: "Bass Stem",
    engine: "MDX-23C Sub bass filter",
    icon: Guitar,
    color: "from-emerald-400 to-teal-500",
    intensity: [
      60, 40, 50, 70, 40, 60, 80, 50, 40, 60, 70, 50, 40, 50, 80, 40, 60, 70,
      50, 40, 62, 45, 55, 30,
    ],
  },
  {
    id: "other",
    name: "Melody Instrumental",
    engine: "VR spectral background partition",
    icon: Music,
    color: "from-amber-400 to-orange-500",
    intensity: [
      30, 45, 60, 50, 75, 55, 60, 80, 70, 55, 40, 75, 65, 50, 70, 80, 60, 45,
      50, 65, 40, 55, 35, 45,
    ],
  },
];

interface FourTrackMixerProps {
  inputFileName: string;
  separationGoal: string;
  selectedCategory: string;
  selectedModelName: string;
  parameters: string;
}

export default function FourTrackMixer({
  inputFileName,
  separationGoal,
  selectedCategory,
  selectedModelName,
}: FourTrackMixerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(15);
  const [activeSolo, setActiveSolo] = useState<string | null>(null);
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({
    vocals: 85,
    drums: 75,
    bass: 70,
    other: 65,
  });

  // Real controls for Pan & Export Inclusion requested by checklist
  const [pans, setPans] = useState<Record<string, number>>({
    vocals: 0,
    drums: 0,
    bass: 0,
    other: 0,
  });

  const [exportInclusion, setExportInclusion] = useState<Record<string, boolean>>({
    vocals: true,
    drums: true,
    bass: true,
    other: true,
  });

  // Export settings config properties
  const [exportFormat, setExportFormat] = useState("wav_16");
  const [exportDest, setExportDest] = useState("/outputs/stems/mixdown/");
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  // Animation frame for simulation playback & meters
  const [mockMeters, setMockMeters] = useState<Record<string, number>>({
    vocals: 0,
    drums: 0,
    bass: 0,
    other: 0,
  });

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        // Sweep playhead
        setPlayheadPos((prev) => (prev >= 100 ? 0 : prev + 0.8));

        // Let meters bounce realistically!
        setMockMeters(() => {
          const newMeters: Record<string, number> = {};
          STEM_TRACKS.forEach((track) => {
            const isMuted = mutes[track.id];
            const isAnySoloActive = activeSolo !== null;
            const isSoloed = activeSolo === track.id;
            const volumeCoeff = volumes[track.id] / 100;

            if (isMuted || (isAnySoloActive && !isSoloed)) {
              newMeters[track.id] = 0;
            } else {
              // Bouncing DB calculations
              const randVal = Math.floor(Math.random() * 45) + 35;
              newMeters[track.id] = Math.round(randVal * volumeCoeff);
            }
          });
          return newMeters;
        });
      }, 120);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setMockMeters({ vocals: 0, drums: 0, bass: 0, other: 0 });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, mutes, activeSolo, volumes]);

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

  // Convert progress pos to standard display track duration (assume total is 3:12)
  const formatTime = () => {
    const totalSecs = 192; // 3 minutes 12 seconds
    const currentSecs = Math.floor((playheadPos / 100) * totalSecs);
    const mins = Math.floor(currentSecs / 60);
    const secs = currentSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs} / 3:12`;
  };

  // Determine which tracks are outputted based on separation goal
  const renderedTracks = STEM_TRACKS.filter((track) => {
    if (separationGoal === "vocals" && track.id !== "vocals") return false;
    if (separationGoal === "instrumental" && track.id === "vocals")
      return false;
    if (separationGoal === "karaoke") {
      return track.id === "vocals" || track.id === "other";
    }
    return true; // 4stem shows everything
  });

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
                Mixer Mode: Preview-Only / Post-Separation
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-indigo-400" />
              Post-Separation Stem Review & Mixdown
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Provides an interactive environment to review output stems from previous source-separation runs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs font-mono bg-black/40 p-3 rounded-xl border border-white/5 w-full lg:w-auto">
            <div className="min-w-[120px]">
              <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                Stem Source
              </span>
              <span className="font-bold text-slate-200">Original separation run</span>
            </div>
            <div className="border-l border-white/10 pl-3 min-w-[120px]">
              <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                Model Source
              </span>
              <span className="font-bold text-blue-400 truncate max-w-[150px] block">
                {selectedModelName || "Kim_Vocal_2.onnx"}
              </span>
            </div>
            <div className="border-l border-white/10 pl-3 min-w-[120px]">
              <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                Runtime Proof
              </span>
              <span className="font-bold text-rose-400">Not active in mixer</span>
            </div>
            <div className="border-l border-white/10 pl-3 min-w-[120px]">
              <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                Compute Source
              </span>
              <span className="font-bold text-slate-400 text-[10px]">No GPU task in mixer</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-slate-900/40 p-3 rounded-lg border border-slate-800">
          <div>
            <span className="text-slate-500">Separation Input File:</span>
            <span className="text-slate-200 ml-1.5 break-all">{inputFileName || "Original_Track.wav"}</span>
          </div>
          <div>
            <span className="text-slate-500">Loaded Stems Count:</span>
            <span className="text-slate-200 ml-1.5">{renderedTracks.length} tracks active</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: PLAYBACK TIMELINE */}
      <div className="p-4 bg-[#0a0c16]/90 rounded-2xl border border-slate-800 shadow-md space-y-3">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
          Playback Timeline Controls
        </span>

        <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isPlaying
                  ? "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_12px_rgba(79,70,229,0.2)]"
              }`}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>

            {/* Stop Button */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setPlayheadPos(0);
              }}
              className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-all"
              title="Stop and Reset"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            {/* Restart Button */}
            <button
              onClick={() => {
                setPlayheadPos(0);
                setIsPlaying(true);
              }}
              className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-all"
              title="Restart"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-bold text-slate-200 bg-black/50 px-2.5 py-1.5 rounded border border-slate-800 ml-1">
              {formatTime()}
            </span>
          </div>

          {/* Seekbar Slider */}
          <div className="flex-1 w-full relative">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
              {/* Play progress highlight */}
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full rounded-full"
                style={{ width: `${playheadPos}%` }}
              ></div>
              <div className="absolute top-0 bottom-0 left-1/4 w-[1px] bg-white/10"></div>
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/10"></div>
              <div className="absolute top-0 bottom-0 left-3/4 w-[1px] bg-white/10"></div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={playheadPos}
              onChange={(e) => setPlayheadPos(Number(e.target.value))}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: STEM CHANNELS */}
      <div className="space-y-3">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
          Stem Mixing Console Channels
        </span>

        {renderedTracks.map((track) => {
          const volume = volumes[track.id];
          const pan = pans[track.id];
          const isMuted = mutes[track.id];
          const isAnySoloActive = activeSolo !== null;
          const isSoloed = activeSolo === track.id;

          // Determine if track audio is fundamentally silent based on mutes and solo overlays
          const isSilent = isMuted || (isAnySoloActive && !isSoloed);
          const isClipping = !isSilent && volume > 90;

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
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      id={`export-${track.id}`}
                      checked={exportInclusion[track.id]}
                      onChange={() => handleExportToggle(track.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded bg-gradient-to-br ${track.color} text-white flex items-center justify-center shrink-0`}>
                        <track.icon className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-white truncate font-mono">
                        {track.name}
                      </h4>
                    </div>

                    <div className="mt-1.5 space-y-0.5 text-[9px] font-mono text-slate-500 leading-tight">
                      <div>
                        <span className="text-slate-600 font-bold">Base Engine:</span> {track.engine}
                      </div>
                      <div>
                        <span className="text-slate-600 font-bold">Original model mapping:</span> {selectedModelName || "Kim_Vocal_2.onnx"}
                      </div>
                      <div>
                        <span className="text-slate-600 font-bold">File status:</span> <span className="text-emerald-500">Active / Loaded</span>
                      </div>
                      <div className="truncate text-slate-600" title={`/outputs/stems/${selectedModelName || "Kim_Vocal_2"}_${track.id}.wav`}>
                        File: .../{selectedModelName || "Kim_Vocal_2"}_{track.id}.wav
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Waveform Preview & Meters (Col 4-6) */}
                <div className="xl:col-span-4 flex items-center gap-3">
                  {/* Peak meter with CLIPPING warning */}
                  <div className="flex flex-col items-center justify-center w-11 shrink-0">
                    <div className="w-10 h-7 bg-black/45 rounded border border-slate-800 p-0.5 flex flex-col justify-end overflow-hidden">
                      <div className="flex justify-between items-end gap-[1px] h-full">
                        {Array.from({ length: 8 }).map((_, segmentIndex) => {
                          const meterDb = mockMeters[track.id] || 0;
                          const segmentThreshold = (segmentIndex + 1) * 12.5;
                          const isActive = meterDb >= segmentThreshold;

                          return (
                            <div
                              key={segmentIndex}
                              style={{
                                height: `${(segmentIndex + 1) * 12.5}%`,
                                backgroundColor: isSilent
                                  ? "rgba(255,255,255,0.03)"
                                  : isActive
                                    ? segmentIndex > 5
                                      ? "#ef4444" 
                                      : segmentIndex > 4
                                        ? "#f59e0b" 
                                        : "#10b981" 
                                    : "rgba(255,255,255,0.03)",
                              }}
                              className="w-1 rounded-sm"
                            />
                          );
                        })}
                      </div>
                    </div>
                    {isClipping ? (
                      <span className="text-[8px] font-mono font-bold text-rose-500 animate-pulse mt-0.5">
                        CLIP
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono text-slate-600 mt-0.5 uppercase">
                        {isSilent ? "Idle" : "Signal"}
                      </span>
                    )}
                  </div>

                  {/* Waveform graphic */}
                  <div className="flex-1 h-9 bg-black/50 rounded-lg relative overflow-hidden border border-slate-900 flex items-center px-1 gap-[1px]">
                    {track.intensity.map((height, i) => {
                      const waveIndexPos = (i / track.intensity.length) * 100;
                      const isPassed = playheadPos >= waveIndexPos;
                      const activeBg = isSilent
                        ? "bg-slate-800/30"
                        : isPassed
                          ? "bg-gradient-to-t " + track.color
                          : "bg-slate-700/30";

                      return (
                        <div
                          key={i}
                          style={{ height: `${height}%` }}
                          className={`flex-1 rounded-sm transition-all duration-300 ${activeBg}`}
                        />
                      );
                    })}
                    {isPlaying && (
                      <div
                        className="absolute top-0 bottom-0 w-[1.5px] bg-white/80 pointer-events-none transition-all duration-100"
                        style={{ left: `${playheadPos}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* 3. Audio Console Controls [Volume/Pan/Mute/Solo] (Col 7-12) */}
                <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Volume Slider (4 cols) */}
                  <div className="sm:col-span-5 space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                      <span>VOLUME</span>
                      <span className="font-bold text-slate-300">{isMuted ? "MUTE" : `${volume}%`}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded border border-slate-900">
                      <button
                        onClick={() => handleVolumeChange(track.id, volume === 0 ? 80 : 0)}
                        className="text-slate-500 hover:text-white transition-all focus:outline-none"
                      >
                        {volume === 0 || isMuted ? (
                          <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(track.id, Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-full cursor-pointer appearance-none outline-none accent-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Pan Slider (4 cols) - L-C-R slider */}
                  <div className="sm:col-span-4 space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                      <span>PANNING</span>
                      <span className="text-amber-500 font-bold hover:underline cursor-help" title="Unwired preview feature">
                        {pan === 0 ? "C" : pan < 0 ? `L${Math.abs(pan)}` : `R${pan}`}
                      </span>
                    </div>
                    <div className="bg-black/20 p-1.5 rounded border border-slate-900 flex items-center">
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="5"
                        value={pan}
                        onChange={(e) => handlePanChange(track.id, Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-full cursor-pointer appearance-none outline-none accent-indigo-500"
                      />
                    </div>
                    <p className="text-[8px] font-mono text-slate-600 text-center uppercase tracking-wider">
                      Preview-only / Not wired
                    </p>
                  </div>

                  {/* Mute / Solo Buttons (3 cols) */}
                  <div className="sm:col-span-3 flex gap-1 justify-end">
                    <button
                      onClick={() => handleMuteToggle(track.id)}
                      className={`flex-1 sm:flex-none px-2 py-1.5 rounded text-[9px] font-bold tracking-wider uppercase transition-all border ${
                        isMuted
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/35"
                          : "bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      Mute
                    </button>
                    <button
                      onClick={() => handleSoloToggle(track.id)}
                      className={`flex-1 sm:flex-none px-2 py-1.5 rounded text-[9px] font-bold tracking-wider uppercase transition-all border ${
                        isSoloed
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/35"
                          : "bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      Solo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
              Attempts to reduce overlapping bleed between stems. Results vary and may introduce phase artifacts.
            </p>
            <span className="text-blue-400 font-mono text-[10px] bg-blue-950/20 px-2 py-0.5 rounded border border-blue-950/40 block w-max">
              Phase Invert: 180° — Legacy reference / Not wired
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-1.5">
            <label className="text-slate-300 font-bold block text-[10px] uppercase font-mono tracking-wider">
              High-Frequency Trim
            </label>
            <p className="text-[11px] text-slate-500 leading-normal">
              Reduces very high-frequency artifacts above the selected cutoff using a low-pass filter. Removes content above the cutoff. May reduce brightness.
            </p>
            <span className="text-purple-300 font-mono text-[10px] bg-purple-950/20 px-2 py-0.5 rounded border border-purple-950/40 block w-max">
              Cutoff: 16.5 kHz — Planned / Not active
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded border border-slate-900 space-y-1.5">
            <label className="text-slate-300 font-bold block text-[10px] uppercase font-mono tracking-wider">
              Playback / Export Normalization
            </label>
            <p className="text-[11px] text-slate-500 leading-normal">
              Balances stem loudness for preview or export. This does not improve AI separation quality. Affects preview playback only.
            </p>
            <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-950/40 block w-max">
              Loudness Normalizer — Planned / Not active
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 5: EXPORT MIXDOWN */}
      <div className="p-4 rounded-xl bg-[#090b14]/90 border border-slate-800 shadow-md space-y-4">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider block">
          Section 5: Export Mixdown Configuration
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* Format */}
          <div className="space-y-1.5">
            <label className="text-slate-400 block text-[10px] uppercase font-bold">
              Output Render Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full bg-black/50 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
            >
              <option value="wav_16">WAV 16-bit Lossless (Original quality)</option>
              <option value="wav_24">WAV 24-bit Lossless (High headroom)</option>
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
                value={exportDest}
                onChange={(e) => setExportDest(e.target.value)}
                className="flex-1 bg-black/50 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
              />
              <button
                className="px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded"
                onClick={() => alert("Browse folder dialog is simulated in help utility.")}
              >
                <Folder className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Toggle */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer select-none py-2 text-slate-300">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
              />
              <span>Overwrite existing files</span>
            </label>
          </div>
        </div>

        {/* Stem Inclusion summary */}
        <div className="p-3 rounded bg-black/25 border border-slate-900 text-[11px] font-mono text-slate-400 space-y-1">
          <div>
            <span className="font-bold text-slate-300">Included Stems in Mixdown:</span>{" "}
            {renderedTracks.filter(t => exportInclusion[t.id]).map(t => t.name).join(", ") || "(None selected)"}
          </div>
          <div className="text-[10px] text-rose-400 flex items-center gap-1.5 font-bold pt-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Export Blocker: Mixer is in simulation mode / Exporter Planned / Not active</span>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            disabled
            className="w-full md:w-auto px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-500 rounded-xl text-xs font-bold font-mono cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export Mixdown — Planned / Not active
          </button>
        </div>
      </div>

      {/* SECTION 6: WARNINGS / LIMITATIONS */}
      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-2 text-xs leading-normal">
        <span className="text-[10px] font-mono text-amber-500 font-bold block flex items-center gap-1.5 uppercase">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          Section 6: Audio Separation Integrity Disclaimer
        </span>
        <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
          <li>
            <strong className="text-slate-300 font-semibold font-mono">Stems are not perfect originals:</strong> Source-separation splits mathematical frequency bands. Isolated vocals may feature wateriness or metallic phase artifacts.
          </li>
          <li>
            <strong className="text-slate-300 font-semibold font-mono">Model and Song dependency:</strong> Bleed and separation clarity depend highly on mixing density, instrumentation overlap, reverb profiles, and selected models.
          </li>
          <li>
            <strong className="text-slate-300 font-semibold font-mono">Phase and Trim can degrade audio:</strong> Passive Phase Inversion and Treble filters are analytical helpers only and can easily degrade frequency richness if used aggressively.
          </li>
          <li>
            <strong className="text-slate-300 font-semibold font-mono">Hardware Acceleration boundaries:</strong> CUDA/DirectML GPU acceleration is supported for separation jobs, but hardware acceleration plays no part in local web browser mixer previews.
          </li>
        </ul>
      </div>
    </div>
  );
}
