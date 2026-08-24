import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Money from "../../domain/Money";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  useCancelSession,
  useCompleteSession,
  useConfirmSession,
  useSessions,
} from "../../data/useSessions";
import SessionStatusBadge from "../../domain/SessionStatusBadge";
import { useLocaleSettings } from "../../domain/useLocaleSettings";

function ConfirmModal({
  title,
  message,
  confirmLabel,
  variant,
  onClose,
  onConfirm,
  isPending,
}) {
  const { t } = useTranslation();
  const colors = {
    danger: "bg-danger-solid hover:bg-danger-solid-hover",
    warning: "bg-brand-solid hover:brightness-95",
    success: "bg-positive-solid hover:bg-positive-solid-hover",
  };
  const iconColors = {
    danger: "bg-danger-surface text-danger-content",
    warning: "bg-brand-surface text-brand",
    success: "bg-positive-surface text-positive-content",
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
            disabled={isPending}
            className="flex-1 py-2 border border-line-strong text-content-primary rounded-lg hover:bg-surface-muted transition-colors text-sm disabled:opacity-50"
          >
            {t("common:action.cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 py-2 text-on-solid rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${colors[variant]}`}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? t("state.processing") : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TutorMySessions() {
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

  const closeModal = () => setModal(null);

  const { mutate: confirmSession, isPending: isConfirming } = useConfirmSession();
  const { mutate: completeSession, isPending: isCompleting } =
    useCompleteSession(closeModal);
  const { mutate: cancelSession, isPending: isCancelling } =
    useCancelSession(closeModal);

  const isProcessing = isConfirming || isCompleting || isCancelling;

  const sessions = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const handleFilterChange = (key) => {
    setFilter(key);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-content-primary mb-2">{t("sessions:mine.title")}</h1>
        <p className="text-content-secondary mb-8">{t("sessions:mine.tutorSubtitle")}</p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "all", label: t("sessions:filter.all") },
            { key: "pending", label: t("sessionStatus.pending") },
            { key: "confirmed", label: t("sessionStatus.confirmed") },
            { key: "completed", label: t("sessionStatus.completed") },
            { key: "cancelled", label: t("sessionStatus.cancelled") },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                ${filter === f.key ? "bg-brand-solid text-brand-contrast" : "bg-surface text-content-secondary border border-line-default hover:border-brand"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-surface rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-surface-sunken rounded w-1/3 mb-3" />
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
            <p className="text-content-secondary mt-1">
              {t("sessions:mine.emptyInCategory")}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {sessions.map((session, i) => {
                const [year, month, day] = session.date
                  .split("T")[0]
                  .split("-")
                  .map(Number);
                const date = new Date(year, month - 1, day).toLocaleDateString(
                  locale,
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                );

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-surface rounded-xl border border-line-subtle shadow-sm p-4 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-content-primary text-base leading-tight mb-1">
                          {session.subject.name}
                        </h3>
                        <p className="text-sm text-content-secondary">
                          {t("sessions:mine.studentLabel", { name: session.student.name })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <SessionStatusBadge status={session.status} />
                        <span className="text-brand font-semibold text-sm">
                          <Money value={session.price} currency={session.currency} />
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-content-secondary mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar
                          size={14}
                          className="text-content-muted flex-shrink-0"
                        />
                        <span className="truncate">{date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock
                          size={14}
                          className="text-content-muted flex-shrink-0"
                        />
                        {session.startTime} - {session.endTime}
                      </div>
                    </div>

                    {session.notes && (
                      <div className="bg-surface-muted rounded-lg p-3 mb-4">
                        <p className="text-xs text-content-secondary font-medium mb-1">
                          {t("sessions:mine.studentNotes")}
                        </p>
                        <p className="text-sm text-content-secondary">{session.notes}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-line-subtle">
                      {session.status === "pending" && (
                        <>
                          <button
                            onClick={() => confirmSession(session.id)}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 bg-positive-solid hover:bg-positive-solid-hover text-on-solid text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isConfirming ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            {isConfirming ? t("sessions:mine.confirming") : t("action.confirm")}
                          </button>
                          <button
                            onClick={() =>
                              setModal({
                                title: t("sessions:confirm.rejectTitle"),
                                message: t("sessions:confirm.rejectWarning"),
                                confirmLabel: t("sessions:confirm.rejectYes"),
                                variant: "danger",
                                onConfirm: () => cancelSession(session.id),
                              })
                            }
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 border border-danger-line text-danger-content hover:bg-danger-surface text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X size={14} />
                            {t("common:action.reject")}
                          </button>
                        </>
                      )}

                      {session.status === "confirmed" && (
                        <>
                          {session.meetingUrl && (
                            <a
                              href={session.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-info-solid hover:bg-info-solid-hover text-on-solid text-sm rounded-lg transition-colors"
                            >
                              <Video size={14} />
                              {t("sessions:mine.join")}
                            </a>
                          )}
                          <button
                            onClick={() =>
                              setModal({
                                title: t("sessions:confirm.completeTitle"),
                                message: t("sessions:confirm.completeWarning"),
                                confirmLabel: t("sessions:confirm.completeYes"),
                                variant: "success",
                                onConfirm: () => completeSession(session.id),
                              })
                            }
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 bg-positive-solid hover:bg-positive-solid-hover text-on-solid text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle size={14} />
                            {t("sessions:mine.complete")}
                          </button>
                          <button
                            onClick={() =>
                              setModal({
                                title: t("admin:sessions.cancelTitle"),
                                message: t("admin:sessions.cancelWarning"),
                                confirmLabel: t("admin:sessions.cancelConfirm"),
                                variant: "danger",
                                onConfirm: () => cancelSession(session.id),
                              })
                            }
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 border border-danger-line text-danger-content hover:bg-danger-surface text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X size={14} />
                            {t("common:action.cancel")}
                          </button>
                        </>
                      )}
                    </div>
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
                  noun: t("sessions:mine.noun"),
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
          onClose={() => !isProcessing && setModal(null)}
          onConfirm={modal.onConfirm}
          isPending={isProcessing}
        />
      )}
    </div>
  );
}
