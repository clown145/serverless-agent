import { runAgentForMessage } from "../core/agent-runner";
import { upsertHeartbeat } from "../storage/repositories/heartbeats-repository";
import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import { nowIso } from "../shared/time";

export type AgentEventResult = {
  handled: boolean;
  runId?: string;
};

export async function handleAgentEvent(
  state: DurableObjectState,
  env: Env,
  event: QueueMessageBody
): Promise<AgentEventResult> {
  await state.storage.put("last_event_at", nowIso());
  await state.storage.put("agent_id", event.agentId);

  if (event.type === "inbound.message") {
    const runId = await runAgentForMessage(env, event.message);
    return { handled: true, runId };
  }

  await upsertHeartbeat(env.AGENT_DB, {
    agentId: event.agentId,
    source: "durable-object",
    status: "ok",
    lastSeenAt: nowIso(),
    detailsJson: JSON.stringify({ scheduledTime: event.scheduledTime })
  });

  return { handled: true };
}
