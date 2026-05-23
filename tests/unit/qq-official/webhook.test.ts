import { describe, expect, it, vi } from "vitest";
import { handleQqOfficialWebhookPayload } from "../../../src/adapters/qq/official/webhook";
import type { Env } from "../../../src/shared/types/env";
import type { PlatformIntegrationRecord } from "../../../src/storage/repositories/platform-integration-types";

describe("QQ official webhook handler", () => {
  it("acks validation callbacks", async () => {
    const env = fakeEnv();
    const result = await handleQqOfficialWebhookPayload(env, integration(), {
      op: 13,
      d: {
        event_ts: "123",
        plain_token: "plain"
      }
    });

    expect(result.handled).toBe(true);
    expect(result.response).toMatchObject({
      plain_token: "plain",
      signature: expect.any(String)
    });
  });

  it("normalizes dispatch callbacks and queues inbound messages", async () => {
    const env = fakeEnv();
    const result = await handleQqOfficialWebhookPayload(env, integration(), {
      op: 0,
      t: "GROUP_AT_MESSAGE_CREATE",
      d: {
        id: "msg-1",
        content: "hello",
        group_openid: "group-openid",
        author: { member_openid: "member-openid" }
      }
    });

    expect(result.response).toEqual({ opcode: 12 });
    expect(env.AGENT_DB.prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO qq_official_conversations")
    );
    expect(env.AGENT_QUEUE.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "inbound.message",
        agentId: "agent-1",
        message: expect.objectContaining({
          conversationId: "qq:group:group-openid",
          text: "hello"
        })
      })
    );
  });
});

function integration(): PlatformIntegrationRecord {
  return {
    id: "pint-qq",
    agentId: "agent-1",
    platform: "qq",
    name: "QQ",
    config: {
      appId: "app-id",
      secret: "secret",
      connectionMode: "webhook"
    },
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function fakeEnv(): Env {
  const statement = {
    bind: vi.fn(() => statement),
    run: vi.fn(async () => ({ meta: { changes: 1 } })),
    first: vi.fn(async () => undefined),
    all: vi.fn(async () => ({ results: [] }))
  };
  return {
    AGENT_QUEUE: {
      send: vi.fn(async () => undefined)
    },
    AGENT_DB: {
      prepare: vi.fn(() => statement)
    },
    AGENT_OBJECT: {} as DurableObjectNamespace,
    QQ_OFFICIAL_GATEWAY: {} as DurableObjectNamespace,
    WEIXIN_OC_GATEWAY: {} as DurableObjectNamespace,
    AGENT_BUCKET: {} as R2Bucket,
    AGENT_KV: {} as KVNamespace
  } as unknown as Env;
}
