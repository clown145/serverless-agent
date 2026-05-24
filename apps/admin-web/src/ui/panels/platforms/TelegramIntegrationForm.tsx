import { Plus } from "lucide-react";
import type { TelegramIntegration } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";

export type TelegramIntegrationDraft = {
  agentId: string;
  name: string;
  botToken: string;
  webhookSecret: string;
  parseMode: TelegramIntegration["parseMode"];
};

type TelegramIntegrationFormProps = {
  draft: TelegramIntegrationDraft;
  onDraftChange: (draft: TelegramIntegrationDraft) => void;
  onSubmit: () => void;
};

export function TelegramIntegrationForm({
  draft,
  onDraftChange,
  onSubmit
}: TelegramIntegrationFormProps) {
  const { t } = useI18n();

  return (
    <div className="telegram-form">
      <label>
        {t("platforms.agent")}
        <input
          value={draft.agentId}
          placeholder={t("platforms.agentPlaceholder")}
          onChange={(event) => onDraftChange({ ...draft, agentId: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.name")}
        <input
          value={draft.name}
          onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.botToken")}
        <input
          type="password"
          value={draft.botToken}
          onChange={(event) => onDraftChange({ ...draft, botToken: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.webhookSecret")}
        <input
          value={draft.webhookSecret}
          placeholder={t("platforms.webhookSecretPlaceholder")}
          onChange={(event) => onDraftChange({ ...draft, webhookSecret: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.parseMode")}
        <select
          value={draft.parseMode}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              parseMode: event.target.value as TelegramIntegration["parseMode"]
            })
          }
        >
          <option value="HTML">HTML</option>
          <option value="MarkdownV2">MarkdownV2</option>
          <option value="none">{t("platforms.parseModeNone")}</option>
        </select>
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        <Plus size={16} />
        {t("common.add")}
      </button>
    </div>
  );
}
