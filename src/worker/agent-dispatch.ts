import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import type { EnqueueMailboxResult } from "../agents/agent-mailbox";

export type AgentDispatchResult = {
  queued: boolean;
  eventId: string;
  result?: EnqueueMailboxResult;
};

export async function enqueueAgentJob(env: Env, job: QueueMessageBody): Promise<void> {
  await env.AGENT_QUEUE.send(job);
}

export async function dispatchAgentJob(
  env: Env,
  job: QueueMessageBody
): Promise<AgentDispatchResult> {
  const objectId = env.AGENT_OBJECT.idFromName(job.agentId);
  const object = env.AGENT_OBJECT.get(objectId);

  const response = await object.fetch("https://agent.local/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(job)
  });

  if (!response.ok) {
    throw new Error(`Agent object rejected event: ${response.status}`);
  }

  const payload = (await response.json()) as {
    result?: EnqueueMailboxResult;
  };

  return {
    queued: true,
    eventId: job.eventId,
    result: payload.result
  };
}
