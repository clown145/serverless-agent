import { decryptString, encryptString } from "../../security/encryption";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import {
  getHttpCookieJarRecord,
  upsertHttpCookieJarRecord
} from "../../storage/repositories/http-cookie-jars-repository";

const COOKIE_HEADER_MAX_BYTES = 8_000;

export type HttpCookieJarOptions = {
  id?: string;
  mode: "disabled" | "send" | "store" | "send_and_store";
};

export async function resolveCookieHeader(
  env: Env,
  agentId: string,
  url: string,
  cookieJar: HttpCookieJarOptions
): Promise<string | undefined> {
  if (
    (cookieJar.mode !== "send" && cookieJar.mode !== "send_and_store") ||
    !cookieJar.id
  ) {
    return undefined;
  }

  const record = await getHttpCookieJarRecord(env.AGENT_DB, {
    agentId,
    jarId: cookieJar.id
  });
  if (!record) {
    return undefined;
  }

  const cookieHeader = await decryptString(
    {
      encryptedValue: record.encryptedValue,
      iv: record.iv,
      algorithm: "AES-GCM"
    },
    masterKey(env)
  );

  return cookieMatchesUrl(cookieHeader, url) ? cookieHeader : undefined;
}

export async function storeCookieJarFromResponse(
  env: Env,
  agentId: string,
  cookieJar: HttpCookieJarOptions,
  response: Response
): Promise<void> {
  if (
    (cookieJar.mode !== "store" && cookieJar.mode !== "send_and_store") ||
    !cookieJar.id
  ) {
    return;
  }

  const setCookies = getSetCookies(response.headers);
  if (setCookies.length === 0) {
    return;
  }

  const current = await readCookieJar(env, agentId, cookieJar.id);
  const merged = mergeCookieHeaders(current, setCookies);
  if (!merged) {
    return;
  }

  const encrypted = await encryptString(merged, masterKey(env));
  const now = nowIso();
  await upsertHttpCookieJarRecord(env.AGENT_DB, {
    agentId,
    jarId: cookieJar.id,
    encryptedValue: encrypted.encryptedValue,
    iv: encrypted.iv,
    algorithm: encrypted.algorithm,
    createdAt: now,
    updatedAt: now
  });
}

async function readCookieJar(
  env: Env,
  agentId: string,
  jarId: string
): Promise<string | undefined> {
  const record = await getHttpCookieJarRecord(env.AGENT_DB, { agentId, jarId });
  if (!record) {
    return undefined;
  }

  return decryptString(
    {
      encryptedValue: record.encryptedValue,
      iv: record.iv,
      algorithm: "AES-GCM"
    },
    masterKey(env)
  );
}

function mergeCookieHeaders(
  current: string | undefined,
  setCookies: string[]
): string | undefined {
  const jar = new Map<string, string>();
  for (const cookie of parseCookieHeader(current)) {
    jar.set(cookie.name, cookie.value);
  }
  for (const setCookie of setCookies) {
    const parsed = parseSetCookie(setCookie);
    if (parsed) {
      jar.set(parsed.name, parsed.value);
    }
  }

  if (jar.size === 0) {
    return undefined;
  }

  const serialized = Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return serialized.length > COOKIE_HEADER_MAX_BYTES
    ? serialized.slice(0, COOKIE_HEADER_MAX_BYTES)
    : serialized;
}

function parseCookieHeader(input: string | undefined): Array<{ name: string; value: string }> {
  if (!input?.trim()) {
    return [];
  }

  return input.split(/;\s*/).flatMap((segment) => {
    const index = segment.indexOf("=");
    if (index <= 0) {
      return [];
    }
    return [{ name: segment.slice(0, index).trim(), value: segment.slice(index + 1).trim() }];
  });
}

function getSetCookies(headers: Headers): string[] {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  const values = extended.getSetCookie?.();
  if (values?.length) {
    return values;
  }

  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function parseSetCookie(input: string): { name: string; value: string } | undefined {
  const eq = input.indexOf("=");
  if (eq <= 0) {
    return undefined;
  }

  const semi = input.indexOf(";");
  const pair = semi === -1 ? input : input.slice(0, semi);
  const pairEq = pair.indexOf("=");
  if (pairEq <= 0) {
    return undefined;
  }

  return {
    name: pair.slice(0, pairEq).trim(),
    value: pair.slice(pairEq + 1).trim()
  };
}

function cookieMatchesUrl(cookieHeader: string, url: string): boolean {
  return Boolean(cookieHeader.trim() && url);
}

function masterKey(env: Env): string {
  const key = env.AGENT_MASTER_KEY ?? env.INTERNAL_ADMIN_TOKEN;
  if (!key) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required");
  }
  return key;
}
