import { describe, expect, it } from "vitest";
import {
  normalizeWecomKfMessage,
  wecomConversationId
} from "../../../src/adapters/wecom/normalize";

describe("WeCom normalize", () => {
  it("normalizes customer service text messages", () => {
    expect(
      normalizeWecomKfMessage(
        {
          msgid: "msg-1",
          msgtype: "text",
          open_kfid: "wkf_123",
          external_userid: "wm_user",
          send_time: 1_765_000_000,
          text: { content: "hello" }
        },
        "default"
      )
    ).toMatchObject({
      platform: "wecom",
      platformMessageId: "msg-1",
      agentId: "default",
      conversationId: "wecom:kf:wkf_123:wm_user",
      text: "hello",
      sender: {
        platformUserId: "wm_user",
        role: "member"
      }
    });
  });

  it("builds stable customer service conversation ids", () => {
    expect(wecomConversationId("wkf", "external")).toBe("wecom:kf:wkf:external");
  });
});
