import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StemTrack {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  intensity: number[]; // mock peak data for waveform visualizer
}

const STEM_TRACKS: StemTrack[] = [
  {
    id: "vocals",
    name: "Vocals Split (Prism-Roformer)",
    icon: Users,
    color: "from-blue-400 to-indigo-500",
    intensity: [
      15, 30, 45, 10, 60, 80, 45, 90, 75, 40, 25, 70, 85, 30, 60, 40, 80, 95,
      20, 50, 65, 30, 45, 20,
    ],
  },
  {
    id: "drums",
    name: "Drums Stem (Demucs-v4 Pro)",
    icon: Drum,
    color: "from-purple-500 to-pink-500",
    intensity: [
      40, 80, 20, 90, 30, 85, 40, 75, 20, 85, 45, 90, 15, 80, 30, 85, 40, 80,
      10, 85, 30, 70, 20, 90,
    ],
  },
  {
    id: "bass",
    name: "Bass Stem (MDX-23C Sub)",
    icon: Guitar,
    color: "from-emerald-400 to-teal-500",
    intensity: [
      60, 40, 50, 70, 40, 60, 80, 50, 40, 60, 70, 50, 40, 50, 80, 40, 60, 70,
      50, 40, 62, 45, 55, 30,
    ],
  },
  {
    id: "other",
    name: "Other / Melody Instrumental",
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
  parameters,
}: FourTrackMixerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(15); // Percentage down the track
  const [activeSolo, setActiveSolo] = useState<string | null>(null);
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({
    vocals: 85,
    drums: 75,
    bass: 70,
    other: 65,
  });

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
      // Show vocals, but group drums/bass/other as "instrumental" in user's eyes (for demo, we will combine or just display vocals/melody)
      return track.id === "vocals" || track.id === "other";
    }
    return true; // 4stem shows everything
  });

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-900/40 to-cyan-500/10 border border-blue-500/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden space-y-6">
      {/* Absolute subtle visual decorations */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header element */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-emerald-400">
              UVR-6 Neural Stem Studio Active
            </span>
            <span className="text-[10px] font-mono font-extrabold text-[#60a5fa] bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
              {selectedCategory.toUpperCase()} ENGINE
            </span>
          </div>
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#818cf8]" />
            Interactive Stem Mixer Console
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
            Input: <span className="text-white font-mono">{inputFileName}</span>{" "}
            | Model:{" "}
            <span className="text-white font-mono">{selectedModelName}</span>
          </p>
        </div>

        {/* Console stats */}
        <div className="flex gap-4 text-xs font-mono bg-black/35 px-4 py-2 rounded-xl border border-white/5">
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">
              Bitrate
            </span>
            <span className="font-bold text-slate-200">1411 kbps</span>
          </div>
          <div className="border-l border-white/10 pl-4">
            <span className="text-slate-500 block text-[9px] uppercase font-bold">
              Inference
            </span>
            <span className="font-bold text-purple-300">GPU CUDA (16-bit)</span>
          </div>
          <div className="border-l border-white/10 pl-4">
            <span className="text-slate-500 block text-[9px] uppercase font-bold">
              Tensors
            </span>
            <span className="font-bold text-cyan-300">
              {parameters || "Standard"}
            </span>
          </div>
        </div>
      </div>

      {/* Global Player Controls bar */}
      <div className="p-4 bg-[#0a0c16]/80 rounded-xl border border-[#ffffff]/5 flex flex-col md:flex-row items-center gap-4 justify-between shadow-inner">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isPlaying
                ? "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.35)]"
            }`}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          <div>
            <span className="text-[11px] text-slate-500 font-mono block">
              Timeline Sweep
            </span>
            <span className="text-xs font-mono font-bold text-white bg-black/45 px-2 py-0.5 rounded-md border border-white/5">
              {formatTime()}
            </span>
          </div>
        </div>

        {/* Unified Seekbar Slider */}
        <div className="flex-1 w-full relative">
          <div className="h-2 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
            {/* Play progress highlight */}
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full rounded-full transition-all"
              style={{ width: `${playheadPos}%` }}
            ></div>
            {/* Marker pulses */}
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

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              setPlayheadPos(15);
              setIsPlaying(false);
            }}
            className="flex-1 md:flex-none px-4 py-2 bg-white/5 text-slate-300 border border-white/5 rounded-xl text-xs hover:bg-white/10 transition-colors font-mono cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Restart
          </button>

          <button
            className="flex-1 md:flex-none px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-950/40 font-bold cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
            onClick={() =>
              alert(
                `Beginning high-quality mixdown stem bounce! Waveforms exported to: ` +
                  (mutes["vocals"] ? "Inst_only.wav" : "Full_Stems.zip"),
              )
            }
          >
            <Download className="w-3.5 h-3.5" />
            Export Mixdown
          </button>
        </div>
      </div>

      {/* Stem Tracks List */}
      <div className="space-y-4">
        {renderedTracks.map((track) => {
          const volume = volumes[track.id];
          const isMuted = mutes[track.id];
          const isAnySoloActive = activeSolo !== null;
          const isSoloed = activeSolo === track.id;

          // Determine if track audio is fundamentally silent based on mutes and solo overlays
          const isSilent = isMuted || (isAnySoloActive && !isSoloed);

          return (
            <div
              key={track.id}
              className={`p-4 rounded-xl border transition-all duration-300 ${
                isSilent
                  ? "bg-black/25 border-white/5 opacity-50"
                  : "bg-white/[0.02] border-[#ffffff]/10 hover:border-slate-500/30 shadow-glass-inset"
              }`}
            >
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                {/* Track Icon, Title & Bouncing Meter */}
                <div className="flex items-center gap-4 xl:w-72">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${track.color} text-white flex items-center justify-center shrink-0 shadow-lg`}
                  >
                    <track.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                      Output Stem
                    </span>
                    <h4 className="text-sm font-bold text-white truncate">
                      {track.name}
                    </h4>
                  </div>

                  {/* Visual DB Meter bar on the left */}
                  <div className="w-14 h-6 bg-black/45 rounded border border-white/5 p-0.5 flex flex-col justify-end overflow-hidden">
                    <div className="flex justify-between items-end gap-[2px] h-full">
                      {Array.from({ length: 8 }).map((_, segmentIndex) => {
                        const meterDb = mockMeters[track.id] || 0;
                        const segmentThreshold = (segmentIndex + 1) * 12.5; // Out of 100
                        const isActive = meterDb >= segmentThreshold;

                        return (
                          <div
                            key={segmentIndex}
                            style={{
                              height: `${(segmentIndex + 1) * 12.5}%`,
                              backgroundColor: isSilent
                                ? "rgba(255,255,255,0.05)"
                                : isActive
                                  ? segmentIndex > 5
                                    ? "#ef4444" // Red peaks
                                    : segmentIndex > 4
                                      ? "#f59e0b" // Yellow transient
                                      : "#10b981" // Green floor
                                  : "rgba(255,255,255,0.05)",
                            }}
                            className="w-1.5 rounded-sm transition-all duration-75"
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Waveform Visualization Panel with moving playhead overlay */}
                <div className="flex-1 h-12 bg-black/40 rounded-xl relative overflow-hidden border border-white/5 flex items-center px-1.5 gap-[2px]">
                  {track.intensity.map((height, i) => {
                    const waveIndexPos = (i / track.intensity.length) * 100;
                    const isPassed = playheadPos >= waveIndexPos;
                    const activeBg = isSilent
                      ? "bg-slate-700/30"
                      : isPassed
                        ? "bg-gradient-to-t " + track.color
                        : "bg-slate-600/40";

                    return (
                      <div
                        key={i}
                        style={{ height: `${height}%` }}
                        className={`flex-1 rounded-sm transition-all duration-300 ${activeBg}`}
                      />
                    );
                  })}

                  {/* Individual wave playhead sync line */}
                  {isPlaying && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_rgba(255,255,255,1)] pointer-events-none transition-all duration-100"
                      style={{ left: `${playheadPos}%` }}
                    />
                  )}
                </div>

                {/* Mixing Console controls (fader, mute, solo) */}
                <div className="flex items-center gap-4 xl:w-[280px] justify-between">
                  {/* Fader slider */}
                  <div className="flex-1 flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() =>
                        handleVolumeChange(track.id, volume === 0 ? 80 : 0)
                      }
                      className="text-slate-400 hover:text-white transition-all cursor-pointer focus:outline-none"
                    >
                      {volume === 0 || isMuted ? (
                        <VolumeX className="w-4 h-4 text-rose-400 animate-pulse" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-slate-300" />
                      )}
                    </motion.button>
                    <div className="flex-1 relative flex items-center h-5 group">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={isMuted ? 0 : volume}
                        onChange={(e) =>
                          handleVolumeChange(track.id, Number(e.target.value))
                        }
                        className="w-full h-1 bg-white/10 rounded-full cursor-pointer appearance-none outline-none accent-blue-400 transition-all focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 w-8 text-right select-none font-bold">
                      {isMuted ? "MUTE" : `${volume}%`}
                    </span>
                  </div>

                  {/* Solo and Mute flags toggles */}
                  <div className="flex gap-1.5 shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMuteToggle(track.id)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-semibold tracking-wider uppercase transition-all cursor-pointer focus:outline-none border ${
                        isMuted
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                          : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200"
                      }`}
                    >
                      Mute
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSoloToggle(track.id)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-semibold tracking-wider uppercase transition-all cursor-pointer focus:outline-none border ${
                        isSoloed
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold shadow-[0_0_8px_rgba(245,158,11,0.1)]"
                          : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200"
                      }`}
                    >
                      Solo
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Advanced phase math parameters inspired by classical UVR-5 / UVR-6 specifications */}
      <div className="p-4 rounded-xl bg-black/40 border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <label className="text-slate-400 font-bold block text-[10px] uppercase font-mono tracking-wider">
            Phase Cancellation Depth
          </label>
          <p className="text-[11px] text-slate-500">
            Invert wave phases iteratively to achieve perfect isolation bleed
            subtract.
          </p>
          <span className="text-blue-400 font-mono font-bold">
            180° Complete Cancellation (Dry)
          </span>
        </div>
        <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4">
          <label className="text-slate-400 font-bold block text-[10px] uppercase font-mono tracking-wider">
            High Frequency Spectrogram Cut
          </label>
          <p className="text-[11px] text-slate-500">
            Limits treble harmonics escaping into vocal stems. (Recommended:
            16kHz).
          </p>
          <span className="text-purple-300 font-mono font-bold">
            16.5 kHz Low-Pass Mask
          </span>
        </div>
        <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4">
          <label className="text-slate-400 font-bold block text-[10px] uppercase font-mono tracking-wider">
            Active Volume Normalization
          </label>
          <p className="text-[11px] text-slate-500">
            Normalizes input chunk sound levels to maximize RMS weight
            extraction accuracy.
          </p>
          <span className="text-emerald-400 font-mono font-bold">
            Auto RMS Gain Normalizer (Enabled)
          </span>
        </div>
      </div>
    </div>
  );
}
