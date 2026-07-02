import { useState } from "react";
import type { EmailMessage } from "../../../api/types";
import { FormDialog } from "../../FormDialog";

type EmailComposeDialogProps = {
  mode: "send" | "reply" | "forward";
  open: boolean;
  sourceMessage?: EmailMessage;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    to: string;
    subject: string;
    text: string;
    forwardMode?: "compose" | "eml_attachment";
    includeOriginalAttachments?: boolean;
  }) => void;
};

export function EmailComposeDialog({
  mode,
  open,
  sourceMessage,
  onOpenChange,
  onSubmit
}: EmailComposeDialogProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [forwardMode, setForwardMode] = useState<"compose" | "eml_attachment">("compose");
  const [includeOriginalAttachments, setIncludeOriginalAttachments] = useState(false);

  return (
    <FormDialog open={open} title={title(mode)} onOpenChange={onOpenChange}>
      <form
        className="email-compose-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            to,
            subject,
            text,
            forwardMode,
            includeOriginalAttachments
          });
        }}
      >
        {mode !== "reply" && (
          <label>
            To
            <input value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        )}
        {mode === "send" && (
          <label>
            Subject
            <input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </label>
        )}
        {mode === "forward" && (
          <>
            <label>
              Forward mode
              <select
                value={forwardMode}
                onChange={(event) => setForwardMode(event.target.value as "compose" | "eml_attachment")}
              >
                <option value="compose">Composed forward</option>
                <option value="eml_attachment">Raw .eml attachment</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={includeOriginalAttachments}
                onChange={(event) => setIncludeOriginalAttachments(event.target.checked)}
              />
              Include original attachments
            </label>
          </>
        )}
        <label>
          Body
          <textarea
            rows={10}
            value={text}
            placeholder={mode === "forward" ? sourceMessage?.snippet : ""}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <button className="primary-button" type="submit">
          {title(mode)}
        </button>
      </form>
    </FormDialog>
  );
}

function title(mode: EmailComposeDialogProps["mode"]): string {
  if (mode === "reply") {
    return "Reply";
  }
  if (mode === "forward") {
    return "Forward";
  }
  return "Send Email";
}
