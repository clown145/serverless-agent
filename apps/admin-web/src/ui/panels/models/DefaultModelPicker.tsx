import type { ModelCatalogItem } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";

type DefaultModelPickerProps = {
  models: ModelCatalogItem[];
  onNavigate: () => void;
};

export function DefaultModelPicker({ models, onNavigate }: DefaultModelPickerProps) {
  const { t } = useI18n();

  return (
    <section className="model-default-picker">
      <div>
        <strong>{t("models.defaultModelMoved")}</strong>
        <span>{t("models.defaultModelMovedHint", { count: models.length })}</span>
      </div>
      <button className="secondary-button" type="button" onClick={onNavigate}>
        {t("models.openModelConfig")}
      </button>
    </section>
  );
}
