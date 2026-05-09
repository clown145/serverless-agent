import { useI18n } from "./i18n/I18nProvider";

type StatusBadgeProps = {
  value?: string;
};

export function StatusBadge({ value = "unknown" }: StatusBadgeProps) {
  const { t } = useI18n();
  const key = `status.${value}`;
  const label = t(key);
  return (
    <span className={`status status-${value.toLowerCase().replaceAll(" ", "-")}`}>
      {label === key ? value : label}
    </span>
  );
}
