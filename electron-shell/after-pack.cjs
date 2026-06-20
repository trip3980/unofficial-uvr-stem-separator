const fs = require("fs");
const path = require("path");

const RELEASE_RESOURCE_FILES = ["README.md", "LICENSE", "THIRD_PARTY_NOTICES.md"];
const RUNTIME_HELPER_SCRIPTS = ["basic_pitch_probe.py", "yue_probe.py"];

function copyFile(sourcePath, destinationPath) {
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`Required package resource is missing: ${sourcePath}`);
  }
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

function getResourcesDir(context) {
  const windowsOrLinuxResources = path.join(context.appOutDir, "resources");
  if (fs.existsSync(windowsOrLinuxResources)) return windowsOrLinuxResources;

  const productFilename = context.packager?.appInfo?.productFilename ?? context.packager?.appInfo?.productName;
  if (productFilename) {
    const macResources = path.join(context.appOutDir, `${productFilename}.app`, "Contents", "Resources");
    if (fs.existsSync(macResources)) return macResources;
  }

  throw new Error(`Could not resolve Electron resources directory for ${context.appOutDir}`);
}

module.exports = async function afterPack(context) {
  const projectDir = context.packager.projectDir;
  const resourcesDir = getResourcesDir(context);

  for (const fileName of RELEASE_RESOURCE_FILES) {
    copyFile(path.join(projectDir, fileName), path.join(resourcesDir, fileName));
  }

  for (const scriptName of RUNTIME_HELPER_SCRIPTS) {
    copyFile(path.join(projectDir, "scripts", scriptName), path.join(resourcesDir, "scripts", scriptName));
  }
};
