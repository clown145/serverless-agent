import type { AdminClient } from "../../api/client";

export type PanelProps = {
  client: AdminClient;
  notify: (message: string, tone?: "ok" | "error") => void;
};
