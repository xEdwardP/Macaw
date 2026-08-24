import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(join(root, "src/index.css"), "utf8");

const blockOf = (selector) => {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`No encontré el bloque ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  return css.slice(open, close);
};

const declarations = (block) => {
  const found = {};
  for (const [, name, value] of block.matchAll(/(--[\w-]+):\s*([^;]+);/g))
    found[name] = value.trim();
  return found;
};

const brandScale = declarations(blockOf("@theme {"));
const light = {
  ...brandScale,
  "--on-solid": brandScale["--color-on-solid"],
  ...declarations(blockOf(":root {")),
};
const dark = { ...light, ...declarations(blockOf('[data-theme="dark"] {')) };

const resolve = (tokens, value, depth = 0) => {
  if (depth > 10) throw new Error(`Referencia circular en ${value}`);
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  if (!reference) return value;
  const next = tokens[reference[1]];
  if (!next) throw new Error(`Token sin definir: ${reference[1]}`);
  return resolve(tokens, next, depth + 1);
};

const parseColor = (input) => {
  const hex = input.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex))
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  throw new Error(`No sé leer el color ${input}`);
};

const channel = (value) => {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const REQUIRED = [
  ["--content-primary", "--surface", 4.5, "texto principal sobre superficie"],
  ["--content-primary", "--surface-muted", 4.5, "texto principal sobre fondo"],
  ["--content-primary", "--surface-sunken", 4.5, "texto principal sobre hundido"],
  ["--content-secondary", "--surface", 4.5, "texto secundario sobre superficie"],
  ["--content-secondary", "--surface-muted", 4.5, "texto secundario sobre fondo"],
  ["--content-muted", "--surface", 4.5, "texto tenue sobre superficie"],
  ["--content-muted", "--surface-muted", 4.5, "texto tenue sobre fondo"],
  ["--content-inverse", "--surface-inverse", 4.5, "texto invertido"],
  ["--brand-contrast", "--brand-solid", 4.5, "texto sobre botón de marca"],
  [
    "--brand-contrast",
    "--brand-solid-hover",
    4.5,
    "texto sobre botón de marca al pasar el ratón",
  ],
  ["--brand-content", "--brand-surface", 4.5, "texto de marca sobre suave"],
  ["--positive-content", "--positive-surface", 4.5, "texto positivo"],
  ["--positive-content", "--surface", 4.5, "positivo sobre superficie"],
  ["--warning-content", "--warning-surface", 4.5, "texto de aviso"],
  ["--warning-content", "--surface", 4.5, "aviso sobre superficie"],
  ["--danger-content", "--danger-surface", 4.5, "texto de peligro"],
  ["--danger-content", "--surface", 4.5, "peligro sobre superficie"],
  ["--info-content", "--info-surface", 4.5, "texto informativo"],
  ["--info-content", "--surface", 4.5, "info sobre superficie"],
  ["--on-solid", "--positive-solid", 4.5, "texto sobre botón positivo"],
  ["--on-solid", "--danger-solid", 4.5, "texto sobre botón de peligro"],
  ["--on-solid", "--info-solid", 4.5, "texto sobre botón informativo"],
  ["--on-solid", "--warning-solid", 4.5, "texto sobre botón de aviso"],
  ["--on-solid", "--accent-solid", 4.5, "texto sobre botón de acento"],
  ["--accent-content", "--accent-surface", 4.5, "texto de acento"],
  ["--accent-content", "--surface", 4.5, "acento sobre superficie"],
  ["--brand", "--surface", 3, "marca sobre superficie (1.4.11)"],
  ["--brand-solid", "--surface", 3, "botón de marca sobre superficie (1.4.11)"],
  ["--line-strong", "--surface", 3, "borde de control sobre superficie (1.4.11)"],
];

const INFORMATIVE = [
  ["--line-default", "--surface", "borde decorativo sobre superficie"],
  ["--line-subtle", "--surface", "borde tenue sobre superficie"],
];

const ratioOf = (tokens, foreground, background) =>
  contrast(
    parseColor(resolve(tokens, tokens[foreground])),
    parseColor(resolve(tokens, tokens[background])),
  );

let failures = 0;

for (const [themeName, tokens] of [
  ["claro", light],
  ["oscuro", dark],
]) {
  console.log(`\nTema ${themeName}`);

  for (const [foreground, background, minimum, label] of REQUIRED) {
    const ratio = ratioOf(tokens, foreground, background);
    const passed = ratio >= minimum;
    if (!passed) failures += 1;
    console.log(
      `  ${passed ? "ok  " : "FALLA"} ${ratio.toFixed(2).padStart(5)} / ${String(minimum).padEnd(4)} ${label}`,
    );
  }

  for (const [foreground, background, label] of INFORMATIVE)
    console.log(
      `  --    ${ratioOf(tokens, foreground, background).toFixed(2).padStart(5)}       ${label}`,
    );
}

console.log(
  failures === 0
    ? "\nTodos los pares exigidos cumplen el mínimo."
    : `\n${failures} pares por debajo del mínimo.`,
);

process.exit(failures === 0 ? 0 : 1);
