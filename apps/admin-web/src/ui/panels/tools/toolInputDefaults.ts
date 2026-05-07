import type { ToolCatalogItem } from "../../../api/types";

const TOOL_EXAMPLES: Record<string, Record<string, unknown>> = {
  "search.web": {
    query: "Cloudflare Workers serverless agent",
    maxResults: 3
  },
  "vfs.list_dir": {
    path: "/"
  },
  "vfs.read_file": {
    path: "/skills"
  },
  "vfs.write_file": {
    path: "/notes/example.md",
    content: "",
    mimeType: "text/markdown"
  },
  "messaging.send_message": {
    platform: "webui",
    conversationId: "tool-debug",
    text: "test"
  }
};

export function createToolInputDraft(tool?: ToolCatalogItem): Record<string, unknown> {
  if (!tool) {
    return {};
  }

  return TOOL_EXAMPLES[tool.name] ?? draftFromSchema(tool.inputSchema);
}

function draftFromSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const properties = asRecord(schema.properties);
  const required = Array.isArray(schema.required) ? schema.required : [];

  return required.reduce<Record<string, unknown>>((draft, key) => {
    if (typeof key === "string") {
      draft[key] = defaultValue(properties[key]);
    }
    return draft;
  }, {});
}

function defaultValue(schema: unknown): unknown {
  const item = asRecord(schema);
  if (Array.isArray(item.enum) && item.enum.length > 0) {
    return item.enum[0];
  }

  switch (item.type) {
    case "boolean":
      return false;
    case "integer":
    case "number":
      return item.minimum ?? 0;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
