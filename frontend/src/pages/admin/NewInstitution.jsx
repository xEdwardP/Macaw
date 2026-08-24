import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Layers, Loader2, X } from "lucide-react";
import {
  useApplyTemplate,
  useCreateInstitution,
  usePlans,
  useTemplates,
} from "../../data/useInstitutionAdmin";
import { useCreateCoordinator } from "../../data/useUsers";
import { INSTITUTION_TYPES } from "../../domain/institutionTypes";
import { translateError } from "../../i18n/translateError";
import { Alert, Badge, Button, Card, Input, Select } from "../../ui";
import {
  PageHeader,
  PageShell,
  WizardFooter,
  WizardSteps,
} from "../../patterns";
import Money from "../../domain/Money";
import { cn } from "../../ui/cn";

const EMPTY = {
  name: "",
  domain: "",
  type: "university",
  currencyCode: "USD",
  commissionRate: "",
  planCode: "",
  templateCode: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

const STEP_KEYS = ["identity", "money", "structure", "coordinator", "review"];

const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

function TaskRow({ label, state, error }) {
  const ICONS = {
    pending: <span className="w-4 h-4 rounded-full border border-line-strong" />,
    running: <Loader2 size={16} className="animate-spin text-brand" />,
    done: <Check size={16} className="text-positive-content" />,
    failed: <X size={16} className="text-danger-content" />,
  };

  return (
    <li className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex-shrink-0">{ICONS[state]}</span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm",
            state === "done" ? "text-content-secondary" : "text-content-primary",
          )}
        >
          {label}
        </p>
        {error && <p className="text-xs text-danger-content mt-0.5">{error}</p>}
      </div>
    </li>
  );
}

