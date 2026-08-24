import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "./cn";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  className,
  children,
}) {
  const { t } = useTranslation();

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay z-50 data-[state=open]:animate-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
            "bg-surface rounded-xl p-6 shadow-xl max-h-[90vh] overflow-y-auto",
            SIZES[size],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-bold text-content-primary">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-content-secondary mt-0.5">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="text-content-muted hover:text-content-secondary flex-shrink-0"
              aria-label={t("action.close")}
            >
              <X size={20} />
            </Dialog.Close>
          </div>

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ModalFooter({ children, className }) {
  return <div className={cn("flex gap-3 mt-6", className)}>{children}</div>;
}
