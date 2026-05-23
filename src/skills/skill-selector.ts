import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { loadSkill, type LoadedSkill } from "./skill-loader";

export type SelectedSkill = {
  skill: LoadedSkill;
  userText: string;
};

export async function selectSkillForMessage(
  env: Env,
  message: InternalMessage
): Promise<SelectedSkill | undefined> {
  const explicit = parseExplicitSkillCommand(message.text ?? "");
  if (explicit) {
    const skill = await loadSkill(env, message.agentId, explicit.skillId);
    return {
      skill,
      userText: explicit.userText
    };
  }

  return undefined;
}

export function parseExplicitSkillCommand(
  text: string
): { skillId: string; userText: string } | undefined {
  const match = text.match(/^\/skill\s+([a-zA-Z0-9._-]+)(?:\s+([\s\S]*))?$/);
  if (!match) {
    return undefined;
  }

  return {
    skillId: match[1],
    userText: match[2]?.trim() ?? ""
  };
}
