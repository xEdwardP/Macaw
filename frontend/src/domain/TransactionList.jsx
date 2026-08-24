import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";
import Money from "./Money";
import DateTime from "./DateTime";
import { SkeletonCards } from "../ui/Skeleton";

export const TRANSACTION_TYPES = {
  recharge: { tone: "text-positive-content bg-positive-surface", icon: ArrowUpCircle, positive: true },
  frozen: { tone: "text-warning-content bg-warning-surface", icon: Clock, positive: false },
  released: { tone: "text-info-content bg-info-surface", icon: ArrowUpCircle, positive: true },
  commission: { tone: "text-content-secondary bg-surface-sunken", icon: ArrowDownCircle, positive: false },
  subsidy: { tone: "text-accent-content bg-accent-surface", icon: ArrowUpCircle, positive: true },
  withdrawal: { tone: "text-danger-content bg-danger-surface", icon: ArrowDownCircle, positive: false },
  refund: { tone: "text-positive-content bg-positive-surface", icon: ArrowUpCircle, positive: true },
};

export default function TransactionList({ transactions = [], isLoading, empty }) {
  const { t } = useTranslation();

  if (isLoading) return <SkeletonCards count={5} />;

  if (transactions.length === 0)
    return (
      <p className="text-center text-content-muted py-8">
        {empty || t("transaction.empty")}
      </p>
    );

  return (
    <div className="space-y-1">
      {transactions.map((transaction, index) => {
        const type =
          transaction.type in TRANSACTION_TYPES ? transaction.type : "recharge";
        const config = TRANSACTION_TYPES[type];
        const Icon = config.icon;

        return (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-3 sm:gap-4 py-3 border-b border-line-subtle last:border-0"
          >
            <span
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.tone}`}
            >
              <Icon size={16} />
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content-primary">
                {t(`transactionType.${type}`)}
              </p>
              <p className="text-xs text-content-muted truncate">
                {transaction.description}
              </p>
              <DateTime
                value={transaction.createdAt}
                className="text-xs text-content-muted"
              />
            </div>

            <Money
              value={config.positive ? transaction.amount : -transaction.amount}
              currency={transaction.currency}
              signed
              className={`font-semibold text-sm flex-shrink-0 ${
                config.positive ? "text-positive-content" : "text-danger-content"
              }`}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
