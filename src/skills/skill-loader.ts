import type { Env } from "../shared/types/env";
import { getVfsFile, listVfsEntries } from "../storage/repositories/vfs-repository";
import { parseSkillMarkdown } from "./skill-frontmatter";

export type SkillMetadata = {
  id: string;
  name: string;
  version: string;
  description: string;
};

export type LoadedSkill = {
  id: string;
  metadata: SkillMetadata;
  instructions: string;
};

export type SkillCatalogItem = {
  id: string;
  name: string;
  description: string;
};

export async function loadSkill(env: Env, agentId: string, skillId: string): Promise<LoadedSkill> {
  assertSkillId(skillId);

  return loadStandardSkill(env, agentId, skillId);
}

export async function listInstalledSkillIds(env: Env, agentId: string): Promise<string[]> {
  const entries = await listVfsEntries(env, agentId, "/skills");
  return entries
    .filter((entry) => entry.kind === "directory")
    .map((entry) => entry.path.replace(/^\/skills\//, ""));
}

export async function listSkillCatalog(env: Env, agentId: string): Promise<SkillCatalogItem[]> {
  const skillIds = await listInstalledSkillIds(env, agentId);
  const items: SkillCatalogItem[] = [];

  for (const skillId of skillIds) {
    try {
      const skill = await loadSkill(env, agentId, skillId);
      items.push({
        id: skill.id,
        name: skill.metadata.name,
        description: skill.metadata.description
      });
    } catch {
      continue;
    }
  }

  return items.sort((left, right) => left.id.localeCompare(right.id));
}

async function loadStandardSkill(env: Env, agentId: string, skillId: string): Promise<LoadedSkill> {
  const skillFile = await getVfsFile(env, agentId, `/skills/${skillId}/SKILL.md`);
  const parsed = parseSkillMarkdown(skillFile.content);
  const name = stringFrontmatter(parsed.frontmatter.name) ?? skillId;
  const description = stringFrontmatter(parsed.frontmatter.description);
  if (!description) {
    throw new Error(`Skill ${skillId} SKILL.md frontmatter must include description`);
  }

  return {
    id: skillId,
    metadata: {
      id: skillId,
      name,
      description,
      version: stringFrontmatter(parsed.frontmatter.version) ?? "0.1.0"
    },
    instructions: parsed.body
  };
}

function stringFrontmatter(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function assertSkillId(skillId: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(skillId)) {
    throw new Error("Skill id can only contain letters, numbers, dot, underscore and dash");
  }
}
