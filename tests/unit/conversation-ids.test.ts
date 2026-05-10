import { describe, expect, it } from "vitest";
import {
  conversationSessionSuffix,
  createLogicalConversationId,
  physicalConversationForPlatform,
  rootConversationId
} from "../../src/conversations/ids";

describe("conversation ids", () => {
  it("separates physical and logical conversation ids", () => {
    const logical = createLogicalConversationId("telegram:123", "work");

    expect(logical).toBe("telegram:123#work");
    expect(rootConversationId(logical)).toBe("telegram:123");
    expect(conversationSessionSuffix(logical)).toBe("work");
    expect(physicalConversationForPlatform("telegram", logical)).toBe("telegram:123");
  });
});
