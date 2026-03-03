import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface DrawerProps {
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Width class (default: w-80 sm:w-96 lg:w-[28rem]) */
  width?: string;
  footer?: ReactNode;
}

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
};

const panelTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 35,
};

export default function Drawer({
  onClose,
  title,
  children,
  width = "w-80 sm:w-96 lg:w-[28rem]",
  footer,
}: DrawerProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex justify-end"
      variants={backdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Panel */}
      <motion.div
        ref={trapRef}
        className={`relative ${width} h-full bg-bg border-l border-border shadow-xl flex flex-col`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={panelTransition}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <h3 className="text-sm font-semibold text-text-primary">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
              aria-label="Close"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-border shrink-0">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
