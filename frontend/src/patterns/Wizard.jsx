import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import { cn } from "../ui/cn";

export function WizardSteps({ steps, current, className }) {
  return (
    <ol className={cn("flex items-center gap-2 mb-8", className)}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <li key={step} className="flex items-center gap-2 flex-1 last:flex-none">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
                done && "bg-positive-solid text-on-solid",
                active && "bg-brand-solid text-brand-contrast",
                !done && !active && "bg-surface-sunken text-content-muted",
              )}
            >
              {done ? <Check size={16} /> : index + 1}
            </span>
            <span
              className={cn(
                "text-sm truncate hidden sm:block",
                active ? "text-content-primary font-medium" : "text-content-muted",
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 hidden sm:block",
                  done ? "bg-positive-line" : "bg-surface-sunken",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function WizardFooter({
  current,
  total,
  onBack,
  onNext,
  nextLabel,
  loading = false,
  nextDisabled = false,
}) {
  const { t } = useTranslation();
  const isLast = current === total - 1;

  return (
    <div className="flex gap-3 mt-8">
      <Button
        variant="secondary"
        block
        onClick={onBack}
        disabled={current === 0 || loading}
      >
        {t("action.back")}
      </Button>
      <Button block onClick={onNext} loading={loading} disabled={nextDisabled}>
        {nextLabel || t(isLast ? "action.finish" : "action.continue")}
      </Button>
    </div>
  );
}
