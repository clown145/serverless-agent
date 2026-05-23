# Weixin OC / WeChat Personal Adapter

负责 Weixin OC / WeChat Personal 的扫码登录、长轮询、入站媒体处理和下行消息。

运行模型：

- `WeixinOcGatewayDurableObject` 管理二维码登录、轮询和发送。
- 登录 token 加密保存到 D1 credential 表。
- `syncBuf`、`accountId`、`contextTokens` 等运行状态保存在 DO storage。
- DO Alarm 负责轮询登录状态和增量消息。

支持能力：

- WebUI 创建 integration。
- `/login/start` 获取二维码并轮询确认。
- `/connect` 启动长轮询。
- 文本、文件、图片、typing 出站。
- 入站图片下载、解密，并写入当前对象存储后端。

发送给某个微信用户前，系统需要先收到该用户的一条消息，以便记录 `context_token`。
