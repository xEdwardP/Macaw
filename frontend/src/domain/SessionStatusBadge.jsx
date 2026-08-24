import { useTranslation } from "react-i18next";
import Badge from "../ui/Badge";

export const SESSION_STATUS = {
  pending: { tone: "warning" },
  confirmed: { tone: "info" },
  pending_confirmation: { tone: "brand" },
  disputed: { tone: "danger" },
  completed: { tone: "positive" },
  cancelled: { tone: "neutral" },
};

export const SESSION_STATUS_VALUES = Object.keys(SESSION_STATUS);

export function useSessionStatusOptions({ withAll = true } = {}) {
  const { t } = useTranslation();

  return [
    ...(withAll ? [{ value: "", label: t("sessionStatus.all") }] : []),
    ...SESSION_STATUS_VALUES.map((value) => ({
      value,
      label: t(`sessionStatus.${value}`),
    })),
  ];
}

export default function SessionStatusBadge({ status, size, className }) {
  const { t } = useTranslation();
  const known = status in SESSION_STATUS ? status : "pending";

  return (
    <Badge tone={SESSION_STATUS[known].tone} size={size} className={className}>
      {t(`sessionStatus.${known}`)}
    </Badge>
  );
}
