# Skill Spec

## 概览

Skill 是 agent 的可安装能力说明包。真实内容存放在 VFS 的 `/skills` 下，不放在源码目录。

## 目录结构

```text
/skills/{skill_id}/
  SKILL.md
  references/
  scripts/
  assets/
```

## SKILL.md

`SKILL.md` 是唯一标准入口，必须包含 YAML frontmatter：

```md
---
name: rss-monitor
description: Monitor RSS feeds and notify users when new items appear.
---

# RSS Monitor

Use this skill when...
```

`name` 和 `description` 是 discovery 层，会进入短 skill catalog。正文只在 skill 激活后进入模型上下文。

## 内容规则

- `description` 必须说明什么时候使用这个 skill。
- 正文只保留核心流程。
- 大段参考资料放 `references/`。
- 可执行辅助逻辑放 `scripts/`。
- 输出模板和静态资源放 `assets/`。
- 不写平台密钥。

## 选择和权限

- 每次 run 注入短 skill catalog。
- 显式 `/skill {skill_id} {task}` 会加载完整 `SKILL.md` body。
- 没有显式选择时，不自动加载任何 skill body。
- Active skill 会额外收窄 VFS 工具边界，只允许只读 VFS 工具访问 `/skills/{skill_id}`。
- 非 VFS 工具权限统一由 runtime permission system、平台可用性和 pending confirmation 控制。

## 安装和更新

- `SKILL.md` 必须校验 frontmatter。
- 更新 skill 会走 VFS revision、tool call 和 audit log。
- 默认情况下，模型写入 skill 需要 pending confirmation。
- 用户可用 `/skill-auto-edits on` 允许模型直接更新 skill 文档。
- Skill 不允许绕过 tool registry。

## Admin API

- `GET /admin/skills`：列出 catalog。
- `POST /admin/skills`：创建标准 Skill。
- `GET /admin/skills/{skill_id}`：读取完整 Skill。
- `DELETE /admin/skills/{skill_id}`：删除整个 Skill。
- `GET /admin/skills/{skill_id}/files`：列出 Skill 文件树。
- `GET /admin/skills/{skill_id}/files?mode=file&relativePath=SKILL.md`：读取文件。
- `PUT /admin/skills/{skill_id}/files`：写入文件。
- `DELETE /admin/skills/{skill_id}/files?relativePath=references/a.md`：删除文件。
- `GET /admin/skills/{skill_id}/revisions?relativePath=SKILL.md`：列出文件历史。
- `GET /admin/skills/{skill_id}/revisions/{version}?relativePath=SKILL.md`：读取历史内容。
- `POST /admin/skills/{skill_id}/revisions/{version}?relativePath=SKILL.md`：回滚到历史版本。

这些接口会校验路径，不能逃逸出 `/skills/{skill_id}`。

## 相关文档

- [../docs/SKILL_RUNTIME.md](../docs/SKILL_RUNTIME.md)
- [../src/skills/README.md](../src/skills/README.md)
