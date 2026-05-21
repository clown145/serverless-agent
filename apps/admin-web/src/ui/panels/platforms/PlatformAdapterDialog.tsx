import { FormDialog } from "../../FormDialog";
import { useI18n } from "../../i18n/I18nProvider";
import {
  QqOfficialIntegrationForm,
  type QqOfficialIntegrationDraft
} from "./QqOfficialIntegrationForm";
import {
  TelegramIntegrationForm,
  type TelegramIntegrationDraft
} from "./TelegramIntegrationForm";
import {
  WecomIntegrationForm,
  type WecomIntegrationDraft
} from "./WecomIntegrationForm";
import {
  WeixinOcIntegrationForm,
  type WeixinOcIntegrationDraft
} from "./WeixinOcIntegrationForm";

export type PlatformAdapterKind = "weixin_oc" | "qq" | "telegram" | "wecom";

export type PlatformAdapterDialogState = {
  open: boolean;
  selectedAdapter: PlatformAdapterKind;
  weixinOcQrImageUrl?: string;
  weixinOcQrContent?: string;
  weixinOcQrStatus?: string;
};

type PlatformAdapterDialogProps = {
  state: PlatformAdapterDialogState;
  telegramDraft: TelegramIntegrationDraft;
  qqDraft: QqOfficialIntegrationDraft;
  wecomDraft: WecomIntegrationDraft;
  weixinOcDraft: WeixinOcIntegrationDraft;
  telegramWebhookUrl: string;
  onStateChange: (state: PlatformAdapterDialogState) => void;
  onTelegramDraftChange: (draft: TelegramIntegrationDraft) => void;
  onQqDraftChange: (draft: QqOfficialIntegrationDraft) => void;
  onWecomDraftChange: (draft: WecomIntegrationDraft) => void;
  onWeixinOcDraftChange: (draft: WeixinOcIntegrationDraft) => void;
  onTelegramSubmit: () => void;
  onQqSubmit: () => void;
  onWecomSubmit: () => void;
  onWeixinOcSubmit: () => void;
  onTelegramWebhookUrlChange: (value: string) => void;
};

const adapterOptions: Array<{
  kind: PlatformAdapterKind;
  titleKey: string;
  descriptionKey: string;
}> = [
  {
    kind: "weixin_oc",
    titleKey: "platforms.weixinOcAdapterName",
    descriptionKey: "platforms.weixinOcAdapterHint"
  },
  {
    kind: "qq",
    titleKey: "platforms.qqOfficialAdapterName",
    descriptionKey: "platforms.qqOfficialAdapterHint"
  },
  {
    kind: "telegram",
    titleKey: "platforms.telegramAdapterName",
    descriptionKey: "platforms.telegramAdapterHint"
  },
  {
    kind: "wecom",
    titleKey: "platforms.wecomAdapterName",
    descriptionKey: "platforms.wecomAdapterHint"
  }
];

export function PlatformAdapterDialog({
  state,
  telegramDraft,
  qqDraft,
  wecomDraft,
  weixinOcDraft,
  telegramWebhookUrl,
  onStateChange,
  onTelegramDraftChange,
  onQqDraftChange,
  onWecomDraftChange,
  onWeixinOcDraftChange,
  onTelegramSubmit,
  onQqSubmit,
  onWecomSubmit,
  onWeixinOcSubmit,
  onTelegramWebhookUrlChange
}: PlatformAdapterDialogProps) {
  const { t } = useI18n();

  function selectAdapter(kind: PlatformAdapterKind) {
    onStateChange({
      ...state,
      selectedAdapter: kind
    });
  }

  return (
    <FormDialog
      open={state.open}
      title={t("platforms.addAdapter")}
      description={t("platforms.addAdapterHint")}
      contentClassName="platform-adapter-modal"
      onOpenChange={(open) =>
        onStateChange({
          ...state,
          open,
          weixinOcQrImageUrl: open ? state.weixinOcQrImageUrl : undefined,
          weixinOcQrContent: open ? state.weixinOcQrContent : undefined,
          weixinOcQrStatus: open ? state.weixinOcQrStatus : undefined
        })
      }
    >
      <div className="platform-adapter-dialog">
        <div className="adapter-choice-list" role="tablist" aria-label={t("platforms.addAdapter")}>
          {adapterOptions.map((option) => {
            const active = option.kind === state.selectedAdapter;
            return (
              <button
                key={option.kind}
                className={`adapter-choice${active ? " selected" : ""}`}
                type="button"
                onClick={() => selectAdapter(option.kind)}
              >
                <strong>{t(option.titleKey)}</strong>
                <span>{t(option.descriptionKey)}</span>
              </button>
            );
          })}
        </div>

        <div className="adapter-form-shell">
          {state.selectedAdapter === "weixin_oc" && (
            <div className="adapter-form-stack">
              <WeixinOcIntegrationForm
                draft={weixinOcDraft}
                onDraftChange={onWeixinOcDraftChange}
                onSubmit={onWeixinOcSubmit}
              />
              {state.weixinOcQrImageUrl && (
                <div className="weixin-oc-qr-panel weixin-oc-dialog-qr">
                  <img src={state.weixinOcQrImageUrl} alt={t("platforms.weixinOcQrAlt")} />
                  <div>
                    <strong>{t("platforms.weixinOcScanQr")}</strong>
                    {state.weixinOcQrStatus && (
                      <span>
                        {t("platforms.weixinOcQrStatus")}: {state.weixinOcQrStatus}
                      </span>
                    )}
                    <a href={state.weixinOcQrImageUrl} target="_blank" rel="noreferrer">
                      {t("platforms.weixinOcOpenQr")}
                    </a>
                  </div>
                  {state.weixinOcQrContent && (
                    <input
                      readOnly
                      value={state.weixinOcQrContent}
                      aria-label={t("platforms.weixinOcQrRaw")}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {state.selectedAdapter === "qq" && (
            <QqOfficialIntegrationForm
              draft={qqDraft}
              onDraftChange={onQqDraftChange}
              onSubmit={onQqSubmit}
            />
          )}

          {state.selectedAdapter === "telegram" && (
            <div className="adapter-form-stack">
              <div className="field-row">
                <label>
                  {t("platforms.telegramWebhookUrl")}
                  <input
                    value={telegramWebhookUrl}
                    onChange={(event) => onTelegramWebhookUrlChange(event.target.value)}
                  />
                </label>
              </div>
              <TelegramIntegrationForm
                draft={telegramDraft}
                onDraftChange={onTelegramDraftChange}
                onSubmit={onTelegramSubmit}
              />
            </div>
          )}

          {state.selectedAdapter === "wecom" && (
            <WecomIntegrationForm
              draft={wecomDraft}
              onDraftChange={onWecomDraftChange}
              onSubmit={onWecomSubmit}
            />
          )}
        </div>
      </div>
    </FormDialog>
  );
}
