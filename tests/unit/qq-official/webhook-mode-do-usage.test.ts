import { describe, expect, it, vi } from "vitest";
import { connectConfiguredQqOfficialGateways } from "../../../src/adapters/qq/official/keepalive";
import type { Env } from "../../../src/shared/types/env";
import type { PlatformIntegrationRow } from "../../../src/storage/repositories/platform-integration-types";
import {
  connectQqOfficialIntegration,
  disconnectQqOfficialIntegration,
  getQqOfficialIntegrationStatus
} from "../../../src/worker/routes/platforms/qq-official-admin-actions";

describe("QQ official webhook mode DO usage", () => {
  it("does not touch the QQ gateway Durable Object during keepalive", async () => {
    const env = fakeEnv([qqIntegrationRow({ connectionMode: "webhook" })]);

    await expect(connectConfiguredQqOfficialGateways(env)).resolves.toEqual([
      { agentId: "agent-1", ok: true }
    ]);
    expect(env.QQ_OFFICIAL_GATEWAY.idFromName).not.toHaveBeenCalled();
    expect(env.QQ_OFFICIAL_GATEWAY.get).not.toHaveBeenCalled();
  });

  it("does not touch the QQ gateway Durable Object for webhook admin actions", async () => {
    const env = fakeEnv();
    const integration = {
      id: "pint-qq",
      agentId: "agent-1",
      platform: "qq" as const,
      name: "QQ Official",
      config: {
        appId: "app-id",
        connectionMode: "webhook"
      },
      webhookSecret: "qq-webhook-secret",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    };

    const responses = await Promise.all([
      connectQqOfficialIntegration(env, integration),
      disconnectQqOfficialIntegration(env, integration),
      getQqOfficialIntegrationStatus(env, integration)
    ]);
    const payloads = await Promise.all(responses.map((response) => response.json()));

    expect(payloads).toEqual([
      expect.objectContaining({
        ok: true,
        gateway: expect.objectContaining({
          status: "webhook",
          webhookPath: "/webhooks/qq-official/qq-webhook-secret"
        })
      }),
      expect.objectContaining({
        ok: true,
        gateway: expect.objectContaining({
          status: "webhook",
          webhookPath: "/webhooks/qq-official/qq-webhook-secret"
        })
      }),
      expect.objectContaining({
        ok: true,
        gateway: expect.objectContaining({
          status: "webhook",
          webhookPath: "/webhooks/qq-official/qq-webhook-secret"
        })
      })
    ]);
    expect(env.QQ_OFFICIAL_GATEWAY.idFromName).not.toHaveBeenCalled();
    expect(env.QQ_OFFICIAL_GATEWAY.get).not.toHaveBeenCalled();
  });
});

function fakeEnv(rows: PlatformIntegrationRow[] = []): Env {
  const listStatement = {
    bind: vi.fn(() => listStatement),
    first: vi.fn(async () => rows[0]),
    all: vi.fn(async () => ({ results: rows })),
    run: vi.fn(async () => ({ meta: { changes: 1 } }))
  };
  return {
    AGENT_DB: {
      prepare: vi.fn(() => listStatement)
    },
    AGENT_QUEUE: {
      send: vi.fn(async () => undefined)
    },
    AGENT_OBJECT: {} as DurableObjectNamespace,
    QQ_OFFICIAL_GATEWAY: {
      idFromName: vi.fn(),
      get: vi.fn()
    },
    WEIXIN_OC_GATEWAY: {} as DurableObjectNamespace,
    AGENT_BUCKET: {} as R2Bucket,
    AGENT_KV: {} as KVNamespace
  } as unknown as Env;
}

function qqIntegrationRow(config: Record<string, unknown>): PlatformIntegrationRow {
  return {
    id: "pint-qq",
    agent_id: "agent-1",
    platform: "qq",
    name: "QQ Official",
    credential_id: null,
    config_json: JSON.stringify({
      appId: "app-id",
      secret: "secret",
      ...config
    }),
    webhook_secret: "qq-webhook-secret",
    status: "active",
    last_checked_at: null,
    last_error: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  };
}
