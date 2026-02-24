import { useState } from "react";
import { motion } from "framer-motion";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { overlayVariants, modalVariants, modalTransition } from "../../lib/motion";

export default function CancelModal({
  onConfirm,
  onDismiss,
}: {
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const [canceling, setCanceling] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  const handleConfirm = async () => {
    setCanceling(true);
    try {
      await onConfirm();
    } catch {
      setCanceling(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onDismiss();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cancel-title"
      aria-describedby="cancel-desc"
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={modalTransition}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        ref={trapRef}
        className="w-full max-w-sm rounded-xl bg-bg p-6 shadow-lg space-y-4"
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={modalTransition}
      >
        <h3 id="cancel-title" className="text-lg font-semibold text-text-primary">
          Cancel session?
        </h3>
        <p id="cancel-desc" className="text-sm text-text-secondary">
          Elapsed time will be saved as a canceled session.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onDismiss}
            disabled={canceling}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={canceling}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {canceling ? "Canceling..." : "Yes, Cancel"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
