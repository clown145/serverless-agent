import type { Env } from "../../shared/types/env";
import {
  createVfsDirectory,
  deleteVfsEntry,
  getVfsFile,
  listVfsEntries,
  listVfsTree,
  moveVfsEntry,
  putVfsFile,
  searchVfs
} from "../storage";

export type VfsWorkspaceContext = {
  env: Env;
  agentId: string;
  actorId: string;
};

export function createVfsWorkspace(context: VfsWorkspaceContext) {
  return {
    readFile: (path: string) =>
      getVfsFile(context.env, context.agentId, path),
    writeFile: (input: { path: string; content: string; mimeType?: string }) =>
      putVfsFile(context.env, {
        agentId: context.agentId,
        path: input.path,
        content: input.content,
        mimeType: input.mimeType,
        createdBy: context.actorId
      }),
    listDir: (path: string) =>
      listVfsEntries(context.env, context.agentId, path),
    listTree: (path: string, limit?: number) =>
      listVfsTree(context.env, context.agentId, path, limit),
    mkdir: (path: string) =>
      createVfsDirectory(context.env, {
        agentId: context.agentId,
        path,
        createdBy: context.actorId
      }),
    delete: (input: { path: string; recursive?: boolean }) =>
      deleteVfsEntry(context.env, {
        agentId: context.agentId,
        path: input.path,
        recursive: input.recursive
      }),
    move: (input: { fromPath: string; toPath: string }) =>
      moveVfsEntry(context.env, {
        agentId: context.agentId,
        fromPath: input.fromPath,
        toPath: input.toPath,
        actorId: context.actorId
      }),
    search: (input: { path: string; query: string; limit?: number }) =>
      searchVfs(context.env, {
        agentId: context.agentId,
        path: input.path,
        query: input.query,
        limit: input.limit
      })
  };
}

export type VfsWorkspace = ReturnType<typeof createVfsWorkspace>;
