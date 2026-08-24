import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useAdminPlans,
  useCreatePlan,
  useDeletePlan,
  useUpdatePlan,
} from "../../data/useInstitutionAdmin";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalFooter,
  SkeletonCards,
} from "../../ui";
import { ConfirmDialog, EmptyState, PageHeader, PageShell } from "../../patterns";
import Money from "../../domain/Money";

const EMPTY = {
  code: "",
  name: "",
  maxStudents: "",
  priceMonthly: "0",
  currencyCode: "USD",
  displayOrder: "0",
};

function PlanModal({ plan, onClose }) {
  const { t } = useTranslation("admin");
  const [values, setValues] = useState(
    plan
      ? {
          code: plan.code,
          name: plan.name,
          maxStudents: plan.maxStudents ?? "",
          priceMonthly: String(plan.priceMonthly ?? "0"),
          currencyCode: plan.currencyCode,
          displayOrder: String(plan.displayOrder ?? "0"),
        }
      : EMPTY,
  );

  const create = useCreatePlan(onClose);
  const update = useUpdatePlan(onClose);
  const pending = create.isPending || update.isPending;

  const set = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const submit = () => {
    const payload = {
      name: values.name.trim(),
      maxStudents: values.maxStudents === "" ? null : Number(values.maxStudents),
      priceMonthly: Number(values.priceMonthly),
      currencyCode: values.currencyCode,
      displayOrder: Number(values.displayOrder),
    };

    if (plan) update.mutate({ id: plan.id, ...payload });
    else create.mutate({ ...payload, code: values.code.trim().toLowerCase() });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t(plan ? "plans.edit" : "plans.new")}
      size="sm"
    >
      <div className="space-y-4">
        {!plan && (
          <Input
            label={t("plans.code")}
            hint={t("plans.codeHint")}
            value={values.code}
            onChange={set("code")}
          />
        )}

        <Input label={t("plans.name")} value={values.name} onChange={set("name")} />

        <Input
          label={t("plans.maxStudents")}
          type="number"
          min="1"
          placeholder={t("plans.unlimited")}
          hint={t("plans.maxStudentsHint")}
          value={values.maxStudents}
          onChange={set("maxStudents")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t("plans.price")}
            type="number"
            min="0"
            step="0.01"
            value={values.priceMonthly}
            onChange={set("priceMonthly")}
          />
          <Input
            label={t("plans.currency")}
            value={values.currencyCode}
            disabled
            readOnly
          />
        </div>

        <Input
          label={t("plans.order")}
          type="number"
          value={values.displayOrder}
          onChange={set("displayOrder")}
        />
      </div>

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose}>
          {t("common:action.cancel")}
        </Button>
        <Button
          block
          loading={pending}
          disabled={!values.name.trim() || (!plan && !values.code.trim())}
          onClick={submit}
        >
          {t("common:action.save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function Plans() {
  const { t } = useTranslation("admin");
  const { data: plans, isLoading } = useAdminPlans();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const remove = useDeletePlan(() => setDeleting(null));

  return (
    <PageShell width="max-w-3xl">
      <PageHeader
        title={t("plans.title")}
        subtitle={t("plans.subtitle")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} />
            {t("plans.new")}
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonCards count={3} />
      ) : (plans || []).length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t("plans.empty")}
          description={t("plans.emptyBody")}
        />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-content-primary">
                      {plan.name}
                    </span>
                    <Badge tone="neutral">{plan.code}</Badge>
                    {!plan.isActive && (
                      <Badge tone="danger">{t("plans.inactive")}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-content-secondary mt-0.5">
                    {plan.maxStudents
                      ? t("plans.upTo", { count: plan.maxStudents })
                      : t("plans.unlimited")}
                    {" · "}
                    {plan._count?.subscriptions ?? 0}{" "}
                    {t("plans.institutions")}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <Money
                    value={plan.priceMonthly}
                    currency={plan.currencyCode}
                    className="font-semibold text-brand"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("common:action.edit")}
                    onClick={() => setEditing(plan)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("common:action.delete")}
                    className="text-content-muted hover:text-danger-content"
                    onClick={() => setDeleting(plan)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PlanModal
          plan={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open
          onClose={() => setDeleting(null)}
          title={t("plans.deleteTitle")}
          description={deleting.name}
          tone="danger"
          confirmLabel={t("common:action.delete")}
          loading={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id)}
        >
          <p className="text-sm text-content-secondary">
            {t("plans.deleteWarning")}
          </p>
        </ConfirmDialog>
      )}
    </PageShell>
  );
}
