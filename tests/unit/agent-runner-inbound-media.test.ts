import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/shared/types/env";
import type { InternalMessage } from "../../src/shared/types/internal-message";

const mocks = vi.hoisted(() => ({
  withPlatformActivity: vi.fn(),
  resolveInboundConversation: vi.fn(),
  persistInboundMedia: vi.fn(),
  insertMessage: vi.fn(),
  createRun: vi.fn(),
  appendRunStep: vi.fn(),
  completeRun: vi.fn(),
  sendFinalMessage: vi.fn(),
  executeAgentToolLoop: vi.fn()
}));

vi.mock("../../src/core/activity-indicator", () => ({
  withPlatformActivity: mocks.withPlatformActivity
}));

vi.mock("../../src/conversations/resolve", () => ({
  resolveInboundConversation: mocks.resolveInboundConversation
}));

vi.mock("../../src/media/inbound-media", () => ({
  persistInboundMedia: mocks.persistInboundMedia
}));

vi.mock("../../src/storage/repositories/messages-repository", () => ({
  insertMessage: mocks.insertMessage
}));

vi.mock("../../src/storage/repositories/runs-repository", () => ({
  createRun: mocks.createRun,
  appendRunStep: mocks.appendRunStep,
  completeRun: mocks.completeRun
}));

vi.mock("../../src/core/agent-final-message", () => ({
  sendFinalMessage: mocks.sendFinalMessage
}));

vi.mock("../../src/core/agent-tool-loop", () => ({
  executeAgentToolLoop: mocks.executeAgentToolLoop
}));

const { runAgentForMessage } = await import("../../src/core/agent-runner");

describe("runAgentForMessage inbound media handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.withPlatformActivity.mockImplementation((_env, _message, run) => run());
    mocks.resolveInboundConversation.mockResolvedValue({
      message: message(),
      rootConversationId: "qq:c2c:user-openid"
    });
    mocks.persistInboundMedia.mockResolvedValue({
      message: message(),
      rejection: {
        code: "attachment_too_large",
        attachmentIds: ["qq_attachment_0"],
        responseText: "The image exceeds the 8 MiB size limit.",
        summary: "Inbound image exceeds the 8 MiB size limit"
      }
    });
  });

  it("sends the media rejection directly and skips agent execution", async () => {
    await expect(runAgentForMessage({} as Env, message())).resolves.toEqual(expect.any(String));

    expect(mocks.sendFinalMessage).toHaveBeenCalledWith(
      {},
      expect.any(String),
      expect.objectContaining({ id: "msg_qq" }),
      "The image exceeds the 8 MiB size limit."
    );
    expect(mocks.completeRun).toHaveBeenCalledWith(undefined, expect.any(String), "completed");
    expect(mocks.executeAgentToolLoop).not.toHaveBeenCalled();
  });
});

function message(): InternalMessage {
  return {
    id: "msg_qq",
    platform: "qq",
    platformMessageId: "qq-msg-1",
    agentId: "agent-1",
    conversationId: "qq:c2c:user-openid",
    sender: {
      platformUserId: "user-openid",
      role: "unknown"
    },
    kind: "attachment",
    attachments: [
      {
        id: "qq_attachment_0",
        type: "image",
        sourceUrl: "https://cdn.qq.com/image.png"
      }
    ],
    receivedAt: "2026-01-01T00:00:00.000Z"
  };
}
