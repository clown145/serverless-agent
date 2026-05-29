import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { completeRun } from "../storage/repositories/runs-repository";
import { getToolSettings } from "../storage/repositories/tool-settings-repository";
import { createInitialModelMessages, createModelTools } from "./agent-context";
import { prepareAgentLoopContext } from "./agent-loop-context";
import { executeAgentToolCall } from "./agent-tool-executor";
import { sendFinalMessage } from "./agent-final-message";
import {
  recordContextStep,
  recordModelStep,
  recordRunCompletedStep,
  recordRunFailedStep
} from "./run-step-recorder";
import {
  createToolCallLimitState,
  reserveToolCall,
  toolCallLimitExceededMessage
} from "./tool-call-limit";
import { MAX_MODEL_STEPS_PER_RUN_LIMIT } from "../storage/repositories/tool-settings-types";

const ABSOLUTE_MAX_MODEL_STEPS = MAX_MODEL_STEPS_PER_RUN_LIMIT;

export async function executeAgentToolLoop(
  env: Env,
  runId: string,
  message: InternalMessage
): Promise<void> {
  const [context, toolSettings] = await Promise.all([
    prepareAgentLoopContext(env, message),
    getToolSettings(env.AGENT_DB, message.agentId)
  ]);
  await recordContextStep(env, runId, message.agentId, context.selectedSkill);

  const messages = createInitialModelMessages(message, context.selectedSkill, context.history, {
    timeZone: env.AGENT_TIMEZONE,
    platformFormatInstruction: context.platformFormatInstruction,
    conversationSummary: context.conversationSummary,
    skillCatalog: context.skillCatalog
  });
  const tools = createModelTools(context.registryTools);
  const toolCallLimit = createToolCallLimitState(toolSettings);
  const maxModelSteps = Math.min(toolSettings.maxModelStepsPerRun, ABSOLUTE_MAX_MODEL_STEPS);
  let sentMessageTool = false;

  for (let index = 0; index < maxModelSteps; index += 1) {
    const response = await context.provider.complete({
      messages,
      tools,
      reasoning: context.reasoning
    });
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
      toolCalls: response.toolCalls,
      reasoning: response.reasoning
    });

    for (const toolCall of response.toolCalls) {
      if (!reserveToolCall(toolCallLimit)) {
        await failRunForToolCallLimit(env, runId, message, toolCallLimit);
        return;
      }

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

  await failRun(
    env,
    runId,
    message,
    `Task stopped: maximum model reasoning steps exceeded (${maxModelSteps}).`
  );
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

async function failRunForToolCallLimit(
  env: Env,
  runId: string,
  message: InternalMessage,
  toolCallLimit: ReturnType<typeof createToolCallLimitState>
): Promise<void> {
  await failRun(env, runId, message, toolCallLimitExceededMessage(toolCallLimit));
}

async function failRun(
  env: Env,
  runId: string,
  message: InternalMessage,
  text: string
): Promise<void> {
  await recordRunFailedStep(env, runId, message.agentId, text);
  await sendFinalMessage(env, runId, message, text);
  await completeRun(env.AGENT_DB, runId, "failed");
}
