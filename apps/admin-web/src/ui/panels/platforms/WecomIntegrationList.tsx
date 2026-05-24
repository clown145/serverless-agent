import { Link, Pencil, PlugZap, QrCode, Trash2, UserCheck } from "lucide-react";
import type { WecomIntegration } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";

type WecomIntegrationListProps = {
  integrations: WecomIntegration[];
  origin: string;
  onTest: (integrationId: string) => void;
  onCreateContactWay: (integrationId: string) => void;
  onEdit: (integration: WecomIntegration) => void;
  onDelete: (integrationId: string) => void;
};

export function WecomIntegrationList({
  integrations,
  origin,
  onTest,
  onCreateContactWay,
  onEdit,
  onDelete
}: WecomIntegrationListProps) {
  const { t } = useI18n();

  return (
    <div className="wecom-list">
      {integrations.map((integration) => {
        const webhookUrl = integration.webhookSecretConfigured
          ? `${origin}${integration.webhookPath}`
          : "";
        return (
          <div className="wecom-row" key={integration.id}>
            <div>
              <strong>{integration.name}</strong>
              <span>{integration.agentId}</span>
              <span>
                {integration.corpId ? `CorpID ${integration.corpId}` : t("platforms.noCorpId")}
              </span>
              <span>
                {integration.hasSecret ? t("platforms.encryptedSecret") : t("platforms.noSecret")}
              </span>
              <span>
                {[
                  integration.tokenConfigured ? t("platforms.wecomTokenReady") : undefined,
                  integration.encodingAesKeyConfigured ? t("platforms.wecomAesReady") : undefined,
                  integration.openKfId ? `open_kfid ${integration.openKfId}` : undefined
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
              {webhookUrl && <span>{webhookUrl}</span>}
              {integration.contactUrl && (
                <a href={integration.contactUrl} target="_blank" rel="noreferrer">
                  <Link size={14} />
                  {t("platforms.wecomContactUrl")}
                </a>
              )}
              {integration.qrCodeUrl && (
                <a href={integration.qrCodeUrl} target="_blank" rel="noreferrer">
                  <QrCode size={14} />
                  {t("platforms.wecomQrCode")}
                </a>
              )}
              {integration.lastError && <span>{integration.lastError}</span>}
            </div>
            <StatusBadge value={integration.status} />
            <ToolbarButton
              label={t("common.edit")}
              icon={Pencil}
              onClick={() => onEdit(integration)}
            />
            <ToolbarButton
              label={t("platforms.testBot")}
              icon={UserCheck}
              onClick={() => onTest(integration.id)}
            />
            <ToolbarButton
              label={t("platforms.wecomCreateContactWay")}
              icon={QrCode}
              onClick={() => onCreateContactWay(integration.id)}
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
          <span>{t("platforms.noWecom")}</span>
        </div>
      )}
    </div>
  );
}
