import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { nowIso } from "../shared/time";
import { executeAgentToolLoop } from "./agent-tool-loop";
import { sendFinalMessage } from "./agent-final-message";
import { handleCommandMessage } from "../commands/handler";
import { persistInboundAttachments } from "../media/persist-attachments";
import { resolveInboundConversation } from "../conversations/resolve";
import { insertMessage } from "../storage/repositories/messages-repository";
import {
  appendRunStep,
  completeRun,
  createRun
} from "../storage/repositories/runs-repository";
import { recordRunFailedStep } from "./run-step-recorder";

export async function runAgentForMessage(
  env: Env,
  inboundMessage: InternalMessage
): Promise<string> {
  const resolved = await resolveInboundConversation(env, inboundMessage);
  const message = await persistInboundAttachments(env, resolved.message);
  await insertMessage(env.AGENT_DB, message);

  const runId = createId("run");
  await createRun(env.AGENT_DB, {
    id: runId,
    agentId: message.agentId,
    conversationId: message.conversationId,
    triggerMessageId: message.id,
    scheduleId: message.scheduleId,
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

  try {
    const command = await handleCommandMessage(env, runId, message, {
      rootConversationId: resolved.rootConversationId
    });
    if (command.handled) {
      if (command.responseText) {
        await sendFinalMessage(env, runId, message, command.responseText);
      }
      await completeRun(env.AGENT_DB, runId, command.status ?? "completed");
      return runId;
    }

    await executeAgentToolLoop(env, runId, message);
  } catch (error) {
    const summary = error instanceof Error ? error.message : "Agent run failed";
    await recordRunFailedStep(env, runId, message.agentId, summary);
    await sendFinalMessage(env, runId, message, `运行失败：${summary}`).catch(
      async (sendError) => {
        await recordRunFailedStep(
          env,
          runId,
          message.agentId,
          sendError instanceof Error
            ? `Failed to send failure message: ${sendError.message}`
            : "Failed to send failure message"
        );
      }
    );
    await completeRun(env.AGENT_DB, runId, "failed");
  }

  return runId;
}
