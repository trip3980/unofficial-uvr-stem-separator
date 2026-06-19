import { MODEL_REGISTRY } from "../services/audioEngine";
import { validateModelRegistry } from "../services/registryValidator";

/**
 * Registry Validation Runner.
 * Executes offline check of the MODEL_REGISTRY to fail builds/validation on any malformed entries.
 */
function runValidation(): void {
  console.log("=========================================");
  console.log("RUNNING MODEL REGISTRY INTEGRITY CHECKS");
  console.log("=========================================");

  const allErrors = validateModelRegistry(MODEL_REGISTRY);

  if (allErrors.size > 0) {
    console.error(`\nREGISTRY INTEGRITY FAILURE: ${allErrors.size} models failed verification checks!`);

    allErrors.forEach((errors, modelId) => {
      console.error(`\nModel ID: "${modelId}"`);
      errors.forEach((err) => console.error(`  - ${err}`));
    });

    console.log("\n=========================================");
    process.exit(1);
  }

  console.log("\nREGISTRY INTEGRITY SUCCESS: All model definitions are safe, attributed, and not fake-verified.");
  console.log("=========================================\n");
  process.exit(0);
}

runValidation();
