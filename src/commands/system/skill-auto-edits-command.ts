import {
  getSkillSettings,
  setSkillEditConfirmationRequired
} from "../../storage/repositories/skill-settings-repository";
import type { CommandDefinition } from "../types";

export const skillAutoEditsCommand: CommandDefinition = {
  name: "skill-auto-edits",
  aliases: ["skillauto"],
  title: "Skill Auto Edits",
  description: "Show or update whether skill edits need confirmation.",
  async execute({ env, message, command }) {
    const action = command.args[0]?.toLowerCase();
    if (!action || action === "status") {
      return {
        handled: true,
        responseText: formatStatus(
          (await getSkillSettings(env.AGENT_DB, message.agentId))
            .editConfirmationRequired
        )
      };
    }

    if (["on", "enable", "enabled", "true"].includes(action)) {
      await setSkillEditConfirmationRequired(env.AGENT_DB, {
        agentId: message.agentId,
        required: false
      });
      return {
        handled: true,
        responseText: "Skill auto edits enabled: the model can update Skill documents directly. Validation, audit logs, and VFS revisions are still preserved."
      };
    }

    if (["off", "disable", "disabled", "false"].includes(action)) {
      await setSkillEditConfirmationRequired(env.AGENT_DB, {
        agentId: message.agentId,
        required: true
      });
      return {
        handled: true,
        responseText: "Skill auto edits disabled: model updates to Skill documents require confirmation."
      };
    }

    return {
      handled: true,
      responseText: "Usage: /skill-auto-edits status|on|off"
    };
  }
};

function formatStatus(editConfirmationRequired: boolean): string {
  return editConfirmationRequired
    ? "Skill auto edits: disabled. Model updates to Skill documents require confirmation."
    : "Skill auto edits: enabled. The model can update Skill documents directly.";
}
