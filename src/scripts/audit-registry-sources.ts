import { MODEL_REGISTRY } from "../services/audioEngine";
import {
  buildSourceDiagnosticResult,
  classifySourceStatus as classifySharedSourceStatus,
} from "../services/modelSourceDiagnostics";
import { ModelRegistryEntry } from "../types";
import { pathToFileURL } from "url";

type SourceAuditResult = {
  id: string;
  name: string;
  url: string;
  registryStatus: string | undefined;
  statusCode: number | undefined;
  statusText: string | undefined;
  sourceStatus: string;
  reachable: boolean;
  requiresAuth: boolean;
  downloadableWithoutAuth: boolean;
  checkedAt: string;
  diagnosticCode: string;
  error: string | undefined;
};

type FetchProbeResult = {
  statusCode: number | undefined;
  statusText: string | undefined;
  error: string | undefined;
};

const TIMEOUT_MS = Number(process.env.OPENSTEM_SOURCE_AUDIT_TIMEOUT_MS || 15000);

export function classifySourceStatus(statusCode?: number, hasExpectedHash = true, error?: string): string {
  return classifySharedSourceStatus(statusCode, hasExpectedHash, error);
}

async function probe(url: string, method: "HEAD" | "GET"): Promise<FetchProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: method === "GET" ? { Range: "bytes=0-0" } : undefined,
    });
    return {
      statusCode: response.status,
      statusText: response.statusText,
      error: undefined,
    };
  } catch (error: any) {
    return {
      statusCode: undefined,
      statusText: undefined,
      error: error?.name === "AbortError" ? `timeout after ${TIMEOUT_MS}ms` : error?.message || String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function shouldTryRangeGet(model: ModelRegistryEntry, headResult: FetchProbeResult): boolean {
  const url = model.downloadUrl || "";
  if (!url.includes("huggingface.co")) return false;
  if (headResult.error) return true;
  return [401, 403, 405, 429].includes(Number(headResult.statusCode));
}

async function auditSource(model: ModelRegistryEntry): Promise<SourceAuditResult> {
  const url = model.downloadUrl as string;
  const headResult = await probe(url, "HEAD");
  const finalResult = shouldTryRangeGet(model, headResult) ? await probe(url, "GET") : headResult;
  const diagnostic = buildSourceDiagnosticResult({
    url,
    statusCode: finalResult.statusCode,
    error: finalResult.error,
    hasExpectedHash: !!model.checksum,
  });

  return {
    id: model.id,
    name: model.name,
    url,
    registryStatus: model.verifiedStatus,
    statusCode: finalResult.statusCode,
    statusText: finalResult.statusText,
    sourceStatus: diagnostic.sourceStatus,
    reachable: diagnostic.reachable,
    requiresAuth: diagnostic.requiresAuth,
    downloadableWithoutAuth: diagnostic.downloadableWithoutAuth,
    checkedAt: diagnostic.checkedAt,
    diagnosticCode: diagnostic.diagnosticCode,
    error: finalResult.error,
  };
}

async function main(): Promise<void> {
  console.log("=========================================");
  console.log("AUDITING MODEL REGISTRY SOURCE URLS");
  console.log("=========================================");
  console.log("HEAD requests first; Hugging Face blocked/inconclusive responses retry GET with Range: bytes=0-0.");
  console.log("No model weights are downloaded. No Hugging Face token is used by this audit.");

  const entries = MODEL_REGISTRY.filter((model) => !!model.downloadUrl);
  const results: SourceAuditResult[] = [];

  for (const model of entries) {
    results.push(await auditSource(model));
  }

  const unreachableVerified = results.filter((result) => result.registryStatus === "verified" && !result.reachable);
  const registryMismatch = results.filter((result) => {
    if (result.registryStatus === "verified") return false;
    if (result.registryStatus === "experimental" || result.registryStatus === "unavailable") return false;
    if (result.registryStatus === "download_available" && result.sourceStatus === "reachable") return false;
    return result.registryStatus !== result.sourceStatus;
  });

  for (const result of results) {
    const status = result.error
      ? `ERROR ${result.error}`
      : `${result.statusCode || "NO_STATUS"} ${result.statusText || ""}`.trim();
    console.log(
      `${result.id}: ${status} | sourceStatus=${result.sourceStatus} | diagnosticCode=${result.diagnosticCode} | registry=${result.registryStatus || "unset"} | requiresAuth=${result.requiresAuth}`,
    );
  }

  console.log("=========================================");
  console.log(`Sources checked: ${results.length}`);
  console.log(`Reachable: ${results.filter((result) => result.reachable).length}`);
  console.log(`Auth required: ${results.filter((result) => result.sourceStatus === "auth_required").length}`);
  console.log(`Broken links: ${results.filter((result) => result.sourceStatus === "broken_link").length}`);
  console.log(
    `Unavailable/rate-limited/network: ${
      results.filter((result) =>
        ["source_unavailable", "network_unavailable", "dns_failed", "timeout", "rate_limited"].includes(
          result.sourceStatus,
        ),
      ).length
    }`,
  );

  if (registryMismatch.length > 0) {
    console.error("Registry source statuses do not match observed HTTP classification:");
    for (const result of registryMismatch) {
      console.error(
        `  - ${result.id}: observed=${result.sourceStatus} registry=${result.registryStatus || "unset"} status=${result.statusCode || result.error}`,
      );
    }
    process.exit(1);
  }

  if (unreachableVerified.length > 0) {
    console.error("Verified registry sources are not reachable. Do not claim verified source availability:");
    for (const result of unreachableVerified) {
      console.error(`  - ${result.id}: ${result.statusCode || result.error}`);
    }
    process.exit(1);
  }

  console.log(
    "SOURCE AUDIT PASS: registry source statuses preserve HTTP classification and no verified source is currently unreachable.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("SOURCE AUDIT FAILED:", error);
    process.exit(1);
  });
}
