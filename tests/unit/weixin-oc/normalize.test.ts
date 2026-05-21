import { describe, expect, it } from "vitest";
import {
  buildWeixinOcTextItem,
  normalizeWeixinOcInboundMessage,
  parseWeixinOcConversationId,
  textFromWeixinOcItems,
  weixinOcConversationId
} from "../../../src/adapters/weixin-oc/normalize";

describe("Weixin OC normalize", () => {
  it("normalizes inbound personal WeChat text messages", () => {
    expect(
      normalizeWeixinOcInboundMessage(
        {
          message_id: "msg-1",
          from_user_id: "wx-user",
          context_token: "ctx",
          create_time_ms: 1_765_000_000_000,
          item_list: [
            {
              type: 1,
              text_item: { text: "hello" }
            }
          ]
        },
        "default"
      )
    ).toMatchObject({
      platform: "weixin_oc",
      platformMessageId: "msg-1",
      agentId: "default",
      conversationId: "weixin_oc:wx-user",
      text: "hello",
      sender: {
        platformUserId: "wx-user",
        role: "member"
      }
    });
  });

  it("builds stable conversation ids", () => {
    expect(weixinOcConversationId("wx-user")).toBe("weixin_oc:wx-user");
    expect(parseWeixinOcConversationId("weixin_oc:wx-user")).toEqual({
      userId: "wx-user"
    });
  });

  it("keeps encrypted media as text placeholders until media decoding is available", () => {
    const items = [
      { type: 2 },
      { type: 3, voice_item: { text: "transcribed" } },
      { type: 4, file_item: { file_name: "report.pdf", len: "12" } },
      { type: 5 }
    ];
    expect(textFromWeixinOcItems(items)).toBe("[图片]\ntranscribed\n[文件]\n[视频]");

    expect(
      normalizeWeixinOcInboundMessage(
        {
          message_id: "msg-media",
          from_user_id: "wx-user",
          item_list: items
        },
        "default"
      )?.attachments
    ).toEqual([]);
  });

  it("builds outbound text items", () => {
    expect(buildWeixinOcTextItem("hi")).toEqual({
      type: 1,
      text_item: { text: "hi" }
    });
  });
});
