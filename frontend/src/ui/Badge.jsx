import { cva } from "class-variance-authority";
import { cn } from "./cn";

const badge = cva(
  "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-content-secondary",
        brand: "bg-brand-surface text-brand",
        positive: "bg-positive-surface text-positive-content",
        warning: "bg-warning-surface text-warning-content",
        danger: "bg-danger-surface text-danger-content",
        info: "bg-info-surface text-info-content",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-1",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export default function Badge({ tone, size, className, children, ...props }) {
  return (
    <span className={cn(badge({ tone, size }), className)} {...props}>
      {children}
    </span>
  );
}
