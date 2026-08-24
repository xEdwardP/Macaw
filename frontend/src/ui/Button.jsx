import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-brand disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-brand-solid hover:bg-brand-solid-hover text-brand-contrast",
        secondary:
          "border border-line-strong text-content-primary hover:bg-surface-muted bg-surface",
        soft: "bg-brand-surface border border-brand-line text-brand hover:brightness-95",
        ghost: "text-content-secondary hover:bg-surface-sunken",
        danger: "bg-danger-solid hover:bg-danger-solid-hover text-on-solid",
        success: "bg-positive-solid hover:bg-positive-solid-hover text-on-solid",
      },
      size: {
        sm: "text-sm px-3 py-1.5",
        md: "text-sm px-4 py-2",
        lg: "text-base px-6 py-3",
        icon: "p-2",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export default function Button({
  as: Component = "button",
  variant,
  size,
  block,
  loading = false,
  disabled,
  className,
  children,
  type,
  ...props
}) {
  const isButton = Component === "button";

  return (
    <Component
      {...(isButton
        ? { type: type || "button", disabled: disabled || loading }
        : { "aria-disabled": disabled || loading || undefined })}
      className={cn(button({ variant, size, block }), className)}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </Component>
  );
}
