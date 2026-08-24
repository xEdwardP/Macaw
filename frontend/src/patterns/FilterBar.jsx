import { cn } from "../ui/cn";

export default function FilterBar({ options, value, onChange, className }) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border",
            value === option.value
              ? "bg-brand-solid text-brand-contrast border-transparent"
              : "bg-surface text-content-secondary border-line-default hover:border-line-strong",
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span className="ml-1.5 opacity-70">{option.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
