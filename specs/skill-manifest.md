# Skill Spec

skill 是 agent 的可安装能力包。真实 skill 内容存放在 VFS 的 `/skills` 下。

## 目录结构

```text
/skills/{skill_id}/
  SKILL.md
  references/
  scripts/
  assets/
```

## SKILL.md

`SKILL.md` 是唯一标准入口。它必须包含 YAML frontmatter：

```md
---
name: rss-monitor
description: Monitor RSS feeds and notify users when new items appear.
---

# RSS Monitor

Use this skill when...
```

`name` 和 `description` 是发现层，会进入短 skill catalog。正文只在 skill 激活后进入模型上下文。

要求：

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
- Skill 不定义独立工具 allowlist；工具权限统一由 runtime permission system、平台可用性和 pending confirmation 控制。

## 安装和更新规则

- `SKILL.md` 必须校验 frontmatter。
- 更新 skill 会走 VFS revision、tool call 和 audit log。
- 默认情况下，模型写入 skill 需要 pending confirmation。
- 用户可用 `/skill-auto-edits on` 永久允许模型直接更新 skill 文档。
- 不允许 skill 绕过 tool registry。

## 管理接口

Admin API 提供 Skill 作用域的文件接口：

- `GET /admin/skills`: 列出 catalog。
- `POST /admin/skills`: 创建标准 Skill。
- `GET /admin/skills/{skill_id}`: 读取完整 Skill。
- `DELETE /admin/skills/{skill_id}`: 删除整个 Skill。
- `GET /admin/skills/{skill_id}/files`: 列出 Skill 文件树。
- `GET /admin/skills/{skill_id}/files?mode=file&relativePath=SKILL.md`: 读取文件。
- `PUT /admin/skills/{skill_id}/files`: 写入文件。
- `DELETE /admin/skills/{skill_id}/files?relativePath=references/a.md`: 删除文件。
- `GET /admin/skills/{skill_id}/revisions?relativePath=SKILL.md`: 列出文件历史。
- `GET /admin/skills/{skill_id}/revisions/{version}?relativePath=SKILL.md`: 读取历史内容。
- `POST /admin/skills/{skill_id}/revisions/{version}?relativePath=SKILL.md`: 回滚到历史版本。

这些接口会校验路径，不能逃逸出 `/skills/{skill_id}`。
