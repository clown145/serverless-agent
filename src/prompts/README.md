# Prompts

Prompt defaults live in `src/prompts/defaults` as Markdown files. Runtime code imports generated TypeScript from `src/prompts/generated.ts`; it never reads prompt files from D1, Durable Objects, or the VFS.

To customize prompts in a fork, add a Markdown file with the same relative path under `src/prompts/overrides`. For example:

```text
src/prompts/overrides/agent/base.md
```

Overrides are applied at build time by `npm run prompts:build`. Prefer overrides over editing defaults directly, because upstream updates may change files under `defaults`.
