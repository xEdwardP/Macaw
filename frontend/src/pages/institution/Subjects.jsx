import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { useUnitLabels } from "../../domain/useUnitLabels";
import { useAuthStore } from "../../store/authStore";
import {
  useCreateSubject,
  useDeleteSubject,
  useSubjects,
  useUnits,
  useUpdateSubject,
} from "../../data/useInstitution";
import { Button, Card, Input, Modal, ModalFooter, Select, Skeleton } from "../../ui";
import {
  ConfirmDialog,
  EmptyState,
  FilterBar,
  PageHeader,
  PageShell,
  Pagination,
  SearchInput,
} from "../../patterns";

const LIMIT = 10;

function SubjectModal({ subject, units, labels, onClose, onSubmit, isPending }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: subject?.name || "",
    code: subject?.code || "",
    termNumber: subject?.termNumber || "",
    credits: subject?.credits || "",
    unitId: subject?.isGeneral
      ? "general"
      : subject?.units?.[0]?.academicUnitId || "",
  });

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = () => {
    if (!form.name.trim() || !form.code.trim())
      return toast.error(t("institution:validation.nameAndCode"));
    if (!form.unitId)
      return toast.error(t("institution:validation.pickUnit", { unit: labels.singular }));

    onSubmit({
      name: form.name,
      code: form.code,
      termNumber: form.termNumber ? parseInt(form.termNumber, 10) : null,
      credits: form.credits ? parseInt(form.credits, 10) : null,
      isGeneral: form.unitId === "general",
      unitId: form.unitId === "general" ? null : form.unitId,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t(
        subject ? "institution:subjects.editSubject" : "institution:subjects.newSubject",
      )}
    >
      <div className="space-y-4">
        <Input
          label={t("common:field.name")}
          value={form.name}
          onChange={set("name")}
          placeholder={t("institution:subjects.namePlaceholder")}
        />

        <Input
          label={t("common:field.code")}
          value={form.code}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              code: event.target.value.toUpperCase(),
            }))
          }
          placeholder={t("institution:subjects.codePlaceholder")}
          disabled={Boolean(subject)}
          hint={subject ? t("institution:subjects.codeLocked") : undefined}
        />

        <Select
          label={labels.singular}
          value={form.unitId}
          onChange={set("unitId")}
          placeholder={labels.pick}
          options={[
            { value: "general", label: t("institution:subjects.allUnits", { units: labels.plural }) },
            ...units.map((unit) => ({ value: unit.id, label: unit.name })),
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={labels.term}
            type="number"
            min={1}
            value={form.termNumber}
            onChange={set("termNumber")}
            placeholder={t("institution:subjects.termPlaceholder")}
          />
          <Input
            label={t("institution:subjects.credits")}
            type="number"
            min={1}
            value={form.credits}
            onChange={set("credits")}
            placeholder={t("institution:subjects.creditsPlaceholder")}
          />
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose}>
          {t("common:action.cancel")}
        </Button>
        <Button block onClick={submit} loading={isPending}>
          {subject ? t("action.save") : t("institution:subjects.create")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function InstitutionSubjectsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [modal, setModal] = useState(null);
  const [unitFilter, setUnitFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const labels = useUnitLabels();

  const { data: subjectsData, isLoading } = useSubjects({
    page,
    limit: LIMIT,
    ...(unitFilter ? { unitId: unitFilter } : {}),
    ...(search ? { search } : {}),
  });

  const { data: unitsData } = useUnits({
    limit: 100,
    institutionId: user.institutionId,
  });

  const close = () => setModal(null);

  const { mutate: createSubject, isPending: isCreating } = useCreateSubject(close);
  const { mutate: updateSubject, isPending: isUpdating } = useUpdateSubject(close);
  const { mutate: deleteSubject, isPending: isDeleting } = useDeleteSubject(close);

  const subjects = subjectsData?.data || [];
  const units = unitsData?.data || [];

  return (
    <PageShell>
      <PageHeader
        title={t("tutors:profile.subjects")}
        subtitle={t("institution:subjects.subtitle")}
        actions={
          <Button onClick={() => setModal({ type: "create" })}>
            <Plus size={16} />
            <span className="hidden sm:block">{t("institution:subjects.newSubject")}</span>
            <span className="sm:hidden">{t("institution:subjects.new")}</span>
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder={t("institution:subjects.searchPlaceholder")}
        label={t("institution:subjects.searchLabel")}
        className="mb-4"
      />

      <FilterBar
        className="mb-6"
        value={unitFilter}
        onChange={(value) => {
          setUnitFilter(value);
          setPage(1);
        }}
        options={[
          { value: "", label: t("institution:subjects.allFilter") },
          ...units.map((unit) => ({ value: unit.id, label: unit.code })),
        ]}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("institution:subjects.empty")}
          description={
            search
              ? t("institution:subjects.noMatches", { search })
              : t("institution:subjects.emptyBody")
          }
          action={
            search && (
              <Button variant="secondary" onClick={() => setSearch("")}>
                {t("institution:subjects.clearSearch")}
              </Button>
            )
          }
        />
      ) : (
        <>
          <Card padded={false} className="divide-y divide-line-subtle">
            {subjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4"
              >
                <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-info-surface flex items-center justify-center flex-shrink-0">
                  <BookOpen size={16} className="text-info-content" />
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-content-primary text-sm truncate">
                    {subject.name}
                  </p>
                  <p className="text-xs text-content-muted">
                    {subject.code}
                    {subject.termNumber
                      ? ` · ${labels.term} ${subject.termNumber}`
                      : ""}
                    {subject.credits ? ` · ${t("institution:subjects.creditShort", { count: subject.credits })}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("institution:subjects.editSubject")}
                    onClick={() => setModal({ type: "edit", subject })}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("institution:subjects.deleteSubject")}
                    className="hover:text-danger-content"
                    onClick={() => setModal({ type: "delete", subject })}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </Card>

          <Pagination
            page={page}
            totalPages={subjectsData?.totalPages || 1}
            total={subjectsData?.total || 0}
            limit={LIMIT}
            onChange={setPage}
            noun={t("institution:units.subjects")}
          />
        </>
      )}

      {modal?.type === "create" && (
        <SubjectModal
          units={units}
          labels={labels}
          onClose={close}
          onSubmit={createSubject}
          isPending={isCreating}
        />
      )}

      {modal?.type === "edit" && (
        <SubjectModal
          subject={modal.subject}
          units={units}
          labels={labels}
          onClose={close}
          onSubmit={(data) => updateSubject({ id: modal.subject.id, ...data })}
          isPending={isUpdating}
        />
      )}

      <ConfirmDialog
        open={modal?.type === "delete"}
        onClose={close}
        onConfirm={() => deleteSubject(modal.subject.id)}
        title={t("institution:subjects.deleteSubject")}
        description={t("institution:subjects.deleteBody", { name: modal?.subject?.name })}
        confirmLabel={t("institution:subjects.confirmDelete")}
        tone="danger"
        loading={isDeleting}
      />
    </PageShell>
  );
}
