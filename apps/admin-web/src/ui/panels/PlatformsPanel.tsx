import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  QqOfficialIntegration,
  TelegramIntegration,
  WecomIntegration
} from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { JsonBlock } from "../JsonBlock";
import { ToolbarButton } from "../ToolbarButton";
import {
  QqOfficialIntegrationForm,
  type QqOfficialIntegrationDraft
} from "./platforms/QqOfficialIntegrationForm";
import { QqOfficialIntegrationList } from "./platforms/QqOfficialIntegrationList";
import {
  TelegramIntegrationForm,
  type TelegramIntegrationDraft
} from "./platforms/TelegramIntegrationForm";
import { TelegramIntegrationList } from "./platforms/TelegramIntegrationList";
import {
  WecomIntegrationForm,
  type WecomIntegrationDraft
} from "./platforms/WecomIntegrationForm";
import { WecomIntegrationList } from "./platforms/WecomIntegrationList";
import type { PanelProps } from "./types";

export function PlatformsPanel({ client, notify }: PanelProps) {
  const { t } = useI18n();
  const [integrations, setIntegrations] = useState<TelegramIntegration[]>([]);
  const [qqIntegrations, setQqIntegrations] = useState<QqOfficialIntegration[]>([]);
  const [wecomIntegrations, setWecomIntegrations] = useState<WecomIntegration[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [result, setResult] = useState<unknown>();
  const [draft, setDraft] = useState<TelegramIntegrationDraft>({
    agentId: "default",
    name: "Telegram",
    botToken: "",
    webhookSecret: "",
    parseMode: "HTML"
  });
  const [qqDraft, setQqDraft] = useState<QqOfficialIntegrationDraft>({
    agentId: "default",
    name: "QQ Official",
    appId: "",
    secret: "",
    isSandbox: false,
    enableGroupC2c: true,
    enableGuildDirectMessage: true,
    enablePublicGuildMessages: true
  });
  const [wecomDraft, setWecomDraft] = useState<WecomIntegrationDraft>({
    agentId: "default",
    name: "WeCom Customer Service",
    corpId: "",
    secret: "",
    token: "",
    encodingAesKey: "",
    apiBaseUrl: "https://qyapi.weixin.qq.com/cgi-bin/",
    customerServiceName: "",
    openKfId: "",
    webhookSecret: ""
  });

  async function load() {
    try {
      const [telegramResponse, qqResponse, wecomResponse] = await Promise.all([
        client.getTelegramIntegrations(),
        client.getQqOfficialIntegrations(),
        client.getWecomIntegrations()
      ]);
      setIntegrations(telegramResponse.integrations);
      setWebhookUrl(`${window.location.origin}${telegramResponse.webhookPath}`);
      setQqIntegrations(qqResponse.integrations);
      setWecomIntegrations(wecomResponse.integrations);
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

  async function createQqIntegration() {
    try {
      const created = await client.createQqOfficialIntegration({
        agentId: qqDraft.agentId || undefined,
        name: qqDraft.name,
        appId: qqDraft.appId,
        secret: qqDraft.secret || undefined,
        isSandbox: qqDraft.isSandbox,
        enableGroupC2c: qqDraft.enableGroupC2c,
        enableGuildDirectMessage: qqDraft.enableGuildDirectMessage,
        enablePublicGuildMessages: qqDraft.enablePublicGuildMessages
      });
      setResult(created);
      setQqDraft({ ...qqDraft, secret: "" });
      notify(t("platforms.qqOfficialSaved"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save QQ official", "error");
    }
  }

  async function createWecomIntegration() {
    try {
      const created = await client.createWecomIntegration({
        agentId: wecomDraft.agentId || undefined,
        name: wecomDraft.name,
        corpId: wecomDraft.corpId,
        secret: wecomDraft.secret || undefined,
        token: wecomDraft.token || undefined,
        encodingAesKey: wecomDraft.encodingAesKey || undefined,
        apiBaseUrl: wecomDraft.apiBaseUrl || undefined,
        customerServiceName: wecomDraft.customerServiceName || undefined,
        openKfId: wecomDraft.openKfId || undefined,
        webhookSecret: wecomDraft.webhookSecret || undefined
      });
      setResult(created);
      setWecomDraft({ ...wecomDraft, secret: "", encodingAesKey: "", webhookSecret: "" });
      notify(t("platforms.wecomSaved"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save WeCom", "error");
    }
  }

  async function testIntegration(id: string) {
    await runAction(() => client.testTelegramIntegration(id), t("platforms.botTested"));
  }

  async function syncCommands(id: string) {
    await runAction(() => client.syncTelegramCommands(id), t("platforms.commandsSynced"));
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

  async function testQqIntegration(id: string) {
    await runAction(() => client.testQqOfficialIntegration(id), t("platforms.qqOfficialTested"));
  }

  async function connectQqIntegration(id: string) {
    await runAction(() => client.connectQqOfficialIntegration(id), t("platforms.qqGatewayConnected"));
  }

  async function disconnectQqIntegration(id: string) {
    await runAction(
      () => client.disconnectQqOfficialIntegration(id),
      t("platforms.qqGatewayDisconnected")
    );
  }

  async function getQqStatus(id: string) {
    await runAction(() => client.getQqOfficialIntegrationStatus(id), t("platforms.qqGatewayStatusLoaded"));
  }

  async function deleteQqIntegration(id: string) {
    await runAction(() => client.deleteQqOfficialIntegration(id), t("platforms.qqOfficialDeleted"));
  }

  async function testWecomIntegration(id: string) {
    await runAction(() => client.testWecomIntegration(id), t("platforms.wecomTested"));
  }

  async function createWecomContactWay(id: string) {
    await runAction(
      () => client.createWecomContactWay(id),
      t("platforms.wecomContactWayCreated")
    );
  }

  async function deleteWecomIntegration(id: string) {
    await runAction(() => client.deleteWecomIntegration(id), t("platforms.wecomDeleted"));
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
          <p>Telegram / QQ Official / WeCom</p>
        </div>
        <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void load()} />
      </header>

      <h2 className="section-heading">QQ Official</h2>
      <QqOfficialIntegrationForm
        draft={qqDraft}
        onDraftChange={setQqDraft}
        onSubmit={() => void createQqIntegration()}
      />

      <QqOfficialIntegrationList
        integrations={qqIntegrations}
        onTest={(id) => void testQqIntegration(id)}
        onConnect={(id) => void connectQqIntegration(id)}
        onDisconnect={(id) => void disconnectQqIntegration(id)}
        onStatus={(id) => void getQqStatus(id)}
        onDelete={(id) => void deleteQqIntegration(id)}
      />

      <h2 className="section-heading">WeCom Customer Service</h2>
      <WecomIntegrationForm
        draft={wecomDraft}
        onDraftChange={setWecomDraft}
        onSubmit={() => void createWecomIntegration()}
      />

      <WecomIntegrationList
        integrations={wecomIntegrations}
        origin={window.location.origin}
        onTest={(id) => void testWecomIntegration(id)}
        onCreateContactWay={(id) => void createWecomContactWay(id)}
        onDelete={(id) => void deleteWecomIntegration(id)}
      />

      <h2 className="section-heading">Telegram</h2>
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
        onSyncCommands={(id) => void syncCommands(id)}
        onSetWebhook={(id) => void setWebhook(id)}
        onDeleteWebhook={(id) => void deleteWebhook(id)}
        onDelete={(id) => void deleteIntegration(id)}
      />

      {result !== undefined && <JsonBlock value={result} />}
    </section>
  );
}
