# Skill Runtime

Skills live in the VFS under:

```text
/skills/{skill_id}/SKILL.md
/skills/{skill_id}/references/...
/skills/{skill_id}/scripts/...
/skills/{skill_id}/assets/...
```

## Standard SKILL.md

`SKILL.md` should start with YAML frontmatter:

```md
---
name: skill-creator
description: Create, update, validate, package, or improve serverless-agent skills.
---

# Skill Creator
...
```

`name` and `description` are the discovery layer. The body is loaded only after the skill is active.

## Built-In Skill

The runtime provisions `/skills/skill-creator/SKILL.md` on demand. It is a normal VFS skill and can be updated like other skills.

## Catalog Injection

Every run receives a short skill catalog system message after the stable base system prompt:

```text
Available skills...
- skill-creator: Create, update, validate, package, or improve serverless-agent skills.
```

Only `id + description` are included. Full skill bodies are not injected unless a skill is active, which keeps context smaller and avoids invalidating the stable prompt prefix.

## Selection

The runtime selects at most one skill for a run.

Explicit selection has priority:

```text
/skill demo /read /workspace/notes/a.md
```

If no explicit skill is present, no skill body is loaded. The model still sees the short skill catalog and can choose to re-enter with `/skill <id> <task>` when a skill is relevant.

## Context Injection

When a skill is active, the model receives an extra system message:

```text
Active skill: demo
Skill name: Demo
Skill version: 0.1.0
Skill instructions:
...
```

For explicit skill commands, the model sees the remaining text after `/skill {id}` as the user task.

## Tool Permissions

Skills no longer define a separate tool allowlist. Tool exposure and execution use the normal runtime permission system, platform availability checks, and pending confirmation flow. This avoids a second policy format inside Skill files.

## Skill Editing

The runtime exposes skill tools:

- `skills.list`
- `skills.read`
- `skills.write_file`
- `skills.set_auto_edits`

`skills.write_file` edits files inside `/skills/{skill_id}` and validates `SKILL.md` frontmatter. By default, it creates a pending confirmation before writing. The slash command toggles this per agent:

```text
/skill-auto-edits status
/skill-auto-edits on
/skill-auto-edits off
```

When auto edits are enabled, the model can update skill documents directly. VFS revisions, tool calls, and audit logs still record the change.

The WebUI also has a Skills page for the same VFS-backed content. It can:

- create a standard `SKILL.md`
- edit files under `references/`, `scripts/`, and `assets/`
- toggle the per-agent confirmation setting
- inspect file revisions
- roll a file back to a previous revision

The page uses Skill-scoped admin routes, so it never writes outside `/skills/{skill_id}`.

## Internal Final Replies

The runtime may still send the final model response back to the source conversation with `messaging.send_message`. This final reply is runtime-managed and does not expose `messaging.send_message` to the model unless the normal permission system allows it.
