import { motion } from "framer-motion";
import Card from "../ui/Card";
import { cn } from "../ui/cn";

const TONES = {
  brand: "bg-brand-surface text-brand",
  positive: "bg-positive-surface text-positive-content",
  info: "bg-info-surface text-info-content",
  warning: "bg-warning-surface text-warning-content",
  danger: "bg-danger-surface text-danger-content",
  neutral: "bg-surface-sunken text-content-secondary",
};

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  index = 0,
  className,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={cn("h-full flex flex-col", className)}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-content-secondary min-w-0">{label}</p>
          {Icon && (
            <span
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                TONES[tone],
              )}
            >
              <Icon size={20} />
            </span>
          )}
        </div>

        <div className="mt-auto pt-3">
          <p className="text-[clamp(1.125rem,1.6vw,1.5rem)] leading-tight font-bold text-content-primary tabular-nums whitespace-nowrap">
            {value}
          </p>
          {hint && <p className="text-xs text-content-muted mt-1">{hint}</p>}
        </div>
      </Card>
    </motion.div>
  );
}
