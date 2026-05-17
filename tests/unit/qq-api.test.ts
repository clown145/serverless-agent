import { afterEach, describe, expect, it, vi } from "vitest";
import { callQqApi, getQqAccessToken, qqApiBaseUrl } from "../../src/adapters/qq/api";
import type { Env } from "../../src/shared/types/env";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("QQ api", () => {
  it("selects sandbox and production API bases", () => {
    expect(qqApiBaseUrl("sandbox")).toBe("https://sandbox.api.sgroup.qq.com");
    expect(qqApiBaseUrl("production")).toBe("https://api.sgroup.qq.com");
  });

  it("gets and caches access tokens", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ access_token: "token", expires_in: "7200" }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const kv = createKv();

    const token = await getQqAccessToken({ AGENT_KV: kv } as unknown as Env, {
      integrationId: "pint-1",
      credential: { appId: "app", appSecret: "secret" }
    });

    expect(token).toBe("token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchBody(fetchMock)).toEqual({ appId: "app", clientSecret: "secret" });
    expect(kv.value).toBe(JSON.stringify({ accessToken: "token" }));
  });

  it("calls QQ OpenAPI with QQBot authorization", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "msg-id" }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(callQqApi({
      accessToken: "token",
      environment: "sandbox",
      path: "/v2/users/u/messages",
      body: { content: "hi", msg_type: 0 }
    })).resolves.toMatchObject({ id: "msg-id" });

    const call = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    expect(String(call[0])).toBe("https://sandbox.api.sgroup.qq.com/v2/users/u/messages");
    expect(call[1].headers).toMatchObject({ authorization: "QQBot token" });
  });
});

function createKv() {
  return {
    value: undefined as string | undefined,
    async get() {
      return undefined;
    },
    async put(_key: string, value: string) {
      this.value = value;
    }
  };
}

function fetchBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" }
  });
}
