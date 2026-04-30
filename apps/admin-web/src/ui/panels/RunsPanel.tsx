import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminClient } from "../../api/client";
import type { RunDetails, RunListItem } from "../../api/types";
import { EmptyState } from "../EmptyState";
import { JsonBlock } from "../JsonBlock";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";

type RunsPanelProps = {
  client: AdminClient;
  notify: (message: string, tone?: "ok" | "error") => void;
  selectedRunId?: string;
};

export function RunsPanel({ client, notify, selectedRunId }: RunsPanelProps) {
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
          <h1>Runs</h1>
          <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void loadRuns()} />
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
          {runs.length === 0 && <EmptyState label="No runs" />}
        </div>
      </div>
      <div className="detail-pane">
        {details ? (
          <>
            <div className="detail-grid">
              <JsonBlock value={details.run} />
              <JsonBlock value={{ steps: details.steps }} />
            </div>
            <div className="detail-grid">
              <JsonBlock value={{ toolCalls: details.toolCalls }} />
              <JsonBlock value={{ auditLogs: details.auditLogs }} />
            </div>
          </>
        ) : (
          <EmptyState label="Select a run" />
        )}
      </div>
    </section>
  );
}
