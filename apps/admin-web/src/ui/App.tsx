import { useCallback, useMemo, useState } from "react";
import {
  clearAdminToken,
  hasStoredAdminToken,
  loadAdminToken,
  saveAdminToken
} from "../auth-token";
import { createAdminClient } from "../api/client";
import { ChatPanel } from "./panels/ChatPanel";
import { ConversationsPanel } from "./panels/ConversationsPanel";
import { DebugPanel } from "./panels/DebugPanel";
import { DiagnosticsPanel } from "./panels/DiagnosticsPanel";
import { EmailPanel } from "./panels/EmailPanel";
import { ModelConfigPanel } from "./panels/ModelConfigPanel";
import { ModelsPanel } from "./panels/ModelsPanel";
import { PlatformsPanel } from "./panels/PlatformsPanel";
import { PendingPanel } from "./panels/PendingPanel";
import { PermissionsPanel } from "./panels/PermissionsPanel";
import { RunsPanel } from "./panels/RunsPanel";
import { SchedulesPanel } from "./panels/SchedulesPanel";
import { SearchPanel } from "./panels/SearchPanel";
import { SetupPanel } from "./panels/SetupPanel";
import { SkillsPanel } from "./panels/SkillsPanel";
import { SystemPanel } from "./panels/SystemPanel";
import { ToolsPanel } from "./panels/ToolsPanel";
import { VfsPanel } from "./panels/VfsPanel";
import { LanguageMenu } from "./i18n/LanguageMenu";
import { useI18n } from "./i18n/I18nProvider";
import { NAV_ITEMS } from "./navigation";
import { MobileNavigation, Sidebar } from "./Sidebar";
import type { ViewId } from "./views";
import { LoginGate } from "./auth/LoginGate";

const viewKey = "serverless-agent:active-view";

export function App() {
  const { t } = useI18n();
  const [active, setActive] = useState<ViewId>(() => initialView());
  const [selectedRunId, setSelectedRunId] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("webui:default");
  const [token, setToken] = useState(loadAdminToken);
  const [authenticated, setAuthenticated] = useState(false);
  const [notice, setNotice] = useState<{ message: string; tone: "ok" | "error" }>();
  const client = useMemo(() => createAdminClient(() => token), [token]);

  const updateToken = useCallback((value: string) => {
    setToken(value);
    saveAdminToken(value);
  }, []);

  const authenticate = useCallback(
    (value: string) => {
      updateToken(value);
      setAuthenticated(true);
    },
    [updateToken]
  );

  const signOut = useCallback(() => {
    clearAdminToken();
    setToken("");
    setAuthenticated(false);
    setActive("setup");
  }, []);

  function notify(message: string, tone: "ok" | "error" = "ok") {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(undefined), 3200);
  }

  function setActiveView(view: ViewId) {
    setActive(view);
    localStorage.setItem(viewKey, view);
  }

  function openRun(runId: string) {
    setSelectedRunId(runId);
    setActiveView("runs");
  }

  function openConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setActiveView("chat");
  }

  const activeItem = NAV_ITEMS.find((item) => item.id === active);
  const activeLabel = activeItem ? t(activeItem.labelKey) : t("app.currentView");

  if (!authenticated) {
    return <LoginGate initialToken={token} onAuthenticated={authenticate} />;
  }

  return (
    <div className="app-shell">
      <Sidebar active={active} onChange={setActiveView} />
      <div className="workspace-shell">
        <header className="topbar">
          <div className="topbar-left">
            <MobileNavigation active={active} onChange={setActiveView} />
            <div>
              <span className="topbar-kicker">serverless-agent</span>
              <h1>{activeLabel}</h1>
            </div>
          </div>
          <LanguageMenu />
        </header>

        <main className="main-surface">
          {notice && <div className={`notice ${notice.tone}`}>{notice.message}</div>}
          {active === "setup" && (
            <SetupPanel client={client} notify={notify} onNavigate={setActiveView} />
          )}
          {active === "chat" && (
            <ChatPanel
              client={client}
              notify={notify}
              onConversationChange={setSelectedConversationId}
              onRun={openRun}
              selectedConversationId={selectedConversationId}
            />
          )}
          {active === "conversations" && (
            <ConversationsPanel
              client={client}
              notify={notify}
              onNavigate={setActiveView}
              onOpenConversation={openConversation}
            />
          )}
          {active === "model_config" && <ModelConfigPanel client={client} notify={notify} />}
          {active === "models" && (
            <ModelsPanel client={client} notify={notify} onNavigate={setActiveView} />
          )}
          {active === "platforms" && <PlatformsPanel client={client} notify={notify} />}
          {active === "email" && <EmailPanel client={client} notify={notify} />}
          {active === "diagnostics" && <DiagnosticsPanel client={client} notify={notify} />}
          {active === "debug" && <DebugPanel client={client} notify={notify} onRun={openRun} />}
          {active === "tools" && <ToolsPanel client={client} notify={notify} />}
          {active === "skills" && <SkillsPanel client={client} notify={notify} />}
          {active === "search" && <SearchPanel client={client} notify={notify} />}
          {active === "runs" && (
            <RunsPanel client={client} notify={notify} selectedRunId={selectedRunId} />
          )}
          {active === "vfs" && <VfsPanel client={client} notify={notify} />}
          {active === "schedules" && (
            <SchedulesPanel client={client} notify={notify} onNavigate={setActiveView} />
          )}
          {active === "pending" && <PendingPanel client={client} notify={notify} />}
          {active === "permissions" && <PermissionsPanel client={client} notify={notify} />}
          {active === "system" && (
            <SystemPanel token={token} onSignOut={signOut} onTokenChange={updateToken} />
          )}
        </main>
      </div>
    </div>
  );
}

function initialView(): ViewId {
  const savedView = localStorage.getItem(viewKey);
  if (isViewId(savedView)) {
    return savedView;
  }

  return hasStoredAdminToken() ? "setup" : "system";
}

function isViewId(value: string | null): value is ViewId {
  return Boolean(value && NAV_ITEMS.some((item) => item.id === value));
}
