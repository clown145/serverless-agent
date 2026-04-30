type StatusBadgeProps = {
  value?: string;
};

export function StatusBadge({ value = "unknown" }: StatusBadgeProps) {
  return <span className={`status status-${value}`}>{value}</span>;
}
