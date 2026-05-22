# Security And Permissions

这个项目默认假设 agent 可能拥有高权限，所以安全设计是核心模块，不是后期补丁。

## 基本安全原则

- 模型不直接接触密钥。
- 模型不直接调用外部 API。
- 所有 tool call 必须经过权限检查。
- 所有副作用必须写审计日志。
- 高风险操作必须可暂停、可确认、可回放。
- 每个平台、每个用户、每个群可以有独立权限。

## 权限等级

```text
level 0: read_context
  读取当前消息、公开配置、无敏感上下文。

level 1: read_workspace
  读取 VFS 文件、skills、长期记忆、历史消息摘要。

level 2: write_workspace
  写入 notes、tasks、artifacts、memory。

level 3: communicate
  向 Telegram、QQ、Webhook 发送消息或创建提醒。

level 4: external_api
  调用外部 API，例如邮件、GitHub、搜索、第三方服务。

level 5: dangerous
  删除数据、批量发送、修改权限、更新 skill、写 GitHub commit、发送敏感邮件。
```

## Tool Call 流程

```text
model proposes tool call
-> validate schema
-> resolve actor and target
-> load policy
-> check permission
-> create audit pre-record
-> execute tool
-> save result
-> append audit final-record
-> return ToolResult to agent
```

任何一步失败都必须有明确状态。

## 策略维度

权限策略至少包含：

- `actor`: 谁触发了操作。
- `agent_id`: 哪个 agent 执行。
- `platform`: Telegram、QQ、Webhook、Admin。
- `conversation_id`: 私聊、群聊或线程。
- `tool_name`: 请求的工具。
- `permission_level`: 工具所需等级。
- `resource`: 被操作资源。
- `time_window`: 是否允许当前时间执行。
- `rate_limit`: 调用频率。

## 高风险操作

以下操作默认需要确认或白名单：

- 群发消息。
- 删除 VFS 文件或记忆。
- 修改权限配置。
- 安装或更新 skill。
- 发送邮件到新收件人。
- 写 GitHub commit 或 PR。
- 调用未知 HTTP endpoint。
- 读取敏感 secret。

## 密钥管理

密钥只允许存在于：

- Cloudflare Secrets。
- 加密后的配置存储。
- 本地 `.dev.vars`。

禁止：

- 提交到 git。
- 写入 R2 明文文件。
- 写入普通日志。
- 交给模型上下文。

## 审计日志

每次工具调用都要记录：

```text
audit_id
agent_id
run_id
step_id
actor
tool_name
permission_level
resource
input_summary
result_summary
status
error_code
created_at
completed_at
idempotency_key
```

敏感字段只记录摘要，不记录完整值。

## 防 prompt injection

外部内容进入模型前必须标注来源：

```text
source: user_message | web_page | email | qq_group | telegram | vfs | tool_result
trust_level: trusted | user_controlled | external_untrusted
```

外部内容不能覆盖系统策略、权限策略或工具 schema。

## VFS 安全

VFS 路径规则：

- 必须以 `/` 开头。
- 禁止 `..`。
- 禁止空字节。
- 禁止越过 agent 根目录。
- 每个 agent 的文件隔离。
- skill 目录和 workspace 目录权限分离。

## 网络访问

任意 HTTP 请求工具默认不开放。

第一版只允许：

- 明确注册的 API。
- 明确白名单域名。
- 明确工具 schema。

通用 HTTP 工具后续再加，并放到高权限等级。

当前实现包含 `http.request` 作为高权限通用 HTTP 工具。它对公网 API 开放，但会阻断 localhost、私有 IPv4、IPv6 本地地址和重定向后的私网目标；权限等级为 level 4，scope 为 `http:request`。

## 当前实现

运行时代码已经实现：

- 默认角色策略。
- D1-backed `permission_policies` 显式策略。
- `pending_actions` 高风险工具确认记录。
- admin API 创建、查看、删除策略。
- admin API 查看并确认 pending action。

具体接口和本地调试方式见 [PERMISSIONS_RUNTIME.md](PERMISSIONS_RUNTIME.md)。
