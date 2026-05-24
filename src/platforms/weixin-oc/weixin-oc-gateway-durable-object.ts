import { errorResponse, jsonResponse } from "../../shared/http";
import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import type { InternalMessage } from "../../shared/types/internal-message";
import type { QueueMessageBody } from "../../shared/types/queue";
import {
  clearPlatformIntegrationCredential,
  updatePlatformIntegrationCheck
} from "../../storage/repositories/platform-integrations-repository";
import {
  pollWeixinOcGatewayLogin,
  startWeixinOcGatewayLogin
} from "./weixin-oc-gateway-login";
import { pollWeixinOcGatewayUpdates } from "./weixin-oc-gateway-polling";
import {
  sendWeixinOcGatewayMessage,
  sendWeixinOcGatewayTyping,
  type WeixinOcGatewaySendInput
} from "./weixin-oc-gateway-send";
import {
  clearWeixinOcLoginSession,
  clearWeixinOcRuntimeError,
  persistWeixinOcAccountState,
  recordWeixinOcRuntimeError,
  rememberWeixinOcGatewayTarget,
  requireWeixinOcGatewayConfig,
  resolveWeixinOcGatewayTarget
} from "./weixin-oc-gateway-state";
import {
  getWeixinOcGatewayStatus,
  type WeixinOcGatewayStatus
} from "./weixin-oc-gateway-status";

