import { runAgentForMessage } from "../core/agent-runner";
import { createScheduleMessage } from "../scheduler/schedule-message";
import { upsertHeartbeat } from "../storage/repositories/heartbeats-repository";
import {
  markScheduleRunStarted,
  recordScheduleRunResult
} from "../storage/repositories/schedules-repository";
import { getRunStatus } from "../storage/repositories/runs-repository";
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

  if (event.type === "schedule.fire") {
    const runId = await runAgentForMessage(env, createScheduleMessage(event));
    await markScheduleRunStarted(env.AGENT_DB, event.scheduleId, {
      runId,
      startedAt: event.receivedAt
    });
    const runStatus = await getRunStatus(env.AGENT_DB, runId);
    await recordScheduleRunResult(env.AGENT_DB, event.scheduleId, {
      runId,
      status: runStatus === "completed" ? "completed" : "failed",
      completedAt: nowIso()
    });
    await upsertHeartbeat(env.AGENT_DB, {
      agentId: event.agentId,
      source: "schedule-fire",
      status: "ok",
      lastSeenAt: nowIso(),
      detailsJson: JSON.stringify({
        scheduleId: event.scheduleId,
        scheduledTime: event.scheduledTime
      })
    });

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
