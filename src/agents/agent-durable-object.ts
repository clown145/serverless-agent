import { handleAgentEvent } from "./agent-event-handler";
import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import { errorResponse, jsonResponse } from "../shared/http";

export class AgentDurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/events") {
      const event = (await request.json()) as QueueMessageBody;
      const result = await handleAgentEvent(this.state, this.env, event);

      await this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
      return jsonResponse({ ok: true, result });
    }

    return errorResponse(404, "not_found", "Agent route not found");
  }

  async alarm(): Promise<void> {
    const agentId =
      (await this.state.storage.get<string>("agent_id")) ??
      this.env.DEFAULT_AGENT_ID ??
      "default";

    const event: QueueMessageBody = {
      type: "schedule.tick",
      eventId: crypto.randomUUID(),
      agentId,
      scheduledTime: new Date().toISOString(),
      receivedAt: new Date().toISOString()
    };

    await handleAgentEvent(this.state, this.env, event);
  }
}
