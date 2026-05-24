import type { ModelAuthType } from "../../storage/repositories/model-settings-types";

export type ModelAuthConfig = {
  apiKey?: string;
  authType: ModelAuthType;
  authHeader?: string;
  authQueryParam?: string;
};

export function applyModelAuth(url: string, headers: Headers, config: ModelAuthConfig): string {
  if (config.authType === "none" || !config.apiKey) {
    return url;
  }

  if (config.authType === "bearer") {
    headers.set("authorization", `Bearer ${config.apiKey}`);
    return url;
  }

  if (config.authType === "x-goog-api-key") {
    headers.set("x-goog-api-key", config.apiKey);
    return url;
  }

  if (config.authType === "api-key-header") {
    headers.set(config.authHeader || "x-api-key", config.apiKey);
    return url;
  }

  const nextUrl = new URL(url);
  nextUrl.searchParams.set(config.authQueryParam || "key", config.apiKey);
  return nextUrl.toString();
}

export function requiresAuthKey(authType: ModelAuthType): boolean {
  return authType !== "none";
}
