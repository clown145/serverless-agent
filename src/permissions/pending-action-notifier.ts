import { getPlatformOutboundAdapter } from "../platforms/outbound/registry";
import type { Env } from "../shared/types/env";
import type { Platform } from "../shared/types/internal-message";
import type { PendingActionRecord } from "../storage/repositories/pending-actions-types";

export async function notifyPendingAction(env: Env, action: PendingActionRecord): Promise<boolean> {
  const platform = normalizePlatform(action.platform);
  if (!platform || !action.conversationId) {
    return false;
  }

  const adapter = getPlatformOutboundAdapter(env, platform);
  if (!adapter?.sendButtons) {
    return false;
  }

  const result = await adapter.sendButtons({
    agentId: action.agentId,
    conversationId: action.conversationId,
    text: [
      "Tool call confirmation required",
      `Tool: ${action.toolName}`,
      action.reason ? `Reason: ${action.reason}` : undefined
    ]
      .filter(Boolean)
      .join("\n"),
    buttons: [
      {
        kind: "callback",
        label: "Confirm",
        action: "pending.confirm",
        payload: { actionId: action.id },
        removeKeyboardOnClick: true
      },
      {
        kind: "callback",
        label: "Reject",
        action: "pending.reject",
        payload: { actionId: action.id },
        removeKeyboardOnClick: true
      }
    ],
    expiresInSeconds: secondsUntil(action.expiresAt)
  });

  return result.ok;
}

function normalizePlatform(platform: string | undefined): Platform | undefined {
  if (
    platform === "telegram" ||
    platform === "qq" ||
    platform === "wecom" ||
    platform === "webhook" ||
    platform === "admin" ||
    platform === "webui"
  ) {
    return platform;
  }

  return undefined;
}

function secondsUntil(expiresAt: string): number {
  const seconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  return Math.min(Math.max(seconds, 60), 86_400);
}
