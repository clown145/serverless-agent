# Observability

## 概览

`observability` 放 audit log、debug log、run trace 和 metrics 相关代码。

## 职责

- 记录工具调用前后的 audit log。
- 记录 run 和 step trace。
- 统一 error reporting 字段。
- 处理 cost/usage 等运行指标。
- 对敏感字段做脱敏或摘要化。

## 边界

业务模块不应各自定义日志格式。这里也不决定业务流程，不保存 secret 明文。

## 相关文档

- [../../docs/SECURITY_AND_PERMISSIONS.md](../../docs/SECURITY_AND_PERMISSIONS.md)
