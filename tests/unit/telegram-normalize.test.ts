import { describe, expect, it } from "vitest";
import { normalizeTelegramUpdate } from "../../src/adapters/telegram/normalize";

describe("Telegram normalize", () => {
  it("converts text messages into internal messages", () => {
    const message = normalizeTelegramUpdate(
      {
        update_id: 1,
        message: {
          message_id: 10,
          from: { id: 20, first_name: "Ada" },
          chat: { id: 30, type: "private" },
          date: 1760000000,
          text: "/ping"
        }
      },
      "default"
    );

    expect(message?.platform).toBe("telegram");
    expect(message?.conversationId).toBe("telegram:30");
    expect(message?.kind).toBe("command");
  });

  it("uses captions as message text", () => {
    const message = normalizeTelegramUpdate(
      {
        update_id: 2,
        message: {
          message_id: 11,
          from: { id: 21, first_name: "Grace" },
          chat: { id: 31, type: "group" },
          date: 1760000000,
          caption: "photo note"
        }
      },
      "default"
    );

    expect(message?.text).toBe("photo note");
    expect(message?.kind).toBe("text");
  });
});
