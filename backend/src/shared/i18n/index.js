const { DEFAULT_LOCALE, resolve } = require("./locales");

const dictionaries = {
  es: require("./locales/es.json"),
  en: require("./locales/en.json"),
};

const lookup = (dictionary, key) =>
  key
    .split(".")
    .reduce((node, part) => (node == null ? undefined : node[part]), dictionary);

const interpolate = (template, params) =>
  template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    params?.[name] === undefined ? match : String(params[name]),
  );

const FORMAT_TAGS = { es: "es-HN", en: "en-US" };
const DEFAULT_TIMEZONE = "America/Tegucigalpa";

const translator = (...localeCandidates) => {
  const locale = resolve(...localeCandidates);
  const formatTag = FORMAT_TAGS[locale];

  const t = (key, params) => {
    const value =
      lookup(dictionaries[locale], key) ??
      lookup(dictionaries[DEFAULT_LOCALE], key);
    return typeof value === "string" ? interpolate(value, params) : key;
  };

  t.locale = locale;

  t.money = (amount, currency) =>
    new Intl.NumberFormat(formatTag, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount ?? 0));

  t.date = (value, timezone) =>
    new Intl.DateTimeFormat(formatTag, {
      dateStyle: "long",
      timeZone: timezone || DEFAULT_TIMEZONE,
    }).format(new Date(value));

  return t;
};

module.exports = { translator };
