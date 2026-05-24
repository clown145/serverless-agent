import { describe, expect, it } from "vitest";
import {
  MAILBOX_EVENT_RETENTION_MS,
  MAILBOX_MAX_ATTEMPTS,
  claimNextMailboxEvent,
  cleanupExpiredMailboxEvents,
  completeMailboxEvent,
  enqueueMailboxEvent,
  failMailboxEvent,
  getMailboxEventState,
  hasMailboxWork,
  recoverStaleRunningEvent
} from "../../src/agents/agent-mailbox";
import type { QueueMessageBody } from "../../src/shared/types/queue";
import { createMemoryDurableObjectStorage } from "./helpers/memory-durable-object-storage";

describe("agent mailbox", () => {
  it("deduplicates events by event id", async () => {
    const storage = createMemoryDurableObjectStorage();
    const event = createTickJob("evt_1");

    const first = await enqueueMailboxEvent(storage, event);
    const second = await enqueueMailboxEvent(storage, event);

    expect(first).toMatchObject({
      accepted: true,
      duplicate: false,
      sequence: 1,
      status: "pending"
    });
    expect(second).toMatchObject({
      accepted: false,
      duplicate: true,
      sequence: 1,
      status: "pending"
    });
  });

  it("claims events in durable sequence order", async () => {
    const storage = createMemoryDurableObjectStorage();

    await enqueueMailboxEvent(storage, createTickJob("evt_1"));
    await enqueueMailboxEvent(storage, createTickJob("evt_2"));

    const first = await claimNextMailboxEvent(storage);
    expect(first?.event.eventId).toBe("evt_1");
    expect(first?.attemptCount).toBe(1);

    expect(await claimNextMailboxEvent(storage)).toBeUndefined();

    await completeMailboxEvent(storage, first!, { handled: true });

    const second = await claimNextMailboxEvent(storage);
    expect(second?.event.eventId).toBe("evt_2");
  });

  it("requeues failed events until max attempts is reached", async () => {
    const storage = createMemoryDurableObjectStorage();
    await enqueueMailboxEvent(storage, createTickJob("evt_1"));

    for (let attempt = 1; attempt < MAILBOX_MAX_ATTEMPTS; attempt += 1) {
      const item = await claimNextMailboxEvent(storage);
      expect(item?.attemptCount).toBe(attempt);
      await failMailboxEvent(storage, item!, new Error(`fail ${attempt}`));
      expect(await hasMailboxWork(storage)).toBe(true);
    }

    const last = await claimNextMailboxEvent(storage);
    expect(last?.attemptCount).toBe(MAILBOX_MAX_ATTEMPTS);
    await failMailboxEvent(storage, last!, new Error("final fail"));

    expect(await hasMailboxWork(storage)).toBe(false);
  });

  it("recovers stale running events back to pending", async () => {
    const storage = createMemoryDurableObjectStorage();
    await enqueueMailboxEvent(storage, createTickJob("evt_1"));

    const item = await claimNextMailboxEvent(storage);
    expect(item?.event.eventId).toBe("evt_1");

    const recovered = await recoverStaleRunningEvent(
      storage,
      Date.parse(item!.startedAt) + 31 * 60 * 1000
    );
    expect(recovered).toBe("requeued");

    const retry = await claimNextMailboxEvent(storage);
    expect(retry?.event.eventId).toBe("evt_1");
    expect(retry?.attemptCount).toBe(2);
  });

  it("keeps completed event state through the retention window", async () => {
    const storage = createMemoryDurableObjectStorage();
    await enqueueMailboxEvent(storage, createTickJob("evt_1"));

    const item = await claimNextMailboxEvent(storage);
    await completeMailboxEvent(storage, item!, { handled: true, runId: "run_1" });

    const completed = await getMailboxEventState(storage, "evt_1");
    expect(completed).toMatchObject({
      eventId: "evt_1",
      status: "completed",
      runId: "run_1"
    });
    expect(completed?.expiresAt).toBeDefined();

    await cleanupExpiredMailboxEvents(storage, Date.parse(completed!.expiresAt!) - 1);

    expect(await getMailboxEventState(storage, "evt_1")).toMatchObject({
      status: "completed"
    });
  });

  it("deletes completed event state after the retention window", async () => {
    const storage = createMemoryDurableObjectStorage();
    await enqueueMailboxEvent(storage, createTickJob("evt_1"));

    const item = await claimNextMailboxEvent(storage);
    await completeMailboxEvent(storage, item!, { handled: true });
    const completed = await getMailboxEventState(storage, "evt_1");

    const cleanup = await cleanupExpiredMailboxEvents(
      storage,
      Date.parse(completed!.expiresAt!) + 1
    );

    expect(cleanup.deleted).toBe(1);
    await expect(getMailboxEventState(storage, "evt_1")).resolves.toBeUndefined();

    const reaccepted = await enqueueMailboxEvent(storage, createTickJob("evt_1"));
    expect(reaccepted).toMatchObject({
      accepted: true,
      duplicate: false
    });
  });

  it("deletes failed terminal event state after the retention window", async () => {
    const storage = createMemoryDurableObjectStorage();
    await enqueueMailboxEvent(storage, createTickJob("evt_1"));

    for (let attempt = 1; attempt <= MAILBOX_MAX_ATTEMPTS; attempt += 1) {
      const item = await claimNextMailboxEvent(storage);
      await failMailboxEvent(storage, item!, new Error(`fail ${attempt}`));
    }

    const failed = await getMailboxEventState(storage, "evt_1");
    expect(failed).toMatchObject({
      status: "failed",
      error: `fail ${MAILBOX_MAX_ATTEMPTS}`
    });

    const cleanup = await cleanupExpiredMailboxEvents(storage, Date.parse(failed!.expiresAt!) + 1);

    expect(cleanup.deleted).toBe(1);
    await expect(getMailboxEventState(storage, "evt_1")).resolves.toBeUndefined();
  });

  it("does not delete active event state from a stale cleanup index", async () => {
    const storage = createMemoryDurableObjectStorage();
    await enqueueMailboxEvent(storage, createTickJob("evt_1"));
    const expiresAt = new Date(Date.now() - MAILBOX_EVENT_RETENTION_MS).toISOString();

    await storage.put(`mailbox:event-gc:${expiresAt}:evt_1`, {
      eventId: "evt_1",
      expiresAt
    });

    const cleanup = await cleanupExpiredMailboxEvents(storage, Date.now());

    expect(cleanup.deleted).toBe(0);
    expect(await getMailboxEventState(storage, "evt_1")).toMatchObject({
      status: "pending"
    });
  });
});

function createTickJob(eventId: string): QueueMessageBody {
  return {
    type: "schedule.tick",
    eventId,
    agentId: "default",
    scheduledTime: "2026-05-23T00:00:00.000Z",
    receivedAt: "2026-05-23T00:00:00.000Z"
  };
}
