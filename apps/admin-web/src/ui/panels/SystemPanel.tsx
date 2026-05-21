import { JsonBlock } from "../JsonBlock";
import { useI18n } from "../i18n/I18nProvider";

type SystemPanelProps = {
  token: string;
  onTokenChange: (token: string) => void;
};

export function SystemPanel({ token, onTokenChange }: SystemPanelProps) {
  const { t } = useI18n();

  return (
    <section className="panel system-panel">
      <header className="panel-header">
        <h1>{t("system.title")}</h1>
      </header>
      <div className="form-grid single">
        <label>
          {t("system.adminToken")}
          <input
            type="password"
            value={token}
            onChange={(event) => onTokenChange(event.target.value)}
          />
        </label>
      </div>
      <JsonBlock
        value={{
          uiPlatform: "webui",
          apiBase: "/admin",
          routes: [
            "/admin/messages",
            "/admin/platforms/telegram",
            "/admin/platforms/telegram/:integrationId/test",
            "/admin/platforms/telegram/:integrationId/webhook",
            "/admin/platforms/qq-official",
            "/admin/platforms/qq-official-integrations/:integrationId/connect",
            "/admin/platforms/wecom",
            "/admin/platforms/wecom-integrations/:integrationId/contact-way",
            "/admin/platforms/weixin-oc",
            "/admin/platforms/weixin-oc-integrations/:integrationId/login",
            "/admin/platforms/weixin-oc-integrations/:integrationId/status",
            "/admin/mcp/servers",
            "/admin/mcp/tools/:toolId",
            "/admin/runs",
            "/admin/search-providers",
            "/admin/tools",
            "/admin/tools/call",
            "/admin/tools/calls",
            "/admin/vfs",
            "/admin/schedules"
          ]
        }}
      />
    </section>
  );
}
