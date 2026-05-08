import { describe, expect, it } from "vitest";
import {
  createTelegramIntegrationSchema,
  setTelegramWebhookSchema
} from "../../src/worker/routes/platforms/telegram-schemas";

describe("telegram schemas", () => {
  it("defaults integration name", () => {
    expect(
      createTelegramIntegrationSchema.parse({
        botToken: "token"
      })
    ).toMatchObject({ name: "Telegram" });
  });

  it("validates webhook URL when provided", () => {
    expect(
      setTelegramWebhookSchema.parse({
        webhookUrl: "https://agent.example/webhooks/telegram"
      })
    ).toMatchObject({ webhookUrl: "https://agent.example/webhooks/telegram" });
    expect(() => setTelegramWebhookSchema.parse({ webhookUrl: "local" })).toThrow();
  });
});
