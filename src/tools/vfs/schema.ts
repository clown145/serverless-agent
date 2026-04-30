import { z } from "zod";

export const readFileInputSchema = z.object({
  path: z.string().min(1)
});

export const writeFileInputSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  mimeType: z.string().optional()
});

export const listDirInputSchema = z.object({
  path: z.string().min(1)
});
