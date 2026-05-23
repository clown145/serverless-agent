import { describe, expect, it, vi } from "vitest";
import { sendQqOfficialDirect } from "../../../src/adapters/qq/official/direct-sender";
import type { Env } from "../../../src/shared/types/env";

describe("sendQqOfficialDirect", () => {
  it("sends webhook-mode group text as markdown", async () => {
    const bodies: unknown[] = [];
    const originalFetch = globalThis.fetch;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/app/getAppAccessToken")) {
        return jsonResponse({ access_token: "token", expires_in: 7200 });
      }
      if (url.endsWith("/v2/groups/group-openid/messages")) {
        bodies.push(JSON.parse(String(init?.body)));
        return jsonResponse({ id: "sent-markdown" });
      }
      throw new Error(`unexpected url ${url}`);
    });
    globalThis.fetch = fetcher as unknown as typeof fetch;

    try {
      await expect(
        sendQqOfficialDirect(fakeEnv(), "agent-1", {
          conversationId: "qq:group:group-openid",
          text: "**hello**"
        })
      ).resolves.toEqual({
        ok: true,
        providerMessageId: "sent-markdown"
      });
      expect(bodies).toEqual([
        expect.objectContaining({
          markdown: { content: "**hello**" },
          msg_type: 2,
          msg_id: "source-msg",
          event_id: "source-event"
        })
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

function fakeEnv(): Env {
  const statement = {
    bind: vi.fn((...values: string[]) => {
      statement.bound = values;
      return statement;
    }),
    first: vi.fn(async () => {
      if (statement.bound[1] === "qq:group:group-openid") {
        return {
          integration_id: "pint-qq",
          agent_id: "agent-1",
          conversation_id: "qq:group:group-openid",
          target_kind: "group",
          target_id: "group-openid",
          last_message_id: "source-msg",
          last_event_id: "source-event",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        };
      }
      return qqIntegrationRow();
    }),
    all: vi.fn(async () => ({ results: [qqIntegrationRow()] })),
    run: vi.fn(async () => ({ meta: { changes: 1 } })),
    bound: [] as string[]
  };

  return {
    AGENT_DB: {
      prepare: vi.fn(() => statement)
    },
    AGENT_QUEUE: {
      send: vi.fn(async () => undefined)
    },
    AGENT_OBJECT: {} as DurableObjectNamespace,
    QQ_OFFICIAL_GATEWAY: {} as DurableObjectNamespace,
    WEIXIN_OC_GATEWAY: {} as DurableObjectNamespace,
    AGENT_BUCKET: {} as R2Bucket,
    AGENT_KV: {} as KVNamespace
  } as unknown as Env;
}

function qqIntegrationRow() {
  return {
    id: "pint-qq",
    agent_id: "agent-1",
    platform: "qq",
    name: "QQ",
    credential_id: null,
    config_json: JSON.stringify({
      appId: "app-id",
      secret: "secret",
      connectionMode: "webhook"
    }),
    webhook_secret: "webhook-secret",
    status: "active",
    last_checked_at: null,
    last_error: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" }
  });
}
