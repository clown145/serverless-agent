import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { nowIso } from "../shared/time";
import { executeAgentToolLoop } from "./agent-tool-loop";
import { insertMessage } from "../storage/repositories/messages-repository";
import {
  appendRunStep,
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

  await executeAgentToolLoop(env, runId, message);
  return runId;
}
