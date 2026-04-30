import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import { dispatchAgentJob } from "./agent-dispatch";

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
  await dispatchAgentJob(env, body);
}
