import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { selectSkillForMessage } from "../skills/skill-selector";
import { filterToolsForSkill } from "../skills/skill-tools";
import type { SelectedSkill } from "../skills/skill-selector";
import {
  completeRun
} from "../storage/repositories/runs-repository";
import { listConversationMessages } from "../storage/repositories/messages-repository";
import {
  createRuntimeToolRegistry,
  type ToolRegistry
} from "../tools/registry/tool-registry";
import type { ToolResult } from "../tools/types";
import { createInitialModelMessages, createModelTools } from "./agent-context";
import { sendFinalMessage } from "./agent-final-message";
import { stringifyToolResult } from "./model/json";
import { createModelProvider } from "./model/provider-factory";
import type { ModelMessage, ModelToolCall } from "./model/types";
import {
  recordContextStep,
  recordModelStep,
  recordRunCompletedStep,
  recordToolCompletedStep,
  recordToolRequestedStep
} from "./run-step-recorder";

const MAX_MODEL_STEPS = 6;

export async function executeAgentToolLoop(
  env: Env,
  runId: string,
  message: InternalMessage
): Promise<void> {
  const registry = await createRuntimeToolRegistry(env);
  const provider = await createModelProvider(env, message.agentId);
  const selectedSkill = await selectSkillForMessage(env, message);
  const history = await listConversationMessages(env.AGENT_DB, {
    agentId: message.agentId,
    conversationId: message.conversationId,
    limit: 16
  });
  await recordContextStep(env, runId, message.agentId, selectedSkill);

  const registryTools = filterToolsForSkill(registry.list(), selectedSkill);
  const allowedToolNames = new Set(
    registryTools.map((tool) => tool.definition.name)
  );
  const messages = createInitialModelMessages(message, selectedSkill, history);
  const tools = createModelTools(registryTools);
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
      const execution = await executeToolCall(
        env,
        registry,
        runId,
        message,
        toolCall,
        allowedToolNames,
        selectedSkill
      );
      sentMessageTool = sentMessageTool || execution.sentMessage;
      messages.push(createToolResultMessage(toolCall, execution.result));
    }
  }

  await sendFinalMessage(env, runId, message, "任务已停止：超过最大工具调用步数。");
  await completeRun(env.AGENT_DB, runId, "failed");
}

async function executeToolCall(
  env: Env,
  registry: ToolRegistry,
  runId: string,
  message: InternalMessage,
  toolCall: ModelToolCall,
  allowedToolNames: Set<string>,
  selectedSkill?: SelectedSkill
): Promise<{ result: ToolResult; sentMessage: boolean }> {
  const toolStepId = createId("step");

  await recordToolRequestedStep(env, {
    stepId: toolStepId,
    runId,
    agentId: message.agentId,
    toolName: toolCall.name
  });

  if (!allowedToolNames.has(toolCall.name)) {
    const result = createDisallowedToolResult(toolCall.name, selectedSkill);
    await recordToolCompletedStep(env, {
      runId,
      agentId: message.agentId,
      status: "failed",
      toolName: toolCall.name,
      summaryStatus: "skill_denied"
    });

    return { result, sentMessage: false };
  }

  const result = await registry.execute(toolCall.name, {
    agentId: message.agentId,
    actorId: message.sender.platformUserId,
    actorRole: message.sender.role,
    platform: message.platform,
    conversationId: message.conversationId,
    runId,
    stepId: toolStepId,
    input: toolCall.arguments
  });

  await recordToolCompletedStep(env, {
    runId,
    agentId: message.agentId,
    status: result.status === "success" ? "completed" : "failed",
    toolName: toolCall.name,
    summaryStatus: result.status
  });

  return {
    result,
    sentMessage:
      toolCall.name === "messaging.send_message" && result.status === "success"
  };
}

function createDisallowedToolResult(
  toolName: string,
  selectedSkill?: SelectedSkill
): ToolResult {
  return {
    status: "permission_denied",
    error: {
      code: "skill_tool_not_allowed",
      message: selectedSkill
        ? `Skill ${selectedSkill.skill.id} does not allow tool ${toolName}`
        : `Tool ${toolName} is not allowed`,
      retryable: false
    }
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

  await recordRunCompletedStep(env, runId, message.agentId);

  await completeRun(env.AGENT_DB, runId, "completed");
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
