import { useMemo } from "react";
import type { Schedule } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { enabledModelOptions, modelDisplayLabel } from "../models/modelSelection";
import type { ScheduleFormState, ScheduleModelOptions } from "./types";

type ScheduleEditorProps = {
  form: ScheduleFormState;
  modelOptions: ScheduleModelOptions;
  onChange: (patch: Partial<ScheduleFormState>) => void;
  onCreate: () => void;
  onOpenModelConfig?: () => void;
};

export function ScheduleEditor({
  form,
  modelOptions,
  onChange,
  onCreate,
  onOpenModelConfig
}: ScheduleEditorProps) {
  const { t } = useI18n();
  const providerModels = useMemo(
    () =>
      enabledModelOptions(
        modelOptions.models.filter((model) => model.providerId === form.modelProviderId)
      ),
    [form.modelProviderId, modelOptions.models]
  );

  return (
    <section className="schedule-editor">
      <label>
        {t("schedules.titleLabel")}
        <input value={form.title} onChange={(event) => onChange({ title: event.target.value })} />
      </label>
      <label className="schedule-text-field">
        {t("schedules.text")}
        <textarea value={form.text} onChange={(event) => onChange({ text: event.target.value })} />
      </label>
      <label>
        {t("schedules.timeMode")}
        <select
          value={form.timeMode}
          onChange={(event) => onChange({ timeMode: event.target.value as "delay" | "dueAt" })}
        >
          <option value="delay">{t("schedules.modeDelay")}</option>
          <option value="dueAt">{t("schedules.modeDueAt")}</option>
        </select>
      </label>
      {form.timeMode === "delay" ? (
        <label>
          {t("schedules.delay")}
          <input
            type="number"
            min="0"
            value={form.delaySeconds}
            onChange={(event) => onChange({ delaySeconds: Number(event.target.value) })}
          />
        </label>
      ) : (
        <label>
          {t("schedules.dueAt")}
          <input
            type="datetime-local"
            value={form.dueAt}
            onChange={(event) => onChange({ dueAt: event.target.value })}
          />
        </label>
      )}
      <label>
        {t("schedules.interval")}
        <input
          type="number"
          min="0"
          value={form.intervalSeconds}
          onChange={(event) => onChange({ intervalSeconds: Number(event.target.value) })}
        />
      </label>
      <label>
        {t("schedules.platform")}
        <select
          value={form.platform}
          onChange={(event) => {
            const nextPlatform = event.target.value as Schedule["platform"];
            onChange({
              platform: nextPlatform,
              conversationId: defaultConversationForPlatform(nextPlatform)
            });
          }}
        >
          <option value="webui">WebUI</option>
          <option value="telegram">Telegram</option>
          <option value="qq">QQ</option>
          <option value="wecom">WeCom</option>
          <option value="weixin_oc">WeChat Personal</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      {onOpenModelConfig && (
        <button className="secondary-button" type="button" onClick={onOpenModelConfig}>
          {t("models.openModelConfig")}
        </button>
      )}
      <label>
        {t("schedules.conversation")}
        <input
          value={form.conversationId}
          onChange={(event) => onChange({ conversationId: event.target.value })}
          placeholder="webui:schedule"
        />
      </label>
      <label>
        {t("schedules.actor")}
        <input value={form.actorId} onChange={(event) => onChange({ actorId: event.target.value })} />
      </label>
      <label>
        {t("schedules.modelProvider")}
        <select
          value={form.modelProviderId}
          onChange={(event) => onChange({ modelProviderId: event.target.value, modelId: "" })}
        >
          <option value="">{t("conversations.defaultModel")}</option>
          {modelOptions.providers.map((provider) => (
            <option value={provider.id} key={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("schedules.model")}
        <select
          value={form.modelId}
          disabled={!form.modelProviderId}
          onChange={(event) => onChange({ modelId: event.target.value })}
        >
          <option value="">{t("conversations.defaultModel")}</option>
          {providerModels.map((model) => (
            <option value={model.modelId} key={model.id}>
              {modelDisplayLabel(model)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("schedules.maxAttempts")}
        <input
          type="number"
          min="1"
          max="10"
          value={form.maxAttempts}
          onChange={(event) => onChange({ maxAttempts: Number(event.target.value) })}
        />
      </label>
      <label>
        {t("schedules.retryDelay")}
        <input
          type="number"
          min="1"
          value={form.retryDelaySeconds}
          onChange={(event) => onChange({ retryDelaySeconds: Number(event.target.value) })}
        />
      </label>
      <button className="primary-button" type="button" onClick={onCreate}>
        {t("common.create")}
      </button>
    </section>
  );
}

function defaultConversationForPlatform(platform: Schedule["platform"]): string {
  if (platform === "telegram") {
    return "telegram:";
  }

  if (platform === "qq") {
    return "qq:";
  }

  if (platform === "wecom") {
    return "wecom:kf:";
  }

  if (platform === "weixin_oc") {
    return "weixin_oc:";
  }

  if (platform === "admin") {
    return "admin:schedule";
  }

  return "webui:schedule";
}
