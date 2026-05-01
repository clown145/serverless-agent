import {
  CalendarClock,
  Database,
  FileText,
  KeyRound,
  MessageSquare,
  SlidersHorizontal,
  ShieldCheck,
  Workflow
} from "lucide-react";
import type { ViewId } from "./views";

const items: Array<{
  id: ViewId;
  label: string;
  icon: typeof MessageSquare;
}> = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "models", label: "Models", icon: SlidersHorizontal },
  { id: "runs", label: "Runs", icon: Workflow },
  { id: "vfs", label: "VFS", icon: FileText },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
  { id: "pending", label: "Pending", icon: ShieldCheck },
  { id: "permissions", label: "Policies", icon: KeyRound },
  { id: "system", label: "System", icon: Database }
];

type SidebarProps = {
  active: ViewId;
  onChange: (view: ViewId) => void;
};

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">SA</div>
        <div>
          <div className="brand-name">serverless-agent</div>
          <div className="brand-subtitle">Admin Console</div>
        </div>
      </div>
      <nav className="nav-list" aria-label="Main">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? "active" : ""}`}
              type="button"
              onClick={() => onChange(item.id)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
