import { Send } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";

type ChatComposerProps = {
  text: string;
  busy: boolean;
  onTextChange: (value: string) => void;
  onSend: () => void;
};

export function ChatComposer({
  text,
  busy,
  onTextChange,
  onSend
}: ChatComposerProps) {
  const { t } = useI18n();

  return (
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
      <button className="primary-button" type="button" onClick={onSend} disabled={busy}>
        <Send size={16} />
        {t("chat.send")}
      </button>
    </div>
  );
}
