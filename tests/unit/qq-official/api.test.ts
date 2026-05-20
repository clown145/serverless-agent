import { describe, expect, it, vi } from "vitest";
import { QqOfficialApiClient } from "../../../src/adapters/qq/official/api";

describe("QqOfficialApiClient", () => {
  it("logs in, fetches gateway info, and normalizes snake case", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith("/app/getAppAccessToken")) {
        return jsonResponse({ access_token: "token", expires_in: "7200" });
      }
      if (url.endsWith("/gateway/bot")) {
        return jsonResponse({
          url: "wss://gateway.example",
          shards: 1,
          session_start_limit: {
            remaining: 10,
            max_concurrency: 1
          }
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const api = new QqOfficialApiClient({
      appId: "app-id",
      secret: "secret",
      fetcher: fetcher as unknown as typeof fetch
    });

    await expect(api.getGatewayBot()).resolves.toEqual({
      url: "wss://gateway.example",
      shards: 1,
      sessionStartLimit: {
        total: undefined,
        remaining: 10,
        resetAfter: undefined,
        maxConcurrency: 1
      }
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://bots.qq.com/app/getAppAccessToken"
    );
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "https://api.sgroup.qq.com/gateway/bot"
    );
  });

  it("sends c2c messages to the v2 endpoint", async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/app/getAppAccessToken")) {
        return jsonResponse({ access_token: "token", expires_in: 7200 });
      }
      if (url.endsWith("/v2/users/open-id/messages")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          content: "hello",
          msg_type: 0,
          msg_id: "source-msg"
        });
        return jsonResponse({ id: "sent-msg" });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const api = new QqOfficialApiClient({
      appId: "app-id",
      secret: "secret",
      fetcher: fetcher as unknown as typeof fetch
    });

    await expect(
      api.sendC2cMessage({
        openId: "open-id",
        content: "hello",
        msgId: "source-msg"
      })
    ).resolves.toEqual({ id: "sent-msg" });
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
