# Skill Runtime

Skills live in the VFS under:

```text
/skills/{skill_id}/manifest.json
/skills/{skill_id}/SKILL.md
```

## Selection

The runtime selects at most one skill for a run.

Explicit selection has priority:

```text
/skill demo /read /workspace/notes/a.md
```

If no explicit skill is present, the runtime scans installed skills and matches command triggers:

```json
{
  "triggers": [
    {
      "type": "command",
      "pattern": "/read"
    }
  ]
}
```

A message starting with `/read` activates that skill.

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

## Tool Allowlist

When a skill is active, only tools declared in `manifest.json` are exposed to the model.

```json
{
  "tools": ["vfs.read_file"]
}
```

The execution layer also checks this allowlist. If a provider returns a tool call that was not exposed, the runtime denies it.

## Permission Filtering

Tool exposure also requires enough permission level and scopes.

Example:

```json
{
  "tools": ["vfs.read_file"],
  "permissions": {
    "requiredLevel": 1,
    "scopes": ["workspace:read"]
  }
}
```

If a tool requires level `2` or scope `workspace:write`, this skill will not receive that tool.

## Internal Final Replies

The runtime may still send the final model response back to the source conversation with `messaging.send_message`. This final reply is runtime-managed and does not expose `messaging.send_message` to the model unless the skill declares it.
