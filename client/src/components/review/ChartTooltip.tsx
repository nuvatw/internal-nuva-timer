export default function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string; payload?: Record<string, unknown> }>;
  label?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-2 shadow-lg text-xs">
      {label && <p className="text-text-tertiary mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          {entry.color && (
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          )}
          <span className="text-text-primary font-medium tabular-nums">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
