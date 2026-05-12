import { describe, expect, it } from "vitest";
import { createTelegramBotCommands } from "../../src/adapters/telegram/commands";

describe("telegram commands", () => {
  it("creates an English bot command menu from supported commands", () => {
    expect(createTelegramBotCommands()).toEqual([
      { command: "help", description: "Show available commands" },
      { command: "start", description: "Show help and start the bot" },
      { command: "new", description: "Open a new conversation" },
      { command: "sessions", description: "List conversations" },
      { command: "switch", description: "Switch conversation" },
      { command: "model", description: "Show or set the model" },
      { command: "context", description: "Show or update context settings" },
      { command: "compact", description: "Compact conversation context" },
      { command: "task", description: "Create a delayed or recurring task" }
    ]);
  });
});
