import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { insertOutboundTextMessage } from "../storage/repositories/messages-repository";
import { createToolRegistry } from "../tools/registry/tool-registry";
import { recordToolCompletedStep, recordToolRequestedStep } from "./run-step-recorder";

export async function sendFinalMessage(
  env: Env,
  runId: string,
  message: InternalMessage,
  text: string
): Promise<void> {
  if (message.platform === "email") {
    await insertOutboundTextMessage(env.AGENT_DB, {
      agentId: message.agentId,
      platform: message.platform,
      conversationId: message.conversationId,
      text
    });
    return;
  }

  const registry = createToolRegistry(env);
  const stepId = createId("step");

  await recordToolRequestedStep(env, {
    stepId,
    runId,
    agentId: message.agentId,
    toolName: "messaging.send_message"
  });

  const result = await registry.execute("messaging.send_message", {
    agentId: message.agentId,
    actorId: `agent:${message.agentId}`,
    actorRole: "admin",
    platform: message.platform,
    conversationId: message.conversationId,
    runId,
    stepId,
    input: {
      platform: message.platform,
      conversationId: message.conversationId,
      text
    }
  });

  await recordToolCompletedStep(env, {
    runId,
    agentId: message.agentId,
    toolName: "messaging.send_message",
    status: result.status === "success" ? "completed" : "failed",
    summaryStatus: result.status
  });
}
