import type { Env } from "../../shared/types/env";
import { normalizeVfsPath } from "../core/path";
import type { VfsEntryKind, VfsSearchMatch } from "./types";
import { escapeSqlLike } from "./sql";

type SearchRow = {
  path: string;
  kind: VfsEntryKind;
  content?: string;
};

export type SearchVfsInput = {
  agentId: string;
  path: string;
  query: string;
  limit?: number;
};

export async function searchVfs(
  env: Env,
  input: SearchVfsInput
): Promise<VfsSearchMatch[]> {
  const path = normalizeVfsPath(input.path);
  const query = input.query.trim();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  if (!query) {
    return [];
  }

  const pattern = `%${escapeSqlLike(query)}%`;
  const pathPrefix = path === "/" ? "/%" : `${escapeSqlLike(path)}/%`;
  const result = await env.AGENT_DB.prepare(
    `SELECT e.path, e.kind, c.content
     FROM vfs_entries e
     LEFT JOIN vfs_contents c
       ON c.agent_id = e.agent_id AND c.path = e.path
     WHERE e.agent_id = ?
       AND (? = '/' OR e.path = ? OR e.path LIKE ? ESCAPE '\\')
       AND (e.path LIKE ? ESCAPE '\\' OR c.content LIKE ? ESCAPE '\\')
     ORDER BY e.path ASC
     LIMIT ?`
  )
    .bind(input.agentId, path, path, pathPrefix, pattern, pattern, limit)
    .all<SearchRow>();

  return (result.results ?? [])
    .map((row) => toSearchMatch(row, query))
    .filter((match): match is VfsSearchMatch => Boolean(match))
    .slice(0, limit);
}

function toSearchMatch(row: SearchRow, query: string): VfsSearchMatch | undefined {
  if (row.content) {
    const lineMatch = findLineMatch(row.content, query);
    if (lineMatch) {
      return {
        path: row.path,
        kind: row.kind,
        line: lineMatch.line,
        preview: lineMatch.preview
      };
    }
  }

  if (row.path.toLowerCase().includes(query.toLowerCase())) {
    return {
      path: row.path,
      kind: row.kind,
      preview: row.path
    };
  }

  return undefined;
}

function findLineMatch(
  content: string,
  query: string
): { line: number; preview: string } | undefined {
  const loweredQuery = query.toLowerCase();
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.toLowerCase().includes(loweredQuery)) {
      return {
        line: index + 1,
        preview: lines[index]?.trim().slice(0, 240) ?? ""
      };
    }
  }

  return undefined;
}
