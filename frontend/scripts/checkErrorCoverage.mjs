import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalogue = join(root, "..", "backend", "src", "shared", "errors", "codes.js");

const source = readFileSync(catalogue, "utf8");
const codes = [...source.matchAll(/^\s*[A-Z_]+:\s*"([A-Z_]+)"/gm)].map(
  ([, value]) => value,
);

const locales = ["es", "en"];
let failures = 0;

for (const locale of locales) {
  const dictionary = JSON.parse(
    readFileSync(join(root, "src/i18n/locales", locale, "errors.json"), "utf8"),
  );

  const missing = codes.filter((code) => !(code in dictionary));
  const extra = Object.keys(dictionary).filter(
    (key) => key !== "FALLBACK" && !codes.includes(key),
  );

  console.log(
    `${locale}: ${codes.length - missing.length}/${codes.length} códigos traducidos`,
  );

  if (missing.length > 0) {
    failures += missing.length;
    console.log(`  sin traducir: ${missing.join(", ")}`);
  }
  if (extra.length > 0) console.log(`  sobrantes: ${extra.join(", ")}`);
}

process.exit(failures === 0 ? 0 : 1);
