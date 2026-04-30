import { CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { PendingAction } from "../../api/types";
import { EmptyState } from "../EmptyState";
import { JsonBlock } from "../JsonBlock";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import type { PanelProps } from "./types";

export function PendingPanel({ client, notify }: PanelProps) {
  const [actions, setActions] = useState<PendingAction[]>([]);

  async function load() {
    try {
      const result = await client.listPendingActions();
      setActions(result.actions);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load pending actions", "error");
    }
  }

  async function confirm(id: string) {
    try {
      await client.confirmPendingAction(id);
      notify("Action confirmed", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to confirm action", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <h1>Pending Actions</h1>
        <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void load()} />
      </header>
      <div className="table-list">
        {actions.map((action) => (
          <div className="table-row pending-row" key={action.id}>
            <div>
              <strong>{action.toolName}</strong>
              <span>{action.id}</span>
            </div>
            <StatusBadge value={action.status} />
            <div className="meta-line">{action.reason ?? action.expiresAt}</div>
            <JsonBlock value={JSON.parse(action.inputJson)} />
            <ToolbarButton
              label="Confirm"
              icon={CheckCircle2}
              onClick={() => void confirm(action.id)}
              disabled={action.status !== "pending"}
            />
          </div>
        ))}
        {actions.length === 0 && <EmptyState label="No pending actions" />}
      </div>
    </section>
  );
}
