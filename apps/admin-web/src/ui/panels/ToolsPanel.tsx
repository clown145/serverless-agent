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
import { ToolSettingsView } from "./tools/ToolSettingsView";
import {
  MAX_MODEL_STEPS_PER_RUN,
  MAX_TOOL_CALLS_PER_RUN,
  MIN_MODEL_STEPS_PER_RUN,
  MIN_TOOL_CALLS_PER_RUN
} from "./tools/tool-settings-constants";
import type { PanelProps } from "./types";

export function ToolsPanel({ client, notify }: PanelProps) {
  const { t } = useI18n();
  const [tools, setTools] = useState<ToolCatalogItem[]>([]);
  const [selectedToolName, setSelectedToolName] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCallHistoryItem[]>([]);
  const [maxToolCallsPerRunDraft, setMaxToolCallsPerRunDraft] = useState("20");
  const [maxModelStepsPerRunDraft, setMaxModelStepsPerRunDraft] = useState("50");
  const [savingSettings, setSavingSettings] = useState(false);
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

  const selectedTool = tools.find((tool) => tool.name === selectedToolName) ?? tools[0];

  async function load() {
    try {
      const [toolResult, mcpResult, callResult] = await Promise.all([
        client.listTools(),
        client.listMcpServers(),
        client.listToolCalls()
      ]);
      setTools(toolResult.tools);
      setMaxToolCallsPerRunDraft(String(toolResult.settings.maxToolCallsPerRun));
      setMaxModelStepsPerRunDraft(String(toolResult.settings.maxModelStepsPerRun));
      setSelectedToolName((current) => current || toolResult.tools[0]?.name || "");
      setMcpServers(mcpResult.servers);
      setMcpTools(mcpResult.tools);
      setToolCalls(callResult.calls);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load tools", "error");
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

  async function saveSettings() {
    const maxToolCallsPerRun = parseMaxToolCallsPerRun(maxToolCallsPerRunDraft);
    if (maxToolCallsPerRun === undefined) {
      notify(t("tools.maxCallsInvalid"), "error");
      return;
    }

    const maxModelStepsPerRun = parseMaxModelStepsPerRun(maxModelStepsPerRunDraft);
    if (maxModelStepsPerRun === undefined) {
      notify(t("tools.maxModelStepsInvalid"), "error");
      return;
    }

    setSavingSettings(true);
    try {
      const result = await client.updateToolSettings({ maxToolCallsPerRun, maxModelStepsPerRun });
      setMaxToolCallsPerRunDraft(String(result.settings.maxToolCallsPerRun));
      setMaxModelStepsPerRunDraft(String(result.settings.maxModelStepsPerRun));
      notify(t("tools.settingsSaved"), "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save tool settings", "error");
    } finally {
      setSavingSettings(false);
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

      <ToolSettingsView
        maxCallsDraft={maxToolCallsPerRunDraft}
        maxStepsDraft={maxModelStepsPerRunDraft}
        saving={savingSettings}
        onCallsChange={setMaxToolCallsPerRunDraft}
        onStepsChange={setMaxModelStepsPerRunDraft}
        onSave={() => void saveSettings()}
      />

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

function parseBoundedInt(value: string, min: number, max: number): number | undefined {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return undefined;
  }
  return parsed;
}

function parseMaxToolCallsPerRun(value: string): number | undefined {
  return parseBoundedInt(value, MIN_TOOL_CALLS_PER_RUN, MAX_TOOL_CALLS_PER_RUN);
}

function parseMaxModelStepsPerRun(value: string): number | undefined {
  return parseBoundedInt(value, MIN_MODEL_STEPS_PER_RUN, MAX_MODEL_STEPS_PER_RUN);
}
