import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { DiagnosticCheck, DiagnosticSummary } from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import type { PanelProps } from "./types";

const CATEGORIES: DiagnosticCheck["category"][] = [
  "runtime",
  "model",
  "search",
  "platforms",
  "workspace",
  "mcp",
  "activity"
];

export function DiagnosticsPanel({ client, notify }: PanelProps) {
  const { t } = useI18n();
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [summary, setSummary] = useState<DiagnosticSummary>({
    ok: 0,
    warn: 0,
    error: 0,
    total: 0
  });
  const [healthy, setHealthy] = useState(false);

  async function load() {
    try {
      const result = await client.getDiagnostics();
      setChecks(result.checks);
      setSummary(result.summary);
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
          <p>
            {healthy ? t("common.healthy") : t("common.attentionNeeded")}
            {" · "}
            {t("diagnostics.summary", {
              ok: summary.ok,
              warn: summary.warn,
              error: summary.error
            })}
          </p>
        </div>
        <ToolbarButton label={t("diagnostics.run")} icon={RefreshCw} onClick={() => void load()} />
      </header>

      <div className="diagnostic-groups">
        {CATEGORIES.map((category) => {
          const categoryChecks = checks.filter((check) => check.category === category);
          if (!categoryChecks.length) {
            return null;
          }

          return (
            <section className="diagnostic-group" key={category}>
              <div className="subsection-header">
                <div>
                  <h2>{t(`diagnostics.category.${category}`)}</h2>
                  <p className="muted-line">
                    {t("common.loadedCount", { count: categoryChecks.length })}
                  </p>
                </div>
              </div>
              <div className="diagnostic-list">
                {categoryChecks.map((check) => (
                  <div className="diagnostic-row" key={check.id}>
                    <div>
                      <strong>{check.label}</strong>
                      <span>{check.detail}</span>
                      {check.action ? <small>{check.action}</small> : null}
                    </div>
                    <StatusBadge value={check.status} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
