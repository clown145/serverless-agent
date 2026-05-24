import { describe, expect, it } from "vitest";
import {
  normalizeQqOfficialGatewayEvent,
  qqOfficialConversationId
} from "../../../src/adapters/qq/official/normalize";

describe("normalizeQqOfficialGatewayEvent", () => {
  it("normalizes group at messages", () => {
    const result = normalizeQqOfficialGatewayEvent(
      "GROUP_AT_MESSAGE_CREATE",
      {
        id: "msg-1",
        content: " hello ",
        group_openid: "group-openid",
        author: { member_openid: "member-openid" },
        attachments: [
          {
            id: "att-1",
            content_type: "image/png",
            filename: "image.png",
            url: "cdn.qq.com/image.png"
          }
        ]
      },
      "agent-1"
    );

    expect(result.conversationBinding).toMatchObject({
      conversationId: "qq:group:group-openid",
      targetKind: "group",
      targetId: "group-openid",
      lastMessageId: "msg-1"
    });
    expect(result.message).toMatchObject({
      platform: "qq",
      platformMessageId: "msg-1",
      agentId: "agent-1",
      conversationId: "qq:group:group-openid",
      text: "hello"
    });
    expect(result.message?.attachments[0]).toMatchObject({
      type: "image",
      sourceUrl: "https://cdn.qq.com/image.png"
    });
  });

  it("strips channel bot mention", () => {
    const result = normalizeQqOfficialGatewayEvent(
      "AT_MESSAGE_CREATE",
      {
        id: "msg-2",
        content: "<@!bot-id> ping",
        channel_id: "channel-id",
        author: { id: "user-id" },
        mentions: [{ id: "bot-id" }]
      },
      "agent-1"
    );

    expect(result.message?.conversationId).toBe("qq:channel:channel-id");
    expect(result.message?.text).toBe("ping");
  });

  it("uses c2c user openid as conversation target", () => {
    const result = normalizeQqOfficialGatewayEvent(
      "C2C_MESSAGE_CREATE",
      {
        id: "msg-3",
        content: "/help",
        author: { user_openid: "user-openid" }
      },
      "agent-1"
    );

    expect(result.conversationBinding).toMatchObject({
      conversationId: "qq:c2c:user-openid",
      targetKind: "c2c",
      targetId: "user-openid"
    });
    expect(result.message?.kind).toBe("command");
  });
});

describe("qqOfficialConversationId", () => {
  it("preserves target kind in the conversation id", () => {
    expect(qqOfficialConversationId("direct", "guild-id")).toBe("qq:direct:guild-id");
  });
});
