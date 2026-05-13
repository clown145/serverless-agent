import {
  inferModelCapabilities,
  uniqueCapabilities,
  type ModelCapability
} from "./capability-defaults";

export type ModelMetadata = {
  capabilities: ModelCapability[];
  contextWindow?: number;
  maxOutputTokens?: number;
  raw?: Record<string, unknown>;
};

export type ModelMetadataMatchConfidence =
  | "exact"
  | "alias"
  | "inferred"
  | "unknown";

export type ModelMetadataResolution = ModelMetadata & {
  source: "provider" | "openrouter" | "inferred";
  confidence: ModelMetadataMatchConfidence;
  matchedModelId?: string;
};

export function inferredModelMetadata(modelId: string): ModelMetadataResolution {
  return {
    capabilities: inferModelCapabilities(modelId),
    source: "inferred",
    confidence: "inferred"
  };
}

export function mergeModelMetadata(
  modelId: string,
  metadata?: ModelMetadataResolution
): ModelMetadataResolution {
  const fallback = inferredModelMetadata(modelId);
  if (!metadata) {
    return fallback;
  }

  return {
    ...metadata,
    capabilities: uniqueCapabilities(metadata.capabilities),
    contextWindow: metadata.contextWindow ?? fallback.contextWindow,
    maxOutputTokens: metadata.maxOutputTokens ?? fallback.maxOutputTokens
  };
}

export function modelCapabilitiesFromMetadata(input: {
  modelId: string;
  inputModalities?: string[];
  outputModalities?: string[];
  supportedParameters?: string[];
  contextWindow?: number;
}): ModelCapability[] {
  const capabilities: ModelCapability[] = [];
  const supported = new Set(
    (input.supportedParameters ?? []).map((parameter) => parameter.toLowerCase())
  );
  const inputModalities = new Set(
    (input.inputModalities ?? []).map((modality) => modality.toLowerCase())
  );

  if (inputModalities.has("image")) {
    capabilities.push("vision");
  }

  if (supported.has("tools") || supported.has("tool_choice")) {
    capabilities.push("tools");
  }

  if (supported.has("structured_outputs") || supported.has("response_format")) {
    capabilities.push("structured_output");
  }

  if (typeof input.contextWindow === "number" && input.contextWindow >= 100_000) {
    capabilities.push("long_context");
  }

  return uniqueCapabilities(capabilities);
}
