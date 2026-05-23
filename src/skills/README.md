# Skills

skill 加载、标准 `SKILL.md` frontmatter 解析、catalog 生成和管理服务。

这里放代码，不放用户安装的 skill 内容。真实 skill 内容存 VFS：

```text
/skills/{skill_id}/SKILL.md
```

相关模块：

- `skill-frontmatter.ts`: 解析和生成标准 `SKILL.md` frontmatter。
- `skill-loader.ts`: 加载完整 Skill 和生成短 catalog。
- `skill-selector.ts`: 处理显式 `/skill {id} {task}`。
- `skill-service.ts`: 提供 Skill 创建、文件读写、删除、版本列表和回滚。
- `builtin/`: 按需写入内置 `skill-creator`。

WebUI 和工具都通过 `skill-service.ts` 写入 VFS。`SKILL.md` 写入时必须通过 frontmatter 校验。
