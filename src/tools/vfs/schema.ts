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

export const mkdirInputSchema = z.object({
  path: z.string().min(1)
});

export const deleteInputSchema = z.object({
  path: z.string().min(1),
  recursive: z.boolean().optional()
});

export const moveInputSchema = z.object({
  fromPath: z.string().min(1),
  toPath: z.string().min(1)
});

export const searchInputSchema = z.object({
  path: z.string().min(1).default("/"),
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional()
});

export const commandInputSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().min(1).optional()
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

export const mkdirInputJsonSchema = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Absolute VFS directory path to create."
    }
  },
  required: ["path"],
  additionalProperties: false
} as const;

export const deleteInputJsonSchema = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Absolute VFS path to delete."
    },
    recursive: {
      type: "boolean",
      description: "Delete directory contents recursively."
    }
  },
  required: ["path"],
  additionalProperties: false
} as const;

export const moveInputJsonSchema = {
  type: "object",
  properties: {
    fromPath: {
      type: "string",
      description: "Existing absolute VFS path."
    },
    toPath: {
      type: "string",
      description: "Target absolute VFS path."
    }
  },
  required: ["fromPath", "toPath"],
  additionalProperties: false
} as const;

export const searchInputJsonSchema = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Absolute VFS directory path to search from."
    },
    query: {
      type: "string",
      description: "Literal text to search for in paths and D1-backed text files."
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description: "Maximum number of matches to return."
    }
  },
  required: ["query"],
  additionalProperties: false
} as const;

export const commandInputJsonSchema = {
  type: "object",
  properties: {
    command: {
      type: "string",
      description:
        "Safe VFS command, for example `ls /skills`, `cat /notes/a.md`, `grep todo /workspace`."
    },
    cwd: {
      type: "string",
      description: "Optional absolute working directory used for relative command paths."
    }
  },
  required: ["command"],
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
