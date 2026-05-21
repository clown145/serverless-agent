import { Plus } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";

export type WeixinOcIntegrationDraft = {
  agentId: string;
  name: string;
  baseUrl: string;
  cdnBaseUrl: string;
  botType: string;
  qrPollIntervalMs: number;
  longPollTimeoutMs: number;
  apiTimeoutMs: number;
  token: string;
  accountId: string;
};

type WeixinOcIntegrationFormProps = {
  draft: WeixinOcIntegrationDraft;
  onDraftChange: (draft: WeixinOcIntegrationDraft) => void;
  onSubmit: () => void;
};

export function WeixinOcIntegrationForm({
  draft,
  onDraftChange,
  onSubmit
}: WeixinOcIntegrationFormProps) {
  const { t } = useI18n();

  return (
    <div className="weixin-oc-form">
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
        {t("platforms.weixinOcBaseUrl")}
        <input
          value={draft.baseUrl}
          onChange={(event) => onDraftChange({ ...draft, baseUrl: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.weixinOcCdnBaseUrl")}
        <input
          value={draft.cdnBaseUrl}
          onChange={(event) => onDraftChange({ ...draft, cdnBaseUrl: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.weixinOcBotType")}
        <input
          value={draft.botType}
          onChange={(event) => onDraftChange({ ...draft, botType: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.weixinOcQrPollMs")}
        <input
          type="number"
          min="1000"
          value={draft.qrPollIntervalMs}
          onChange={(event) =>
            onDraftChange({ ...draft, qrPollIntervalMs: Number(event.target.value) })
          }
        />
      </label>
      <label>
        {t("platforms.weixinOcLongPollMs")}
        <input
          type="number"
          min="5000"
          value={draft.longPollTimeoutMs}
          onChange={(event) =>
            onDraftChange({ ...draft, longPollTimeoutMs: Number(event.target.value) })
          }
        />
      </label>
      <label>
        {t("platforms.weixinOcApiTimeoutMs")}
        <input
          type="number"
          min="5000"
          value={draft.apiTimeoutMs}
          onChange={(event) =>
            onDraftChange({ ...draft, apiTimeoutMs: Number(event.target.value) })
          }
        />
      </label>
      <label>
        {t("platforms.weixinOcToken")}
        <input
          type="password"
          value={draft.token}
          onChange={(event) => onDraftChange({ ...draft, token: event.target.value })}
        />
      </label>
      <label>
        {t("platforms.weixinOcAccountId")}
        <input
          value={draft.accountId}
          onChange={(event) => onDraftChange({ ...draft, accountId: event.target.value })}
        />
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        <Plus size={16} />
        {t("common.add")}
      </button>
    </div>
  );
}

