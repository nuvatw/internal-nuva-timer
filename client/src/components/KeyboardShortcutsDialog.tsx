import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { overlayVariants, modalTransition } from "../lib/motion";

// ─── Types ────────────────────────────────

interface Shortcut {
  keys: string[];
  label: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: Shortcut[];
}

// ─── Data ─────────────────────────────────

const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

const mod = isMac ? "⌘" : "Ctrl";

const sections: ShortcutSection[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["g", "t"], label: "Go to Timer" },
      { keys: ["g", "r"], label: "Go to Review" },
      { keys: ["g", "s"], label: "Go to Settings" },
    ],
  },
  {
    title: "Timer",
    shortcuts: [
      { keys: ["Space"], label: "Pause / Resume" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: [mod, "K"], label: "Open command palette" },
      { keys: ["?"], label: "Show keyboard shortcuts" },
    ],
  },
];

// ─── Component ────────────────────────────

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsDialog({
  open,
  onClose,
}: KeyboardShortcutsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={modalTransition}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="relative w-full max-w-md rounded-xl bg-bg border border-border shadow-2xl overflow-hidden outline-none"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -5 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={onClose}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Close
              </button>
            </div>

            {/* Shortcut sections */}
            <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
              {sections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                  <div className="space-y-1.5">
                    {section.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.label}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-text-secondary">
                          {shortcut.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && key !== "K" && (
                                <span className="text-[10px] text-text-tertiary mx-0.5">
                                  then
                                </span>
                              )}
                              <kbd className="inline-flex items-center justify-center min-w-[24px] rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 text-[11px] font-mono text-text-tertiary">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border">
              <p className="text-[10px] text-text-tertiary">
                Press <kbd className="rounded border border-border-subtle bg-surface-raised px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
