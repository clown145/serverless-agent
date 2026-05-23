import { z } from "zod";

export const createSkillSchema = z.object({
  agentId: z.string().min(1).optional(),
  skillId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  content: z.string().min(1).optional()
});

export const updateSkillSchema = z.object({
  agentId: z.string().min(1).optional(),
  relativePath: z.string().min(1).default("SKILL.md"),
  content: z.string().min(1)
});

export const skillFileQuerySchema = z.object({
  agentId: z.string().min(1).optional(),
  relativePath: z.string().min(1).default("SKILL.md")
});

export const skillFilesQuerySchema = z.object({
  agentId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500)
});

export const deleteSkillFileQuerySchema = z.object({
  agentId: z.string().min(1).optional(),
  relativePath: z.string().min(1),
  recursive: queryBooleanSchema(false)
});

export const skillRevisionsQuerySchema = z.object({
  agentId: z.string().min(1).optional(),
  relativePath: z.string().min(1).default("SKILL.md"),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const skillRevisionQuerySchema = z.object({
  agentId: z.string().min(1).optional(),
  relativePath: z.string().min(1).default("SKILL.md")
});

export const updateSkillSettingsSchema = z.object({
  agentId: z.string().min(1).optional(),
  editConfirmationRequired: z.boolean()
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}

function queryBooleanSchema(defaultValue: boolean) {
  return z
    .preprocess((value) => {
      if (value === undefined) {
        return defaultValue;
      }
      if (value === "true" || value === true) {
        return true;
      }
      if (value === "false" || value === false) {
        return false;
      }
      return value;
    }, z.boolean())
    .default(defaultValue);
}
