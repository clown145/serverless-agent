export function mcpToolInternalName(serverId: string, toolName: string): string {
  return `mcp.${normalizeMcpServerId(serverId)}.${toolName}`;
}

function normalizeMcpServerId(serverId: string): string {
  return serverId.trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "server";
}
