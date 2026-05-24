export const adminTokenKey = "serverless-agent:admin-token";

export function loadAdminToken(): string {
  return localStorage.getItem(adminTokenKey) ?? "";
}

export function saveAdminToken(token: string): void {
  localStorage.setItem(adminTokenKey, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(adminTokenKey);
}

export function hasStoredAdminToken(): boolean {
  return Boolean(loadAdminToken().trim());
}
