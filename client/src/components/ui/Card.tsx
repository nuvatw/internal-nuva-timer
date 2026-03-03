import { forwardRef, type HTMLAttributes } from "react";

type CardVariant = "default" | "raised" | "glass";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Adds hover shadow lift effect */
  hoverable?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-surface border border-border rounded-md shadow-xs",
  raised: "bg-surface-raised border border-border rounded-md shadow-sm",
  glass:
    "bg-surface-overlay backdrop-blur-md border border-border/50 rounded-md shadow-md",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", hoverable = false, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${variantClasses[variant]} ${
          hoverable ? "transition-shadow hover:shadow-sm" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

export default Card;
