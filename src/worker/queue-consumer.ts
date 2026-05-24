import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import { dispatchAgentJob } from "./agent-dispatch";

export type QueueMessageDispatcher = (body: QueueMessageBody, env: Env) => Promise<unknown>;

export async function handleQueueBatch(
  batch: MessageBatch<QueueMessageBody>,
  env: Env,
  _ctx: ExecutionContext,
  dispatch: QueueMessageDispatcher = dispatchToAgent
): Promise<void> {
  for (const message of batch.messages) {
    await handleQueueMessage(message, env, dispatch);
  }
}

export async function handleQueueMessage(
  message: Message<QueueMessageBody>,
  env: Env,
  dispatch: QueueMessageDispatcher = dispatchToAgent
): Promise<void> {
  try {
    await dispatch(message.body, env);
    message.ack();
  } catch (error) {
    console.error("Queue message dispatch failed", {
      eventId: message.body.eventId,
      agentId: message.body.agentId,
      type: message.body.type,
      error: error instanceof Error ? error.message : String(error)
    });
    message.retry();
  }
}

async function dispatchToAgent(body: QueueMessageBody, env: Env): Promise<void> {
  await dispatchAgentJob(env, body);
}
