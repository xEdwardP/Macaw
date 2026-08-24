import { cn } from "../ui/cn";

export default function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-3xl font-bold text-content-primary">{title}</h1>
        {subtitle && <p className="text-content-secondary mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function PageShell({ width = "max-w-5xl", className, children }) {
  return (
    <div className="min-h-screen bg-surface-muted">
      <div className={cn("mx-auto px-4 sm:px-6 py-8", width, className)}>
        {children}
      </div>
    </div>
  );
}
