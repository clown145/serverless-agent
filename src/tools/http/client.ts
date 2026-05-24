import type { Env } from "../../shared/types/env";
import {
  resolveCookieHeader,
  storeCookieJarFromResponse,
  type HttpCookieJarOptions
} from "./cookie-jar";
import { buildMultipartFormData, type HttpMultipartPart } from "./multipart";
import { readResponseText } from "./response";
import { validateFetchUrl } from "./url-safety";

const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 15_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type HttpRequestBody =
  | { kind: "empty" }
  | { kind: "json"; value: unknown }
  | { kind: "text"; value: string }
  | { kind: "form"; value: Record<string, string> }
  | { kind: "base64"; value: string }
  | { kind: "multipart"; parts: HttpMultipartPart[] };

export type SafeHttpRequestInput = {
  env: Env;
  agentId: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body: HttpRequestBody;
  cookieJar?: HttpCookieJarOptions;
  maxBytes: number;
  timeoutMs?: number;
  maxRedirects?: number;
};

export type SafeHttpResponse = {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  ok: boolean;
  contentType?: string;
  headers: Record<string, string>;
  redirectChain: string[];
  bodyText: string;
  bodyJson?: unknown;
  truncated: boolean;
};

type PreparedBody = {
  headers: Headers;
  body?: BodyInit;
};

export async function safeHttpRequest(input: SafeHttpRequestInput): Promise<SafeHttpResponse> {
  let url = input.url;
  let method = input.method;
  let body = input.body;
  const redirectChain: string[] = [];
  const maxRedirects = input.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const cookieJar = input.cookieJar ?? { mode: "disabled" as const };

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const urlError = validateFetchUrl(url);
    if (urlError) {
      throw new Error(urlError);
    }

    const requestInit = await buildRequestInit({
      env: input.env,
      agentId: input.agentId,
      url,
      method,
      headers: input.headers,
      body,
      cookieJar
    });

    const response = await fetchWithTimeout(url, requestInit, input.timeoutMs);
    await storeCookieJarFromResponse(input.env, input.agentId, cookieJar, response);

    if (!REDIRECT_STATUSES.has(response.status)) {
      return readSafeHttpResponse(input.url, response, redirectChain, input.maxBytes);
    }

    const location = response.headers.get("location");
    if (!location) {
      return readSafeHttpResponse(input.url, response, redirectChain, input.maxBytes);
    }

    const nextUrl = new URL(location, response.url || url).toString();
    const nextUrlError = validateFetchUrl(nextUrl);
    if (nextUrlError) {
      throw new Error(`Redirect blocked: ${nextUrlError}`);
    }

    redirectChain.push(nextUrl);
    url = nextUrl;
    if (
      response.status === 303 ||
      ((response.status === 301 || response.status === 302) && method === "POST")
    ) {
      method = "GET";
      body = { kind: "empty" };
    }
  }

  throw new Error(`Too many redirects: exceeded ${maxRedirects}`);
}

async function buildRequestInit(input: {
  env: Env;
  agentId: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body: HttpRequestBody;
  cookieJar: HttpCookieJarOptions;
}): Promise<RequestInit> {
  const prepared = await prepareBody(input.env, input.agentId, input.body, input.headers ?? {});
  const headers = prepared.headers;
  const cookieHeader = await resolveCookieHeader(
    input.env,
    input.agentId,
    input.url,
    input.cookieJar
  );
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  return {
    method: input.method,
    headers,
    body: shouldSendBody(input.method) ? prepared.body : undefined,
    redirect: "manual"
  };
}

async function prepareBody(
  env: Env,
  agentId: string,
  body: HttpRequestBody,
  rawHeaders: Record<string, string>
): Promise<PreparedBody> {
  const headers = new Headers(rawHeaders);

  switch (body.kind) {
    case "json":
      setDefaultHeader(headers, "content-type", "application/json");
      return { headers, body: JSON.stringify(body.value) };
    case "text":
      setDefaultHeader(headers, "content-type", "text/plain;charset=UTF-8");
      return { headers, body: body.value };
    case "form": {
      const form = new URLSearchParams(body.value);
      setDefaultHeader(headers, "content-type", "application/x-www-form-urlencoded");
      return { headers, body: form.toString() };
    }
    case "base64":
      return { headers, body: decodeBase64(body.value) };
    case "multipart":
      return buildMultipartBody(env, agentId, body.parts, headers);
    case "empty":
      return { headers };
  }
}

async function buildMultipartBody(
  env: Env,
  agentId: string,
  parts: HttpMultipartPart[],
  headers: Headers
): Promise<PreparedBody> {
  const form = await buildMultipartFormData(env, agentId, parts);
  headers.delete("content-type");
  headers.delete("content-length");
  return { headers, body: form };
}

function setDefaultHeader(headers: Headers, name: string, value: string): void {
  if (!headers.has(name)) {
    headers.set(name, value);
  }
}

function shouldSendBody(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readSafeHttpResponse(
  originalUrl: string,
  response: Response,
  redirectChain: string[],
  maxBytes: number
): Promise<SafeHttpResponse> {
  const contentType = response.headers.get("content-type") ?? undefined;
  const { text: bodyText, truncated } = await readResponseText(response, maxBytes);
  const bodyJson = parseJsonBody(contentType, bodyText);

  return {
    url: originalUrl,
    finalUrl: response.url || redirectChain.at(-1) || originalUrl,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    contentType,
    headers: publicResponseHeaders(response.headers),
    redirectChain,
    bodyText,
    bodyJson,
    truncated
  };
}

function publicResponseHeaders(headers: Headers): Record<string, string> {
  const allowed = [
    "cache-control",
    "content-language",
    "content-length",
    "content-type",
    "date",
    "etag",
    "expires",
    "last-modified",
    "location",
    "retry-after",
    "server",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset"
  ];
  const result: Record<string, string> = {};
  for (const name of allowed) {
    const value = headers.get(name);
    if (value !== null) {
      result[name] = value;
    }
  }
  return result;
}

function parseJsonBody(contentType: string | undefined, bodyText: string): unknown {
  if (!contentType?.includes("json") || !bodyText.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return undefined;
  }
}

function decodeBase64(input: string): Uint8Array {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
