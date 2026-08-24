import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Calendar,
  Search,
  Wallet,
  Star,
  Clock,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useSessions } from "../../data/useSessions";
import { useMyWallet } from "../../data/useWallet";
import { useRecommendations } from "../../data/useReviews";
import Money from "../../domain/Money";
import SessionStatusBadge from "../../domain/SessionStatusBadge";
import { useLocaleSettings } from "../../domain/useLocaleSettings";

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { locale } = useLocaleSettings();
  const { user } = useAuthStore();

  const { data: sessionsData } = useSessions({ page: 1, limit: 100 });
  const { data: wallet } = useMyWallet();
  const { data: aiData } = useRecommendations({ retry: false });

  const sessions = sessionsData?.data || [];

  const upcomingSessions = (sessions || [])
    .filter((s) => ["pending", "confirmed"].includes(s.status))
    .slice(0, 3);

  const completedCount = (sessions || []).filter(
    (s) => s.status === "completed",
  ).length;
  const recommendations = aiData?.recommendations || [];

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
          <p className="text-content-secondary mt-1">{t("dashboard:student.welcome")}</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            {
              label: t("dashboard:stat.availableBalance"),
              value: <Money value={wallet?.balance} currency={wallet?.currency} />,
              icon: Wallet,
              color: "text-brand",
              bg: "bg-brand-surface",
            },
            {
              label: t("dashboard:stat.activeSessions"),
              value: upcomingSessions.length,
              icon: Calendar,
              color: "text-info-content",
              bg: "bg-info-surface",
            },
            {
              label: t("common:sessionStatus.completed"),
              value: completedCount,
              icon: Star,
              color: "text-positive-content",
              bg: "bg-positive-surface",
            },
            {
              label: t("wallet:frozenBalance"),
              value: <Money value={wallet?.frozen} currency={wallet?.currency} />,
              icon: Clock,
              color: "text-warning-content",
              bg: "bg-warning-surface",
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-content-primary">
                  {t("dashboard:student.upcomingSessions")}
                </h3>
                <Link
                  to="/student/sessions"
                  className="text-sm text-brand hover:underline flex items-center gap-1"
                >
                  {t("dashboard:student.viewAll")} <ChevronRight size={14} />
                </Link>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto text-content-muted mb-3" size={36} />
                  <p className="text-content-secondary text-sm">
                    {t("dashboard:student.noUpcoming")}
                  </p>
                  <Link
                    to="/tutors"
                    className="mt-3 inline-block text-sm text-brand hover:underline"
                  >
                    {t("dashboard:student.findTutor")}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => {
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
                        className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted"
                      >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-surface flex items-center justify-center text-brand font-bold flex-shrink-0">
                          {session.tutor.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-content-primary truncate">
                            {session.subject.name}
                          </p>
                          <p className="text-xs text-content-muted truncate">
                            con {session.tutor.name} · {date}{" "}
                            {session.startTime}
                          </p>
                        </div>
                        <SessionStatusBadge status={session.status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-5 sm:p-6">
              <h3 className="font-semibold text-content-primary mb-4">
                {t("dashboard:student.quickActions")}
              </h3>
              <div className="space-y-2">
                {[
                  {
                    label: t("dashboard:student.findTutor"),
                    icon: Search,
                    to: "/tutors",
                    color: "text-brand",
                    bg: "bg-brand-surface",
                  },
                  {
                    label: t("nav:link.sessions"),
                    icon: Calendar,
                    to: "/student/sessions",
                    color: "text-info-content",
                    bg: "bg-info-surface",
                  },
                  {
                    label: t("nav:link.wallet"),
                    icon: Wallet,
                    to: "/student/wallet",
                    color: "text-positive-content",
                    bg: "bg-positive-surface",
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

            {recommendations.length > 0 && (
              <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-5 sm:p-6">
                <h3 className="font-semibold text-content-primary mb-1">
                  {t("dashboard:student.recommended")}
                </h3>
                <p className="text-xs text-content-muted mb-4">
                  {t("dashboard:student.recommendedSubtitle")}
                </p>
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((rec) => (
                    <Link
                      key={rec.tutorId}
                      to={`/tutors/${rec.tutorId}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-surface flex items-center justify-center text-brand font-bold text-sm flex-shrink-0">
                        {rec.tutor?.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-content-primary truncate">
                          {rec.tutor?.name}
                        </p>
                        <p className="text-xs text-content-muted truncate">
                          {rec.reason}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-content-muted flex-shrink-0"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
