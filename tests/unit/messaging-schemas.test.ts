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
});
