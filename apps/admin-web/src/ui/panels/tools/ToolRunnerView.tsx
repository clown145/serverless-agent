import { Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminClient } from "../../../api/client";
import type { ToolCatalogItem, ToolDebugCall } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { useI18n } from "../../i18n/I18nProvider";
import { JsonBlock } from "../../JsonBlock";
import { StatusBadge } from "../../StatusBadge";
import { createToolInputDraft, type ToolInputExampleText } from "./toolInputDefaults";

type ToolRunnerViewProps = {
  tool?: ToolCatalogItem;
  client: AdminClient;
  notify: (message: string, tone?: "ok" | "error") => void;
  onExecuted: () => void;
};

export function ToolRunnerView({ tool, client, notify, onExecuted }: ToolRunnerViewProps) {
  const { t } = useI18n();
  const [inputText, setInputText] = useState("{}");
  const [allowDangerous, setAllowDangerous] = useState(false);
  const [running, setRunning] = useState(false);
  const [call, setCall] = useState<ToolDebugCall>();
  const exampleText = toolExampleText(t);

  useEffect(() => {
    setInputText(JSON.stringify(createToolInputDraft(tool, exampleText), null, 2));
    setCall(undefined);
  }, [tool?.name, t]);

  async function runTool() {
    if (!tool) {
      return;
    }

    let input: unknown;
    try {
      input = JSON.parse(inputText);
    } catch {
      notify(t("tools.inputInvalid"), "error");
      return;
    }

    setRunning(true);
    try {
      const result = await client.callTool({
        toolName: tool.name,
        input,
        allowDangerous
      });
      setCall(result.call);
      notify(t("tools.returned", { status: result.call.result.status }), "ok");
      onExecuted();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to run tool", "error");
    } finally {
      setRunning(false);
    }
  }

  if (!tool) {
    return <EmptyState label={t("tools.noTools")} />;
  }

  return (
    <div className="tool-runner">
      <header className="subsection-header">
        <div>
          <h2>{t("tools.runner")}</h2>
          <p>{tool.name}</p>
        </div>
        <div className="tool-meta">
          <StatusBadge value={tool.sideEffect} />
          <span>{t("common.level", { level: tool.permission.level })}</span>
        </div>
      </header>

      <textarea
        className="json-editor"
        value={inputText}
        onChange={(event) => setInputText(event.target.value)}
        spellCheck={false}
      />

      <div className="tool-runner-actions">
        <label className="checkbox-row">
          <input
            checked={allowDangerous}
            type="checkbox"
            onChange={(event) => setAllowDangerous(event.target.checked)}
          />
          <span>{t("tools.bypassConfirmation")}</span>
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={() =>
            setInputText(JSON.stringify(createToolInputDraft(tool, exampleText), null, 2))
          }
        >
          <RotateCcw size={16} />
          {t("common.reset")}
        </button>
        <button
          className="primary-button"
          disabled={running}
          type="button"
          onClick={() => void runTool()}
        >
          <Play size={16} />
          {t("common.run")}
        </button>
      </div>

      {call && (
        <div className="tool-result">
          <div className="tool-meta">
            <StatusBadge value={call.result.status} />
            <span>{call.latencyMs}ms</span>
            <span>{call.runId}</span>
          </div>
          <JsonBlock value={call.result} />
        </div>
      )}
    </div>
  );
}

function toolExampleText(t: ReturnType<typeof useI18n>["t"]): ToolInputExampleText {
  return {
    buttonPrompt: t("tools.example.buttonPrompt"),
    buttonContinueLabel: t("tools.example.buttonContinueLabel"),
    buttonContinueText: t("tools.example.buttonContinueText"),
    buttonRemindLabel: t("tools.example.buttonRemindLabel"),
    buttonRemindText: t("tools.example.buttonRemindText"),
    scheduleTitle: t("tools.example.scheduleTitle"),
    scheduleText: t("tools.example.scheduleText")
  };
}
