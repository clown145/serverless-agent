import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "./i18n/I18nProvider";
import { NAV_ITEMS } from "./navigation";
import type { ViewId } from "./views";

type SidebarProps = {
  active: ViewId;
  onChange: (view: ViewId) => void;
  onNavigate?: () => void;
  variant?: "desktop" | "drawer";
};

export function Sidebar({ active, onChange, onNavigate, variant = "desktop" }: SidebarProps) {
  const { t } = useI18n();

  return (
    <aside className={`sidebar sidebar-${variant}`}>
      <Brand />
      <nav className="nav-list" aria-label={t("app.mobileMenu")}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? "active" : ""}`}
              type="button"
              onClick={() => {
                onChange(item.id);
                onNavigate?.();
              }}
            >
              <Icon size={17} />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNavigation({
  active,
  onChange
}: {
  active: ViewId;
  onChange: (view: ViewId) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="topbar-icon mobile-nav-trigger" type="button">
          <Menu size={19} />
          <span>{t("app.mobileMenu")}</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="drawer-content">
          <Dialog.Title className="drawer-title">serverless-agent</Dialog.Title>
          <Dialog.Close asChild>
            <button className="drawer-close" type="button" aria-label={t("app.closeMenu")}>
              <X size={18} />
            </button>
          </Dialog.Close>
          <Sidebar
            active={active}
            onChange={onChange}
            onNavigate={() => setOpen(false)}
            variant="drawer"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Brand() {
  const { t } = useI18n();

  return (
    <div className="brand">
      <div className="brand-mark">SA</div>
      <div>
        <div className="brand-name">serverless-agent</div>
        <div className="brand-subtitle">{t("app.brandSubtitle")}</div>
      </div>
    </div>
  );
}
