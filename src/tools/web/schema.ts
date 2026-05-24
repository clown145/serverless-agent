import { z } from "zod";

export const fetchPageInputSchema = z.object({
  url: z.string().url(),
  maxChars: z.number().int().min(500).max(20000).default(6000),
  includeLinks: z.boolean().default(false)
});

export type FetchPageInput = z.infer<typeof fetchPageInputSchema>;

export const fetchPageInputJsonSchema = {
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "HTTP or HTTPS URL to fetch."
    },
    maxChars: {
      type: "integer",
      minimum: 500,
      maximum: 20000,
      description: "Maximum extracted text characters to return."
    },
    includeLinks: {
      type: "boolean",
      description: "Include a small list of links found on HTML pages."
    }
  },
  required: ["url"],
  additionalProperties: false
} as const;
