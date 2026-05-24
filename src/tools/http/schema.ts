import { z } from "zod";

export const httpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]);

export const httpCookieJarModeSchema = z.enum(["disabled", "send", "store", "send_and_store"]);

const httpFileSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("vfs"),
    path: z.string().min(1)
  }),
  z.object({
    type: z.literal("attachment"),
    messageId: z.string().min(1),
    attachmentId: z.string().min(1)
  }),
  z.object({
    type: z.literal("url"),
    url: z.url()
  }),
  z.object({
    type: z.literal("base64"),
    dataBase64: z.string().min(1)
  })
]);

const httpMultipartPartSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("field"),
    name: z.string().min(1).max(200),
    value: z.union([z.string(), z.number(), z.boolean()])
  }),
  z.object({
    kind: z.literal("file"),
    name: z.string().min(1).max(200),
    source: httpFileSourceSchema,
    fileName: z.string().min(1).max(255).optional(),
    mimeType: z.string().min(1).max(120).optional()
  })
]);

const httpCookieJarSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  mode: httpCookieJarModeSchema.default("disabled")
});

const headerRecordSchema = z
  .record(z.string(), z.string())
  .default({})
  .transform((headers) => normalizeHeaders(headers));

export const httpRequestInputSchema = z
  .object({
    url: z.string().url(),
    method: httpMethodSchema.default("GET"),
    headers: headerRecordSchema,
    query: z.record(z.string(), z.string()).default({}),
    bodyType: z.enum(["none", "json", "text", "form", "base64", "multipart"]).default("none"),
    json: z.unknown().optional(),
    text: z.string().optional(),
    form: z.record(z.string(), z.string()).optional(),
    base64: z.string().optional(),
    multipart: z.array(httpMultipartPartSchema).max(50).optional(),
    cookieJar: httpCookieJarSchema.default({ mode: "disabled" }),
    maxBytes: z.number().int().min(0).max(2_000_000).default(1_000_000),
    maxRedirects: z.number().int().min(0).max(10).default(5),
    timeoutMs: z.number().int().min(1000).max(30_000).default(15_000)
  })
  .refine((input) => input.method !== "HEAD" || input.maxBytes === 0, {
    message: "HEAD requests must use maxBytes 0"
  })
  .refine((input) => input.bodyType !== "json" || input.json !== undefined, {
    message: "json is required when bodyType is json"
  })
  .refine((input) => input.bodyType !== "text" || input.text !== undefined, {
    message: "text is required when bodyType is text"
  })
  .refine((input) => input.bodyType !== "form" || input.form !== undefined, {
    message: "form is required when bodyType is form"
  })
  .refine((input) => input.bodyType !== "base64" || input.base64 !== undefined, {
    message: "base64 is required when bodyType is base64"
  })
  .refine((input) => input.bodyType !== "multipart" || input.multipart !== undefined, {
    message: "multipart is required when bodyType is multipart"
  })
  .refine((input) => input.cookieJar.mode === "disabled" || input.cookieJar.id !== undefined, {
    message: "cookieJar.id is required when cookieJar.mode is enabled"
  });

export type HttpRequestInput = z.infer<typeof httpRequestInputSchema>;
export type HttpFileSourceInput = z.infer<typeof httpFileSourceSchema>;
export type HttpMultipartPartInput = z.infer<typeof httpMultipartPartSchema>;
export type HttpCookieJarInput = z.infer<typeof httpCookieJarSchema>;

export const httpRequestInputJsonSchema = {
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "Public HTTP or HTTPS URL to request."
    },
    method: {
      type: "string",
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"],
      description: "HTTP method to use."
    },
    headers: {
      type: "object",
      additionalProperties: { type: "string" },
      description: "Request headers to send."
    },
    query: {
      type: "object",
      additionalProperties: { type: "string" },
      description: "Query parameters to add or override in the URL."
    },
    bodyType: {
      type: "string",
      enum: ["none", "json", "text", "form", "base64", "multipart"],
      description: "Request body encoding."
    },
    json: {
      description: "JSON body value when bodyType is json."
    },
    text: {
      type: "string",
      description: "Text body when bodyType is text."
    },
    form: {
      type: "object",
      additionalProperties: { type: "string" },
      description: "URL-encoded form fields when bodyType is form."
    },
    base64: {
      type: "string",
      description: "Base64-encoded binary body when bodyType is base64."
    },
    multipart: {
      type: "array",
      description: "Multipart form fields and files when bodyType is multipart.",
      items: {
        oneOf: [
          {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["field"] },
              name: { type: "string" },
              value: { type: ["string", "number", "boolean"] }
            },
            required: ["kind", "name", "value"],
            additionalProperties: false
          },
          {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["file"] },
              name: { type: "string" },
              source: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["vfs"] },
                      path: { type: "string" }
                    },
                    required: ["type", "path"],
                    additionalProperties: false
                  },
                  {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["attachment"] },
                      messageId: { type: "string" },
                      attachmentId: { type: "string" }
                    },
                    required: ["type", "messageId", "attachmentId"],
                    additionalProperties: false
                  },
                  {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["url"] },
                      url: { type: "string" }
                    },
                    required: ["type", "url"],
                    additionalProperties: false
                  },
                  {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["base64"] },
                      dataBase64: { type: "string" }
                    },
                    required: ["type", "dataBase64"],
                    additionalProperties: false
                  }
                ]
              },
              fileName: { type: "string" },
              mimeType: { type: "string" }
            },
            required: ["kind", "name", "source"],
            additionalProperties: false
          }
        ]
      }
    },
    cookieJar: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Optional jar identifier for persisting cookies across requests."
        },
        mode: {
          type: "string",
          enum: ["disabled", "send", "store", "send_and_store"],
          description: "How to use cookies for this request."
        }
      },
      additionalProperties: false,
      description: "Optional cookie jar behavior."
    },
    maxBytes: {
      type: "integer",
      minimum: 0,
      maximum: 2000000,
      description: "Maximum response bytes to return."
    },
    maxRedirects: {
      type: "integer",
      minimum: 0,
      maximum: 10,
      description: "Maximum number of redirects to follow."
    },
    timeoutMs: {
      type: "integer",
      minimum: 1000,
      maximum: 30000,
      description: "Request timeout in milliseconds."
    }
  },
  required: ["url"],
  additionalProperties: false
} as const;

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    const key = name.trim();
    if (!key) {
      continue;
    }
    normalized[key] = value;
  }
  return normalized;
}
