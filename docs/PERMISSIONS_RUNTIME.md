# Permissions Runtime

## 概览

权限运行时负责两个问题：

- 当前 actor 是否可以调用某个工具；
- 工具有高风险副作用时，是否需要先暂停并等待确认。

策略存储在 D1，不写入 VFS。VFS 可以保存 workspace、skills 和 artifacts，但权限需要可查询、可撤销、可审计。

## 存储

相关 D1 表：

- `permission_policies`：显式权限策略。
- `pending_actions`：等待确认的工具调用。

## 默认策略

没有显式策略时，运行时使用保守默认值：

| Actor                  | Max level | Scopes                                                                                                                                                                  |
| ---------------------- | --------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scheduler`            |         3 | `workspace:read`, `workspace:write`, `message:send`, `message:send_file`, `message:send_image`, `message:send_buttons`, `web:search`, `schedule:read`, `schedule:write` |
| role `owner` / `admin` |         4 | `workspace:read`, `workspace:write`, `message:send`, `message:send_file`, `message:send_image`, `message:send_buttons`, `web:search`, `schedule:read`, `schedule:write` |
| role `member`          |         2 | `workspace:read`, `workspace:write`                                                                                                                                     |
| unknown                |         1 | `workspace:read`                                                                                                                                                        |

显式策略会与默认策略合并：`maxLevel` 取最高值，`scopes` 取并集。每个
`agent_id + subject_type + subject_id` 只允许一条 active 显式策略；再次保存同一 subject
会更新现有策略，删除策略会从 D1 物理删除。迁移前遗留的重复 active 策略会保留最新一条用于解析，避免同一 subject
的多条旧记录叠加成更宽松权限。

## Policy Subjects

当前支持：

- `agent`：针对某个 agent。
- `user`：针对触发者 ID。
- `role`：针对 `owner`、`admin`、`member` 等角色。
- `platform`：针对 `telegram`、`qq`、`wecom`、`weixin_oc`、`webui`、`admin` 等入口。
- `conversation`：针对私聊、群聊或线程。

## Admin API

创建策略：

```bash
curl -sS http://localhost:8787/admin/permission-policies \
  -H 'content-type: application/json' \
  -d '{"subjectType":"user","subjectId":"alice","maxLevel":4,"scopes":["workspace:read","workspace:write","message:send"]}'
```

查看策略：

```bash
curl -sS http://localhost:8787/admin/permission-policies
```

按 agent 查看：

```bash
curl -sS 'http://localhost:8787/admin/permission-policies?agentId=default'
```

删除策略：

```bash
curl -sS -X DELETE http://localhost:8787/admin/permission-policies/pol_...
```

更新策略：

```bash
curl -sS -X PUT http://localhost:8787/admin/permission-policies/pol_... \
  -H 'content-type: application/json' \
  -d '{"subjectType":"conversation","subjectId":"chat-1","maxLevel":2,"scopes":["workspace:read"]}'
```

查看等待确认的动作：

```bash
curl -sS http://localhost:8787/admin/pending-actions
```

确认并执行：

```bash
curl -sS -X POST http://localhost:8787/admin/pending-actions/act_.../confirm
```

如果配置了 `INTERNAL_ADMIN_TOKEN`，这些 API 需要 `Authorization: Bearer <token>`。

## Confirmation Flow

工具会先经过权限策略检查。通过后，如果满足任一条件，工具不会立即执行：

- `permission.level >= 5`
- `permission.confirmationRequired === true`
- `sideEffect === "dangerous"`

只有进入 `needs_confirmation` 的调用才会创建 pending action。触发来源平台支持交互按钮时，运行时会尝试发送“确认 / 拒绝”按钮。按钮由运行时发送，不要求模型额外拥有 `message:send_buttons`。

工具调用结果示例：

```json
{
  "status": "needs_confirmation",
  "output": {
    "pendingActionId": "act_..."
  }
}
```

管理员确认后，系统会使用原始工具名、输入和触发者上下文重新执行工具，并写回 `pending_actions.result_json` 或 `pending_actions.error_code`。

## 当前限制

- Admin API 和 WebUI 可以查看、确认 pending action。
- Telegram 已支持 inline button 确认/拒绝。
- QQ、WeCom、Weixin OC 目前没有平台内确认按钮，仍需走 Admin/WebUI。
- pending action 默认 10 分钟过期。
- 工具级 allow/deny list 还未独立建表，目前通过权限等级、scope 和 high-risk 标记控制。
- rate limit 和 time window 尚未实现。

## 相关文档

- [安全与权限](SECURITY_AND_PERMISSIONS.md)
- [Admin WebUI](ADMIN_WEBUI.md)
- [architecture/TOOLS_AND_BOUNDARIES.md](architecture/TOOLS_AND_BOUNDARIES.md)
