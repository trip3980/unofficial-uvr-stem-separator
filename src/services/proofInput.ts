import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

export const DEFAULT_PROOF_INPUT_RELATIVE_PATH = path.join(
  "tmp_test_runs",
  "proof_input",
  "openstem_synthetic_proof.wav",
);
export const DEFAULT_PROOF_OUTPUT_RELATIVE_PATH = "OpenStemProofOutput";

export interface ProofInputResult {
  ok: boolean;
  path: string;
  generated: boolean;
  decodable: boolean;
  ffmpegCommand: string;
  ffprobeCommand: string;
  diagnosticCode?: string;
  error?: string;
}

function firstNonEmptyLine(text: string): string {
  return (
    String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || ""
  );
}

function hasPathShape(command: string): boolean {
  return path.isAbsolute(command) || command.includes("/") || command.includes("\\") || /^[a-zA-Z]:[\\/]/.test(command);
}

export function getDefaultProofInputPath(rootDir: string): string {
  return path.join(rootDir, DEFAULT_PROOF_INPUT_RELATIVE_PATH);
}

export function getDefaultProofOutputPath(rootDir: string): string {
  return path.join(rootDir, DEFAULT_PROOF_OUTPUT_RELATIVE_PATH);
}

export function resolveProofFfprobeCommand(ffmpegCommand?: string): string {
  const command = String(ffmpegCommand || "ffmpeg");
  const basename = path.basename(command).toLowerCase();
  if (hasPathShape(command) && (basename === "ffmpeg.exe" || basename === "ffmpeg")) {
    const probeName = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
    const candidate = path.join(path.dirname(path.resolve(command)), probeName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return "ffprobe";
}

export function buildSyntheticProofInputFfmpegArgs(outputPath: string): string[] {
  return [
    "-hide_banner",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=220:sample_rate=44100:duration=12",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=554.37:sample_rate=44100:duration=12",
    "-filter_complex",
    "[0:a]volume=0.35[a0];[1:a]volume=0.20[a1];[a0][a1]amix=inputs=2:duration=shortest,pan=stereo|c0=c0|c1=c0,afade=t=in:st=0:d=0.1,afade=t=out:st=11.9:d=0.1",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ];
}

export function verifyAudioFileDecodable(
  filePath: string,
  ffprobeCommand = "ffprobe",
): { ok: boolean; error?: string } {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return { ok: false, error: "Audio file does not exist." };
  }

  const probe = spawnSync(
    ffprobeCommand,
    [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=codec_type",
      "-of",
      "default=nw=1:nk=1",
      filePath,
    ],
    { encoding: "utf8", timeout: 10000, windowsHide: true },
  );
  const output = `${probe.stdout || ""}${probe.stderr || ""}`;
  const hasAudioStream = String(probe.stdout || "")
    .split(/\r?\n/)
    .some((line) => line.trim().toLowerCase() === "audio");
  if (!probe.error && probe.status === 0 && hasAudioStream) {
    return { ok: true };
  }
  return {
    ok: false,
    error: probe.error?.message || firstNonEmptyLine(output) || "ffprobe did not find an audio stream.",
  };
}

export function ensureSyntheticProofInput(options: {
  rootDir: string;
  outputPath?: string;
  ffmpegCommand?: string;
}): ProofInputResult {
  const outputPath = path.resolve(options.outputPath || getDefaultProofInputPath(options.rootDir));
  const ffmpegCommand = options.ffmpegCommand || "ffmpeg";
  const ffprobeCommand = resolveProofFfprobeCommand(ffmpegCommand);

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).isFile()) {
    const existingProbe = verifyAudioFileDecodable(outputPath, ffprobeCommand);
    if (existingProbe.ok) {
      return { ok: true, path: outputPath, generated: false, decodable: true, ffmpegCommand, ffprobeCommand };
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const generated = spawnSync(ffmpegCommand, buildSyntheticProofInputFfmpegArgs(outputPath), {
    encoding: "utf8",
    timeout: 30000,
    windowsHide: true,
  });

  if (generated.error || generated.status !== 0) {
    return {
      ok: false,
      path: outputPath,
      generated: false,
      decodable: false,
      ffmpegCommand,
      ffprobeCommand,
      diagnosticCode: "PROOF_INPUT_GENERATION_FAILED",
      error:
        generated.error?.message ||
        firstNonEmptyLine(`${generated.stderr || ""}${generated.stdout || ""}`) ||
        "ffmpeg failed to generate the synthetic proof input.",
    };
  }

  const probe = verifyAudioFileDecodable(outputPath, ffprobeCommand);
  return {
    ok: probe.ok,
    path: outputPath,
    generated: true,
    decodable: probe.ok,
    ffmpegCommand,
    ffprobeCommand,
    diagnosticCode: probe.ok ? undefined : "PROOF_INPUT_UNDECODABLE",
    error: probe.error,
  };
}
