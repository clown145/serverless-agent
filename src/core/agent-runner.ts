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
import { appendRunStep, completeRun, createRun } from "../storage/repositories/runs-repository";
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
    const modelConfig = await getAgentModelConfig(env.AGENT_DB, message.agentId);
    const imageCaptionEnabled = modelConfig?.imageCaptionEnabled ?? false;

    if (imageCaptionEnabled) {
      const visionCapabilities = await resolveRoleModelCapabilities(env, message.agentId, "vision");
      if (!visionCapabilities || !supportsVision(visionCapabilities.capabilities)) {
        const text = [
          "Image captioning is enabled, but no vision model is configured or marked as vision-capable.",
          "Select a vision-capable model in the WebUI model settings, or disable image captioning."
        ].join("\n");
        await recordRunFailedStep(env, runId, message.agentId, "Image caption model unavailable");
        await sendFinalMessage(env, runId, message, text);
        await completeRun(env.AGENT_DB, runId, "failed");
        return runId;
      }
    }

    const hasImages = message.attachments.some((attachment) => attachment.type === "image");
    if (hasImages && !imageCaptionEnabled && !supportsVision(capabilities.capabilities)) {
      const text = [
        "The current model is not marked as supporting image input.",
        `Model: ${capabilities.modelId}`,
        "Enable the vision capability for this model in the WebUI, or switch to a vision-capable model."
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
    await sendFinalMessage(env, runId, message, `Run failed: ${summary}`).catch(
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
