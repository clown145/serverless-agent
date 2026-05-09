import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { DiagnosticCheck } from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import type { PanelProps } from "./types";

export function DiagnosticsPanel({ client, notify }: PanelProps) {
  const { t } = useI18n();
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
          <h1>{t("diagnostics.title")}</h1>
          <p>{healthy ? t("common.healthy") : t("common.attentionNeeded")}</p>
        </div>
        <ToolbarButton label={t("diagnostics.run")} icon={RefreshCw} onClick={() => void load()} />
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
