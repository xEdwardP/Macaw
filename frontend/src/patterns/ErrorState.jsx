import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { translateError } from "../i18n/translateError";
import Button from "../ui/Button";
import { cn } from "../ui/cn";

export default function ErrorState({ error, onRetry, className }) {
  const { t } = useTranslation();
  const message = error ? translateError(error) : t("state.errorBody");

  return (
    <div className={cn("text-center py-16", className)}>
      <AlertTriangle className="mx-auto text-danger-content mb-4" size={48} />
      <h3 className="text-lg font-medium text-content-primary">
        {t("state.errorTitle")}
      </h3>
      <p className="text-content-secondary mt-1 max-w-sm mx-auto text-sm">{message}</p>
      {error?.code && (
        <p className="text-content-muted mt-2 text-xs font-mono">{error.code}</p>
      )}
      {onRetry && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={onRetry}>
            {t("action.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}
