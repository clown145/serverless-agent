import { Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";
import type { McpServer, McpTool } from "../../../api/types";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";

type McpServerListProps = {
  servers: McpServer[];
  toolsByServer: Record<string, McpTool[]>;
  busyServerId: string;
  onDiscover: (serverId: string) => void;
  onToolStatus: (toolId: string, status: McpTool["status"]) => void;
  onDelete: (serverId: string) => void;
};

export function McpServerList({
  servers,
  toolsByServer,
  busyServerId,
  onDiscover,
  onToolStatus,
  onDelete
}: McpServerListProps) {
  return (
    <div className="mcp-server-list">
      {servers.map((server) => {
        const tools = toolsByServer[server.id] ?? [];
        return (
          <div className="mcp-server-row" key={server.id}>
            <div className="mcp-server-head">
              <div>
                <strong>{server.name}</strong>
                <span>{server.url}</span>
                <span>
                  {server.authType} / {server.hasCredential ? "secret saved" : "no secret"}
                </span>
                {server.lastError && <span>{server.lastError}</span>}
              </div>
              <StatusBadge value={server.status} />
              <ToolbarButton
                label="Discover tools"
                icon={RefreshCw}
                disabled={busyServerId === server.id}
                onClick={() => onDiscover(server.id)}
              />
              <ToolbarButton
                label="Delete server"
                icon={Trash2}
                variant="danger"
                onClick={() => onDelete(server.id)}
              />
            </div>
            <div className="mcp-tool-list">
              {tools.map((tool) => (
                <div className="mcp-tool-row" key={tool.id}>
                  <div>
                    <strong>{tool.title ?? tool.toolName}</strong>
                    <span>{tool.internalName}</span>
                  </div>
                  <StatusBadge value={tool.status} />
                  <ToolbarButton
                    label={tool.status === "enabled" ? "Disable MCP tool" : "Enable MCP tool"}
                    icon={tool.status === "enabled" ? PowerOff : Power}
                    disabled={tool.status === "unavailable"}
                    onClick={() => {
                      onToolStatus(
                        tool.id,
                        tool.status === "enabled" ? "disabled" : "enabled"
                      );
                    }}
                  />
                </div>
              ))}
              {tools.length === 0 && (
                <div className="empty-state">Discover to cache MCP tools</div>
              )}
            </div>
          </div>
        );
      })}
      {servers.length === 0 && <div className="empty-state">No MCP servers</div>}
    </div>
  );
}
