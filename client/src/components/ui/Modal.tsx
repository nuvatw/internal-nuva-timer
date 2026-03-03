import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface ModalProps {
  /** Whether the modal is visible (parent controls with AnimatePresence) */
  open?: boolean;
  onClose: () => void;
  title?: string;
  /** ARIA label for dialog (required if no title) */
  ariaLabel?: string;
  /** Maximum width class (default: max-w-md) */
  maxWidth?: string;
  children: ReactNode;
  /** Show close button in top-right corner */
  showClose?: boolean;
  /** Use alertdialog role for destructive confirmations */
  alert?: boolean;
  /** Footer content rendered below the body */
  footer?: ReactNode;
}

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 4 },
};

const panelTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export default function Modal({
  onClose,
  title,
  ariaLabel,
  maxWidth = "max-w-md",
  children,
  showClose = true,
  alert = false,
  footer,
}: ModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      role={alert ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={title ? "modal-title" : undefined}
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={trapRef}
        className={`w-full ${maxWidth} rounded-lg bg-bg border border-border shadow-xl max-h-[90vh] overflow-y-auto`}
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={panelTransition}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 pt-6 pb-0">
            {title && (
              <h3
                id="modal-title"
                className="text-lg font-semibold text-text-primary"
              >
                {title}
              </h3>
            )}
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="h-7 w-7 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors ml-auto"
                aria-label="Close"
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-6 pt-0">{footer}</div>
        )}
      </motion.div>
    </motion.div>
  );
}
