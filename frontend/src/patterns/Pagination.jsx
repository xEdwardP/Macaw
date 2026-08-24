import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import { cn } from "../ui/cn";

export default function Pagination({
  page,
  totalPages = 1,
  total = 0,
  limit = 10,
  onChange,
  noun,
  className,
}) {
  const { t } = useTranslation();
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between mt-6 gap-3",
        className,
      )}
    >
      <p className="text-sm text-content-secondary">
        {t("pagination.showing", {
          from,
          to,
          total,
          noun: noun || t("pagination.results"),
        })}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(Math.max(page - 1, 1))}
          disabled={page <= 1}
        >
          <ChevronLeft size={14} />
          {t("action.previous")}
        </Button>
        <span className="text-sm text-content-secondary tabular-nums">
          {t("pagination.pageOf", { page, totalPages })}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(Math.min(page + 1, totalPages))}
          disabled={page >= totalPages}
        >
          {t("action.next")}
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
