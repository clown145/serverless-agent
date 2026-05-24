# Email Tools

## 概览

`email` 目录记录邮件工具边界。邮件能力分为 inbound 和 outbound。

## 职责

- inbound：通过 Email Routing / Email Workers 触发 agent。
- outbound：通过受控工具发送邮件。

## 边界

出站邮件默认是高权限操作。新收件人、附件、批量发送和敏感内容应要求确认或白名单。

## 相关文档

- [../../../docs/architecture/TOOLS_AND_BOUNDARIES.md](../../../docs/architecture/TOOLS_AND_BOUNDARIES.md)
