import { useI18n } from "../../i18n/I18nProvider";
import type { WeixinOcIntegrationDraft } from "./WeixinOcIntegrationForm";

type WeixinOcAdvancedFieldsProps = {
  draft: WeixinOcIntegrationDraft;
  onDraftChange: (draft: WeixinOcIntegrationDraft) => void;
};

export function WeixinOcAdvancedFields({ draft, onDraftChange }: WeixinOcAdvancedFieldsProps) {
  const { t } = useI18n();

  return (
    <div className="weixin-oc-advanced-fields">
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
    </div>
  );
}
