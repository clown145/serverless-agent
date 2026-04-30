import { AgentDurableObject } from "../agents/agent-durable-object";
import { handleScheduled } from "../scheduler/scheduled";
import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import { handleQueueBatch } from "./queue-consumer";
import { routeRequest } from "./router";

export { AgentDurableObject };

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return routeRequest(request, env, ctx);
  },

  queue(batch: MessageBatch<QueueMessageBody>, env: Env, ctx: ExecutionContext) {
    return handleQueueBatch(batch, env, ctx);
  },

  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return handleScheduled(controller, env, ctx);
  }
} satisfies ExportedHandler<Env, QueueMessageBody>;
