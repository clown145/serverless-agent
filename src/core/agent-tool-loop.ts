import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import {
  appendRunStep,
  completeRun
} from "../storage/repositories/runs-repository";
import { createToolRegistry } from "../tools/registry/tool-registry";
import type { ToolResult } from "../tools/types";
import { createInitialModelMessages, createModelTools } from "./agent-context";
import { stringifyToolResult } from "./model/json";
import { createModelProvider } from "./model/provider-factory";
import type { ModelMessage, ModelToolCall } from "./model/types";

const MAX_MODEL_STEPS = 6;

export async function executeAgentToolLoop(
  env: Env,
  runId: string,
  message: InternalMessage
): Promise<void> {
  const registry = createToolRegistry(env);
  const provider = createModelProvider(env);
  const messages = createInitialModelMessages(message);
  const tools = createModelTools(registry.list());
  let sentMessageTool = false;

  for (let index = 0; index < MAX_MODEL_STEPS; index += 1) {
    const response = await provider.complete({ messages, tools });
    await recordModelStep(env, runId, message.agentId, provider.name, response.toolCalls.length);

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
      const execution = await executeToolCall(env, runId, message, toolCall);
      sentMessageTool = sentMessageTool || execution.sentMessage;
      messages.push(createToolResultMessage(toolCall, execution.result));
    }
  }

  await sendFinalMessage(env, runId, message, "任务已停止：超过最大工具调用步数。");
  await completeRun(env.AGENT_DB, runId, "failed");
}

async function executeToolCall(
  env: Env,
  runId: string,
  message: InternalMessage,
  toolCall: ModelToolCall
): Promise<{ result: ToolResult; sentMessage: boolean }> {
  const registry = createToolRegistry(env);
  const toolStepId = createId("step");

  await appendRunStep(env.AGENT_DB, {
    id: toolStepId,
    runId,
    agentId: message.agentId,
    kind: "tool_requested",
    status: "completed",
    summary: toolCall.name
  });

  const result = await registry.execute(toolCall.name, {
    agentId: message.agentId,
    actorId: message.sender.platformUserId,
    runId,
    stepId: toolStepId,
    input: toolCall.arguments
  });

  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId,
    agentId: message.agentId,
    kind: "tool_completed",
    status: result.status === "success" ? "completed" : "failed",
    summary: `${toolCall.name}: ${result.status}`
  });

  return {
    result,
    sentMessage:
      toolCall.name === "messaging.send_message" && result.status === "success"
  };
}

async function finishRun(
  env: Env,
  runId: string,
  message: InternalMessage,
  content: string | undefined,
  sentMessageTool: boolean
): Promise<void> {
  if (!sentMessageTool) {
    await sendFinalMessage(env, runId, message, content ?? "完成。");
  }

  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId,
    agentId: message.agentId,
    kind: "completed",
    status: "completed",
    summary: "Run completed"
  });

  await completeRun(env.AGENT_DB, runId, "completed");
}

async function recordModelStep(
  env: Env,
  runId: string,
  agentId: string,
  providerName: string,
  toolCallCount: number
): Promise<void> {
  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId,
    agentId,
    kind: "model_called",
    status: "completed",
    summary: `${providerName} returned ${toolCallCount} tool call(s)`
  });
}

function createToolResultMessage(
  toolCall: ModelToolCall,
  result: unknown
): ModelMessage {
  return {
    role: "tool",
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    content: stringifyToolResult(result)
  };
}

async function sendFinalMessage(
  env: Env,
  runId: string,
  message: InternalMessage,
  text: string
): Promise<void> {
  const registry = createToolRegistry(env);
  const stepId = createId("step");

  await appendRunStep(env.AGENT_DB, {
    id: stepId,
    runId,
    agentId: message.agentId,
    kind: "tool_requested",
    status: "completed",
    summary: "messaging.send_message"
  });

  const result = await registry.execute("messaging.send_message", {
    agentId: message.agentId,
    actorId: message.sender.platformUserId,
    runId,
    stepId,
    input: {
      platform: message.platform,
      conversationId: message.conversationId,
      text
    }
  });

  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId,
    agentId: message.agentId,
    kind: "tool_completed",
    status: result.status === "success" ? "completed" : "failed",
    summary: `messaging.send_message: ${result.status}`
  });
}
