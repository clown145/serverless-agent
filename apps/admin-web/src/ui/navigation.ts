import {
  Activity,
  Brain,
  CalendarClock,
  ClipboardCheck,
  Database,
  Bug,
  BookOpenText,
  FileText,
  KeyRound,
  Mail,
  MessageSquare,
  MessagesSquare,
  Plug,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Workflow
} from "lucide-react";
import type { ViewId } from "./views";

export const NAV_ITEMS: Array<{
  id: ViewId;
  labelKey: string;
  icon: typeof MessageSquare;
}> = [
  { id: "setup", labelKey: "nav.setup", icon: ClipboardCheck },
  { id: "chat", labelKey: "nav.chat", icon: MessageSquare },
  { id: "conversations", labelKey: "nav.conversations", icon: MessagesSquare },
  { id: "model_config", labelKey: "nav.modelConfig", icon: Brain },
  { id: "models", labelKey: "nav.models", icon: SlidersHorizontal },
  { id: "platforms", labelKey: "nav.platforms", icon: Send },
  { id: "email", labelKey: "nav.email", icon: Mail },
  { id: "diagnostics", labelKey: "nav.diagnostics", icon: Activity },
  { id: "debug", labelKey: "nav.debug", icon: Bug },
  { id: "tools", labelKey: "nav.tools", icon: Plug },
  { id: "skills", labelKey: "nav.skills", icon: BookOpenText },
  { id: "search", labelKey: "nav.search", icon: Search },
  { id: "runs", labelKey: "nav.runs", icon: Workflow },
  { id: "vfs", labelKey: "nav.vfs", icon: FileText },
  { id: "schedules", labelKey: "nav.schedules", icon: CalendarClock },
  { id: "pending", labelKey: "nav.pending", icon: ShieldCheck },
  { id: "permissions", labelKey: "nav.permissions", icon: KeyRound },
  { id: "system", labelKey: "nav.system", icon: Database }
];
