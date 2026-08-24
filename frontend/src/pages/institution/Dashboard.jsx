import {
  Users,
  BookOpen,
  Star,
  TrendingUp,
  Award,
  DollarSign,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAnalytics, useInstitutionStudents } from "../../data/useInstitution";
import { Badge, Card, SkeletonStats } from "../../ui";
import { PageHeader, PageShell, StatCard } from "../../patterns";
import Money from "../../domain/Money";
import DateTime from "../../domain/DateTime";
import SessionStatusBadge from "../../domain/SessionStatusBadge";

function Panel({ icon: Icon, title, empty, children }) {
  return (
    <Card className="p-5 sm:p-6">
      <h3 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
        <Icon size={16} className="text-brand" />
        {title}
      </h3>
      {empty ? (
        <p className="text-sm text-content-muted text-center py-6">{empty}</p>
      ) : (
        children
      )}
    </Card>
  );
}

export default function InstitutionDashboardPage() {
  const { t } = useTranslation();
  const { data: analytics, isLoading } = useAnalytics();
  const { data: studentsData } = useInstitutionStudents({ page: 1, limit: 10 });

  const overview = analytics?.overview;
  const currency = overview?.currencyCode;

  const stats = [
    {
      label: t("dashboard:stat.students"),
      value: overview?.totalStudents || 0,
      icon: Users,
      tone: "info",
    },
    {
      label: t("dashboard:stat.tutors"),
      value: overview?.totalTutors || 0,
      icon: Award,
      tone: "brand",
    },
    {
      label: t("dashboard:stat.sessions"),
      value: overview?.totalSessions || 0,
      icon: BookOpen,
      tone: "positive",
    },
    {
      label: t("dashboard:stat.completionRate"),
      value: `${overview?.completionRate || 0}%`,
      icon: TrendingUp,
      tone: "warning",
    },
    {
      label: t("dashboard:stat.balance"),
      value: <Money value={overview?.institutionBalance} currency={currency} />,
      icon: DollarSign,
      tone: "positive",
    },
  ];

  return (
    <PageShell width="max-w-6xl">
      <PageHeader
        title={t("dashboard:institution.title")}
        subtitle={t("dashboard:institution.subtitle")}
      />

      {isLoading ? (
        <SkeletonStats count={5} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} index={index} {...stat} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Panel
          icon={Star}
          title={t("admin:dashboard.topTutors")}
          empty={!analytics?.topTutors?.length && t("common:state.empty")}
        >
          <div className="space-y-3">
            {analytics?.topTutors?.map((tutor, index) => (
              <div key={tutor.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-content-muted w-5 flex-shrink-0">
                  {index + 1}
                </span>
                <span className="w-8 h-8 rounded-full bg-brand-surface flex items-center justify-center text-brand font-bold text-sm flex-shrink-0">
                  {tutor.name.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content-primary truncate">
                    {tutor.name}
                  </p>
                  <p className="text-xs text-content-muted">
                    {t("common:unit.session", {
                      count: tutor.tutorProfile?.totalSessions || 0,
                    })}
                  </p>
                </div>
                <span className="flex items-center gap-1 flex-shrink-0 text-sm font-medium text-content-primary">
                  <Star size={12} className="text-rating fill-rating" />
                  {Number(tutor.tutorProfile?.averageRating || 0).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          icon={BookOpen}
          title={t("admin:dashboard.topSubjects")}
          empty={!analytics?.topSubjects?.length && t("common:state.empty")}
        >
          <div className="space-y-3">
            {analytics?.topSubjects?.map((subject, index) => (
              <div key={subject.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-content-muted w-5 flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content-primary truncate">
                    {subject.name}
                  </p>
                  <p className="text-xs text-content-muted">{subject.code}</p>
                </div>
                <Badge tone="brand">
                  {t("common:unit.session", { count: subject._count.sessions })}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          icon={TrendingUp}
          title={t("dashboard:institution.recentSessions")}
          empty={!analytics?.recentSessions?.length && t("common:state.empty")}
        >
          <div className="space-y-3">
            {analytics?.recentSessions?.slice(0, 5).map((session) => (
              <div key={session.id} className="flex items-center gap-3 text-sm">
                <span className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-content-secondary font-bold text-xs flex-shrink-0">
                  {session.student.name.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-content-primary truncate">
                    {session.student.name} → {session.tutor.name}
                  </p>
                  <p className="text-xs text-content-muted">
                    {session.subject.name} · <DateTime value={session.date} />
                  </p>
                </div>
                <SessionStatusBadge status={session.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={DollarSign} title={t("dashboard:institution.subsidySummary")}>
          <div className="bg-positive-surface border border-positive-line rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-content-primary">
                {t("dashboard:institution.availableBalance")}
              </p>
              <p className="text-xs text-content-muted">{t("dashboard:institution.subsidyFunds")}</p>
            </div>
            <Money
              value={overview?.institutionBalance}
              currency={currency}
              className="text-xl sm:text-2xl font-bold text-positive-content break-all text-right"
            />
          </div>

          <dl className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-line-subtle gap-3">
              <dt className="text-sm text-content-secondary">{t("institution:subsidies.totalSubsidised")}</dt>
              <dd>
                <Money
                  value={overview?.totalSubsidiesAmount}
                  currency={currency}
                  className="font-semibold text-positive-content break-all"
                />
              </dd>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-line-subtle">
              <dt className="text-sm text-content-secondary">{t("dashboard:institution.totalStudents")}</dt>
              <dd className="font-semibold text-content-primary">
                {studentsData?.total ?? 0}
              </dd>
            </div>
            <div className="flex justify-between items-center py-2">
              <dt className="text-sm text-content-secondary">{t("dashboard:tutor.completedSessions")}</dt>
              <dd className="font-semibold text-content-primary">
                {overview?.completedSessions || 0}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </PageShell>
  );
}

