# Skills

## 概览

`skills` 放 skill runtime 代码，包括标准 `SKILL.md` frontmatter、catalog、loader 和管理服务。

真实 skill 内容不放在源码目录，而是存储在 VFS：

```text
/skills/{skill_id}/SKILL.md
```

## 职责

- 解析和生成标准 `SKILL.md` frontmatter。
- 加载完整 skill。
- 生成短 skill catalog。
- 处理显式 `/skill {id} {task}`。
- 提供 skill 文件创建、读写、删除、版本列表和回滚服务。
- 按需 provision 内置 `skill-creator`。

## 文件职责

| 文件                   | 职责                          |
| ---------------------- | ----------------------------- |
| `skill-frontmatter.ts` | 解析和生成标准 frontmatter。  |
| `skill-loader.ts`      | 加载完整 skill 和短 catalog。 |
| `skill-selector.ts`    | 处理显式 skill 选择。         |
| `skill-service.ts`     | Skill 文件管理服务。          |
| `builtin/`             | 内置 skill 内容。             |

## 边界

Skill 不定义独立 tool allowlist。工具暴露和执行统一走权限系统、platform availability checks 和 pending confirmation flow。

## 相关文档

- [../../docs/SKILL_RUNTIME.md](../../docs/SKILL_RUNTIME.md)
- [../../specs/skill-manifest.md](../../specs/skill-manifest.md)
