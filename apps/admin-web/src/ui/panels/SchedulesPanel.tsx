import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ModelCatalogItem, ModelProvider, Schedule } from "../../api/types";
import { EmptyState } from "../EmptyState";
import { useI18n } from "../i18n/I18nProvider";
import { ToolbarButton } from "../ToolbarButton";
import { ScheduleEditor } from "./schedules/ScheduleEditor";
import { ScheduleRow } from "./schedules/ScheduleRow";
import type { ScheduleFormState } from "./schedules/types";
import type { PanelProps } from "./types";
import type { ViewId } from "../views";

const DEFAULT_FORM: ScheduleFormState = {
  title: "",
  text: "搜索今天的原神和星穹铁道公告，整理更新摘要。",
  timeMode: "delay",
  delaySeconds: 300,
  dueAt: "",
  intervalSeconds: 0,
  platform: "webui",
  conversationId: "webui:schedule",
  actorId: "scheduler",
  modelProviderId: "",
  modelId: "",
  maxAttempts: 2,
  retryDelaySeconds: 300
};

type SchedulesPanelProps = PanelProps & {
  onNavigate?: (view: ViewId) => void;
};

export function SchedulesPanel({ client, notify, onNavigate }: SchedulesPanelProps) {
  const { t } = useI18n();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [models, setModels] = useState<ModelCatalogItem[]>([]);
  const [form, setForm] = useState<ScheduleFormState>(DEFAULT_FORM);

  async function load() {
    try {
      const [scheduleResult, modelResult] = await Promise.all([
        client.listSchedules(),
        client.getModelSettings()
      ]);
      setSchedules(scheduleResult.schedules);
      setProviders(modelResult.providers);
      setModels(modelResult.models);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load schedules", "error");
    }
  }

  async function create() {
    try {
      await client.createSchedule({
        title: form.title || undefined,
        text: form.text,
        platform: form.platform,
        conversationId: form.conversationId || undefined,
        actorId: form.actorId || undefined,
        actorRole: "owner",
        modelProviderId: form.modelId ? form.modelProviderId : undefined,
        modelId: form.modelId || undefined,
        dueAt: form.timeMode === "dueAt" && form.dueAt
          ? new Date(form.dueAt).toISOString()
          : undefined,
        delaySeconds: form.timeMode === "delay" ? form.delaySeconds : undefined,
        intervalSeconds: form.intervalSeconds > 0 ? form.intervalSeconds : undefined,
        maxAttempts: form.maxAttempts,
        retryDelaySeconds: form.retryDelaySeconds
      });
      notify(t("schedules.created"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to create schedule", "error");
    }
  }

  async function withScheduleReload(
    action: () => Promise<unknown>,
    successMessage: string,
    fallbackMessage: string
  ) {
    try {
      await action();
      notify(successMessage, "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : fallbackMessage, "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <h1>{t("schedules.title")}</h1>
        <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void load()} />
      </header>

      <ScheduleEditor
        form={form}
        modelOptions={{ providers, models }}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onCreate={() => void create()}
        onOpenModelConfig={() => onNavigate?.("model_config")}
      />

      <div className="schedule-list">
        {schedules.map((schedule) => (
          <ScheduleRow
            key={schedule.id}
            schedule={schedule}
            onCancel={(id) =>
              withScheduleReload(
                () => client.cancelSchedule(id),
                t("schedules.cancelled"),
                "Failed to cancel schedule"
              )
            }
            onPause={(id) =>
              withScheduleReload(
                () => client.pauseSchedule(id),
                t("schedules.paused"),
                "Failed to pause schedule"
              )
            }
            onResume={(id) =>
              withScheduleReload(
                () => client.resumeSchedule(id),
                t("schedules.resumed"),
                "Failed to resume schedule"
              )
            }
            onRunNow={(id) =>
              withScheduleReload(
                () => client.runScheduleNow(id),
                t("schedules.runQueued"),
                "Failed to run schedule"
              )
            }
          />
        ))}
        {schedules.length === 0 && <EmptyState label={t("schedules.noSchedules")} />}
      </div>
    </section>
  );
}
