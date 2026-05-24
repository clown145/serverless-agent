import type { JsonSchema } from "../core/model/types";
import type { Env } from "../shared/types/env";
import type { Platform } from "../shared/types/internal-message";

export type PermissionLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type PermissionRequirement = {
  level: PermissionLevel;
  scopes: string[];
  confirmationRequired?: boolean;
};

export type ToolSideEffect = "none" | "workspace_write" | "external_write" | "dangerous";

export type ToolSourceType = "builtin" | "mcp";

export type ToolSource = {
  type: ToolSourceType;
  id: string;
  name: string;
};

export type ToolExecutionBehavior = {
  preventsFinalResponse?: boolean;
};

export type ToolAnnotations = {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export type ToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: ToolAnnotations;
  platforms?: Platform[];
  behavior?: ToolExecutionBehavior;
  permission: PermissionRequirement;
  sideEffect: ToolSideEffect;
  timeoutMs: number;
};

export type ToolExecutionContext = {
  env: Env;
  agentId: string;
  actorId: string;
  actorRole?: string;
  platform?: string;
  conversationId?: string;
  runId: string;
  stepId: string;
  input: unknown;
  allowDangerous?: boolean;
  confirmedActionId?: string;
};

export type ToolResult = {
  status: "success" | "failed" | "permission_denied" | "needs_confirmation";
  output?: unknown;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

export type ToolExecutor = (context: ToolExecutionContext) => Promise<ToolResult>;

export type RegisteredTool = {
  definition: ToolDefinition;
  source: ToolSource;
  execute: ToolExecutor;
};
