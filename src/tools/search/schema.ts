import { z } from "zod";

export const webSearchInputSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().int().min(1).max(10).default(5),
  searchDepth: z.enum(["basic", "advanced", "fast", "ultra-fast"]).default("basic"),
  topic: z.enum(["general", "news", "finance"]).default("general"),
  timeRange: z.enum(["day", "week", "month", "year", "d", "w", "m", "y"]).optional(),
  includeAnswer: z.boolean().default(false),
  includeRawContent: z.boolean().default(false),
  includeDomains: z.array(z.string().min(1)).max(20).optional(),
  excludeDomains: z.array(z.string().min(1)).max(20).optional()
});

export type WebSearchInput = z.infer<typeof webSearchInputSchema>;

export const webSearchInputJsonSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Search query."
    },
    maxResults: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      description: "Maximum number of results to return."
    },
    searchDepth: {
      type: "string",
      enum: ["basic", "advanced", "fast", "ultra-fast"],
      description: "Latency and relevance tradeoff."
    },
    topic: {
      type: "string",
      enum: ["general", "news", "finance"],
      description: "Search category."
    },
    timeRange: {
      type: "string",
      enum: ["day", "week", "month", "year", "d", "w", "m", "y"],
      description: "Optional recency filter."
    },
    includeAnswer: {
      type: "boolean",
      description: "Include provider-generated answer when available."
    },
    includeRawContent: {
      type: "boolean",
      description: "Include raw extracted content when available."
    },
    includeDomains: {
      type: "array",
      items: { type: "string" },
      description: "Domains to include."
    },
    excludeDomains: {
      type: "array",
      items: { type: "string" },
      description: "Domains to exclude."
    }
  },
  required: ["query"],
  additionalProperties: false
} as const;
