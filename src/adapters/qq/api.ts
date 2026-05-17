import type { Env } from "../../shared/types/env";
import type {
  QqAccessTokenResponse,
  QqApiErrorResponse,
  QqCredential,
  QqEnvironment
} from "./types";

const ACCESS_TOKEN_URL = "https://bots.qq.com/app/getAppAccessToken";
const PRODUCTION_API_BASE = "https://api.sgroup.qq.com";
const SANDBOX_API_BASE = "https://sandbox.api.sgroup.qq.com";
const TOKEN_REFRESH_SKEW_SECONDS = 60;

export function qqApiBaseUrl(environment: QqEnvironment): string {
  return environment === "production" ? PRODUCTION_API_BASE : SANDBOX_API_BASE;
}

export async function getQqAccessToken(
  env: Env,
  input: {
    integrationId: string;
    credential: QqCredential;
  }
): Promise<string> {
  const cacheKey = `qq:access-token:${input.integrationId}`;
  const cached = await env.AGENT_KV.get(cacheKey, "json").catch(() => undefined) as
    | { accessToken?: string }
    | undefined;
  if (cached?.accessToken) {
    return cached.accessToken;
  }

  const response = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      appId: input.credential.appId,
      clientSecret: input.credential.appSecret
    })
  });
  const payload = await response.json().catch(() => undefined) as
    | QqAccessTokenResponse
    | QqApiErrorResponse
    | undefined;

  if (!response.ok || !payload || !("access_token" in payload)) {
    throw new Error(apiErrorMessage("QQ token request failed", response.status, payload));
  }

  const expiresIn = Math.max(Number(payload.expires_in) || 0, TOKEN_REFRESH_SKEW_SECONDS + 1);
  await env.AGENT_KV.put(
    cacheKey,
    JSON.stringify({ accessToken: payload.access_token }),
    { expirationTtl: Math.max(expiresIn - TOKEN_REFRESH_SKEW_SECONDS, 1) }
  ).catch(() => undefined);

  return payload.access_token;
}

export async function callQqApi<T>(input: {
  accessToken: string;
  environment: QqEnvironment;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
}): Promise<T> {
  const response = await fetch(`${qqApiBaseUrl(input.environment)}${input.path}`, {
    method: input.method ?? "POST",
    headers: {
      authorization: `QQBot ${input.accessToken}`,
      "content-type": "application/json"
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body)
  });
  const payload = await response.json().catch(() => undefined) as T | QqApiErrorResponse | undefined;

  if (!response.ok) {
    throw new Error(apiErrorMessage("QQ API request failed", response.status, payload));
  }

  return payload as T;
}

function apiErrorMessage(prefix: string, status: number, payload: unknown): string {
  if (payload && typeof payload === "object") {
    const error = payload as QqApiErrorResponse;
    if (error.message) {
      return `${prefix}: ${error.message}`;
    }
    if (error.code !== undefined) {
      return `${prefix}: ${error.code}`;
    }
  }

  return `${prefix}: HTTP ${status}`;
}
