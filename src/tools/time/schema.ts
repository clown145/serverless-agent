import { z } from "zod";

export const timeNowInputSchema = z.object({
  timeZone: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .optional()
    .describe("Optional IANA timezone, for example Asia/Shanghai or America/New_York.")
});

export type TimeNowInput = z.infer<typeof timeNowInputSchema>;

export const timeNowInputJsonSchema = {
  type: "object",
  properties: {
    timeZone: {
      type: "string",
      maxLength: 128,
      description:
        "Optional IANA timezone, for example Asia/Shanghai or America/New_York. Defaults to the configured agent timezone or UTC."
    }
  },
  additionalProperties: false
} as const;
