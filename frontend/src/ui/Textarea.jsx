import { forwardRef } from "react";
import { Field, controlClasses } from "./Field";
import { cn } from "./cn";

const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, className, rows = 3, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(id) => (
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          aria-invalid={Boolean(error)}
          className={cn(controlClasses(error), "resize-none text-sm", className)}
          {...props}
        />
      )}
    </Field>
  );
});

export default Textarea;
