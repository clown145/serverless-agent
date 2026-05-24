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
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://bots.qq.com/app/getAppAccessToken");
    expect(fetcher.mock.calls[1]?.[0]).toBe("https://api.sgroup.qq.com/gateway/bot");
  });

  it("sends c2c text messages as markdown to the v2 endpoint", async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/app/getAppAccessToken")) {
        return jsonResponse({ access_token: "token", expires_in: 7200 });
      }
      if (url.endsWith("/v2/users/open-id/messages")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          markdown: { content: "**hello**" },
          msg_type: 2,
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
      api.sendC2cText({
        openId: "open-id",
        content: "**hello**",
        msgId: "source-msg"
      })
    ).resolves.toEqual({ id: "sent-msg" });
  });

  it("falls back to plain content when QQ rejects native markdown", async () => {
    const requestBodies: unknown[] = [];
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/app/getAppAccessToken")) {
        return jsonResponse({ access_token: "token", expires_in: 7200 });
      }
      if (url.endsWith("/v2/groups/group-openid/messages")) {
        requestBodies.push(JSON.parse(String(init?.body)));
        if (requestBodies.length === 1) {
          return jsonResponse(
            { code: 40054001, message: "不允许发送原生 markdown" },
            { status: 400 }
          );
        }
        return jsonResponse({ id: "sent-plain" });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const api = new QqOfficialApiClient({
      appId: "app-id",
      secret: "secret",
      fetcher: fetcher as unknown as typeof fetch
    });

    await expect(
      api.sendGroupText({
        groupOpenId: "group-openid",
        content: "**hello**",
        msgId: "source-msg"
      })
    ).resolves.toEqual({ id: "sent-plain" });
    expect(requestBodies).toEqual([
      expect.objectContaining({
        markdown: { content: "**hello**" },
        msg_type: 2,
        msg_id: "source-msg"
      }),
      expect.objectContaining({
        content: "**hello**",
        msg_type: 0,
        msg_id: "source-msg"
      })
    ]);
  });

  it("uploads and sends group media messages", async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/app/getAppAccessToken")) {
        return jsonResponse({ access_token: "token", expires_in: 7200 });
      }
      if (url.endsWith("/v2/groups/group-openid/files")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          group_openid: "group-openid",
          file_data: "aW1hZ2U=",
          file_type: 1,
          srv_send_msg: false
        });
        return jsonResponse({
          file_uuid: "file-uuid",
          file_info: "file-info",
          ttl: 60
        });
      }
      if (url.endsWith("/v2/groups/group-openid/messages")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          content: "caption",
          msg_type: 7,
          media: {
            file_uuid: "file-uuid",
            file_info: "file-info"
          }
        });
        return jsonResponse({ id: "sent-media" });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const api = new QqOfficialApiClient({
      appId: "app-id",
      secret: "secret",
      fetcher: fetcher as unknown as typeof fetch
    });
    const media = await api.uploadGroupFile({
      groupOpenId: "group-openid",
      fileDataBase64: "aW1hZ2U=",
      fileType: 1
    });

    await expect(
      api.sendGroupMessage({
        groupOpenId: "group-openid",
        content: "caption",
        media,
        msgType: 7,
        msgId: "source-msg"
      })
    ).resolves.toEqual({ id: "sent-media" });
  });
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" }
  });
}
