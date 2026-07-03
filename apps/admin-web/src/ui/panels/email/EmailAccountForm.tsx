import type { EmailIntegration } from "../../../api/types";

export type EmailAccountDraft = {
  agentId: string;
  name: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  inboundAddresses: string;
  resendApiKey: string;
};

type EmailAccountFormProps = {
  draft: EmailAccountDraft;
  editing?: EmailIntegration;
  onChange: (draft: EmailAccountDraft) => void;
  onSubmit: () => void;
};

export function defaultEmailAccountDraft(): EmailAccountDraft {
  return {
    agentId: "",
    name: "Email",
    fromAddress: "",
    fromName: "",
    replyTo: "",
    inboundAddresses: "",
    resendApiKey: ""
  };
}

export function draftFromIntegration(integration: EmailIntegration): EmailAccountDraft {
  return {
    agentId: integration.agentId,
    name: integration.name,
    fromAddress: integration.fromAddress,
    fromName: integration.fromName ?? "",
    replyTo: integration.replyTo ?? "",
    inboundAddresses: integration.inboundAddresses.join(", "),
    resendApiKey: ""
  };
}

export function EmailAccountForm({ draft, editing, onChange, onSubmit }: EmailAccountFormProps) {
  function patch(partial: Partial<EmailAccountDraft>) {
    onChange({ ...draft, ...partial });
  }

  return (
    <form
      className="email-account-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label>
        Name
        <input value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
      </label>
      <label>
        Agent
        <input value={draft.agentId} onChange={(event) => patch({ agentId: event.target.value })} />
      </label>
      <label>
        From
        <input
          value={draft.fromAddress}
          onChange={(event) => patch({ fromAddress: event.target.value })}
        />
      </label>
      <label>
        From name
        <input
          value={draft.fromName}
          onChange={(event) => patch({ fromName: event.target.value })}
        />
      </label>
      <label>
        Reply-To
        <input value={draft.replyTo} onChange={(event) => patch({ replyTo: event.target.value })} />
      </label>
      <label>
        Inbound addresses
        <input
          value={draft.inboundAddresses}
          onChange={(event) => patch({ inboundAddresses: event.target.value })}
        />
      </label>
      <label>
        Resend API key
        <input
          type="password"
          value={draft.resendApiKey}
          placeholder={editing?.hasResendApiKey ? "Configured" : ""}
          onChange={(event) => patch({ resendApiKey: event.target.value })}
        />
      </label>
      <button className="primary-button" type="submit">
        {editing ? "Update" : "Save"}
      </button>
    </form>
  );
}
