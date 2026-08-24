import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Money from "../../domain/Money";
import {
  Calendar,
  Clock,
  Video,
  Star,
  X,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useCancelSession,
  useDisputeSession,
  useSessions,
  useStudentConfirmSession,
} from "../../data/useSessions";
import { useCreateReview } from "../../data/useReviews";
import SessionStatusBadge, {
  SESSION_STATUS_VALUES,
} from "../../domain/SessionStatusBadge";
import { useLocaleSettings } from "../../domain/useLocaleSettings";

function ReviewModal({ session, onClose, onSubmit, isPending }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface rounded-xl p-6 w-full max-w-md"
      >
        <h3 className="text-lg font-bold text-content-primary mb-1">{t("sessions:mine.leaveReview")}</h3>
        <p className="text-sm text-content-secondary mb-6">
          {t("sessions:mine.withTutor", { name: session.tutor.name })}
        </p>
        <div className="flex gap-2 mb-4 justify-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setRating(s)}>
              <Star
                size={32}
                className={
                  s <= rating
                    ? "text-rating fill-rating"
                    : "text-content-muted fill-line-default"
                }
              />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("sessions:mine.reviewPlaceholder")}
          rows={3}
          className="w-full px-4 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand resize-none text-sm mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-line-strong text-content-primary rounded-lg hover:bg-surface-muted transition-colors text-sm"
          >
            {t("common:action.cancel")}
          </button>
          <button
            onClick={() => onSubmit({ sessionId: session.id, rating, comment })}
            disabled={isPending}
            className="flex-1 py-2 bg-brand-solid hover:brightness-95 text-brand-contrast rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {isPending
              ? t("common:state.processing")
              : t("sessions:mine.sendReview")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DisputeModal({ session, onClose, onSubmit, isPending }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-1">
          <AlertTriangle className="text-danger-content" size={22} />
          <h3 className="text-lg font-bold text-content-primary">{t("sessions:mine.reportProblem")}</h3>
        </div>
        <p className="text-sm text-content-secondary mb-6">
          {t("sessions:mine.sessionWith", { name: session.tutor.name })}
        </p>
        <div className="bg-danger-surface border border-danger-line rounded-lg p-3 mb-4">
          <p className="text-xs text-danger-content">
            {t("sessions:mine.disputeNote")}
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-content-primary mb-1">
            {t("sessions:mine.describeProblem")}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("sessions:mine.problemPlaceholder")}
            rows={4}
            className="w-full px-4 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-danger-solid resize-none text-sm"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-line-strong text-content-primary rounded-lg hover:bg-surface-muted transition-colors text-sm"
          >
            {t("common:action.cancel")}
          </button>
          <button
            onClick={() => onSubmit(session.id, reason)}
            disabled={isPending || !reason.trim()}
            className="flex-1 py-2 bg-danger-solid hover:bg-danger-solid-hover text-on-solid rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {isPending ? t("state.processing") : t("sessions:mine.sendReport")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CancelModal({ onClose, onConfirm }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-danger-surface flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-danger-content" />
          </div>
          <h3 className="text-lg font-bold text-content-primary">{t("sessions:mine.cancelTitle")}</h3>
        </div>
        <p className="text-sm text-content-secondary mb-6">
          {t("sessions:mine.cancelWarning")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-line-strong text-content-primary rounded-lg hover:bg-surface-muted transition-colors text-sm"
          >
            {t("sessions:mine.keepSession")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-danger-solid hover:bg-danger-solid-hover text-on-solid rounded-lg transition-colors text-sm"
          >
            {t("sessions:mine.confirmCancel")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function MySessions() {
  const { t } = useTranslation();
  const { locale } = useLocaleSettings();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [reviewSession, setReviewSession] = useState(null);
  const [disputeSession, setDisputeSession] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const limit = 10;

  const { data, isLoading } = useSessions({
    page,
    limit,
    status: filter === "all" ? undefined : filter,
  });

  const { mutate: cancelSession } = useCancelSession();
  const { mutate: submitReview, isPending: isReviewing } = useCreateReview(() =>
    setReviewSession(null),
  );
  const { mutate: studentConfirm, isPending: isConfirming } =
    useStudentConfirmSession();
  const { mutate: submitDispute, isPending: isDisputing } = useDisputeSession(() =>
    setDisputeSession(null),
  );

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
        <p className="text-content-secondary mb-8">{t("sessions:mine.studentSubtitle")}</p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", ...SESSION_STATUS_VALUES].map((key) => (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                ${filter === key ? "bg-brand-solid text-brand-contrast" : "bg-surface text-content-secondary border border-line-default hover:border-brand"}`}
            >
              {t(`common:sessionStatus.${key}`)}
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
                          {t("sessions:mine.withShort", { name: session.tutor.name })}
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

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-line-subtle">
                      {session.status === "confirmed" && session.meetingUrl && (
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

                      {session.status === "pending_confirmation" && (
                        <>
                          <button
                            onClick={() => studentConfirm(session.id)}
                            disabled={isConfirming}
                            className="flex items-center gap-2 px-4 py-2 bg-accent-solid hover:bg-accent-solid-hover text-on-solid text-sm rounded-lg transition-colors disabled:opacity-50"
                          >
                            <CheckCircle size={14} />
                            {t("sessions:mine.confirmReceived")}
                          </button>
                          <button
                            onClick={() => setDisputeSession(session)}
                            className="flex items-center gap-2 px-4 py-2 border border-danger-line text-danger-content hover:bg-danger-surface text-sm rounded-lg transition-colors"
                          >
                            <AlertTriangle size={14} />
                            {t("sessions:mine.reportProblem")}
                          </button>
                          <div className="w-full flex items-center gap-2 text-xs text-warning-content bg-warning-surface border border-warning-line px-3 py-2 rounded-lg">
                            {t("sessions:mine.autoReleaseHint")}
                          </div>
                        </>
                      )}

                      {session.status === "disputed" && (
                        <div className="flex items-center gap-2 text-danger-content text-sm bg-danger-surface border border-danger-line px-3 py-2 rounded-lg">
                          <AlertTriangle size={14} />
                          {t("sessions:mine.disputeUnderReview")}
                        </div>
                      )}

                      {["pending", "confirmed"].includes(session.status) && (
                        <button
                          onClick={() => setConfirmModal(session.id)}
                          className="flex items-center gap-2 px-4 py-2 border border-danger-line text-danger-content hover:bg-danger-surface text-sm rounded-lg transition-colors"
                        >
                          <X size={14} />
                          {t("common:action.cancel")}
                        </button>
                      )}

                      {session.status === "completed" && !session.review && (
                        <button
                          onClick={() => setReviewSession(session)}
                          className="flex items-center gap-2 px-4 py-2 border border-brand-line text-brand hover:bg-brand-surface text-sm rounded-lg transition-colors"
                        >
                          <Star size={14} />
                          {t("sessions:mine.leaveReview")}
                        </button>
                      )}

                      {session.status === "completed" && session.review && (
                        <div className="flex items-center gap-2 text-positive-content text-sm">
                          <CheckCircle size={14} />
                          {t("sessions:toast.reviewSent")}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-3">
              <p className="text-sm text-content-secondary">
                Mostrando {from}-{to} de {total} sesiones
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

      {reviewSession && (
        <ReviewModal
          session={reviewSession}
          onClose={() => setReviewSession(null)}
          onSubmit={submitReview}
          isPending={isReviewing}
        />
      )}

      {disputeSession && (
        <DisputeModal
          session={disputeSession}
          onClose={() => setDisputeSession(null)}
          onSubmit={(id, reason) => submitDispute({ id, reason })}
          isPending={isDisputing}
        />
      )}

      {confirmModal && (
        <CancelModal
          onClose={() => setConfirmModal(null)}
          onConfirm={() => {
            cancelSession(confirmModal);
            setConfirmModal(null);
          }}
        />
      )}
    </div>
  );
}
