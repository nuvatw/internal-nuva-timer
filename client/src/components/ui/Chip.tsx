import { X } from "lucide-react";

interface ChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export default function Chip({ label, onRemove, className = "" }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary ${className}`}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full h-4 w-4 hover:bg-surface-raised transition-colors"
          aria-label={`Remove ${label}`}
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}
