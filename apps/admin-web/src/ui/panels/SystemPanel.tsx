import { JsonBlock } from "../JsonBlock";

type SystemPanelProps = {
  token: string;
  onTokenChange: (token: string) => void;
};

export function SystemPanel({ token, onTokenChange }: SystemPanelProps) {
  return (
    <section className="panel system-panel">
      <header className="panel-header">
        <h1>System</h1>
      </header>
      <div className="form-grid single">
        <label>
          Admin token
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
            "/admin/mcp/servers",
            "/admin/runs",
            "/admin/tools",
            "/admin/vfs",
            "/admin/schedules"
          ]
        }}
      />
    </section>
  );
}
