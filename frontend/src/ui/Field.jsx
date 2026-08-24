import { useId } from "react";
import { cn } from "./cn";

export function Field({ label, error, hint, required, children, className }) {
  const id = useId();

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-content-primary mb-1"
        >
          {label}
          {required && <span className="text-danger-content ml-0.5">*</span>}
        </label>
      )}

      {children(id)}

      {error ? (
        <p className="text-danger-content text-xs mt-1">{error}</p>
      ) : hint ? (
        <p className="text-content-muted text-xs mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

export const controlClasses = (invalid) =>
  cn(
    "w-full px-4 py-2 border rounded-lg bg-surface text-content-primary placeholder:text-content-muted",
    "focus:outline-none focus:ring-2 ring-brand focus:border-transparent",
    "disabled:bg-surface-muted disabled:text-content-muted",
    invalid ? "border-danger-line" : "border-line-strong",
  );
