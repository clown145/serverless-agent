import type { Env } from "../../shared/types/env";
import { resolveHttpFileFromEnv, type HttpFileSourceInput } from "./file-source";

export type HttpMultipartPart =
  | {
      kind: "field";
      name: string;
      value: string | number | boolean;
    }
  | {
      kind: "file";
      name: string;
      source: HttpFileSourceInput;
      fileName?: string;
      mimeType?: string;
    };

export async function buildMultipartFormData(
  env: Env,
  agentId: string,
  parts: HttpMultipartPart[]
): Promise<FormData> {
  const form = new FormData();
  for (const part of parts) {
    if (part.kind === "field") {
      form.append(part.name, String(part.value));
      continue;
    }

    const file = await resolveHttpFileFromEnv({ env, agentId }, part.source, {
      fileName: part.fileName,
      mimeType: part.mimeType
    });
    form.append(
      part.name,
      new Blob([file.bytes], { type: file.mimeType }),
      file.fileName
    );
  }
  return form;
}
