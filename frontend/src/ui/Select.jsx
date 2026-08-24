import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { Field, controlClasses } from "./Field";
import { cn } from "./cn";

const Select = forwardRef(function Select(
  { label, error, hint, required, className, options = [], placeholder, children, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(id) => (
        <div className="relative">
          <select
            id={id}
            ref={ref}
            aria-invalid={Boolean(error)}
            className={cn(controlClasses(error), "appearance-none pr-10", className)}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {children}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none"
          />
        </div>
      )}
    </Field>
  );
});

export default Select;
