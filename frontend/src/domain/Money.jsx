import { useLocaleSettings } from "./useLocaleSettings";
import { cn } from "../ui/cn";

export function formatMoney(value, { currency, locale }) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function Money({
  value,
  currency,
  signed = false,
  className,
  ...props
}) {
  const settings = useLocaleSettings();
  const amount = Number(value ?? 0);

  const formatted = formatMoney(Math.abs(amount), {
    currency: currency || settings.currency,
    locale: settings.locale,
  });

  const sign = signed && amount !== 0 ? (amount > 0 ? "+" : "−") : "";

  return (
    <span className={cn("tabular-nums", className)} {...props}>
      {sign}
      {formatted}
    </span>
  );
}
