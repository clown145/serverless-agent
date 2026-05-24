import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import { errorResponse, jsonResponse } from "../shared/http";
import { createId } from "../shared/ids";
import { nowIso } from "../shared/time";
import { drainAgentMailbox, type DrainMailboxHandler } from "./agent-mailbox-drainer";
import {
  enqueueMailboxEvent,
  getMailboxEventState,
  getNextMailboxAlarmTime
} from "./agent-mailbox";

const AGENT_TICK_ALARM_KEY = "agent_tick_alarm_at";
const AGENT_TICK_INTERVAL_MS = 5 * 60 * 1000;

export class AgentDurableObject {
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
      await this.enqueueTickIfDue();
      this.startDrain();
    } finally {
      await this.scheduleNextAlarm();
    }
  }

  private startDrain(): void {
    if (this.drainPromise) {
      return;
    }

    const promise = drainAgentMailbox(this.state, this.env, this.drainHandler)
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        this.drainPromise = undefined;
        void this.scheduleNextAlarm();
      });
    this.drainPromise = promise;
    this.state.waitUntil(promise);
  }

  private async enqueueTickIfDue(): Promise<void> {
    const now = Date.now();
    const nextTickAt = await this.state.storage.get<number>(AGENT_TICK_ALARM_KEY);
    if (nextTickAt && nextTickAt > now) {
      return;
    }

    const agentId =
      (await this.state.storage.get<string>("agent_id")) ??
      this.env.DEFAULT_AGENT_ID ??
      "default";
    const scheduledTime = new Date(now).toISOString();

    const event: QueueMessageBody = {
      type: "schedule.tick",
      eventId: createId("evt"),
      agentId,
      scheduledTime,
      receivedAt: nowIso()
    };

    await enqueueMailboxEvent(this.state.storage, event);
    await this.state.storage.put(AGENT_TICK_ALARM_KEY, now + AGENT_TICK_INTERVAL_MS);
  }

  private async scheduleNextAlarm(): Promise<void> {
    const now = Date.now();
    const mailboxAlarmAt = await getNextMailboxAlarmTime(this.state.storage, now);
    let tickAlarmAt = await this.state.storage.get<number>(AGENT_TICK_ALARM_KEY);
    if (!tickAlarmAt || tickAlarmAt <= now) {
      tickAlarmAt = now + AGENT_TICK_INTERVAL_MS;
      await this.state.storage.put(AGENT_TICK_ALARM_KEY, tickAlarmAt);
    }

    await this.state.storage.setAlarm(
      Math.min(mailboxAlarmAt ?? tickAlarmAt, tickAlarmAt)
    );
  }
}
