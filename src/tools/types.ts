import type { JsonSchema } from "../core/model/types";
import type { Env } from "../shared/types/env";

export type PermissionLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type PermissionRequirement = {
  level: PermissionLevel;
  scopes: string[];
  confirmationRequired?: boolean;
};

export type ToolSideEffect =
  | "none"
  | "workspace_write"
  | "external_write"
  | "dangerous";

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  permission: PermissionRequirement;
  sideEffect: ToolSideEffect;
  timeoutMs: number;
};

export type ToolExecutionContext = {
  env: Env;
  agentId: string;
  actorId: string;
  runId: string;
  stepId: string;
  input: unknown;
  allowDangerous?: boolean;
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

export type ToolExecutor = (
  context: ToolExecutionContext
) => Promise<ToolResult>;

export type RegisteredTool = {
  definition: ToolDefinition;
  execute: ToolExecutor;
};
