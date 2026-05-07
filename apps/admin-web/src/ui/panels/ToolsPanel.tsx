import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { McpServer, McpTool, ToolCatalogItem } from "../../api/types";
import { ToolbarButton } from "../ToolbarButton";
import { McpServerForm, type McpServerDraft } from "./tools/McpServerForm";
import { McpServerList } from "./tools/McpServerList";
import { RegisteredToolsView } from "./tools/RegisteredToolsView";
import type { PanelProps } from "./types";

export function ToolsPanel({ client, notify }: PanelProps) {
  const [tools, setTools] = useState<ToolCatalogItem[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [busyServerId, setBusyServerId] = useState("");
  const [draft, setDraft] = useState<McpServerDraft>({
    name: "",
    url: "",
    authType: "none",
    authHeader: "",
    credential: ""
  });

  const mcpToolsByServer = useMemo(() => {
    return mcpTools.reduce<Record<string, McpTool[]>>((grouped, tool) => {
      grouped[tool.serverId] = [...(grouped[tool.serverId] ?? []), tool];
      return grouped;
    }, {});
  }, [mcpTools]);

  async function load() {
    try {
      const [toolResult, mcpResult] = await Promise.all([
        client.listTools(),
        client.listMcpServers()
      ]);
      setTools(toolResult.tools);
      setMcpServers(mcpResult.servers);
      setMcpTools(mcpResult.tools);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load tools", "error");
    }
  }

  async function createMcpServer() {
    try {
      await client.createMcpServer({
        name: draft.name,
        url: draft.url,
        authType: draft.authType,
        authHeader: draft.authHeader || undefined,
        credential: draft.credential || undefined
      });
      setDraft({ ...draft, credential: "" });
      notify("MCP server saved", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save MCP server", "error");
    }
  }

  async function discover(serverId: string) {
    setBusyServerId(serverId);
    try {
      const result = await client.discoverMcpServerTools(serverId);
      notify(`${result.tools.length} MCP tools discovered`, "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to discover MCP tools", "error");
    } finally {
      setBusyServerId("");
    }
  }

  async function remove(serverId: string) {
    try {
      await client.deleteMcpServer(serverId);
      notify("MCP server deleted", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to delete MCP server", "error");
    }
  }

  async function updateToolStatus(toolId: string, status: McpTool["status"]) {
    try {
      await client.setMcpToolStatus(toolId, status);
      notify(status === "enabled" ? "MCP tool enabled" : "MCP tool disabled", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to update MCP tool", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Tools</h1>
          <p>{tools.length} registered</p>
        </div>
        <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void load()} />
      </header>

      <RegisteredToolsView tools={tools} />

      <McpServerForm
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={() => void createMcpServer()}
      />

      <McpServerList
        servers={mcpServers}
        toolsByServer={mcpToolsByServer}
        busyServerId={busyServerId}
        onDiscover={(serverId) => void discover(serverId)}
        onToolStatus={(toolId, status) => void updateToolStatus(toolId, status)}
        onDelete={(serverId) => void remove(serverId)}
      />
    </section>
  );
}
