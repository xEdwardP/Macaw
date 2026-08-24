import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Star,
  DollarSign,
  CheckCircle,
  Clock,
  ChevronRight,
  Video,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import {
  useCancelSession,
  useCompleteSession,
  useConfirmSession,
  useSessions,
} from "../../data/useSessions";
import { useMyWallet } from "../../data/useWallet";
import Money from "../../domain/Money";
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

export default function TutorDashboard() {
  const { t } = useTranslation();
  const { locale } = useLocaleSettings();
  const { user } = useAuthStore();
  const [modal, setModal] = useState(null);

  const { data: sessionsData } = useSessions({ page: 1, limit: 100 });
  const { data: wallet } = useMyWallet();

  const sessions = sessionsData?.data || [];

  const closeModal = () => setModal(null);

  const { mutate: confirmSession, isPending: isConfirming } = useConfirmSession();
  const { mutate: completeSession, isPending: isCompleting } =
    useCompleteSession(closeModal);
  const { mutate: cancelSession, isPending: isCancelling } =
    useCancelSession(closeModal);

  const isProcessing = isConfirming || isCompleting || isCancelling;

  const allSessions = sessions || [];
  const pendingSessions = allSessions.filter((s) => s.status === "pending");
  const confirmedSessions = allSessions.filter((s) => s.status === "confirmed");
  const completedCount = allSessions.filter(
    (s) => s.status === "completed",
  ).length;

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-content-primary">
            {t("dashboard:greeting", { name: user?.name?.split(" ")[0] })}
          </h1>
          <p className="text-content-secondary mt-1">{t("dashboard:tutor.title")}</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            {
              label: t("dashboard:stat.availableBalance"),
              value: <Money value={wallet?.balance} currency={wallet?.currency} />,
              icon: DollarSign,
              color: "text-brand",
              bg: "bg-brand-surface",
            },
            {
              label: t("dashboard:tutor.requests"),
              value: pendingSessions.length,
              icon: Clock,
              color: "text-warning-content",
              bg: "bg-warning-surface",
            },
            {
              label: t("common:sessionStatus.confirmed"),
              value: confirmedSessions.length,
              icon: Calendar,
              color: "text-info-content",
              bg: "bg-info-surface",
            },
            {
              label: t("common:sessionStatus.completed"),
              value: completedCount,
              icon: CheckCircle,
              color: "text-positive-content",
              bg: "bg-positive-surface",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-surface rounded-xl border border-line-subtle shadow-sm p-4 sm:p-5"
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-3 ${stat.bg}`}
              >
                <stat.icon size={18} className={stat.color} />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-content-primary break-all leading-tight">
                {stat.value}
              </div>
              <div className="text-xs text-content-secondary mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-5 sm:p-6">
            <h3 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
              <Clock size={16} className="text-warning-content" />
              {t("dashboard:tutor.pendingRequests")}
              {pendingSessions.length > 0 && (
                <span className="bg-warning-surface text-warning-content text-xs px-2 py-0.5 rounded-full">
                  {pendingSessions.length}
                </span>
              )}
            </h3>

            {pendingSessions.length === 0 ? (
              <p className="text-sm text-content-muted text-center py-6">
                {t("dashboard:tutor.noPending")}
              </p>
            ) : (
              <div className="space-y-3">
                {pendingSessions.map((session) => {
                  const [year, month, day] = session.date
                    .split("T")[0]
                    .split("-")
                    .map(Number);
                  const date = new Date(
                    year,
                    month - 1,
                    day,
                  ).toLocaleDateString(locale, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={session.id}
                      className="border border-line-subtle rounded-lg p-3 sm:p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-info-surface flex items-center justify-center text-info-content font-bold text-sm flex-shrink-0">
                          {session.student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-content-primary truncate">
                            {session.student.name}
                          </p>
                          <p className="text-xs text-content-muted truncate">
                            {session.subject.name} · {date} {session.startTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmSession(session.id)}
                          disabled={isProcessing}
                          className="flex-1 py-1.5 bg-positive-solid hover:bg-positive-solid-hover text-on-solid text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {isConfirming ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : null}
                          {isConfirming ? t("sessions:mine.confirming") : t("action.confirm")}
                        </button>
                        <button
                          onClick={() =>
                            setModal({
                              title: t("sessions:mine.rejectTitle"),
                              message: t("sessions:mine.rejectWarning", {
                              name: session.student.name,
                            }),
                              confirmLabel: t("sessions:mine.rejectConfirm"),
                              variant: "danger",
                              onConfirm: () => cancelSession(session.id),
                            })
                          }
                          disabled={isProcessing}
                          className="flex-1 py-1.5 border border-danger-line text-danger-content hover:bg-danger-surface text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t("common:action.reject")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-5 sm:p-6">
            <h3 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-info-content" />
              {t("dashboard:tutor.confirmedSessions")}
            </h3>

            {confirmedSessions.length === 0 ? (
              <p className="text-sm text-content-muted text-center py-6">
                {t("dashboard:tutor.noConfirmed")}
              </p>
            ) : (
              <div className="space-y-3">
                {confirmedSessions.map((session) => {
                  const [year, month, day] = session.date
                    .split("T")[0]
                    .split("-")
                    .map(Number);
                  const date = new Date(
                    year,
                    month - 1,
                    day,
                  ).toLocaleDateString(locale, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={session.id}
                      className="border border-line-subtle rounded-lg p-3 sm:p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-brand-surface flex items-center justify-center text-brand font-bold text-sm flex-shrink-0">
                          {session.student.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-content-primary truncate">
                            {session.student.name}
                          </p>
                          <p className="text-xs text-content-muted truncate">
                            {session.subject.name} · {date} {session.startTime}
                          </p>
                        </div>
                        <span className="text-brand font-semibold text-sm flex-shrink-0">
                          <Money value={session.price} currency={session.currency} />
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {session.meetingUrl && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 bg-info-solid hover:bg-info-solid-hover text-on-solid text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Video size={12} />
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
                          className="flex-1 py-1.5 bg-positive-solid hover:bg-positive-solid-hover text-on-solid text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t("sessions:mine.complete")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-5 sm:p-6">
            <h3 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-brand" />
              {t("dashboard:tutor.earningsSummary")}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-line-subtle gap-3">
                <span className="text-sm text-content-secondary">{t("wallet:availableBalance")}</span>
                <span className="font-semibold text-content-primary break-all text-right">
                  <Money value={wallet?.balance} currency={wallet?.currency} />
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-line-subtle gap-3">
                <span className="text-sm text-content-secondary">{t("dashboard:tutor.totalEarnings")}</span>
                <span className="font-semibold text-positive-content break-all text-right">
                  <Money value={wallet?.lifetimeEarned} currency={wallet?.currency} />
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-content-secondary">
                  {t("dashboard:tutor.completedSessions")}
                </span>
                <span className="font-semibold text-content-primary">
                  {completedCount}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-5 sm:p-6">
            <h3 className="font-semibold text-content-primary mb-4">
              {t("dashboard:student.quickActions")}
            </h3>
            <div className="space-y-2">
              {[
                {
                  label: t("dashboard:tutor.allSessions"),
                  icon: Calendar,
                  to: "/tutor/sessions",
                  color: "text-info-content",
                  bg: "bg-info-surface",
                },
                {
                  label: t("nav:link.wallet"),
                  icon: DollarSign,
                  to: "/tutor/wallet",
                  color: "text-positive-content",
                  bg: "bg-positive-surface",
                },
                {
                  label: t("nav:link.myProfile"),
                  icon: Users,
                  to: "/tutor/profile",
                  color: "text-brand",
                  bg: "bg-brand-surface",
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-muted transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.bg}`}
                  >
                    <action.icon size={16} className={action.color} />
                  </div>
                  <span className="text-sm font-medium text-content-primary">
                    {action.label}
                  </span>
                  <ChevronRight size={14} className="text-content-muted ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        </div>
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
