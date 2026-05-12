# Permissions Runtime

权限运行时负责回答两个问题：

- 当前 actor 是否有资格调用某个工具。
- 如果工具有高风险副作用，是否要先暂停并等待人工确认。

## Storage

`infra/cloudflare/migrations/0003_permissions.sql` 新增两张 D1 表：

- `permission_policies`: 显式权限策略。
- `pending_actions`: 等待确认的工具调用。

策略内容不会写进 VFS。VFS 可以保存 skill 和工作区文件，但权限必须放在 D1 里，便于查询、撤销和审计。

## Default Policy

没有显式策略时，运行时使用保守默认值：

| Actor | Max level | Scopes |
| --- | ---: | --- |
| `scheduler` | 3 | `workspace:read`, `workspace:write`, `message:send`, `web:search`, `schedule:read`, `schedule:write` |
| role `owner` / `admin` | 4 | `workspace:read`, `workspace:write`, `message:send`, `web:search`, `schedule:read`, `schedule:write` |
| role `member` | 2 | `workspace:read`, `workspace:write` |
| unknown | 1 | `workspace:read` |

显式策略会与默认策略合并：`maxLevel` 取最高值，`scopes` 取并集。这样可以按 user、role、platform、conversation 或 agent 单独加权限。

## Policy Subjects

当前支持这些 subject：

- `agent`: 针对某个 agent。
- `user`: 针对触发者 ID。
- `role`: 针对 `owner`、`admin`、`member` 等角色。
- `platform`: 针对 `telegram`、`qq`、`admin` 等入口。
- `conversation`: 针对私聊、群聊或线程。

## Admin APIs

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

查看等待确认的动作：

```bash
curl -sS http://localhost:8787/admin/pending-actions
```

确认并执行：

```bash
curl -sS -X POST http://localhost:8787/admin/pending-actions/act_.../confirm
```

如果配置了 `INTERNAL_ADMIN_TOKEN`，这些 API 都需要 `Authorization: Bearer <token>`。

## Confirmation Flow

工具会先经过权限策略检查。通过策略后，如果满足任一条件，则不会立即执行：

- `permission.level >= 5`
- `permission.confirmationRequired === true`
- `sideEffect === "dangerous"`

运行时会创建一条 `pending_actions` 记录，工具调用结果返回：

```json
{
  "status": "needs_confirmation",
  "output": {
    "pendingActionId": "act_..."
  }
}
```

管理员确认后，系统会使用原始工具名、输入和触发者上下文重新执行该工具，并写回 `pending_actions.result_json` 或 `pending_actions.error_code`。

## Current Limits

- 现在的确认入口只支持 admin API；Telegram/QQ 内联确认按钮还没有接入。
- pending action 默认 10 分钟过期。
- 工具级 allow/deny list 还没独立建表，目前用权限等级、scope 和 high-risk 标记控制。
- 尚未实现 rate limit 和 time window。
