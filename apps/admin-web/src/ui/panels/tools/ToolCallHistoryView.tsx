import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import type { ToolCallHistoryItem } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { JsonBlock } from "../../JsonBlock";
import { StatusBadge } from "../../StatusBadge";

type ToolCallHistoryViewProps = {
  calls: ToolCallHistoryItem[];
  onRefresh: () => void;
};

export function ToolCallHistoryView({
  calls,
  onRefresh
}: ToolCallHistoryViewProps) {
  const [selectedId, setSelectedId] = useState("");
  const selectedCall = useMemo(
    () => calls.find((call) => call.id === selectedId) ?? calls[0],
    [calls, selectedId]
  );

  return (
    <div className="tool-history">
      <header className="subsection-header">
        <div>
          <h2>Recent Calls</h2>
          <p>{calls.length} loaded</p>
        </div>
        <button className="secondary-button" type="button" onClick={onRefresh}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>

      {calls.length === 0 ? (
        <EmptyState label="No tool calls yet" />
      ) : (
        <div className="tool-history-layout">
          <div className="tool-call-list">
            {calls.map((call) => (
              <button
                className={`tool-call-row ${
                  selectedCall?.id === call.id ? "selected" : ""
                }`}
                key={call.id}
                type="button"
                onClick={() => setSelectedId(call.id)}
              >
                <div>
                  <strong>{call.toolName}</strong>
                  <span>{call.createdAt}</span>
                </div>
                <StatusBadge value={call.status} />
              </button>
            ))}
          </div>

          {selectedCall && (
            <div className="tool-call-detail">
              <div className="tool-meta">
                <StatusBadge value={selectedCall.status} />
                {selectedCall.latencyMs !== undefined && (
                  <span>{selectedCall.latencyMs}ms</span>
                )}
                {selectedCall.errorCode && <span>{selectedCall.errorCode}</span>}
                <span>{selectedCall.runId}</span>
              </div>
              <JsonBlock
                value={{
                  input: selectedCall.input,
                  output: selectedCall.output,
                  completedAt: selectedCall.completedAt
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
