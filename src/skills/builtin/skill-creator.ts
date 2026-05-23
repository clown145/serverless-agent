import { createSkillMarkdown } from "../skill-frontmatter";

export const SKILL_CREATOR_ID = "skill-creator";

export const SKILL_CREATOR_MARKDOWN = createSkillMarkdown({
  name: "skill-creator",
  description:
    "Create, update, validate, package, or improve serverless-agent skills.",
  body: `# Skill Creator

Use this skill when the user wants to create, edit, upload, validate, or improve a skill.

## Standard Structure

A skill is a self-contained folder:

\`\`\`text
/skills/{skill_id}/
  SKILL.md
  references/
  scripts/
  assets/
\`\`\`

\`SKILL.md\` must begin with YAML frontmatter:

\`\`\`md
---
name: concise-skill-name
description: Clear trigger guidance. Say when this skill should be used.
---
\`\`\`

The description is the discovery text that appears in the model's skill catalog.
Keep it short, specific, and action-oriented.

## Writing Rules

- Keep SKILL.md focused on the core workflow.
- Move long schemas, API notes, examples, and variants to \`references/\`.
- Put deterministic helper code in \`scripts/\`.
- Put output templates and reusable files in \`assets/\`.
- Do not create unrelated README, changelog, or installation files inside a skill.
- Include concrete instructions for when to read reference files.

## Update Workflow

1. Inspect the existing skill files.
2. Make the smallest useful edit.
3. Validate the frontmatter and file layout.
4. Preserve user-authored content unless the user asks to replace it.
5. Summarize changed files and any behavior impact.
`
});
