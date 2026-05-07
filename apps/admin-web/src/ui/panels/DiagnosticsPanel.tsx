import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { DiagnosticCheck } from "../../api/types";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import type { PanelProps } from "./types";

export function DiagnosticsPanel({ client, notify }: PanelProps) {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [healthy, setHealthy] = useState(false);

  async function load() {
    try {
      const result = await client.getDiagnostics();
      setChecks(result.checks);
      setHealthy(result.healthy);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Diagnostics failed", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Diagnostics</h1>
          <p>{healthy ? "healthy" : "attention needed"}</p>
        </div>
        <ToolbarButton label="Run diagnostics" icon={RefreshCw} onClick={() => void load()} />
      </header>

      <div className="diagnostic-list">
        {checks.map((check) => (
          <div className="diagnostic-row" key={check.id}>
            <div>
              <strong>{check.label}</strong>
              <span>{check.detail}</span>
            </div>
            <StatusBadge value={check.status} />
          </div>
        ))}
      </div>
    </section>
  );
}
