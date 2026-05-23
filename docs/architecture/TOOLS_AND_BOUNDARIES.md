# Tools And Boundaries

## Tool System

工具是 agent 能力的唯一执行入口。

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

工具必须声明：

- name。
- input schema。
- output schema。
- required permissions。
- idempotency behavior。
- audit behavior。

## Git 能力边界

Cloudflare Worker 不负责执行真实 `git pull`。Git 能力通过 GitHub/GitLab API 工具实现：

- 拉取 repo tree。
- 读取文件内容。
- 同步 skills 到 VFS。
- 对比 commit sha。
- 创建 commit 或 PR。

不支持：

- 本地 merge/rebase。
- 任意 shell hook。
- 复杂构建。
- 大型仓库完整 checkout。

## 邮件能力边界

入站邮件可以通过 Cloudflare Email Routing / Email Workers 触发 agent。

出站邮件作为 `email` 工具接入：

- 优先接 Cloudflare Email Service，若账号计划允许。
- 或接第三方邮件 API 的免费额度。
- 所有出站邮件默认属于高权限工具，需要策略检查。

## 搜索能力边界

搜索分三类：

- 本地搜索：D1/对象存储/VFS/消息记录。
- 指定源搜索：RSS、指定 URL、指定 API。
- 通用 Web 搜索：外部搜索 API。

第一版优先做本地搜索和指定源搜索。
