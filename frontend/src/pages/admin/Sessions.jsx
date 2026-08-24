import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Money from "../../domain/Money";
import {
  Calendar,
  Clock,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useCancelSession,
  useResolveSession,
  useSessions,
} from "../../data/useSessions";
import { useLocaleSettings } from "../../domain/useLocaleSettings";
import SessionStatusBadge from "../../domain/SessionStatusBadge";

const FILTERS = [
  "all",
  "pending",
  "confirmed",
  "pending_confirmation",
  "disputed",
  "completed",
  "cancelled",
];

function ConfirmModal({
  title,
  message,
  confirmLabel,
  variant,
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation();
  const colors = {
    danger: "bg-danger-solid hover:bg-danger-solid-hover",
    warning: "bg-brand-solid hover:brightness-95",
    success: "bg-positive-solid hover:bg-positive-solid-hover",
    info: "bg-info-solid hover:bg-info-solid-hover",
  };
  const iconColors = {
    danger: "bg-danger-surface text-danger-content",
    warning: "bg-brand-surface text-brand",
    success: "bg-positive-surface text-positive-content",
    info: "bg-info-surface text-info-content",
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconColors[variant]}`}
          >
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-lg font-bold text-content-primary">{title}</h3>
        </div>
        <p className="text-sm text-content-secondary mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-line-strong text-content-primary rounded-lg hover:bg-surface-muted transition-colors text-sm"
          >
            {t("common:action.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 text-on-solid rounded-lg transition-colors text-sm ${colors[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminSessions() {
  const { t } = useTranslation();
  const { locale } = useLocaleSettings();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const limit = 10;

  const { data, isLoading } = useSessions({
    page,
    limit,
    status: filter === "all" ? undefined : filter,
  });

  const { mutate: cancelSession } = useCancelSession();
  const { mutate: resolveDispute } = useResolveSession();

  const sessions = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const { data: disputedData } = useSessions({
    page: 1,
    limit: 1,
    status: "disputed",
  });
  const disputedCount = disputedData?.total || 0;

  const handleFilterChange = (key) => {
    setFilter(key);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-content-primary mb-2">{t("admin:sessions.title")}</h1>
        <p className="text-content-secondary mb-8">
          {t("admin:sessions.subtitle")}
        </p>

        {disputedCount > 0 && (
          <div className="bg-danger-surface border border-danger-line rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-danger-content flex-shrink-0" size={20} />
            <p className="text-sm text-danger-content font-medium">
              {t("admin:sessions.disputesPending", { count: disputedCount })}
            </p>
            <button
              onClick={() => handleFilterChange("disputed")}
              className="ml-auto text-xs text-danger-content underline hover:text-danger-content flex-shrink-0"
            >
              {t("admin:sessions.viewDisputes")}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[
            {
              label: t("admin:sessions.totalInFilter"),
              value: total,
              color: "text-content-primary",
            },
            {
              label: t("common:sessionStatus.disputed"),
              value: disputedCount,
              color: "text-danger-content",
            },
            {
              label: t("admin:sessions.page"),
              value: `${page} / ${totalPages}`,
              color: "text-brand",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface rounded-xl border border-line-subtle shadow-sm p-4 text-center"
            >
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-content-secondary mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                ${filter === key ? "bg-brand-solid text-brand-contrast" : "bg-surface text-content-secondary border border-line-default hover:border-brand"}`}
            >
              {key === "all"
                ? t("common:sessionStatus.all")
                : t(`common:sessionStatus.${key}`)}
              {key === "disputed" && disputedCount > 0 && (
                <span className="ml-1.5 bg-danger-solid text-on-solid text-xs rounded-full px-1.5 py-0.5">
                  {disputedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-surface rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-surface-sunken rounded w-1/3 mb-2" />
                <div className="h-3 bg-surface-sunken rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="mx-auto text-content-muted mb-4" size={48} />
            <h3 className="text-lg font-medium text-content-primary">
              {t("sessions:mine.empty")}
            </h3>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {sessions.map((session, i) => {
                const [year, month, day] = session.date
                  .split("T")[0]
                  .split("-")
                  .map(Number);
                const date = new Date(year, month - 1, day).toLocaleDateString(
                  locale,
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                );

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`bg-surface rounded-xl border shadow-sm p-4 sm:p-5
                      ${session.status === "disputed" ? "border-danger-line bg-danger-surface/30" : "border-line-subtle"}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-medium text-content-primary">
                            {session.subject.name}
                          </h3>
                          <SessionStatusBadge status={session.status} />
                        </div>
                        <p className="text-sm text-content-secondary truncate">
                          {session.student.name} → {session.tutor.name}
                        </p>
                        {session.status === "disputed" && session.notes && (
                          <p className="text-xs text-danger-content mt-1 bg-danger-surface px-2 py-1 rounded">
                            {t("admin:sessions.reason", { reason: session.notes })}
                          </p>
                        )}
                      </div>
                      <span className="text-brand font-semibold flex-shrink-0">
                        <Money value={session.price} currency={session.currency} />
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-content-muted">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="flex-shrink-0" />
                        <span className="truncate">{date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={13} className="flex-shrink-0" />
                        {session.startTime} - {session.endTime}
                      </div>
                    </div>

                    {["pending", "confirmed"].includes(session.status) && (
                      <div className="mt-3 pt-3 border-t border-line-subtle">
                        <button
                          onClick={() =>
                            setModal({
                              title: t("admin:sessions.cancelTitle"),
                              message: t("admin:sessions.cancelWarning"),
                              confirmLabel: t("admin:sessions.cancelConfirm"),
                              variant: "danger",
                              onConfirm: () => {
                                cancelSession(session.id);
                                setModal(null);
                              },
                            })
                          }
                          className="flex items-center gap-2 px-3 py-1.5 border border-danger-line text-danger-content hover:bg-danger-surface text-sm rounded-lg transition-colors"
                        >
                          <X size={14} />
                          {t("sessions:mine.cancelTitle")}
                        </button>
                      </div>
                    )}

                    {session.status === "disputed" && (
                      <div className="mt-3 pt-3 border-t border-danger-line">
                        <p className="text-xs text-danger-content font-medium mb-2">
                          {t("admin:sessions.resolveDispute")}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setModal({
                                title: t("admin:sessions.favourStudentTitle"),
                                message: t("admin:sessions.favourStudentWarning"),
                                confirmLabel: t("admin:sessions.favourStudent"),
                                variant: "info",
                                onConfirm: () => {
                                  resolveDispute({
                                    id: session.id,
                                    favorOf: "student",
                                  });
                                  setModal(null);
                                },
                              })
                            }
                            className="flex-1 py-1.5 bg-info-solid hover:bg-info-solid-hover text-on-solid text-xs rounded-lg transition-colors"
                          >
                            {t("admin:sessions.favourStudent")}
                          </button>
                          <button
                            onClick={() =>
                              setModal({
                                title: t("admin:sessions.favourTutorTitle"),
                                message: t("admin:sessions.favourTutorWarning"),
                                confirmLabel: t("admin:sessions.favourTutor"),
                                variant: "success",
                                onConfirm: () => {
                                  resolveDispute({
                                    id: session.id,
                                    favorOf: "tutor",
                                  });
                                  setModal(null);
                                },
                              })
                            }
                            className="flex-1 py-1.5 bg-positive-solid hover:bg-positive-solid-hover text-on-solid text-xs rounded-lg transition-colors"
                          >
                            {t("admin:sessions.favourTutor")}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-3">
              <p className="text-sm text-content-secondary">
                {t("common:pagination.showing", {
                  from,
                  to,
                  total,
                  noun: t("admin:sessions.noun"),
                })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 border border-line-default rounded-lg text-sm text-content-secondary hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                  {t("common:action.previous")}
                </button>
                <span className="text-sm text-content-secondary">
                  {t("pagination.pageOf", { page, totalPages })}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 border border-line-default rounded-lg text-sm text-content-secondary hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t("common:action.next")}
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modal && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          variant={modal.variant}
          onClose={() => setModal(null)}
          onConfirm={modal.onConfirm}
        />
      )}
    </div>
  );
}
