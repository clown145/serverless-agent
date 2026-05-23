# WeCom Adapter

负责企业微信客服回调、解密、标准化和下行消息。

支持能力：

- `/webhooks/wecom/:webhookSecret` URL 验证和消息回调。
- 企业微信 XML callback 解密。
- 客服消息拉取与标准化。
- 文本出站。
- WebUI integration 创建、凭据测试和客服联系入口生成。

密钥保存在 platform integration / credential 表中。adapter 不运行 agent 逻辑，只负责企业微信协议和内部消息协议转换。
