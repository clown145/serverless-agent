# Web Tools

`web.fetch_page` opens a public HTTP(S) URL and extracts readable text. It is intended to be used after `search.web` when the agent needs to verify a search result, read details, or cite a page before answering.

The tool is read-only, uses the existing `web:search` scope, and blocks localhost/private IP URLs.

