import { LogIn, PlugZap, QrCode, Radio, Trash2, Unplug, Wifi } from "lucide-react";
import type { WeixinOcGatewayStatus, WeixinOcIntegration } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";

type WeixinOcIntegrationListProps = {
  integrations: WeixinOcIntegration[];
  gatewayStatuses: Record<string, WeixinOcGatewayStatus | undefined>;
  onLogin: (integrationId: string) => void;
  onConnect: (integrationId: string) => void;
  onStatus: (integrationId: string) => void;
  onDisconnect: (integrationId: string) => void;
  onDelete: (integrationId: string) => void;
};

export function WeixinOcIntegrationList({
  integrations,
  gatewayStatuses,
  onLogin,
  onConnect,
  onStatus,
  onDisconnect,
  onDelete
}: WeixinOcIntegrationListProps) {
  const { t } = useI18n();

  return (
    <div className="weixin-oc-list">
      {integrations.map((integration) => {
        const gateway = gatewayStatuses[integration.id];
        const qr = gateway?.loginSession;
        return (
          <div className="weixin-oc-row" key={integration.id}>
            <div>
              <strong>{integration.name}</strong>
              <span>{integration.agentId}</span>
              <span>{integration.accountId ? `Account ${integration.accountId}` : t("platforms.weixinOcNoAccount")}</span>
              <span>{integration.hasCredential ? t("platforms.weixinOcLoggedIn") : t("platforms.weixinOcNotLoggedIn")}</span>
              <span>
                {[
                  `ctx ${integration.contextTokenCount}`,
                  integration.syncBufLength ? `sync ${integration.syncBufLength}` : undefined,
                  integration.baseUrl
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
              {qr && (
                <span>
                  {t("platforms.weixinOcQrStatus")}: {qr.status}
                </span>
              )}
              {qr?.error && <span>{qr.error}</span>}
              {integration.lastError && <span>{integration.lastError}</span>}
            </div>
            <StatusBadge value={integration.status} />
            {qr?.qrImageUrl && (
              <a
                className="qr-link"
                href={qr.qrImageUrl}
                target="_blank"
                rel="noreferrer"
                title={t("platforms.weixinOcOpenQr")}
                aria-label={t("platforms.weixinOcOpenQr")}
              >
                <QrCode size={16} />
              </a>
            )}
            <ToolbarButton
              label={t("platforms.weixinOcLogin")}
              icon={LogIn}
              onClick={() => onLogin(integration.id)}
            />
            <ToolbarButton
              label={t("platforms.connectGateway")}
              icon={Wifi}
              onClick={() => onConnect(integration.id)}
            />
            <ToolbarButton
              label={t("platforms.gatewayStatus")}
              icon={Radio}
              onClick={() => onStatus(integration.id)}
            />
            <ToolbarButton
              label={t("platforms.disconnectGateway")}
              icon={Unplug}
              onClick={() => onDisconnect(integration.id)}
            />
            <ToolbarButton
              label={t("common.delete")}
              icon={Trash2}
              variant="danger"
              onClick={() => onDelete(integration.id)}
            />
          </div>
        );
      })}
      {integrations.length === 0 && (
        <div className="empty-state">
          <PlugZap size={18} />
          <span>{t("platforms.noWeixinOc")}</span>
        </div>
      )}
    </div>
  );
}

