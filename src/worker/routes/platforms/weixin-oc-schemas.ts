import { z } from "zod";
import {
  DEFAULT_WEIXIN_OC_API_TIMEOUT_MS,
  DEFAULT_WEIXIN_OC_BASE_URL,
  DEFAULT_WEIXIN_OC_BOT_TYPE,
  DEFAULT_WEIXIN_OC_CDN_BASE_URL,
  DEFAULT_WEIXIN_OC_LONG_POLL_TIMEOUT_MS,
  DEFAULT_WEIXIN_OC_QR_POLL_INTERVAL_MS
} from "../../../adapters/weixin-oc/config";

export const createWeixinOcIntegrationSchema = z.object({
  agentId: z.string().min(1).optional(),
  name: z.string().min(1).max(80).default("WeChat Personal"),
  baseUrl: z.url().default(DEFAULT_WEIXIN_OC_BASE_URL),
  cdnBaseUrl: z.url().default(DEFAULT_WEIXIN_OC_CDN_BASE_URL),
  botType: z.string().min(1).default(DEFAULT_WEIXIN_OC_BOT_TYPE),
  qrPollIntervalMs: z
    .number()
    .int()
    .min(1_000)
    .max(60_000)
    .default(DEFAULT_WEIXIN_OC_QR_POLL_INTERVAL_MS),
  longPollTimeoutMs: z
    .number()
    .int()
    .min(5_000)
    .max(110_000)
    .default(DEFAULT_WEIXIN_OC_LONG_POLL_TIMEOUT_MS),
  apiTimeoutMs: z.number().int().min(5_000).max(60_000).default(DEFAULT_WEIXIN_OC_API_TIMEOUT_MS),
  token: z.string().min(1).optional(),
  accountId: z.string().min(1).optional()
});

export const updateWeixinOcIntegrationSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  baseUrl: z.url().optional(),
  cdnBaseUrl: z.url().optional(),
  botType: z.string().min(1).optional(),
  qrPollIntervalMs: z.number().int().min(1_000).max(60_000).optional(),
  longPollTimeoutMs: z.number().int().min(5_000).max(110_000).optional(),
  apiTimeoutMs: z.number().int().min(5_000).max(60_000).optional(),
  token: z.string().min(1).optional(),
  accountId: z.string().min(1).optional()
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
