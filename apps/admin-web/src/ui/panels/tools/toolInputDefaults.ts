import type { ToolCatalogItem } from "../../../api/types";

export type ToolInputExampleText = {
  buttonPrompt?: string;
  buttonContinueLabel?: string;
  buttonContinueText?: string;
  buttonRemindLabel?: string;
  buttonRemindText?: string;
  scheduleTitle?: string;
  scheduleText?: string;
};

function toolExamples(text: ToolInputExampleText = {}): Record<string, Record<string, unknown>> {
  return {
    "search.web": {
      query: "Cloudflare Workers serverless agent",
      maxResults: 3
    },
    "web.fetch_page": {
      urls: ["https://workers.cloudflare.com", "https://developers.cloudflare.com/workers/"],
      maxChars: 6000,
      includeLinks: false
    },
    "http.request": {
      url: "https://api.github.com/repos/cloudflare/workers-sdk",
      method: "GET",
      headers: {
        accept: "application/json"
      },
      query: {},
      bodyType: "none",
      maxBytes: 20000
    },
    "vfs.list_dir": {
      path: "/"
    },
    "vfs.read_file": {
      path: "/skills"
    },
    "vfs.write_file": {
      path: "/notes/example.md",
      content: "",
      mimeType: "text/markdown"
    },
    "vfs.mkdir": {
      path: "/workspace/notes"
    },
    "vfs.delete": {
      path: "/workspace/notes/example.md",
      recursive: false
    },
    "vfs.move": {
      fromPath: "/workspace/notes/example.md",
      toPath: "/workspace/notes/renamed.md"
    },
    "vfs.search": {
      path: "/",
      query: "todo",
      limit: 10
    },
    "vfs.command": {
      command: "ls /",
      cwd: "/"
    },
    "messaging.send_message": {
      platform: "webui",
      conversationId: "tool-debug",
      text: "test"
    },
    "messaging.send_file": {
      platform: "telegram",
      conversationId: "telegram:123456",
      source: {
        type: "vfs",
        path: "/workspace/report.md"
      },
      caption: "report"
    },
    "messaging.send_image": {
      platform: "telegram",
      conversationId: "telegram:123456",
      source: {
        type: "url",
        url: "https://example.com/image.jpg"
      },
      caption: "image"
    },
    "telegram.send_file": {
      source: {
        type: "vfs",
        path: "/workspace/report.md"
      },
      caption: "report"
    },
    "telegram.send_image": {
      source: {
        type: "url",
        url: "https://example.com/image.jpg"
      },
      caption: "image"
    },
    "weixin_oc.send_file": {
      source: {
        type: "vfs",
        path: "/workspace/report.md"
      },
      caption: "report"
    },
    "weixin_oc.send_image": {
      source: {
        type: "url",
        url: "https://example.com/image.jpg"
      },
      caption: "image"
    },
    "messaging.send_buttons": {
      platform: "telegram",
      conversationId: "telegram:123456",
      text: text.buttonPrompt ?? "Choose an option",
      buttons: [
        {
          label: text.buttonContinueLabel ?? "Continue",
          action: "agent.message",
          payload: { text: text.buttonContinueText ?? "Continue" }
        },
        {
          label: text.buttonRemindLabel ?? "Remind later",
          action: "agent.message",
          payload: { text: text.buttonRemindText ?? "Remind me later" }
        }
      ],
      layout: { columns: 2 }
    },
    "schedule.create": {
      title: text.scheduleTitle ?? "Follow up",
      text: text.scheduleText ?? "Summarize the current status and remind me of the next step",
      delaySeconds: 3600
    },
    "schedule.list": {
      statuses: ["active"],
      limit: 10,
      includeText: true
    },
    "schedule.pause": {
      scheduleId: "sch_..."
    },
    "schedule.resume": {
      scheduleId: "sch_..."
    },
    "schedule.cancel": {
      scheduleId: "sch_..."
    },
    "schedule.run_now": {
      scheduleId: "sch_..."
    }
  };
}

export function createToolInputDraft(
  tool?: ToolCatalogItem,
  exampleText: ToolInputExampleText = {}
): Record<string, unknown> {
  if (!tool) {
    return {};
  }

  return toolExamples(exampleText)[tool.name] ?? draftFromSchema(tool.inputSchema);
}

function draftFromSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const properties = asRecord(schema.properties);
  const required = Array.isArray(schema.required) ? schema.required : [];

  return required.reduce<Record<string, unknown>>((draft, key) => {
    if (typeof key === "string") {
      draft[key] = defaultValue(properties[key]);
    }
    return draft;
  }, {});
}

function defaultValue(schema: unknown): unknown {
  const item = asRecord(schema);
  if (Array.isArray(item.enum) && item.enum.length > 0) {
    return item.enum[0];
  }

  switch (item.type) {
    case "boolean":
      return false;
    case "integer":
    case "number":
      return item.minimum ?? 0;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
