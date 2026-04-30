import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { PermissionPolicy } from "../../api/types";
import { EmptyState } from "../EmptyState";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import type { PanelProps } from "./types";

const subjectTypes: PermissionPolicy["subjectType"][] = [
  "agent",
  "user",
  "role",
  "platform",
  "conversation"
];

export function PermissionsPanel({ client, notify }: PanelProps) {
  const [policies, setPolicies] = useState<PermissionPolicy[]>([]);
  const [subjectType, setSubjectType] = useState<PermissionPolicy["subjectType"]>("platform");
  const [subjectId, setSubjectId] = useState("webui");
  const [maxLevel, setMaxLevel] = useState(4);
  const [scopes, setScopes] = useState("workspace:read,workspace:write,message:send");

  async function load() {
    try {
      const result = await client.listPolicies();
      setPolicies(result.policies);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load policies", "error");
    }
  }

  async function create() {
    try {
      await client.createPolicy({
        subjectType,
        subjectId,
        maxLevel,
        scopes: scopes.split(",").map((scope) => scope.trim()).filter(Boolean)
      });
      notify("Policy created", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to create policy", "error");
    }
  }

  async function remove(id: string) {
    try {
      await client.deletePolicy(id);
      notify("Policy deleted", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to delete policy", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <h1>Permission Policies</h1>
        <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void load()} />
      </header>
      <div className="form-grid policy-form">
        <label>
          Subject
          <select value={subjectType} onChange={(event) => setSubjectType(event.target.value as PermissionPolicy["subjectType"])}>
            {subjectTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          ID
          <input value={subjectId} onChange={(event) => setSubjectId(event.target.value)} />
        </label>
        <label>
          Level
          <input
            type="number"
            min="0"
            max="5"
            value={maxLevel}
            onChange={(event) => setMaxLevel(Number(event.target.value))}
          />
        </label>
        <label>
          Scopes
          <input value={scopes} onChange={(event) => setScopes(event.target.value)} />
        </label>
        <button className="primary-button" type="button" onClick={() => void create()}>
          <Plus size={16} />
          Add
        </button>
      </div>
      <div className="table-list">
        {policies.map((policy) => (
          <div className="table-row" key={policy.id}>
            <div>
              <strong>{policy.subjectType}:{policy.subjectId}</strong>
              <span>{policy.scopes.join(", ") || "no scopes"}</span>
            </div>
            <StatusBadge value={policy.status} />
            <span className="level-pill">L{policy.maxLevel}</span>
            <ToolbarButton
              label="Delete"
              icon={Trash2}
              variant="danger"
              onClick={() => void remove(policy.id)}
            />
          </div>
        ))}
        {policies.length === 0 && <EmptyState label="No policies" />}
      </div>
    </section>
  );
}
