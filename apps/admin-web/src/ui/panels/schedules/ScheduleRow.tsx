import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import type { Schedule } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { JsonBlock } from "../../JsonBlock";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";
import type { SchedulePayloadPreview } from "./types";

type ScheduleRowProps = {
  schedule: Schedule;
  onCancel: (id: string) => Promise<void>;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onRunNow: (id: string) => Promise<void>;
};

export function ScheduleRow({
  schedule,
  onCancel,
  onPause,
  onResume,
  onRunNow
}: ScheduleRowProps) {
  const { t } = useI18n();
  const payload = parsePayload(schedule.payloadJson);
  const canPause = schedule.status === "active";
  const canResume = schedule.status === "paused" || schedule.status === "failed";

  return (
    <article className="schedule-row">
      <div className="schedule-main">
        <strong>{schedule.title ?? payload.title ?? schedule.id}</strong>
        <span>{schedule.id}</span>
        <p>{payload.text}</p>
        <div className="tool-meta">
          <StatusBadge value={schedule.status} />
          <span>{t("schedules.next")}: {schedule.dueAt}</span>
          <span>{t("schedules.interval")}: {schedule.intervalSeconds || t("status.none")}</span>
          <span>{t("schedules.platform")}: {schedule.platform ?? payload.platform ?? "admin"}</span>
          <span>{t("schedules.conversation")}: {schedule.conversationId ?? payload.conversationId ?? "admin:schedule"}</span>
          <span>{t("schedules.attempts")}: {schedule.attemptCount}/{schedule.maxAttempts}</span>
        </div>
        {schedule.lastRunAt ? <span>{t("schedules.lastRun")}: {schedule.lastRunAt}</span> : null}
        {schedule.lastRunId ? <span>{t("schedules.lastRunId")}: {schedule.lastRunId}</span> : null}
        {schedule.lastError ? <span className="danger-text">{schedule.lastError}</span> : null}
      </div>
      <div className="schedule-actions">
        <ToolbarButton
          label={t("schedules.runNow")}
          icon={Play}
          onClick={() => void onRunNow(schedule.id)}
        />
        {canPause ? (
          <ToolbarButton
            label={t("schedules.pause")}
            icon={Pause}
            onClick={() => void onPause(schedule.id)}
          />
        ) : null}
        {canResume ? (
          <ToolbarButton
            label={t("schedules.resume")}
            icon={RotateCcw}
            onClick={() => void onResume(schedule.id)}
          />
        ) : null}
        <ToolbarButton
          label={t("common.cancel")}
          icon={Trash2}
          variant="danger"
          onClick={() => void onCancel(schedule.id)}
        />
      </div>
      <JsonBlock value={payload} />
    </article>
  );
}

function parsePayload(value: string): SchedulePayloadPreview {
  try {
    return JSON.parse(value) as SchedulePayloadPreview;
  } catch {
    return {};
  }
}
