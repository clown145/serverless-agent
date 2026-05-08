import { useMemo, useState } from "react";
import { createAdminClient } from "../api/client";
import { ChatPanel } from "./panels/ChatPanel";
import { DiagnosticsPanel } from "./panels/DiagnosticsPanel";
import { ModelsPanel } from "./panels/ModelsPanel";
import { PlatformsPanel } from "./panels/PlatformsPanel";
import { PendingPanel } from "./panels/PendingPanel";
import { PermissionsPanel } from "./panels/PermissionsPanel";
import { RunsPanel } from "./panels/RunsPanel";
import { SchedulesPanel } from "./panels/SchedulesPanel";
import { SearchPanel } from "./panels/SearchPanel";
import { SetupPanel } from "./panels/SetupPanel";
import { SystemPanel } from "./panels/SystemPanel";
import { ToolsPanel } from "./panels/ToolsPanel";
import { VfsPanel } from "./panels/VfsPanel";
import { Sidebar } from "./Sidebar";
import type { ViewId } from "./views";

const tokenKey = "serverless-agent:admin-token";

export function App() {
  const [active, setActive] = useState<ViewId>(() =>
    localStorage.getItem(tokenKey) ? "setup" : "system"
  );
  const [selectedRunId, setSelectedRunId] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? "");
  const [notice, setNotice] = useState<{ message: string; tone: "ok" | "error" }>();
  const client = useMemo(() => createAdminClient(() => token), [token]);

  function updateToken(value: string) {
    setToken(value);
    localStorage.setItem(tokenKey, value);
  }

  function notify(message: string, tone: "ok" | "error" = "ok") {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(undefined), 3200);
  }

  function openRun(runId: string) {
    setSelectedRunId(runId);
    setActive("runs");
  }

  return (
    <div className="app-shell">
      <Sidebar active={active} onChange={setActive} />
      <main className="main-surface">
        {notice && <div className={`notice ${notice.tone}`}>{notice.message}</div>}
        {active === "setup" && (
          <SetupPanel client={client} notify={notify} onNavigate={setActive} />
        )}
        {active === "chat" && <ChatPanel client={client} notify={notify} onRun={openRun} />}
        {active === "models" && <ModelsPanel client={client} notify={notify} />}
        {active === "platforms" && <PlatformsPanel client={client} notify={notify} />}
        {active === "diagnostics" && <DiagnosticsPanel client={client} notify={notify} />}
        {active === "tools" && <ToolsPanel client={client} notify={notify} />}
        {active === "search" && <SearchPanel client={client} notify={notify} />}
        {active === "runs" && (
          <RunsPanel client={client} notify={notify} selectedRunId={selectedRunId} />
        )}
        {active === "vfs" && <VfsPanel client={client} notify={notify} />}
        {active === "schedules" && <SchedulesPanel client={client} notify={notify} />}
        {active === "pending" && <PendingPanel client={client} notify={notify} />}
        {active === "permissions" && <PermissionsPanel client={client} notify={notify} />}
        {active === "system" && <SystemPanel token={token} onTokenChange={updateToken} />}
      </main>
    </div>
  );
}
