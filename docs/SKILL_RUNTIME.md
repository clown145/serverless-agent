# Skill Runtime

## 概览

Skills 是存放在 VFS 中的运行时说明文件。它们用来给 agent 提供某类任务的附加指令、参考资料、脚本和资产，但不绕过工具权限系统。

Skill 文件路径：

```text
/skills/{skill_id}/SKILL.md
/skills/{skill_id}/references/...
/skills/{skill_id}/scripts/...
/skills/{skill_id}/assets/...
```

## 标准 SKILL.md

`SKILL.md` 必须以 YAML frontmatter 开头：

```md
---
name: skill-creator
description: Create, update, validate, package, or improve serverless-agent skills.
---

# Skill Creator

...
```

`name` 和 `description` 用于 discovery。只有 skill 被激活后，正文才会加载进上下文。

## 内置 skill

运行时会按需 provision `/skills/skill-creator/SKILL.md`。它是普通 VFS skill，可以像其他 skill 一样更新。

## Catalog Injection

每次 run 都会在稳定 base system prompt 后注入一段简短 skill catalog：

```text
Available skills...
- skill-creator: Create, update, validate, package, or improve serverless-agent skills.
```

catalog 只包含 `id + description`。完整 skill body 只在 skill 激活后注入，这样可以减少上下文大小，也避免频繁改变稳定 prompt prefix。

## 选择规则

运行时每次最多选择一个 skill。

显式选择优先：

```text
/skill demo /read /workspace/notes/a.md
```

如果没有显式选择，默认不加载 skill body。模型仍能看到短 catalog，并在需要时用 `/skill <id> <task>` 重新进入。

## Context Injection

skill 激活后，模型会收到额外 system message：

```text
Active skill: demo
Skill name: Demo
Skill version: 0.1.0
Skill instructions:
...
```

显式 `/skill` 命令中，`/skill {id}` 后面的文本会作为用户任务传给模型。

## 工具权限

Skill 激活后，运行时会额外收窄 VFS 工具边界：

- 暴露给模型的 VFS 工具只保留 `vfs.read_file`、`vfs.list_dir` 和 `vfs.search`。
- 这些只读 VFS 工具只能访问 `/skills/{skill_id}` 下的文件。
- `vfs.command` 和 VFS 写入/移动/删除类工具不会在 active skill 中暴露。

非 VFS 工具仍统一走 runtime permission system、platform availability checks 和 pending confirmation flow。

## Skill 编辑

运行时暴露 skill tools：

- `skills.list`
- `skills.read`
- `skills.write_file`
- `skills.set_auto_edits`

`skills.write_file` 只能编辑 `/skills/{skill_id}` 内的文件，并会校验 `SKILL.md` frontmatter。默认情况下，写入前会创建 pending confirmation。

可以用 slash command 控制单个 agent 的自动编辑设置：

```text
/skill-auto-edits status
/skill-auto-edits on
/skill-auto-edits off
```

开启 auto edits 后，模型可以直接更新 skill 文件。VFS revisions、tool calls 和 audit logs 仍会记录变化。

WebUI 的 Skills 页面使用同一套 VFS-backed 内容。它可以：

- 创建标准 `SKILL.md`；
- 编辑 `references/`、`scripts/` 和 `assets/` 下的文件；
- 切换单个 agent 的确认设置；
- 查看 file revisions；
- 回滚到某个 revision。

Skill-scoped admin routes 不会写出 `/skills/{skill_id}`。

## Runtime-managed final reply

运行时仍可能把最终模型回复发送回来源 conversation。这个 final reply 由 runtime 管理，不代表模型自动获得了 `messaging.send_message` 权限。

## 相关文档

- [PERMISSIONS_RUNTIME.md](PERMISSIONS_RUNTIME.md)
- [architecture/TOOLS_AND_BOUNDARIES.md](architecture/TOOLS_AND_BOUNDARIES.md)
- [../src/skills/README.md](../src/skills/README.md)
