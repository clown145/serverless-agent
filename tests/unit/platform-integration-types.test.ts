import { describe, expect, it } from "vitest";
import { mapPlatformIntegrationRow } from "../../src/storage/repositories/platform-integration-types";

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
});
