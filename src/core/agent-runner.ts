import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { nowIso } from "../shared/time";
import { withPlatformActivity } from "./activity-indicator";
import { executeAgentToolLoop } from "./agent-tool-loop";
import { sendFinalMessage } from "./agent-final-message";
import { handleCommandMessage } from "../commands/handler";
import {
  resolveActiveModelCapabilities,
  resolveRoleModelCapabilities,
  supportsVision
} from "./model/capabilities";
import { persistInboundAttachments } from "../media/persist-attachments";
import { getAgentModelConfig } from "../storage/repositories/agent-model-config-repository";
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
  return withPlatformActivity(env, inboundMessage, () =>
    runAgentForMessageInternal(env, inboundMessage)
  );
}

async function runAgentForMessageInternal(
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
    const capabilities = await resolveActiveModelCapabilities(
      env,
      message.agentId,
      message.conversationId,
      {
        providerId: message.modelProviderId,
        modelId: message.modelId
      }
    );
    const hasImages = message.attachments.some((attachment) => attachment.type === "image");
    const modelConfig = hasImages
      ? await getAgentModelConfig(env.AGENT_DB, message.agentId)
      : undefined;
    if (hasImages && modelConfig?.imageCaptionEnabled) {
      const visionCapabilities = await resolveRoleModelCapabilities(env, message.agentId, "vision");
      if (!visionCapabilities || !supportsVision(visionCapabilities.capabilities)) {
        const text = [
          "图片转述已开启，但图片理解模型未配置或未标记为支持图片输入。",
          "请在 WebUI 的模型配置页选择支持 vision 的图片理解模型，或关闭图片转述。"
        ].join("\n");
        await recordRunFailedStep(env, runId, message.agentId, "Image caption model unavailable");
        await sendFinalMessage(env, runId, message, text);
        await completeRun(env.AGENT_DB, runId, "failed");
        return runId;
      }
    }

    if (hasImages && !modelConfig?.imageCaptionEnabled && !supportsVision(capabilities.capabilities)) {
      const text = [
        "当前模型未标记为支持图片输入。",
        `模型：${capabilities.modelId}`,
        "请在 WebUI 的模型页给该模型启用 vision 能力，或切换到支持图片的模型。"
      ].join("\n");
      await recordRunFailedStep(env, runId, message.agentId, "Model lacks vision capability");
      await sendFinalMessage(env, runId, message, text);
      await completeRun(env.AGENT_DB, runId, "failed");
      return runId;
    }

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