export class WeixinOcGatewayDurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId") ?? this.env.DEFAULT_AGENT_ID ?? "default";
    const integrationId = url.searchParams.get("integrationId") ?? undefined;

    try {
      if (request.method === "POST" && url.pathname === "/connect") {
        const status = await this.ensureRunning(agentId, integrationId);
        return jsonResponse({ ok: true, status });
      }

      if (request.method === "POST" && url.pathname === "/login/start") {
        const status = await this.startLogin(agentId, true, integrationId);
        return jsonResponse({ ok: true, status });
      }

      if (request.method === "POST" && url.pathname === "/disconnect") {
        await this.clearLoginState(agentId, integrationId);
        await clearWeixinOcLoginSession(this.state.storage);
        return jsonResponse({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/send") {
        const input = (await request.json().catch(() => ({}))) as WeixinOcGatewaySendInput;
        const result = await this.sendMessage(agentId, input, integrationId);
        return jsonResponse({ ok: result.ok, result }, { status: result.ok ? 200 : 400 });
      }

      if (request.method === "POST" && url.pathname === "/typing") {
        const input = (await request.json().catch(() => ({}))) as { userId?: string };
        await this.sendTyping(agentId, input.userId, integrationId);
        return jsonResponse({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/poll") {
        const status = await this.pollOnce(agentId, integrationId);
        return jsonResponse({ ok: true, status });
      }
    } catch (error) {
      return errorResponse(
        500,
        "weixin_oc_gateway_error",
        error instanceof Error ? error.message : "Weixin OC gateway failed"
      );
    }

    if (request.method === "GET" && url.pathname === "/status") {
      const status = await this.status(agentId, integrationId);
      return jsonResponse({ ok: true, status });
    }

    return errorResponse(404, "not_found", "Weixin OC gateway route not found");
  }

  async alarm(): Promise<void> {
    const target = await resolveWeixinOcGatewayTarget(
      this.state.storage,
      this.env.DEFAULT_AGENT_ID ?? "default"
    );
    await this.pollOnce(target.agentId, target.integrationId);
  }

  private async ensureRunning(
    agentId: string,
    integrationId?: string
  ): Promise<WeixinOcGatewayStatus> {
    const config = await this.requireConfig(agentId, integrationId);
    await rememberWeixinOcGatewayTarget(this.state.storage, agentId, config.integrationId);

    if (!config.token) {
      return this.startLogin(agentId, false, integrationId);
    }

    await this.schedulePoll(1_000);
    await clearWeixinOcRuntimeError(this.state.storage);
    return this.status(agentId, integrationId);
  }

  private async startLogin(
    agentId: string,
    forceRefresh: boolean,
    integrationId?: string
  ): Promise<WeixinOcGatewayStatus> {
    const config = await this.requireConfig(agentId, integrationId);
    await rememberWeixinOcGatewayTarget(this.state.storage, agentId, config.integrationId);

    return startWeixinOcGatewayLogin({
      env: this.env,
      storage: this.state.storage,
      config,
      forceRefresh,
      schedulePoll: (delayMs) => this.schedulePoll(delayMs),
      status: () => this.status(agentId, integrationId)
    });
  }

  private async pollOnce(
    agentId: string,
    integrationId?: string
  ): Promise<WeixinOcGatewayStatus> {
    const config = await this.requireConfig(agentId, integrationId);
    await rememberWeixinOcGatewayTarget(this.state.storage, agentId, config.integrationId);

    if (!config.token) {
      if (
        !(await pollWeixinOcGatewayLogin({
          env: this.env,
          storage: this.state.storage,
          config,
          restartLogin: () => this.startLogin(config.agentId, true, config.integrationId),
          schedulePoll: (delayMs) => this.schedulePoll(delayMs)
        }))
      ) {
        await this.schedulePoll(config.qrPollIntervalMs);
      }
      return this.status(agentId, integrationId);
    }

    try {
      await pollWeixinOcGatewayUpdates({
        env: this.env,
        storage: this.state.storage,
        config,
        clearLoginState: () => this.clearLoginState(config.agentId, config.integrationId),
        dispatchInbound: (dispatchAgentId, dispatchMessage) =>
          this.dispatchInbound(dispatchAgentId, dispatchMessage)
      });
      await this.schedulePoll(1_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Weixin OC poll failed";
      await recordWeixinOcRuntimeError(this.state.storage, message);
      await this.schedulePoll(5_000);
    }
    return this.status(agentId, integrationId);
  }

  private async sendMessage(
    agentId: string,
    input: WeixinOcGatewaySendInput,
    integrationId?: string
  ) {
    const config = await this.requireConfig(agentId, integrationId);
    return sendWeixinOcGatewayMessage(config, input);
  }

  private async sendTyping(
    agentId: string,
    userId: string | undefined,
    integrationId?: string
  ): Promise<void> {
    const config = await this.requireConfig(agentId, integrationId);
    return sendWeixinOcGatewayTyping(config, userId);
  }

  private async status(
    agentId: string,
    integrationId?: string
  ): Promise<WeixinOcGatewayStatus> {
    const config = await this.requireConfig(agentId, integrationId);
    return getWeixinOcGatewayStatus(this.state.storage, config);
  }

  private async clearLoginState(
    agentId: string,
    integrationId?: string
  ): Promise<void> {
    const config = await this.requireConfig(agentId, integrationId);
    await persistWeixinOcAccountState(this.state.storage, config, {
      token: undefined,
      accountId: undefined,
      syncBuf: "",
      baseUrl: config.baseUrl,
      contextTokens: {}
    });
    await clearPlatformIntegrationCredential(this.env.AGENT_DB, config.integrationId);
    await updatePlatformIntegrationCheck(this.env.AGENT_DB, config.integrationId, {
      lastError: "Weixin OC login state cleared"
    });
  }

  private requireConfig(agentId: string, integrationId?: string) {
    return requireWeixinOcGatewayConfig(
      this.env,
      this.state.storage,
      agentId,
      integrationId
    );
  }

  private async dispatchInbound(agentId: string, message: InternalMessage): Promise<void> {
    const job: QueueMessageBody = {
      type: "inbound.message",
      eventId: createId("evt"),
      agentId,
      message,
      receivedAt: nowIso()
    };
    await this.env.AGENT_QUEUE.send(job);
  }

  private async schedulePoll(delayMs: number): Promise<void> {
    await this.state.storage.setAlarm(Date.now() + delayMs);
  }
}
