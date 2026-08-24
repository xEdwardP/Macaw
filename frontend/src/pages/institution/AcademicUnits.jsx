import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, BookOpen, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { useUnitLabels } from "../../domain/useUnitLabels";
import { useAuthStore } from "../../store/authStore";
import {
  useCreateUnit,
  useDeleteUnit,
  useUnits,
  useUnitSubjects,
  useUpdateUnit,
} from "../../data/useInstitution";
import { Button, Card, Input, Modal, ModalFooter, Skeleton } from "../../ui";
import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  PageShell,
  Pagination,
} from "../../patterns";

const LIMIT = 8;

function UnitModal({ unit, label, onClose, onSubmit, isPending }) {
  const { t } = useTranslation();
  const [name, setName] = useState(unit?.name || "");
  const [code, setCode] = useState(unit?.code || "");

  const submit = () => {
    if (!name.trim() || !code.trim())
      return toast.error(t("institution:validation.nameAndCode"));
    onSubmit({ name: name.trim(), code: code.trim() });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t(unit ? "institution:units.edit" : "institution:units.new", {
        unit: label.toLowerCase(),
      })}
    >
      <div className="space-y-4">
        <Input
          label={t("common:field.name")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("institution:units.namePlaceholder")}
        />
        <Input
          label={t("common:field.code")}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={t("institution:units.codePlaceholder")}
        />
      </div>

      <ModalFooter>
        <Button variant="secondary" block onClick={onClose}>
          {t("common:action.cancel")}
        </Button>
        <Button block onClick={submit} loading={isPending}>
          {unit ? t("action.save") : t("action.create")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function InstitutionAcademicUnits() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [subjectPage, setSubjectPage] = useState(1);

  const labels = useUnitLabels();

  const { data: unitsData, isLoading } = useUnits({
    page,
    limit: LIMIT,
    institutionId: user.institutionId,
  });

  const { data: subjectsData } = useUnitSubjects(selected, {
    page: subjectPage,
    limit: LIMIT,
  });

  const close = () => setModal(null);

  const { mutate: createUnit, isPending: isCreating } = useCreateUnit(close);
  const { mutate: updateUnit, isPending: isUpdating } = useUpdateUnit(close);
  const { mutate: deleteUnit, isPending: isDeleting } = useDeleteUnit(() => {
    setSelected(null);
    close();
  });

  const units = unitsData?.data || [];
  const subjects = subjectsData?.data || [];
  const selectedUnit = units.find((unit) => unit.id === selected);

  return (
    <PageShell>
      <PageHeader
        title={labels.plural}
        subtitle={t("institution:units.subtitle", {
          units: labels.plural.toLowerCase(),
        })}
        actions={
          <Button onClick={() => setModal({ type: "create" })}>
            <Plus size={16} />
            {t("institution:units.new", { unit: labels.singular.toLowerCase() })}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padded={false} className="flex flex-col">
          <div className="p-4 border-b border-line-subtle">
            <h2 className="font-semibold text-content-primary">{labels.plural}</h2>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : units.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={t("institution:units.emptyTitle", {
                units: labels.plural.toLowerCase(),
              })}
              description={t("institution:units.empty")}
            />
          ) : (
            <>
              <ul className="divide-y divide-line-subtle flex-1">
                {units.map((unit, index) => (
                  <motion.li
                    key={unit.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelected(unit.id);
                        setSubjectPage(1);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelected(unit.id);
                          setSubjectPage(1);
                        }
                      }}
                      className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-surface-muted transition-colors ${
                        selected === unit.id ? "bg-brand-surface border-l-2 border-brand" : ""
                      }`}
                    >
                      <span className="w-10 h-10 rounded-lg bg-brand-surface flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-brand" />
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-content-primary text-sm truncate">
                          {unit.name}
                        </p>
                        <p className="text-xs text-content-muted">
                          {unit.code} · {t("institution:units.subjectCount", { count: unit._count?.subjects || 0 })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("common:action.edit")}
                          onClick={(event) => {
                            event.stopPropagation();
                            setModal({ type: "edit", unit });
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("common:action.delete")}
                          className="hover:text-danger-content"
                          onClick={(event) => {
                            event.stopPropagation();
                            setModal({ type: "delete", unit });
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>

              <div className="px-4 pb-2">
                <Pagination
                  page={page}
                  totalPages={unitsData?.totalPages || 1}
                  total={unitsData?.total || 0}
                  limit={LIMIT}
                  onChange={setPage}
                  noun={labels.plural.toLowerCase()}
                />
              </div>
            </>
          )}
        </Card>

        <Card padded={false} className="flex flex-col">
          <div className="p-4 border-b border-line-subtle">
            <h2 className="font-semibold text-content-primary">
              {selectedUnit
                ? t("institution:units.subjectsOf", { unit: selectedUnit.name })
                : t("institution:subjects.title")}
            </h2>
          </div>

          {!selected ? (
            <EmptyState
              icon={BookOpen}
              title={labels.pick}
              description={t("institution:units.selectToSeeSubjects")}
            />
          ) : subjects.length === 0 ? (
            <EmptyState icon={BookOpen} title={t("institution:units.noSubjects")} />
          ) : (
            <>
            <ul className="divide-y divide-line-subtle flex-1">
              {subjects.map((subject, index) => (
                <motion.li
                  key={subject.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex items-center gap-3 p-4"
                >
                  <span className="w-8 h-8 rounded-lg bg-info-surface flex items-center justify-center flex-shrink-0">
                    <BookOpen size={14} className="text-info-content" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-content-primary truncate">
                      {subject.name}
                    </p>
                    <p className="text-xs text-content-muted">
                      {subject.code}
                      {subject.termNumber
                        ? ` · ${labels.term} ${subject.termNumber}`
                        : ""}
                      {subject.credits ? ` · ${t("institution:subjects.creditCount", { count: subject.credits })}` : ""}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="px-4 pb-2">
              <Pagination
                page={subjectPage}
                totalPages={subjectsData?.totalPages || 1}
                total={subjectsData?.total || 0}
                limit={LIMIT}
                onChange={setSubjectPage}
                noun={t("institution:units.subjects")}
              />
            </div>
            </>
          )}
        </Card>
      </div>

      {modal?.type === "create" && (
        <UnitModal
          label={labels.singular}
          onClose={close}
          onSubmit={createUnit}
          isPending={isCreating}
        />
      )}

      {modal?.type === "edit" && (
        <UnitModal
          unit={modal.unit}
          label={labels.singular}
          onClose={close}
          onSubmit={(data) => updateUnit({ id: modal.unit.id, ...data })}
          isPending={isUpdating}
        />
      )}

      <ConfirmDialog
        open={modal?.type === "delete"}
        onClose={close}
        onConfirm={() => deleteUnit(modal.unit.id)}
        title={t("institution:units.deleteTitle", {
          unit: labels.singular.toLowerCase(),
        })}
        description={t("institution:units.deleteBody", { name: modal?.unit?.name })}
        confirmLabel={t("institution:subjects.confirmDelete")}
        tone="danger"
        loading={isDeleting}
      />
    </PageShell>
  );
}
