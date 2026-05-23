import type { Env } from "../shared/types/env";
import {
  createVfsDirectory,
  deleteVfsEntry,
  getVfsFile,
  listFileRevisions,
  listVfsTree,
  putVfsFile,
  readFileRevisionContent
} from "../storage/repositories/vfs-repository";
import { normalizeVfsPath } from "../vfs/core/path";
import { createSkillMarkdown, parseSkillMarkdown } from "./skill-frontmatter";
import { assertSkillId, listSkillCatalog, loadSkill } from "./skill-loader";

export type UpsertSkillInput = {
  agentId: string;
  skillId: string;
  content: string;
  createdBy: string;
};

export type UpdateSkillFileInput = {
  agentId: string;
  skillId: string;
  relativePath: string;
  content: string;
  createdBy: string;
};

export type SkillFileRevisionItem = {
  id: string;
  version: number;
  path: string;
  mimeType?: string;
  size?: number;
  checksum?: string;
  createdAt: string;
  createdBy: string;
};

export async function listSkills(env: Env, agentId: string) {
  return listSkillCatalog(env, agentId);
}

export async function upsertStandardSkill(
  env: Env,
  input: UpsertSkillInput
) {
  assertSkillId(input.skillId);
  validateSkillMarkdown(input.content);

  const basePath = skillBasePath(input.skillId);
  await createVfsDirectory(env, {
    agentId: input.agentId,
    path: basePath,
    createdBy: input.createdBy
  });

  await putVfsFile(env, {
    agentId: input.agentId,
    path: `${basePath}/SKILL.md`,
    content: input.content,
    mimeType: "text/markdown; charset=utf-8",
    createdBy: input.createdBy
  });

  return loadSkill(env, input.agentId, input.skillId);
}

export async function createStandardSkill(
  env: Env,
  input: {
    agentId: string;
    skillId: string;
    name: string;
    description: string;
    body: string;
    createdBy: string;
  }
) {
  return upsertStandardSkill(env, {
    agentId: input.agentId,
    skillId: input.skillId,
    content: createSkillMarkdown({
      name: input.name,
      description: input.description,
      body: input.body
    }),
    createdBy: input.createdBy
  });
}

export async function updateSkillFile(
  env: Env,
  input: UpdateSkillFileInput
) {
  assertSkillId(input.skillId);
  const path = skillFilePath(input.skillId, input.relativePath);
  if (path === `${skillBasePath(input.skillId)}/SKILL.md`) {
    validateSkillMarkdown(input.content);
  }

  await createSkillParentDirectories(env, {
    agentId: input.agentId,
    path,
    createdBy: input.createdBy
  });
  await putVfsFile(env, {
    agentId: input.agentId,
    path,
    content: input.content,
    mimeType: mimeTypeForSkillPath(path),
    createdBy: input.createdBy
  });

  return loadSkill(env, input.agentId, input.skillId);
}

export async function deleteSkill(
  env: Env,
  input: {
    agentId: string;
    skillId: string;
  }
): Promise<void> {
  assertSkillId(input.skillId);
  await deleteVfsEntry(env, {
    agentId: input.agentId,
    path: skillBasePath(input.skillId),
    recursive: true
  });
}

export async function listSkillFiles(
  env: Env,
  input: {
    agentId: string;
    skillId: string;
    limit?: number;
  }
) {
  assertSkillId(input.skillId);
  return listVfsTree(env, input.agentId, skillBasePath(input.skillId), input.limit ?? 500);
}

export async function readSkillFile(
  env: Env,
  input: {
    agentId: string;
    skillId: string;
    relativePath: string;
  }
) {
  assertSkillId(input.skillId);
  return getVfsFile(env, input.agentId, skillFilePath(input.skillId, input.relativePath));
}

export async function deleteSkillFile(
  env: Env,
  input: {
    agentId: string;
    skillId: string;
    relativePath: string;
    recursive?: boolean;
  }
) {
  assertSkillId(input.skillId);
  return deleteVfsEntry(env, {
    agentId: input.agentId,
    path: skillFilePath(input.skillId, input.relativePath),
    recursive: input.recursive
  });
}

export async function listSkillFileRevisions(
  env: Env,
  input: {
    agentId: string;
    skillId: string;
    relativePath: string;
    limit?: number;
  }
): Promise<SkillFileRevisionItem[]> {
  assertSkillId(input.skillId);
  const path = skillFilePath(input.skillId, input.relativePath);
  const revisions = await listFileRevisions(env.AGENT_DB, {
    agentId: input.agentId,
    path,
    limit: input.limit
  });

  return revisions.map((revision) => ({
    id: revision.id,
    version: revision.version,
    path: revision.path,
    mimeType: revision.mimeType,
    size: revision.size,
    checksum: revision.checksum,
    createdAt: revision.createdAt,
    createdBy: revision.createdBy
  }));
}

export async function readSkillFileRevision(
  env: Env,
  input: {
    agentId: string;
    skillId: string;
    relativePath: string;
    version: number;
  }
) {
  assertSkillId(input.skillId);
  return readFileRevisionContent(env, {
    agentId: input.agentId,
    path: skillFilePath(input.skillId, input.relativePath),
    version: input.version
  });
}

export async function rollbackSkillFile(
  env: Env,
  input: {
    agentId: string;
    skillId: string;
    relativePath: string;
    version: number;
    createdBy: string;
  }
) {
  const revision = await readSkillFileRevision(env, input);
  return updateSkillFile(env, {
    agentId: input.agentId,
    skillId: input.skillId,
    relativePath: input.relativePath,
    content: revision.content,
    createdBy: input.createdBy
  });
}

export function validateSkillMarkdown(content: string): void {
  const parsed = parseSkillMarkdown(content);
  if (!stringValue(parsed.frontmatter.name)) {
    throw new Error("SKILL.md frontmatter must include name");
  }
  if (!stringValue(parsed.frontmatter.description)) {
    throw new Error("SKILL.md frontmatter must include description");
  }
  if (!parsed.body.trim()) {
    throw new Error("SKILL.md body must not be empty");
  }
}

function skillBasePath(skillId: string): string {
  return `/skills/${skillId}`;
}

function skillFilePath(skillId: string, relativePath: string): string {
  const cleanRelative = relativePath.replace(/^\/+/, "");
  if (!cleanRelative || cleanRelative.includes("\0") || cleanRelative.includes("..")) {
    throw new Error("Invalid skill file path");
  }
  const path = normalizeVfsPath(`/skills/${skillId}/${cleanRelative}`);
  if (!path.startsWith(`/skills/${skillId}/`)) {
    throw new Error("Invalid skill file path");
  }
  return path;
}

async function createSkillParentDirectories(
  env: Env,
  input: {
    agentId: string;
    path: string;
    createdBy: string;
  }
): Promise<void> {
  const segments = input.path.split("/").filter(Boolean);
  let current = "";
  for (const segment of segments.slice(0, -1)) {
    current += `/${segment}`;
    await createVfsDirectory(env, {
      agentId: input.agentId,
      path: current,
      createdBy: input.createdBy
    });
  }
}

function mimeTypeForSkillPath(path: string): string {
  if (path.endsWith(".md")) {
    return "text/markdown; charset=utf-8";
  }
  if (path.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  return "text/plain; charset=utf-8";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
