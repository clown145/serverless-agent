import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import { mcpToolInternalName } from "../../tools/mcp/names";
import type { McpTool } from "../../tools/mcp/types";
import {
  mapMcpToolRow,
  type McpToolRecord,
  type McpToolRow
} from "./mcp-types";

export async function upsertMcpToolCatalog(
  db: D1Database,
  input: {
    serverId: string;
    tools: McpTool[];
  }
): Promise<McpToolRecord[]> {
  const now = nowIso();

  await db
    .prepare("UPDATE mcp_tool_catalog SET status = 'unavailable', updated_at = ? WHERE server_id = ?")
    .bind(now, input.serverId)
    .run();

  for (const tool of input.tools) {
    const id = createId("mcptool");
    await db
      .prepare(
        `INSERT INTO mcp_tool_catalog (
          id,
          server_id,
          tool_name,
          internal_name,
          title,
          description,
          input_schema_json,
          output_schema_json,
          annotations_json,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?)
        ON CONFLICT(server_id, tool_name) DO UPDATE SET
          internal_name = excluded.internal_name,
          title = excluded.title,
          description = excluded.description,
          input_schema_json = excluded.input_schema_json,
          output_schema_json = excluded.output_schema_json,
          annotations_json = excluded.annotations_json,
          status = 'available',
          updated_at = excluded.updated_at`
      )
      .bind(
        id,
        input.serverId,
        tool.name,
        mcpToolInternalName(input.serverId, tool.name),
        tool.title ?? null,
        tool.description ?? null,
        JSON.stringify(tool.inputSchema),
        tool.outputSchema ? JSON.stringify(tool.outputSchema) : null,
        tool.annotations ? JSON.stringify(tool.annotations) : null,
        now,
        now
      )
      .run();
  }

  return listMcpToolCatalog(db, input.serverId);
}

export async function listMcpToolCatalog(
  db: D1Database,
  serverId?: string
): Promise<McpToolRecord[]> {
  const query = serverId
    ? db
        .prepare("SELECT * FROM mcp_tool_catalog WHERE server_id = ? ORDER BY tool_name ASC")
        .bind(serverId)
    : db.prepare("SELECT * FROM mcp_tool_catalog ORDER BY server_id ASC, tool_name ASC");
  const result = await query.all<McpToolRow>();

  return (result.results ?? []).map(mapMcpToolRow);
}
