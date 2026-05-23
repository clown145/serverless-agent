import { Plus } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";

export type QqOfficialIntegrationDraft = {
  agentId: string;
  name: string;
  appId: string;
  secret: string;
  connectionMode: "gateway" | "webhook";
  isSandbox: boolean;
  enableGroupC2c: boolean;
  enableGuildDirectMessage: boolean;
  enablePublicGuildMessages: boolean;
};

type QqOfficialIntegrationFormProps = {
  draft: QqOfficialIntegrationDraft;
  onDraftChange: (draft: QqOfficialIntegrationDraft) => void;
  onSubmit: () => void;
};

export function QqOfficialIntegrationForm({
  draft,
  onDraftChange,
  onSubmit
}: QqOfficialIntegrationFormProps) {
  const { t } = useI18n();

  return (
    <div className="qq-official-form">
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
        {t("platforms.qqAppId")}
        <input
          value={draft.appId}
          onChange={(event) => onDraftChange({ ...draft, appId: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.qqSecret")}
        <input
          type="password"
          value={draft.secret}
          onChange={(event) => onDraftChange({ ...draft, secret: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.qqConnectionMode")}
        <select
          value={draft.connectionMode}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              connectionMode: event.target.value as QqOfficialIntegrationDraft["connectionMode"]
            })
          }
        >
          <option value="gateway">{t("platforms.qqGatewayMode")}</option>
          <option value="webhook">{t("platforms.qqWebhookMode")}</option>
        </select>
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={draft.isSandbox}
          onChange={(event) => onDraftChange({ ...draft, isSandbox: event.target.checked })}
        />
        {t("platforms.qqSandbox")}
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={draft.enableGroupC2c}
          onChange={(event) =>
            onDraftChange({ ...draft, enableGroupC2c: event.target.checked })
          }
        />
        {t("platforms.qqGroupC2c")}
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={draft.enableGuildDirectMessage}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              enableGuildDirectMessage: event.target.checked
            })
          }
        />
        {t("platforms.qqGuildDm")}
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        <Plus size={16} />
        {t("common.add")}
      </button>
    </div>
  );
}
