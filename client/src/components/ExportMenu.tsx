import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Braces,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "../contexts/ToastContext";

// ─── Types ───────────────────────────────────

type ExportFormat = "csv" | "md" | "json";

interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  path: string;
}

interface ExportMenuProps {
  queryString: string;
  disabled?: boolean;
}

// ─── Options ─────────────────────────────────

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: "csv",
    label: "CSV Spreadsheet",
    description: "Open in Excel or Google Sheets",
    icon: FileSpreadsheet,
    path: "/exports/sessions.csv",
  },
  {
    format: "md",
    label: "Markdown Report",
    description: "Formatted summary with tables",
    icon: FileText,
    path: "/exports/summary.md",
  },
  {
    format: "json",
    label: "JSON Data",
    description: "Structured data for integrations",
    icon: Braces,
    path: "/exports/sessions.json",
  },
];

// ─── Component ───────────────────────────────

export default function ExportMenu({
  queryString,
  disabled,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleExport = async (option: ExportOption) => {
    setExporting(option.format);
    try {
      await api.download(`${option.path}?${queryString}`);
      toast.success(`${option.label} exported`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
    setExporting(null);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || exporting !== null}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-50 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {exporting ? (
          <Loader2 size={13} strokeWidth={2} className="animate-spin" />
        ) : (
          <Download size={13} strokeWidth={2} />
        )}
        Export
        <ChevronDown
          size={11}
          strokeWidth={2}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full right-0 z-50 mt-1 w-64 rounded-lg border border-border bg-bg shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">
                Export format
              </p>
            </div>
            <div className="py-1" role="menu" aria-label="Export formats">
              {EXPORT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isLoading = exporting === option.format;

                return (
                  <button
                    key={option.format}
                    role="menuitem"
                    onClick={() => handleExport(option)}
                    disabled={exporting !== null}
                    className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-surface-raised disabled:opacity-50 transition-colors"
                  >
                    <div className="mt-0.5 h-7 w-7 rounded-md bg-surface-raised flex items-center justify-center shrink-0">
                      {isLoading ? (
                        <Loader2
                          size={14}
                          strokeWidth={2}
                          className="text-accent animate-spin"
                        />
                      ) : (
                        <Icon
                          size={14}
                          strokeWidth={1.75}
                          className="text-text-tertiary"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary">
                        {option.label}
                      </p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
