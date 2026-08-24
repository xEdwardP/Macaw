import { useLocaleSettings } from "./useLocaleSettings";

const PRESETS = {
  date: { day: "2-digit", month: "short", year: "numeric" },
  dateLong: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  dateShort: { day: "2-digit", month: "2-digit" },
  dateTime: {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
};

export function useDateFormatter() {
  const { locale, timezone } = useLocaleSettings();

  return (value, preset = "date") =>
    value
      ? new Intl.DateTimeFormat(locale, {
          ...PRESETS[preset],
          timeZone: timezone,
        }).format(new Date(value))
      : "";
}

export default function DateTime({ value, preset = "date", className }) {
  const format = useDateFormatter();

  if (!value) return null;

  return (
    <time dateTime={new Date(value).toISOString()} className={className}>
      {format(value, preset)}
    </time>
  );
}
