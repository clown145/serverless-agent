import { PlugZap, Radio, Trash2, Unplug, UserCheck } from "lucide-react";
import type { TelegramIntegration } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";

type TelegramIntegrationListProps = {
  integrations: TelegramIntegration[];
  onTest: (integrationId: string) => void;
  onSetWebhook: (integrationId: string) => void;
  onDeleteWebhook: (integrationId: string) => void;
  onDelete: (integrationId: string) => void;
};

export function TelegramIntegrationList({
  integrations,
  onTest,
  onSetWebhook,
  onDeleteWebhook,
  onDelete
}: TelegramIntegrationListProps) {
  const { t } = useI18n();

  return (
    <div className="telegram-list">
      {integrations.map((integration) => (
        <div className="telegram-row" key={integration.id}>
          <div>
            <strong>{integration.name}</strong>
            <span>{integration.agentId}</span>
            <span>{integration.hasCredential ? t("platforms.encryptedToken") : t("platforms.noToken")}</span>
            <span>
              {integration.webhookSecretConfigured
                ? t("platforms.webhookSecretReady")
                : t("platforms.noWebhookSecret")}
            </span>
            {integration.lastError && <span>{integration.lastError}</span>}
          </div>
          <StatusBadge value={integration.status} />
          <ToolbarButton
            label={t("platforms.testBot")}
            icon={UserCheck}
            onClick={() => onTest(integration.id)}
          />
          <ToolbarButton
            label={t("platforms.setWebhook")}
            icon={Radio}
            onClick={() => onSetWebhook(integration.id)}
          />
          <ToolbarButton
            label={t("platforms.deleteWebhook")}
            icon={Unplug}
            onClick={() => onDeleteWebhook(integration.id)}
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
          <span>{t("platforms.noTelegram")}</span>
        </div>
      )}
    </div>
  );
}
