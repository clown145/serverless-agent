# WebUI Adapter

## 概览

WebUI adapter 处理浏览器管理端发送的消息。它把 `/admin/messages` 请求转换成 `platform:webui` 的 `InternalMessage`。

## 职责

- 生成 WebUI conversation ID。
- 标准化输入文本和 actor。
- 让 WebUI 消息进入同一套 Queue、Agent、Tool、Permission 和 Audit 流程。

## 边界

WebUI 出站消息写入本地 conversation history，不调用 Telegram、QQ、WeCom 或 Weixin OC API。

## 相关文档

- [../../../docs/ADMIN_WEBUI.md](../../../docs/ADMIN_WEBUI.md)
