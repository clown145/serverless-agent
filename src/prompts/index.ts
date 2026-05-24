import { GENERATED_PROMPTS } from "./generated";

type GeneratedPrompts = typeof GENERATED_PROMPTS;

export type PromptId = keyof GeneratedPrompts;
export type PromptSource = GeneratedPrompts[PromptId]["source"];

export type PromptVariables = Record<string, string | number | boolean | null | undefined>;

export type ResolvedPrompt = {
  id: PromptId;
  content: string;
  source: PromptSource;
  checksum: string;
};

const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/gu;

export function resolvePrompt(id: PromptId): ResolvedPrompt {
  const prompt = GENERATED_PROMPTS[id];
  return {
    id,
    content: prompt.content,
    source: prompt.source,
    checksum: prompt.checksum
  };
}

export function renderPrompt(id: PromptId, variables: PromptVariables = {}): ResolvedPrompt {
  const prompt = resolvePrompt(id);
  return {
    ...prompt,
    content: renderPromptTemplate(prompt.content, variables)
  };
}

export function promptText(id: PromptId, variables: PromptVariables = {}): string {
  return renderPrompt(id, variables).content;
}

export function renderPromptTemplate(template: string, variables: PromptVariables): string {
  return template
    .replace(TEMPLATE_VARIABLE_PATTERN, (_match, key: string) => {
      const value = variables[key];
      return value === null || value === undefined ? "" : String(value);
    })
    .trimEnd();
}
