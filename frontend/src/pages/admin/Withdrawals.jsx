import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { DollarSign, CheckCircle, X, Clock } from "lucide-react";
import {
  useApproveWithdrawal,
  useRejectWithdrawal,
  useWithdrawals,
} from "../../data/useWallet";
import { Alert, Badge, Button, Card, SkeletonCards, Textarea } from "../../ui";
import {
  ConfirmDialog,
  EmptyState,
  FilterBar,
  PageHeader,
  PageShell,
  Pagination,
  StatCard,
} from "../../patterns";
import Money, { formatMoney } from "../../domain/Money";
import DateTime from "../../domain/DateTime";
import { useLocaleSettings } from "../../domain/useLocaleSettings";
import Modal, { ModalFooter } from "../../ui/Modal";

const LIMIT = 10;

const STATUS = {
  pending: { key: "pending", tone: "warning" },
  approved: { key: "approved", tone: "positive" },
  rejected: { key: "rejected", tone: "danger" },
};

export default function AdminWithdrawals() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [confirm, setConfirm] = useState(null);

  const locale = useLocaleSettings();
  const { data: withdrawals = [], isLoading } = useWithdrawals();

  const { mutate: approve } = useApproveWithdrawal(() => setConfirm(null));
  const { mutate: reject } = useRejectWithdrawal(() => {
    setRejecting(null);
    setRejectNotes("");
  });

  const countBy = (status) =>
    withdrawals.filter((entry) => entry.status === status).length;

  const pendingCount = countBy("pending");

  const filtered =
    filter === "all"
      ? withdrawals
      : withdrawals.filter((entry) => entry.status === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const paged = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <PageShell width="max-w-4xl">
      <PageHeader
        title={t("admin:withdrawals.title")}
        subtitle={t("admin:withdrawals.subtitle")}
      />

      {pendingCount > 0 && (
        <Alert tone="warning" className="mb-6">
          {t("admin:withdrawals.pendingAlert", { count: pendingCount })}
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard label={t("admin:withdrawals.pending")} value={countBy("pending")} icon={Clock} tone="warning" />
        <StatCard
          label={t("admin:withdrawals.approved")}
          value={countBy("approved")}
          icon={CheckCircle}
          tone="positive"
          index={1}
        />
        <StatCard label={t("admin:withdrawals.rejected")} value={countBy("rejected")} icon={X} tone="danger" index={2} />
      </div>

      <FilterBar
        className="mb-6"
        value={filter}
        onChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
        options={[
          { value: "all", label: t("admin:withdrawals.allFilter") },
          { value: "pending", label: t("withdrawalStatus.pending"), count: pendingCount || undefined },
          { value: "approved", label: t("withdrawalStatus.approved") },
          { value: "rejected", label: t("withdrawalStatus.rejected") },
        ]}
      />

      {isLoading ? (
        <SkeletonCards count={3} />
      ) : paged.length === 0 ? (
        <EmptyState icon={DollarSign} title={t("admin:withdrawals.empty")} />
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((withdrawal, index) => (
              <motion.div
                key={withdrawal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium text-content-primary truncate">
                          {withdrawal.user.name}
                        </h3>
                        <Badge tone={(STATUS[withdrawal.status] || STATUS.pending).tone}>
                          {t(`withdrawalStatus.${withdrawal.status}`)}
                        </Badge>
                      </div>
                      <p className="text-sm text-content-secondary truncate">
                        {withdrawal.user.email}
                      </p>
                      <p className="text-xs text-content-muted mt-1 truncate">
                        PayPal: {withdrawal.paypalEmail}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <Money
                        value={withdrawal.amount}
                        currency={withdrawal.currency}
                        className="block text-lg sm:text-xl font-bold text-brand"
                      />
                      <DateTime
                        value={withdrawal.createdAt}
                        className="text-xs text-content-muted"
                      />
                    </div>
                  </div>

                  {withdrawal.notes && (
                    <div className="bg-danger-surface border border-danger-line rounded-lg p-2 mb-3">
                      <p className="text-xs text-danger-content">
                        {t("admin:withdrawals.reason", { reason: withdrawal.notes })}
                      </p>
                    </div>
                  )}

                  {withdrawal.status === "pending" && (
                    <div className="flex gap-2 pt-3 border-t border-line-subtle">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => setConfirm(withdrawal)}
                      >
                        <CheckCircle size={14} />
                        {t("common:action.approve")}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-danger-content border-danger-line hover:bg-danger-surface"
                        onClick={() => setRejecting(withdrawal.id)}
                      >
                        <X size={14} />
                        {t("common:action.reject")}
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            limit={LIMIT}
            onChange={setPage}
            noun={t("admin:withdrawals.noun")}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => approve(confirm.id)}
        title={t("admin:withdrawals.approveTitle")}
        description={
          confirm
            ? `¿Aprobar retiro de ${formatMoney(confirm.amount, {
                currency: confirm.currency || locale.currency,
                locale: locale.locale,
              })} a ${confirm.paypalEmail}?`
            : ""
        }
        confirmLabel={t("admin:withdrawals.confirmApprove")}
        tone="success"
      />

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={t("admin:withdrawals.rejectTitle")}
      >
        <Textarea
          label={t("admin:withdrawals.rejectReason")}
          value={rejectNotes}
          onChange={(event) => setRejectNotes(event.target.value)}
          placeholder={t("admin:withdrawals.rejectPlaceholder")}
        />

        <ModalFooter>
          <Button variant="secondary" block onClick={() => setRejecting(null)}>
            {t("common:action.cancel")}
          </Button>
          <Button
            variant="danger"
            block
            onClick={() => reject({ id: rejecting, notes: rejectNotes })}
          >
            {t("common:action.reject")}
          </Button>
        </ModalFooter>
      </Modal>
    </PageShell>
  );
}
