import { Wallet, Lock, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "../ui/Card";
import Money from "./Money";
import { cn } from "../ui/cn";

export default function WalletBalanceCard({
  balance,
  frozen,
  lifetimeEarned,
  currency,
  title,
  action,
  className,
}) {
  const { t } = useTranslation("wallet");

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-content-secondary flex items-center gap-1.5">
            <Wallet size={15} />
            {title || t("availableBalance")}
          </p>
          <Money
            value={balance}
            currency={currency}
            className="block text-4xl font-bold text-content-primary mt-2 break-all"
          />
        </div>
        {action}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="bg-warning-surface border border-warning-line rounded-lg p-3">
          <p className="text-xs text-warning-content flex items-center gap-1.5">
            <Lock size={12} />
            {t("heldInSessions")}
          </p>
          <Money
            value={frozen}
            currency={currency}
            className="block font-semibold text-warning-content mt-1"
          />
        </div>

        {lifetimeEarned !== undefined && (
          <div className="bg-positive-surface border border-positive-line rounded-lg p-3">
            <p className="text-xs text-positive-content flex items-center gap-1.5">
              <TrendingUp size={12} />
              {t("lifetimeEarned")}
            </p>
            <Money
              value={lifetimeEarned}
              currency={currency}
              className="block font-semibold text-positive-content mt-1"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
