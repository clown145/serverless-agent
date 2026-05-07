import { Send } from "lucide-react";

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
        Send
      </button>
    </div>
  );
}
