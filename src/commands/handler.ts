import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { appendRunStep } from "../storage/repositories/runs-repository";
import { parseCommand } from "./parser";
import { findCommand } from "./registry";
import type { CommandHandlingResult } from "./types";

export async function handleCommandMessage(
  env: Env,
  runId: string,
  message: InternalMessage,
  input: { rootConversationId: string }
): Promise<CommandHandlingResult> {
  const parsed = parseCommand(message.text);
  if (!parsed) {
    return { handled: false };
  }

  const command = findCommand(parsed.name, message.platform);
  if (!command) {
    return { handled: false };
  }

  const result = await command.execute({
    env,
    runId,
    message,
    rootConversationId: input.rootConversationId,
    command: parsed
  });

  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId,
    agentId: message.agentId,
    kind: "command_handled",
    status: result.status ?? "completed",
    summary: `/${command.name}`
  });

  return result;
}
