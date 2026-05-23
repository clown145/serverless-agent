# Adapters

平台适配层。

每个平台一个子目录，例如：

```text
telegram/
qq/
wecom/
weixin-oc/
webui/
admin/
```

adapter 只负责平台协议和内部协议互转，不做 agent 决策。

当前外部平台：

- `telegram`: Telegram Bot API webhook、出站消息、文件/图片、inline buttons。
- `qq`: QQ 官方机器人。`official/` 下同时支持 Gateway DO 和官方 Webhook 两种接入模式。
- `wecom`: 企业微信客服回调和下行。
- `weixin-oc`: Weixin OC / WeChat Personal 扫码登录、长轮询和下行。

`webui` 和 `admin` 是本地管理入口，仍然标准化成 `InternalMessage`，但不调用外部平台 API。
