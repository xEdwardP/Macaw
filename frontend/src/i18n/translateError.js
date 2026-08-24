import i18n from "./index";

const reported = new Set();

export function translateError(error) {
  const code = error?.code;

  if (code) {
    const translated = i18n.t(`errors:${code}`, {
      ...(error.params || {}),
      defaultValue: "",
    });

    if (translated) return translated;

    if (import.meta.env.DEV && !reported.has(code)) {
      reported.add(code);
      console.warn(`i18n: código de error sin traducir "${code}"`);
    }
  }

  return error?.userMessage || i18n.t("errors:FALLBACK");
}
