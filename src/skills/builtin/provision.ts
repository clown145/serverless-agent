import type { Env } from "../../shared/types/env";
import {
  createVfsDirectory,
  findVfsEntry,
  putVfsFile
} from "../../storage/repositories/vfs-repository";
import { SKILL_CREATOR_ID, SKILL_CREATOR_MARKDOWN } from "./skill-creator";

export async function ensureBuiltinSkills(
  env: Env,
  agentId: string
): Promise<void> {
  await ensureSkillCreator(env, agentId);
}

async function ensureSkillCreator(env: Env, agentId: string): Promise<void> {
  const basePath = `/skills/${SKILL_CREATOR_ID}`;
  await createVfsDirectory(env, {
    agentId,
    path: basePath,
    createdBy: "system"
  });

  const existing = await findVfsEntry(env.AGENT_DB, agentId, `${basePath}/SKILL.md`);
  if (existing) {
    return;
  }

  await putVfsFile(env, {
    agentId,
    path: `${basePath}/SKILL.md`,
    content: SKILL_CREATOR_MARKDOWN,
    mimeType: "text/markdown; charset=utf-8",
    createdBy: "system"
  });
}
