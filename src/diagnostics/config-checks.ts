import type { Env } from "../shared/types/env";
import { checkActivityConfig } from "./checks/activity-config";
import { checkMcpConfig } from "./checks/mcp-config";
import { checkModelConfig } from "./checks/model-config";
import { checkPlatformConfig } from "./checks/platform-config";
import { checkSearchConfig } from "./checks/search-config";
import { checkWorkspaceConfig } from "./checks/workspace-config";
import { diagnosticErrorFromUnknown } from "./check-result";
import type { DiagnosticCategory, DiagnosticCheck } from "./types";

const DEFAULT_AGENT_ID = "default";

export async function runConfigDiagnostics(env: Env): Promise<DiagnosticCheck[]> {
  const agentId = env.DEFAULT_AGENT_ID ?? DEFAULT_AGENT_ID;
  const [modelChecks, searchChecks, platformChecks, workspaceChecks, mcpChecks, activityChecks] =
    await Promise.all([
      safeChecks("model", "Model diagnostics", () => checkModelConfig(env, agentId)),
      safeChecks("search", "Search diagnostics", () => checkSearchConfig(env, agentId)),
      safeChecks("platforms", "Platform diagnostics", () => checkPlatformConfig(env, agentId)),
      safeChecks("workspace", "Workspace diagnostics", () => checkWorkspaceConfig(env, agentId)),
      safeChecks("mcp", "MCP diagnostics", () => checkMcpConfig(env)),
      safeChecks("activity", "Activity diagnostics", () => checkActivityConfig(env))
    ]);

  return [
    ...modelChecks,
    ...searchChecks,
    ...platformChecks,
    ...workspaceChecks,
    ...mcpChecks,
    ...activityChecks
  ];
}

async function safeChecks(
  category: DiagnosticCategory,
  label: string,
  load: () => Promise<DiagnosticCheck[]>
): Promise<DiagnosticCheck[]> {
  try {
    return await load();
  } catch (error) {
    return [
      diagnosticErrorFromUnknown(
        category,
        `${category}_diagnostics`,
        label,
        error,
        "Check migrations and bindings"
      )
    ];
  }
}
