import { stringifyToolResult } from "../core/model/json";
import { promptText } from "../prompts";
import { createId } from "../shared/ids";
import { nowIso } from "../shared/time";
import type { Env } from "../shared/types/env";
import type { InternalMessage, Platform, SenderRole } from "../shared/types/internal-message";
import type { QueueMessageBody } from "../shared/types/queue";
import type { PendingActionRecord } from "../storage/repositories/pending-actions-types";
import type { ToolResult } from "../tools/types";

export type PendingActionContinuation = {
  queued: boolean;
  eventId?: string;
  messageId?: string;
  reason?: string;
};

export async function enqueuePendingActionContinuation(
  env: Env,
  action: PendingActionRecord,
  result: ToolResult
): Promise<PendingActionContinuation> {
  const message = createPendingActionContinuationMessage(action, result);
  if (!message) {
    return {
      queued: false,
      reason: "Pending action has no platform or conversation to continue"
    };
  }

  const job: QueueMessageBody = {
    type: "inbound.message",
    eventId: createId("evt"),
    agentId: action.agentId,
    message,
    receivedAt: message.receivedAt
  };

  await env.AGENT_QUEUE.send(job);

  return {
    queued: true,
    eventId: job.eventId,
    messageId: message.id
  };
}

export function createPendingActionContinuationMessage(
  action: PendingActionRecord,
  result: ToolResult
): InternalMessage | undefined {
  const platform = normalizePlatform(action.platform);
  if (!platform || !action.conversationId) {
    return undefined;
  }

  const now = nowIso();
  const id = createId("msg");

  return {
    id,
    platform,
    platformMessageId: `pending-action:${action.id}`,
    agentId: action.agentId,
    conversationId: action.conversationId,
    sender: {
      platformUserId: action.actorId,
      role: normalizeSenderRole(action.actorRole)
    },
    kind: "event",
    text: continuationText(action, result),
    attachments: [],
    rawRef: `pending-action:${action.id}`,
    receivedAt: now
  };
}

function continuationText(
  action: PendingActionRecord,
  result: ToolResult
): string {
  return promptText("tasks/pending-action-continuation", {
    tool_name: action.toolName,
    action_id: action.id,
    run_id: action.runId,
    tool_result: stringifyToolResult(result)
  });
}

function normalizePlatform(platform: string | undefined): Platform | undefined {
  if (
    platform === "telegram" ||
    platform === "qq" ||
    platform === "wecom" ||
    platform === "weixin_oc" ||
    platform === "webhook" ||
    platform === "admin" ||
    platform === "webui"
  ) {
    return platform;
  }

  return undefined;
}

function normalizeSenderRole(role: string | undefined): SenderRole {
  if (
    role === "owner" ||
    role === "admin" ||
    role === "member" ||
    role === "unknown"
  ) {
    return role;
  }

  return "unknown";
}
