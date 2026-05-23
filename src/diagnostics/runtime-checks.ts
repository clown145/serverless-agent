import type { Env } from "../shared/types/env";
import {
  diagnosticError,
  diagnosticErrorFromUnknown,
  diagnosticOk,
  diagnosticWarn
} from "./check-result";
import type { DiagnosticCheck } from "./types";
import { createBlobStorage } from "../storage/blob";

export async function runBindingDiagnostics(env: Env): Promise<DiagnosticCheck[]> {
  return [
    await checkD1(env),
    await checkKv(env),
    await checkR2(env),
    checkQueue(env),
    checkAdminToken(env),
    checkCredentialKey(env)
  ];
}

async function checkD1(env: Env): Promise<DiagnosticCheck> {
  try {
    await env.AGENT_DB.prepare("SELECT 1 AS ok").first();
    return diagnosticOk("runtime", "d1", "D1", "Query succeeded");
  } catch (error) {
    return diagnosticErrorFromUnknown("runtime", "d1", "D1", error);
  }
}

async function checkKv(env: Env): Promise<DiagnosticCheck> {
  const key = `diagnostics:${crypto.randomUUID()}`;
  try {
    await env.AGENT_KV.put(key, "ok", { expirationTtl: 60 });
    const value = await env.AGENT_KV.get(key);
    await env.AGENT_KV.delete(key);
    return value === "ok"
      ? diagnosticOk("runtime", "kv", "KV", "Read/write succeeded")
      : diagnosticWarn(
          "runtime",
          "kv",
          "KV",
          "Write completed but read returned a different value"
        );
  } catch (error) {
    return diagnosticErrorFromUnknown("runtime", "kv", "KV", error);
  }
}

async function checkR2(env: Env): Promise<DiagnosticCheck> {
  const key = `diagnostics/${crypto.randomUUID()}.txt`;
  try {
    const storage = createBlobStorage(env);
    await storage.put(key, "ok", { contentType: "text/plain; charset=utf-8" });
    const object = await storage.head(key);
    await storage.delete(key);
    return object
      ? diagnosticOk(
          "runtime",
          "object_storage",
          "Object storage",
          `${storage.backend} put/head/delete succeeded`
        )
      : diagnosticWarn(
          "runtime",
          "object_storage",
          "Object storage",
          `${storage.backend} put completed but object head was empty`
        );
  } catch (error) {
    return diagnosticErrorFromUnknown("runtime", "object_storage", "Object storage", error);
  }
}

function checkQueue(env: Env): DiagnosticCheck {
  return env.AGENT_QUEUE
    ? diagnosticOk("runtime", "queue", "Queue", "Binding is available")
    : diagnosticError("runtime", "queue", "Queue", "Binding is missing");
}

function checkAdminToken(env: Env): DiagnosticCheck {
  return env.INTERNAL_ADMIN_TOKEN
    ? diagnosticOk("runtime", "admin_token", "Admin token", "Configured")
    : diagnosticWarn(
        "runtime",
        "admin_token",
        "Admin token",
        "Admin routes are not protected",
        "Set INTERNAL_ADMIN_TOKEN"
      );
}

function checkCredentialKey(env: Env): DiagnosticCheck {
  if (env.AGENT_MASTER_KEY) {
    return diagnosticOk(
      "runtime",
      "credential_key",
      "Credential key",
      "AGENT_MASTER_KEY configured"
    );
  }

  return env.INTERNAL_ADMIN_TOKEN
    ? diagnosticWarn(
        "runtime",
        "credential_key",
        "Credential key",
        "Using admin token fallback",
        "Set AGENT_MASTER_KEY to keep credential encryption independent"
      )
    : diagnosticError(
        "runtime",
        "credential_key",
        "Credential key",
        "No key available for encrypted credentials",
        "Set AGENT_MASTER_KEY"
      );
}
