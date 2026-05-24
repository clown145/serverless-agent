# HTTP Tools

## 概览

`http.request` 提供结构化 HTTP(S) 请求能力，用于需要 curl-like 灵活性的公网 API 调用。

## 支持能力

- `GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`HEAD`。
- JSON、text、URL-encoded form、multipart、base64 或空 request body。
- multipart file source：VFS、message attachments、public URLs 或 base64 data。
- encrypted cookie jars，支持 disabled、send、store、send-and-store。
- 手动跟随 redirects，并在每次跳转前重新校验目标 URL。
- 截断 response body，并只返回安全 header 子集。

## 安全边界

工具会阻断：

- localhost；
- 私有 IPv4 range；
- IPv6 local range；
- mapped private address；
- 重定向后的私网目标。

权限等级为 level 4，scope 为 `http:request`。

## 相关文档

- [../../../docs/SECURITY_AND_PERMISSIONS.md](../../../docs/SECURITY_AND_PERMISSIONS.md)
- [../../../docs/architecture/TOOLS_AND_BOUNDARIES.md](../../../docs/architecture/TOOLS_AND_BOUNDARIES.md)
