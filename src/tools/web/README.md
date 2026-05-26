# Web Tools

## 概览

`web.fetch_page` 打开公网 HTTP(S) URL 并抽取可读文本。它通常在 `search.web` 之后使用，用于核验搜索结果、读取细节或生成引用依据。工具通过 `urls` 一次传入 1 到 10 个页面，单页读取也使用只包含一个 URL 的数组。

## 权限

该工具是只读工具，使用现有 `web:search` scope。

## 安全边界

工具会阻断 localhost 和私有 IP URL，并限制返回内容大小。

## 相关文档

- [../../../docs/architecture/TOOLS_AND_BOUNDARIES.md](../../../docs/architecture/TOOLS_AND_BOUNDARIES.md)
