import { z } from "zod";

export const skillManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  entry: z.string().default("SKILL.md"),
  triggers: z
    .array(
      z.object({
        type: z.string().min(1),
        pattern: z.string().min(1)
      })
    )
    .default([]),
  tools: z.array(z.string().min(1)).default([]),
  permissions: z.object({
    requiredLevel: z.number().int().min(0).max(5),
    scopes: z.array(z.string().min(1)).default([])
  })
});

export type SkillManifest = z.infer<typeof skillManifestSchema>;
