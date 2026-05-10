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
    ).toMatchObject({ name: "Telegram", parseMode: "HTML" });
  });

  it("validates Telegram parse mode updates", async () => {
    const { updateTelegramIntegrationSchema } = await import(
      "../../src/worker/routes/platforms/telegram-schemas"
    );

    expect(updateTelegramIntegrationSchema.parse({ parseMode: "MarkdownV2" })).toEqual({
      parseMode: "MarkdownV2"
    });
    expect(() => updateTelegramIntegrationSchema.parse({ parseMode: "Markdown" })).toThrow();
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
