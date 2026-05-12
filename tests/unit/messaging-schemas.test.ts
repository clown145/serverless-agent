import { describe, expect, it } from "vitest";
import {
  sendButtonsInputSchema,
  sendFileInputSchema,
  sendImageInputSchema
} from "../../src/tools/messaging/schema";

describe("messaging schemas", () => {
  it("accepts VFS file sources", () => {
    expect(
      sendFileInputSchema.parse({
        platform: "telegram",
        conversationId: "telegram:123",
        source: {
          type: "vfs",
          path: "/workspace/report.md"
        }
      })
    ).toMatchObject({
      platform: "telegram",
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
