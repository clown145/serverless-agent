import { qqOfficialObjectName, resolveQqOfficialBotForAgent } from "./config";
import type { Env } from "../../../shared/types/env";

export async function getQqOfficialGatewayObject(
  env: Env,
  agentId: string
): Promise<DurableObjectStub> {
  const config = await resolveQqOfficialBotForAgent(env, agentId);
  const name = qqOfficialObjectName(config);
  const objectId = env.QQ_OFFICIAL_GATEWAY.idFromName(name);
  return env.QQ_OFFICIAL_GATEWAY.get(objectId);
}

export async function fetchQqOfficialGateway(
  env: Env,
  agentId: string,
  pathname: string,
  init?: RequestInit
): Promise<Response> {
  const object = await getQqOfficialGatewayObject(env, agentId);
  const url = new URL(`https://qq-official.local${pathname}`);
  url.searchParams.set("agentId", agentId);
  return object.fetch(url.toString(), init);
}
