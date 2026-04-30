import type { ComponentType } from "react";

type ToolbarButtonProps = {
  label: string;
  icon: ComponentType<{ size?: number }>;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
};

export function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  variant = "default"
}: ToolbarButtonProps) {
  return (
    <button
      className={`icon-button ${variant === "danger" ? "danger" : ""}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <Icon size={16} />
    </button>
  );
}
