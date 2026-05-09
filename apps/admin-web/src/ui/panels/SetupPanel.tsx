import {
  CheckCircle2,
  FileText,
  MessageSquare,
  Plug,
  RefreshCw,
  Send,
  Search,
  SlidersHorizontal,
  Wrench
} from "lucide-react";
import { useEffect, useState } from "react";
import type { SetupStatus } from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import type { ViewId } from "../views";
import type { PanelProps } from "./types";

type SetupPanelProps = PanelProps & {
  onNavigate: (view: ViewId) => void;
};

export function SetupPanel({ client, notify, onNavigate }: SetupPanelProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<SetupStatus>();

  async function load() {
    try {
      const result = await client.getSetupStatus();
      setStatus(result.status);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load setup", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>{t("setup.title")}</h1>
          <p>{status?.ready ? t("setup.ready") : t("setup.pending")}</p>
        </div>
        <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void load()} />
      </header>

      <div className="setup-actions">
        <button className="primary-button" type="button" onClick={() => onNavigate("models")}>
          <SlidersHorizontal size={16} />
          {t("nav.models")}
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("diagnostics")}>
          <Wrench size={16} />
          {t("nav.diagnostics")}
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("tools")}>
          <Plug size={16} />
          {t("nav.tools")}
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("vfs")}>
          <FileText size={16} />
          {t("nav.vfs")}
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("platforms")}>
          <Send size={16} />
          {t("nav.platforms")}
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("search")}>
          <Search size={16} />
          {t("nav.search")}
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("chat")}>
          <MessageSquare size={16} />
          {t("nav.chat")}
        </button>
      </div>

      <div className="setup-list">
        {(status?.steps ?? []).map((step) => (
          <div className="setup-row" key={step.id}>
            <CheckCircle2 size={18} />
            <div>
              <strong>{t(`setup.steps.${step.id}`)}</strong>
              <span>{formatStepDetail(step, t)}</span>
            </div>
            <StatusBadge value={step.status} />
          </div>
        ))}
      </div>
    </section>
  );
}

function formatStepDetail(
  step: SetupStatus["steps"][number],
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  if (step.id === "active_model" && step.status === "done") {
    return step.detail;
  }

  const count = Number(step.detail.match(/^\d+/)?.[0] ?? 0);
  const key = `setup.detail.${step.id}.${step.status}`;
  const detail = t(key, { count });
  return detail === key ? step.detail : detail;
}
