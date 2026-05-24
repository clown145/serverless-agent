# 工具与边界

## 概览

工具是 agent 能力的唯一执行入口。模型不能直接操作外部系统、平台 API、VFS 或密钥，只能提出结构化 tool call。

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

工具必须声明：

- name；
- input schema；
- output schema；
- required permissions；
- side effect；
- idempotency behavior；
- timeout；
- audit behavior。

## VFS 边界

VFS 工具只能访问 agent 的虚拟工作区，不访问 Worker 本地文件系统。

允许：

- 列目录；
- 读取文件；
- 写入文件；
- 移动或删除 VFS 路径；
- 使用受限的 `vfs.command`。

不允许：

- 执行真实 shell；
- 访问宿主机文件；
- 越过 agent root；
- 绕过 VFS revision 和 audit log。

## Git 边界

Cloudflare Worker 不执行真实 `git pull`。Git 能力通过 GitHub/GitLab API 工具实现。

支持方向：

- 拉取 repo tree；
- 读取文件内容；
- 同步 skills 到 VFS；
- 对比 commit sha；
- 创建 commit 或 PR。

不支持：

- 本地 checkout；
- 本地 merge/rebase；
- 任意 shell hook；
- 大型仓库完整构建。

## 邮件边界

入站邮件可以通过 Cloudflare Email Routing / Email Workers 触发 agent。

出站邮件作为 `email` 工具接入：

- 可接 Cloudflare Email Service 或第三方邮件 API；
- 默认属于高权限工具；
- 新收件人、附件和批量发送应要求确认或白名单。

## 搜索和 HTTP 边界

搜索分三类：

- 本地搜索：D1、对象存储、VFS、消息记录。
- 指定源搜索：RSS、指定 URL、指定 API。
- 通用 Web 搜索：外部搜索 API。

`http.request` 是高权限通用 HTTP 工具。它可以访问公网 API，但必须阻断 localhost、私有 IP、IPv6 本地地址和重定向后的私网目标。

## 平台消息边界

`messaging.*` 工具暴露通用消息发送能力，具体平台 payload 由 outbound adapter 处理。

工具层不应包含 Telegram、QQ、WeCom、Weixin OC 的协议细节；平台格式差异应在 adapter 或 platform capability 层处理。

## 相关文档

- [../PERMISSIONS_RUNTIME.md](../PERMISSIONS_RUNTIME.md)
- [../../specs/tool-contract.md](../../specs/tool-contract.md)
- [../../src/tools/README.md](../../src/tools/README.md)
