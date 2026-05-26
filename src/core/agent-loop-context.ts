import { loadAgentContext } from "../context/context-loader";
import { replaceImagesWithCaptions } from "../context/image-captioning";
import { resolvePlatformContextHints } from "../platforms/context-hints";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { ensureBuiltinSkills } from "../skills/builtin/provision";
import { listSkillCatalog, type SkillCatalogItem } from "../skills/skill-loader";
import { selectSkillForMessage, type SelectedSkill } from "../skills/skill-selector";
import { filterToolsForSkill } from "../skills/skill-tools";
import { getAgentModelConfig } from "../storage/repositories/agent-model-config-repository";
import { filterToolsForPlatform } from "../tools/platform-availability";
import type { RegisteredTool } from "../tools/types";
import { createRuntimeToolRegistry, type ToolRegistry } from "../tools/registry/tool-registry";
import type { ConversationContextMessage } from "./agent-context";
import { createModelProvider } from "./model/provider-factory";
import type { ModelProvider } from "./model/types";
import type { ReasoningSettings } from "./model/reasoning-types";

export type PreparedAgentLoopContext = {
  registry: ToolRegistry;
  provider: ModelProvider;
  selectedSkill?: SelectedSkill;
  skillCatalog: SkillCatalogItem[];
  history: ConversationContextMessage[];
  conversationSummary?: string;
  platformFormatInstruction: string;
  registryTools: RegisteredTool[];
  allowedToolNames: Set<string>;
  reasoning: ReasoningSettings;
  maxToolSteps: number;
};

export async function prepareAgentLoopContext(
  env: Env,
  message: InternalMessage
): Promise<PreparedAgentLoopContext> {
  const registry = await createRuntimeToolRegistry(env);
  const provider = await createModelProvider(env, message.agentId, {
    conversationId: message.conversationId,
    providerId: message.modelProviderId,
    modelId: message.modelId
  });

  await ensureBuiltinSkills(env, message.agentId);
  const selectedSkill = await selectSkillForMessage(env, message);
  const skillCatalog = await listSkillCatalog(env, message.agentId);
  const context = await loadAgentContext(env, message);
  const modelConfig = await getAgentModelConfig(env.AGENT_DB, message.agentId);
  const platformHints = await resolvePlatformContextHints(env, message);
  const history = modelConfig.imageCaptionEnabled
    ? await replaceImagesWithCaptions(env, message.agentId, context.history)
    : context.history;
  const registryTools = filterToolsForPlatform(
    filterToolsForSkill(registry.list(), selectedSkill),
    message.platform
  );

  return {
    registry,
    provider,
    selectedSkill,
    skillCatalog,
    history,
    conversationSummary: context.summary,
    platformFormatInstruction: platformHints.formatInstruction,
    registryTools,
    allowedToolNames: new Set(registryTools.map((tool) => tool.definition.name)),
    reasoning: {
      effort: context.settings.reasoningEffort,
      stateMode: context.settings.reasoningStateMode
    },
    maxToolSteps: modelConfig.maxToolSteps
  };
}
