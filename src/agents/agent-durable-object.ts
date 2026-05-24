import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import { createId } from "../shared/ids";
import { errorResponse, jsonResponse } from "../shared/http";
import { drainAgentMailbox, type DrainMailboxHandler } from "./agent-mailbox-drainer";
import {
  cleanupExpiredMailboxEvents,
  enqueueMailboxEvent,
  getMailboxEventState,
  getNextMailboxAlarmTime
} from "./agent-mailbox";

export class AgentDurableObject {
  private readonly instanceId = createId("do");
  private drainPromise?: Promise<void>;
  private readonly drainHandler?: DrainMailboxHandler;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
    options: { drainHandler?: DrainMailboxHandler } = {}
  ) {
    this.drainHandler = options.drainHandler;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/events") {
      const event = (await request.json()) as QueueMessageBody;
      const result = await enqueueMailboxEvent(this.state.storage, event);

      await this.scheduleNextAlarm();
      this.startDrain();

      return jsonResponse({ ok: true, result });
    }

    if (request.method === "GET" && url.pathname === "/events/status") {
      const eventId = url.searchParams.get("eventId");
      if (!eventId) {
        return errorResponse(400, "invalid_query", "`eventId` is required");
      }

      return jsonResponse({
        ok: true,
        result: await getMailboxEventState(this.state.storage, eventId)
      });
    }

    return errorResponse(404, "not_found", "Agent route not found");
  }

  async alarm(): Promise<void> {
    try {
      this.startDrain();
      await cleanupExpiredMailboxEvents(this.state.storage);
    } finally {
      await this.scheduleNextAlarm();
    }
  }

  private startDrain(): void {
    if (this.drainPromise) {
      return;
    }

    const promise = drainAgentMailbox(this.state, this.env, this.drainHandler, {
      ownerInstanceId: this.instanceId
    })
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        this.drainPromise = undefined;
        void this.scheduleNextAlarm();
      });
    this.drainPromise = promise;
    this.state.waitUntil(promise);
  }

  private async scheduleNextAlarm(): Promise<void> {
    const nextAlarmAt = await getNextMailboxAlarmTime(this.state.storage);
    if (nextAlarmAt === undefined) {
      await this.state.storage.deleteAlarm();
      return;
    }

    await this.state.storage.setAlarm(nextAlarmAt);
  }
}
