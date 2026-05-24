import { describe, expect, it } from "vitest";
import {
  attachmentsFromWeixinOcItems,
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

  it("creates image attachments for encrypted media", () => {
    const items = [
      {
        type: 2,
        msg_id: "img-1",
        image_item: {
          media: {
            encrypt_query_param: "download-param",
            aes_key: "YWVz"
          },
          aeskey: "00112233445566778899aabbccddeeff",
          mid_size: 1234
        }
      },
      { type: 3, voice_item: { text: "transcribed" } },
      { type: 4, file_item: { file_name: "report.pdf", len: "12" } },
      { type: 5 }
    ];
    expect(textFromWeixinOcItems(items)).toBe("[image]\ntranscribed\n[file]\n[video]");
    expect(attachmentsFromWeixinOcItems(items)).toMatchObject([
      {
        id: "wxoc_image_img-1",
        type: "image",
        name: "weixin-oc-image-img-1.jpg",
        mimeType: "image/jpeg",
        size: 1234
      }
    ]);
    expect(attachmentsFromWeixinOcItems(items)[0]?.sourceUrl).toMatch(/^weixin-oc:cdn:/);

    expect(
      normalizeWeixinOcInboundMessage(
        {
          message_id: "msg-media",
          from_user_id: "wx-user",
          item_list: items
        },
        "default"
      )?.attachments
    ).toMatchObject([
      {
        type: "image",
        sourceUrl: expect.stringMatching(/^weixin-oc:cdn:/)
      }
    ]);
  });

  it("builds outbound text items", () => {
    expect(buildWeixinOcTextItem("hi")).toEqual({
      type: 1,
      text_item: { text: "hi" }
    });
  });
});
