import { createRequire } from "module";

const require = createRequire(import.meta.url);
const aiSeparation = require("../../electron-shell/ai-separation.cjs");

type ParsedArgs = {
  python: string | undefined;
  ffmpeg: string | undefined;
  requireReady: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    python: undefined,
    ffmpeg: undefined,
    requireReady: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--python") {
      if (value) parsed.python = value;
      index++;
    } else if (key === "--ffmpeg") {
      if (value) parsed.ffmpeg = value;
      index++;
    } else if (key === "--require-ready") {
      parsed.requireReady = true;
    }
  }
  return parsed;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const ffmpeg = aiSeparation.checkFFmpegReady({
    ffmpegCommand: args.ffmpeg || undefined,
  });
  const backendDetails = aiSeparation.checkBackendDetails(args.python, {
    ffmpeg,
  });
  const backendBlockers = backendDetails.blockers || [];
  const hasFfmpegBlocker = backendBlockers.some((blocker: any) => blocker.id === "ffmpeg_missing");

  const result = {
    ok: !!backendDetails.canRunAISeparation && !!ffmpeg.ready,
    proofStatus: "diagnostics_only_not_ai_proof",
    betaStatus: "blocked_until_verified_model_cpu_ai_e2e_proof_passes",
    pythonRequested: args.python || null,
    ffmpegRequested: args.ffmpeg || null,
    ffmpeg,
    backendDetails,
    blockers: [
      ...backendBlockers,
      ...(!ffmpeg.ready && !hasFfmpegBlocker
        ? [{ id: "ffmpeg_missing", label: ffmpeg.error || "FFmpeg is not ready." }]
        : []),
    ],
  };

  console.log(JSON.stringify(result, null, 2));

  if (args.requireReady && !result.ok) {
    process.exit(1);
  }
}

main();
