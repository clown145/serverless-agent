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

export const readFileInputJsonSchema = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Absolute VFS path to read, for example /workspace/notes/a.md."
    }
  },
  required: ["path"],
  additionalProperties: false
} as const;

export const writeFileInputJsonSchema = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Absolute VFS path to write, for example /workspace/notes/a.md."
    },
    content: {
      type: "string",
      description: "Full file content."
    },
    mimeType: {
      type: "string",
      description: "Optional MIME type."
    }
  },
  required: ["path", "content"],
  additionalProperties: false
} as const;

export const listDirInputJsonSchema = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Absolute VFS directory path to list."
    }
  },
  required: ["path"],
  additionalProperties: false
} as const;
