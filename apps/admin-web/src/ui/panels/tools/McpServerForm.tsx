export type McpServerDraft = {
  name: string;
  url: string;
  authType: "none" | "bearer" | "api-key-header";
  authHeader: string;
  credential: string;
};

type McpServerFormProps = {
  draft: McpServerDraft;
  onDraftChange: (draft: McpServerDraft) => void;
  onSubmit: () => void;
};

export function McpServerForm({
  draft,
  onDraftChange,
  onSubmit
}: McpServerFormProps) {
  return (
    <div className="mcp-form">
      <label>
        MCP server
        <input
          value={draft.name}
          onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
          placeholder="Filesystem"
        />
      </label>
      <label>
        URL
        <input
          value={draft.url}
          onChange={(event) => onDraftChange({ ...draft, url: event.target.value })}
          placeholder="https://example.com/mcp"
        />
      </label>
      <label>
        Auth
        <select
          value={draft.authType}
          onChange={(event) => {
            onDraftChange({
              ...draft,
              authType: event.target.value as McpServerDraft["authType"]
            });
          }}
        >
          <option value="none">None</option>
          <option value="bearer">Bearer</option>
          <option value="api-key-header">API key header</option>
        </select>
      </label>
      <label>
        Header
        <input
          value={draft.authHeader}
          disabled={draft.authType !== "api-key-header"}
          onChange={(event) => onDraftChange({ ...draft, authHeader: event.target.value })}
          placeholder="X-API-Key"
        />
      </label>
      <label>
        Secret
        <input
          type="password"
          value={draft.credential}
          disabled={draft.authType === "none"}
          onChange={(event) => onDraftChange({ ...draft, credential: event.target.value })}
        />
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        Save
      </button>
    </div>
  );
}
