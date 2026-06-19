import { MODEL_REGISTRY } from "../services/audioEngine";

type SourceAuditResult = {
  id: string;
  name: string;
  url: string;
  registryStatus: string | undefined;
  httpStatus: number | undefined;
  httpStatusText: string | undefined;
  reachable: boolean;
  error: string | undefined;
};

const TIMEOUT_MS = Number(process.env.OPENSTEM_SOURCE_AUDIT_TIMEOUT_MS || 15000);

function isHttpOk(status?: number): boolean {
  return typeof status === "number" && status >= 200 && status < 300;
}

type HeadResult = {
  status: number | undefined;
  statusText: string | undefined;
  error: string | undefined;
};

async function head(url: string): Promise<HeadResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    return {
      status: response.status,
      statusText: response.statusText,
      error: undefined,
    };
  } catch (error: any) {
    return {
      status: undefined,
      statusText: undefined,
      error: error?.name === "AbortError" ? `timeout after ${TIMEOUT_MS}ms` : error?.message || String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main(): Promise<void> {
  console.log("=========================================");
  console.log("AUDITING MODEL REGISTRY SOURCE URLS");
  console.log("=========================================");
  console.log("HEAD requests only; no model weights are downloaded.");

  const entries = MODEL_REGISTRY.filter((model) => !!model.downloadUrl);
  const results: SourceAuditResult[] = [];

  for (const model of entries) {
    const outcome = await head(model.downloadUrl as string);
    results.push({
      id: model.id,
      name: model.name,
      url: model.downloadUrl as string,
      registryStatus: model.verifiedStatus,
      httpStatus: outcome.status,
      httpStatusText: outcome.statusText,
      reachable: isHttpOk(outcome.status),
      error: outcome.error,
    });
  }

  const unreachableVerified = results.filter((result) => result.registryStatus === "verified" && !result.reachable);
  const reachableBlocked = results.filter((result) => result.registryStatus === "broken_link" && result.reachable);

  for (const result of results) {
    const status = result.error
      ? `ERROR ${result.error}`
      : `${result.httpStatus || "NO_STATUS"} ${result.httpStatusText || ""}`.trim();
    console.log(`${result.id}: ${status} | registry=${result.registryStatus || "unset"}`);
  }

  console.log("=========================================");
  console.log(`Sources checked: ${results.length}`);
  console.log(`Reachable: ${results.filter((result) => result.reachable).length}`);
  console.log(`Unreachable: ${results.filter((result) => !result.reachable).length}`);

  if (reachableBlocked.length > 0) {
    console.log("Reachable sources still marked broken_link; update registry metadata only after hash/license review:");
    for (const result of reachableBlocked) {
      console.log(`  - ${result.id}: ${result.url}`);
    }
  }

  if (unreachableVerified.length > 0) {
    console.error("Verified registry sources are not reachable. Do not claim verified source availability:");
    for (const result of unreachableVerified) {
      console.error(`  - ${result.id}: ${result.httpStatus || result.error}`);
    }
    process.exit(1);
  }

  console.log("SOURCE AUDIT PASS: no verified registry source is currently unreachable.");
}

main().catch((error) => {
  console.error("SOURCE AUDIT FAILED:", error);
  process.exit(1);
});
