export function buildQrCodeUrl(contactUrl: string): string {
  return `https://api.cl2wm.cn/api/qrcode/code?text=${encodeURIComponent(contactUrl)}`;
}

export function contactSceneForIntegration(integrationId: string): string {
  return `sa_${integrationId}`.replace(/[^0-9A-Za-z_-]/g, "_").slice(0, 32);
}
