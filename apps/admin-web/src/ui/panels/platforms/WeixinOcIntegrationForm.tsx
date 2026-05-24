import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { WeixinOcAdvancedFields } from "./WeixinOcAdvancedFields";

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
  editing?: boolean;
  submitting?: boolean;
  onDraftChange: (draft: WeixinOcIntegrationDraft) => void;
  onSubmit: () => void;
};

export function WeixinOcIntegrationForm({
  draft,
  editing = false,
  submitting = false,
  onDraftChange,
  onSubmit
}: WeixinOcIntegrationFormProps) {
  const { t } = useI18n();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="weixin-oc-form">
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
      <button
        className="secondary-button weixin-oc-advanced-toggle"
        type="button"
        onClick={() => setAdvancedOpen((open) => !open)}
      >
        {advancedOpen ? t("platforms.weixinOcHideAdvanced") : t("platforms.weixinOcShowAdvanced")}
      </button>
      {advancedOpen && <WeixinOcAdvancedFields draft={draft} onDraftChange={onDraftChange} />}
      <button className="primary-button" type="button" onClick={onSubmit} disabled={submitting}>
        {editing ? <Save size={16} /> : <Plus size={16} />}
        {submitting
          ? editing
            ? t("common.saving")
            : t("platforms.weixinOcCreatingLogin")
          : editing
            ? t("common.save")
            : t("platforms.weixinOcCreateAndLogin")}
      </button>
    </div>
  );
}
