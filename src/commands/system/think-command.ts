import {
  getConversationSettings,
  updateConversationSettings
} from "../../storage/repositories/conversation-settings-repository";
import type {
  ReasoningEffort,
  ReasoningStateMode
} from "../../core/model/reasoning-types";
import type { CommandDefinition } from "../types";
import { bold, code } from "./format";

const EFFORTS = new Set<ReasoningEffort>(["auto", "low", "normal", "high"]);
const STATE_MODES = new Set<ReasoningStateMode>(["auto", "on", "off"]);

export const thinkCommand: CommandDefinition = {
  name: "think",
  aliases: ["reasoning"],
  title: "Think",
  description: "Show or set reasoning effort.",
  async execute({ env, message, command }) {
    const action = command.args[0]?.toLowerCase();
    if (!action) {
      return {
        handled: true,
        responseText: await showThinkSettings(env.AGENT_DB, message)
      };
    }

    if (action === "state") {
      const mode = command.args[1]?.toLowerCase();
      if (!isReasoningStateMode(mode)) {
        return {
          handled: true,
          responseText: `Usage: ${code("/think state auto|on|off", message.platform)}`
        };
      }

      await updateConversationSettings(env.AGENT_DB, message.agentId, message.conversationId, {
        reasoningStateMode: mode
      });
      return {
        handled: true,
        responseText: `Reasoning state round-trip set to ${code(mode, message.platform)}.`
      };
    }

    if (!isReasoningEffort(action)) {
      return {
        handled: true,
        responseText: [
          `Usage: ${code("/think auto|low|normal|high", message.platform)}`,
          `State: ${code("/think state auto|on|off", message.platform)}`
        ].join("\n")
      };
    }

    await updateConversationSettings(env.AGENT_DB, message.agentId, message.conversationId, {
      reasoningEffort: action
    });
    return {
      handled: true,
      responseText: `Reasoning effort set to ${code(action, message.platform)}.`
    };
  }
};

async function showThinkSettings(
  db: D1Database,
  message: { agentId: string; conversationId: string; platform: Parameters<typeof code>[1] }
): Promise<string> {
  const settings = await getConversationSettings(db, message.agentId, message.conversationId);
  return [
    bold("Reasoning Settings", message.platform),
    `Effort: ${code(settings?.reasoningEffort ?? "auto", message.platform)}`,
    `State round-trip: ${code(settings?.reasoningStateMode ?? "auto", message.platform)}`
  ].join("\n");
}

function isReasoningEffort(value: string | undefined): value is ReasoningEffort {
  return EFFORTS.has(value as ReasoningEffort);
}

function isReasoningStateMode(value: string | undefined): value is ReasoningStateMode {
  return STATE_MODES.has(value as ReasoningStateMode);
}
