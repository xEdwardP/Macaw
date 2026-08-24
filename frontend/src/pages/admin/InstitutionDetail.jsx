import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Building,
  Globe,
  Pause,
  Play,
  ScrollText,
  Users,
} from "lucide-react";
import {
  useAuditLogs,
  useChangeInstitutionStatus,
  useInstitution,
} from "../../data/useInstitutionAdmin";
import { STATUS_TONES } from "../../domain/institutionTypes";
import {
  Alert,
  Badge,
  Button,
  Card,
  SkeletonCards,
  SkeletonStats,
} from "../../ui";
import { ConfirmDialog, PageHeader, PageShell, StatCard } from "../../patterns";
import Money from "../../domain/Money";
import DateTime from "../../domain/DateTime";

function Field({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-line-subtle last:border-0">
      <span className="text-sm text-content-secondary">{label}</span>
      <span className="text-sm font-medium text-content-primary text-right">
        {children}
      </span>
    </div>
  );
}

export default function InstitutionDetail() {
  const { t } = useTranslation("institution");
  const { id } = useParams();
  const [changing, setChanging] = useState(null);

  const { data: institution, isLoading } = useInstitution(id);
  const { data: logs } = useAuditLogs({ institutionId: id, limit: 10 });
  const changeStatus = useChangeInstitutionStatus(() => setChanging(null));

  if (isLoading || !institution)
    return (
      <PageShell>
        <SkeletonStats count={4} />
        <SkeletonCards count={3} />
      </PageShell>
    );

  const subscription = institution.subscription;
  const students = subscription?.currentStudents ?? 0;
  const maxStudents = subscription?.plan?.maxStudents;
  const suspended = institution.status === "suspended";

  return (
    <PageShell>
      <Button
        as={Link}
        to="/admin/institutions"
        variant="ghost"
        size="sm"
        className="mb-4 -ml-3"
      >
        <ArrowLeft size={16} />
        {t("list.title")}
      </Button>

      <PageHeader
        title={institution.name}
        subtitle={institution.domain}
        actions={
          institution.status === "active" || suspended ? (
            <Button
              variant={suspended ? "success" : "secondary"}
              onClick={() => setChanging(suspended ? "active" : "suspended")}
            >
              {suspended ? <Play size={16} /> : <Pause size={16} />}
              {t(suspended ? "detail.reactivate" : "detail.suspend")}
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Badge tone={STATUS_TONES[institution.status]}>
          {t(`status.${institution.status}`)}
        </Badge>
        <Badge tone="neutral">
          {t(`units:institutionType.${institution.type}`)}
        </Badge>
        <Badge tone="neutral">{institution.currencyCode}</Badge>
      </div>

      {institution.statusReason && (
        <Alert tone="warning" className="mb-6" title={t("detail.statusReason")}>
          {institution.statusReason}
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label={t("detail.balance")}
          value={
            <Money
              value={institution.balance}
              currency={institution.currencyCode}
            />
          }
          icon={Building}
          tone="brand"
        />
        <StatCard
          label={t("detail.accounts")}
          value={institution._count?.users ?? 0}
          icon={Users}
          tone="info"
        />
        <StatCard
          label={t("detail.seats")}
          value={maxStudents ? `${students} / ${maxStudents}` : String(students)}
          icon={Users}
          tone={maxStudents && students >= maxStudents ? "danger" : "positive"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold text-content-primary mb-4">
            {t("detail.profile")}
          </h2>
          <Field label={t("settings.timezone")}>{institution.timezone}</Field>
          <Field label={t("settings.locale")}>{institution.locale}</Field>
          <Field label={t("detail.commission")}>
            {`${(Number(institution.effectiveCommissionRate) * 100).toFixed(1)}%`}
            {institution.commissionRate === null && (
              <span className="text-content-muted font-normal">
                {" "}
                · {t("detail.globalCommission")}
              </span>
            )}
          </Field>
          <Field label={t("detail.createdAt")}>
            <DateTime value={institution.createdAt} />
          </Field>
          {institution.contactEmail && (
            <Field label={t("apply.contactEmail")}>
              {institution.contactEmail}
            </Field>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
            <Globe size={16} className="text-content-muted" />
            {t("domains.title")}
          </h2>

          {(institution.domains || []).length === 0 ? (
            <p className="text-sm text-content-muted">{t("domains.empty")}</p>
          ) : (
            institution.domains.map((domain) => (
              <Field key={domain.id} label={domain.domain}>
                <span className="flex items-center justify-end gap-2">
                  {domain.isPrimary && (
                    <Badge tone="brand">{t("domains.primary")}</Badge>
                  )}
                  <Badge tone={domain.verifiedAt ? "positive" : "warning"}>
                    {t(domain.verifiedAt ? "domains.verified" : "domains.unverified")}
                  </Badge>
                </span>
              </Field>
            ))
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-content-primary mb-4">
            {t("detail.subscription")}
          </h2>

          {subscription ? (
            <>
              <Field label={t("wizard.plan")}>{subscription.plan.name}</Field>
              <Field label={t("common:field.status")}>
                {t(`subscriptionStatus.${subscription.status}`)}
              </Field>
              <Field label={t("detail.seats")}>
                {maxStudents
                  ? t("wizard.upToStudents", { count: maxStudents })
                  : t("wizard.unlimited")}
              </Field>
              {subscription.trialEndsAt && (
                <Field label={t("detail.trialEnds")}>
                  <DateTime value={subscription.trialEndsAt} />
                </Field>
              )}
            </>
          ) : (
            <p className="text-sm text-content-muted">{t("detail.noPlan")}</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
            <ScrollText size={16} className="text-content-muted" />
            {t("detail.activity")}
          </h2>

          {(logs?.data || []).length === 0 ? (
            <p className="text-sm text-content-muted">{t("detail.noActivity")}</p>
          ) : (
            <ul className="space-y-3">
              {logs.data.map((log) => (
                <li key={log.id} className="text-sm">
                  <p className="text-content-primary">
                    {t(`auditAction.${log.action}`, { defaultValue: log.action })}
                  </p>
                  <p className="text-xs text-content-muted">
                    {log.entity} · <DateTime value={log.createdAt} preset="dateTime" />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {changing && (
        <ConfirmDialog
          open
          onClose={() => setChanging(null)}
          title={t(changing === "suspended" ? "detail.suspend" : "detail.reactivate")}
          description={institution.name}
          tone={changing === "suspended" ? "danger" : "primary"}
          loading={changeStatus.isPending}
          onConfirm={() => changeStatus.mutate({ id, status: changing })}
        >
          <p className="text-sm text-content-secondary">
            {t(
              changing === "suspended"
                ? "detail.suspendWarning"
                : "detail.reactivateWarning",
            )}
          </p>
        </ConfirmDialog>
      )}
    </PageShell>
  );
}
