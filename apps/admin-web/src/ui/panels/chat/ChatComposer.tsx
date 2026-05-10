import { ImagePlus, Send, X } from "lucide-react";
import type { MessageAttachment } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";

export type PendingChatAttachment = MessageAttachment & {
  dataBase64: string;
};

type ChatComposerProps = {
  text: string;
  busy: boolean;
  attachments: PendingChatAttachment[];
  onTextChange: (value: string) => void;
  onAttachmentsChange: (value: PendingChatAttachment[]) => void;
  onSend: () => void;
};

export function ChatComposer({
  text,
  busy,
  attachments,
  onTextChange,
  onAttachmentsChange,
  onSend
}: ChatComposerProps) {
  const { t } = useI18n();

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              onSend();
            }
          }}
        />
        <div className="composer-actions">
          <label className="icon-file-button" title={t("chat.attachImage")}>
            <ImagePlus size={16} />
            <input
              accept="image/*"
              type="file"
              multiple
              onChange={(event) => {
                void addFiles(event.currentTarget.files, attachments, onAttachmentsChange);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button className="primary-button" type="button" onClick={onSend} disabled={busy}>
            <Send size={16} />
            {t("chat.send")}
          </button>
        </div>
      </div>
      {attachments.length > 0 && (
        <div className="attachment-strip">
          {attachments.map((attachment) => (
            <span key={attachment.id}>
              {attachment.name ?? attachment.type}
              <button
                type="button"
                onClick={() =>
                  onAttachmentsChange(attachments.filter((item) => item.id !== attachment.id))
                }
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

async function addFiles(
  fileList: FileList | null,
  current: PendingChatAttachment[],
  onChange: (value: PendingChatAttachment[]) => void
) {
  const files = Array.from(fileList ?? [])
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, Math.max(0, 4 - current.length));
  const attachments = await Promise.all(files.map(fileToAttachment));
  onChange([...current, ...attachments]);
}

async function fileToAttachment(file: File): Promise<PendingChatAttachment> {
  return {
    id: `webui_${crypto.randomUUID()}`,
    type: "image",
    name: file.name,
    mimeType: file.type || "image/jpeg",
    size: file.size,
    dataBase64: await readFileAsDataUrl(file)
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
