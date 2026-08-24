import { cva } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "./cn";

const alert = cva("rounded-lg border p-4 flex items-start gap-3", {
  variants: {
    tone: {
      info: "bg-info-surface border-info-line text-info-content",
      positive: "bg-positive-surface border-positive-line text-positive-content",
      warning: "bg-warning-surface border-warning-line text-warning-content",
      danger: "bg-danger-surface border-danger-line text-danger-content",
    },
  },
  defaultVariants: { tone: "info" },
});

const ICONS = {
  info: Info,
  positive: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export default function Alert({ tone = "info", title, className, children }) {
  const Icon = ICONS[tone];

  return (
    <div className={cn(alert({ tone }), className)} role="status">
      <Icon size={18} className="flex-shrink-0 mt-0.5" />
      <div className="text-sm min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        {children}
      </div>
    </div>
  );
}
