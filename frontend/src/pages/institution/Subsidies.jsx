import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DollarSign, Calendar, Plus } from "lucide-react";
import { useAnalytics, useSubsidies } from "../../data/useInstitution";
import { queryKeys } from "../../data/queryKeys";
import InstitutionRechargeModal from "../../components/wallet/InstitutionRechargeModal";
import { Button, Card, SkeletonCards } from "../../ui";
import {
  EmptyState,
  ExportButton,
  PageHeader,
  PageShell,
} from "../../patterns";
import Money from "../../domain/Money";
import DateTime from "../../domain/DateTime";

export default function InstitutionSubsidiesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showRecharge, setShowRecharge] = useState(false);

  const { data: subsidies = [], isLoading } = useSubsidies();
  const { data: analytics } = useAnalytics();

  const overview = analytics?.overview;
  const balance = overview?.institutionBalance ?? 0;
  const currency = overview?.currencyCode;

  const total = subsidies.reduce((sum, subsidy) => sum + Number(subsidy.amount), 0);

  return (
    <PageShell width="max-w-4xl">
      <PageHeader
        title={t("institution:subsidies.title")}
        subtitle={t("institution:subsidies.subtitle")}
        actions={
          <>
            <ExportButton report="subsidies" />
            <Button onClick={() => setShowRecharge(true)}>
              <Plus size={16} />
              <span className="hidden sm:block">{t("institution:subsidies.rechargeWithPaypal")}</span>
              <span className="sm:hidden">{t("common:action.recharge")}</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-brand-solid rounded-xl p-5 sm:p-6 text-brand-contrast">
          <p className="flex items-center gap-2 mb-2 text-sm opacity-80">
            <DollarSign size={20} />
            {t("institution:subsidies.totalSubsidised")}
          </p>
          <Money
            value={total}
            currency={currency}
            className="block text-3xl sm:text-4xl font-bold break-all"
          />
          <p className="text-sm opacity-70 mt-1">
            {t("institution:subsidies.appliedCount", { count: subsidies.length })}
          </p>
        </div>

        <Card className="p-5 sm:p-6">
          <p className="flex items-center gap-2 mb-2 text-sm text-content-secondary">
            <DollarSign size={20} className="text-positive-content" />
            {t("dashboard:institution.availableBalance")}
          </p>
          <Money
            value={balance}
            currency={currency}
            className={`block text-3xl sm:text-4xl font-bold break-all ${
              balance > 0 ? "text-positive-content" : "text-content-muted"
            }`}
          />
          <p className="text-sm text-content-muted mt-1">{t("institution:subsidies.toApplySubsidies")}</p>
        </Card>
      </div>

      {isLoading ? (
        <SkeletonCards count={5} />
      ) : subsidies.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title={t("institution:subsidies.empty")}
          description={t("institution:subsidies.goToStudents")}
        />
      ) : (
        <div className="space-y-3">
          {subsidies.map((subsidy, index) => (
            <motion.div
              key={subsidy.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="w-10 h-10 rounded-full bg-brand-surface flex items-center justify-center text-brand font-bold flex-shrink-0">
                    {subsidy.student.name.charAt(0)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-content-primary truncate">
                      {subsidy.student.name}
                    </h3>
                    <p className="text-sm text-content-secondary truncate">
                      {subsidy.student.email}
                    </p>
                    {subsidy.reason && (
                      <p className="text-xs text-content-muted mt-1 line-clamp-2">
                        {subsidy.reason}
                      </p>
                    )}
                    <span className="flex items-center gap-1 text-xs text-content-muted mt-2 sm:hidden">
                      <Calendar size={12} />
                      <DateTime value={subsidy.appliedAt} preset="dateLong" />
                    </span>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <Money
                      value={subsidy.amount}
                      currency={subsidy.currency || currency}
                      signed
                      className="block text-base sm:text-lg font-bold text-positive-content"
                    />
                    <span className="hidden sm:flex items-center gap-1 text-xs text-content-muted mt-1 justify-end">
                      <Calendar size={12} />
                      <DateTime value={subsidy.appliedAt} preset="dateLong" />
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {showRecharge && (
        <InstitutionRechargeModal
          currentBalance={balance}
          currency={currency}
          onClose={() => setShowRecharge(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.institution.all() });
          }}
        />
      )}
    </PageShell>
  );
}
