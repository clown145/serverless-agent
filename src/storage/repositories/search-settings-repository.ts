import { nowIso } from "../../shared/time";
import {
  mapSearchSettingsRow,
  type SearchSettingsRecord,
  type SearchSettingsRow
} from "./search-types";

export async function getSearchSettings(
  db: D1Database,
  agentId: string
): Promise<SearchSettingsRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM search_settings WHERE agent_id = ?")
    .bind(agentId)
    .first<SearchSettingsRow>();

  return row ? mapSearchSettingsRow(row) : undefined;
}

export async function setSearchSettings(
  db: D1Database,
  input: {
    agentId: string;
    providerId: string;
  }
): Promise<SearchSettingsRecord> {
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO search_settings (agent_id, provider_id, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(agent_id) DO UPDATE SET
        provider_id = excluded.provider_id,
        updated_at = excluded.updated_at`
    )
    .bind(input.agentId, input.providerId, now)
    .run();

  return {
    agentId: input.agentId,
    providerId: input.providerId,
    updatedAt: now
  };
}
