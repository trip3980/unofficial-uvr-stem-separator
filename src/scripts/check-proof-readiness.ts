import { MODEL_REGISTRY } from "../services/audioEngine";

function hasUsableLicense(license?: string): boolean {
  const normalized = String(license || "")
    .trim()
    .toLowerCase();
  return !!normalized && normalized !== "unknown" && normalized !== "needs verification";
}

function main(): void {
  console.log("=========================================");
  console.log("CHECKING OPENSTEM CPU AI PROOF READINESS");
  console.log("=========================================");

  const verifiedWeightMetadata = MODEL_REGISTRY.filter((model) => {
    if (model.architecture === "Ensemble") return false;
    return (
      model.verifiedStatus === "verified" &&
      !!model.checksum &&
      hasUsableLicense(model.license) &&
      (!!model.downloadUrl || !!model.sourceUrl || model.sourceType === "manual_import")
    );
  });

  const brokenSources = MODEL_REGISTRY.filter((model) => model.verifiedStatus === "broken_link");
  const ensembles = MODEL_REGISTRY.filter(
    (model) => model.architecture === "Ensemble" && model.verifiedStatus === "verified",
  );

  console.log(`Registry entries: ${MODEL_REGISTRY.length}`);
  console.log(`Verified ensemble presets: ${ensembles.length}`);
  console.log(`Broken/unavailable source entries: ${brokenSources.length}`);
  console.log(`Verified single-weight metadata candidates: ${verifiedWeightMetadata.length}`);

  if (verifiedWeightMetadata.length === 0) {
    console.log("");
    console.log("RESULT: BLOCKED");
    console.log(
      "CPU AI proof is blocked until at least one model has verified source integrity and a matching local SHA-256.",
    );
    console.log("A local model with a hash mismatch must not be used for proof, release claims, or verified status.");
    console.log("Do not run CPU AI proof until a proof-eligible model asset exists.");
    process.exit(2);
  }

  console.log("");
  console.log("Metadata candidates found:");
  for (const model of verifiedWeightMetadata) {
    console.log(`  - ${model.id}: ${model.name} sha256:${model.checksum}`);
  }
  console.log("");
  console.log("RESULT: METADATA_READY_LOCAL_HASH_STILL_REQUIRED");
  console.log("Next gate: verify a local model file against expected SHA-256, then run CPU AI E2E proof.");
}

main();
