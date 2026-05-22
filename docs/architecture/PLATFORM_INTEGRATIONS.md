# Platform Integrations & Gateway Design

本项目是一个面向 Serverless 架构的 AI Agent 平台，在 Cloudflare 全家桶（Workers, Durable Objects, Queues）的限制与优势下，多平台消息收发与长连接维持采用了一套统一且互补的架构方案。

按消息的接收机制，接入平台可以划分为 **被动 Webhook 接收** 和 **主动长连接/拉取网关** 两大类。

---

## 1. 统一接入与事件分发模型

所有平台的消息不论何种来源，最终都需转换为平台无关的统一数据模型—— `InternalMessage`。

```text
+-----------------------+      +---------------------------+
| Telegram/Wecom        | ---> |  Worker HTTP webhook      | --+
+-----------------------+      +---------------------------+   |
                                                               |
+-----------------------+      +---------------------------+   |      +---------------------+
| QQ Official Gateway   | ---> |  Durable Object           | --+--->  | Cloudflare Queue    |
| (Active WebSocket)    |      |  (Message Dispatch)       |   |      | (AGENT_QUEUE)       |
+-----------------------+      +---------------------------+   |      +---------------------+
                                                               |                 |
+-----------------------+      +---------------------------+   |                 v
| Weixin OC Gateway     | ---> |  Durable Object           | --+      +---------------------+
| (HTTP Long Polling)   |      |  (Message Dispatch)       |          | Durable Object      |
+-----------------------+      +---------------------------+          | (Agent Brain DO)    |
                                                                      +---------------------+
```

- **第一阶段（数据面隔离）**：入口 Worker 或平台 Gateway Durable Object 只做基础的安全校验、消息标准化（Normalize），然后快速将 `InternalMessage` 投递至 `AGENT_QUEUE` 中。这一阶段不执行 LLM 运算或重型业务。
- **第二阶段（串行执行）**：队列消费者接收到事件，依据 `agentId` 将任务路由分发至对应专属的 `AgentDurableObject` 实例。这保证了单个 Agent 对话在并发环境下的串行执行和数据一致性。

---

## 2. 被动 Webhook 接收（Telegram / Wecom）

对于支持 HTTP 推送的平台，网关逻辑十分简单：
- **Telegram**：通过入口 Worker 的 `/webhooks/telegram` 路由接收推送。网关在 `telegram-webhook.ts` 中校验 Token 后，读取文本或附件。若发送失败会进行 Markdown/HTML 转纯文本回退，避免因模型输出非法 Markdown 导致下行消息丢包。
- **Wecom (企业微信)**：通过 Webhook API 接收企业微信回调。

---

## 3. 主动长连接网关（QQ 官方机器人 WebSocket）

由于 Cloudflare Workers 实例是临时且易逝的，无法维持长达数小时的 TCP/WebSocket 长连接，且无法自动维护会话鉴权心跳。因此，项目利用了 **Cloudflare Durable Objects** 的单例、持久化内存与 Alarms 特性来实现 WebSocket 主动网关。

