import type { Env } from "../../../shared/types/env";
import { QqOfficialApiClient } from "./api";
import { rememberQqOfficialConversation } from "./conversation-store";
import {
  createQqOfficialHeartbeatPayload,
  createQqOfficialIdentifyPayload,
  createQqOfficialResumePayload
} from "./gateway-payloads";
import { normalizeQqOfficialGatewayEvent } from "./normalize";
import {
  QQ_OPCODE,
  type QqOfficialGatewayPayload,
  type QqOfficialMessagePayload,
  type QqOfficialReadyPayload,
  type QqOfficialSessionState
} from "./types";

const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 10_000;
const STATUS_KEY = "qq_gateway_status";
const SESSION_KEY = "qq_gateway_session";

export type QqOfficialGatewaySessionOptions = {
  agentId: string;
  appId: string;
  secret: string;
  intent: number;
  isSandbox?: boolean;
};

export type QqOfficialGatewayStatus = QqOfficialSessionState & {
  appId: string;
  agentId: string;
  updatedAt: string;
};

export class QqOfficialGatewaySession {
  private websocket?: WebSocket;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private readonly api: QqOfficialApiClient;
  private session: QqOfficialSessionState;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
    private readonly options: QqOfficialGatewaySessionOptions
  ) {
    this.api = new QqOfficialApiClient({
      appId: options.appId,
      secret: options.secret,
      isSandbox: options.isSandbox
    });
    this.session = {
      shardId: 0,
      shardCount: 1,
      status: "idle"
    };
  }

  async ensureConnected(): Promise<QqOfficialGatewayStatus> {
    await this.restoreSession();
    if (
      this.websocket?.readyState === WebSocket.OPEN ||
      this.websocket?.readyState === WebSocket.CONNECTING
    ) {
      return this.status();
    }

    await this.connect();
    return this.status();
  }

  async close(): Promise<void> {
    this.clearTimers();
    this.session.status = "closed";
    await this.persistSession();
    this.websocket?.close(1000, "closed by serverless-agent");
    this.websocket = undefined;
  }

  status(): QqOfficialGatewayStatus {
    return {
      ...this.session,
      appId: this.options.appId,
      agentId: this.options.agentId,
      updatedAt: new Date().toISOString()
    };
  }

  private async connect(): Promise<void> {
    this.clearTimers();
    this.session.status = this.session.sessionId ? "resuming" : "connecting";
    await this.persistSession();

    const gateway = await this.api.getGatewayBot();
    this.session.shardId = 0;
    this.session.shardCount = Math.max(gateway.shards, 1);
    await this.persistSession();

    const websocket = new WebSocket(gateway.url);
    this.websocket = websocket;

    websocket.addEventListener("message", (event) => {
      void this.handleSocketMessage(event.data);
    });
    websocket.addEventListener("close", (event) => {
      void this.handleSocketClose(event.code, event.reason);
    });
    websocket.addEventListener("error", () => {
      void this.handleSocketError("QQ official gateway websocket error");
    });
  }

  private async handleSocketMessage(data: unknown): Promise<void> {
    const payload = parseGatewayPayload(data);
    if (!payload) {
      return;
    }

    if (typeof payload.s === "number" && payload.s > 0) {
      this.session.lastSeq = payload.s;
      await this.persistSession();
    }

    if (payload.op === QQ_OPCODE.hello) {
      await this.identifyOrResume();
      return;
    }

    if (payload.op === QQ_OPCODE.heartbeatAck) {
      this.session.lastHeartbeatAckAt = new Date().toISOString();
      this.session.status = "connected";
      await this.persistSession();
      return;
    }

    if (payload.op === QQ_OPCODE.reconnect) {
      this.scheduleReconnect(0);
      return;
    }

    if (payload.op === QQ_OPCODE.invalidSession) {
      this.session.sessionId = undefined;
      this.session.lastSeq = 0;
      this.scheduleReconnect(RECONNECT_DELAY_MS);
      await this.persistSession();
      return;
    }

    if (payload.op === QQ_OPCODE.dispatch) {
      await this.handleDispatch(payload);
    }
  }

  private async identifyOrResume(): Promise<void> {
    const token = await this.api.botToken();
    if (this.session.sessionId && this.session.lastSeq) {
      this.sendJson(
        createQqOfficialResumePayload({
          token,
          sessionId: this.session.sessionId,
          seq: this.session.lastSeq
        })
      );
      return;
    }

    this.sendJson(
      createQqOfficialIdentifyPayload({
        token,
        intents: this.options.intent,
        shardId: this.session.shardId,
        shardCount: this.session.shardCount
      })
    );
  }

  private async handleDispatch(payload: QqOfficialGatewayPayload): Promise<void> {
    if (payload.t === "READY") {
      const ready = payload.d as QqOfficialReadyPayload | undefined;
      this.session.sessionId = ready?.session_id;
      this.session.shardId = ready?.shard?.[0] ?? this.session.shardId;
      this.session.shardCount = ready?.shard?.[1] ?? this.session.shardCount;
      this.session.status = "connected";
      this.session.lastReadyAt = new Date().toISOString();
      this.startHeartbeat();
      await this.persistSession();
      return;
    }

    if (payload.t === "RESUMED") {
      this.session.status = "connected";
      this.startHeartbeat();
      await this.persistSession();
      return;
    }

    if (!payload.t || !payload.d) {
      return;
    }

    const normalized = normalizeQqOfficialGatewayEvent(
      payload.t,
      payload.d as QqOfficialMessagePayload,
      this.options.agentId
    );
    if (normalized.conversationBinding) {
      await rememberQqOfficialConversation(this.state.storage, normalized.conversationBinding);
    }
    if (!normalized.message) {
      return;
    }

    await this.env.AGENT_QUEUE.send({
      type: "inbound.message",
      eventId: crypto.randomUUID(),
      agentId: this.options.agentId,
      message: normalized.message,
      receivedAt: new Date().toISOString()
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    void this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      void this.sendHeartbeat();
    }, DEFAULT_HEARTBEAT_INTERVAL_MS);
  }

  private async sendHeartbeat(): Promise<void> {
    this.session.lastHeartbeatAt = new Date().toISOString();
    await this.persistSession();
    this.sendJson(createQqOfficialHeartbeatPayload(this.session.lastSeq));
  }

  private async handleSocketClose(code?: number, reason?: string): Promise<void> {
    this.clearTimers();
    this.websocket = undefined;
    this.session.status = "closed";
    this.session.lastError = reason || `gateway closed with code ${code ?? "unknown"}`;
    await this.persistSession();
    this.scheduleReconnect(RECONNECT_DELAY_MS);
  }

  private async handleSocketError(message: string): Promise<void> {
    this.session.status = "error";
    this.session.lastError = message;
    await this.persistSession();
    this.scheduleReconnect(RECONNECT_DELAY_MS);
  }

  private scheduleReconnect(delayMs: number): void {
    this.clearTimers();
    this.reconnectTimer = setTimeout(() => {
      void this.connect().catch((error) => {
        void this.handleSocketError(
          error instanceof Error ? error.message : "QQ official reconnect failed"
        );
      });
    }, delayMs);
    void this.state.storage.setAlarm(Date.now() + Math.max(delayMs, 60_000));
  }

  private sendJson(payload: QqOfficialGatewayPayload): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(payload));
    }
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private async restoreSession(): Promise<void> {
    const stored = await this.state.storage.get<QqOfficialSessionState>(SESSION_KEY);
    if (stored) {
      this.session = {
        ...this.session,
        ...stored,
        status: this.session.status === "idle" ? stored.status : this.session.status
      };
    }
  }

  private async persistSession(): Promise<void> {
    await this.state.storage.put(SESSION_KEY, this.session);
    await this.state.storage.put(STATUS_KEY, this.status());
  }
}

export async function getStoredQqOfficialGatewayStatus(
  storage: DurableObjectStorage
): Promise<QqOfficialGatewayStatus | undefined> {
  return storage.get<QqOfficialGatewayStatus>(STATUS_KEY);
}

function parseGatewayPayload(data: unknown): QqOfficialGatewayPayload | undefined {
  if (typeof data !== "string") {
    return undefined;
  }

  try {
    const payload = JSON.parse(data) as QqOfficialGatewayPayload;
    return typeof payload.op === "number" ? payload : undefined;
  } catch {
    return undefined;
  }
}
