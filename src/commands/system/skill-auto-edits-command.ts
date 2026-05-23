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
        responseText: "Skill 自动编辑已开启：模型可直接更新 Skill 文档，仍会保留校验、审计和 VFS revision。"
      };
    }

    if (["off", "disable", "disabled", "false"].includes(action)) {
      await setSkillEditConfirmationRequired(env.AGENT_DB, {
        agentId: message.agentId,
        required: true
      });
      return {
        handled: true,
        responseText: "Skill 自动编辑已关闭：模型更新 Skill 文档前需要确认。"
      };
    }

    return {
      handled: true,
      responseText: "用法：/skill-auto-edits status|on|off"
    };
  }
};

function formatStatus(editConfirmationRequired: boolean): string {
  return editConfirmationRequired
    ? "Skill 自动编辑：关闭。模型更新 Skill 文档前需要确认。"
    : "Skill 自动编辑：开启。模型可直接更新 Skill 文档。";
}
