import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminClient } from "../../api/client";
import type { RunDetails, RunListItem } from "../../api/types";
import { EmptyState } from "../EmptyState";
import { useI18n } from "../i18n/I18nProvider";
import { JsonBlock } from "../JsonBlock";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";

type RunsPanelProps = {
  client: AdminClient;
  notify: (message: string, tone?: "ok" | "error") => void;
  selectedRunId?: string;
};

export function RunsPanel({ client, notify, selectedRunId }: RunsPanelProps) {
  const { t } = useI18n();
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [activeRunId, setActiveRunId] = useState(selectedRunId ?? "");
  const [details, setDetails] = useState<RunDetails>();

  async function loadRuns() {
    try {
      const result = await client.listRuns();
      setRuns(result.runs);
      if (!activeRunId && result.runs[0]) {
        setActiveRunId(result.runs[0].id);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load runs", "error");
    }
  }

  useEffect(() => {
    void loadRuns();
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      setActiveRunId(selectedRunId);
    }
  }, [selectedRunId]);

  useEffect(() => {
    if (!activeRunId) {
      return;
    }

    client
      .getRun(activeRunId)
      .then((result) => setDetails(result))
      .catch((error) => notify(error instanceof Error ? error.message : "Failed to load run", "error"));
  }, [activeRunId]);

  return (
    <section className="panel split-panel">
      <div className="list-pane">
        <header className="panel-header compact">
          <h1>{t("runs.title")}</h1>
          <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void loadRuns()} />
        </header>
        <div className="item-list">
          {runs.map((run) => (
            <button
              key={run.id}
              className={`list-item ${activeRunId === run.id ? "selected" : ""}`}
              type="button"
              onClick={() => setActiveRunId(run.id)}
            >
              <span>{run.id}</span>
              <StatusBadge value={run.status} />
            </button>
          ))}
          {runs.length === 0 && <EmptyState label={t("runs.noRuns")} />}
        </div>
      </div>
      <div className="detail-pane">
        {details ? (
          <>
            <div className="run-diagnostics">
              <div>
                <strong>{String(details.run.id ?? activeRunId)}</strong>
                <span>{String(details.run.conversation_id ?? "")}</span>
              </div>
              <StatusBadge value={String(details.run.status ?? "unknown")} />
              <span>{details.diagnostics.durationMs ?? 0}ms</span>
              <span>{t("runs.modelCalls", { count: details.diagnostics.modelCallCount })}</span>
              <span>{t("runs.toolCalls", { count: details.diagnostics.toolCallCount })}</span>
              {details.diagnostics.lastError && (
                <span className="danger-text">{details.diagnostics.lastError}</span>
              )}
            </div>
            <div className="run-timeline">
              {details.steps.map((step) => (
                <article className="run-step-row" key={String(step.id)}>
                  <StatusBadge value={String(step.status ?? "unknown")} />
                  <div>
                    <strong>{String(step.kind ?? "step")}</strong>
                    <span>{String(step.summary ?? "")}</span>
                    <span>{String(step.created_at ?? "")}</span>
                  </div>
                </article>
              ))}
            </div>
            <section className="run-section">
              <h2>{t("runs.toolCallsTitle")}</h2>
              {details.toolCalls.map((toolCall) => (
                <details className="run-tool-call" key={String(toolCall.id)}>
                  <summary>
                    <span>{String(toolCall.tool_name)}</span>
                    <StatusBadge value={String(toolCall.status ?? "unknown")} />
                    {toolCall.latency_ms !== undefined && <span>{String(toolCall.latency_ms)}ms</span>}
                  </summary>
                  <div className="detail-grid">
                    <JsonBlock value={toolCall.input ?? toolCall.input_json} />
                    <JsonBlock value={toolCall.output ?? toolCall.output_json ?? toolCall.error_code} />
                  </div>
                </details>
              ))}
              {details.toolCalls.length === 0 && <EmptyState label={t("runs.noToolCalls")} />}
            </section>
            <section className="run-section">
              <h2>{t("runs.context")}</h2>
              <div className="detail-grid">
                <JsonBlock value={details.triggerMessage ?? {}} />
                <JsonBlock value={details.conversation ?? {}} />
              </div>
            </section>
            <section className="run-section">
              <h2>{t("runs.auditLogs")}</h2>
              <JsonBlock value={{ auditLogs: details.auditLogs }} />
            </section>
          </>
        ) : (
          <EmptyState label={t("runs.selectRun")} />
        )}
      </div>
    </section>
  );
}
