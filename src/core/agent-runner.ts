import { createToolRegistry } from "../tools/registry/tool-registry";
import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { nowIso } from "../shared/time";
import { insertMessage } from "../storage/repositories/messages-repository";
import {
  appendRunStep,
  completeRun,
  createRun
} from "../storage/repositories/runs-repository";

export async function runAgentForMessage(
  env: Env,
  message: InternalMessage
): Promise<string> {
  await insertMessage(env.AGENT_DB, message);

  const runId = createId("run");
  await createRun(env.AGENT_DB, {
    id: runId,
    agentId: message.agentId,
    conversationId: message.conversationId,
    triggerMessageId: message.id,
    status: "running",
    createdAt: nowIso(),
    updatedAt: nowIso()
  });

  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId,
    agentId: message.agentId,
    kind: "received",
    status: "completed",
    summary: "Inbound message persisted"
  });

  const reply = buildMvpReply(message);
  const registry = createToolRegistry(env);

  await registry.execute("messaging.send_message", {
    agentId: message.agentId,
    actorId: message.sender.platformUserId,
    runId,
    stepId: createId("step"),
    input: {
      platform: message.platform,
      conversationId: message.conversationId,
      text: reply
    }
  });

  await completeRun(env.AGENT_DB, runId, "completed");
  return runId;
}

function buildMvpReply(message: InternalMessage): string {
  if (message.text?.trim() === "/ping") {
    return "pong";
  }

  return `收到：${message.text ?? ""}`;
}
