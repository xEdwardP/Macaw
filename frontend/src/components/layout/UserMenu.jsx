import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, LogOut, UserCog } from "lucide-react";
import PreferencesMenu from "./PreferencesMenu";
import Avatar from "../../ui/Avatar";
import { cn } from "../../ui/cn";

export default function UserMenu({ user, onSignOut, className }) {
  const { t } = useTranslation("nav");
  const [open, setOpen] = useState(false);
  const container = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={container} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 ring-brand"
      >
        <Avatar name={user?.name} src={user?.avatar} size="sm" />
        <span className="hidden lg:block text-sm font-medium text-content-primary max-w-32 truncate">
          {user?.name?.split(" ")[0]}
        </span>
        <ChevronDown
          size={15}
          className={cn(
            "text-content-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-line-default bg-surface shadow-lg p-4 z-50"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-line-subtle">
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-content-primary truncate">
                {user?.name}
              </p>
              <p className="text-xs text-content-muted truncate">{user?.email}</p>
            </div>
          </div>

          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-2 py-2 mt-2 rounded-lg text-sm font-medium text-content-secondary hover:bg-surface-muted hover:text-content-primary transition-colors"
          >
            <UserCog size={16} />
            {t("account")}
          </Link>

          <PreferencesMenu stacked className="py-3" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium text-content-secondary hover:bg-danger-surface hover:text-danger-content transition-colors border-t border-line-subtle mt-1 pt-3"
          >
            <LogOut size={16} />
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
