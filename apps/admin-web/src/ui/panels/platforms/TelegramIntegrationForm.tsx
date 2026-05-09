import { Plus } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";

export type TelegramIntegrationDraft = {
  agentId: string;
  name: string;
  botToken: string;
  webhookSecret: string;
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
          placeholder="default"
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
          placeholder="auto-generated"
          onChange={(event) => onDraftChange({ ...draft, webhookSecret: event.target.value })}
        />
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        <Plus size={16} />
        {t("common.add")}
      </button>
    </div>
  );
}
