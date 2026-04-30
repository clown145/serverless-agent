import type { Env } from "../shared/types/env";
import {
  getVfsFile,
  listVfsEntries
} from "../storage/repositories/vfs-repository";
import {
  skillManifestSchema,
  type SkillManifest
} from "./skill-manifest-schema";

export type LoadedSkill = {
  id: string;
  manifest: SkillManifest;
  instructions: string;
};

export async function loadSkill(
  env: Env,
  agentId: string,
  skillId: string
): Promise<LoadedSkill> {
  assertSkillId(skillId);

  const basePath = `/skills/${skillId}`;
  const manifestFile = await getVfsFile(env, agentId, `${basePath}/manifest.json`);
  const manifest = skillManifestSchema.parse(JSON.parse(manifestFile.content));
  const instructionsFile = await getVfsFile(env, agentId, `${basePath}/${manifest.entry}`);

  return {
    id: skillId,
    manifest,
    instructions: instructionsFile.content
  };
}

export async function listInstalledSkillIds(
  env: Env,
  agentId: string
): Promise<string[]> {
  const entries = await listVfsEntries(env, agentId, "/skills");
  return entries
    .filter((entry) => entry.kind === "directory")
    .map((entry) => entry.path.replace(/^\/skills\//, ""));
}

export function assertSkillId(skillId: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(skillId)) {
    throw new Error("Skill id can only contain letters, numbers, dot, underscore and dash");
  }
}