### 3.1 实例化与会话维持
- 在 [wrangler.toml](file:///root/serverless-agent/wrangler.toml) 中声明了 `QQOfficialGatewayDurableObject`。
- 每个绑定的机器人（通过 `appId` 分片）拥有一个唯一的 Durable Object 物理单例实例，从而在其独立的内存空间中挂载并持有 `WebSocket` 连接句柄。

### 3.2 WebSocket 连接生命周期 (`gateway-session.ts`)
- **主动建连 (`connect`)**：网关在每次被唤醒或外部指令触发时，先调用 `/gateway/bot` 接口获取网关 Websocket 地址（WSS），然后实例化 `new WebSocket(gateway.url)`。
- **保活与心跳 (`startHeartbeat`)**：
  - 建立连接后，网关在接收到 QQ Gateway 的 `OpCode 10 (Hello)` 消息时，会提取其中约定的心跳间隔（`heartbeat_interval`）。
  - 使用 `setInterval` 在 Durable Object 的内存中维持后台心跳，周期性向 QQ 发送 `OpCode 1 (Heartbeat)` 帧。
- **鉴权与恢复 (`identifyOrResume`)**：
  - 如果是全新连接，网关向 QQ 发送 `OpCode 2 (Identify)` 并携带 AppID、Secret 和 intents（事件订阅标志）。
  - 若因为网络波动或 Cloudflare 节点漂移导致连接断开，网关在 `handleSocketClose` 中会保留 `sessionId` 和最后一次收到消息的序列号 `lastSeq`，写入 Durable Object Storage。重连时，会主动发送 `OpCode 6 (Resume)`，以此向 QQ 申请增量数据重传并无缝衔接会话。

### 3.3 消息转发
Durable Object 网关内的 `WebSocket.addEventListener("message")` 监听所有推送：
- 校验并丢弃心跳回复、状态 ACK 等非业务消息。
- 解析出业务消息（如私聊/群聊）后，转换为 `InternalMessage`，调用 `AGENT_QUEUE` 进行入队处理。

---

## 4. 主动拉取网关（微信公众号 & 个人微信 / Weixin OC HTTP 长轮询）

微信公众号（或小微机器人网关）使用类似腾讯 `iLink` 架构的同步更新接口。该接口不基于 WebSocket，而是使用增量更新的 **HTTP 长轮询 (Long Polling)** 机制。

> [!WARNING]
> **微信公众号部分未经真实环境测试 (WeChat Official Account Untested)**
> - **个人微信**：基于扫码登录的个人微信网关（通过腾讯 `iLink` 二维码及 Durable Object 状态轮询）已进行实际扫码登录与收发消息测试，确认功能可用。
> - **微信公众号**：由于微信公众号标准接口通常需要特定的企业资质、专属的 AppID 及特定回调域名配置，在开发中**没有可用的真实环境凭据**。因此，公众号的对接逻辑仅通过单元测试中的 Mock 进行验证，**未经真实生产或预发环境联调**。在部署公众号功能前，请务必进行小范围联调。

### 4.1 命名与映射关系 (Weixin OC 与 WeChat Personal)
- **内部实现标识**：在数据库、后端适配器注册表（如 `src/platforms/outbound/registry.ts`）以及 API 路由中，该平台统一标识为 `weixin_oc`（意为 Weixin Official Account）。
- **前端与工具命名**：在后台管理面板（Admin WebUI）、多语言配置（i18n 翻译）以及 AI Agent 使用的工具（如 `weixin_oc.send_file` 与 `weixin_oc.send_image`）中，该适配器被直观地命名为 **"WeChat Personal" (个人微信)**。
- **为何共享同套代码**：因为该适配器基于腾讯小微/微信 `iLink` 网关。取决于扫码登录时所使用的微信号属性（个人微信号辅助配置或特定的公众号关联），它既能作为个人微信助手的后台，也能对接公众号平台的消息收发。因此在代码层面统一整合在了 `weixin_oc` 模块中。

### 4.2 扫码登录与 Session 状态维持 (`weixin-oc-gateway-durable-object.ts`)
- 网关需要通过 `Durable Object Alarm` 机制轮询登录状态。
- **获取登录二维码**：网关在 `/login/start` 触发时，向微信服务器请求二维码内容（`qrcode` 以及 base64 的 `qrcode_img_content`），在 Storage 中保存包含过期时间的 `WeixinOcLoginSession`。
- **状态轮询 (Alarm 自循环)**：
  - 网关设置一个 DO Alarm（如隔 5 秒后唤醒），通过 `getQrCodeStatus` 长轮询询问微信用户是否扫码确认。
  - 用户确认登录后，网关在内存及本地 Storage 中存储并更新 `bot_token`，将状态改为已登录，进入后续消息轮询阶段。

### 4.3 基于 Durable Object Alarms 的长轮询自循环
由于 Worker 不支持长时间 `while(true)` 的阻塞长轮询（会超出 Worker 的 CPU 耗时与墙上时间限制），项目使用了 **Alarm 自循环** 技术：

```text
Durable Object Alarm 唤醒
         |
         v
  执行 pollOnce()
         |
         v
  调用 getUpdates() 阻塞长轮询 (HTTP POST) ----> [微信 iLink 服务器]
         | (等待增量消息返回，或超时)
         v
  - 成功：解析并发送到 AGENT_QUEUE；更新 syncBuf 状态游标。
  - 失败：记录错误日志到数据库。
         |
         v
  计算下一次唤醒延迟 (正常为 1000ms，失败为 5000ms)
         |
         v
  state.storage.setAlarm(nextTriggerTime) ----> (Durable Object 挂起，释放内存)
```

1. **增量状态同步**：调用 `getUpdates` 时，网关必须向服务器提交游标缓存字节 `syncBuf`。服务器通过这个字节识别本次要下发哪些增量新消息。
2. **状态更新**：微信服务器下发新消息并提供一个新的 `get_updates_buf` 游标。网关处理完毕后，将新的游标作为 `syncBuf` 写入 DO Storage（作为下次拉取凭据），以此完成增量确认。
3. **低延迟唤醒**：在 `pollOnce` 执行完毕且更新完游标后，网关立即调用 `setAlarm(Date.now() + 1000)` 以便 1 秒后自动再次进入拉取状态。如果中途发生超时或异常，网关会调度 5 秒后的 Alarm，实现退避避峰，防止由于接口故障导致服务器被无限次请求撞墙击穿。
