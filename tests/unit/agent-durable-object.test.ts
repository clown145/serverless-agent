import { describe, expect, it } from "vitest";
import { AgentDurableObject } from "../../src/agents/agent-durable-object";
import type { DrainMailboxHandler } from "../../src/agents/agent-mailbox-drainer";
import {
  MAILBOX_RECOVERY_ALARM_DELAY_MS,
  type RunningMailboxEvent
} from "../../src/agents/agent-mailbox";
import type { Env } from "../../src/shared/types/env";
import type { QueueMessageBody } from "../../src/shared/types/queue";
import { createMemoryDurableObjectStorage } from "./helpers/memory-durable-object-storage";

describe("AgentDurableObject mailbox integration", () => {
  it("queues concurrent fetch events behind a single drain", async () => {
    const storage = createMemoryDurableObjectStorage();
    const waitUntilPromises: Promise<unknown>[] = [];
    const state = {
      storage,
      waitUntil(promise: Promise<unknown>) {
        waitUntilPromises.push(promise);
      }
    } as DurableObjectState;

    let releaseFirst!: () => void;
    const firstStarted = deferred<void>();
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const started: string[] = [];
    let active = 0;
    let maxActive = 0;

    const handler: DrainMailboxHandler = async (
      _state: DurableObjectState,
      _env: Env,
      item: RunningMailboxEvent
    ) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      started.push(item.event.eventId);

      if (item.event.eventId === "evt_1") {
        firstStarted.resolve();
        await firstCanFinish;
      }

      active -= 1;
      return { handled: true };
    };

    const object = new AgentDurableObject(state, {} as Env, {
      drainHandler: handler
    });

    const firstResponse = await object.fetch(createEventRequest(createTickJob("evt_1")));
    expect(firstResponse.status).toBe(200);
    await firstStarted.promise;

    const secondResponse = await object.fetch(createEventRequest(createTickJob("evt_2")));
    expect(secondResponse.status).toBe(200);
    expect(started).toEqual(["evt_1"]);

    releaseFirst();
    await Promise.all(waitUntilPromises);

    expect(started).toEqual(["evt_1", "evt_2"]);
    expect(maxActive).toBe(1);
    await expect(storage.getAlarm()).resolves.toBeNull();
  });

  it("does not start a second drain when an alarm fires during active work", async () => {
    const storage = createMemoryDurableObjectStorage();
    const waitUntilPromises: Promise<unknown>[] = [];
    const state = {
      storage,
      waitUntil(promise: Promise<unknown>) {
        waitUntilPromises.push(promise);
      }
    } as DurableObjectState;

    let releaseFirst!: () => void;
    const firstStarted = deferred<void>();
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let active = 0;
    let maxActive = 0;

    const handler: DrainMailboxHandler = async (
      _state: DurableObjectState,
      _env: Env,
      item: RunningMailboxEvent
    ) => {
      active += 1;
      maxActive = Math.max(maxActive, active);

      if (item.event.eventId === "evt_1") {
        firstStarted.resolve();
        await firstCanFinish;
      }

      active -= 1;
      return { handled: true };
    };

    const object = new AgentDurableObject(state, {} as Env, {
      drainHandler: handler
    });

    await object.fetch(createEventRequest(createTickJob("evt_1")));
    await firstStarted.promise;
    await object.alarm();

    releaseFirst();
    await Promise.all(waitUntilPromises);

    expect(maxActive).toBe(1);
  });

  it("does not enqueue periodic schedule ticks from alarms", async () => {
    const storage = createMemoryDurableObjectStorage();
    const handled: QueueMessageBody[] = [];
    const waitUntilPromises: Promise<unknown>[] = [];
    const state = createState(storage, waitUntilPromises);
    const object = new AgentDurableObject(state, {} as Env, {
      drainHandler: async (_state, _env, item) => {
        handled.push(item.event);
        return { handled: true };
      }
    });

    await object.alarm();
    await Promise.all(waitUntilPromises);

    expect(handled).toEqual([]);
    await expect(storage.getAlarm()).resolves.toBeNull();
  });

  it("keeps a recovery alarm while mailbox work is pending", async () => {
    const storage = createMemoryDurableObjectStorage();
    const waitUntilPromises: Promise<unknown>[] = [];
    const state = createState(storage, waitUntilPromises);
    const object = new AgentDurableObject(state, {} as Env, {
      drainHandler: async () => {
        throw new Error("drain should not start before the delayed item is released");
      }
    });

    let releaseDrain!: () => void;
    const firstStarted = deferred<void>();
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseDrain = resolve;
    });
    const busyObject = new AgentDurableObject(state, {} as Env, {
      drainHandler: async (_state, _env, item) => {
        if (item.event.eventId === "evt_busy") {
          firstStarted.resolve();
          await firstCanFinish;
        }
        return { handled: true };
      }
    });

    await busyObject.fetch(createEventRequest(createTickJob("evt_busy")));
    await firstStarted.promise;
    await object.fetch(createEventRequest(createTickJob("evt_pending")));

    const alarm = await storage.getAlarm();
    expect(alarm).not.toBeNull();
    expect(alarm!).toBeGreaterThanOrEqual(Date.now() + MAILBOX_RECOVERY_ALARM_DELAY_MS - 1_000);

    releaseDrain();
    await Promise.all(waitUntilPromises);
    await expect(storage.getAlarm()).resolves.toBeNull();
  });
});

function createState(
  storage: DurableObjectStorage,
  waitUntilPromises: Promise<unknown>[] = []
): DurableObjectState {
  return {
    storage,
    waitUntil(promise: Promise<unknown>) {
      waitUntilPromises.push(promise);
    }
  } as DurableObjectState;
}

function createEventRequest(event: QueueMessageBody): Request {
  return new Request("https://agent.local/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event)
  });
}

function createTickJob(eventId: string): QueueMessageBody {
  return {
    type: "schedule.tick",
    eventId,
    agentId: "default",
    scheduledTime: "2026-05-23T00:00:00.000Z",
    receivedAt: "2026-05-23T00:00:00.000Z"
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
