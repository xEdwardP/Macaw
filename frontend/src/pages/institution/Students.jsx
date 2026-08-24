import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Users, DollarSign, Building } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/authStore";
import { useAnalytics, useInstitutionStudents } from "../../data/useInstitution";
import { useAddSubsidy } from "../../data/useWallet";
import { Button, Card, Input, Modal, ModalFooter, SkeletonCards, Textarea } from "../../ui";
import {
  EmptyState,
  ExportButton,
  PageHeader,
  PageShell,
  Pagination,
  SearchInput,
} from "../../patterns";
import Money from "../../domain/Money";

const LIMIT = 10;

function SubsidyModal({ student, institutionId, balance, currency, onClose, onSubmit, isPending }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  return (
    <Modal
      open={Boolean(student)}
      onClose={onClose}
      title={t("institution:students.applySubsidy")}
      description={t("institution:students.subsidyFor", { name: student.name })}
    >
      <div className="bg-positive-surface border border-positive-line rounded-lg p-3 mb-4 flex justify-between items-center">
        <span className="text-sm text-content-secondary">{t("dashboard:institution.availableBalance")}</span>
        <Money
          value={balance}
          currency={currency}
          className="font-bold text-positive-content"
        />
      </div>

      <form
        onSubmit={handleSubmit((data) =>
          onSubmit({
            studentId: student.id,
            institutionId,
            amount: parseFloat(data.amount),
            reason: data.reason,
          }),
        )}
      >
        <div className="space-y-4">
          <Input
            label={t("common:field.amount")}
            type="number"
            min="1"
            step="0.5"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register("amount", {
              required: t("common:validation.amountRequired"),
              min: { value: 1, message: t("common:validation.minimum", { value: 1 }) },
              max: { value: balance || 0, message: t("errors:INSTITUTION_INSUFFICIENT_BALANCE") },
            })}
          />

          <Textarea
            label={t("institution:students.reason")}
            placeholder={t("institution:students.reasonPlaceholder")}
            error={errors.reason?.message}
            {...register("reason", { required: t("institution:students.reasonRequired") })}
          />
        </div>

        <ModalFooter>
          <Button variant="secondary" block onClick={onClose}>
            {t("common:action.cancel")}
          </Button>
          <Button
            type="submit"
            block
            loading={isPending}
            disabled={!balance || balance <= 0}
          >
            {t("institution:students.applySubsidy")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default function InstitutionStudentsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [subsidyStudent, setSubsidyStudent] = useState(null);

  const { data: studentsData, isLoading } = useInstitutionStudents({
    search,
    page,
    limit: LIMIT,
  });
  const { data: analytics } = useAnalytics();

  const overview = analytics?.overview;
  const balance = overview?.institutionBalance ?? 0;
  const currency = overview?.currencyCode;

  const { mutate: applySubsidy, isPending } = useAddSubsidy(() =>
    setSubsidyStudent(null),
  );

  const students = studentsData?.data || [];

  return (
    <PageShell>
      <PageHeader
        title={t("institution:students.title")}
        subtitle={t("institution:students.subtitle")}
        actions={
          <ExportButton report="students" params={{ search: search || undefined }} />
        }
      />

      <Card className="mb-6 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-lg bg-positive-surface flex items-center justify-center flex-shrink-0">
            <DollarSign size={20} className="text-positive-content" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-content-primary truncate">
              {t("institution:students.balanceForSubsidies")}
            </p>
            <p className="text-xs text-content-muted">{t("institution:students.institutionFunds")}</p>
          </div>
        </div>
        <Money
          value={balance}
          currency={currency}
          className={`text-xl sm:text-2xl font-bold flex-shrink-0 ${
            balance > 0 ? "text-positive-content" : "text-danger-content"
          }`}
        />
      </Card>

      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder={t("admin:users.searchPlaceholder")}
        label={t("institution:students.searchLabel")}
        className="mb-6"
      />

      {isLoading ? (
        <SkeletonCards count={5} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("institution:students.emptyTitle")}
          description={t("institution:students.emptyBody")}
        />
      ) : (
        <>
          <div className="space-y-3">
            {students.map((student, index) => {
              const sessions = student.sessionsAsStudent || [];
              const completed = sessions.filter(
                (session) => session.status === "completed",
              ).length;

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-full bg-info-surface flex items-center justify-center text-info-content font-bold flex-shrink-0">
                        {student.name.charAt(0)}
                      </span>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-content-primary truncate">
                          {student.name}
                        </h3>
                        <p className="text-sm text-content-secondary truncate">
                          {student.email}
                        </p>

                        {student.academicUnit && (
                          <span className="flex items-center gap-1 mt-0.5 text-xs text-content-muted">
                            <Building size={11} className="flex-shrink-0" />
                            <span className="truncate">
                              {student.academicUnit.name}
                            </span>
                          </span>
                        )}

                        <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-3">
                          <div className="text-center">
                            <p className="font-semibold text-content-primary text-sm">
                              {sessions.length}
                            </p>
                            <p className="text-xs text-content-muted">
                              {t("institution:students.sessions")}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-positive-content text-sm">
                              {completed}
                            </p>
                            <p className="text-xs text-content-muted">
                              {t("institution:students.completed")}
                            </p>
                          </div>
                          <div className="text-center">
                            <Money
                              value={student.wallet?.balance}
                              currency={student.wallet?.currency}
                              className="block font-semibold text-brand text-sm"
                            />
                            <p className="text-xs text-content-muted">
                              {t("institution:students.balance")}
                            </p>
                          </div>

                          <Button
                            variant="soft"
                            size="sm"
                            onClick={() => setSubsidyStudent(student)}
                            disabled={balance <= 0}
                          >
                            <DollarSign size={14} />
                            {t("institution:students.subsidise")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <Pagination
            page={page}
            totalPages={studentsData?.totalPages || 1}
            total={studentsData?.total || 0}
            limit={LIMIT}
            onChange={setPage}
            noun={t("institution:students.noun")}
          />
        </>
      )}

      {subsidyStudent && (
        <SubsidyModal
          student={subsidyStudent}
          institutionId={user?.institutionId}
          balance={balance}
          currency={currency}
          onClose={() => setSubsidyStudent(null)}
          onSubmit={applySubsidy}
          isPending={isPending}
        />
      )}
    </PageShell>
  );
}
