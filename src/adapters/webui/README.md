# WebUI Adapter

WebUI 是受 admin API 保护的本地控制台入口，但进入 agent 后仍然转换成通用 `InternalMessage`。

它和 Telegram、QQ、Webhook 共用后续 agent pipeline，只在平台标识和会话 ID 上区分来源。
