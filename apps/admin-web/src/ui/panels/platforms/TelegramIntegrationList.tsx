import { PlugZap, Radio, Trash2, Unplug, UserCheck } from "lucide-react";
import type { TelegramIntegration } from "../../../api/types";
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
  return (
    <div className="telegram-list">
      {integrations.map((integration) => (
        <div className="telegram-row" key={integration.id}>
          <div>
            <strong>{integration.name}</strong>
            <span>{integration.agentId}</span>
            <span>{integration.hasCredential ? "encrypted token" : "no token"}</span>
            <span>
              {integration.webhookSecretConfigured ? "webhook secret ready" : "no webhook secret"}
            </span>
            {integration.lastError && <span>{integration.lastError}</span>}
          </div>
          <StatusBadge value={integration.status} />
          <ToolbarButton
            label="Test bot"
            icon={UserCheck}
            onClick={() => onTest(integration.id)}
          />
          <ToolbarButton
            label="Set webhook"
            icon={Radio}
            onClick={() => onSetWebhook(integration.id)}
          />
          <ToolbarButton
            label="Delete webhook"
            icon={Unplug}
            onClick={() => onDeleteWebhook(integration.id)}
          />
          <ToolbarButton
            label="Delete"
            icon={Trash2}
            variant="danger"
            onClick={() => onDelete(integration.id)}
          />
        </div>
      ))}
      {integrations.length === 0 && (
        <div className="empty-state">
          <PlugZap size={18} />
          <span>No Telegram integrations</span>
        </div>
      )}
    </div>
  );
}
