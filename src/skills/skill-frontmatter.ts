export type SkillFrontmatter = {
  name?: string;
  description?: string;
  [key: string]: unknown;
};

export type ParsedSkillMarkdown = {
  frontmatter: SkillFrontmatter;
  body: string;
};

export function parseSkillMarkdown(content: string): ParsedSkillMarkdown {
  if (!content.startsWith("---\n")) {
    return {
      frontmatter: {},
      body: content.trimStart()
    };
  }

  const end = content.indexOf("\n---", 4);
  if (end === -1) {
    return {
      frontmatter: {},
      body: content.trimStart()
    };
  }

  const rawFrontmatter = content.slice(4, end);
  const bodyStart = content.indexOf("\n", end + 4);
  return {
    frontmatter: parseSimpleYamlFrontmatter(rawFrontmatter),
    body: content.slice(bodyStart === -1 ? end + 4 : bodyStart + 1).trimStart()
  };
}

export function createSkillMarkdown(input: {
  name: string;
  description: string;
  body: string;
}): string {
  return [
    "---",
    `name: ${quoteYamlScalar(input.name)}`,
    `description: ${quoteYamlScalar(input.description)}`,
    "---",
    "",
    input.body.trimStart()
  ].join("\n");
}

function parseSimpleYamlFrontmatter(value: string): SkillFrontmatter {
  const frontmatter: SkillFrontmatter = {};
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const raw = trimmed.slice(separator + 1).trim();
    if (!key) {
      continue;
    }
    frontmatter[key] = parseYamlScalar(raw);
  }
  return frontmatter;
}

function parseYamlScalar(value: string): unknown {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}

function quoteYamlScalar(value: string): string {
  return JSON.stringify(value);
}
