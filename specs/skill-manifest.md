# Skill Manifest Spec

skill 是 agent 的可安装能力包。真实 skill 内容存放在 VFS 的 `/skills` 下。

## 目录结构

```text
/skills/{skill_id}/
  SKILL.md
  manifest.json
  prompts/
  templates/
  assets/
```

## manifest.json

```json
{
  "id": "rss-monitor",
  "name": "RSS Monitor",
  "version": "0.1.0",
  "description": "Monitor RSS feeds and notify users when new items appear.",
  "entry": "SKILL.md",
  "triggers": [
    {
      "type": "command",
      "pattern": "/rss"
    },
    {
      "type": "schedule",
      "pattern": "interval:1h"
    }
  ],
  "tools": [
    "vfs.read_file",
    "vfs.write_file",
    "search.fetch_url",
    "messaging.send_message",
    "scheduler.create_task"
  ],
  "permissions": {
    "requiredLevel": 3,
    "scopes": [
      "workspace:read",
      "workspace:write",
      "message:send"
    ]
  }
}
```

## SKILL.md

`SKILL.md` 描述 skill 的使用场景、输入输出、注意事项和工具顺序。

要求：

- 说明触发条件。
- 说明可用工具。
- 说明权限需求。
- 说明失败时如何处理。
- 不写平台密钥。

## 安装规则

- skill 安装必须写 audit log。
- 更新 skill 默认属于高风险操作。
- manifest 必须校验。
- 不允许 skill 自行提升权限。
- 不允许 skill 绕过 tool registry。
