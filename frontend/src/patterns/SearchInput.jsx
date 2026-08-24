import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../ui/cn";

export default function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("relative", className)}>
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none"
        size={18}
      />
      <input
        type="search"
        aria-label={label || t("search.label")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t("search.placeholder")}
        className="w-full pl-11 pr-4 py-3 border border-line-strong rounded-xl bg-surface text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 ring-brand focus:border-transparent"
      />
    </div>
  );
}
