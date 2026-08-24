import {
  Users,
  BookOpen,
  TrendingUp,
  DollarSign,
  Award,
  Star,
  Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useAnalytics,
  useInstitutionStudents,
  usePlatformEarnings,
} from "../../data/useInstitution";
import { Badge, Card, SkeletonStats } from "../../ui";
import { PageHeader, PageShell, StatCard } from "../../patterns";
import Money from "../../domain/Money";
import DateTime from "../../domain/DateTime";

function Panel({ icon: Icon, title, tone = "text-brand", empty, className, children }) {
  return (
    <Card className={`p-5 sm:p-6 ${className || ""}`}>
      <h3 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
        <Icon size={16} className={tone} />
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

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data: analytics, isLoading } = useAnalytics();
  const { data: studentsData } = useInstitutionStudents({ page: 1, limit: 10 });
  const { data: earnings } = usePlatformEarnings();

  const overview = analytics?.overview;
  const students = studentsData?.data || [];

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
      label: t("dashboard:stat.totalSessions"),
      value: overview?.totalSessions || 0,
      icon: BookOpen,
      tone: "positive",
    },
    {
      label: t("dashboard:stat.totalSubsidised"),
      value: <Money value={overview?.totalSubsidiesAmount} />,
      icon: DollarSign,
      tone: "warning",
    },
    {
      label: t("dashboard:stat.platformEarnings"),
      value: <Money value={earnings?.balance} currency={earnings?.currencyCode} />,
      icon: TrendingUp,
      tone: "positive",
    },
  ];

  return (
    <PageShell width="max-w-6xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Shield size={28} className="text-brand" />
            {t("admin:dashboard.title")}
          </span>
        }
        subtitle={t("admin:dashboard.subtitle")}
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
                <span className="flex items-center gap-1 flex-shrink-0 text-sm font-medium">
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
          icon={Users}
          title={t("admin:dashboard.registeredStudents")}
          empty={!students.length && t("common:state.empty")}
        >
          <div className="space-y-3">
            {students.slice(0, 6).map((student) => (
              <div key={student.id} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-info-surface flex items-center justify-center text-info-content font-bold text-sm flex-shrink-0">
                  {student.name.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content-primary truncate">
                    {student.name}
                  </p>
                  <p className="text-xs text-content-muted truncate">{student.program}</p>
                </div>
                <Money
                  value={student.wallet?.balance}
                  currency={student.wallet?.currency}
                  className="text-xs text-positive-content font-medium flex-shrink-0"
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={TrendingUp} title={t("admin:dashboard.platformSummary")}>
          <dl className="space-y-3">
            {[
              [t("admin:dashboard.completedSessions"), overview?.completedSessions || 0],
              [t("admin:dashboard.cancelledSessions"), overview?.cancelledSessions || 0],
              [t("admin:dashboard.completionRate"), `${overview?.completionRate || 0}%`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between items-center py-2 border-b border-line-subtle last:border-0 gap-3"
              >
                <dt className="text-sm text-content-secondary">{label}</dt>
                <dd className="font-semibold text-content-primary break-all text-right">
                  {value}
                </dd>
              </div>
            ))}
            <div className="flex justify-between items-center py-2 gap-3">
              <dt className="text-sm text-content-secondary">{t("institution:subsidies.totalSubsidised")}</dt>
              <dd>
                <Money
                  value={overview?.totalSubsidiesAmount}
                  className="font-semibold text-content-primary break-all"
                />
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel
          icon={TrendingUp}
          title={t("admin:dashboard.platformEarnings")}
          tone="text-positive-content"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <dl className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-line-subtle gap-3">
                <dt className="text-sm text-content-secondary">{t("admin:dashboard.currentBalance")}</dt>
                <dd>
                  <Money
                    value={earnings?.balance}
                    currency={earnings?.currencyCode}
                    className="font-semibold text-positive-content break-all"
                  />
                </dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-line-subtle gap-3">
                <dt className="text-sm text-content-secondary">{t("admin:dashboard.lifetimeTotal")}</dt>
                <dd>
                  <Money
                    value={earnings?.lifetimeEarned}
                    currency={earnings?.currencyCode}
                    className="font-semibold text-content-primary break-all"
                  />
                </dd>
              </div>
              <div className="flex justify-between items-center py-2 gap-3">
                <dt className="text-sm text-content-secondary">{t("admin:dashboard.baseCurrency")}</dt>
                <dd className="font-semibold text-content-primary">
                  {earnings?.currencyCode || "—"}
                </dd>
              </div>
            </dl>

            {earnings?.transactions?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-content-secondary mb-3">
                  {t("admin:dashboard.latestCommissions")}
                </p>
                <div className="space-y-2">
                  {earnings.transactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex justify-between items-center text-sm gap-3"
                    >
                      <DateTime
                        value={transaction.createdAt}
                        className="text-content-secondary text-xs"
                      />
                      <Money
                        value={transaction.amount}
                        currency={transaction.currency || earnings?.currencyCode}
                        signed
                        className="font-medium text-positive-content"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

