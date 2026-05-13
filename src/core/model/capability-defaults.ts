export type ModelCapability =
  | "tools"
  | "vision"
  | "long_context"
  | "structured_output";

export const MODEL_CAPABILITIES: ModelCapability[] = [
  "tools",
  "vision",
  "long_context",
  "structured_output"
];

export function normalizeModelCapabilities(
  value: unknown,
  modelId: string
): ModelCapability[] {
  if (Array.isArray(value)) {
    return uniqueCapabilities(value.filter(isModelCapability));
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return uniqueCapabilities(parsed.filter(isModelCapability));
      }
    } catch {
      return inferModelCapabilities(modelId);
    }
  }

  return inferModelCapabilities(modelId);
}

export function inferModelCapabilities(modelId: string): ModelCapability[] {
  const normalized = modelId.toLowerCase();
  const capabilities: ModelCapability[] = ["tools"];

  if (
    normalized.includes("vision") ||
    normalized.includes("gemini") ||
    normalized.includes("gpt-4o") ||
    normalized.includes("gpt-4.1") ||
    normalized.includes("o3") ||
    normalized.includes("o4")
  ) {
    capabilities.push("vision");
  }

  if (
    normalized.includes("gemini") ||
    normalized.includes("gpt-4.1") ||
    normalized.includes("gpt-4o") ||
    normalized.includes("o3") ||
    normalized.includes("o4") ||
    normalized.includes("long")
  ) {
    capabilities.push("long_context");
  }

  return uniqueCapabilities(capabilities);
}

export function isModelCapability(value: unknown): value is ModelCapability {
  return (
    value === "tools" ||
    value === "vision" ||
    value === "long_context" ||
    value === "structured_output"
  );
}

export function uniqueCapabilities(values: ModelCapability[]): ModelCapability[] {
  return MODEL_CAPABILITIES.filter((capability) => values.includes(capability));
}
