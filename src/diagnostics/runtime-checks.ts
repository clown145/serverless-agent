import type { Env } from "../shared/types/env";

export type DiagnosticStatus = "ok" | "warn" | "error";

export type DiagnosticCheck = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
};

export async function runRuntimeDiagnostics(env: Env): Promise<DiagnosticCheck[]> {
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
    return ok("d1", "D1", "Query succeeded");
  } catch (error) {
    return failed("d1", "D1", error);
  }
}

async function checkKv(env: Env): Promise<DiagnosticCheck> {
  const key = `diagnostics:${crypto.randomUUID()}`;
  try {
    await env.AGENT_KV.put(key, "ok", { expirationTtl: 60 });
    const value = await env.AGENT_KV.get(key);
    await env.AGENT_KV.delete(key);
    return value === "ok"
      ? ok("kv", "KV", "Read/write succeeded")
      : warn("kv", "KV", "Write completed but read returned a different value");
  } catch (error) {
    return failed("kv", "KV", error);
  }
}

async function checkR2(env: Env): Promise<DiagnosticCheck> {
  const key = `diagnostics/${crypto.randomUUID()}.txt`;
  try {
    await env.AGENT_BUCKET.put(key, "ok");
    const object = await env.AGENT_BUCKET.head(key);
    await env.AGENT_BUCKET.delete(key);
    return object
      ? ok("r2", "R2", "Put/head/delete succeeded")
      : warn("r2", "R2", "Put completed but object head was empty");
  } catch (error) {
    return failed("r2", "R2", error);
  }
}

function checkQueue(env: Env): DiagnosticCheck {
  return env.AGENT_QUEUE
    ? ok("queue", "Queue", "Binding is available")
    : failed("queue", "Queue", "Binding is missing");
}

function checkAdminToken(env: Env): DiagnosticCheck {
  return env.INTERNAL_ADMIN_TOKEN
    ? ok("admin_token", "Admin token", "Configured")
    : warn("admin_token", "Admin token", "Admin routes are not protected");
}

function checkCredentialKey(env: Env): DiagnosticCheck {
  if (env.AGENT_MASTER_KEY) {
    return ok("credential_key", "Credential key", "AGENT_MASTER_KEY configured");
  }

  return env.INTERNAL_ADMIN_TOKEN
    ? warn("credential_key", "Credential key", "Using admin token fallback")
    : failed("credential_key", "Credential key", "No key available for encrypted credentials");
}

function ok(id: string, label: string, detail: string): DiagnosticCheck {
  return { id, label, detail, status: "ok" };
}

function warn(id: string, label: string, detail: string): DiagnosticCheck {
  return { id, label, detail, status: "warn" };
}

function failed(id: string, label: string, error: unknown): DiagnosticCheck {
  return {
    id,
    label,
    status: "error",
    detail: error instanceof Error ? error.message : String(error)
  };
}
