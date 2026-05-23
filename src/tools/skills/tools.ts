import { loadSkill } from "../../skills/skill-loader";
import { listSkills, updateSkillFile } from "../../skills/skill-service";
import {
  getSkillSettings,
  setSkillEditConfirmationRequired
} from "../../storage/repositories/skill-settings-repository";
import { builtinTool } from "../builtin/source";
import type { RegisteredTool } from "../types";
import { failed } from "../vfs/result";
import {
  listSkillsInputJsonSchema,
  listSkillsInputSchema,
  readSkillInputJsonSchema,
  readSkillInputSchema,
  skillAutoEditsInputJsonSchema,
  skillAutoEditsInputSchema,
  writeSkillInputJsonSchema,
  writeSkillInputSchema
} from "./schema";

export function createSkillTools(): RegisteredTool[] {
  return [
    listSkillsTool(),
    readSkillTool(),
    writeSkillFileTool(),
    setSkillAutoEditsTool()
  ];
}

function listSkillsTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "skills.list",
      title: "List Skills",
      description: "List installed skills and their discovery descriptions.",
      inputSchema: listSkillsInputJsonSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      },
      permission: { level: 1, scopes: ["workspace:read"] },
      sideEffect: "none",
      timeoutMs: 5_000
    },
    execute: async (context) => {
      const parsed = listSkillsInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }
      return {
        status: "success",
        output: await listSkills(context.env, context.agentId)
      };
    }
  });
}

function readSkillTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "skills.read",
      title: "Read Skill",
      description: "Read a skill's metadata and SKILL.md instructions.",
      inputSchema: readSkillInputJsonSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      },
      permission: { level: 1, scopes: ["workspace:read"] },
      sideEffect: "none",
      timeoutMs: 5_000
    },
    execute: async (context) => {
      const parsed = readSkillInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      return {
        status: "success",
        output: await loadSkill(context.env, context.agentId, parsed.data.skillId)
      };
    }
  });
}

function writeSkillFileTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "skills.write_file",
      title: "Write Skill File",
      description: "Create or update a file inside an installed skill.",
      inputSchema: writeSkillInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: false
      },
      permission: {
        level: 3,
        scopes: ["workspace:write"],
        confirmationRequired: true
      },
      sideEffect: "workspace_write",
      timeoutMs: 10_000
    },
    execute: async (context) => {
      const parsed = writeSkillInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const skill = await updateSkillFile(context.env, {
        agentId: context.agentId,
        skillId: parsed.data.skillId,
        relativePath: parsed.data.relativePath,
        content: parsed.data.content,
        createdBy: context.actorId
      });
      return { status: "success", output: skill };
    }
  });
}

function setSkillAutoEditsTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "skills.set_auto_edits",
      title: "Set Skill Auto Edits",
      description: "Enable or disable direct skill document edits without confirmation.",
      inputSchema: skillAutoEditsInputJsonSchema,
      annotations: {
        destructiveHint: false,
        openWorldHint: false
      },
      permission: { level: 4, scopes: ["workspace:write"] },
      sideEffect: "workspace_write",
      timeoutMs: 5_000
    },
    execute: async (context) => {
      const parsed = skillAutoEditsInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const settings = await setSkillEditConfirmationRequired(context.env.AGENT_DB, {
        agentId: context.agentId,
        required: !parsed.data.enabled
      });
      return {
        status: "success",
        output: {
          autoEditsEnabled: !settings.editConfirmationRequired,
          settings
        }
      };
    }
  });
}

export async function skillEditConfirmationRequired(
  context: Parameters<RegisteredTool["execute"]>[0]
): Promise<boolean> {
  return (await getSkillSettings(context.env.AGENT_DB, context.agentId))
    .editConfirmationRequired;
}
