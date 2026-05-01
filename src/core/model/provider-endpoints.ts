export function normalizeBaseUrl(baseUrl: string | undefined, fallback: string): string {
  return (baseUrl || fallback).trim().replace(/\/+$/, "") || fallback;
}

export function openAiChatUrl(baseUrl?: string): string {
  const base = normalizeBaseUrl(baseUrl, "https://api.openai.com/v1");
  if (/\/chat\/completions$/i.test(base)) {
    return base;
  }
  if (/\/models$/i.test(base)) {
    return base.replace(/\/models$/i, "/chat/completions");
  }
  return `${base}/chat/completions`;
}

export function openAiModelsUrl(baseUrl?: string): string {
  const base = normalizeBaseUrl(baseUrl, "https://api.openai.com/v1");
  if (/\/models$/i.test(base)) {
    return base;
  }
  if (/\/chat\/completions$/i.test(base)) {
    return base.replace(/\/chat\/completions$/i, "/models");
  }
  return `${base}/models`;
}

export function geminiModelsUrl(baseUrl?: string): string {
  const base = normalizeBaseUrl(baseUrl, "https://generativelanguage.googleapis.com/v1beta");
  if (/\/models$/i.test(base)) {
    return base;
  }
  return `${base}/models`;
}

export function geminiGenerateUrl(baseUrl: string | undefined, model: string): string {
  const base = normalizeBaseUrl(baseUrl, "https://generativelanguage.googleapis.com/v1beta");
  const cleanModel = model.trim().replace(/^\/+/, "");
  const modelPath = cleanModel.startsWith("models/") ? cleanModel : `models/${cleanModel}`;
  return `${base}/${modelPath}:generateContent`;
}
