const SUPPORTED_LOCALES = ["es", "en"];
const DEFAULT_LOCALE = "es";

const normalize = (value) => {
  if (typeof value !== "string") return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(base) ? base : null;
};

const resolve = (...candidates) => {
  for (const candidate of candidates) {
    const locale = normalize(candidate);
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
};

module.exports = { SUPPORTED_LOCALES, DEFAULT_LOCALE, normalize, resolve };
