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
      { command: "think", description: "Set reasoning effort" },
      { command: "context", description: "Show or update context settings" },
      { command: "compact", description: "Compact conversation context" },
      { command: "skillauto", description: "Toggle skill edit confirmations" },
      { command: "task", description: "Create a delayed or recurring task" },
      { command: "sid", description: "Show session and permission IDs" }
    ]);
  });

  it("only exposes bot commands accepted by Telegram", () => {
    expect(createTelegramBotCommands().map((command) => command.command)).not.toContain(
      "skill-auto-edits"
    );
    for (const command of createTelegramBotCommands()) {
      expect(command.command).toMatch(/^[a-z0-9_]{1,32}$/);
    }
  });
});
