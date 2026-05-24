import { describe, expect, it, vi } from "vitest";
import { handleQueueBatch } from "../../src/worker/queue-consumer";
import type { Env } from "../../src/shared/types/env";
import type { QueueMessageBody } from "../../src/shared/types/queue";

describe("queue consumer", () => {
  it("acks successful messages and retries only failed messages", async () => {
    const first = createMessage(createTickJob("evt_1"));
    const second = createMessage(createTickJob("evt_2"));
    const batch = createBatch([first, second]);
    const dispatch = vi.fn(async (body: QueueMessageBody) => {
      if (body.eventId === "evt_2") {
        throw new Error("dispatch failed");
      }
    });

    await expect(
      handleQueueBatch(batch, {} as Env, {} as ExecutionContext, dispatch)
    ).resolves.toBeUndefined();

    expect(first.ack).toHaveBeenCalledTimes(1);
    expect(first.retry).not.toHaveBeenCalled();
    expect(second.ack).not.toHaveBeenCalled();
    expect(second.retry).toHaveBeenCalledTimes(1);
    expect(batch.retryAll).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});

function createMessage(body: QueueMessageBody): Message<QueueMessageBody> {
  return {
    id: body.eventId,
    timestamp: new Date("2026-05-01T00:00:00.000Z"),
    body,
    attempts: 1,
    ack: vi.fn(),
    retry: vi.fn()
  } as unknown as Message<QueueMessageBody>;
}

function createBatch(messages: Array<Message<QueueMessageBody>>): MessageBatch<QueueMessageBody> {
  return {
    queue: "agent",
    messages,
    ackAll: vi.fn(),
    retryAll: vi.fn()
  } as unknown as MessageBatch<QueueMessageBody>;
}

function createTickJob(eventId: string): QueueMessageBody {
  return {
    type: "schedule.tick",
    eventId,
    agentId: "default",
    scheduledTime: "2026-05-01T00:00:00.000Z",
    receivedAt: "2026-05-01T00:00:00.000Z"
  };
}
