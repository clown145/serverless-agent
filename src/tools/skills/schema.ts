import { z } from "zod";

export const listSkillsInputSchema = z.object({});

export const readSkillInputSchema = z.object({
  skillId: z.string().min(1)
});

export const writeSkillInputSchema = z.object({
  skillId: z.string().min(1),
  relativePath: z.string().min(1).default("SKILL.md"),
  content: z.string().min(1)
});

export const skillAutoEditsInputSchema = z.object({
  enabled: z.boolean()
});

export const listSkillsInputJsonSchema = {
  type: "object",
  properties: {},
  additionalProperties: false
} as const;

export const readSkillInputJsonSchema = {
  type: "object",
  properties: {
    skillId: {
      type: "string",
      description: "Skill id, for example skill-creator."
    }
  },
  required: ["skillId"],
  additionalProperties: false
} as const;

export const writeSkillInputJsonSchema = {
  type: "object",
  properties: {
    skillId: {
      type: "string",
      description: "Skill id, for example skill-creator."
    },
    relativePath: {
      type: "string",
      description: "File path relative to the skill folder. Defaults to SKILL.md."
    },
    content: {
      type: "string",
      description: "Full new file content."
    }
  },
  required: ["skillId", "content"],
  additionalProperties: false
} as const;

export const skillAutoEditsInputJsonSchema = {
  type: "object",
  properties: {
    enabled: {
      type: "boolean",
      description:
        "true allows skill document edits without confirmation; false requires confirmation."
    }
  },
  required: ["enabled"],
  additionalProperties: false
} as const;
