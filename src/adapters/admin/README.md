# Admin Adapter

## 概览

Admin adapter 处理来自脚本、curl 和本地调试流程的管理端消息。它和 WebUI adapter 一样，会规范化成 `InternalMessage`。

## 职责

- 生成稳定的 admin conversation ID。
- 标准化 `/admin/messages` 输入。
- 保留 operator 语义，供权限系统区分 `platform:admin`。

## 边界

浏览器控制台优先使用 WebUI adapter。Admin adapter 不调用外部平台 API，也不绕过 Queue、Agent、Tool 和 Permission 流程。
