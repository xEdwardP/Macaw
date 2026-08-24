import { forwardRef } from "react";
import { Field, controlClasses } from "./Field";
import { cn } from "./cn";

const Input = forwardRef(function Input(
  { label, error, hint, required, className, icon: Icon, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(id) => (
        <div className="relative">
          {Icon && (
            <Icon
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none"
            />
          )}
          <input
            id={id}
            ref={ref}
            aria-invalid={Boolean(error)}
            className={cn(controlClasses(error), Icon && "pl-11", className)}
            {...props}
          />
        </div>
      )}
    </Field>
  );
});

export default Input;
