import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { PermissionLevel } from "../../tools/types";
import type { PolicySubjectType } from "../../permissions/policy-types";

export type PermissionPolicyRecord = {
  id: string;
  agentId: string;
  subjectType: PolicySubjectType;
  subjectId: string;
  maxLevel: PermissionLevel;
  scopes: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

type PermissionPolicyRow = {
  id: string;
  agent_id: string;
  subject_type: PolicySubjectType;
  subject_id: string;
  max_level: PermissionLevel;
  scopes_json: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CreatePermissionPolicyInput = {
  agentId: string;
  subjectType: PolicySubjectType;
  subjectId: string;
  maxLevel: PermissionLevel;
  scopes: string[];
};

export async function createPermissionPolicy(
  db: D1Database,
  input: CreatePermissionPolicyInput
): Promise<PermissionPolicyRecord> {
  const id = createId("pol");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO permission_policies (
        id, agent_id, subject_type, subject_id, max_level,
        scopes_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(
      id,
      input.agentId,
      input.subjectType,
      input.subjectId,
      input.maxLevel,
      JSON.stringify(input.scopes),
      now,
      now
    )
    .run();

  return {
    id,
    agentId: input.agentId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    maxLevel: input.maxLevel,
    scopes: input.scopes,
    status: "active",
    createdAt: now,
    updatedAt: now
  };
}

export async function listPermissionPolicies(
  db: D1Database,
  agentId?: string
): Promise<PermissionPolicyRecord[]> {
  const query = agentId
    ? db
        .prepare("SELECT * FROM permission_policies WHERE agent_id = ? ORDER BY created_at DESC")
        .bind(agentId)
    : db.prepare("SELECT * FROM permission_policies ORDER BY created_at DESC");
  const result = await query.all<PermissionPolicyRow>();

  return (result.results ?? []).map(mapPermissionPolicyRow);
}

export async function findMatchingPermissionPolicies(
  db: D1Database,
  input: {
    agentId: string;
    subjects: Array<{ type: PolicySubjectType; id: string }>;
  }
): Promise<PermissionPolicyRecord[]> {
  const matches: PermissionPolicyRecord[] = [];

  for (const subject of input.subjects) {
    const result = await db
      .prepare(
        `SELECT * FROM permission_policies
         WHERE agent_id = ? AND subject_type = ? AND subject_id = ? AND status = 'active'`
      )
      .bind(input.agentId, subject.type, subject.id)
      .all<PermissionPolicyRow>();

    matches.push(...(result.results ?? []).map(mapPermissionPolicyRow));
  }

  return matches;
}

export async function deletePermissionPolicy(
  db: D1Database,
  policyId: string
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE permission_policies SET status = 'deleted', updated_at = ? WHERE id = ?")
    .bind(nowIso(), policyId)
    .run();

  return Boolean(result.meta.changes);
}

function mapPermissionPolicyRow(row: PermissionPolicyRow): PermissionPolicyRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    maxLevel: row.max_level,
    scopes: JSON.parse(row.scopes_json) as string[],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
