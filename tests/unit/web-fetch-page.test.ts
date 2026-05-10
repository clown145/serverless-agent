import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebTools } from "../../src/tools/web/tools";
import type { ToolExecutionContext } from "../../src/tools/types";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("web.fetch_page", () => {
  it("fetches an HTML page and extracts readable content", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        `<!doctype html>
        <html>
          <head>
            <title>Example &amp; Page</title>
            <meta name="description" content="A useful page">
          </head>
          <body>
            <script>ignored()</script>
            <h1>Hello</h1>
            <p>Readable content</p>
            <a href="/next">Next page</a>
          </body>
        </html>`,
        { headers: { "content-type": "text/html" } }
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeFetchPage({
      url: "https://example.com/docs",
      includeLinks: true,
      maxChars: 2000
    });

    expect(result.status).toBe("success");
    expect(result.output).toMatchObject({
      title: "Example & Page",
      description: "A useful page",
      text: expect.stringContaining("Readable content"),
      links: [
        {
          text: "Next page",
          url: "https://example.com/next"
        }
      ]
    });
  });

  it("rejects localhost URLs before fetching", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeFetchPage({
      url: "http://localhost/admin"
    });

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "invalid_url"
      }
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function executeFetchPage(input: unknown) {
  const tool = createWebTools()[0];
  return tool.execute({
    env: {},
    agentId: "default",
    actorId: "tester",
    runId: "run",
    stepId: "step",
    input
  } as ToolExecutionContext);
}
