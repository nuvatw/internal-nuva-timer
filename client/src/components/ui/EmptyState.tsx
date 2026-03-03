import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import Button from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center py-16 px-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="h-16 w-16 rounded-2xl bg-accent-muted flex items-center justify-center mb-5">
        <Icon size={28} strokeWidth={1.5} className="text-accent" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-text-tertiary max-w-xs leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="mt-5">
          <Button variant="primary" size="md" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
