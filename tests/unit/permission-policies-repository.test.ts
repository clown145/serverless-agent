import { describe, expect, it } from "vitest";
import {
  createPermissionPolicy,
  deletePermissionPolicy,
  findMatchingPermissionPolicies,
  listPermissionPolicies,
  updatePermissionPolicy
} from "../../src/storage/repositories/permission-policies-repository";
import type { PermissionLevel } from "../../src/tools/types";

type PermissionPolicyTestRow = {
  id: string;
  agent_id: string;
  subject_type: "agent" | "user" | "role" | "platform" | "conversation";
  subject_id: string;
  max_level: PermissionLevel;
  scopes_json: string;
  status: string;
  created_at: string;
  updated_at: string;
};

describe("permission policies repository", () => {
  it("updates an existing active subject when creating the same policy again", async () => {
    const db = createPermissionPolicyDb([
      permissionPolicyRow({
        id: "pol_existing",
        subject_type: "conversation",
        subject_id: "chat-1",
        max_level: 1,
        scopes_json: JSON.stringify(["workspace:read"])
      })
    ]);

    const policy = await createPermissionPolicy(db, {
      agentId: "agent-1",
      subjectType: "conversation",
      subjectId: "chat-1",
      maxLevel: 4,
      scopes: ["message:send"]
    });

    expect(policy.id).toBe("pol_existing");
    expect(policy.maxLevel).toBe(4);
    expect(policy.scopes).toEqual(["message:send"]);
    expect(db.rows).toHaveLength(1);
  });

  it("lists only active policies and keeps the newest row for duplicate subjects", async () => {
    const db = createPermissionPolicyDb([
      permissionPolicyRow({
        id: "pol_old",
        subject_id: "chat-1",
        max_level: 5,
        updated_at: "2026-01-01T00:00:00.000Z"
      }),
      permissionPolicyRow({
        id: "pol_new",
        subject_id: "chat-1",
        max_level: 2,
        updated_at: "2026-01-02T00:00:00.000Z"
      }),
      permissionPolicyRow({
        id: "pol_deleted",
        subject_id: "chat-2",
        status: "deleted"
      })
    ]);

    await expect(listPermissionPolicies(db)).resolves.toMatchObject([
      {
        id: "pol_new",
        maxLevel: 2
      }
    ]);
  });

  it("merges an edited policy into an existing subject without leaving duplicates", async () => {
    const db = createPermissionPolicyDb([
      permissionPolicyRow({
        id: "pol_source",
        subject_type: "user",
        subject_id: "alice"
      }),
      permissionPolicyRow({
        id: "pol_target",
        subject_type: "user",
        subject_id: "bob",
        max_level: 2
      })
    ]);

    const policy = await updatePermissionPolicy(db, "pol_source", {
      subjectId: "bob",
      maxLevel: 4,
      scopes: ["message:send"]
    });

    expect(policy).toMatchObject({
      id: "pol_target",
      subjectId: "bob",
      maxLevel: 4,
      scopes: ["message:send"]
    });
    expect(db.rows.map((row) => row.id)).toEqual(["pol_target"]);
  });

  it("physically removes policies on delete", async () => {
    const db = createPermissionPolicyDb([permissionPolicyRow({ id: "pol_delete" })]);

    await expect(deletePermissionPolicy(db, "pol_delete")).resolves.toBe(true);

    expect(db.rows).toHaveLength(0);
  });

  it("resolves only the newest matching duplicate subject", async () => {
    const db = createPermissionPolicyDb([
      permissionPolicyRow({
        id: "pol_old",
        subject_type: "conversation",
        subject_id: "chat-1",
        max_level: 5,
        scopes_json: JSON.stringify(["http:request"]),
        updated_at: "2026-01-01T00:00:00.000Z"
      }),
      permissionPolicyRow({
        id: "pol_new",
        subject_type: "conversation",
        subject_id: "chat-1",
        max_level: 1,
        scopes_json: JSON.stringify(["workspace:read"]),
        updated_at: "2026-01-02T00:00:00.000Z"
      })
    ]);

    await expect(
      findMatchingPermissionPolicies(db, {
        agentId: "agent-1",
        subjects: [{ type: "conversation", id: "chat-1" }]
      })
    ).resolves.toMatchObject([
      {
        id: "pol_new",
        maxLevel: 1,
        scopes: ["workspace:read"]
      }
    ]);
  });
});

