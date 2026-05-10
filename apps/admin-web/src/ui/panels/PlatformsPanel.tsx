import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { TelegramIntegration } from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { JsonBlock } from "../JsonBlock";
import { ToolbarButton } from "../ToolbarButton";
import {
  TelegramIntegrationForm,
  type TelegramIntegrationDraft
} from "./platforms/TelegramIntegrationForm";
import { TelegramIntegrationList } from "./platforms/TelegramIntegrationList";
import type { PanelProps } from "./types";

export function PlatformsPanel({ client, notify }: PanelProps) {
  const { t } = useI18n();
  const [integrations, setIntegrations] = useState<TelegramIntegration[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [result, setResult] = useState<unknown>();
  const [draft, setDraft] = useState<TelegramIntegrationDraft>({
    agentId: "default",
    name: "Telegram",
    botToken: "",
    webhookSecret: "",
    parseMode: "HTML"
  });

  async function load() {
    try {
      const response = await client.getTelegramIntegrations();
      setIntegrations(response.integrations);
      setWebhookUrl(`${window.location.origin}${response.webhookPath}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load platforms", "error");
    }
  }

  async function createIntegration() {
    try {
      const created = await client.createTelegramIntegration({
        agentId: draft.agentId || undefined,
        name: draft.name,
        botToken: draft.botToken || undefined,
        webhookSecret: draft.webhookSecret || undefined,
        parseMode: draft.parseMode
      });
      if (draft.botToken) {
        const webhook = await client.setTelegramWebhook(
          created.integration.id,
          webhookUrl
        );
        setResult(webhook);
      } else {
        setResult(created);
      }
      setDraft({ ...draft, botToken: "", webhookSecret: "" });
      notify(
        draft.botToken
          ? t("platforms.telegramSavedWebhook")
          : t("platforms.telegramSaved"),
        "ok"
      );
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save Telegram", "error");
    }
  }

  async function testIntegration(id: string) {
    await runAction(() => client.testTelegramIntegration(id), t("platforms.botTested"));
  }

  async function setWebhook(id: string) {
    await runAction(() => client.setTelegramWebhook(id, webhookUrl), t("platforms.webhookSet"));
  }

  async function deleteWebhook(id: string) {
    await runAction(() => client.deleteTelegramWebhook(id), t("platforms.webhookDeleted"));
  }

  async function updateParseMode(
    id: string,
    parseMode: TelegramIntegration["parseMode"]
  ) {
    await runAction(
      () => client.updateTelegramIntegration(id, { parseMode }),
      t("platforms.integrationUpdated")
    );
  }

  async function deleteIntegration(id: string) {
    await runAction(() => client.deleteTelegramIntegration(id), t("platforms.integrationDeleted"));
  }

  async function runAction(action: () => Promise<unknown>, okMessage: string) {
    try {
      const response = await action();
      setResult(response);
      notify(okMessage, "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Telegram action failed", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>{t("platforms.title")}</h1>
          <p>Telegram</p>
        </div>
        <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void load()} />
      </header>

      <div className="field-row">
        <label>
          {t("platforms.telegramWebhookUrl")}
          <input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} />
        </label>
      </div>

      <TelegramIntegrationForm
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={() => void createIntegration()}
      />

      <TelegramIntegrationList
        integrations={integrations}
        onUpdateParseMode={(id, parseMode) => void updateParseMode(id, parseMode)}
        onTest={(id) => void testIntegration(id)}
        onSetWebhook={(id) => void setWebhook(id)}
        onDeleteWebhook={(id) => void deleteWebhook(id)}
        onDelete={(id) => void deleteIntegration(id)}
      />

      {result !== undefined && <JsonBlock value={result} />}
    </section>
  );
}
