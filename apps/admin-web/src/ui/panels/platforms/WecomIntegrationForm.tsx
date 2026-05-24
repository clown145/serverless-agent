import { Plus } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";

export type WecomIntegrationDraft = {
  agentId: string;
  name: string;
  corpId: string;
  secret: string;
  token: string;
  encodingAesKey: string;
  apiBaseUrl: string;
  customerServiceName: string;
  openKfId: string;
  webhookSecret: string;
};

type WecomIntegrationFormProps = {
  draft: WecomIntegrationDraft;
  onDraftChange: (draft: WecomIntegrationDraft) => void;
  onSubmit: () => void;
};

export function WecomIntegrationForm({
  draft,
  onDraftChange,
  onSubmit
}: WecomIntegrationFormProps) {
  const { t } = useI18n();

  return (
    <div className="wecom-form">
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
        {t("platforms.wecomCorpId")}
        <input
          value={draft.corpId}
          onChange={(event) => onDraftChange({ ...draft, corpId: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.wecomSecret")}
        <input
          type="password"
          value={draft.secret}
          onChange={(event) => onDraftChange({ ...draft, secret: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.wecomToken")}
        <input
          value={draft.token}
          onChange={(event) => onDraftChange({ ...draft, token: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.wecomAesKey")}
        <input
          type="password"
          value={draft.encodingAesKey}
          onChange={(event) => onDraftChange({ ...draft, encodingAesKey: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.wecomKfName")}
        <input
          value={draft.customerServiceName}
          onChange={(event) => onDraftChange({ ...draft, customerServiceName: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.wecomOpenKfId")}
        <input
          value={draft.openKfId}
          onChange={(event) => onDraftChange({ ...draft, openKfId: event.target.value })}
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
        {t("platforms.wecomApiBase")}
        <input
          value={draft.apiBaseUrl}
          onChange={(event) => onDraftChange({ ...draft, apiBaseUrl: event.target.value })}
        />
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        <Plus size={16} />
        {t("common.add")}
      </button>
    </div>
  );
}
