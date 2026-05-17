import { useEffect, useState } from "react";
import type { ModelProvider } from "../../../api/types";
import { FormDialog } from "../../FormDialog";
import { useI18n } from "../../i18n/I18nProvider";
import { ModelProviderForm } from "./ModelProviderForm";
import { providerDraftDefaults, type ModelProviderDraft } from "./modelDefaults";
import {
  initialProviderDraft,
  providerPayloadFromDraft,
  type ModelProviderPayload
} from "./modelProviderDraft";

type ModelProviderDialogProps = {
  open: boolean;
  provider?: ModelProvider;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ModelProviderPayload) => void;
};

export function ModelProviderDialog({
  open,
  provider,
  onOpenChange,
  onSubmit
}: ModelProviderDialogProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ModelProviderDraft>(() => initialProviderDraft(provider));
  const editing = Boolean(provider);

  useEffect(() => {
    if (open) {
      setDraft(initialProviderDraft(provider));
    }
  }, [open, provider]);

  return (
    <FormDialog
      open={open}
      title={editing ? t("models.editProvider") : t("models.addProvider")}
      description={editing ? t("models.editProviderHint") : t("models.addProviderHint")}
      onOpenChange={onOpenChange}
    >
      <ModelProviderForm
        draft={draft}
        editing={editing}
        onDraftChange={setDraft}
        onCancel={() => onOpenChange(false)}
        onProviderTypeChange={(providerType) => setDraft(providerDraftDefaults(providerType))}
        onSubmit={() => onSubmit(providerPayloadFromDraft(draft))}
      />
    </FormDialog>
  );
}
