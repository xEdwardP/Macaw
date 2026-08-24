const BRAND_PROPERTIES = [
  "--brand",
  "--brand-surface",
  "--brand-line",
  "--brand-content",
  "--brand-solid",
  "--brand-solid-hover",
  "--brand-contrast",
];

const parseHex = (value) => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value?.trim() ?? "");
  if (!match) return null;

  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((character) => character + character)
          .join("")
      : match[1];

  return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
};

const channel = (value) => {
  const scaled = value / 255;
  return scaled <= 0.03928
    ? scaled / 12.92
    : ((scaled + 0.055) / 1.055) ** 2.4;
};

const luminance = ([red, green, blue]) =>
  0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);

const contrast = (a, b) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const NEAR_BLACK = [17, 24, 39];
const SURFACE = { light: [255, 255, 255], dark: [15, 17, 21] };

const mix = (from, to, amount) =>
  from.map((value, index) =>
    Math.round(value + (to[index] - value) * amount),
  );

const until = (color, target, passes) => {
  let current = color;
  for (let step = 0; step < 24 && !passes(current); step += 1)
    current = mix(current, target, 0.08);
  return current;
};

const toHex = (rgb) =>
  `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;

export function applyBrand(color, theme = "light") {
  const root = document.documentElement;
  const rgb = parseHex(color);

  if (!rgb) {
    for (const property of BRAND_PROPERTIES) root.style.removeProperty(property);
    return;
  }

  const dark = theme === "dark";
  const surface = dark ? SURFACE.dark : SURFACE.light;

  const accent = until(rgb, dark ? WHITE : BLACK, (candidate) =>
    contrast(candidate, surface) >= 3,
  );

  let solid = until(rgb, BLACK, (candidate) => contrast(candidate, WHITE) >= 4.5);
  if (contrast(solid, surface) < 3)
    solid = until(rgb, WHITE, (candidate) => contrast(candidate, surface) >= 3);

  const onSolid = contrast(solid, WHITE) >= 4.5 ? WHITE : NEAR_BLACK;
  const brandSurface = mix(rgb, surface, dark ? 0.86 : 0.92);
  const content = until(accent, dark ? WHITE : BLACK, (candidate) =>
    contrast(candidate, brandSurface) >= 4.5,
  );

  root.style.setProperty("--brand", toHex(accent));
  root.style.setProperty("--brand-surface", toHex(brandSurface));
  root.style.setProperty("--brand-line", toHex(mix(rgb, surface, 0.62)));
  root.style.setProperty("--brand-content", toHex(content));
  root.style.setProperty("--brand-solid", toHex(solid));
  root.style.setProperty(
    "--brand-solid-hover",
    toHex(mix(solid, dark ? WHITE : BLACK, 0.18)),
  );
  root.style.setProperty("--brand-contrast", toHex(onSolid));
}
