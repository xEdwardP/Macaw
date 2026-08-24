import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { DollarSign, Clock, TrendingUp, Plus } from "lucide-react";
import {
  useMyWallet,
  useRequestWithdrawal,
  useTransactions,
  useWithdrawals,
} from "../../data/useWallet";
import { useInstitutionPolicy } from "../../domain/useInstitutionPolicy";
import { Alert, Badge, Button, Card, Input, Modal, ModalFooter } from "../../ui";
import { PageHeader, PageShell, Pagination, StatCard } from "../../patterns";
import Money from "../../domain/Money";
import DateTime from "../../domain/DateTime";
import TransactionList from "../../domain/TransactionList";

const LIMIT = 10;

const WITHDRAWAL_STATUS = {
  pending: { key: "pending", tone: "warning" },
  approved: { key: "approved", tone: "positive" },
  rejected: { key: "rejected", tone: "danger" },
};

function WithdrawalModal({ wallet, onClose }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const { mutate, isPending } = useRequestWithdrawal(onClose);

  return (
    <Modal open onClose={onClose} title={t("wallet:requestWithdrawal")}>
      <div className="bg-brand-surface border border-brand-line rounded-lg p-3 mb-4 flex justify-between text-sm">
        <span className="text-content-secondary">{t("wallet:availableBalance")}</span>
        <Money
          value={wallet?.balance}
          currency={wallet?.currency}
          className="font-bold text-brand"
        />
      </div>

      <form
        onSubmit={handleSubmit((data) =>
          mutate({
            amount: parseFloat(data.amount),
            paypalEmail: data.paypalEmail,
          }),
        )}
        className="space-y-4"
      >
        <Input
          label={t("wallet:amountToWithdraw", {
            currency: wallet?.currency || "USD",
          })}
          type="number"
          min="1"
          step="0.01"
          placeholder="0.00"
          error={errors.amount?.message}
          {...register("amount", {
            required: t("common:validation.amountRequired"),
            min: { value: 1, message: t("common:validation.minimum", { value: 1 }) },
            max: { value: wallet?.balance || 0, message: t("errors:WALLET_INSUFFICIENT_BALANCE") },
          })}
        />

        <Input
          label={t("wallet:paypalEmail")}
          type="email"
          placeholder={t("wallet:paypalPlaceholder")}
          error={errors.paypalEmail?.message}
          {...register("paypalEmail", {
            required: t("wallet:paypalRequired"),
          })}
        />

        <ModalFooter>
          <Button variant="secondary" block onClick={onClose}>
            {t("common:action.cancel")}
          </Button>
          <Button type="submit" block loading={isPending}>
            {t("wallet:requestWithdrawal")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default function TutorMyWallet() {
  const { t } = useTranslation();
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [page, setPage] = useState(1);

  const { tutorWithdrawals: canWithdraw } = useInstitutionPolicy();

  const { data: wallet } = useMyWallet();
  const { data: transactionsData, isLoading: loadingTransactions } =
    useTransactions({ limit: LIMIT, offset: (page - 1) * LIMIT });
  const { data: withdrawals = [] } = useWithdrawals();

  const transactions = transactionsData?.transactions || [];
  const total = transactionsData?.total || 0;

  return (
    <PageShell width="max-w-3xl">
      <PageHeader
        title={t("wallet:title")}
        subtitle={
          t(
            canWithdraw
              ? "wallet:tutorSubtitle"
              : "wallet:withdrawalsDisabledSubtitle",
          )
        }
        actions={
          canWithdraw && (
            <Button onClick={() => setShowWithdrawal(true)}>
              <Plus size={16} />
              <span className="hidden sm:block">{t("wallet:requestWithdrawal")}</span>
              <span className="sm:hidden">{t("wallet:withdraw")}</span>
            </Button>
          )
        }
      />

      {!canWithdraw && (
        <Alert tone="info" className="mb-6">
          {t("wallet:withdrawalsDisabled")}
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label={t("wallet:availableBalance")}
          value={<Money value={wallet?.balance} currency={wallet?.currency} />}
          icon={DollarSign}
          tone="brand"
        />
        <StatCard
          label={t("wallet:totalEarned")}
          value={
            <Money value={wallet?.lifetimeEarned} currency={wallet?.currency} />
          }
          icon={TrendingUp}
          tone="positive"
          index={1}
        />
        <StatCard
          label={t("wallet:heldInSessions")}
          value={<Money value={wallet?.frozen} currency={wallet?.currency} />}
          icon={Clock}
          tone="warning"
          index={2}
        />
      </div>

      {withdrawals.length > 0 && (
        <Card className="p-5 sm:p-6 mb-6">
          <h3 className="font-semibold text-content-primary mb-4">{t("wallet:myWithdrawals")}</h3>
          <div className="space-y-3">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-line-subtle last:border-0"
              >
                <div className="min-w-0">
                  <Money
                    value={withdrawal.amount}
                    currency={withdrawal.currency}
                    className="font-semibold text-content-primary"
                  />
                  <DateTime
                    value={withdrawal.createdAt}
                    className="block text-xs text-content-muted"
                  />
                </div>
                <Badge tone={(WITHDRAWAL_STATUS[withdrawal.status] || WITHDRAWAL_STATUS.pending).tone}>
                  {t(`withdrawalStatus.${withdrawal.status}`)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <h3 className="font-semibold text-content-primary mb-6">
          {t("wallet:transactionHistory")}
        </h3>

        <TransactionList
          transactions={transactions}
          isLoading={loadingTransactions}
        />

        {total > 0 && (
          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / LIMIT))}
            total={total}
            limit={LIMIT}
            onChange={setPage}
            noun={t("wallet:transactions")}
          />
        )}
      </Card>

      {showWithdrawal && (
        <WithdrawalModal
          wallet={wallet}
          onClose={() => setShowWithdrawal(false)}
        />
      )}
    </PageShell>
  );
}
