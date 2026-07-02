import { AgentDurableObject } from "../agents/agent-durable-object";
import { QQOfficialGatewayDurableObject } from "../platforms/qq/qq-official-gateway-durable-object";
import { WeixinOcGatewayDurableObject } from "../platforms/weixin-oc/weixin-oc-gateway-durable-object";
import { handleScheduled } from "../scheduler/scheduled";
import type { Env } from "../shared/types/env";
import type { QueueMessageBody } from "../shared/types/queue";
import { handleInboundEmail } from "./email-handler";
import { handleQueueBatch } from "./queue-consumer";
import { routeRequest } from "./router";

export { AgentDurableObject };
export { QQOfficialGatewayDurableObject };
export { WeixinOcGatewayDurableObject };

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return routeRequest(request, env, ctx);
  },

  queue(batch: MessageBatch<QueueMessageBody>, env: Env, ctx: ExecutionContext) {
    return handleQueueBatch(batch, env, ctx);
  },

  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return handleScheduled(controller, env, ctx);
  },

  email(message, env, ctx) {
    return handleInboundEmail(message, env, ctx);
  }
} satisfies ExportedHandler<Env, QueueMessageBody>;
