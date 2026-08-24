import { useMemo } from "react";
import { useLocaleSettings } from "./useLocaleSettings";

const REFERENCE_MONDAY = Date.UTC(2024, 0, 1);

export function useWeekdayNames() {
  const { locale } = useLocaleSettings();

  return useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: "UTC",
    });

    const names = [""];
    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(REFERENCE_MONDAY + offset * 86400000);
      const name = format.format(day);
      names.push(name.charAt(0).toUpperCase() + name.slice(1));
    }

    return names;
  }, [locale]);
}
