import { describe, expect, it, vi } from "vitest";
import {
  createPendingActionContinuationMessage,
  enqueuePendingActionContinuation
} from "../../src/permissions/pending-action-continuation";
import type { Env } from "../../src/shared/types/env";
import type { PendingActionRecord } from "../../src/storage/repositories/pending-actions-types";
import type { ToolResult } from "../../src/tools/types";

describe("pending action continuation", () => {
  it("creates an event message with the confirmed tool result", () => {
    const message = createPendingActionContinuationMessage(action(), result());

    expect(message).toMatchObject({
      platform: "telegram",
      platformMessageId: "pending-action:act_1",
      agentId: "default",
      conversationId: "telegram:123",
      kind: "event",
      rawRef: "pending-action:act_1"
    });
    expect(message?.sender).toEqual({
      platformUserId: "user_1",
      role: "owner"
    });
    expect(message?.text).toContain("Tool: skills.write_file");
    expect(message?.text).toContain('"path":"/skills/demo/SKILL.md"');
  });

  it("enqueues continuation jobs through the agent queue", async () => {
    const queue = { send: vi.fn(async () => undefined) };

    const continuation = await enqueuePendingActionContinuation(
      { AGENT_QUEUE: queue } as unknown as Env,
      action(),
      result()
    );

    expect(continuation).toMatchObject({ queued: true });
    expect(queue.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "inbound.message",
        agentId: "default",
        message: expect.objectContaining({
          conversationId: "telegram:123",
          rawRef: "pending-action:act_1"
        })
      })
    );
  });

  it("skips enqueue when the action cannot be mapped to a conversation", async () => {
    const queue = { send: vi.fn(async () => undefined) };
    const continuation = await enqueuePendingActionContinuation(
      { AGENT_QUEUE: queue } as unknown as Env,
      { ...action(), conversationId: undefined },
      result()
    );

    expect(continuation).toMatchObject({ queued: false });
    expect(queue.send).not.toHaveBeenCalled();
  });
});

function action(): PendingActionRecord {
  return {
    id: "act_1",
    agentId: "default",
    runId: "run_1",
    stepId: "step_1",
    actorId: "user_1",
    actorRole: "owner",
    platform: "telegram",
    conversationId: "telegram:123",
    toolName: "skills.write_file",
    inputJson: "{}",
    status: "pending",
    reason: "Tool call requires explicit confirmation",
    expiresAt: "2999-01-01T00:00:00.000Z",
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z"
  };
}

function result(): ToolResult {
  return {
    status: "success",
    output: {
      path: "/skills/demo/SKILL.md",
      version: 2
    }
  };
}
