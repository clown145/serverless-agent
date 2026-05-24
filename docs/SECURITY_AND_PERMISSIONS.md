# 安全与权限

## 概览

本项目默认假设 agent 可能拥有高权限，因此安全设计属于核心运行时，不是后期补丁。

核心原则：

- 模型不直接接触密钥。
- 模型不直接调用外部 API。
- 所有 tool call 必须经过权限检查。
- 所有副作用必须写 audit log。
- 高风险操作必须可暂停、可确认、可回放。
- 每个平台、用户、角色和 conversation 可以有独立权限。

## 权限等级

```text
level 0: read_context
  读取当前消息、公开配置和无敏感上下文。

level 1: read_workspace
  读取 VFS 文件、skills、长期记忆和历史消息摘要。

level 2: write_workspace
  写入 notes、tasks、artifacts 和 memory。

level 3: communicate
  向 Telegram、QQ、WeCom、Weixin OC、Webhook、WebUI/Admin 发送消息或创建提醒。

level 4: external_api
  调用外部 API，例如邮件、GitHub、搜索和第三方服务。

level 5: dangerous
  删除数据、批量发送、修改权限、更新 skill、写 GitHub commit 或发送敏感邮件。
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

权限策略至少需要考虑：

- `actor`：谁触发了操作。
- `agent_id`：哪个 agent 执行。
- `platform`：Telegram、QQ、WeCom、Weixin OC、Webhook、WebUI 或 Admin。
- `conversation_id`：私聊、群聊或线程。
- `tool_name`：请求的工具。
- `permission_level`：工具所需等级。
- `resource`：被操作资源。
- `time_window`：是否允许当前时间执行。
- `rate_limit`：调用频率限制。

## 高风险操作

以下操作默认需要确认或白名单：

- 群发消息；
- 删除 VFS 文件或记忆；
- 修改权限配置；
- 安装或更新 skill；
- 发送邮件到新收件人；
- 写 GitHub commit 或 PR；
- 调用未知 HTTP endpoint；
- 读取敏感 secret。

## 密钥管理

密钥只允许存在于：

- Cloudflare secrets；
- GitHub Actions secrets；
- 加密后的配置存储；
- 本地 `.dev.vars`。

禁止：

- 提交到 git；
- 写入对象存储明文文件；
- 写入普通日志；
- 放进模型上下文。

## Audit Log

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

## Prompt Injection

外部内容进入模型前必须标注来源：

```text
source: user_message | web_page | email | telegram | qq | wecom | weixin_oc | webui | vfs | tool_result
trust_level: trusted | user_controlled | external_untrusted
```

外部内容不能覆盖系统策略、权限策略或工具 schema。

## VFS 安全

VFS 路径规则：

- 必须以 `/` 开头；
- 禁止空字节；
- 工具 API 禁止 `..`；
- 不能越过 agent root；
- 每个 agent 的文件隔离；
- skill 目录和 workspace 目录权限分离。

## 网络访问

通用 HTTP 工具属于高权限工具。当前实现包含 `http.request`，它允许访问公网 API，但会阻断 localhost、私有 IPv4、IPv6 本地地址和重定向后的私网目标。

`http.request` 权限等级为 level 4，scope 为 `http:request`。

## 当前实现

运行时代码已经实现：

- 默认角色策略；
- D1-backed `permission_policies` 显式策略；
- `pending_actions` 高风险工具确认记录；
- admin API 创建、查看、删除策略；
- admin API 查看并确认 pending action；
- Telegram inline button 确认/拒绝 pending action。

具体接口见 [PERMISSIONS_RUNTIME.md](PERMISSIONS_RUNTIME.md)。