function permissionPolicyRow(
  overrides: Partial<PermissionPolicyTestRow> = {}
): PermissionPolicyTestRow {
  return {
    id: "pol_1",
    agent_id: "agent-1",
    subject_type: "conversation",
    subject_id: "chat-1",
    max_level: 1,
    scopes_json: JSON.stringify(["workspace:read"]),
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function createPermissionPolicyDb(
  rows: PermissionPolicyTestRow[]
): D1Database & { rows: PermissionPolicyTestRow[] } {
  const db = {
    rows,
    prepare(sql: string) {
      return createStatement(db, sql);
    }
  };

  return db as unknown as D1Database & { rows: PermissionPolicyTestRow[] };
}

function createStatement(
  db: { rows: PermissionPolicyTestRow[] },
  sql: string,
  params: unknown[] = []
) {
  return {
    bind(...nextParams: unknown[]) {
      return createStatement(db, sql, nextParams);
    },
    async first<T>() {
      return selectRows(db.rows, sql, params)[0] as T | null;
    },
    async all<T>() {
      return { results: selectRows(db.rows, sql, params) as T[] };
    },
    async run() {
      return runStatement(db.rows, sql, params);
    }
  };
}

function selectRows(
  rows: PermissionPolicyTestRow[],
  sql: string,
  params: unknown[]
): PermissionPolicyTestRow[] {
  if (sql.includes("WHERE id = ?")) {
    return rows.filter((row) => {
      return (
        row.id === params[0] && (!sql.includes("status = 'active'") || row.status === "active")
      );
    });
  }

  if (sql.includes("subject_type = ?") && sql.includes("subject_id = ?")) {
    const matches = rows
      .filter((row) => {
        return (
          row.agent_id === params[0] &&
          row.subject_type === params[1] &&
          row.subject_id === params[2] &&
          row.status === "active"
        );
      })
      .sort(compareRowsByRecency);

    return sql.includes("LIMIT 1") ? matches.slice(0, 1) : matches;
  }

  if (sql.includes("agent_id = ?") && sql.includes("status = 'active'")) {
    return rows
      .filter((row) => row.agent_id === params[0] && row.status === "active")
      .sort(compareRowsByCreatedAt);
  }

  if (sql.includes("WHERE status = 'active'")) {
    return rows.filter((row) => row.status === "active").sort(compareRowsByCreatedAt);
  }

  throw new Error(`Unexpected SELECT SQL: ${sql}`);
}

function runStatement(rows: PermissionPolicyTestRow[], sql: string, params: unknown[]): D1Result {
  if (sql.includes("INSERT INTO permission_policies")) {
    rows.push({
      id: params[0] as string,
      agent_id: params[1] as string,
      subject_type: params[2] as PermissionPolicyTestRow["subject_type"],
      subject_id: params[3] as string,
      max_level: params[4] as PermissionLevel,
      scopes_json: params[5] as string,
      status: "active",
      created_at: params[6] as string,
      updated_at: params[7] as string
    });
    return d1Result(1);
  }

  if (sql.includes("UPDATE permission_policies")) {
    const policyId = params[6] as string;
    const row = rows.find((candidate) => candidate.id === policyId);
    if (!row) {
      return d1Result(0);
    }

    row.agent_id = params[0] as string;
    row.subject_type = params[1] as PermissionPolicyTestRow["subject_type"];
    row.subject_id = params[2] as string;
    row.max_level = params[3] as PermissionLevel;
    row.scopes_json = params[4] as string;
    row.status = "active";
    row.updated_at = params[5] as string;
    return d1Result(1);
  }

  if (sql.includes("DELETE FROM permission_policies")) {
    const policyId = params[0] as string;
    const before = rows.length;
    rows.splice(0, rows.length, ...rows.filter((row) => row.id !== policyId));
    return d1Result(before - rows.length);
  }

  throw new Error(`Unexpected RUN SQL: ${sql}`);
}

function d1Result(changes: number): D1Result {
  return {
    success: true,
    results: [],
    meta: {
      duration: 0,
      size_after: 0,
      rows_read: 0,
      rows_written: changes,
      last_row_id: 0,
      changed_db: changes > 0,
      changes
    }
  };
}

function compareRowsByRecency(left: PermissionPolicyTestRow, right: PermissionPolicyTestRow) {
  const updated = right.updated_at.localeCompare(left.updated_at);
  if (updated !== 0) {
    return updated;
  }

  const created = right.created_at.localeCompare(left.created_at);
  if (created !== 0) {
    return created;
  }

  return right.id.localeCompare(left.id);
}

function compareRowsByCreatedAt(left: PermissionPolicyTestRow, right: PermissionPolicyTestRow) {
  return right.created_at.localeCompare(left.created_at);
}
