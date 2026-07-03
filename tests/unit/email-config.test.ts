import { describe, expect, it } from "vitest";
import { resolveEmailIntegrationByInboundAddress } from "../../src/adapters/email/config";
import type { Env } from "../../src/shared/types/env";

describe("email integration config", () => {
  it("resolves inbound addresses without requiring a Resend API key", async () => {
    const env = {
      AGENT_DB: createEmailIntegrationDb()
    } as unknown as Env;

    const resolved = await resolveEmailIntegrationByInboundAddress(env, "BOT@EXAMPLE.COM");

    expect(resolved?.integration.id).toBe("pint_email");
    expect(resolved?.config.inboundAddresses).toEqual(["bot@example.com"]);
  });
});

function createEmailIntegrationDb(): D1Database {
  return {
    prepare: () => ({
      bind: () => ({
        all: async () => ({
          results: [
            {
              id: "pint_email",
              agent_id: "agent_1",
              platform: "email",
              name: "Email",
              credential_id: null,
              config_json: JSON.stringify({
                fromAddress: "bot@example.com",
                inboundAddresses: ["bot@example.com"]
              }),
              webhook_secret: null,
              status: "active",
              last_checked_at: null,
              last_error: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z"
            }
          ]
        })
      })
    })
  } as unknown as D1Database;
}
