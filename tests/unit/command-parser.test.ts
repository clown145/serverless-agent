import { describe, expect, it } from "vitest";
import { parseCommand } from "../../src/commands/parser";

describe("command parser", () => {
  it("parses Telegram bot suffixes", () => {
    expect(parseCommand("/new@my_bot project notes")).toMatchObject({
      name: "new",
      args: ["project", "notes"],
      rest: "project notes"
    });
  });

  it("ignores plain text", () => {
    expect(parseCommand("hello")).toBeUndefined();
  });
});
