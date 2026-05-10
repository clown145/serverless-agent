import { describe, expect, it } from "vitest";
import {
  normalizeTelegramParseMode,
  stripTelegramMarkup,
  telegramParseModePayload
} from "../../src/adapters/telegram/formatting";

describe("telegram formatting", () => {
  it("defaults to HTML parse mode", () => {
    expect(normalizeTelegramParseMode(undefined)).toBe("HTML");
    expect(telegramParseModePayload("HTML")).toBe("HTML");
    expect(telegramParseModePayload("none")).toBeUndefined();
  });

  it("strips supported HTML for plain text fallback", () => {
    expect(
      stripTelegramMarkup('<b>Hello</b> <a href="https://example.com">link</a> &amp; text')
    ).toBe("Hello link (https://example.com) & text");
  });
});
