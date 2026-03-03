import { useState } from "react";
import { motion } from "framer-motion";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import Button from "./Button";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use destructive button style for confirm */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
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

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } catch {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        ref={trapRef}
        className="w-full max-w-sm rounded-lg bg-bg border border-border p-6 shadow-xl space-y-4"
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={panelTransition}
      >
        <h3
          id="confirm-title"
          className="text-lg font-semibold text-text-primary"
        >
          {title}
        </h3>
        <p id="confirm-desc" className="text-sm text-text-secondary">
          {description}
        </p>
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            size="md"
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
