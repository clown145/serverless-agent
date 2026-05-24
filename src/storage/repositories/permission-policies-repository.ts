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

export type UpdatePermissionPolicyInput = {
  agentId?: string;
  subjectType?: PolicySubjectType;
  subjectId?: string;
  maxLevel?: PermissionLevel;
  scopes?: string[];
};

export async function createPermissionPolicy(
  db: D1Database,
  input: CreatePermissionPolicyInput
): Promise<PermissionPolicyRecord> {
  const existing = await findActivePermissionPolicyBySubject(db, input);
  if (existing) {
    const updated = await updatePermissionPolicy(db, existing.id, input);
    if (!updated) {
      throw new Error("Permission policy disappeared during update");
    }
    return updated;
  }

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
        .prepare(
          `SELECT * FROM permission_policies
           WHERE agent_id = ? AND status = 'active'
           ORDER BY created_at DESC`
        )
        .bind(agentId)
    : db.prepare(
        `SELECT * FROM permission_policies
         WHERE status = 'active'
         ORDER BY created_at DESC`
      );
  const result = await query.all<PermissionPolicyRow>();

  return collapseDuplicateSubjectPolicies((result.results ?? []).map(mapPermissionPolicyRow));
}

export async function getPermissionPolicy(
  db: D1Database,
  policyId: string
): Promise<PermissionPolicyRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM permission_policies WHERE id = ? AND status = 'active'")
    .bind(policyId)
    .first<PermissionPolicyRow>();

  return row ? mapPermissionPolicyRow(row) : undefined;
}

export async function updatePermissionPolicy(
  db: D1Database,
  policyId: string,
  input: UpdatePermissionPolicyInput
): Promise<PermissionPolicyRecord | undefined> {
  const current = await getPermissionPolicy(db, policyId);
  if (!current) {
    return undefined;
  }

  const next = {
    agentId: input.agentId ?? current.agentId,
    subjectType: input.subjectType ?? current.subjectType,
    subjectId: input.subjectId ?? current.subjectId,
    maxLevel: input.maxLevel ?? current.maxLevel,
    scopes: input.scopes ?? current.scopes
  };
  const existing = await findActivePermissionPolicyBySubject(db, next);
  if (existing && existing.id !== policyId) {
    await updatePermissionPolicy(db, existing.id, next);
    await deletePermissionPolicy(db, policyId);
    return getPermissionPolicy(db, existing.id);
  }

  await db
    .prepare(
      `UPDATE permission_policies
       SET agent_id = ?, subject_type = ?, subject_id = ?, max_level = ?,
           scopes_json = ?, status = 'active', updated_at = ?
       WHERE id = ?`
    )
    .bind(
      next.agentId,
      next.subjectType,
      next.subjectId,
      next.maxLevel,
      JSON.stringify(next.scopes),
      nowIso(),
      policyId
    )
    .run();

  return getPermissionPolicy(db, policyId);
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

  return collapseDuplicateSubjectPolicies(matches);
}

export async function deletePermissionPolicy(db: D1Database, policyId: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM permission_policies WHERE id = ?")
    .bind(policyId)
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

async function findActivePermissionPolicyBySubject(
  db: D1Database,
  input: {
    agentId: string;
    subjectType: PolicySubjectType;
    subjectId: string;
  }
): Promise<PermissionPolicyRecord | undefined> {
  const row = await db
    .prepare(
      `SELECT * FROM permission_policies
       WHERE agent_id = ? AND subject_type = ? AND subject_id = ? AND status = 'active'
       ORDER BY updated_at DESC, created_at DESC, id DESC
       LIMIT 1`
    )
    .bind(input.agentId, input.subjectType, input.subjectId)
    .first<PermissionPolicyRow>();

  return row ? mapPermissionPolicyRow(row) : undefined;
}

function collapseDuplicateSubjectPolicies(
  policies: PermissionPolicyRecord[]
): PermissionPolicyRecord[] {
  const bySubject = new Map<string, PermissionPolicyRecord>();
  for (const policy of policies) {
    const key = `${policy.agentId}\u0000${policy.subjectType}\u0000${policy.subjectId}`;
    const current = bySubject.get(key);
    if (!current || comparePolicyRecency(policy, current) > 0) {
      bySubject.set(key, policy);
    }
  }

  return Array.from(bySubject.values());
}

function comparePolicyRecency(left: PermissionPolicyRecord, right: PermissionPolicyRecord): number {
  const updated = left.updatedAt.localeCompare(right.updatedAt);
  if (updated !== 0) {
    return updated;
  }

  const created = left.createdAt.localeCompare(right.createdAt);
  if (created !== 0) {
    return created;
  }

  return left.id.localeCompare(right.id);
}
