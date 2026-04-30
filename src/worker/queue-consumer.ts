import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";

export async function handleQueueBatch(
  batch: MessageBatch<QueueMessageBody>,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  for (const message of batch.messages) {
    await dispatchToAgent(message.body, env);
  }
}

async function dispatchToAgent(body: QueueMessageBody, env: Env): Promise<void> {
  const objectId = env.AGENT_OBJECT.idFromName(body.agentId);
  const object = env.AGENT_OBJECT.get(objectId);

  const response = await object.fetch("https://agent.local/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Agent object rejected event: ${response.status}`);
  }
}
