import { z } from "zod";
import { SECRET_BINDING_NAME_PATTERN } from "../../../core/model/secret-binding";

const secretBindingSchema = z.string().trim().regex(
  SECRET_BINDING_NAME_PATTERN,
  "Secret binding must look like GEMINI_API_KEY, not the API key value"
);

export const createProviderSchema = z.object({
  name: z.string().min(1),
  providerType: z.enum(["openai", "gemini", "mock", "custom"]),
  baseUrl: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().optional(),
  apiKeySecret: secretBindingSchema.optional(),
  authType: z.enum(["none", "bearer", "x-goog-api-key", "api-key-header", "query-param"]).optional(),
  authHeader: z.string().min(1).optional().or(z.literal("")),
  authQueryParam: z.string().min(1).optional().or(z.literal("")),
  modelListStrategy: z.enum(["openai", "gemini", "static"]).optional(),
  chatProtocol: z.enum(["openai-chat-completions", "gemini-generate-content"]).optional()
});

export const setActiveModelSchema = z.object({
  agentId: z.string().min(1).optional(),
  providerId: z.string().min(1),
  modelId: z.string().min(1)
});

export const testModelSchema = z.object({
  modelId: z.string().min(1).optional(),
  prompt: z.string().min(1).max(800).optional()
});

export const refreshModelMetadataSchema = z.object({
  source: z.enum(["openrouter"]).default("openrouter")
});

export const updateModelCatalogSchema = z.object({
  capabilities: z.array(z.enum([
    "tools",
    "vision",
    "long_context",
    "structured_output"
  ])).optional(),
  status: z.enum(["available", "enabled", "disabled"]).optional()
}).refine(
  (value) => value.capabilities !== undefined || value.status !== undefined,
  "Either capabilities or status must be provided"
);

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
