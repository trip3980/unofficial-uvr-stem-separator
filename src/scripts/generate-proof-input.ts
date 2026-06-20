import * as path from "path";
import { ensureSyntheticProofInput, getDefaultProofInputPath } from "../services/proofInput";

function parseArgs(argv: string[]): { output?: string; ffmpeg?: string } {
  const parsed: { output?: string; ffmpeg?: string } = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--output" && value) {
      parsed.output = value;
      index += 1;
    } else if (key === "--ffmpeg" && value) {
      parsed.ffmpeg = value;
      index += 1;
    }
  }
  return parsed;
}

function main(): void {
  const rootDir = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const outputPath = args.output ? path.resolve(args.output) : getDefaultProofInputPath(rootDir);
  const result = ensureSyntheticProofInput({
    rootDir,
    outputPath,
    ffmpegCommand: args.ffmpeg,
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main();
