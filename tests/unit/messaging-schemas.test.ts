import { describe, expect, it } from "vitest";
import {
  currentConversationFileInputSchema,
  sendButtonsInputSchema,
  sendFileInputSchema,
  sendImageInputSchema
} from "../../src/tools/messaging/schema";

describe("messaging schemas", () => {
  it("accepts VFS file sources", () => {
    expect(
      sendFileInputSchema.parse({
        platform: "weixin_oc",
        conversationId: "weixin_oc:wx-user",
        source: {
          type: "vfs",
          path: "/workspace/report.md"
        }
      })
    ).toMatchObject({
      platform: "weixin_oc",
      source: {
        type: "vfs",
        path: "/workspace/report.md"
      }
    });
  });

  it("accepts attachment image sources", () => {
    expect(
      sendImageInputSchema.parse({
        platform: "telegram",
        conversationId: "telegram:123",
        source: {
          type: "attachment",
          messageId: "msg_1",
          attachmentId: "att_1"
        }
      })
    ).toMatchObject({
      source: {
        type: "attachment"
      }
    });
  });

  it("accepts current conversation platform media inputs", () => {
    expect(
      currentConversationFileInputSchema.parse({
        source: {
          type: "url",
          url: "https://example.com/image.jpg"
        },
        caption: "image"
      })
    ).toMatchObject({
      source: {
        type: "url"
      },
      caption: "image"
    });
  });

  it("accepts callback button payloads", () => {
    expect(
      sendButtonsInputSchema.parse({
        platform: "telegram",
        conversationId: "telegram:123",
        text: "确认吗",
        buttons: [
          {
            label: "确认",
            action: "pending.confirm",
            payload: { actionId: "act_1" }
          }
        ]
      })
    ).toMatchObject({
      buttons: [
        {
          action: "pending.confirm"
        }
      ]
    });
  });

  it("accepts optional button layout columns", () => {
    expect(
      sendButtonsInputSchema.parse({
        platform: "telegram",
        conversationId: "telegram:123",
        text: "请选择",
        buttons: [
          {
            label: "A",
            action: "agent.message"
          },
          {
            label: "B",
            action: "agent.message"
          }
        ],
        layout: { columns: 2 }
      })
    ).toMatchObject({
      layout: { columns: 2 }
    });
  });

  it("accepts explicit button rows and URL buttons", () => {
    expect(
      sendButtonsInputSchema.parse({
        platform: "telegram",
        conversationId: "telegram:123",
        text: "请选择",
        rows: [
          [
            {
              text: "继续",
              action: "agent.message",
              payload: { text: "继续" },
              answerText: "已收到"
            },
            {
              kind: "url",
              text: "文档",
              url: "https://example.com/docs"
            }
          ]
        ]
      })
    ).toMatchObject({
      rows: [
        [
          {
            kind: "callback",
            label: "继续",
            action: "agent.message",
            answerText: "已收到"
          },
          {
            kind: "url",
            label: "文档",
            url: "https://example.com/docs"
          }
        ]
      ]
    });
  });

  it("requires buttons or rows for button messages", () => {
    expect(() =>
      sendButtonsInputSchema.parse({
        platform: "telegram",
        conversationId: "telegram:123",
        text: "请选择"
      })
    ).toThrow(/Either buttons or rows is required/);
  });

  it("defaults empty button layout to one column", () => {
    expect(
      sendButtonsInputSchema.parse({
        platform: "telegram",
        conversationId: "telegram:123",
        text: "请选择",
        buttons: [
          {
            label: "继续",
            action: "agent.message"
          }
        ],
        layout: {}
      })
    ).toMatchObject({
      layout: { columns: 1 }
    });
  });

  it("accepts stringified button arrays from lenient model providers", () => {
    expect(
      sendButtonsInputSchema.parse({
        platform: "telegram",
        conversationId: "telegram:123",
        text: "请选择",
        buttons: JSON.stringify([
          {
            label: "今日新闻摘要",
            action: "agent.message",
            payload: { text: "帮我总结今天的重要新闻" }
          },
          {
            label: "查天气",
            action: "agent.message",
            payload: { text: "查一下今天的天气" }
          }
        ])
      })
    ).toMatchObject({
      buttons: [
        {
          label: "今日新闻摘要",
          payload: { text: "帮我总结今天的重要新闻" }
        },
        {
          label: "查天气"
        }
      ]
    });
  });
});
