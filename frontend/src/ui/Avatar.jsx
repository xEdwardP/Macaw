import { cn } from "./cn";

const SIZES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};

const initials = (name) =>
  (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

export default function Avatar({ name, src, size = "md", tone = "brand", className }) {
  const tones = {
    brand: "bg-brand-surface text-brand",
    blue: "bg-info-surface text-info-content",
    neutral: "bg-surface-sunken text-content-secondary",
  };

  if (src)
    return (
      <img
        src={src}
        alt={name || ""}
        className={cn("rounded-full object-cover flex-shrink-0", SIZES[size], className)}
      />
    );

  return (
    <span
      className={cn(
        "rounded-full flex items-center justify-center font-bold flex-shrink-0",
        SIZES[size],
        tones[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
