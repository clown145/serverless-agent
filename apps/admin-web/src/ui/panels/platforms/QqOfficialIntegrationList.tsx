import { Pencil, PlugZap, Radio, Trash2, Unplug, UserCheck, Wifi } from "lucide-react";
import type { QqOfficialIntegration } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";

type QqOfficialIntegrationListProps = {
  integrations: QqOfficialIntegration[];
  origin: string;
  onTest: (integrationId: string) => void;
  onConnect: (integrationId: string) => void;
  onDisconnect: (integrationId: string) => void;
  onStatus: (integrationId: string) => void;
  onEdit: (integration: QqOfficialIntegration) => void;
  onDelete: (integrationId: string) => void;
};

export function QqOfficialIntegrationList({
  integrations,
  origin,
  onTest,
  onConnect,
  onDisconnect,
  onStatus,
  onEdit,
  onDelete
}: QqOfficialIntegrationListProps) {
  const { t } = useI18n();

  return (
    <div className="qq-official-list">
      {integrations.map((integration) => (
        <div className="qq-official-row" key={integration.id}>
          <div>
            <strong>{integration.name}</strong>
            <span>{integration.agentId}</span>
            <span>{integration.appId ? `AppID ${integration.appId}` : t("platforms.noAppId")}</span>
            <span>
              {integration.connectionMode === "webhook"
                ? t("platforms.qqWebhookMode")
                : t("platforms.qqGatewayMode")}
            </span>
            <span>
              {integration.hasCredential ? t("platforms.encryptedSecret") : t("platforms.noSecret")}
            </span>
            <span>
              {[
                integration.enableGroupC2c ? t("platforms.qqGroupC2c") : undefined,
                integration.enableGuildDirectMessage ? t("platforms.qqGuildDm") : undefined,
                integration.isSandbox ? t("platforms.qqSandbox") : undefined
              ]
                .filter(Boolean)
                .join(" / ")}
            </span>
            {integration.connectionMode === "webhook" && (
              <span>
                {t("platforms.qqWebhookUrl")}: {origin}
                {integration.webhookPath}
              </span>
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
      ))}
      {integrations.length === 0 && (
        <div className="empty-state">
          <PlugZap size={18} />
          <span>{t("platforms.noQqOfficial")}</span>
        </div>
      )}
    </div>
  );
}
