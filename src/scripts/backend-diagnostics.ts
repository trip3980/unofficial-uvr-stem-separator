import { createRequire } from "module";
import * as fs from "fs";
import * as path from "path";

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

function resolveDiagnosticPythonPath(
  rootDir: string,
  cliPython?: string,
): { path: string | undefined; source: string } {
  if (cliPython) {
    return { path: path.resolve(cliPython), source: "cli --python" };
  }

  const backendEnv = process.env.OPENSTEM_BACKEND_PYTHON?.trim();
  if (backendEnv) {
    return { path: path.resolve(backendEnv), source: "OPENSTEM_BACKEND_PYTHON" };
  }

  const proofEnv = process.env.OPENSTEM_PROOF_PYTHON?.trim();
  if (proofEnv) {
    return { path: path.resolve(proofEnv), source: "OPENSTEM_PROOF_PYTHON" };
  }

  const projectLocalCandidates = [
    path.join(rootDir, ".venv-openstem", "Scripts", "python.exe"),
    path.join(rootDir, ".venv-openstem", "bin", "python"),
  ];
  const localPython = projectLocalCandidates.find((candidate) => fs.existsSync(candidate));
  if (localPython) {
    return { path: localPython, source: "project .venv-openstem" };
  }

  return { path: undefined, source: "PATH discovery" };
}

function resolveDiagnosticFFmpegPath(cliFFmpeg?: string): { path: string | undefined; source: string } {
  if (cliFFmpeg) {
    return { path: path.resolve(cliFFmpeg), source: "cli --ffmpeg" };
  }

  const backendEnv = process.env.OPENSTEM_BACKEND_FFMPEG?.trim();
  if (backendEnv) {
    return { path: path.resolve(backendEnv), source: "OPENSTEM_BACKEND_FFMPEG" };
  }

  const proofEnv = process.env.OPENSTEM_PROOF_FFMPEG?.trim();
  if (proofEnv) {
    return { path: path.resolve(proofEnv), source: "OPENSTEM_PROOF_FFMPEG" };
  }

  return { path: undefined, source: "PATH discovery" };
}

function firstNonEmptyLine(text: string): string {
  return (
    String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || ""
  );
}

function compactBackendDetails(details: any): any {
  if (!details?.audioSeparatorCli?.helpText) {
    return details;
  }

  const { helpText, ...audioSeparatorCli } = details.audioSeparatorCli;
  return {
    ...details,
    audioSeparatorCli: {
      ...audioSeparatorCli,
      helpTextPreview: firstNonEmptyLine(helpText),
      helpTextLineCount: String(helpText).split(/\r?\n/).length,
    },
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const pythonResolution = resolveDiagnosticPythonPath(process.cwd(), args.python);
  const ffmpegResolution = resolveDiagnosticFFmpegPath(args.ffmpeg);
  const ffmpeg = aiSeparation.checkFFmpegReady({
    ffmpegCommand: ffmpegResolution.path,
  });
  const backendDetails = aiSeparation.checkBackendDetails(pythonResolution.path, {
    ffmpeg,
  });
  const backendBlockers = backendDetails.blockers || [];
  const hasFfmpegBlocker = backendBlockers.some((blocker: any) => blocker.id === "ffmpeg_missing");

  const result = {
    ok: !!backendDetails.canRunAISeparation && !!ffmpeg.ready,
    proofStatus: "diagnostics_only_not_ai_proof",
    betaStatus: "local_cpu_proof_lane_completed_beta_pending_final_release_review",
    pythonRequested: args.python || null,
    pythonResolved: pythonResolution.path || null,
    pythonSource: pythonResolution.source,
    ffmpegRequested: args.ffmpeg || null,
    ffmpegResolved: ffmpegResolution.path || null,
    ffmpegSource: ffmpegResolution.source,
    ffmpeg,
    backendDetails: compactBackendDetails(backendDetails),
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
