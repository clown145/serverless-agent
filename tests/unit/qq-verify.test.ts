import { describe, expect, it } from "vitest";
import { createQqValidationResponse } from "../../src/adapters/qq/verify";

describe("QQ verify", () => {
  it("creates validation signature responses", async () => {
    const response = await createQqValidationResponse({
      plain_token: "plain",
      event_ts: "1725442341"
    }, "DG5g3B4j9X2KOErG");

    expect(response.plain_token).toBe("plain");
    expect(response.signature).toMatch(/^[a-f0-9]{128}$/);
  });
});
