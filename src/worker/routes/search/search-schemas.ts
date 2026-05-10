import { z } from "zod";

export const createSearchProviderSchema = z.object({
  name: z.string().min(1).max(80),
  providerType: z.enum(["tavily", "exa", "custom"]).default("tavily"),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional()
});

export const setSearchProviderSchema = z.object({
  agentId: z.string().min(1).optional(),
  providerId: z.string().min(1).optional(),
  defaultMaxResults: z.number().int().min(1).max(10).optional()
}).refine((input) => input.providerId || input.defaultMaxResults !== undefined, {
  message: "providerId or defaultMaxResults is required"
});

export const testSearchProviderSchema = z.object({
  query: z.string().min(1).max(500).default("Cloudflare Workers serverless agent"),
  maxResults: z.number().int().min(1).max(10).default(5)
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
