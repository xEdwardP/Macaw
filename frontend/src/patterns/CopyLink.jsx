import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import Button from "../ui/Button";
import { cn } from "../ui/cn";

export default function CopyLink({ value, className }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <code className="flex-1 min-w-0 truncate text-xs bg-surface-sunken text-content-primary rounded-lg px-3 py-2 border border-line-default">
        {value}
      </code>
      <Button variant="secondary" size="sm" onClick={copy} className="flex-shrink-0">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {t(copied ? "action.copied" : "action.copy")}
      </Button>
    </div>
  );
}
