import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebTools } from "../../src/tools/web/tools";
import type { ToolExecutionContext } from "../../src/tools/types";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("web.fetch_page", () => {
  it("fetches a single page through urls and extracts readable content", async () => {
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
      urls: ["https://example.com/docs"],
      includeLinks: true,
      maxChars: 2000
    });

    expect(result.status).toBe("success");
    expect(result.output).toMatchObject({
      failedCount: 0,
      pages: [
        {
          title: "Example & Page",
          description: "A useful page",
          text: expect.stringContaining("Readable content"),
          links: [
            {
              text: "Next page",
              url: "https://example.com/next"
            }
          ]
        }
      ]
    });
  });

  it("rejects localhost URLs before fetching", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeFetchPage({
      urls: ["http://localhost/admin"]
    });

    expect(result).toMatchObject({
      status: "failed",
      output: {
        failedCount: 1,
        pages: [
          {
            url: "http://localhost/admin",
            error: {
              code: "invalid_url"
            }
          }
        ]
      },
      error: {
        code: "fetch_failed"
      }
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches multiple pages in one tool call", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      return new Response(
        `<!doctype html>
        <html>
          <head><title>${url}</title></head>
          <body><p>Body for ${url}</p></body>
        </html>`,
        { headers: { "content-type": "text/html" } }
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeFetchPage({
      urls: ["https://example.com/a", "https://example.com/b"],
      maxChars: 2000
    });

    expect(result.status).toBe("success");
    expect(result.output).toMatchObject({
      failedCount: 0,
      pages: [
        {
          url: "https://example.com/a",
          title: "https://example.com/a",
          text: expect.stringContaining("Body for https://example.com/a")
        },
        {
          url: "https://example.com/b",
          title: "https://example.com/b",
          text: expect.stringContaining("Body for https://example.com/b")
        }
      ]
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps batch fetch results for valid URLs when one URL is blocked", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("<html><body>Public page</body></html>", {
        headers: { "content-type": "text/html" }
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeFetchPage({
      urls: ["https://example.com/public", "http://localhost/admin"],
      maxChars: 2000
    });

    expect(result.status).toBe("success");
    expect(result.output).toMatchObject({
      failedCount: 1,
      pages: [
        {
          url: "https://example.com/public",
          text: expect.stringContaining("Public page")
        },
        {
          url: "http://localhost/admin",
          error: {
            code: "invalid_url"
          }
        }
      ]
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps batch fetch results when one request throws", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/timeout")) {
        throw new Error("network timeout");
      }

      return new Response("<html><body>Public page</body></html>", {
        headers: { "content-type": "text/html" }
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeFetchPage({
      urls: ["https://example.com/public", "https://example.com/timeout"],
      maxChars: 2000
    });

    expect(result.status).toBe("success");
    expect(result.output).toMatchObject({
      failedCount: 1,
      pages: [
        {
          url: "https://example.com/public",
          text: expect.stringContaining("Public page")
        },
        {
          url: "https://example.com/timeout",
          error: {
            code: "fetch_error",
            message: "network timeout",
            retryable: true
          }
        }
      ]
    });
  });

  it("rejects batches with more than ten URLs", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeFetchPage({
      urls: Array.from({ length: 11 }, (_, index) => `https://example.com/${index}`)
    });

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "invalid_input"
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
