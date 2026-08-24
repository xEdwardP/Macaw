import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Wallet, Clock, TrendingUp, Plus } from "lucide-react";
import { useMyWallet, useTransactions } from "../../data/useWallet";
import { useInstitutionPolicy } from "../../domain/useInstitutionPolicy";
import { queryKeys } from "../../data/queryKeys";
import RechargeModal from "../../components/wallet/RechargeModal";
import { Button, Card } from "../../ui";
import { PageHeader, PageShell, Pagination, StatCard } from "../../patterns";
import Money from "../../domain/Money";
import TransactionList from "../../domain/TransactionList";

const LIMIT = 10;

export default function MyWallet() {
  const { t } = useTranslation();
  const [showRecharge, setShowRecharge] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { studentSelfTopUp } = useInstitutionPolicy();

  const { data: wallet } = useMyWallet();
  const { data: transactionsData, isLoading: loadingTransactions } =
    useTransactions({ limit: LIMIT, offset: (page - 1) * LIMIT });

  const transactions = transactionsData?.transactions || [];
  const total = transactionsData?.total || 0;

  return (
    <PageShell width="max-w-3xl">
      <PageHeader
        title={t("wallet:title")}
        subtitle={t(
          studentSelfTopUp ? "wallet:subtitle" : "wallet:subtitleSubsidised",
        )}
        actions={
          studentSelfTopUp && (
            <Button onClick={() => setShowRecharge(true)}>
              <Plus size={16} />
              {t("common:action.recharge")}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label={t("wallet:availableBalance")}
          value={<Money value={wallet?.balance} currency={wallet?.currency} />}
          icon={Wallet}
          tone="brand"
        />
        <StatCard
          label={t("wallet:heldInSessions")}
          value={<Money value={wallet?.frozen} currency={wallet?.currency} />}
          icon={Clock}
          tone="warning"
          index={1}
        />
        <StatCard
          label={t("wallet:totalMoved")}
          value={
            <Money value={wallet?.lifetimeEarned} currency={wallet?.currency} />
          }
          icon={TrendingUp}
          tone="positive"
          index={2}
        />
      </div>

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

      {showRecharge && (
        <RechargeModal
          onClose={() => setShowRecharge(false)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all() })
          }
        />
      )}
    </PageShell>
  );
}
