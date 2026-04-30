import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import {
  listInstalledSkillIds,
  loadSkill,
  type LoadedSkill
} from "./skill-loader";
import type { SkillManifest } from "./skill-manifest-schema";

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

  return selectTriggeredSkill(env, message);
}

export async function selectTriggeredSkill(
  env: Env,
  message: InternalMessage
): Promise<SelectedSkill | undefined> {
  const text = message.text ?? "";
  const skillIds = await listInstalledSkillIds(env, message.agentId);

  for (const skillId of skillIds) {
    const skill = await loadOptionalSkill(env, message.agentId, skillId);
    if (skill && matchesSkillTrigger(skill.manifest, text)) {
      return { skill, userText: text };
    }
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

export function matchesSkillTrigger(
  manifest: SkillManifest,
  text: string
): boolean {
  return manifest.triggers.some((trigger) => {
    return trigger.type === "command" && text.startsWith(trigger.pattern);
  });
}

async function loadOptionalSkill(
  env: Env,
  agentId: string,
  skillId: string
): Promise<LoadedSkill | undefined> {
  try {
    return await loadSkill(env, agentId, skillId);
  } catch {
    return undefined;
  }
}
