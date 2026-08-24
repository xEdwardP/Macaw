import { cn } from "../ui/cn";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={cn("text-center py-16", className)}>
      {Icon && <Icon className="mx-auto text-content-muted mb-4" size={48} />}
      <h3 className="text-lg font-medium text-content-primary">{title}</h3>
      {description && (
        <p className="text-content-secondary mt-1 max-w-sm mx-auto text-sm">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
