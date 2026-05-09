import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Languages } from "lucide-react";
import { useI18n } from "./I18nProvider";

export function LanguageMenu() {
  const { locale, locales, setLocale, t } = useI18n();
  const current = locales.find((item) => item.locale === locale);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="topbar-action" type="button" aria-label={t("app.language")}>
          <Languages size={17} />
          <span>{current?.label}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-content" align="end" sideOffset={8}>
          {locales.map((item) => (
            <DropdownMenu.Item
              className="dropdown-item"
              key={item.locale}
              onSelect={() => setLocale(item.locale)}
            >
              <span>{item.label}</span>
              {item.locale === locale && <Check size={15} />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
