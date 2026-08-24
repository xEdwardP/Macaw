import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LOCALES = ["es", "en"];
export const DEFAULT_LOCALE = "es";
export const LOCALE_STORAGE_KEY = "macaw-locale";

export const LOCALE_LABELS = { es: "Español", en: "English" };

export const NAMESPACES = [
  "common",
  "nav",
  "auth",
  "landing",
  "dashboard",
  "sessions",
  "tutors",
  "wallet",
  "admin",
  "institution",
  "units",
  "notifications",
  "errors",
];

const bundles = import.meta.glob("./locales/*/*.json");

export const normalizeLocale = (value) => {
  if (typeof value !== "string") return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(base) ? base : null;
};

export const resolveLocale = (...candidates) => {
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
};

const loaded = new Set();

const loadLocale = async (locale) => {
  if (loaded.has(locale)) return;

  const entries = Object.entries(bundles).filter(([path]) =>
    path.startsWith(`./locales/${locale}/`),
  );

  await Promise.all(
    entries.map(async ([path, load]) => {
      const namespace = path.split("/").pop().replace(".json", "");
      const resource = await load();
      i18n.addResourceBundle(locale, namespace, resource.default, true, true);
    }),
  );

  loaded.add(locale);
};

export const storedLocale = () => {
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
};

export const changeLocale = async (value) => {
  const locale = resolveLocale(value);
  await loadLocale(locale);
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    return locale;
  }
  return locale;
};

export const setupI18n = async (preferred) => {
  const locale = resolveLocale(
    preferred,
    storedLocale(),
    ...navigator.languages,
  );

  await i18n.use(initReactI18next).init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    ns: NAMESPACES,
    defaultNS: "common",
    resources: {},
    interpolation: { escapeValue: false },
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: import.meta.env.DEV
      ? (languages, namespace, key) =>
          console.warn(`i18n: falta ${namespace}:${key} en ${languages[0]}`)
      : undefined,
    react: { useSuspense: false },
  });

  await loadLocale(locale);
  if (locale !== DEFAULT_LOCALE) await loadLocale(DEFAULT_LOCALE);
  document.documentElement.lang = locale;

  return i18n;
};

export default i18n;
