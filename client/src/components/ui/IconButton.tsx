import { forwardRef, type ButtonHTMLAttributes } from "react";

type IconButtonVariant = "ghost" | "outline" | "destructive";
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string;
}

const variantClasses: Record<IconButtonVariant, string> = {
  ghost:
    "text-text-tertiary hover:text-text-primary hover:bg-surface-raised",
  outline:
    "border border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised",
  destructive:
    "text-text-tertiary hover:text-destructive hover:bg-destructive-muted",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "h-7 w-7 rounded-md",
  md: "h-8 w-8 rounded-md",
  lg: "h-10 w-10 rounded-md",
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = "ghost",
      size = "sm",
      label,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        aria-label={label}
        className={`inline-flex items-center justify-center transition-colors disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export default IconButton;
