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
      .catch((error) =>
        notify(error instanceof Error ? error.message : "Failed to load run", "error")
      );
  }, [activeRunId]);

  return (
    <section className="panel split-panel">
      <div className="list-pane">
        <header className="panel-header compact">
          <h1>{t("runs.title")}</h1>
          <ToolbarButton
            label={t("common.refresh")}
            icon={RefreshCw}
            onClick={() => void loadRuns()}
          />
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
              <div className="run-diagnostics-heading">
                <strong>{String(details.run.id ?? activeRunId)}</strong>
                <span>{String(details.run.conversation_id ?? "")}</span>
              </div>
              <StatusBadge value={String(details.run.status ?? "unknown")} />
              <div className="run-metric-grid">
                <RunMetric
                  label={t("runs.duration")}
                  value={formatMs(details.diagnostics.durationMs)}
                />
                <RunMetric
                  label={t("runs.modelCallsLabel")}
                  value={details.diagnostics.modelCallCount}
                />
                <RunMetric
                  label={t("runs.toolCallsLabel")}
                  value={details.diagnostics.toolCallCount}
                  detail={formatStatusCounts(details.diagnostics.toolStatusCounts, t)}
                />
                <RunMetric
                  label={t("runs.auditLogs")}
                  value={details.diagnostics.auditLogCount}
                  detail={formatStatusCounts(details.diagnostics.auditStatusCounts, t)}
                />
                <RunMetric
                  label={t("runs.avgToolLatency")}
                  value={formatMs(details.diagnostics.toolLatencyMs.average)}
                  detail={
                    details.diagnostics.toolLatencyMs.slowestToolName
                      ? t("runs.slowestTool", {
                          tool: details.diagnostics.toolLatencyMs.slowestToolName,
                          latency: formatMs(details.diagnostics.toolLatencyMs.max)
                        })
                      : undefined
                  }
                />
                <RunMetric
                  label={t("runs.failures")}
                  value={
                    details.diagnostics.failedStepCount + details.diagnostics.failedToolCallCount
                  }
                  detail={
                    details.diagnostics.errorSummary.category
                      ? translateStatus(details.diagnostics.errorSummary.category, t)
                      : t("common.none")
                  }
                  tone={details.diagnostics.errorSummary.count > 0 ? "danger" : "normal"}
                />
              </div>
              {details.diagnostics.lastError && (
                <span className="danger-text">{details.diagnostics.lastError}</span>
              )}
            </div>
            <section className="run-section">
              <h2>{t("runs.timeline")}</h2>
              <div className="run-timeline-summary">
                <RunMetric
                  label={t("runs.startedAt")}
                  value={details.diagnostics.timeline.startedAt ?? t("common.unknown")}
                />
                <RunMetric
                  label={t("runs.lastEventAt")}
                  value={details.diagnostics.timeline.lastEventAt ?? t("common.unknown")}
                />
                <RunMetric
                  label={t("runs.lastToolCompletedAt")}
                  value={details.diagnostics.timeline.lastToolCompletedAt ?? t("common.none")}
                />
              </div>
            </section>
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
                    {toolCall.latency_ms !== undefined && (
                      <span>{String(toolCall.latency_ms)}ms</span>
                    )}
                  </summary>
                  <div className="detail-grid">
                    <JsonBlock value={toolCall.input ?? toolCall.input_json} />
                    <JsonBlock
                      value={toolCall.output ?? toolCall.output_json ?? toolCall.error_code}
                    />
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

function RunMetric({
  label,
  value,
  detail,
  tone = "normal"
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "normal" | "danger";
}) {
  return (
    <div className={`run-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function formatMs(value?: number): string {
  return typeof value === "number" ? `${value}ms` : "-";
}

type Translator = (key: string, vars?: Record<string, string | number>) => string;

function formatStatusCounts(
  counts: Record<string, number> | undefined,
  t: Translator
): string | undefined {
  if (!counts) {
    return undefined;
  }

  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return undefined;
  }

  return entries.map(([status, count]) => `${translateStatus(status, t)} ${count}`).join(" · ");
}

function translateStatus(status: string, t: Translator): string {
  const key = `status.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}
