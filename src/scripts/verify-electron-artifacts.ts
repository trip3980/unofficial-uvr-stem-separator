import * as fs from "fs";
import * as path from "path";

type Check = {
  label: string;
  filePath: string;
  minBytes?: number;
};

function fail(message: string): never {
  console.error(`ARTIFACT VERIFY FAIL: ${message}`);
  process.exit(1);
}

function ok(message: string): void {
  console.log(`OK: ${message}`);
}

function readPackageJson(rootDir: string): any {
  return JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
}

function checkFile({ label, filePath, minBytes = 1 }: Check): void {
  if (!fs.existsSync(filePath)) {
    fail(`${label} is missing: ${filePath}`);
  }
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    fail(`${label} is not a file: ${filePath}`);
  }
  if (stats.size < minBytes) {
    fail(`${label} is too small (${stats.size} bytes): ${filePath}`);
  }
  ok(`${label} present (${stats.size} bytes)`);
}

function checkDirectory(label: string, dirPath: string): void {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    fail(`${label} directory is missing: ${dirPath}`);
  }
  ok(`${label} directory present`);
}

function walkFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

function checkForbiddenResourceFiles(resourcesPath: string): void {
  const forbiddenExtensions = new Set([".pth", ".onnx", ".ckpt", ".pt"]);
  const forbiddenSegments = new Set([
    ".venv",
    ".venv-openstem",
    ".venv-ai",
    ".openstem-backend",
    "uvr_models",
    "models",
    "proof_output",
    "proof_outputs",
    "OpenStemProofOutput",
  ]);
  const offenders = walkFiles(resourcesPath).filter((filePath) => {
    const parsed = path.parse(filePath);
    const parts = filePath.split(/[\\/]+/);
    if (forbiddenExtensions.has(parsed.ext.toLowerCase())) return true;
    return parts.some((part) => forbiddenSegments.has(part));
  });

  if (offenders.length > 0) {
    fail(`forbidden runtime/model artifacts were packaged:\n${offenders.map((item) => `  - ${item}`).join("\n")}`);
  }
  ok("no forbidden Python envs, model weights, model caches, or proof outputs found in resources");
}

function checkBuilderConfig(packageJson: any): void {
  const build = packageJson.build || {};
  const files = JSON.stringify(build.files || []);
  const extraResources = JSON.stringify(build.extraResources || []);
  const requiredExclusions = [
    "!**/.env*",
    "!**/.venv*/**",
    "!**/.openstem-backend/**",
    "!**/uvr_models/**",
    "!**/models/**",
    "!**/tmp_test_runs/**",
    "!**/proof_output/**",
    "!**/proof_outputs/**",
    "!**/*.log",
  ];

  for (const exclusion of requiredExclusions) {
    if (!files.includes(exclusion)) {
      fail(`electron-builder files is missing exclusion: ${exclusion}`);
    }
  }
  if (!extraResources.includes('"from":"scripts"') && !extraResources.includes('"from": "scripts"')) {
    fail("electron-builder extraResources must include scripts");
  }
  ok("electron-builder resource exclusions and scripts extraResource are configured");
}

function main(): void {
  const rootDir = process.cwd();
  const packageJson = readPackageJson(rootDir);
  const productName = packageJson.build?.productName || "OpenStem AI Audio Workstation";
  const version = packageJson.version || "0.0.0";
  const distElectron = path.join(rootDir, "dist-electron");
  const winUnpacked = path.join(distElectron, "win-unpacked");
  const resourcesPath = path.join(winUnpacked, "resources");

  console.log("=========================================");
  console.log("VERIFYING ELECTRON RELEASE ARTIFACTS");
  console.log("=========================================");

  checkBuilderConfig(packageJson);
  checkDirectory("dist-electron", distElectron);
  checkDirectory("Windows unpacked app", winUnpacked);
  checkDirectory("Electron resources", resourcesPath);

  checkFile({
    label: "Windows installer",
    filePath: path.join(distElectron, `${productName} Setup ${version}.exe`),
    minBytes: 1024 * 1024,
  });
  checkFile({
    label: "Windows installer blockmap",
    filePath: path.join(distElectron, `${productName} Setup ${version}.exe.blockmap`),
    minBytes: 1024,
  });
  checkFile({
    label: "Unpacked Windows executable",
    filePath: path.join(winUnpacked, `${productName}.exe`),
    minBytes: 1024 * 1024,
  });
  checkFile({
    label: "App ASAR",
    filePath: path.join(resourcesPath, "app.asar"),
    minBytes: 1024,
  });
  checkFile({ label: "Packaged README", filePath: path.join(resourcesPath, "README.md") });
  checkFile({ label: "Packaged LICENSE", filePath: path.join(resourcesPath, "LICENSE") });
  checkFile({ label: "Packaged third-party notices", filePath: path.join(resourcesPath, "THIRD_PARTY_NOTICES.md") });
  checkFile({ label: "YuE helper script", filePath: path.join(resourcesPath, "scripts", "yue_probe.py") });
  checkFile({
    label: "Basic Pitch helper script",
    filePath: path.join(resourcesPath, "scripts", "basic_pitch_probe.py"),
  });
  checkForbiddenResourceFiles(resourcesPath);

  console.log("=========================================");
  console.log("ARTIFACT VERIFY PASS");
  console.log("=========================================");
}

main();
