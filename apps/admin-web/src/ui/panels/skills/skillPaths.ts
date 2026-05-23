export function skillBasePath(skillId: string): string {
  return `/skills/${skillId}`;
}

export function relativeSkillPath(skillId: string, path: string): string {
  const base = skillBasePath(skillId);
  if (path === base) {
    return ".";
  }
  if (path.startsWith(`${base}/`)) {
    return path.slice(base.length + 1);
  }
  return path.replace(/^\/+/, "");
}

export function skillFilePath(skillId: string, relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, "");
  return `${skillBasePath(skillId)}/${clean || "SKILL.md"}`;
}

export function displaySkillPath(skillId: string, path: string): string {
  const relative = relativeSkillPath(skillId, path);
  return relative === "." ? skillId : relative;
}
