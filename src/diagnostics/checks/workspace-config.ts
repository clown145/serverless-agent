import type { Env } from "../../shared/types/env";
import { getVfsWorkspaceBootstrapStatus } from "../../vfs/bootstrap/default-workspace";
import { diagnosticOk, diagnosticWarn } from "../check-result";
import type { DiagnosticCheck } from "../types";

export async function checkWorkspaceConfig(
  env: Env,
  agentId: string
): Promise<DiagnosticCheck[]> {
  const status = await getVfsWorkspaceBootstrapStatus(env, agentId);
  return [
    status.initialized
      ? diagnosticOk(
          "workspace",
          "vfs_workspace",
          "VFS workspace",
          `${status.existing}/${status.expected} default directories ready`
        )
      : diagnosticWarn(
          "workspace",
          "vfs_workspace",
          "VFS workspace",
          `${status.missingPaths.length} default directories missing`,
          "Initialize the workspace in VFS"
        )
  ];
}
