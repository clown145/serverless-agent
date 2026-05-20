import { describe, expect, it } from "vitest";
import {
  QQ_OFFICIAL_INTENTS,
  qqOfficialIntentMask
} from "../../../src/adapters/qq/official/intents";

describe("qqOfficialIntentMask", () => {
  it("matches AstrBot defaults for public guild, group, c2c, and direct message events", () => {
    expect(qqOfficialIntentMask()).toBe(
      QQ_OFFICIAL_INTENTS.publicGuildMessages |
        QQ_OFFICIAL_INTENTS.publicMessages |
        QQ_OFFICIAL_INTENTS.directMessage
    );
  });

  it("can disable optional intents", () => {
    expect(
      qqOfficialIntentMask({
        enableGroupC2c: false,
        enableGuildDirectMessage: false
      })
    ).toBe(QQ_OFFICIAL_INTENTS.publicGuildMessages);
  });
});
