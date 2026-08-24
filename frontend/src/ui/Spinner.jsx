import { Loader2 } from "lucide-react";
import { cn } from "./cn";

export default function Spinner({ size = 20, className, label = "Cargando" }) {
  return (
    <Loader2
      size={size}
      role="status"
      aria-label={label}
      className={cn("animate-spin text-brand", className)}
    />
  );
}
