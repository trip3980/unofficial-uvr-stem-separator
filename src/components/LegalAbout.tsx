// src/components/LegalAbout.tsx
import React, { useState } from "react";
import { AlertTriangle, Book, FileText, Code2, Copyright, ChevronDown, ChevronUp, Info, User, ShieldCheck, Box, MicOff, Settings2, Activity, FileCheck } from "lucide-react";

export default function LegalAbout() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    status: true,
    engine: true,
    info: true,
    readme: false,
    proof: false,
    integrity: false,
    disclaimers: false,
    featureBoundaries: false,
    affiliations: false,
    unavailable: false,
    modules: false,
    credits: false,
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Status Banner */}
      <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-xl overflow-hidden hover:border-yellow-500/50 transition-colors">
        <button 
          onClick={() => toggleSection("status")}
          className="w-full flex items-center justify-between p-4 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-yellow-400 uppercase tracking-widest text-sm font-mono">Build Status</span>
          </div>
          {openSections.status ? <ChevronUp className="w-5 h-5 text-yellow-500" /> : <ChevronDown className="w-5 h-5 text-yellow-600" />}
        </button>
        {openSections.status && (
          <div className="p-5 border-t border-yellow-500/20">
            <h3 className="text-yellow-400 font-bold font-mono text-sm uppercase tracking-wider mb-2">Hardened Functional Alpha Build Active</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              This workstation is an independent alpha implementation. Upstream-only release controls and direct unverified downloads are deactivated or unavailable here for source integrity and safety.
            </p>
          </div>
        )}
      </div>

      {/* Platform Engine Mode */}
      <div className="border border-white/5 bg-[#0c0f1d]/60 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
        <button 
          onClick={() => toggleSection("engine")}
          className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-slate-200 uppercase tracking-widest text-sm font-mono">Platform Engine Mode</span>
          </div>
          {openSections.engine ? <ChevronUp className="w-5 h-5 text-emerald-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
        </button>
        {openSections.engine && (
          <div className="p-5 border-t border-white/5">
            {!(window as any).uvr ? (
              <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-300 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  SANDBOX DEMO MODE
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  Applet is running in-browser. Actions are preview-only and cannot run native downloads, model verification, or real audio separation.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-green-300 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  NATIVE DESKTOP ACTIVE
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  Running in the desktop wrapper with access to native Python checks, local model folders, and proof-gated separation flows.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header Info */}
      <div className="border border-green-500/20 bg-green-950/10 rounded-xl overflow-hidden hover:border-green-500/30 transition-colors">
        <button 
          onClick={() => toggleSection("info")}
          className="w-full flex items-center justify-between p-4 bg-green-900/20 hover:bg-green-800/30 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-green-400" />
            <span className="font-bold text-green-300 uppercase tracking-widest text-sm font-mono">Project Identity</span>
          </div>
          {openSections.info ? <ChevronUp className="w-5 h-5 text-green-500" /> : <ChevronDown className="w-5 h-5 text-green-600/50" />}
        </button>
        {openSections.info && (
          <div className="p-5 border-t border-green-500/20 space-y-4">
            <h2 className="text-2xl font-display font-bold text-green-300 mb-2">
              OpenStem AI Audio Workstation v1.0.0 — Hardened Functional Alpha
            </h2>
            <p className="text-emerald-400 font-mono text-sm">Local AI audio separation and stem workflow tools.</p>
            
            <p className="text-slate-300 font-sans text-sm leading-relaxed">
              OpenStem AI Audio Workstation is an independent, AI-assisted, human-directed desktop audio workstation for local source separation, model management, stem review, batch encoding, MIDI extraction, and experimental AI music workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <div className="bg-green-900/40 border border-green-500/30 rounded-lg p-3 flex-1 flex items-center gap-3">
                 <User className="w-5 h-5 text-green-400 shrink-0" />
                 <p className="text-green-300 text-xs font-mono w-full">
                   <strong className="block mb-1">Created by: Robert Sawin</strong>
                   <strong className="block text-emerald-400/80">GitHub: Trip3980</strong>
                 </p>
              </div>
              <div className="bg-[#0f111c]/80 border border-slate-700/30 rounded-lg p-3 flex-1 flex items-start gap-3">
                 <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-slate-300 text-xs font-sans leading-relaxed">
                   <strong>Independent Project Notice:</strong> OpenStem uses user-configured local models and backend tools where available. OpenStem is not the official Ultimate Vocal Remover project and is not affiliated with, approved by, endorsed by, or maintained by the original Ultimate Vocal Remover developers.
                 </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Project Readme & Goals */}
        <div className="border border-white/5 bg-[#0c0f1d]/60 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
          <button 
            onClick={() => toggleSection("readme")}
            className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Book className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-slate-200 uppercase tracking-widest text-sm font-mono">Project Readme & Goals</span>
            </div>
            {openSections.readme ? <ChevronUp className="w-5 h-5 text-emerald-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          
          {openSections.readme && (
            <div className="p-5 border-t border-white/5 space-y-4 text-sm text-slate-300 font-sans leading-relaxed">
              <p>Welcome to OpenStem AI Audio Workstation, currently in <span className="text-yellow-400 font-bold uppercase text-[11px] bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Hardened Functional Alpha</span>.</p>
              
              <div className="space-y-2">
                <h4 className="text-emerald-400 font-bold font-mono text-xs uppercase tracking-wider">The Core Objective</h4>
                <p>
                  OpenStem aims to provide a creative audio workstation that reduces Python setup confusion, command-line work, model-folder guesswork, CUDA troubleshooting, unclear exports, and backend ambiguity. It is designed to preserve the practical UVR-style workflow while allowing newer models and backend libraries to be added through clean adapters instead of complete rewrites.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* AI Separation Proof Status */}
        <div className="border border-white/5 bg-[#0c0f1d]/60 rounded-xl overflow-hidden hover:border-blue-500/20 transition-colors">
          <button 
            onClick={() => toggleSection("proof")}
            className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-slate-200 uppercase tracking-widest text-sm font-mono">AI Separation Proof Status</span>
            </div>
            {openSections.proof ? <ChevronUp className="w-5 h-5 text-blue-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          
          {openSections.proof && (
            <div className="p-5 border-t border-white/5 space-y-4 text-sm text-slate-300">
              <p className="font-bold text-blue-300 bg-blue-900/20 p-2 rounded-lg border border-blue-500/20">One verified local CPU E2E stem-separation proof lane has completed; Beta Candidate still requires final release checklist review and user approval.</p>
              
              <p>A valid AI E2E proof requires:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
                <li>real Python,</li>
                <li>real backend dependencies,</li>
                <li>FFmpeg,</li>
                <li>a verified model file,</li>
                <li>a real input audio file,</li>
                <li>a real output folder,</li>
                <li>backend execution,</li>
                <li>exit code 0,</li>
                <li>non-empty AI-generated output stems confirmed on disk.</li>
              </ul>
              
              <div className="bg-blue-950/20 p-4 rounded-lg border border-blue-500/10 mt-4 space-y-3 text-xs text-slate-300">
                <p><strong>Never assume local success until verification status reads Verified.</strong></p>
                <p>FFmpeg fallback is useful for DSP, encoding, probing, filtering, and conversion, but it is not neural source separation.</p>
                <p>Models are treated as unverified unless local checksum parity is proven.</p>
                <p>A single golden proof model may validate one CPU E2E vertical slice only. It does not prove the full catalog, GPU acceleration, every OS, or all model architectures.</p>
              </div>
            </div>
          )}
        </div>

        {/* Source Integrity & Model Verification Policy */}
        <div className="border border-white/5 bg-[#0c0f1d]/60 rounded-xl overflow-hidden hover:border-indigo-500/20 transition-colors">
          <button 
            onClick={() => toggleSection("integrity")}
            className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Box className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-slate-200 uppercase tracking-widest text-sm font-mono">Source Integrity & Model Verification Policy</span>
            </div>
            {openSections.integrity ? <ChevronUp className="w-5 h-5 text-indigo-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          
          {openSections.integrity && (
            <div className="p-5 border-t border-white/5 space-y-4 text-sm text-slate-300">
              <p className="leading-relaxed">
                OpenStem does not treat a model as safe or runnable merely because it appears in the UI. Models require verified source metadata, expected filename, expected size, expected SHA-256, compatible backend, license information, and local hash verification where available. Models without verified sources are labeled Manual Import Required, Source Missing, Hash Missing, Needs Verification, or Unavailable.
              </p>
            </div>
          )}
        </div>

        {/* Global Disclaimers Section */}
        <div className="border border-white/5 bg-[#0c0f1d]/60 rounded-xl overflow-hidden hover:border-rose-500/20 transition-colors">
          <button 
            onClick={() => toggleSection("disclaimers")}
            className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="font-bold text-slate-200 uppercase tracking-widest text-sm font-mono">Global Disclaimers</span>
            </div>
            {openSections.disclaimers ? <ChevronUp className="w-5 h-5 text-rose-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          
          {openSections.disclaimers && (
            <div className="p-5 border-t border-white/5 space-y-6 text-sm">
              <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/10 space-y-2">
                <h4 className="text-orange-400 font-bold flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                   Hardware Disclaimer
                </h4>
                <p className="text-slate-400 leading-relaxed text-xs">
                  CUDA, MPS, and DirectML behavior is backend-dependent and not locally proven until a real E2E separation proof passes on the current machine. The browser preview and mixer UI do not prove hardware acceleration.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-2">
                <h4 className="text-slate-300 font-bold flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  FFmpeg Disclaimer
                </h4>
                <p className="text-slate-400 leading-relaxed text-xs">
                  FFmpeg fallback is non-AI FFmpeg-based processing. It may use static DSP/filtering behavior depending on the selected fallback mode, but it is not neural-network source separation. Batch encoding, downmixing, resampling, trimming, and format conversion do not isolate stems and do not improve the acoustic resolution of already-separated files.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/10 space-y-2">
                <h4 className="text-rose-400 font-bold flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  Absolute Honesty Disclaimer
                </h4>
                <p className="text-slate-400 leading-relaxed text-xs">
                  Standard formatting, downmixing, resampling, transcoding, and batch DSP do not pass through neural source-separation models unless a real AI backend is selected and verified. These tools do not isolate stems or repair artifacts created during separation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                <h4 className="text-amber-500 font-bold flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" /> Audio Separation Integrity
                </h4>
                <p className="text-slate-300 text-xs">
                  Stems are not perfect originals. Source separation estimates audio components from a mixed signal. Isolated vocals or instruments may contain bleed, wateriness, metallic artifacts, phase artifacts, or missing frequencies.
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-400 text-xs leading-relaxed">
                  <li><strong className="text-slate-300">Model and song dependency:</strong> Results depend on source material, arrangement density, reverb, mastering, instrumentation overlap, and selected model behavior.</li>
                  <li><strong className="text-slate-300">Mixer limitation:</strong> Balancing faders, panning, trim, EQ, or phase tools cannot undo artifacts created during the neural prediction stage.</li>
                  <li><strong className="text-slate-300">Phase and trim warning:</strong> Phase inversion, bleed reduction, normalization, and high-frequency trim can degrade audio if used aggressively. These tools must be labeled planned, preview-only, or wired depending on actual implementation.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-black/20 space-y-2 text-slate-300 text-xs leading-relaxed">
                <h4 className="text-purple-400 font-bold flex items-center gap-2 font-mono uppercase tracking-wider">
                  <FileText className="w-4 h-4" /> Generative Audio & Usage Rights
                </h4>
                <p>
                  Experimental music-generation tools depend on user-configured local models, user-managed services, or explicitly supported connectors. Users are responsible for credentials, endpoints, service terms, generated content, and downstream rights. The workstation authors do not grant commercial rights to generated output. No service-limit bypass, paywall bypass, cookie/session-token workflow, or unauthorized access method is provided or supported.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* New Feature Boundary Section */}
        <div className="border border-white/5 bg-[#0c0f1d]/60 rounded-xl overflow-hidden hover:border-emerald-500/20 transition-colors">
          <button
            onClick={() => toggleSection("featureBoundaries")}
            className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-slate-200 uppercase tracking-widest text-sm font-mono">
                Local Tools, Draft Workflows & Proof Boundaries
              </span>
            </div>
            {openSections.featureBoundaries ? (
              <ChevronUp className="w-5 h-5 text-emerald-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {openSections.featureBoundaries && (
            <div className="p-5 border-t border-white/5 space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <BoundaryCard
                  title="Local Transcription"
                  text="Speech-to-text workflows are separate from stem separation. Whisper-family readiness, VTT import, speaker rename, and transcript export do not verify separator model weights or approve Beta Candidate."
                />
                <BoundaryCard
                  title="Transcript Workflow Builder"
                  text="Prompt libraries, Deep Read, SubQ planning, evidence organization, and final text assembly are local-first workflow tools. They are draft outputs until reviewed and do not prove source separation."
                />
                <BoundaryCard
                  title="Clinical Workflow"
                  text="Clinical notes are draft-only and require qualified user review before EHR use. OpenStem uses HIPAA-aware language, but this is not automatic HIPAA compliance and does not claim formal approval or medical-device status."
                />
                <BoundaryCard
                  title="Mastering Lab"
                  text="Mastering finalizes audio only after real processing and native output verification. It does not promise pro-grade mastering results, replace a mastering engineer, or satisfy AI stem-separation proof."
                />
                <BoundaryCard
                  title="Document Export"
                  text="TXT, JSON, PDF, DOCX, VTT, SRT, and archive exports remain output-not-verified until a native writer confirms a real file with nonzero size at the approved path."
                />
                <BoundaryCard
                  title="Updates"
                  text="Automatic app or model updates are not enabled until signed manifests, trusted digests, user-visible prompts, and model SHA-256 verification policies are documented and implemented."
                />
              </div>
              <p className="rounded-lg border border-amber-500/15 bg-amber-950/10 p-3 text-amber-100">
                User audio, transcripts, prompt outputs, mastered exports, recordings, model weights, local caches,
                auth tokens, and HAR captures must stay out of source control and release artifacts.
              </p>
            </div>
          )}
        </div>

        {/* Affiliation and Reference Boundaries */}
        <div className="border border-white/5 bg-[#0c0f1d]/60 rounded-xl overflow-hidden hover:border-cyan-500/20 transition-colors">
          <button
            onClick={() => toggleSection("affiliations")}
            className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Copyright className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-slate-200 uppercase tracking-widest text-sm font-mono">
                Reference Projects & Non-Affiliation Notice
              </span>
            </div>
            {openSections.affiliations ? (
              <ChevronUp className="w-5 h-5 text-cyan-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {openSections.affiliations && (
            <div className="p-5 border-t border-white/5 space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                OpenStem is independent. It is not affiliated with, endorsed by, formally approved by, or maintained by
                Ultimate Vocal Remover, TurboScribe, Voicebox, LANDR, DistroKid, Mixea, Audacity, Apache OpenOffice,
                LibreOffice, GPT4All, Ollama, Whisper, Web-Audio-Mastering, Matchering, FFmpeg, PyTorch, Basic
                Pitch, or other referenced projects unless an explicit license or authorization says otherwise.
              </p>
              <p>
                Referenced projects are treated as inspiration, compatibility references, optional dependencies,
                or local backend targets. OpenStem must not copy proprietary branding, imply official affiliation,
                bypass service limits, hide source-license restrictions, or bundle weights/tools without a documented
                release strategy.
              </p>
              <p>
                Cloud features are disabled by default unless explicitly configured. No user audio, transcript text,
                PHI, auth token, or private local path should be uploaded or logged by default.
              </p>
            </div>
          )}
        </div>

        {/* Unavailable or Deactivated Features Section */}
        <div className="border border-white/5 bg-[#0c0f1d]/60 rounded-xl overflow-hidden hover:border-red-500/20 transition-colors">
          <button 
            onClick={() => toggleSection("unavailable")}
            className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <MicOff className="w-5 h-5 text-red-400" />
              <span className="font-bold text-slate-200 uppercase tracking-widest text-sm font-mono">Unavailable or Deactivated Features</span>
            </div>
            {openSections.unavailable ? <ChevronUp className="w-5 h-5 text-red-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          
          {openSections.unavailable && (
            <div className="p-5 border-t border-white/5 space-y-2 text-sm text-slate-300">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-white">Official UVR release mode:</strong> not included.</li>
                <li><strong className="text-white">Direct unverified model downloads:</strong> disabled.</li>
                <li><strong className="text-white">Fake model cache download simulation:</strong> disabled.</li>
                <li><strong className="text-white">Browser-only AI separation execution:</strong> unavailable unless real implementation exists.</li>
                <li><strong className="text-white">DirectML proof:</strong> not locally proven unless verified.</li>
                <li><strong className="text-white">CUDA proof:</strong> not locally proven unless verified.</li>
                <li><strong className="text-white">Mixer proof:</strong> does not count as AI separation proof.</li>
                <li><strong className="text-white">Ensemble planner execution:</strong> planned/not active unless real backend exists.</li>
                <li><strong className="text-white">Local transcription execution:</strong> native runner required; browser preview cannot write verified transcript files.</li>
                <li><strong className="text-white">Prompt workflow execution:</strong> local LLM or reviewed external connector required; draft-only until configured.</li>
                <li><strong className="text-white">Mastering export:</strong> planned/native-write-gated until real processing and output verification pass.</li>
                <li><strong className="text-white">Automatic app/model updates:</strong> not enabled until signed manifest or trusted digest policy exists.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Module Status Table Section */}
        <div className="border border-white/5 bg-[#0c0f1d]/60 rounded-xl overflow-hidden hover:border-teal-500/20 transition-colors">
          <button 
            onClick={() => toggleSection("modules")}
            className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Box className="w-5 h-5 text-teal-400" />
              <span className="font-bold text-slate-200 uppercase tracking-widest text-sm font-mono">Module Status</span>
            </div>
            {openSections.modules ? <ChevronUp className="w-5 h-5 text-teal-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          
          {openSections.modules && (
            <div className="p-5 border-t border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Audio Separator</div>
                  <div className="text-slate-400 text-xs">Status: Alpha / native backend required</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Model Manager</div>
                  <div className="text-slate-400 text-xs">Status: Alpha / source verification required</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Stem Mixer</div>
                  <div className="text-slate-400 text-xs">Status: Preview or post-separation review only unless real stems loaded</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Ensemble Manager</div>
                  <div className="text-slate-400 text-xs">Status: Planner / Not active unless backend implemented</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Batch Encoder</div>
                  <div className="text-slate-400 text-xs">Status: FFmpeg-backed when FFmpeg is configured</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Basic Pitch MIDI Lab</div>
                  <div className="text-slate-400 text-xs">Status: Optional / Audio-to-MIDI only</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Local Transcription</div>
                  <div className="text-slate-400 text-xs">Status: Planned native runner / Not stem-separation proof</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Transcript Workflows</div>
                  <div className="text-slate-400 text-xs">Status: Prompt library and draft workflow / Local model required</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Clinical Workflow</div>
                  <div className="text-slate-400 text-xs">Status: Draft-only / Clinician review required</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Mastering Lab</div>
                  <div className="text-slate-400 text-xs">Status: Planned processing / Native output verification required</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Generative AI Music Lab</div>
                  <div className="text-slate-400 text-xs">Status: Experimental / Connector-dependent</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Hardware Database</div>
                  <div className="text-slate-400 text-xs">Status: Detection/reference only</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Global Settings</div>
                  <div className="text-slate-400 text-xs">Status: Defaults for newly initialized jobs</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-bold text-teal-300 text-xs uppercase mb-1">Third-Party Notices</div>
                  <div className="text-slate-400 text-xs">Status: Required / maintain before release</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Third-Party Credits Section */}
        <div className="border border-white/5 bg-[#0c0f1d]/60 rounded-xl overflow-hidden hover:border-cyan-500/20 transition-colors">
          <button 
            onClick={() => toggleSection("credits")}
            className="w-full flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <Copyright className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-slate-200 uppercase tracking-widest text-sm font-mono">Third-Party Credits & Project References</span>
            </div>
            {openSections.credits ? <ChevronUp className="w-5 h-5 text-cyan-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          
          {openSections.credits && (
            <div className="p-5 border-t border-white/5 space-y-4 text-sm text-slate-300">
              <p className="font-sans leading-relaxed">OpenStem stands on the work of open-source audio, machine-learning, and desktop-application communities. Some projects are used directly as dependencies, some are called externally, and some are referenced for compatibility or workflow inspiration. Each project must be classified accurately as Bundled, External dependency, Optional backend, Referenced only, or Planned / Not active.</p>
              
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                <CreditsCard 
                  name="OpenStem AI Audio Workstation" 
                  purpose="Main application shell and workflow integrator." 
                  status="Project codebase." 
                  author="Robert Sawin / Trip3980" 
                />
                <CreditsCard 
                  name="Ultimate Vocal Remover GUI / UVR" 
                  purpose="Historical workflow inspiration and compatibility reference for UVR-style source separation." 
                  status="Referenced only" 
                  source="anjok07 / ultimatevocalremovergui" 
                  note="OpenStem is not an official UVR product."
                />
                <CreditsCard 
                  name="Eddycrack864 / UVR5-UI" 
                  purpose="UVR5-style UI/reference material." 
                  status="Referenced only" 
                  license="needs verification" 
                  note="Do not imply official affiliation."
                />
                <CreditsCard 
                  name="TheStinger / UVR5_UI" 
                  purpose="UVR5 UI reference / compatibility inspiration." 
                  status="Referenced only" 
                  license="needs verification" 
                />
                <CreditsCard 
                  name="audio-separator" 
                  purpose="Python CLI/library backend bridge for local source separation workflows." 
                  status="Optional/local backend dependency" 
                  license="MIT License" 
                />
                <CreditsCard 
                  name="Demucs" 
                  purpose="Source-separation backend/model family for vocals, drums, bass, and other stems." 
                  status="Optional backend/model family" 
                  license="MIT License" 
                />
                <CreditsCard 
                  name="MDX-Net / MDX model family" 
                  purpose="Source-separation model family commonly used for vocal/instrumental workflows." 
                  status="Model architecture / optional model family" 
                  license="needs verification" 
                />
                <CreditsCard 
                  name="RoFormer / BS-RoFormer model family" 
                  purpose="Modern transformer-based separation model family where configured." 
                  status="Optional model family / source must be verified per model" 
                  license="needs verification" 
                />
                <CreditsCard 
                  name="MVSEP-MDX23 / MDX23C references" 
                  purpose="Optional/experimental model family references." 
                  status="Experimental or Referenced only" 
                  license="needs verification" 
                />
                <CreditsCard 
                  name="FFmpeg" 
                  purpose="Decoding, encoding, probing, resampling, trimming, filtering, and non-AI fallback processing." 
                  status="External dependency" 
                  license="LGPL v2.1+ / GPL v3.0" 
                  note="FFmpeg fallback is not neural source separation."
                />
                <CreditsCard 
                  name="PyTorch" 
                  purpose="ML runtime used by local Python backends where installed." 
                  status="External/local dependency" 
                  license="BSD-3-Clause" 
                />
                <CreditsCard 
                  name="ONNX Runtime" 
                  purpose="ONNX model execution provider where backend uses ONNX." 
                  status="External/local dependency" 
                  license="MIT License" 
                  note="ONNX provider selection is backend-dependent unless OpenStem directly configures it."
                />
                <CreditsCard 
                  name="Basic Pitch" 
                  purpose="Audio-to-MIDI transcription workflow." 
                  status="Optional backend/module" 
                  source="Spotify / Basic Pitch"
                  license="Apache License 2.0" 
                  note="Basic Pitch is not stem separation and does not satisfy AI separation proof."
                />
                <CreditsCard
                  name="Whisper / Whisper-family tools"
                  purpose="Speech-to-text model family reference for planned local transcription workflows."
                  status="Optional external/local backend family / weights not bundled"
                  source="OpenAI Whisper and compatible local implementations"
                  license="needs verification per selected package/model"
                  note="Transcription is not stem separation proof."
                />
                <CreditsCard
                  name="TurboScribe"
                  purpose="Transcription workflow UX reference only."
                  status="Referenced only"
                  source="TurboScribe"
                  license="proprietary / not copied"
                  note="OpenStem does not use TurboScribe branding, endpoints, accounts, cookies, or cloud upload behavior."
                />
                <CreditsCard
                  name="Voicebox"
                  purpose="Local-first voice I/O workflow reference for captures, STT model selection, local LLM refinement, queue/retry/recovery, recording UX, and post-processing presets."
                  status="Referenced only / concept-adapted"
                  source="jamiepine / voicebox"
                  license="MIT License"
                  note="Voicebox was studied as a local-first voice I/O workflow reference. OpenStem is not affiliated with or endorsed by Voicebox."
                />
                <CreditsCard
                  name="Web-Audio-Mastering"
                  purpose="Mastering Lab workflow and DSP architecture reference."
                  status="Referenced only / concept-adapted"
                  source="entrepeneur4lyf / Web-Audio-Mastering"
                  license="ISC License"
                  note="No source files copied in the current Mastering Lab pass."
                />
                <CreditsCard
                  name="GPT4All / Ollama"
                  purpose="Local model library and local-chat workflow references."
                  status="Referenced only / optional external tools"
                  license="needs verification per selected runtime/model"
                  note="Local chat readiness does not verify separator models."
                />
                <CreditsCard
                  name="Apache OpenOffice / LibreOffice / Pandoc"
                  purpose="Optional document conversion strategy references."
                  status="Referenced only / user-configured external converters later"
                  license="needs verification before bundling"
                  note="No office suite or converter is bundled by default."
                />
                <CreditsCard
                  name="LANDR / DistroKid Mixea"
                  purpose="Commercial mastering UX reference only."
                  status="Referenced only / proprietary branding not used"
                  license="proprietary / not copied"
                  note="Mastering Lab does not claim affiliation or equivalent professional results."
                />
                <CreditsCard name="Electron" purpose="Desktop application shell and native bridge." status="Project dependency" license="MIT License" />
                <CreditsCard name="React" purpose="Frontend UI framework." status="Project dependency" license="MIT License" />
                <CreditsCard name="Vite" purpose="Development/build tool." status="Project dependency" license="MIT License" />
                <CreditsCard name="TypeScript" purpose="Typed application development." status="Project dependency" license="Apache License 2.0" />
                <CreditsCard name="Tailwind CSS" purpose="UI styling." status="Project dependency" license="MIT License" />
                <CreditsCard name="lucide-react" purpose="Icon library." status="Project dependency" license="ISC License" />
                <CreditsCard name="motion / Framer Motion" purpose="UI animation library." status="Project dependency" license="MIT License" />
                <CreditsCard name="Node.js / npm ecosystem" purpose="JavaScript runtime and package ecosystem." status="Development/runtime dependency" license="MIT License" />
                <CreditsCard name="nkhilunni / demucs-rs" purpose="Rust/Demucs reference or future backend lane." status="Referenced only or Planned / Not active" license="needs verification" />
                <CreditsCard name="Open-Unmix" purpose="Optional/future source-separation reference lane." status="Future lane / Referenced only" license="MIT License" />
                <CreditsCard name="Spleeter" purpose="Optional/future source-separation reference lane." status="Future lane / Referenced only" license="MIT License" />
                <CreditsCard name="YuE" purpose="Experimental local music-generation workflow." status="Experimental / Optional" license="needs verification" note="Not part of UVR-style separation proof." />
                <CreditsCard name="AudioCraft / MusicGen" purpose="Experimental music-generation reference lane." status="Future lane / Optional / Not active" license="MIT License" />
                <CreditsCard name="Stable Audio Tools" purpose="Experimental/future music-generation reference lane." status="Future lane / Not active" license="needs verification" />
                <CreditsCard name="DDSP" purpose="Experimental/future audio synthesis or differentiable DSP reference lane." status="Future lane / Referenced only" license="Apache License 2.0" />
                <CreditsCard name="Python" purpose="Required runtime for local backend helper scripts if used." status="External runtime" license="PSF License" />
                <CreditsCard name="PyInstaller" purpose="Python helper bundling only if used." status="Build tool" license="GPL v2.0" />
                <CreditsCard name="electron-builder" purpose="App packaging for Windows/Linux releases." status="Build dependency" license="MIT License" />
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

function CreditsCard({ name, purpose, status, source, license, author, note }: { name: string, purpose: string, status: string, source?: string, license?: string, author?: string, note?: string }) {
  return (
    <div className="bg-black/40 p-4 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-colors">
      <strong className="text-cyan-300 font-medium tracking-wide flex items-center gap-2 mb-2">
        <Code2 className="w-4 h-4" /> {name}
      </strong>
      <div className="space-y-1 text-xs text-slate-400">
        <p><strong className="text-slate-300">Purpose:</strong> {purpose}</p>
        <p><strong className="text-slate-300">Status:</strong> {status}</p>
        {source && <p><strong className="text-slate-300">Source:</strong> {source}</p>}
        {author && <p><strong className="text-slate-300">Author:</strong> {author}</p>}
        {license && <p><strong className="text-slate-300">License:</strong> {license}</p>}
        {note && <p className="text-amber-400/80 mt-1 italic">{note}</p>}
      </div>
    </div>
  );
}

function BoundaryCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/30 p-3">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300">{title}</div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{text}</p>
    </div>
  );
}
