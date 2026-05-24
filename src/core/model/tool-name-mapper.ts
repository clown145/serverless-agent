import type { ModelTool, ModelToolCall } from "./types";

export type ToolNameMapper = {
  toWireName(name: string): string;
  toInternalName(name: string): string;
  mapTools(tools: ModelTool[]): ModelTool[];
  mapToolCalls(toolCalls: ModelToolCall[]): ModelToolCall[];
};

export function createToolNameMapper(toolNames: string[]): ToolNameMapper {
  const internalToWire = new Map<string, string>();
  const wireToInternal = new Map<string, string>();

  for (const name of toolNames) {
    const wireName = makeUniqueWireName(name, wireToInternal);
    internalToWire.set(name, wireName);
    wireToInternal.set(wireName, name);
  }

  return {
    toWireName: (name) => internalToWire.get(name) ?? sanitizeToolName(name),
    toInternalName: (name) => wireToInternal.get(name) ?? name,
    mapTools: (tools) =>
      tools.map((tool) => ({
        ...tool,
        name: internalToWire.get(tool.name) ?? sanitizeToolName(tool.name),
        description: `${tool.description} Internal tool name: ${tool.name}.`
      })),
    mapToolCalls: (toolCalls) =>
      toolCalls.map((toolCall) => ({
        ...toolCall,
        name: wireToInternal.get(toolCall.name) ?? toolCall.name
      }))
  };
}

export function sanitizeToolName(name: string): string {
  const normalized = name.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[a-zA-Z_]/.test(normalized) ? normalized : `tool_${normalized}`;
}

function makeUniqueWireName(internalName: string, existing: Map<string, string>): string {
  const base = sanitizeToolName(internalName);
  let candidate = base;
  let suffix = 2;

  while (existing.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }

  return candidate;
}
