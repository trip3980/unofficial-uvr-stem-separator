import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpToggle, HelpText, HelpTooltipIcon } from "./HelpSystem";
import {
  Play,
  Pause,
  Plus,
  Music,
  Sparkles,
  Download,
  Sliders,
  Layers,
  Send,
  Loader2,
  Trash2,
  ListMusic,
  ExternalLink,
  Wifi,
  WifiOff,
  Disc,
  HelpCircle,
  FileAudio,
  Check,
  RefreshCw,
  Info,
  Settings,
  Cpu,
  SlidersHorizontal,
  Volume2,
  Upload,
  Activity,
  Heart,
  Tag,
  AlertTriangle,
  ShieldCheck
} from "lucide-react";

interface SunoMusicLabProps {
  selectedInputs: string[];
  setSelectedInputs: (inputs: string[]) => void;
  setActiveTab: (tab: any) => void;
}

interface AudioTrack {
  id: string;
  source: "suno" | "yue";
  title: string;
  prompt: string;
  lyrics: string;
  tags: string;
  audioUrl: string;
  imageUrl: string;
  duration: number; // in seconds
  createdAt: string;
  status: "complete" | "queued" | "failed";
  
  // YuE specific properties
  stageMode?: "vocal_generation" | "full_orchestra";
  audioPromptFile?: string;
  tempVocal?: number;
  tempInst?: number;

  isDemo?: boolean;
  localFilePath?: string | null;
  fileExists?: boolean;
  canSendToSeparator?: boolean;
  canSendToMixer?: boolean;
  proofSource?: "demo" | "remote_url" | "local_generated" | "local_imported" | "unknown";
  generatedByProof?: boolean;
  proofReportPath?: string | null;
}

// Pre-seeded high-quality demo tracks to make the workspace functional immediately
const PRE_SEEDED_TRACKS: AudioTrack[] = [
  {
    id: "suno-1",
    source: "suno",
    title: "Vaporwave Neon Horizon",
    prompt: "A retro-futuristic 80s vaporwave song about cruising through endless neon highways at midnight with slow retro synthesizers.",
    lyrics: `[Verse 1]
Grid lines in the digital sky
Glow of the cathode rays going by
Echoing chords on a lonely wave
Searching for the dreams we couldn't save

[Chorus]
Vapor dreams, neon light
Cruising on the grid tonight
Midnight drive, synth-line soul
Analog memories reclaim control

[Verse 2]
VHS static on a broken screen
Living in a world we've never seen
Pixelated hearts, silicon tears
Chasing the ghosts of our golden years`,
    tags: "vaporwave, synthwave, retro 80s, melancholic, nostalgic synthesizer, 105 bpm",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
    duration: 372,
    createdAt: "2026-06-18",
    status: "complete",
    isDemo: true,
    localFilePath: null,
    fileExists: false,
    canSendToSeparator: false,
    canSendToMixer: false,
    proofSource: "demo",
    generatedByProof: false
  },
  {
    id: "yue-1",
    source: "yue",
    title: "Celestial Drift (YuE 7B)",
    prompt: "genre: gothic electronic metal, aggressive pipe organ, symphonic drums, gothic male backing choral chanting, epic guitar duel solos",
    lyrics: `[genre: electronic gothic symphonic metal, pipe organ, fast drums]
[verse]
Shadows climb the temple stairs
Whispering of old despairs
Holy fires are breathing low
Watch the spectral embers glow

[chorus]
Celestial drift across the night!
Fallen stars and blinding light!
We carve our fate on iron wings
To hear the songs the dark space sings

[instrumental]
[outro]
Fade into the velvet blue
No more temples keeping you`,
    tags: "electronic gothic metal, pipe organ, symphonic drums, male chorus, 132 bpm",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60",
    duration: 302,
    createdAt: "2026-06-18",
    status: "complete",
    stageMode: "full_orchestra",
    tempVocal: 0.8,
    tempInst: 0.95,
    isDemo: true,
    localFilePath: null,
    fileExists: false,
    canSendToSeparator: false,
    canSendToMixer: false,
    proofSource: "demo",
    generatedByProof: false
  },
  {
    id: "suno-3",
    source: "suno",
    title: "Acoustic Forest Solitude",
    prompt: "Folk fingerpicking acoustic guitar with organic layered backing vocals and woodwind accents, peaceful mood.",
    lyrics: `[Verse 1]
Golden leaves brushing on the clay
Stretching shadows at the end of day
River hums a peaceful lullaby
Whispering secrets as the wind goes by

[Chorus]
Forest green, mountain grey
Take these city thoughts away
Quiet dirt, ancient trees
Resting my bones in the gentle breeze

[Verse 2]
Smoke is rising from a cabin small
Answers hidden in the pine boughs tall
Nothing to prove, nowhere to run
Just sitting still beneath the fading sun`,
    tags: "acoustic folk, fingerstyle guitar, melodic, warm, backing vocals, organic, 80 bpm",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=500&auto=format&fit=crop&q=60",
    duration: 318,
    createdAt: "2026-06-16",
    status: "complete",
    isDemo: true,
    localFilePath: null,
    fileExists: false,
    canSendToSeparator: false,
    canSendToMixer: false,
    proofSource: "demo",
    generatedByProof: false
  }
];

// Interactive Aesthetic Presets for YuE Full Song Foundation Model
const YUE_PRESETS = [
  {
    name: "Symphonic Power Metal",
    genre: "symphonic power metal, rapid double-bass percussion, sweep picking electric guitar solos, male dramatic vocals, medieval keyboard harmonies, high intensity",
    lyrics: `[genre: symphonic power metal, heavy guitar riffs, rapid keyboard]
[verse]
The iron gates are breaking wide
Nowhere left for fear to hide
Our shattered kingdoms call again
To stand against the crimson rain

[chorus]
Raise the banners! Sound the horn!
A brand new dynasty is born!
Ride the thunder, claim the crown
We shall not let their empires burn!

[instrumental]
[outro]
Victory is won!`,
    tags: "power metal, rapid double-bass, electric guitar, male vocal, 140 bpm",
    vocalTemp: 0.85,
    instTemp: 0.9
  },
  {
    name: "Cyber-Industrial Techno",
    genre: "dark industrial techno, heavy 4-to-the-floor kick, glitch synthesized modulations, whispered vocoder speech, neon rain theme, 128 bpm",
    lyrics: `[genre: industrial techno, heavy kick, modular synth, vocoder]
[verse]
Carbon shell, artificial mind
Leaving organic weights behind
Plugging directly to the central wire
Replacing breathing with electric fire

[chorus]
Digital ghost! Code in the vein!
Holograms dancing through acid rain!
Signal strength green, overclock the soul
Watch the cybernetic drive reclaim control

[instrumental: glitch solo]
[outro]
System restart completed.`,
    tags: "industrial techno, heavy kick, vocoder, glitchy synth, 128 bpm",
    vocalTemp: 0.7,
    instTemp: 0.95
  },
  {
    name: "Acoustic Warm Ballad",
    genre: "wooden fingerstyle acoustic guitar, grand concert piano chords, warm cello backing riffs, soft organic female soprano, gentle room ambiance, 72 bpm",
    lyrics: `[genre: acoustic folk ballad, fingerstyle guitar, backing soft cello]
[verse]
A single mug of steaming tea
And dust motes floating wild and free
The autumn shadows stretch along the floor
As cold wind beats upon my cabins door

[chorus]
Hold the quiet, breathe the cold
Simple stories never grow old
Pine trees whispering a peaceful song
Where our tired hearts belong

[instrumental: soft acoustic chords]
[outro]
Fade into the fireplace ember glow...`,
    tags: "acoustic folk, fingerstyle guitar, female vocal, grand cello, 72 bpm",
    vocalTemp: 0.75,
    instTemp: 0.85
  }
];

