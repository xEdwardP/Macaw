import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const localesDir = join(root, "src/i18n/locales");
const locales = readdirSync(localesDir);

const flatten = (node, prefix = "") =>
  Object.entries(node).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

const dictionaries = {};
for (const locale of locales) {
  dictionaries[locale] = new Set();
  for (const file of readdirSync(join(localesDir, locale))) {
    const namespace = file.replace(".json", "");
    const content = JSON.parse(
      readFileSync(join(localesDir, locale, file), "utf8"),
    );
    for (const key of flatten(content))
      dictionaries[locale].add(`${namespace}:${key}`);
  }
}

const [reference, ...others] = locales;
let failures = 0;

for (const locale of others) {
  const missing = [...dictionaries[reference]].filter(
    (key) => !dictionaries[locale].has(key),
  );
  const extra = [...dictionaries[locale]].filter(
    (key) => !dictionaries[reference].has(key),
  );

  if (missing.length > 0) {
    failures += missing.length;
    console.log(`${locale} · faltan ${missing.length}: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    failures += extra.length;
    console.log(`${locale} · sobran ${extra.length}: ${extra.join(", ")}`);
  }
}

const PLURAL_SUFFIX = /_(one|other|zero|two|few|many)$/;

const used = new Set();
const files = execSync("git ls-files src", { encoding: "utf8" })
  .split("\n")
  .filter((path) => /\.(jsx|js)$/.test(path))
  .filter((path) => existsSync(join(root, path)));

for (const file of files) {
  const source = readFileSync(join(root, file), "utf8");
  const declared = source.match(/useTranslation\(\s*"(\w+)"/);
  const fallbackNamespace = declared ? declared[1] : "common";

  const qualify = (key) =>
    key.includes(":") ? key : `${fallbackNamespace}:${key}`;

  for (const [, key] of source.matchAll(/\bt\(\s*"([a-zA-Z][\w.:-]*)"/g))
    used.add(qualify(key));
  for (const [, key, namespace] of source.matchAll(
    /i18nKey="([\w.:-]+)"\s*\n\s*ns="(\w+)"/g,
  ))
    used.add(key.includes(":") ? key : `${namespace}:${key}`);
  for (const [, key] of source.matchAll(/success:\s*"([\w.:-]+)"/g))
    used.add(qualify(key));
}

const resolvable = (key) => {
  const full = key.includes(":") ? key : `common:${key}`;
  if (dictionaries[reference].has(full)) return true;
  return [...dictionaries[reference]].some(
    (candidate) =>
      PLURAL_SUFFIX.test(candidate) &&
      candidate.replace(PLURAL_SUFFIX, "") === full,
  );
};

const unresolved = [...used]
  .filter((key) => !key.includes("${") && !/`/.test(key))
  .filter((key) => !resolvable(key));

const SPANISH_MARKERS =
  /[¿¡]|\b(el|la|los|las|un|una|unos|unas|del|al|con|para|por|sin|que|tu|tus|hay|ya|se|es|son|desde|hasta|esta|este|todos|todas|cada|solo|pero|cuando|donde)\b/;

const TEXT_PROPS =
  /\b(placeholder|title|label|hint|description|message|subtitle|confirmLabel|nextLabel|empty|alt|aria-label)=\{?"([^"\n]{4,})"/g;

const JSX_TEXT = />\s*([^<>{}\n]{4,}?)\s*</g;

const hardcoded = [];

for (const file of files) {
  if (file.includes("src/i18n/")) continue;
  const source = readFileSync(join(root, file), "utf8");

  const candidates = [
    ...[...source.matchAll(TEXT_PROPS)].map(([, , value]) => value),
    ...[...source.matchAll(JSX_TEXT)].map(([, value]) => value),
  ];

  for (const value of candidates)
    if (SPANISH_MARKERS.test(value) && !/^[\w.:@/-]+$/.test(value))
      hardcoded.push(`${file}: ${value}`);
}

console.log(
  `${used.size} claves usadas en el código, ${dictionaries[reference].size} definidas en ${reference}`,
);

if (hardcoded.length > 0) {
  failures += hardcoded.length;
  console.log(`\nTextos en español fuera del diccionario:\n  ${hardcoded.join("\n  ")}`);
}

if (unresolved.length > 0) {
  failures += unresolved.length;
  console.log(`\nClaves sin definir:\n  ${unresolved.join("\n  ")}`);
}

console.log(
  failures === 0
    ? "\nLos diccionarios están completos y sincronizados."
    : `\n${failures} problemas.`,
);

process.exit(failures === 0 ? 0 : 1);
