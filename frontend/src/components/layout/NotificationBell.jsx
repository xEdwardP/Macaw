import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, CheckCheck } from "lucide-react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../../data/useNotifications";
import DateTime from "../../domain/DateTime";
import { cn } from "../../ui/cn";

const LINKS = {
  session_booked: "/tutor/sessions",
  session_confirmed: "/student/sessions",
  session_cancelled: "/dashboard",
  session_pending_confirmation: "/student/sessions",
  session_completed: "/tutor/sessions",
  session_disputed: "/admin/sessions",
  dispute_resolved: "/dashboard",
  tutor_verified: "/tutor/profile",
};

export default function NotificationBell({ className }) {
  const { t } = useTranslation("notifications");
  const [open, setOpen] = useState(false);
  const container = useRef(null);

  const { data } = useNotifications({ limit: 15 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data || [];
  const unread = data?.unread || 0;

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
        aria-label={t("title")}
        className="relative p-2 rounded-lg text-content-secondary hover:bg-surface-muted hover:text-content-primary transition-colors focus-visible:outline-none focus-visible:ring-2 ring-brand"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-danger-solid text-on-solid text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line-default bg-surface shadow-lg z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-line-subtle">
            <p className="text-sm font-semibold text-content-primary">
              {t("title")}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                <CheckCheck size={14} />
                {t("markAllRead")}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-sm text-content-muted text-center">
              {t("empty")}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-line-subtle">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    to={LINKS[notification.type] || "/dashboard"}
                    onClick={() => {
                      if (!notification.readAt) markRead.mutate(notification.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "block px-4 py-3 hover:bg-surface-muted transition-colors",
                      !notification.readAt && "bg-brand-surface/60",
                    )}
                  >
                    <p className="text-sm text-content-primary">
                      {t(`type.${notification.type}`, {
                        ...notification.payload,
                        defaultValue: t("type.fallback"),
                      })}
                    </p>
                    <p className="text-xs text-content-muted mt-0.5">
                      <DateTime value={notification.createdAt} preset="dateTime" />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
