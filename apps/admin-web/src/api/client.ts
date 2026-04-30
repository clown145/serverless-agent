import type {
  ApiResult,
  PendingAction,
  PermissionPolicy,
  RunDetails,
  RunListItem,
  Schedule,
  VfsEntry,
  VfsFile
} from "./types";

export type AdminClient = ReturnType<typeof createAdminClient>;

export function createAdminClient(getToken: () => string) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    const token = getToken().trim();

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(path, { ...init, headers });
    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? data.message ?? response.statusText);
    }

    return data as T;
  }

  return {
    sendMessage: (body: { text: string; agentId?: string; conversationId?: string }) => {
      return request<ApiResult<{ eventId: string; result?: { runId?: string } }>>(
        "/admin/messages",
        {
          method: "POST",
          body: JSON.stringify({
            ...body,
            platform: "webui",
            mode: "sync"
          })
        }
      );
    },
    listRuns: () => request<ApiResult<{ runs: RunListItem[] }>>("/admin/runs?limit=30"),
    getRun: (runId: string) => request<ApiResult<RunDetails>>(`/admin/runs/${runId}`),
    listVfs: (path: string) => {
      return request<ApiResult<{ entries: VfsEntry[] }>>(
        `/admin/vfs?path=${encodeURIComponent(path)}`
      );
    },
    readVfsFile: (path: string) => {
      return request<ApiResult<{ file: VfsFile }>>(
        `/admin/vfs?mode=file&path=${encodeURIComponent(path)}`
      );
    },
    writeVfsFile: (body: { path: string; content: string; mimeType?: string }) => {
      return request<ApiResult<{ entry: VfsEntry }>>("/admin/vfs", {
        method: "PUT",
        body: JSON.stringify(body)
      });
    },
    listSchedules: () => request<ApiResult<{ schedules: Schedule[] }>>("/admin/schedules"),
    createSchedule: (body: { text: string; delaySeconds: number; intervalSeconds?: number }) => {
      return request<ApiResult<{ schedule: Schedule }>>("/admin/schedules", {
        method: "POST",
        body: JSON.stringify(body)
      });
    },
    cancelSchedule: (id: string) => {
      return request<ApiResult<{ cancelled: boolean }>>(`/admin/schedules/${id}`, {
        method: "DELETE"
      });
    },
    listPendingActions: () => {
      return request<ApiResult<{ actions: PendingAction[] }>>("/admin/pending-actions");
    },
    confirmPendingAction: (id: string) => {
      return request<ApiResult<{ result: unknown }>>(`/admin/pending-actions/${id}/confirm`, {
        method: "POST"
      });
    },
    listPolicies: () => {
      return request<ApiResult<{ policies: PermissionPolicy[] }>>("/admin/permission-policies");
    },
    createPolicy: (body: {
      subjectType: PermissionPolicy["subjectType"];
      subjectId: string;
      maxLevel: number;
      scopes: string[];
    }) => {
      return request<ApiResult<{ policy: PermissionPolicy }>>("/admin/permission-policies", {
        method: "POST",
        body: JSON.stringify(body)
      });
    },
    deletePolicy: (id: string) => {
      return request<ApiResult<{ deleted: boolean }>>(`/admin/permission-policies/${id}`, {
        method: "DELETE"
      });
    }
  };
}
