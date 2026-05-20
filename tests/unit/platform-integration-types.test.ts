import { describe, expect, it } from "vitest";
import { mapPlatformIntegrationRow } from "../../src/storage/repositories/platform-integration-types";
import { toQqOfficialIntegrationDto } from "../../src/worker/routes/platforms/qq-official-dto";
import { toTelegramIntegrationDto } from "../../src/worker/routes/platforms/telegram-dto";

describe("platform integration types", () => {
  it("parses config JSON and credential metadata", () => {
    expect(
      mapPlatformIntegrationRow({
        id: "pint-1",
        agent_id: "default",
        platform: "telegram",
        name: "Telegram",
        credential_id: "pcred-1",
        config_json: "{\"mode\":\"bot\"}",
        webhook_secret: "secret",
        status: "active",
        last_checked_at: null,
        last_error: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z"
      })
    ).toMatchObject({
      agentId: "default",
      platform: "telegram",
      credentialId: "pcred-1",
      config: { mode: "bot" },
      webhookSecret: "secret"
    });
  });

  it("defaults Telegram integration parse mode to HTML", () => {
    const integration = mapPlatformIntegrationRow({
      id: "pint-1",
      agent_id: "default",
      platform: "telegram",
      name: "Telegram",
      credential_id: "pcred-1",
      config_json: "{}",
      webhook_secret: "secret",
      status: "active",
      last_checked_at: null,
      last_error: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });

    expect(toTelegramIntegrationDto(integration)).toMatchObject({
      parseMode: "HTML"
    });
  });

  it("maps QQ official config and defaults intents", () => {
    const integration = mapPlatformIntegrationRow({
      id: "pint-qq",
      agent_id: "default",
      platform: "qq",
      name: "QQ Official",
      credential_id: "pcred-qq",
      config_json: "{\"appId\":\"12345\",\"isSandbox\":true}",
      webhook_secret: null,
      status: "active",
      last_checked_at: null,
      last_error: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });

    expect(toQqOfficialIntegrationDto(integration)).toMatchObject({
      appId: "12345",
      isSandbox: true,
      enableGroupC2c: true,
      enableGuildDirectMessage: true,
      enablePublicGuildMessages: true,
      hasCredential: true
    });
  });
});
