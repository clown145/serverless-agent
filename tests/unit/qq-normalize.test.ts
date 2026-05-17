import { describe, expect, it } from "vitest";
import { normalizeQqPayload } from "../../src/adapters/qq/normalize";

describe("QQ normalize", () => {
  it("converts C2C messages into internal messages", () => {
    const message = normalizeQqPayload({
      id: "evt-1",
      op: 0,
      t: "C2C_MESSAGE_CREATE",
      d: {
        id: "msg-1",
        author: { user_openid: "user-openid" },
        content: "/ping",
        timestamp: "2026-01-01T00:00:00+08:00"
      }
    }, "default");

    expect(message).toMatchObject({
      platform: "qq",
      platformMessageId: "msg-1",
      conversationId: "qq:c2c:user-openid",
      sender: { platformUserId: "user-openid" },
      kind: "command",
      text: "/ping",
      rawRef: "qq:event:evt-1"
    });
  });

  it("converts group at messages into group conversations", () => {
    const message = normalizeQqPayload({
      id: "evt-2",
      op: 0,
      t: "GROUP_AT_MESSAGE_CREATE",
      d: {
        id: "msg-2",
        author: { member_openid: "member-openid" },
        group_openid: "group-openid",
        content: " hello"
      }
    }, "default");

    expect(message).toMatchObject({
      conversationId: "qq:group:group-openid",
      sender: { platformUserId: "member-openid" },
      text: "hello"
    });
  });

  it("converts channel at messages and attachments", () => {
    const message = normalizeQqPayload({
      op: 0,
      t: "AT_MESSAGE_CREATE",
      d: {
        id: "msg-3",
        author: { id: "user-id", username: "Ada" },
        channel_id: "channel-id",
        content: "photo",
        attachments: [
          {
            content_type: "image/png",
            filename: "a.png",
            size: 10,
            url: "https://cdn.example/a.png"
          }
        ]
      }
    }, "default");

    expect(message?.conversationId).toBe("qq:channel:channel-id");
    expect(message?.sender.displayName).toBe("Ada");
    expect(message?.kind).toBe("attachment");
    expect(message?.attachments).toMatchObject([
      {
        type: "image",
        name: "a.png",
        sourceUrl: "https://cdn.example/a.png"
      }
    ]);
  });

  it("converts guild direct messages", () => {
    const message = normalizeQqPayload({
      op: 0,
      t: "DIRECT_MESSAGE_CREATE",
      d: {
        id: "msg-4",
        author: { id: "user-id" },
        guild_id: "guild-id",
        content: "hi"
      }
    }, "default");

    expect(message).toMatchObject({
      conversationId: "qq:dm:guild-id",
      sender: { platformUserId: "user-id" },
      text: "hi"
    });
  });
});
