import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";

const FALLBACK = {
  currency: "USD",
  timezone: "America/Tegucigalpa",
};

const LOCALE_TAGS = { es: "es-HN", en: "en-US" };

export function useLocaleSettings() {
  const { i18n } = useTranslation();
  const institution = useAuthStore((state) => state.user?.institution);

  return {
    currency: institution?.currencyCode || FALLBACK.currency,
    locale: LOCALE_TAGS[i18n.resolvedLanguage] || LOCALE_TAGS.es,
    timezone: institution?.timezone || FALLBACK.timezone,
  };
}
