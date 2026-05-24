import { createAdminClient } from "./api/client";

export async function verifyAdminToken(token: string): Promise<void> {
  const normalizedToken = token.trim();
  const client = createAdminClient(() => normalizedToken);

  await client.getSetupStatus();
}
