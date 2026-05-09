import {
  CheckCircle2,
  FileText,
  MessageSquare,
  Plug,
  RefreshCw,
  Send,
  Search,
  SlidersHorizontal,
  Wrench
} from "lucide-react";
import { useEffect, useState } from "react";
import type { SetupStatus } from "../../api/types";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import type { ViewId } from "../views";
import type { PanelProps } from "./types";

type SetupPanelProps = PanelProps & {
  onNavigate: (view: ViewId) => void;
};

export function SetupPanel({ client, notify, onNavigate }: SetupPanelProps) {
  const [status, setStatus] = useState<SetupStatus>();

  async function load() {
    try {
      const result = await client.getSetupStatus();
      setStatus(result.status);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load setup", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Setup</h1>
          <p>{status?.ready ? "ready" : "configuration needed"}</p>
        </div>
        <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void load()} />
      </header>

      <div className="setup-actions">
        <button className="primary-button" type="button" onClick={() => onNavigate("models")}>
          <SlidersHorizontal size={16} />
          Models
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("diagnostics")}>
          <Wrench size={16} />
          Diagnostics
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("tools")}>
          <Plug size={16} />
          Tools
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("vfs")}>
          <FileText size={16} />
          VFS
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("platforms")}>
          <Send size={16} />
          Platforms
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("search")}>
          <Search size={16} />
          Search
        </button>
        <button className="secondary-button" type="button" onClick={() => onNavigate("chat")}>
          <MessageSquare size={16} />
          Chat
        </button>
      </div>

      <div className="setup-list">
        {(status?.steps ?? []).map((step) => (
          <div className="setup-row" key={step.id}>
            <CheckCircle2 size={18} />
            <div>
              <strong>{step.label}</strong>
              <span>{step.detail}</span>
            </div>
            <StatusBadge value={step.status} />
          </div>
        ))}
      </div>
    </section>
  );
}
