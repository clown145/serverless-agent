# Messaging Tools

## 概览

`messaging` 暴露平台消息发送工具。工具层提供通用消息能力，具体平台 payload 由 outbound adapter 构造。

## 工具

- `messaging.send_message`：发送文本消息。
- `messaging.send_file`：从 VFS、message attachment 或 public URL 发送文件。
- `messaging.send_image`：从 VFS、message attachment 或 public URL 发送图片。
- `messaging.send_buttons`：发送交互按钮，平台不支持时返回 capability error。

## 边界

- 所有外发消息都必须经过权限检查和 audit。
- 工具层不包含 Telegram、QQ、WeCom、Weixin OC 的协议 payload 细节。
- 平台能力差异由 outbound adapter 和 platform availability 处理。

## 相关文档

- [../../../docs/PERMISSIONS_RUNTIME.md](../../../docs/PERMISSIONS_RUNTIME.md)
- [../../../docs/architecture/TOOLS_AND_BOUNDARIES.md](../../../docs/architecture/TOOLS_AND_BOUNDARIES.md)
