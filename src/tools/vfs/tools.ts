import type { RegisteredTool } from "../types";
import { createVfsCommandTool } from "./command-tool";
import { createVfsFileTools } from "./file-tools";
import { createVfsMutationTools } from "./mutation-tools";

export function createVfsTools(): RegisteredTool[] {
  return [
    ...createVfsFileTools(),
    ...createVfsMutationTools(),
    createVfsCommandTool()
  ];
}
