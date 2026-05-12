# Messaging Tool

消息发送工具。

负责：

- `messaging.send_message`: 通用文本消息。
- `messaging.send_file`: 从 VFS、消息附件或公开 URL 发送文件。
- `messaging.send_image`: 从 VFS、消息附件或公开 URL 发送图片。
- `messaging.send_buttons`: 发送交互按钮，平台不支持时返回 capability error。

所有外发消息都必须经过权限检查和审计。

工具层只暴露通用能力，具体平台通过 outbound adapter 实现。Telegram 当前实现了文本、文件、图片和 inline keyboard callback。