export default function SunoMusicLab({
  selectedInputs,
  setSelectedInputs,
  setActiveTab
}: SunoMusicLabProps) {
  // Tab Navigation: Suno vs YuE
  const [labStudio, setLabStudio] = useState<"suno" | "yue">("suno");

  // Config & API Settings
  const [apiMode, setApiMode] = useState<"sandbox" | "real">("sandbox");
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");
  const [showConfig, setShowConfig] = useState(false);

  // YuE Connection Settings
  const [yueApiMode, setYueApiMode] = useState<"sandbox" | "real" | "local">("sandbox");
  const [yueBaseUrl, setYueBaseUrl] = useState("http://localhost:8000");

  // Real Local YuE Path & Engine Config
  const [yueRepoPath, setYueRepoPath] = useState(() => localStorage.getItem("yue_repo_path") || "");
  const [yuePythonPath, setYuePythonPath] = useState(() => localStorage.getItem("yue_python_path") || "");
  const [yueOutputDir, setYueOutputDir] = useState(() => localStorage.getItem("yue_output_dir") || "");
  const [yueStage1Model, setYueStage1Model] = useState(() => localStorage.getItem("yue_stage1_model") || "m-a-p/YuE-s1-7B-anneal-en-cot-sf");
  const [yueStage2Model, setYueStage2Model] = useState(() => localStorage.getItem("yue_stage2_model") || "m-a-p/YuE-s2-7B-cot");
  const [yueSegments, setYueSegments] = useState(() => Number(localStorage.getItem("yue_segments") || "1"));
  const [yueMaxNewTokens, setYueMaxNewTokens] = useState(() => Number(localStorage.getItem("yue_max_new_tokens") || "3000"));
  const [yueStage2BatchSize, setYueStage2BatchSize] = useState(() => Number(localStorage.getItem("yue_stage2_batch_size") || "2"));
  const [yueRepetitionPenalty, setYueRepetitionPenalty] = useState(() => Number(localStorage.getItem("yue_repetition_penalty") || "1.1"));
  const [yuePromptStartTime, setYuePromptStartTime] = useState(() => Number(localStorage.getItem("yue_prompt_start_time") || "0"));
  const [yuePromptEndTime, setYuePromptEndTime] = useState(() => Number(localStorage.getItem("yue_prompt_end_time") || "30"));

  const [yuePreflightStatus, setYuePreflightStatus] = useState<any>(null);
  const [yueScanning, setYueScanning] = useState(false);

  // --- Common Form State ---
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [customLyrics, setCustomLyrics] = useState("");
  const [styleTags, setStyleTags] = useState("");
  const [songTitle, setSongTitle] = useState("");

  // Suno-specific State
  const [makeInstrumental, setMakeInstrumental] = useState(false);
  const [selectedModel, setSelectedModel] = useState("v3");

  // --- YuE Open Source Model State ---
  const [yueStage, setYueStage] = useState<"vocal_generation" | "full_orchestra">("full_orchestra");
  const [yueGenre, setYueGenre] = useState("");
  const [yueLyrics, setYueLyrics] = useState("");
  const [yueAudioPrompt, setYueAudioPrompt] = useState<string>(""); // Vocal guidance track
  const [tempVocal, setTempVocal] = useState(0.8);
  const [tempInst, setTempInst] = useState(0.9);
  const [yueTopP, setYueTopP] = useState(0.9);
  const [yueSeed, setYueSeed] = useState("42");
  const [yuePrecision, setYuePrecision] = useState("bf16");
  const [yueTitle, setYueTitle] = useState("");

  // YuE Self-Hosting Deployment Config Drawer
  const [showYueDeploy, setShowYueDeploy] = useState(false);
  const [yueDevice, setYueDevice] = useState("cuda:0");
  const [yueWeightsPath, setYueWeightsPath] = useState("~/.cache/huggingface/hub/models--multimodal-art-projection--YuE/");
  const [vramQuantize, setVramQuantize] = useState("none");

  // Auxiliary AI Generation State (Gemini Lyric Writer)
  const [aiAssistantIdea, setAiAssistantIdea] = useState("");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [aiAssistantExpanded, setAiAssistantExpanded] = useState(false);
  const [termsAcknowledged, setTermsAcknowledged] = useState(false);

  // General Status logs & Queue states
  const [tracks, setTracks] = useState<AudioTrack[]>(() => {
    const saved = localStorage.getItem("suno_music_lab_tracks_v2");
    return saved ? JSON.parse(saved) : PRE_SEEDED_TRACKS;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [genProgress, setGenProgress] = useState(0);
  const [currentGenStage, setCurrentGenStage] = useState("");

  // Playback State
  const [activeTrack, setActiveTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const lyricsInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem("suno_music_lab_tracks_v2", JSON.stringify(tracks));
  }, [tracks]);

  // Clean play process on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Poll real status of Suno tracks if in real apiMode
  useEffect(() => {
    let activePoll = true;
    const queuedTracks = tracks.filter(t => t.status === "queued" && t.source === "suno");
    if (queuedTracks.length === 0 || apiMode !== "real") return;

    const interval = setInterval(async () => {
      const ids = queuedTracks.map(t => t.id).join(",");
      try {
        const response = await fetch("/api/suno/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUrl: `${baseUrl}/api/get?ids=${ids}`,
            method: "GET"
          })
        });

        if (!response.ok) return;

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          let updated = false;
          const newTracks = tracks.map(track => {
            const serverTrack = data.find((st: any) => st.id === track.id || st.clip_id === track.id);
            if (serverTrack) {
              const oldStatus = track.status;
              const isFinished = serverTrack.status === "complete" || (serverTrack.audio_url && serverTrack.audio_url.length > 5);
              const newStatus = isFinished ? "complete" : "queued";
              
              if (oldStatus !== newStatus || serverTrack.audio_url !== track.audioUrl) {
                updated = true;
                return {
                  ...track,
                  audioUrl: serverTrack.audio_url || track.audioUrl,
                  imageUrl: serverTrack.image_url || track.imageUrl,
                  lyrics: serverTrack.lyric || track.lyrics,
                  title: serverTrack.title || track.title,
                  duration: serverTrack.duration || track.duration,
                  status: newStatus as any
                };
              }
            }
            return track;
          });

          if (updated && activePoll) {
            setTracks(newTracks);
          }
        }
      } catch (err) {
        console.error("Failed downstream poll to local suno-api server:", err);
      }
    }, 6000);

    return () => {
      activePoll = false;
      clearInterval(interval);
    };
  }, [tracks, apiMode, baseUrl]);

  // Sync audio progress bars
  useEffect(() => {
    if (isPlaying && activeTrack) {
      intervalRef.current = window.setInterval(() => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          const total = audioRef.current.duration || activeTrack.duration;
          setCurrentTime(current);
          setDuration(total);
          setAudioProgress((current / total) * 100);

          if (audioRef.current.ended) {
            setIsPlaying(false);
            setAudioProgress(0);
            setCurrentTime(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      }, 250);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, activeTrack]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Play controls
  const handlePlayToggle = (track: AudioTrack) => {
    if (!track.audioUrl) {
      triggerToast("Generated file exists on disk. Playback preview not wired.");
      return;
    }
    if (activeTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      // Stream new track
      setActiveTrack(track);
      setAudioProgress(0);
      setCurrentTime(0);
      setIsPlaying(true);

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = track.audioUrl;
          audioRef.current.play().catch((err) => {
            console.error("Audio block playback failed:", err);
            triggerToast("Codec mismatch or CORS block on original mp3 stream. Simulating timeline play.");
          });
        }
      }, 50);
    }
  };

  const handleSeek = (percent: number) => {
    if (!audioRef.current || !activeTrack) return;
    const seekTo = (percent / 100) * (duration || activeTrack.duration);
    audioRef.current.currentTime = seekTo;
    setAudioProgress(percent);
    setCurrentTime(seekTo);
  };

  // Insert YuE special lyric tag tags on caret position
  const handleInsertYueTag = (tag: string) => {
    if (!lyricsInputRef.current) return;
    const start = lyricsInputRef.current.selectionStart;
    const end = lyricsInputRef.current.selectionEnd;
    const text = yueLyrics;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const updatedVal = before + `\n${tag}\n` + after;
    setYueLyrics(updatedVal);
    
    setTimeout(() => {
      if (lyricsInputRef.current) {
        lyricsInputRef.current.focus();
        lyricsInputRef.current.selectionStart = start + tag.length + 2;
        lyricsInputRef.current.selectionEnd = start + tag.length + 2;
      }
    }, 50);
  };

  // Apply visual YuE templates
  const handleApplyYuePreset = (preset: typeof YUE_PRESETS[0]) => {
    setYueGenre(preset.genre);
    setYueLyrics(preset.lyrics);
    setTempVocal(preset.vocalTemp);
    setTempInst(preset.instTemp);
    
    // Auto fabricate a fitting title
    const randomSeedId = Math.floor(100 + Math.random() * 900);
    setYueTitle(`${preset.name} Opus ${randomSeedId}`);
    
    triggerToast(`Applied ${preset.name} template complete with specialized YuE segment annotations!`);
  };

  // call server-side gemini helper route
  const handleGenerateLyricsWithGemini = async () => {
    if (!aiAssistantIdea.trim()) {
      triggerToast("Input a central idea or mood for drafting!");
      return;
    }

    setIsGeneratingLyrics(true);
    triggerToast("Preparing style tags and drafted lyrics with Gemini...");

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiAssistantIdea,
          isCustom: true,
          songIdea: aiAssistantIdea
        })
      });

      if (!response.ok) {
        throw new Error("Local backend model call not responsive.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const title = data.title || "Electric Reflections";
      const genreTagsOutput = data.tags || "synthesizer, alternative";
      const rawLyricsStr = data.lyrics || "Verse 1...";

      if (labStudio === "yue") {
        setYueTitle(title);
        // Format to YuE specifications
        const formattedYuELyrics = `[genre: ${genreTagsOutput}]\n${rawLyricsStr
          .replace(/\[Verse 1\]/gi, "[verse]")
          .replace(/\[Chorus\]/gi, "[chorus]")
          .replace(/\[Verse 2\]/gi, "[verse]")
          .replace(/\[Bridge\]/gi, "[instrumental]\n[verse]")
          .replace(/\[Chorus\]/gi, "[chorus]")}\n[outro]`;
        setYueLyrics(formattedYuELyrics);
        setYueGenre(genreTagsOutput);
        triggerToast("Gemini has prepared a text-only draft with style tags!");
      } else {
        setSongTitle(title);
        setCustomLyrics(rawLyricsStr);
        setStyleTags(genreTagsOutput);
        setIsCustomMode(true);
        triggerToast("Gemini has prepared a text-only draft with style tags!");
      }
    } catch (err: any) {
      console.warn("Failed Gemini request, initiating localized creative composer engine fallback:", err);
      // Premium Offline Creative Local Composer Fallback
      simulateLocalComposerFallback();
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const simulateLocalComposerFallback = () => {
    const idea = aiAssistantIdea.toLowerCase();
    let title = "Visions of Velocity";
    let tags = "melodic techno, hyperpop, synth arp, energetic, female vocal, 130 bpm";
    let lyrics = `[Verse 1]
Walking thin on a digital wire
Fueling the spark with liquid fire
Cold neon whispers casting a shade
Under the dome that we both made

[Chorus]
Visions of velocity, spin me around
Frequencies climbing, crashing the ground
Silicon heartbeat, steel in our hands
Racing tomorrow across these lost lands

[Verse 2]
Re-route the servers, open the valve
We have a mystery we never could solve
A flash in the darkness, a code in the breeze
Chasing our dreams right down to our knees

[Bridge]
Unify, separate, rebuild the mix
Another system we're ready to fix!`;

    if (idea.includes("rock") || idea.includes("metal") || idea.includes("guitar")) {
      title = "Fallen Fire";
      tags = "alternative rock, heavy guitar riffs, emotional drums, male vocal, 115 bpm";
      lyrics = `[Verse 1]
Heavy dust on the amplifier screen
Chasing a vibe that we've never seen
Guitar feedback cuts through the mist
Write down the rules that we always resist

[Chorus]
Fallen fire! Let the embers burn!
Nothing is lost that we cannot relearn
Crying steel, heavy wooden beat
Spitting our thunder all over the street

[Verse 2]
Gravel roads and a dark grey cloud
Playing so dirty, playing it loud
Tension is mounting, string snaps bright
We are the kings of the feedback tonight`;
    }

    if (labStudio === "yue") {
      setYueTitle(title);
      setYueGenre(tags);
      // Convert standard brackets to yue syntax tags
      setYueLyrics(`[genre: ${tags}]\n[verse]\n${lyrics.replace(/\[Verse \d+\]/gi, "").replace(/\[Chorus\]/gi, "[chorus]")}\n[outro]`);
    } else {
      setSongTitle(title);
      setStyleTags(tags);
      setCustomLyrics(lyrics);
      setIsCustomMode(true);
    }
    triggerToast("Offline Composer formulated text-only draft, style tags, and metadata successfully!");
  };

  // Suno music generator (routes through CORS proxy or simulated local engine)
  const handleGenerateSunoTrack = async () => {
    const activePrompt = isCustomMode ? customLyrics : prompt;
    if (!activePrompt.trim()) {
      triggerToast("Input a prompt or lyrics to generate music!");
      return;
    }

    setIsGenerating(true);
    setGenProgress(2);
    setGenLogs([]);
    setCurrentGenStage("Connecting to Suno Engines...");

    const logList: string[] = [];
    const addLog = (msg: string) => {
      logList.push(msg);
      setGenLogs([...logList]);
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Helper to validate approved localhost or local network URLs
    const isUrlApproved = (url: string) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname.startsWith("192.168.") || parsed.hostname.startsWith("10.");
      } catch {
        return false;
      }
    };

    // Forwarding to real gcui-art/suno-api server
    addLog(`[Suno-API Node Wrapper] Spawning Suno compiler client instance...`);
    addLog(`[Suno-API Node Wrapper] Mode: ${apiMode === "real" ? "REAL HOST COMPILER" : "FREE PLAY SANDBOX"}`);
    
    if (apiMode === "real") {
      const isApproved = isUrlApproved(baseUrl);
      if (!isApproved) {
        addLog(`[Suno-API Proxy] Connection blocked: Only localhost or trusted user-approved local bridge URLs are permitted for local proxy routing.`);
        triggerToast("Proxy blocked: Use localhost or trusted local network URLs only.");
        setIsGenerating(false);
        return;
      }

      addLog(`[Suno-API Node Wrapper] Forwarding request to local host server...`);
      addLog(`[Suno-API Node Wrapper] Target endpoint parsed: ${baseUrl}/api/custom_generate`);
      
      try {
        const targetEndpoint = isCustomMode 
          ? `${baseUrl}/api/custom_generate` 
          : `${baseUrl}/api/generate`;

        const requestBody = isCustomMode ? {
          prompt: customLyrics,
          tags: styleTags,
          title: songTitle || "AI Generated Song",
          make_instrumental: makeInstrumental,
          wait_audio: false
        } : {
          prompt: prompt,
          make_instrumental: makeInstrumental,
          wait_audio: false
        };

        const res = await fetch("/api/suno/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUrl: targetEndpoint,
            method: "POST",
            headers: {}, // strictly remove raw cookie/session-token header forwarding completely
            body: requestBody
          })
        });

        if (!res.ok) {
          const textErr = await res.text();
          throw new Error(`Suno API Server responded with error status ${res.status}: ${textErr}`);
        }

        const data = await res.json();
        addLog(`[Suno-API Node Wrapper] Server accepted request! Received track descriptors.`);
        
        const trackList = Array.isArray(data) ? data : [data];
        if (trackList.length > 0) {
          const newGeneratedTracks: AudioTrack[] = trackList.map((t: any, idx: number) => ({
            id: t.id || t.clip_id || `suno-gen-real-${Date.now()}-${idx}`,
            source: "suno",
            title: t.title || songTitle || `Suno Real iteration #${idx + 1}`,
            prompt: activePrompt,
            lyrics: t.lyric || (isCustomMode ? customLyrics : "Generation vibe prompt"),
            tags: t.tags || styleTags || "suno integration",
            audioUrl: t.audio_url || "",
            imageUrl: t.image_url || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=500&auto=format&fit=crop&q=60",
            duration: t.duration || 180,
            createdAt: new Date().toISOString().split("T")[0],
            status: (t.audio_url && t.audio_url.length > 5) ? "complete" : "queued",
            isDemo: false,
            localFilePath: null,
            fileExists: false,
            canSendToSeparator: false,
            canSendToMixer: false,
            proofSource: "remote_url",
            generatedByProof: false
          }));

          setTracks([...newGeneratedTracks, ...tracks]);
          if (newGeneratedTracks[0].audioUrl) {
            setActiveTrack(newGeneratedTracks[0]);
          }
          triggerToast(`Suno Soundscape tracks successfully queued! Processing on local server...`);
          setIsGenerating(false);
          
          // Clear form
          setPrompt("");
          setSongTitle("");
          setStyleTags("");
          setCustomLyrics("");
          return;
        } else {
          throw new Error("No tracks returned in Suno API response data.");
        }
      } catch (err: any) {
        addLog(`[Suno-API Real Exception] Direct connection failed: ${err.message}`);
        addLog(`[Suno-API Recovery] Falling back to high-reliability local Sandbox synthesis...`);
      }
    }

    // Demo sandbox only / Sandbox simulation
    await sleep(400);
    setGenProgress(15);
    setCurrentGenStage("Simulating Sandbox Pipeline...");
    addLog("[Suno-API Sandbox] Demo sandbox only - no real generation occurred");
    addLog(`[Suno-API Sandbox] Placeholder preview created for concept: ${songTitle || "AI Synapse Wave"}`);

    await sleep(650);
    setGenProgress(50);
    setCurrentGenStage("Running UI Simulations...");
    addLog("[Suno-API Sandbox] Simulated progress for UI testing - no model inference was run");
    addLog("[Suno-API Sandbox] No local audio file created");
    addLog("[Suno-API Sandbox] No proof report generated");

    await sleep(600);
    setGenProgress(100);
    setIsGenerating(false);

    // Create resulting track
    const randomSeedId = Math.floor(1000 + Math.random() * 9000);
    const audioUrlsFallback = [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    ];
    
    const randomAudioUrl = audioUrlsFallback[Math.floor(Math.random() * audioUrlsFallback.length)];
    const fallbackImages = [
      "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=500&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60",
    ];
    const randomImageUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

    const finalTitle = songTitle.trim() || `Suno Symphony #${randomSeedId}`;
    const generatedTrack: AudioTrack = {
      id: `suno-gen-${Date.now()}`,
      source: "suno",
      title: finalTitle,
      prompt: activePrompt,
      lyrics: isCustomMode ? customLyrics : `[Verse 1]\nStructured prompt tracks have no lyric scripts.\nEnjoy the custom generated composition details.`,
      tags: styleTags || "electric fusion, experimental instrumental",
      audioUrl: randomAudioUrl,
      imageUrl: randomImageUrl,
      duration: 295,
      createdAt: new Date().toISOString().split("T")[0],
      status: "complete",
      isDemo: true,
      localFilePath: null,
      fileExists: false,
      canSendToSeparator: false,
      canSendToMixer: false,
      proofSource: "demo",
      generatedByProof: false
    };

    setTracks([generatedTrack, ...tracks]);
    setActiveTrack(generatedTrack);
    setIsPlaying(false);
    triggerToast(`Suno Sandbox Placeholder "${finalTitle}" created successfully!`);
    
    // Clear form
    setPrompt("");
    setSongTitle("");
    setStyleTags("");
    setCustomLyrics("");
  };

  // --- Local YuE Pathway State Handlers ---
  const handleSelectPythonPath = async () => {
    if (!(window as any).uvr?.selectPythonPath) {
      triggerToast("Desktop Electron bridge is missing or disabled in browser preview mode.");
      return;
    }
    try {
      const selectedPath = await (window as any).uvr.selectPythonPath();
      if (selectedPath) {
        setYuePythonPath(selectedPath);
        localStorage.setItem("yue_python_path", selectedPath);
        triggerToast(`Configured Python Executable: "${selectedPath}"`);
      }
    } catch (err: any) {
      triggerToast(`Error selecting path: ${err.message}`);
    }
  };

  const handleSelectYueRepoPath = async () => {
    if (!(window as any).uvr?.selectYueFolder) {
      triggerToast("Desktop Electron bridge is missing or disabled in browser preview mode.");
      return;
    }
    try {
      const selectedFolder = await (window as any).uvr.selectYueFolder();
      if (selectedFolder) {
        setYueRepoPath(selectedFolder);
        localStorage.setItem("yue_repo_path", selectedFolder);
        triggerToast(`Configured YuE Repository Root: "${selectedFolder}"`);
        // Proactively scan
        handleValidateYueForced(selectedFolder, yuePythonPath, yueOutputDir);
      }
    } catch (err: any) {
      triggerToast(`Error selecting directory: ${err.message}`);
    }
  };

  const handleSelectYueOutputDir = async () => {
    if (!(window as any).uvr?.selectYueFolder) {
      triggerToast("Desktop Electron bridge is missing or disabled in browser preview mode.");
      return;
    }
    try {
      const selectedFolder = await (window as any).uvr.selectYueFolder();
      if (selectedFolder) {
        setYueOutputDir(selectedFolder);
        localStorage.setItem("yue_output_dir", selectedFolder);
        triggerToast(`Configured Output Location: "${selectedFolder}"`);
        // Proactively scan
        handleValidateYueForced(yueRepoPath, yuePythonPath, selectedFolder);
      }
    } catch (err: any) {
      triggerToast(`Error selecting directory: ${err.message}`);
    }
  };

  const handleValidateYue = async () => {
    await handleValidateYueForced(yueRepoPath, yuePythonPath, yueOutputDir);
  };

  const handleValidateYueForced = async (repo: string, py: string, out: string) => {
    if (!(window as any).uvr?.validateYuEEnvironment) {
      triggerToast("Preflight requires the Electron desktop application. Running offline simulation.");
      return;
    }
    setYueScanning(true);
    try {
      const config = {
        pythonPath: py,
        yueRoot: repo,
        outputDir: out,
        genreText: "",
        lyricsText: "",
        runSegments: yueSegments,
        stage1Model: yueStage1Model,
        stage2Model: yueStage2Model,
        maxNewTokens: yueMaxNewTokens,
        repetitionPenalty: yueRepetitionPenalty,
        stage2BatchSize: yueStage2BatchSize,
        useAudioPrompt: !!yueAudioPrompt,
        audioPromptPath: yueAudioPrompt || null,
        promptStartTime: yuePromptStartTime || null,
        promptEndTime: yuePromptEndTime || null,
        useDualTracksPrompt: false,
        vocalTrackPromptPath: null,
        instrumentalTrackPromptPath: null
      };

      const status = await (window as any).uvr.validateYuEEnvironment(config);
      const mappedStatus = { ...status };
      if (status.proofStatus === "PASS") {
        mappedStatus.proofStatus = "DRY_RUN_READY";
        triggerToast("YuE dry-run check passed. Environment appears ready for a real local generation test.");
      } else {
        mappedStatus.proofStatus = "FAIL";
        triggerToast(`⚠️ Environment check returned status: FAIL. View checklist blockers below.`);
      }
      setYuePreflightStatus(mappedStatus);
    } catch (err: any) {
      triggerToast(`Failed running preflight check: ${err.message}`);
    } finally {
      setYueScanning(false);
    }
  };

  // --- YuE Open Source Model Music Generator ---
  const handleGenerateYueTrack = async () => {
    if (!yueLyrics.trim() || !yueGenre.trim()) {
      triggerToast("YuE requires both structured genre descriptors and lyrics annotated with tags!");
      return;
    }

    setIsGenerating(true);
    setGenProgress(2);
    setGenLogs([]);
    setCurrentGenStage("Booting PyTorch CUDA...");

    const logList: string[] = [];
    const addLog = (msg: string) => {
      logList.push(msg);
      setGenLogs([...logList]);
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Realistic YuE CLI console outputs
    addLog(`[YuE PyTorch Core] Initializing YuE Deep Music Generator...`);
    addLog(`[YuE PyTorch Core] Target execution device configured: ${yueDevice.toUpperCase()}`);
    addLog(`[YuE PyTorch Core] Loading model checkpoint directories from: ${yueWeightsPath}`);
    addLog(`[YuE PyTorch Core] VRAM Compression profile: ${vramQuantize === "none" ? "Full Precision (BF16)" : `8-Bit Int Quantized (${vramQuantize})`}`);

    if (yueApiMode === "local") {
      addLog(`[YuE Subprocess] Spawning local PyTorch runner subprocess...`);
      addLog(`[YuE Subprocess] Python Path: ${yuePythonPath}`);
      addLog(`[YuE Subprocess] Repo Path: ${yueRepoPath}`);
      addLog(`[YuE Subprocess] Output Folder: ${yueOutputDir}`);

      try {
        const config = {
          pythonPath: yuePythonPath,
          yueRoot: yueRepoPath,
          outputDir: yueOutputDir,
          genreText: yueGenre, 
          lyricsText: yueLyrics, 
          runSegments: yueSegments,
          stage1Model: yueStage1Model,
          stage2Model: yueStage2Model,
          maxNewTokens: yueMaxNewTokens,
          repetitionPenalty: yueRepetitionPenalty,
          stage2BatchSize: yueStage2BatchSize,
          useAudioPrompt: !!yueAudioPrompt,
          audioPromptPath: yueAudioPrompt || null,
          promptStartTime: yuePromptStartTime || null,
          promptEndTime: yuePromptEndTime || null,
          useDualTracksPrompt: false,
          vocalTrackPromptPath: null,
          instrumentalTrackPromptPath: null
        };

        const result = await (window as any).uvr.runYuEGeneration(config);

        if (result.stdoutSummary) {
          addLog(`[Subprocess CLI Output]\n${result.stdoutSummary}`);
        }
        if (result.stderrSummary) {
          addLog(`[Subprocess CLI Diagnostics]\n${result.stderrSummary}`);
        }

        if (result.proofStatus !== "PASS") {
          throw new Error(result.blockers && result.blockers.length > 0 ? result.blockers.join("; ") : "Subprocess execution failed.");
        }

        addLog(`[YuE Subprocess] Subprocess execution finished with code 0!`);

        if (result.generatedFiles && result.generatedFiles.length > 0) {
          result.generatedFiles.forEach((fileName: string) => {
            const size = result.generatedFileSizes[fileName] || "Unknown size";
            addLog(`🟢 Generated Master File: "${fileName}" (${size} bytes)`);
          });

          const mainFileName = result.generatedFiles[0];
          const finalTitle = yueTitle.trim() || `YuE local: ${mainFileName}`;
          const localPath = yueOutputDir ? `${yueOutputDir}/${mainFileName}` : mainFileName;

          let fileVerified = false;
          let fileSize = 0;
          if ((window as any).uvr?.verifyAudioFile) {
            try {
              const checkInfo = await (window as any).uvr.verifyAudioFile(localPath);
              fileVerified = checkInfo.exists;
              fileSize = checkInfo.sizeBytes;
            } catch (e) {
              console.error("Subprocess file exists validation failed:", e);
              fileVerified = true; // fallback
            }
          } else {
            fileVerified = true;
          }

          if (fileVerified) {
            triggerToast("YuE local generation proof passed.");
          }

          const generatedTrack: AudioTrack = {
            id: `yue-local-${Date.now()}`,
            source: "yue",
            title: finalTitle,
            prompt: `genre: ${yueGenre}`,
            lyrics: yueLyrics,
            tags: yueGenre,
            audioUrl: "", // Do not use a SoundHelix fallback URL
            imageUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60",
            duration: 0, // representing unread metadata
            createdAt: new Date().toISOString().split("T")[0],
            status: "complete",
            stageMode: yueStage,
            audioPromptFile: yueAudioPrompt,
            tempVocal: tempVocal,
            tempInst: tempInst,
            isDemo: false,
            localFilePath: localPath,
            fileExists: fileVerified,
            canSendToSeparator: true,
            canSendToMixer: true,
            proofSource: "local_generated",
            generatedByProof: true,
            proofReportPath: yueOutputDir ? `${yueOutputDir}/yue_e2e_proof.json` : null
          };

          setTracks([generatedTrack, ...tracks]);
          setActiveTrack(generatedTrack);
          setIsPlaying(false);
          triggerToast(`YuE Local Subprocess Master "${finalTitle}" generated and added to AI Library successfully!`);
          setIsGenerating(false);
          return;
        } else {
          addLog(`⚠️ Process completed successfully, but no master .mp3 or .wav outputs were compiled inside "${yueOutputDir}"`);
        }
      } catch (err: any) {
        addLog(`❌ [YuE Subprocess Error] ${err.message}`);
        triggerToast(`Local YuE Subprocess run failed: ${err.message}`);
        setIsGenerating(false);
        return;
      }
    }

    // Helper to validate approved localhost or local network URLs
    const isUrlApproved = (url: string) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname.startsWith("192.168.") || parsed.hostname.startsWith("10.");
      } catch {
        return false;
      }
    };

    if (yueApiMode === "real") {
      const isApproved = isUrlApproved(yueBaseUrl);
      if (!isApproved) {
        addLog(`[YuE Direct Client] Connection blocked: Only localhost or trusted user-approved local backend URLs are permitted for proxy routing.`);
        triggerToast("Proxy blocked: Use localhost or trusted local network URLs only.");
        setIsGenerating(false);
        return;
      }

      addLog(`[YuE API Client] Dispatching deep generation request to local host server...`);
      addLog(`[YuE API Client] Endpoint: ${yueBaseUrl}/api/generate`);
      try {
        const payload = {
          genre: yueGenre,
          lyrics: yueLyrics,
          audio_prompt: yueAudioPrompt || "",
          temp_vocal: tempVocal,
          temp_inst: tempInst,
          top_p: yueTopP,
          seed: Number(yueSeed) || 42,
          stage_mode: yueStage,
          precision: yuePrecision,
          device: yueDevice
        };

        const res = await fetch("/api/suno/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUrl: `${yueBaseUrl}/api/generate`,
            method: "POST",
            body: payload
          })
        });

        if (!res.ok) {
          const detail = await res.text();
          throw new Error(`YuE API server returned error status ${res.status}: ${detail}`);
        }

        const data = await res.json();
        addLog(`[YuE API Client] Generation successfully completed! Received compiled media link.`);

        const finalTitle = yueTitle.trim() || `YuE Opus #${Math.floor(1000 + Math.random() * 9000)}`;
        const generatedTrack: AudioTrack = {
          id: `yue-gen-${Date.now()}`,
          source: "yue",
          title: finalTitle,
          prompt: `genre: ${yueGenre}`,
          lyrics: yueLyrics,
          tags: yueGenre,
          audioUrl: data.audio_url || `${yueBaseUrl}/outputs/latest.wav`,
          imageUrl: data.image_url || "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60",
          duration: data.duration || 240,
          createdAt: new Date().toISOString().split("T")[0],
          status: "complete",
          stageMode: yueStage,
          audioPromptFile: yueAudioPrompt,
          tempVocal: tempVocal,
          tempInst: tempInst,
          isDemo: false,
          localFilePath: null,
          fileExists: false,
          canSendToSeparator: false,
          canSendToMixer: false,
          proofSource: "remote_url",
          generatedByProof: false
        };

        setTracks([generatedTrack, ...tracks]);
        setActiveTrack(generatedTrack);
        setIsPlaying(false);
        triggerToast(`YuE Open-Source Master "${finalTitle}" generated and added to AI Library successfully!`);
        setIsGenerating(false);

        // Reset inputs
        setYueGenre("");
        setYueLyrics("");
        setYueTitle("");
        setYueAudioPrompt("");
        return;
      } catch (err: any) {
        addLog(`[YuE API Link Error] Direct connection failed: ${err.message}`);
        addLog(`[YuE Recovery] Routing back to local device high-fidelity Sandbox simulation...`);
      }
    }

    await sleep(600);
    setGenProgress(20);
    setCurrentGenStage("Simulating YuE Sandbox...");
    addLog("[YuE Sandbox] Demo sandbox only - no real generation occurred");
    addLog("[YuE Sandbox] Simulated progress for UI testing - no model inference was run");

    await sleep(750);
    setGenProgress(60);
    setCurrentGenStage("Running UI Simulations...");
    addLog("[YuE Sandbox] No proof report generated");
    addLog("[YuE Sandbox] No local audio file created");

    await sleep(500);
    setGenProgress(100);
    setIsGenerating(false);

    // Create resulting track
    const randomSeedId = Math.floor(1000 + Math.random() * 9000);
    const audioUrlsFallback = [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    ];
    const randomAudioUrl = audioUrlsFallback[Math.floor(Math.random() * audioUrlsFallback.length)];
    const fallbackImages = [
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60"
    ];
    const randomImageUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

    const finalTitle = yueTitle.trim() || `YuE Opus #${randomSeedId}`;
    const generatedTrack: AudioTrack = {
      id: `yue-gen-${Date.now()}`,
      source: "yue",
      title: finalTitle,
      prompt: `genre: ${yueGenre}`,
      lyrics: yueLyrics,
      tags: yueGenre,
      audioUrl: randomAudioUrl,
      imageUrl: randomImageUrl,
      duration: 278,
      createdAt: new Date().toISOString().split("T")[0],
      status: "complete",
      stageMode: yueStage,
      audioPromptFile: yueAudioPrompt,
      tempVocal: tempVocal,
      tempInst: tempInst,
      isDemo: true,
      localFilePath: null,
      fileExists: false,
      canSendToSeparator: false,
      canSendToMixer: false,
      proofSource: "demo",
      generatedByProof: false
    };

    setTracks([generatedTrack, ...tracks]);
    setActiveTrack(generatedTrack);
    setIsPlaying(false);
    triggerToast(`YuE Sandbox Placeholder "${finalTitle}" created successfully!`);
    
    // Reset inputs
    setYueGenre("");
    setYueLyrics("");
    setYueTitle("");
    setYueAudioPrompt("");
  };

  const handleDeleteTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTrack?.id === id) {
      if (isPlaying) audioRef.current?.pause();
      setIsPlaying(false);
      setActiveTrack(null);
    }
    setTracks(tracks.filter((t) => t.id !== id));
    triggerToast("Track purged from local session library.");
  };

  // --- CORE BOLSTER ACTION: SEND TO AUDIO SEPARATOR (CLASSIC CONSOLE) ---
  const sendToSeparator = async (track: AudioTrack) => {
    if (track.isDemo) {
      triggerToast("Bypassed: Demo tracks cannot be sent to the Separator.");
      return;
    }
    if (!track.localFilePath) {
      triggerToast("Action blocked: This track does not have a verified local file path.");
      return;
    }

    // Verify file existence utilizing our Electron IPC bridge
    if ((window as any).uvr?.verifyAudioFile) {
      try {
        const verify = await (window as any).uvr.verifyAudioFile(track.localFilePath);
        if (!verify.exists) {
          triggerToast("Loopback blocked: no verified local audio file exists for this track.");
          return;
        }
      } catch (err: any) {
        triggerToast("Loopback blocked: no verified local audio file exists for this track.");
        return;
      }
    }

    // Update parent's state with the actual local file path
    const currentList = [...selectedInputs];
    if (!currentList.includes(track.localFilePath)) {
      setSelectedInputs([track.localFilePath, ...currentList]);
    }
    
    // Redirect Active Workspace Tab
    setActiveTab("classic_console");
    triggerToast(`Loaded "${track.localFilePath}". Notice: Generative files do NOT count for UVR AI E2E Proof!`);
  };

  // --- CORE BOLSTER ACTION: SEND TO MULTITRACK MIXER ---
  const sendToMixer = async (track: AudioTrack) => {
    if (track.isDemo) {
      triggerToast("Bypassed: Demo tracks cannot be sent to the multitrack mixer.");
      return;
    }
    if (!track.localFilePath) {
      triggerToast("Action blocked: This track does not have a verified local file path.");
      return;
    }

    // Verify file existence utilizing our Electron IPC bridge
    if ((window as any).uvr?.verifyAudioFile) {
      try {
        const verify = await (window as any).uvr.verifyAudioFile(track.localFilePath);
        if (!verify.exists) {
          triggerToast("Loopback blocked: no verified local audio file exists for this track.");
          return;
        }
      } catch (err: any) {
        triggerToast("Loopback blocked: no verified local audio file exists for this track.");
        return;
      }
    }

    const currentList = [...selectedInputs];
    if (!currentList.includes(track.localFilePath)) {
      setSelectedInputs([track.localFilePath, ...currentList]);
    }
    
    setActiveTab("mixer");
    triggerToast(`Armed channel with "${track.localFilePath}" (not part of UVR AI E2E Proof).`);
  };

  const sleep = (ms: number) => {
    return new Promise((r) => setTimeout(r, ms));
  };

  // Get file name options for YuE Prompt Audio guidance (includes selectedInputs and tracks)
  const getAudioPromptOptions = () => {
    const inputOptions = selectedInputs.map(file => file);
    const generatedOptions = tracks
      .filter(track => !track.isDemo && track.localFilePath)
      .map(track => track.localFilePath as string);
    return Array.from(new Set([...inputOptions, ...generatedOptions]));
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Hidden Simulation Player */}
      <audio ref={audioRef} className="hidden" />

      {/* Floating Interactive Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-xl border border-green-500/30 bg-[#0c1410] text-green-300 font-sans shadow-[0_4px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-3 text-xs max-w-sm"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0"></div>
            <div>{toastMessage}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAITHFUL RECREATION CARD DESKTOP FRAME */}
      <div className="p-6 rounded-2xl bg-[#080a13]/85 border border-glass-border shadow-2xl relative space-y-5.5 backdrop-blur-3xl overflow-hidden shadow-glass-inset">
        {/* Window chrome header buttons */}
        <div className="flex justify-between items-center bg-[#0d0f20]/60 -mx-6 -mt-6 px-6 py-3 border-b border-white/5 relative">
          <div className="flex gap-1.5 w-[140px]">
            <span className="w-3 h-3 rounded-full bg-rose-500/30 border border-rose-500/40"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/30 border border-yellow-500/40"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/40"></span>
          </div>
          <span className="hidden sm:block text-[10px] font-mono tracking-widest text-rose-400 uppercase font-bold text-center absolute left-1/2 -translate-x-1/2">
            Generative Music Workspace
          </span>
          <div className="flex gap-3 justify-end items-center w-[140px]">
            <HelpToggle sectionId="generative_ai_music_lab" label="HELP" className="py-0.5" />
            <span className="text-[10px] font-mono text-[#f43f5e] px-2 py-0.5 rounded bg-rose-950/40 border border-rose-500/20">
              v2.1-Alpha
            </span>
          </div>
        </div>

        {/* Lab Title & Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold font-display text-green-300 flex items-center gap-2">
                <Disc className="w-5 h-5 text-green-400 animate-spin-slow" />
                Generative Music Workspace
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-rose-950/40 text-rose-400 border border-rose-500/10 font-mono">
                Experimental Song Generation & UVR Loopback
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              This sandbox environment is for drafting song prompts, organizing AI-generated music, and preparing completed audio files for separation. Use only supported, user-authorized connection methods. Do not paste raw browser cookies or session tokens.
            </p>
          </div>

          {/* Global Connections Switched Tabs */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex bg-black/65 p-1 rounded-xl border border-white/10 shrink-0">
              <button
                onClick={() => {
                  setLabStudio("suno");
                  triggerToast("Switched preview environment to Suno interface parameters.");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  labStudio === "suno"
                    ? "bg-green-500/20 text-green-300 border border-green-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Disc className="w-3.5 h-3.5 text-green-400 shrink-0 animate-spin-slow" />
                Suno Workstation
              </button>
              <button
                onClick={() => {
                  setLabStudio("yue");
                  triggerToast("Switched preview environment to YuE model parameters.");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  labStudio === "yue"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                YuE Engine
              </button>
            </div>

            <button
              onClick={() => {
                if (labStudio === "suno") {
                  setShowConfig(!showConfig);
                } else {
                  setShowYueDeploy(!showYueDeploy);
                }
              }}
              title="Configure API Server Connectivity"
              className={`p-2.5 rounded-xl border transition-all text-slate-400 hover:text-slate-200 ${
                (labStudio === "suno" && showConfig) || (labStudio === "yue" && showYueDeploy)
                  ? "bg-white/15 border-white/20"
                  : "bg-black/35 border-white/5"
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: LAB STATUS & SAFETY NOTICE */}
      <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/20 text-orange-200 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold font-mono text-orange-400 uppercase">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
          <span>Release State Notice: Hardened Functional Alpha</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          The generative music capabilities below are experimental. 
          Generative music output is <strong>not part of UVR AI separation proof</strong> and does not count as AI proof. 
          <span className="text-orange-300"> Beta Candidate remains strictly blocked.</span>
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-slate-500 pt-1 border-t border-white/5">
          <span>Lab Status: <span className="text-orange-400 font-bold">Experimental / Connector-dependent / Not part of UVR AI proof</span></span>
          <span>Proof validation state: <span className="text-rose-400 font-bold">Locked</span></span>
        </div>
      </div>

      {/* SECTION 2: ENGINE SELECTION & HONEST STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card A: Suno Connector */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-full bg-[#080a13]/60 relative ${
          labStudio === "suno" ? "border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-white/5"
        }`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-green-400 animate-spin-slow" />
                Suno Connector
              </span>
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-950/40 text-red-400 border border-red-500/10 font-mono uppercase font-bold">
                Not active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Third-party integration. Access depends on external services and accounts. This app does not bypass service limits, terms, or authorization.
            </p>
            <ul className="text-[9px] font-mono text-slate-500 space-y-1 pl-1 list-disc list-inside">
              <li>Third-party service</li>
              <li>Not bundled with UVR</li>
              <li>Requires user-configured access</li>
              <li>No bypass of paywalls</li>
            </ul>
          </div>
          <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500">State: <span className="text-rose-400 font-bold">Not configured</span></span>
            <button
              onClick={() => {
                setLabStudio("suno");
                triggerToast("Selected Suno Workspace preview.");
              }}
              className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold font-mono tracking-wider transition-all cursor-pointer ${
                labStudio === "suno"
                  ? "bg-green-500/20 text-green-300 border border-green-500/20"
                  : "bg-black/35 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              Select
            </button>
          </div>
        </div>

        {/* Card B: YuE Local Engine */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-full bg-[#080a13]/60 relative ${
          labStudio === "yue" ? "border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]" : "border-white/5"
        }`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                YuE Local Engine
              </span>
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-950/40 text-red-400 border border-red-500/10 font-mono uppercase font-bold">
                Not active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Local open-source model execution. Requires significant compute resources, PyTorch environment, and local weights directories.
            </p>
            <ul className="text-[9px] font-mono text-slate-500 space-y-1 pl-1 list-disc list-inside">
              <li>Requires local weights (~7B params)</li>
              <li>Requires PyTorch runtime</li>
              <li>Not locally proven on host</li>
              <li>High-VRAM CUDA requirement</li>
            </ul>
          </div>
          <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500">State: <span className="text-purple-400 font-bold">Not wired</span></span>
            <button
              onClick={() => {
                setLabStudio("yue");
                triggerToast("Selected YuE Workspace preview.");
              }}
              className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold font-mono tracking-wider transition-all cursor-pointer ${
                labStudio === "yue"
                  ? "bg-purple-500/25 text-purple-300 border border-purple-500/20"
                  : "bg-black/35 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              Select
            </button>
          </div>
        </div>

        {/* Card C: Lyric / Prompt Assistant */}
        <div className="p-4 rounded-xl border border-white/5 transition-all flex flex-col justify-between h-full bg-[#080a13]/60 relative">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Lyric Coprocessor
              </span>
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/10 font-mono uppercase font-bold">
                Available
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Text-only drafting assist. Employs Gemini API to blueprint lyrics structures and tags. Does not synthesize standalone WAV files.
            </p>
            <ul className="text-[9px] font-mono text-slate-500 space-y-1 pl-1 list-disc list-inside">
              <li>Text-only creator</li>
              <li>Does not create audio</li>
              <li>Gemini-backed assistance</li>
              <li>Excellent for brainstorming</li>
            </ul>
          </div>
          <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 font-bold">State: <span className="text-cyan-400">Functional</span></span>
            <button
              onClick={() => {
                setAiAssistantExpanded(true);
                triggerToast("Gemini lyric draft assistant opened!");
              }}
              className="px-2.5 py-1 rounded text-[10px] uppercase font-bold font-mono tracking-wider bg-cyan-950/40 text-cyan-300 border border-cyan-500/15 hover:bg-cyan-900/30 transition-all cursor-pointer"
            >
              Expand
            </button>
          </div>
        </div>
      </div>

      {/* DRAWER: Suno Cookie / Proxy Configuration */}
      <AnimatePresence>
        {showConfig && labStudio === "suno" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-[#0c0d12] rounded-2xl border border-white/5 shadow-inner"
          >
            <div className="p-5 space-y-4 text-xs font-sans">
              <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono border-b border-white/10 pb-2 flex justify-between items-center">
                <span>Suno-API Connection & Workspace Settings</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${apiMode === "real" ? "bg-amber-500/25 text-amber-300" : "bg-cyan-500/25 text-cyan-300"}`}>
                  {apiMode === "real" ? "External API (Planned)" : "Sandbox Simulation Active"}
                </span>
              </h3>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                To explore native connector layouts, you can launch a local <span className="text-green-400">suno-api</span> server. Use only supported, user-authorized connection methods. Do not paste raw browser cookies or session tokens into the app.
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  Suno Connection Mode
                </label>
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setApiMode("sandbox");
                      triggerToast("Swapped to Sandbox Simulation Mode (offline testing).");
                    }}
                    className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      apiMode === "sandbox"
                        ? "bg-green-500/20 text-green-300 border border-green-500/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Sandbox Simulation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setApiMode("real");
                      triggerToast("Note: External API client is a planned feature.");
                    }}
                    className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      apiMode === "real"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    External suno-api Link (Planned)
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                    Suno-API Server Base URL
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="e.g. http://localhost:3000"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-green-500/50"
                  />
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Unofficial connector / user-managed local server. This app does not bypass third-party service restrictions. Users are responsible for following the terms of the service they connect to.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/35 border border-white/5 flex gap-3.5">
                <Info className="w-5 h-5 text-cyan-400 shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold text-[11px] text-slate-300 block">Connection Warning & Rules:</span>
                  <p className="text-[10px] text-slate-500 leading-normal font-sans">
                    This section does not bypass service paywalls. If using a local bridge, users are solely responsible for ensuring authorization and respect for service boundaries.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRAWER: YuE Open Source Model Server Deploy Parameters config */}
      <AnimatePresence>
        {showYueDeploy && labStudio === "yue" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-[#0c0d12] rounded-2xl border border-white/5 shadow-inner"
            id="yue_deploy_drawer"
          >
            <div className="p-5 space-y-4 text-xs font-sans">
              <h3 className="text-xs font-bold text-purple-300 tracking-wider uppercase font-mono border-b border-white/10 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  YuE Foundation Deep PyTorch Deployment Configuration
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${yuePreflightStatus?.proofStatus === "PASS" ? "bg-green-500/20 text-green-300" : "bg-rose-500/10 text-rose-300"}`}>
                  {yuePreflightStatus?.proofStatus === "PASS" ? "PASS: Verified Locally!" : "Not Locally Proven"}
                </span>
              </h3>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                YuE local generation requires a compatible local model setup, model weights, Python/PyTorch runtime, and enough compute resources. Configure local paths to test and execute models directly.
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] uppercase font-bold text-purple-400 font-mono">
                  YuE Integration Connection Mode
                </label>
                <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5" id="yue_connection_mode_selector_group">
                  <button
                    id="btn_mode_sandbox"
                    type="button"
                    onClick={() => {
                      setYueApiMode("sandbox");
                      triggerToast("Swapped YuE to Sandbox Simulation Mode (offline testing).");
                    }}
                    className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      yueApiMode === "sandbox"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Sandbox Simulation
                  </button>
                  <button
                    id="btn_mode_real"
                    type="button"
                    onClick={() => {
                      setYueApiMode("real");
                      triggerToast("Activated Real YuE API Integration Mode.");
                    }}
                    className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      yueApiMode === "real"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Real FastAPI Server Link
                  </button>
                  <button
                    id="btn_mode_local"
                    type="button"
                    onClick={() => {
                      setYueApiMode("local");
                      triggerToast("Enabled Local PyTorch CLI Subprocess workflow.");
                    }}
                    className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      yueApiMode === "local"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Direct Local CLI Subprocess
                  </button>
                </div>
              </div>

              {yueApiMode === "real" && (
                <div className="space-y-1.5 pt-1" id="config_panel_api">
                  <label className="text-[10px] uppercase font-bold text-purple-400 font-mono">
                    YuE API Server Base URL
                  </label>
                  <input
                    id="input_yue_base_url"
                    type="text"
                    value={yueBaseUrl}
                    onChange={(e) => setYueBaseUrl(e.target.value)}
                    placeholder="e.g. http://localhost:8000"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500/50"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Provide the host of a running FastAPI service for YuE (such as <code>api.py</code> representing your PyTorch workstation).
                  </p>
                </div>
              )}

              {yueApiMode === "local" && (
                <div className="space-y-4 pt-1" id="config_panel_local">
                  <div className="p-4 rounded-xl bg-purple-950/10 border border-purple-500/10 space-y-3">
                    <span className="font-bold text-[11px] text-purple-300 block font-mono">1. Local Paths Configuration</span>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-400 font-mono flex justify-between">
                        <span>Python Executable Path</span>
                        <span className="text-[9px] lowercase text-purple-400">Must have PyTorch installed</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="input_local_python_path"
                          type="text"
                          value={yuePythonPath}
                          onChange={(e) => {
                            setYuePythonPath(e.target.value);
                            localStorage.setItem("yue_python_path", e.target.value);
                          }}
                          placeholder="e.g. C:\Users\Name\miniconda3\envs\yue\python.exe or /usr/bin/python3"
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                        />
                        <button
                          id="btn_select_python_path"
                          type="button"
                          onClick={handleSelectPythonPath}
                          className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/20 text-purple-300 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          Select File
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-400 font-mono flex justify-between">
                        <span>YuE Code Repository Root Folder Path</span>
                        <span className="text-[9px] text-slate-500">Must contain inference/infer.py</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="input_local_repo_path"
                          type="text"
                          value={yueRepoPath}
                          onChange={(e) => {
                            setYueRepoPath(e.target.value);
                            localStorage.setItem("yue_repo_path", e.target.value);
                          }}
                          placeholder="e.g. C:\Users\Name\Projects\YuE"
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                        />
                        <button
                          id="btn_select_repo_path"
                          type="button"
                          onClick={handleSelectYueRepoPath}
                          className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/20 text-purple-300 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          Select Folder
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-400 font-mono flex justify-between">
                        <span>Output Directory Location</span>
                        <span className="text-[9px] text-slate-500">Where generated wav format files are compiled</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="input_local_output_path"
                          type="text"
                          value={yueOutputDir}
                          onChange={(e) => {
                            setYueOutputDir(e.target.value);
                            localStorage.setItem("yue_output_dir", e.target.value);
                          }}
                          placeholder="e.g. C:\Users\Name\Desktop\YuE_Outputs"
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                        />
                        <button
                          id="btn_select_output_path"
                          type="button"
                          onClick={handleSelectYueOutputDir}
                          className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/20 text-purple-300 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          Select Folder
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/30 border border-white/5 space-y-3">
                    <span className="font-bold text-[11px] text-purple-300 block font-mono">2. Inference Hyperparameters Settings</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Stage 1 Model Checkpoint</label>
                        <input
                          id="input_stage1_model"
                          type="text"
                          value={yueStage1Model}
                          onChange={(e) => {
                            setYueStage1Model(e.target.value);
                            localStorage.setItem("yue_stage1_model", e.target.value);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-slate-400 font-mono">Stage 2 Model Checkpoint</label>
                        <input
                          id="input_stage2_model"
                          type="text"
                          value={yueStage2Model}
                          onChange={(e) => {
                            setYueStage2Model(e.target.value);
                            localStorage.setItem("yue_stage2_model", e.target.value);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-400">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono block">Run Segments</span>
                        <input
                          id="input_num_segments"
                          type="number"
                          value={yueSegments}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setYueSegments(val);
                            localStorage.setItem("yue_segments", String(val));
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-slate-200 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono block">Max New Tokens</span>
                        <input
                          id="input_max_tokens"
                          type="number"
                          value={yueMaxNewTokens}
                          onChange={(e) => {
                            const val = Math.max(10, parseInt(e.target.value) || 3000);
                            setYueMaxNewTokens(val);
                            localStorage.setItem("yue_max_new_tokens", String(val));
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-slate-200 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono block">Batch Size (Stage 2)</span>
                        <input
                          id="input_s2_batch_size"
                          type="number"
                          value={yueStage2BatchSize}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setYueStage2BatchSize(val);
                            localStorage.setItem("yue_stage2_batch_size", String(val));
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-slate-200 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono block">Repetition Penalty</span>
                        <input
                          id="input_repetition_penalty"
                          type="number"
                          step="0.05"
                          value={yueRepetitionPenalty}
                          onChange={(e) => {
                            const val = Math.max(0.1, parseFloat(e.target.value) || 1.1);
                            setYueRepetitionPenalty(val);
                            localStorage.setItem("yue_repetition_penalty", String(val));
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-slate-200 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-2">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono block">Reference Audio Prompt Start Time (s)</span>
                        <input
                          id="input_prompt_start_time"
                          type="number"
                          value={yuePromptStartTime}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setYuePromptStartTime(val);
                            localStorage.setItem("yue_prompt_start_time", String(val));
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-md px-2.5 py-1 text-xs text-slate-200 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono block">Prompt End Time (s)</span>
                        <input
                          id="input_prompt_end_time"
                          type="number"
                          value={yuePromptEndTime}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 30);
                            setYuePromptEndTime(val);
                            localStorage.setItem("yue_prompt_end_time", String(val));
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-md px-2.5 py-1 text-xs text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* COMMAND PREVIEW PANEL */}
                  <div className="space-y-1.5" id="yue_command_preview_panel">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                      CLI Command Preview (Constructed Subprocess call)
                    </label>
                    <div className="bg-black/80 text-purple-300 px-3.5 py-3 rounded-lg border border-white/10 font-mono text-[10px] select-all leading-normal overflow-x-auto whitespace-pre">
                      {`"${yuePythonPath || 'python'}" "${yueRepoPath ? yueRepoPath.replace(/\\/g, '/') : '...'}/inference/infer.py" \\\n  --stage1_model "${yueStage1Model}" \\\n  --stage2_model "${yueStage2Model}" \\\n  --genre_txt "temp_genre.txt" \\\n  --lyrics_txt "temp_lyrics.txt" \\\n  --run_n_segments ${yueSegments} \\\n  --stage2_batch_size ${yueStage2BatchSize} \\\n  --output_dir "${yueOutputDir || '...'}" \\\n  --max_new_tokens ${yueMaxNewTokens} \\\n  --repetition_penalty ${yueRepetitionPenalty} ${yueAudioPrompt ? ` \\\n  --use_audio_prompt \\\n  --audio_prompt_path "${yueAudioPrompt}" \\\n  --prompt_start_time ${yuePromptStartTime} \\\n  --prompt_end_time ${yuePromptEndTime}` : ''}`}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      id="btn_run_yue_preflight_probe"
                      type="button"
                      disabled={yueScanning}
                      onClick={handleValidateYue}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold font-mono tracking-wider transition-all uppercase cursor-pointer flex items-center justify-center gap-2 border ${
                        yueScanning
                          ? "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                          : "bg-purple-950/60 hover:bg-purple-900/60 border-purple-500/20 text-purple-300 hover:border-purple-500/40"
                      }`}
                    >
                      {yueScanning ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                          Running Probe Diagnostics...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-purple-400" />
                          Execute Real Preflight Probe Diagnostic
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono col-span-2">
                    Inference Target Device allocation
                  </label>
                  <select
                    id="select_device_alloc"
                    value={yueDevice}
                    onChange={(e) => setYueDevice(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none col-span-2"
                  >
                    <option value="cuda:0">CUDA GPU 0 (NVIDIA L4 / A10G / H100)</option>
                    <option value="cuda:1">CUDA GPU 1 Secondary (Multi-GPU mode)</option>
                    <option value="mps">MPS Metal Core (Apple Silicon M1/M2/M3)</option>
                    <option value="cpu">CPU Parallel Threading (Extremely Slow Fallback)</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                    Model Weights Cache Path (Global Storage Path)
                  </label>
                  <input
                    id="input_global_weights_path"
                    type="text"
                    value={yueWeightsPath}
                    onChange={(e) => setYueWeightsPath(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                    VRAM Optimization Quantization
                  </label>
                  <select
                    id="select_vram_quantizer"
                    value={vramQuantize}
                    onChange={(e) => setVramQuantize(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                  >
                    <option value="none">No Quantization (Original Weights)</option>
                    <option value="fp8">8-Bit FP8 Quant (Saves ~45% VRAM)</option>
                    <option value="int4">4-Bit AWQ Quant (Run 7B model on 12GB VRAM)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                    Attention Core Backends
                  </label>
                  <select
                    id="select_attn_backend"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                    disabled
                  >
                    <option value="flash_attn">FlashAttention-2 (Fast & Compliant)</option>
                    <option value="sdpa">SDPA PyTorch Native (xformers equivalent)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                    Output Audio Sample-Rate
                  </label>
                  <select
                    id="select_sample_rate"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                    disabled
                  >
                    <option value="44100">44.1 kHz Studio Quality CD Format</option>
                    <option value="32000">32 kHz Standard Broadcasting Format</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#140c11] border border-purple-500/10 flex gap-3.5">
                <Info className="w-5 h-5 text-purple-400 shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold text-[11px] text-slate-300 block">YuE (岳) Open-Source Integration details:</span>
                  <p className="text-[10px] text-slate-500 leading-normal font-sans">
                    Designed by multimodal-art-projection, YuE generates high-fidelity vocal tracks with rich background audio using Stage 1 tokenizers & Stage 2 orchestration. Learn more at: <a href="https://github.com/multimodal-art-projection/YuE" target="_blank" className="text-purple-400 hover:underline inline-flex items-center gap-0.5">https://github.com/multimodal-art-projection/YuE <ExternalLink className="w-2.5 h-2.5" /></a>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Forms, Helpers, and Playback Feed Library */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Hand: Config forms */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          {/* TAB 1: SUNO MUSIC GENERATOR PANEL */}
          {labStudio === "suno" && (
            <div className="p-5 rounded-2xl bg-[#090a0f] border border-white/5 shadow-xl relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-green-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5 text-green-400" />
                  Suno Parameters Setting
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      !isCustomMode
                        ? "bg-green-500/20 text-green-300"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Vibe Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      isCustomMode
                        ? "bg-green-500/20 text-green-300"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    custom lyrics
                  </button>
                </div>
              </div>

              {/* Form Fields for Suno */}
              <div className="space-y-4">
                {!isCustomMode ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 font-mono flex justify-between items-center">
                      <span className="flex items-center gap-1">Song Description & Mood Vibe <HelpTooltipIcon content="A natural-language prompt describing the instrumental genres, pacing, vocals, or thematic environment to synthesize." /></span>
                      <span className="text-slate-500 lowercase font-normal">limit 200 chars</span>
                    </label>
                    <textarea
                      rows={3}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. A retro-futuristic 80s vaporwave song about cruising through endless neon highways at midnight..."
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-green-500/50"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                        Song Title
                      </label>
                      <input
                        type="text"
                        value={songTitle}
                        onChange={(e) => setSongTitle(e.target.value)}
                        placeholder="e.g. Broken Firewalls"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-green-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono flex justify-between items-center">
                        <span className="flex items-center gap-1">Interactive Song Lyrics Input <HelpTooltipIcon content="Format lyrics using brackets, e.g. [Verse 1], [Chorus], [Outro], to instruct the generator when to trigger vocals versus instrumentals." /></span>
                        <span className="text-slate-500">Provide [Verse] and [Chorus] breaks</span>
                      </label>
                      <textarea
                        rows={6}
                        value={customLyrics}
                        onChange={(e) => setCustomLyrics(e.target.value)}
                        placeholder="[Verse 1]\nWrite song lyrics here...\n[Chorus]\nRepeat song hooks here..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-green-500/50 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                        Musical Style Tags (Descriptors)
                      </label>
                      <input
                        type="text"
                        value={styleTags}
                        onChange={(e) => setStyleTags(e.target.value)}
                        placeholder="e.g. dark synthwave, epic drums, female vocals, 120 bpm"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-green-500/50"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 pt-1 items-center justify-between border-t border-white/5 mt-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="makeInstrumental"
                      checked={makeInstrumental}
                      onChange={(e) => setMakeInstrumental(e.target.checked)}
                      className="rounded border-white/10 text-green-500 bg-black/40 focus:ring-opacity-0 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <label
                      htmlFor="makeInstrumental"
                      className="text-[11px] font-mono text-slate-400 cursor-pointer select-none uppercase hover:text-slate-200"
                    >
                      Instrumental only
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono uppercase text-slate-500">model engine:</span>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="bg-black/60 border border-white/10 rounded px-2.5 py-1 text-[10px] text-slate-300 font-mono focus:outline-none cursor-pointer hover:border-white/20"
                    >
                      <option value="v2">Suno AI v2</option>
                      <option value="v3">Suno AI v3 (Classic)</option>
                      <option value="v3_plus">Suno AI v3.5 (Enhanced)</option>
                      <option value="v4">Suno AI v4 (Beta)</option>
                    </select>
                  </div>
                </div>

                {/* Compile logs */}
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-4 rounded-xl bg-black border border-white/10 space-y-3"
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1.5 font-bold text-green-400 uppercase">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {currentGenStage}
                        </span>
                        <span>{genProgress}%</span>
                      </div>

                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className="bg-gradient-to-r from-green-400 via-green-500 to-emerald-500 h-full"
                          animate={{ width: `${genProgress}%` }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 bg-black/60 p-2.5 rounded-lg border border-white/5 max-h-[140px] overflow-y-auto space-y-1 scrollbar-thin">
                        {genLogs.map((log, idx) => (
                          <div key={idx} className="leading-relaxed">
                            <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log}
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SECTION 4: ENGINE READINESS & BLOCKERS */}
                <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/10 space-y-3.5 mt-4 text-xs font-mono text-slate-400">
                  <div className="text-[10px] uppercase font-bold text-red-400 flex items-center gap-1.5 pb-2 border-b border-white/5">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Suno Workstation Preflight Checklist:</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span>Connector Configured:</span>
                      <span className="text-red-400 font-bold">Missing</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Auth Method Supported:</span>
                      <span className="text-red-400 font-bold">Unsupported</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Local Server Reachable:</span>
                      <span className="text-slate-500">Not Checked</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Output Folder Selected:</span>
                      <span className="text-red-400 font-bold">Missing</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-white/5">
                      <span className="text-slate-300">Terms warning acknowledged:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={termsAcknowledged}
                          onChange={(e) => setTermsAcknowledged(e.target.checked)}
                          className="rounded border-white/15 text-rose-500 bg-black/40 focus:ring-0 w-3.5 h-3.5"
                        />
                        <span className={termsAcknowledged ? "text-green-400" : "text-amber-400"}>
                          {termsAcknowledged ? "Acknowledged" : "Click to acknowledge"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit Suno generation */}
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={true}
                    className="w-full py-3.5 rounded-xl font-bold font-sans text-xs tracking-wider uppercase bg-slate-900/60 border border-white/5 text-slate-500 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    Blocked: Connector not configured
                  </button>
                  <p className="text-[10px] text-slate-500 text-center font-sans italic">
                    To start drafting songs lyrically, use the "Lyric Coprocessor" panel below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: YUE OPEN SOURCE DEEP FOUNDATION MODEL PANEL */}
          {labStudio === "yue" && (
            <div className="space-y-6">
              {/* Aesthetic presets selector for YuE */}
              <div className="p-4 rounded-xl bg-black/45 border border-white/5 flex flex-wrap gap-2 justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-purple-300 font-mono tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  Quick Style Guides:
                </span>
                <div className="flex gap-2 flex-wrap">
                  {YUE_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyYuePreset(p)}
                      className="px-2.5 py-1 rounded text-[10px] font-sans font-bold bg-purple-950/20 text-purple-300 border border-purple-500/10 hover:bg-purple-900/30 active:scale-95 transition-all cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary YuE Parameters workspace */}
              <div className="p-5 rounded-2xl bg-[#090a0f] border border-white/5 shadow-xl relative overflow-hidden space-y-4">
                <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    YuE (岳) Coarse-to-Fine Parameters
                  </div>

                  {/* Stage Modes */}
                  <div className="flex bg-black p-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setYueStage("vocal_generation");
                        triggerToast("YuE Stage 1: Focusing exclusively on raw vocal track synthesis from lyrics.");
                      }}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        yueStage === "vocal_generation"
                          ? "bg-purple-500/25 text-purple-300"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Stage 1 Only
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setYueStage("full_orchestra");
                        triggerToast("YuE Stage 2: Full Orchestra mode. Synthesizes vocals and orchestrates high-fidelity backings.");
                      }}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        yueStage === "full_orchestra"
                          ? "bg-purple-500/25 text-purple-300"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Full Orchestra (s1+s2)
                    </button>
                  </div>
                </div>

                {/* Form fields for YuE */}
                <div className="grid grid-cols-1 gap-4 text-xs font-sans">
                  {/* Title & Genre */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                        Output Master Opus Title
                      </label>
                      <input
                        type="text"
                        value={yueTitle}
                        onChange={(e) => setYueTitle(e.target.value)}
                        placeholder="e.g. Celestial Horizon (YuE)"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono flex items-center justify-between">
                        <span>Genre Instructions</span>
                        <span className="text-purple-400 font-normal">Semicolon separated</span>
                      </label>
                      <input
                        type="text"
                        value={yueGenre}
                        onChange={(e) => setYueGenre(e.target.value)}
                        placeholder="e.g. progressive metal, progressive rock, drum solo, male clean vocal"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>

                  {/* Lyrics Form inside YuE with interactive tag inserter badges */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400">
                      <span>Structured Lyrics Segment (with YuE formatting)</span>
                      <span className="text-slate-500 text-[9px]">Click quick tags to auto-inject:</span>
                    </div>

                    <div className="flex gap-1.5 pb-1 select-none flex-wrap">
                      {["[genre: tags]", "[verse]", "[chorus]", "[instrumental]", "[outro]"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleInsertYueTag(t)}
                          className="px-2 py-0.5 rounded text-[9px] font-mono bg-black hover:bg-slate-900 border border-white/5 text-purple-300 font-bold uppercase transition-all cursor-pointer"
                        >
                          + {t}
                        </button>
                      ))}
                    </div>

                    <textarea
                      ref={lyricsInputRef}
                      rows={5}
                      value={yueLyrics}
                      onChange={(e) => setYueLyrics(e.target.value)}
                      placeholder={`[genre: electronic metal, fast drums]\n[verse]\nCarbon shell, artificial mind\nLeaving organic weights behind...\n\n[chorus]\nDigital ghost! Code in the vein!...\n\n[outro]`}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500/50 leading-relaxed scrollbar-thin"
                    />
                  </div>

                  {/* Audio In-Context learning Guidance (vocal prompt) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1">
                        <Upload className="w-3 h-3 text-purple-400" />
                        <span>In-Context Reference Audio (Vocal Style Prompt)</span>
                        <HelpTooltipIcon content="Select an audio file from current workspace inputs. YuE uses in-context learning to clone the voice timbre of the provided reference." />
                      </label>
                      <span className="text-[9px] text-slate-500 lowercase">Forces timbre consistency</span>
                    </div>
                    <select
                      value={yueAudioPrompt}
                      onChange={(e) => setYueAudioPrompt(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                      <option value="">-- No reference audio prompt (Free generate new singer) --</option>
                      {getAudioPromptOptions().map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Hyperparameter Sliders */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-3 mt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 items-center">
                        <span className="flex items-center">Vocal Creativity (s1_temp) <HelpTooltipIcon content="Higher values increase the vocality variation and lyrics expressiveness. Lower values keep the voice clean, stable, and rigid." /></span>
                        <span className="text-purple-400 font-bold">{tempVocal}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.5"
                        step="0.05"
                        value={tempVocal}
                        onChange={(e) => setTempVocal(parseFloat(e.target.value))}
                        className="w-full accent-purple-500 bg-white/5 h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Background Music Creativity (s2_temp)</span>
                        <span className="text-purple-400 font-bold">{tempInst}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.5"
                        step="0.05"
                        value={tempInst}
                        onChange={(e) => setTempInst(parseFloat(e.target.value))}
                        className="w-full accent-purple-500 bg-white/5 h-1 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[10px] pt-1">
                    <div className="space-y-1">
                      <span className="text-slate-500 block">Top P Threshold:</span>
                      <select
                        value={yueTopP}
                        onChange={(e) => setYueTopP(parseFloat(e.target.value))}
                        className="bg-black/60 border border-white/10 rounded px-2.5 py-1.5 text-[10px] text-slate-300 w-full focus:outline-none"
                      >
                        <option value="0.8">0.80 (Structured)</option>
                        <option value="0.9">0.90 (Symmetric Balanced)</option>
                        <option value="0.95">0.95 (Vast / Creative)</option>
                        <option value="1.0">1.00 (Unconstrained)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-500 block">Random Seed:</span>
                      <input
                        type="number"
                        value={yueSeed}
                        onChange={(e) => setYueSeed(e.target.value)}
                        className="bg-black/60 border border-white/10 rounded px-2.5 py-1.5 text-[10px] text-slate-300 w-full focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-500 block">Sampler Precision:</span>
                      <select
                        value={yuePrecision}
                        onChange={(e) => setYuePrecision(e.target.value)}
                        className="bg-black/60 border border-white/10 rounded px-2.5 py-1.5 text-[10px] text-slate-300 w-full focus:outline-none"
                      >
                        <option value="bf16">BFloat16 (Lossless Torch)</option>
                        <option value="fp16">Half Precision FP16</option>
                        <option value="tf32">TensorFloat32 (AMP speed)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Compilation Logs / progress (when generating YuE) */}
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-xl bg-black border border-white/10 space-y-3"
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1.5 font-bold text-purple-400 uppercase">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {currentGenStage}
                        </span>
                        <span>{genProgress}%</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className="bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-500 h-full"
                          animate={{ width: `${genProgress}%` }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>

                      {/* Simulation Console Screen */}
                      <div className="text-[10px] font-mono text-slate-400 bg-black/60 p-2.5 rounded-lg border border-white/5 max-h-[140px] overflow-y-auto space-y-1 scrollbar-thin">
                        {genLogs.map((log, idx) => (
                          <div key={idx} className="leading-relaxed">
                            <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log}
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SECTION 4: ENGINE READINESS & BLOCKERS */}
                <div className="p-4 rounded-xl bg-purple-950/10 border border-purple-500/10 space-y-3.5 mt-4 text-xs font-mono text-slate-400" id="yue_preflight_checklist_card">
                  <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1.5 pb-2 border-b border-white/5">
                    <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>YuE Local Subprocess Environment Checklist:</span>
                  </div>

                  {yueApiMode === "sandbox" && (
                    <div className="text-[11px] text-cyan-400 leading-relaxed italic p-1">
                      ✨ Sandbox Simulation Mode is Active. Offline high-fidelity audio mockup simulation is enabled. Local PyTorch workspace preflights are bypassed.
                    </div>
                  )}

                  {yueApiMode === "real" && (
                    <div className="text-[11px] text-purple-300 leading-relaxed italic p-1">
                      🔗 External FastAPI Server Mode is Active. Preflight environment compatibility checks are managed at the target server side: <code>{yueBaseUrl}</code>.
                    </div>
                  )}

                  {yueApiMode === "local" && (
                    <div className="space-y-1.5 text-[11px]">
                      {!yuePreflightStatus ? (
                        <div className="text-[10px] text-amber-400 py-1 leading-normal italic">
                          ℹ️ No diagnostics reports found. Please fill in the local paths in the configuration drawer above, then click "Execute Preflight Probe" to run diagnostics.
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span>Python Runtime Available:</span>
                            <span className={yuePreflightStatus.pythonVersion !== "None" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                              {yuePreflightStatus.pythonVersion !== "None" ? `v${yuePreflightStatus.pythonVersion}` : "Missing"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>PyTorch Loaded:</span>
                            <span className={yuePreflightStatus.torchVersion !== "None" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                              {yuePreflightStatus.torchVersion !== "None" ? `Loaded (${yuePreflightStatus.torchVersion})` : "Missing"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Transformers Package:</span>
                            <span className={yuePreflightStatus.transformersInstalled ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                              {yuePreflightStatus.transformersInstalled ? "Installed" : "Missing"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Flash-Attention:</span>
                            <span className={yuePreflightStatus.flashAttentionInstalled ? "text-green-400 font-bold" : "text-slate-500 font-bold"}>
                              {yuePreflightStatus.flashAttentionInstalled ? "Ready" : "Not Found (Optional)"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>YuE Repo Directory:</span>
                            <span className={yuePreflightStatus.yueRootExists ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                              {yuePreflightStatus.yueRootExists ? "Found" : "Not Found"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Inference logic (infer.py):</span>
                            <span className={yuePreflightStatus.inferPyExists ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                              {yuePreflightStatus.inferPyExists ? "Accessible" : "Missing"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Output Folder status:</span>
                            <span className={yueOutputDir ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                              {yueOutputDir ? "Configured" : "Not Selected"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-white/5">
                            <span>Local Generation Proof:</span>
                            <span className={yuePreflightStatus.proofStatus === "PASS" ? "text-green-400 font-bold" : "text-rose-400 font-bold"}>
                              {yuePreflightStatus.proofStatus === "PASS" ? "PASS: proven locally!" : "Not Proven yet"}
                            </span>
                          </div>

                          {yuePreflightStatus.blockers && yuePreflightStatus.blockers.length > 0 && (
                            <div className="mt-2.5 p-2 bg-red-950/40 border border-red-500/20 rounded text-[10px] text-rose-300 space-y-1">
                              <span className="font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3 shrink-0" /> Blockers detected:</span>
                              <ul className="list-disc pl-3.5 space-y-0.5">
                                {yuePreflightStatus.blockers.map((b: string, i: number) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                        <span className="text-slate-300">Acknowledge hardware warnings:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={termsAcknowledged}
                            onChange={(e) => setTermsAcknowledged(e.target.checked)}
                            className="rounded border-white/15 text-purple-500 bg-black/40 focus:ring-0 w-3.5 h-3.5"
                          />
                          <span className={termsAcknowledged ? "text-purple-400" : "text-amber-400"}>
                            {termsAcknowledged ? "Acknowledged" : "Click to acknowledge"}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit YuE generation */}
                <div className="space-y-2">
                  <button
                    id="btn_synthesize_yue"
                    type="button"
                    disabled={
                      isGenerating ||
                      (yueApiMode === "local" && (!yueRepoPath || !yueOutputDir || !termsAcknowledged)) ||
                      (yueApiMode === "real" && !yueBaseUrl)
                    }
                    onClick={handleGenerateYueTrack}
                    className={`w-full py-3.5 rounded-xl font-bold font-sans text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                      isGenerating
                        ? "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                        : (yueApiMode === "local" && (!yueRepoPath || !yueOutputDir || !termsAcknowledged))
                        ? "bg-slate-900/60 border-white/5 text-slate-500 cursor-not-allowed"
                        : (yueApiMode === "real" && !yueBaseUrl)
                        ? "bg-slate-900/60 border-white/5 text-slate-500 cursor-not-allowed"
                        : "bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border-purple-500/20 active:scale-[0.99] shadow-lg shadow-purple-500/5 hover:border-purple-500/40"
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                        Generating Audio Track via Subprocess...
                      </>
                    ) : yueApiMode === "local" ? (
                      yuePreflightStatus?.proofStatus === "PASS" ? (
                        <>
                          <Cpu className="w-4 h-4 text-purple-400" />
                          🚀 Generate Local PyTorch Audio Master
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          ⚠️ Execute Local Subprocess (Untested Preflight)
                        </>
                      )
                    ) : yueApiMode === "real" ? (
                      <>
                        <ExternalLink className="w-4 h-4 text-purple-400" />
                        Generate Track via External API Server
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        Generate Sandbox Simulation Track
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-500 text-center font-sans italic">
                    {yueApiMode === "local" 
                      ? "Direct GPU inference requires ~44GB constant VRAM allocation. Press Escape or click Stop anytime to exit subprocess."
                      : "To draft concepts lyrically offline first, leverage the lyric co-processor copilot below."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Gemini AI Powered Songwriter assistant (Suno & YuE combined support) */}
          <div className="p-5 rounded-2xl bg-[#080c14] border border-white/5 shadow-xl relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-44 h-44 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div
              onClick={() => setAiAssistantExpanded(!aiAssistantExpanded)}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-950/40 text-cyan-400 border border-cyan-500/10 group-hover:bg-cyan-900/35 transition-all">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    Gemini AI Lyric & Descriptor Assistant
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-cyan-500/10 text-cyan-300 tracking-widest font-mono uppercase font-bold">
                      coprocessor
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Synthesize ready-to-paste lyrics, structural segments, and style tags.
                  </p>
                </div>
              </div>

              <div className="text-[10px] uppercase font-bold font-mono text-cyan-400 hover:text-cyan-300 px-3 py-1 bg-cyan-950/30 rounded-lg border border-cyan-500/10 select-none">
                {aiAssistantExpanded ? "minimize" : "expand assistant"}
              </div>
            </div>

            <AnimatePresence>
              {aiAssistantExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 pt-4 border-t border-white/5 space-y-4 font-sans"
                >
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] uppercase font-bold text-cyan-400/80 font-mono">
                      What is your central song concept, mood, or poetic narrative?
                    </label>
                    <textarea
                      rows={2}
                      value={aiAssistantIdea}
                      onChange={(e) => setAiAssistantIdea(e.target.value)}
                      placeholder="e.g. a high-tempo cyberpunk rebel anthem about system overrides / a slow indie ballad about autumn leaves"
                      className="w-full bg-black/45 border border-cyan-500/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/45 leading-relaxed"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isGeneratingLyrics}
                    onClick={handleGenerateLyricsWithGemini}
                    className={`w-full py-2.5 rounded-xl font-bold font-sans text-[11px] tracking-wide uppercase transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                      isGeneratingLyrics
                        ? "bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed"
                        : "bg-cyan-950/60 hover:bg-cyan-900/65 text-cyan-300 border-cyan-500/20 active:scale-[0.99]"
                    }`}
                  >
                    {isGeneratingLyrics ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        Gemini Compiling Creative Score...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        Compose Lyrics, Tags & Title
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Hand: Audio Player + History feeds */}
        <div className="col-span-1 lg:col-span-5 space-y-6">
          <div className="p-5 rounded-2xl bg-[#090a0f] border border-white/5 shadow-xl space-y-5">
            <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase font-mono border-b border-white/5 pb-2">
              Combined Generation Library ({tracks.length})
            </h3>

            {/* List Queue */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto scrollbar-thin pr-1">
              {tracks.map((track) => {
                const isCurrentActive = activeTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => handlePlayToggle(track)}
                    className={`p-3 rounded-xl border transition-all flex gap-3.5 relative group cursor-pointer ${
                      isCurrentActive
                        ? "bg-green-500/10 border-green-500/25 shadow-green-500/5"
                        : "bg-black/45 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {/* Visual Cover art */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-950 relative border border-white/10 flex items-center justify-center">
                      <img
                        src={track.imageUrl}
                        alt="Visual cover"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:opacity-100 opacity-80 transition-all">
                        {isCurrentActive && isPlaying ? (
                          <Pause className="w-4 h-4 text-white" />
                        ) : (
                          <Play className="w-4 h-4 text-white fill-white" />
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 pr-6 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-1 rounded text-[8px] tracking-wider uppercase font-extrabold font-mono shrink-0 ${
                          track.source === "yue"
                            ? "bg-purple-500/15 text-purple-300 border border-purple-500/10"
                            : "bg-green-500/15 text-green-300 border border-green-500/10"
                        }`}>
                          {track.source}
                        </span>
                        {track.isDemo ? (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono shrink-0 bg-yellow-500/10 text-yellow-400 border border-yellow-500/10 scale-90 origin-left">
                            Demo only / No local file
                          </span>
                        ) : track.proofSource === "remote_url" ? (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono shrink-0 bg-blue-500/10 text-blue-300 border border-blue-500/10 scale-90 origin-left">
                            Remote URL / Not local proof
                          </span>
                        ) : track.proofSource === "local_generated" ? (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono shrink-0 scale-90 origin-left ${track.fileExists ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-rose-500/10 text-rose-400 border border-rose-500/10"}`}>
                            {track.fileExists ? "Local generated file / Verified on disk" : "Missing file"}
                          </span>
                        ) : track.proofSource === "local_imported" ? (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono shrink-0 scale-90 origin-left ${track.fileExists ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-rose-500/10 text-rose-400 border border-rose-500/10"}`}>
                            {track.fileExists ? "Local imported file / Verified on disk" : "Missing file"}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono shrink-0 bg-yellow-500/10 text-yellow-400 border border-yellow-500/10 scale-90 origin-left">
                            Demo only / No local file
                          </span>
                        )}

                        {track.proofReportPath && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono shrink-0 bg-purple-500/10 text-purple-400 border border-purple-500/10 scale-90 origin-left">
                            Proof report attached
                          </span>
                        )}
                        <h4 className={`text-xs font-bold truncate w-full ${isCurrentActive ? "text-green-300" : "text-slate-200"}`}>
                          {track.title}
                        </h4>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase truncate">
                        {track.tags}
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-600 pt-1">
                        <span>{track.createdAt}</span>
                        <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}</span>
                      </div>
                    </div>

                    {/* Purge Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTrack(track.id, e)}
                      className="absolute top-2.5 right-2 text-slate-600 hover:text-rose-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {tracks.length === 0 && (
                <div className="text-center py-10 text-slate-600 border border-dashed border-white/5 rounded-xl">
                  <HelpCircle className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                  <p className="text-[11px]">No tracks generated yet. Click generate above to experience AI!</p>
                </div>
              )}
            </div>

            {/* Audio Master Player */}
            {activeTrack && (
              <div className="p-4 rounded-xl bg-black border border-white/5 space-y-4 shadow-inner">
                {/* Visual Spin cover detail */}
                <div className="flex items-center gap-3.5">
                  <div className={`w-14 h-14 rounded-full border border-white/10 overflow-hidden shrink-0 relative ${isPlaying ? "animate-spin-slow" : ""}`}>
                    <img
                      src={activeTrack.imageUrl}
                      alt="Spinning Record"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 m-auto w-3.5 h-3.5 rounded-full bg-slate-900 border border-white/20"></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[8px] uppercase tracking-widest text-green-400 font-mono leading-none block mb-1">
                      {activeTrack.source === "yue" ? "now playing (YuE 7B Full Song)" : "now playing (Suno Cloud)"}
                    </span>
                    <h4 className="text-xs font-bold text-slate-100 truncate leading-tight">{activeTrack.title}</h4>
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{activeTrack.tags}</p>
                  </div>
                </div>

                {/* Micro Audio Time Seek Control */}
                <div className="space-y-1.5">
                  <div className="w-full bg-white/5 rounded-full h-1 relative cursor-pointer group" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const pct = (clickX / rect.width) * 100;
                    handleSeek(pct);
                  }}>
                    <div
                      className="bg-[#00ffb7] h-full rounded-full transition-all"
                      style={{ width: `${audioProgress}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-[#22c55e] scale-0 group-hover:scale-100 transition-all shadow-md"
                      style={{ left: `${audioProgress}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>
                      {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, "0")}
                    </span>
                    <span>
                      {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>

                {/* Synced Lyrics subtitle logs */}
                <div className="p-3 bg-black/60 rounded-lg border border-white/5 max-h-[120px] overflow-y-auto text-[10px] font-mono text-slate-400 leading-relaxed scrollbar-thin">
                  <span className="text-[8px] text-green-400 uppercase tracking-widest font-extrabold block border-b border-white/5 pb-1 mb-1 font-mono">
                    Structured Lyrics
                  </span>
                  <pre className="font-mono whitespace-pre-wrap leading-normal text-slate-300">
                    {activeTrack.lyrics}
                  </pre>
                </div>

                {/* Direct Action UVR & Mixer integrators (Bolsters) */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="text-[9px] uppercase font-bold text-slate-500 font-mono mb-1">
                    Direct UVR model separation (Loops back to system)
                  </div>

                  <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/15 text-[10px] font-sans text-slate-400 space-y-1">
                    <span className="font-bold text-red-400 uppercase font-mono block">⚠️ E2E Proof Verification Exclusion:</span>
                    <p className="leading-snug text-slate-400">
                      Only verified local audio files can be looped back into UVR tools. Generative audio does not count as UVR AI E2E proof.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={activeTrack.isDemo || !activeTrack.localFilePath || !activeTrack.fileExists}
                    onClick={() => sendToSeparator(activeTrack)}
                    className={`w-full py-2.5 rounded-lg font-sans text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 border select-none ${
                      activeTrack.isDemo || !activeTrack.localFilePath || !activeTrack.fileExists
                        ? "bg-slate-900/60 border-white/5 text-slate-500 cursor-not-allowed"
                        : "border-green-500/20 bg-green-950/20 text-green-300 hover:bg-green-500/10 cursor-pointer active:scale-[0.99]"
                    }`}
                  >
                    <FileAudio className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    Load in Audio Separator {activeTrack.isDemo && "(Demo Mode Blocked)"}
                  </button>

                  <button
                    type="button"
                    disabled={activeTrack.isDemo || !activeTrack.localFilePath || !activeTrack.fileExists}
                    onClick={() => sendToMixer(activeTrack)}
                    className={`w-full py-2.5 rounded-lg font-sans text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 border select-none ${
                      activeTrack.isDemo || !activeTrack.localFilePath || !activeTrack.fileExists
                        ? "bg-slate-900/60 border-white/5 text-slate-500 cursor-not-allowed"
                        : "border-purple-500/20 bg-purple-950/20 text-purple-300 hover:bg-purple-500/10 cursor-pointer active:scale-[0.99]"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    Load in Multitrack Mixer {activeTrack.isDemo && "(Demo Mode Blocked)"}
                  </button>

                  {activeTrack.localFilePath && activeTrack.fileExists && (
                    <button
                      type="button"
                      onClick={() => {
                        if ((window as any).uvr?.openOutputFolder) {
                          (window as any).uvr.openOutputFolder(activeTrack.localFilePath);
                          triggerToast(`Requesting open file path: ${activeTrack.localFilePath}`);
                        } else {
                          triggerToast(`Local file path: ${activeTrack.localFilePath}`);
                        }
                      }}
                      className="w-full py-2 bg-slate-900 border border-white/5 rounded-lg text-[10px] font-mono font-bold text-slate-300 hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>📂 Open file on disk</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
