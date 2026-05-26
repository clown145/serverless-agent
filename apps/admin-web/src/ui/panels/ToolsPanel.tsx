import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { McpServer, McpTool, ToolCallHistoryItem, ToolCatalogItem } from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { ToolbarButton } from "../ToolbarButton";
import { McpServerForm, type McpServerDraft } from "./tools/McpServerForm";
import { McpServerList } from "./tools/McpServerList";
import { RegisteredToolsView } from "./tools/RegisteredToolsView";
import { ToolCallHistoryView } from "./tools/ToolCallHistoryView";
import { ToolRunnerView } from "./tools/ToolRunnerView";
import { ToolSettingsForm } from "./tools/ToolSettingsForm";
import type { PanelProps } from "./types";

export function ToolsPanel({ client, notify }: PanelProps) {
  const { t } = useI18n();
  const [tools, setTools] = useState<ToolCatalogItem[]>([]);
  const [selectedToolName, setSelectedToolName] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCallHistoryItem[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [maxToolSteps, setMaxToolSteps] = useState(6);
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

  const selectedTool = tools.find((tool) => tool.name === selectedToolName) ?? tools[0];

  async function load() {
    try {
      const [toolResult, mcpResult, callResult, roleSettingsResult] = await Promise.all([
        client.listTools(),
        client.listMcpServers(),
        client.listToolCalls(),
        client.getModelRoleSettings()
      ]);
      setTools(toolResult.tools);
      setSelectedToolName((current) => current || toolResult.tools[0]?.name || "");
      setMcpServers(mcpResult.servers);
      setMcpTools(mcpResult.tools);
      setToolCalls(callResult.calls);
      setMaxToolSteps(roleSettingsResult.config.maxToolSteps);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load tools", "error");
    }
  }

  async function saveSettings(steps: number) {
    try {
      const result = await client.updateModelRoleSettings({}, { maxToolSteps: steps });
      setMaxToolSteps(result.config.maxToolSteps);
      notify(t("tools.settingsSaved"), "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save tool settings", "error");
    }
  }

  async function loadToolCalls() {
    try {
      const result = await client.listToolCalls();
      setToolCalls(result.calls);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load tool calls", "error");
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
      notify(t("tools.serverSaved"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save MCP server", "error");
    }
  }

  async function discover(serverId: string) {
    setBusyServerId(serverId);
    try {
      const result = await client.discoverMcpServerTools(serverId);
      notify(t("tools.discovered", { count: result.tools.length }), "ok");
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
      notify(t("tools.serverDeleted"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to delete MCP server", "error");
    }
  }

  async function updateToolStatus(toolId: string, status: McpTool["status"]) {
    try {
      await client.setMcpToolStatus(toolId, status);
      notify(status === "enabled" ? t("tools.toolEnabled") : t("tools.toolDisabled"), "ok");
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
          <h1>{t("tools.title")}</h1>
          <p>{t("tools.registered", { count: tools.length })}</p>
        </div>
        <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void load()} />
      </header>

      <RegisteredToolsView
        tools={tools}
        selectedName={selectedToolName}
        onSelect={setSelectedToolName}
      />

      <ToolRunnerView
        tool={selectedTool}
        client={client}
        notify={notify}
        onExecuted={() => void loadToolCalls()}
      />

      <ToolCallHistoryView calls={toolCalls} onRefresh={() => void loadToolCalls()} />

      <ToolSettingsForm maxSteps={maxToolSteps} onSave={saveSettings} />

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
