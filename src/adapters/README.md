# Adapters

## 概览

`adapters` 是平台协议适配层。它把 Telegram、QQ、WeCom、Weixin OC、WebUI/Admin 等入口转换成统一的 `InternalMessage`，并把通用 outbound request 转成平台 API 调用。

## 职责

- 校验 webhook secret 或平台签名。
- 解密平台 callback。
- 标准化入站 payload。
- 构造平台出站请求。
- 处理平台能力差异，例如文件、图片、按钮和 typing。

## 当前平台

| 路径           | 平台                                                     |
| -------------- | -------------------------------------------------------- |
| `telegram/`    | Telegram Bot API webhook 和出站消息。                    |
| `qq/official/` | QQ Official Gateway mode 和 webhook mode。               |
| `wecom/`       | 企业微信客服 callback 和下行。                           |
| `weixin-oc/`   | Weixin OC / WeChat Personal 扫码登录、long-poll 和下行。 |
| `webui/`       | 浏览器管理端入口。                                       |
| `admin/`       | curl、脚本和本地调试入口。                               |

## 边界

Adapters 不运行模型、不执行工具、不判断权限策略，也不直接修改 agent run 状态。

## 相关文档

- [../../docs/architecture/PLATFORM_INTEGRATIONS.md](../../docs/architecture/PLATFORM_INTEGRATIONS.md)
- [../../specs/internal-message.md](../../specs/internal-message.md)
