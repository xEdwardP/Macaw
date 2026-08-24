import { cn } from "./cn";

export default function Card({ as: Tag = "div", padded = true, className, children, ...props }) {
  return (
    <Tag
      className={cn(
        "bg-surface rounded-xl border border-line-subtle shadow-sm",
        padded && "p-5",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
