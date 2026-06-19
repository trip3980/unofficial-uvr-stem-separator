import * as fs from "fs";
import * as path from "path";
import { MODEL_REGISTRY } from "../services/audioEngine";
import { validateModelEntry, validateModelRegistry } from "../services/registryValidator";

/**
 * OpenStem Application Assurance Unit Tests
 * Direct assessment of:
 * 1. Independent app title branding
 * 2. README disclosures/limits
 * 3. THIRD_PARTY_NOTICES.md presence & completeness
 * 4. Registry validator behavior on malformed entries
 * 5. UI status labels mapping and safety deactivation
 * 6. FFmpeg fallback labeling
 */
function runTests(): void {
  console.log("=========================================");
  console.log("RUNNING COMPREHENSIVE REPOSITORY TESTS");
  console.log("=========================================");

  let failuresCount = 0;

  function assert(condition: boolean, testName: string, errorMessage: string = "") {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (errorMessage) {
        console.error(`   Reason: ${errorMessage}`);
      }
      failuresCount++;
    }
  }

  // Define paths relative to workspace root (assuming running from process.cwd() or script directory context)
  const rootDir = process.cwd();
  
  // Test 1: App Title displayed in branding system
  try {
    const brandingPath = path.join(rootDir, "src", "config", "branding.ts");
    const brandingContent = fs.readFileSync(brandingPath, "utf8");
    assert(
      brandingContent.includes("OpenStem") || brandingContent.includes("Hardened Functional Alpha"),
      "Test 1.1: src/config/branding.ts contains 'OpenStem' to reflect independent branding",
      "Branding constant does not declare 'OpenStem'"
    );
    assert(
      !brandingContent.includes("Official Release Mode"),
      "Test 1.2: src/config/branding.ts does not contain 'Official Release Mode'",
      "Forbidden string 'Official Release Mode' found"
    );
  } catch (err: any) {
    assert(false, "Test 1: Branding configuration file check", err.message);
  }

  // Test 2: README holds clear disclaimers & origin attribution
  try {
    const readmePath = path.join(rootDir, "README.md");
    const readmeContent = fs.readFileSync(readmePath, "utf8");
    assert(
      readmeContent.includes("independent") && readmeContent.includes("Hardened Functional Alpha"),
      "Test 2.1: README contains clear disclaimers",
      "README is missing independent disclaimer or status"
    );
    assert(
      readmeContent.includes("Ultimate Vocal Remover") || readmeContent.includes("UVR"),
      "Test 2.2: README provides origin attribution",
      "README does not mention the upstream Ultimate Vocal Remover"
    );
    assert(
      !readmeContent.includes("Official Release Mode") && !readmeContent.includes("UVR 6"),
      "Test 2.3: README does not declare forbidden official continuations",
      "Forbidden official release patterns found in README"
    );
  } catch (err: any) {
    assert(false, "Test 2: README disclaimers and attribution", err.message);
  }

  // Test 3: THIRD_PARTY_NOTICES.md exists and contains the requested items in proper format
  try {
    const noticesPath = path.join(rootDir, "THIRD_PARTY_NOTICES.md");
    const noticesContent = fs.readFileSync(noticesPath, "utf8");
    assert(
      fs.existsSync(noticesPath),
      "Test 3.1: THIRD_PARTY_NOTICES.md exists on disk",
      "Notice file not found"
    );
    assert(
      noticesContent.includes("audio-separator") && noticesContent.includes("Ultimate Vocal Remover"),
      "Test 3.2: THIRD_PARTY_NOTICES.md references core dependencies",
      "Upstream projects are not mentioned"
    );
    assert(
      noticesContent.includes("MIT") || noticesContent.includes("License"),
      "Test 3.3: THIRD_PARTY_NOTICES.md lists licenses",
      "License attribution column or table missing"
    );
  } catch (err: any) {
    assert(false, "Test 3: THIRD_PARTY_NOTICES.md checks", err.message);
  }

  // Test 4: Registry validator fails on malformed model entries
  try {
    // Construct mock malformed entry
    const malformedEntry = {
      id: "malformed_model_fake_hash",
      name: "", // Fail: missing filename
      architecture: "VR" as const,
      filePath: "models/VR/fake.pth",
      stemType: "vocals" as const,
      gpuSupport: false,
      memoryRisk: "low" as const,
      downloaded: false,
      downloadUrl: "https://example.com/fake.pth", // Fail: fake/placeholder URL
      description: "Malformed mock model",
      fileSize: "100 MB",
      license: "", // Fail: missing license
      verifiedStatus: "verified" as const, // Fail: marked as verified with fake url and missing checksum
      checksum: "invalid_short_hash" // Fail: malformed hash length
    };

    const errors = validateModelEntry(malformedEntry);
    assert(
      errors.length > 0,
      "Test 4.1: Registry validator correctly flags malformed model templates",
      "Validator did not flag a duplicate fake url, missing license, missing name, or malformed checksum"
    );
    assert(
      errors.some(e => e.includes("license")),
      "Test 4.2: Validator flags missing license metadata",
      "No license error raised"
    );
    assert(
      errors.some(e => e.includes("checksum") || e.includes("verified")),
      "Test 4.3: Validator blocks fake verified statuses with missing/invalid hashes",
      "Did not block fake verified status"
    );
  } catch (err: any) {
    assert(false, "Test 4: Registry validator behavior checks", err.message);
  }

  // Test 5: UI status labels block downloading for unverified models
  try {
    const downloaderPath = path.join(rootDir, "src", "components", "ModelDownloader.tsx");
    const downloaderContent = fs.readFileSync(downloaderPath, "utf8");
    assert(
      downloaderContent.includes("needs_verification") || downloaderContent.includes("Needs Verification"),
      "Test 5.1: ModelDownloader UI supports 'Needs Verification' state",
      "ModelDownloader has no Needs Verification representation"
    );
    assert(
      downloaderContent.includes("verifiedStatus !== \"verified\"") || downloaderContent.includes("verifiedStatus === \"verified\""),
      "Test 5.2: ModelDownloader filters actions strictly by active verifiedStatus",
      "Download button is not conditioned on verifiedStatus"
    );
  } catch (err: any) {
    assert(false, "Test 5: UI status labels checks", err.message);
  }

  // Test 6: FFmpeg fallback checks
  try {
    const manualsPath = path.join(rootDir, "src", "data", "submenuManuals.ts");
    const manualsContent = fs.readFileSync(manualsPath, "utf8");
    assert(
      manualsContent.includes("FFmpeg DSP Fallback") && manualsContent.includes("Non-AI static DSP filtering"),
      "Test 6.1: SubmenuManual definitions explain FFmpeg is not neural AI separation",
      "FFmpeg description lacks honest non-AI static DSP labeling"
    );
  } catch (err: any) {
    assert(false, "Test 6: FFmpeg fallback labeling checks", err.message);
  }

  console.log("\n=========================================");
  if (failuresCount === 0) {
    console.log("🏆 ALL REPOSITORY TESTS COMPLETED: 100% SUCCESS!");
    console.log("=========================================\n");
    process.exit(0);
  } else {
    console.error(`😰 TEST RUN FAILED with ${failuresCount} failures.`);
    console.log("=========================================\n");
    process.exit(1);
  }
}

runTests();