export default function NewInstitution() {
  const { t } = useTranslation("institution");

  const [step, setStep] = useState(0);
  const [values, setValues] = useState(EMPTY);
  const [createdId, setCreatedId] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const { data: plans } = usePlans();
  const { data: templates } = useTemplates(values.type);

  const createInstitution = useCreateInstitution();
  const applyTemplate = useApplyTemplate();
  const createCoordinator = useCreateCoordinator();

  const set = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const steps = STEP_KEYS.map((key) => t(`wizard.step.${key}`));

  const domainLooksValid = DOMAIN_PATTERN.test(values.domain.trim().toLowerCase());

  const canContinue = [
    values.name.trim().length > 1 && domainLooksValid,
    Boolean(values.currencyCode),
    true,
    values.adminName.trim().length > 1 &&
      /.+@.+\..+/.test(values.adminEmail) &&
      values.adminPassword.length >= 8,
    true,
  ][step];

  const markTask = (key, state, error) =>
    setTasks((current) => ({ ...current, [key]: { state, error } }));

  const run = async () => {
    setRunning(true);

    const plan = {
      institution: "pending",
      template: "pending",
      coordinator: "pending",
    };
    if (!values.templateCode) delete plan.template;
    setTasks(plan);

    let institutionId = createdId;

    if (!institutionId) {
      markTask("institution", "running");
      try {
        const created = await createInstitution.mutateAsync({
          name: values.name.trim(),
          domain: values.domain.trim().toLowerCase(),
          type: values.type,
          currencyCode: values.currencyCode,
          ...(values.commissionRate
            ? { commissionRate: Number(values.commissionRate) / 100 }
            : {}),
          ...(values.planCode ? { planCode: values.planCode } : {}),
        });
        institutionId = created.id;
        setCreatedId(created.id);
        markTask("institution", "done");
      } catch (error) {
        markTask("institution", "failed", translateError(error));
        setRunning(false);
        return;
      }
    } else {
      markTask("institution", "done");
    }

    if (values.templateCode) {
      markTask("template", "running");
      try {
        await applyTemplate.mutateAsync({
          code: values.templateCode,
          institutionId,
        });
        markTask("template", "done");
      } catch (error) {
        markTask("template", "failed", translateError(error));
        setRunning(false);
        return;
      }
    }

    markTask("coordinator", "running");
    try {
      await createCoordinator.mutateAsync({
        institutionId,
        name: values.adminName.trim(),
        email: values.adminEmail.trim(),
        password: values.adminPassword,
      });
      markTask("coordinator", "done");
    } catch (error) {
      markTask("coordinator", "failed", translateError(error));
      setRunning(false);
      return;
    }

    setRunning(false);
    setDone(true);
  };

  const selectedPlan = (plans || []).find((plan) => plan.code === values.planCode);
  const selectedTemplate = (templates || []).find(
    (template) => template.code === values.templateCode,
  );

  return (
    <PageShell>
      <PageHeader title={t("wizard.title")} subtitle={t("wizard.subtitle")} />

      <Card className="p-6 sm:p-8 max-w-2xl">
        <WizardSteps steps={steps} current={step} />

        {step === 0 && (
          <div className="space-y-4">
            <Input
              label={t("apply.institutionName")}
              value={values.name}
              onChange={set("name")}
              required
            />
            <Input
              label={t("apply.domain")}
              placeholder="institucion.edu"
              hint={t("apply.domainHint")}
              error={
                values.domain.trim() && !domainLooksValid
                  ? t("apply.domainInvalid")
                  : undefined
              }
              value={values.domain}
              onChange={set("domain")}
              required
            />
            <Select
              label={t("apply.type")}
              value={values.type}
              onChange={set("type")}
              options={INSTITUTION_TYPES.map((value) => ({
                value,
                label: t(`units:institutionType.${value}`),
              }))}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Input
              label={t("apply.currency")}
              value={values.currencyCode}
              hint={t("wizard.currencyLocked")}
              disabled
              readOnly
            />
            <Select
              label={t("wizard.plan")}
              value={values.planCode}
              onChange={set("planCode")}
              placeholder={t("wizard.noPlan")}
              options={(plans || []).map((plan) => ({
                value: plan.code,
                label: plan.maxStudents
                  ? `${plan.name} · ${t("wizard.upToStudents", { count: plan.maxStudents })}`
                  : `${plan.name} · ${t("wizard.unlimited")}`,
              }))}
            />
            <Input
              label={t("wizard.commission")}
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder={t("wizard.commissionPlaceholder")}
              hint={t("wizard.commissionHint")}
              value={values.commissionRate}
              onChange={set("commissionRate")}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-content-secondary">
              {t("wizard.structureHelp")}
            </p>

            {(templates || []).map((template) => (
              <button
                key={template.code}
                type="button"
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    templateCode:
                      current.templateCode === template.code ? "" : template.code,
                  }))
                }
                aria-pressed={values.templateCode === template.code}
                className={cn(
                  "w-full text-left border-2 rounded-xl p-4 transition-colors",
                  values.templateCode === template.code
                    ? "border-brand bg-brand-surface"
                    : "border-line-default hover:border-line-strong",
                )}
              >
                <span className="flex items-center gap-2 font-medium text-content-primary">
                  <Layers size={16} className="text-brand" />
                  {template.name}
                  {template.recommended && (
                    <Badge tone="positive">{t("wizard.recommended")}</Badge>
                  )}
                </span>
                <span className="block text-xs text-content-secondary mt-1">
                  {template.description}
                </span>
                <span className="block text-xs text-content-muted mt-1">
                  {t("wizard.templateSummary", {
                    units: template.units?.length || 0,
                    grades: (template.units || []).reduce(
                      (total, unit) => total + (unit.gradeLevels || 0),
                      0,
                    ),
                  })}
                </span>
              </button>
            ))}

            {(templates || []).length === 0 && (
              <Alert tone="info">{t("wizard.noTemplates")}</Alert>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-content-secondary">
              {t("wizard.coordinatorHelp")}
            </p>
            <Input
              label={t("team.inviteName")}
              value={values.adminName}
              onChange={set("adminName")}
              required
            />
            <Input
              label={t("team.inviteEmail")}
              type="email"
              value={values.adminEmail}
              onChange={set("adminEmail")}
              required
            />
            <Input
              label={t("admin:coordinator.password")}
              type="password"
              hint={t("admin:coordinator.passwordHint")}
              value={values.adminPassword}
              onChange={set("adminPassword")}
              required
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <dl className="divide-y divide-line-subtle text-sm">
              {[
                [t("apply.institutionName"), values.name],
                [t("apply.domain"), values.domain],
                [t("apply.type"), t(`units:institutionType.${values.type}`)],
                [t("apply.currency"), values.currencyCode],
                [t("wizard.plan"), selectedPlan?.name || t("wizard.noPlan")],
                [
                  t("wizard.structure"),
                  selectedTemplate?.name || t("wizard.noTemplate"),
                ],
                [t("wizard.coordinator"), values.adminEmail],
                [
                  t("wizard.commission"),
                  values.commissionRate
                    ? `${values.commissionRate}%`
                    : t("wizard.globalCommission"),
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2">
                  <dt className="text-content-secondary">{label}</dt>
                  <dd className="text-content-primary font-medium text-right">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {selectedPlan?.priceMonthly > 0 && (
              <p className="text-sm text-content-secondary">
                {t("wizard.planPrice")}{" "}
                <Money
                  value={selectedPlan.priceMonthly}
                  currency={selectedPlan.currencyCode}
                  className="font-semibold text-content-primary"
                />
              </p>
            )}

            {tasks && (
              <ul className="border border-line-default rounded-xl p-4">
                <TaskRow
                  label={t("wizard.taskCreate")}
                  state={tasks.institution?.state || "pending"}
                  error={tasks.institution?.error}
                />
                {tasks.template && (
                  <TaskRow
                    label={t("wizard.taskTemplate")}
                    state={tasks.template.state}
                    error={tasks.template.error}
                  />
                )}
                <TaskRow
                  label={t("wizard.taskCoordinator")}
                  state={tasks.coordinator?.state || "pending"}
                  error={tasks.coordinator?.error}
                />
              </ul>
            )}

            {createdId && !done && (
              <Alert tone="warning">{t("wizard.alreadyCreated")}</Alert>
            )}

            {done && (
              <Alert tone="positive" title={t("admin:coordinator.readyTitle")}>
                {t("admin:coordinator.readyBody", {
                  email: values.adminEmail.trim(),
                })}
              </Alert>
            )}
          </div>
        )}

        {done ? (
          <Button
            as={Link}
            to={`/admin/institutions/${createdId}`}
            block
            size="lg"
            className="mt-8"
          >
            {t("wizard.goToInstitution")}
          </Button>
        ) : (
          <WizardFooter
            current={step}
            total={steps.length}
            loading={running}
            nextDisabled={!canContinue}
            nextLabel={step === 4 ? t("wizard.create") : undefined}
            onBack={() => setStep((current) => Math.max(0, current - 1))}
            onNext={() =>
              step === 4 ? run() : setStep((current) => current + 1)
            }
          />
        )}
      </Card>
    </PageShell>
  );
}
