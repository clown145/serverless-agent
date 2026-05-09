import type { VfsWorkspace } from "../services/workspace-service";

export type VfsCommandInput = {
  command: string;
  cwd?: string;
};

export type VfsCommandResult = {
  command: string;
  cwd: string;
  output: string;
};

export type VfsCommandRuntime = {
  workspace: VfsWorkspace;
};
