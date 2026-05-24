export function parseSimpleXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pattern = /<([A-Za-z0-9_:-]+)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*?))<\/\1>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null) {
    const key = match[1];
    result[key] = decodeXmlEntities(match[2] ?? match[3] ?? "");
  }

  return result;
}

export function extractEncryptValue(xml: string): string | undefined {
  return parseSimpleXml(xml).Encrypt;
}

export function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
