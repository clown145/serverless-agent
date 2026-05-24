import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import type { SelectedSkill } from "../skills/skill-selector";
import type {
  ToolRegistry
} from "../tools/registry/tool-registry";
import type { ToolResult } from "../tools/types";
import type { ModelMessage, ModelToolCall } from "./model/types";
import { stringifyToolResult } from "./model/json";
import {
  recordToolCompletedStep,
  recordToolRequestedStep
} from "./run-step-recorder";

export type AgentToolExecution = {
  result: ToolResult;
  resultMessage: ModelMessage;
  sentMessage: boolean;
};

export async function executeAgentToolCall(
  env: Env,
  input: {
    registry: ToolRegistry;
    runId: string;
    message: InternalMessage;
    toolCall: ModelToolCall;
    allowedToolNames: Set<string>;
    selectedSkill?: SelectedSkill;
  }
): Promise<AgentToolExecution> {
  const result = await executeToolCall(env, input);
  return {
    ...result,
    resultMessage: createToolResultMessage(input.toolCall, result.result)
  };
}

async function executeToolCall(
  env: Env,
  input: {
    registry: ToolRegistry;
    runId: string;
    message: InternalMessage;
    toolCall: ModelToolCall;
    allowedToolNames: Set<string>;
    selectedSkill?: SelectedSkill;
  }
): Promise<{ result: ToolResult; sentMessage: boolean }> {
  const { registry, runId, message, toolCall, allowedToolNames, selectedSkill } = input;
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
    sentMessage: Boolean(
      registry.get(toolCall.name)?.definition.behavior?.preventsFinalResponse &&
      result.status === "success"
    )
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
