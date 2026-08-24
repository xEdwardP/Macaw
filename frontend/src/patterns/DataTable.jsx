import { useTranslation } from "react-i18next";
import { SkeletonCards } from "../ui/Skeleton";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import { cn } from "../ui/cn";

export default function DataTable({
  columns,
  rows = [],
  rowKey = (row) => row.id,
  isLoading,
  error,
  onRetry,
  empty,
  className,
}) {
  const { t } = useTranslation();

  if (isLoading) return <SkeletonCards count={5} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (rows.length === 0)
    return <EmptyState title={t("state.noResults")} {...empty} />;

  return (
    <div
      className={cn(
        "bg-surface rounded-xl border border-line-subtle shadow-sm overflow-x-auto",
        className,
      )}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line-subtle">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "text-left font-medium text-content-secondary px-4 py-3 whitespace-nowrap",
                  column.align === "right" && "text-right",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-line-subtle last:border-0 hover:bg-surface-muted/60"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-content-primary align-middle",
                    column.align === "right" && "text-right",
                    column.cellClassName,
                  )}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
