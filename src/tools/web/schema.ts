import { z } from "zod";

export const MAX_FETCH_PAGE_URLS = 10;

export const fetchPageInputSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(MAX_FETCH_PAGE_URLS),
  maxChars: z.number().int().min(500).max(20000).default(6000),
  includeLinks: z.boolean().default(false)
});

export type FetchPageInput = z.infer<typeof fetchPageInputSchema>;

export const fetchPageInputJsonSchema = {
  type: "object",
  properties: {
    urls: {
      type: "array",
      minItems: 1,
      maxItems: MAX_FETCH_PAGE_URLS,
      items: {
        type: "string"
      },
      description:
        "One to ten HTTP or HTTPS URLs to fetch in one tool call. Use this for both single-page and multi-page reads."
    },
    maxChars: {
      type: "integer",
      minimum: 500,
      maximum: 20000,
      description: "Maximum extracted text characters to return per page."
    },
    includeLinks: {
      type: "boolean",
      description: "Include a small list of links found on HTML pages."
    }
  },
  required: ["urls"],
  additionalProperties: false
} as const;
