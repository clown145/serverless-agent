import { describe, expect, it } from "vitest";
import { resolvePlatformContextHints } from "../../src/platforms/context-hints";
import type { Env } from "../../src/shared/types/env";
import type { InternalMessage } from "../../src/shared/types/internal-message";
import type { PlatformIntegrationRow } from "../../src/storage/repositories/platform-integration-types";

describe("platform context hints", () => {
  it("resolves Telegram HTML formatting guidance from integration config", async () => {
    const hints = await resolvePlatformContextHints(
      envWithIntegration({ parseMode: "HTML" }),
      message({ platform: "telegram", conversationId: "telegram:123" })
    );

    expect(hints.formatInstruction).toContain("Telegram formatting");
    expect(hints.formatInstruction).toContain("parse_mode HTML");
  });

  it("resolves Telegram plain-text guidance when parse mode is disabled", async () => {
    const hints = await resolvePlatformContextHints(
      envWithIntegration({ parseMode: "none" }),
      message({ platform: "telegram", conversationId: "telegram:123" })
    );

    expect(hints.formatInstruction).toContain("plain text");
    expect(hints.formatInstruction).not.toContain("parse_mode HTML");
  });

  it("uses generic formatting guidance for non-specialized platforms", async () => {
    const hints = await resolvePlatformContextHints(
      envWithIntegration(undefined),
      message({ platform: "qq", conversationId: "qq:123" })
    );

    expect(hints.formatInstruction).toContain("keep output plain");
  });
});

function envWithIntegration(
  config: Record<string, unknown> | undefined
): Env {
  return {
    AGENT_DB: createIntegrationDb(config)
  } as unknown as Env;
}

function createIntegrationDb(
  config: Record<string, unknown> | undefined
): D1Database {
  const row = config
    ? ({
        id: "pint_1",
        agent_id: "default",
        platform: "telegram",
        name: "Telegram",
        config_json: JSON.stringify(config),
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z"
      } satisfies PlatformIntegrationRow)
    : undefined;

  return {
    prepare: () => ({
      bind: () => ({
        first: async () => row
      })
    })
  } as unknown as D1Database;
}

function message(
  overrides: Pick<InternalMessage, "platform" | "conversationId">
): InternalMessage {
  return {
    id: "msg_1",
    platform: overrides.platform,
    platformMessageId: "msg_1",
    agentId: "default",
    conversationId: overrides.conversationId,
    sender: {
      platformUserId: "user_1",
      role: "owner"
    },
    kind: "text",
    text: "hello",
    attachments: [],
    receivedAt: "2026-01-01T00:00:00.000Z"
  };
}
