import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { completeRun } from "../storage/repositories/runs-repository";
import { createInitialModelMessages, createModelTools } from "./agent-context";
import { prepareAgentLoopContext } from "./agent-loop-context";
import { executeAgentToolCall } from "./agent-tool-executor";
import { sendFinalMessage } from "./agent-final-message";
import { recordContextStep, recordModelStep, recordRunCompletedStep } from "./run-step-recorder";

const MAX_MODEL_STEPS = 6;

export async function executeAgentToolLoop(
  env: Env,
  runId: string,
  message: InternalMessage
): Promise<void> {
  const context = await prepareAgentLoopContext(env, message);
  await recordContextStep(env, runId, message.agentId, context.selectedSkill);

  const messages = createInitialModelMessages(message, context.selectedSkill, context.history, {
    timeZone: env.AGENT_TIMEZONE,
    platformFormatInstruction: context.platformFormatInstruction,
    conversationSummary: context.conversationSummary,
    skillCatalog: context.skillCatalog
  });
  const tools = createModelTools(context.registryTools);
  let sentMessageTool = false;

  for (let index = 0; index < MAX_MODEL_STEPS; index += 1) {
    const response = await context.provider.complete({ messages, tools });
    await recordModelStep(
      env,
      runId,
      message.agentId,
      context.provider.name,
      response.toolCalls.length
    );

    if (response.toolCalls.length === 0) {
      await finishRun(env, runId, message, response.content, sentMessageTool);
      return;
    }

    messages.push({
      role: "assistant",
      content: response.content,
      toolCalls: response.toolCalls
    });

    for (const toolCall of response.toolCalls) {
      const execution = await executeAgentToolCall(env, {
        registry: context.registry,
        runId,
        message,
        toolCall,
        allowedToolNames: context.allowedToolNames,
        selectedSkill: context.selectedSkill
      });
      sentMessageTool = sentMessageTool || execution.sentMessage;
      messages.push(execution.resultMessage);
    }
  }

  await sendFinalMessage(env, runId, message, "Task stopped: maximum tool-call steps exceeded.");
  await completeRun(env.AGENT_DB, runId, "failed");
}

async function finishRun(
  env: Env,
  runId: string,
  message: InternalMessage,
  content: string | undefined,
  sentMessageTool: boolean
): Promise<void> {
  if (!sentMessageTool) {
    await sendFinalMessage(env, runId, message, content ?? "Done.");
  }

  await recordRunCompletedStep(env, runId, message.agentId);

  await completeRun(env.AGENT_DB, runId, "completed");
}
