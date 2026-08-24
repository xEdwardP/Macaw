import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { institutionsService } from "../../services/institutions.service";
import { Button, Modal, Spinner } from "../../ui";
import Money from "../../domain/Money";
import { translateError } from "../../i18n/translateError";

const AMOUNTS = [100, 250, 500, 1000, 2000];

export default function InstitutionRechargeModal({
  currentBalance,
  currency,
  onClose,
  onSuccess,
}) {
  const { t } = useTranslation("wallet");
  const [amount, setAmount] = useState(500);
  const [step, setStep] = useState("select");
  const [newBalance, setNewBalance] = useState(null);
  const [{ isPending }] = usePayPalScriptReducer();

  const createOrder = async () => {
    try {
      const order = await institutionsService.createOrder({ amount });
      return order.orderId;
    } catch (err) {
      toast.error(translateError(err));
      throw err;
    }
  };

  const onApprove = async (data) => {
    try {
      const result = await institutionsService.captureOrder({
        orderId: data.orderID,
      });
      setNewBalance(result.balance);
      setStep("success");
      onSuccess?.();
    } catch (err) {
      toast.error(translateError(err));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("modal.rechargeInstitution")}>
      {step === "select" && (
        <>
          <div className="bg-surface-muted rounded-lg p-3 mb-4 flex justify-between text-sm">
            <span className="text-content-secondary">{t("admin:institutions.currentBalance")}</span>
            <Money
              value={currentBalance}
              currency={currency}
              className="font-bold text-content-primary"
            />
          </div>

          <p className="text-sm text-content-secondary mb-3">
            {t("modal.pickAmount")}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {AMOUNTS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAmount(option)}
                aria-pressed={amount === option}
                className={`py-3 rounded-lg text-sm font-semibold transition-colors ${
                  amount === option
                    ? "bg-brand-solid text-brand-contrast"
                    : "bg-surface-sunken text-content-primary hover:bg-surface-sunken"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <Button block onClick={() => setStep("paypal")}>
            {t("modal.continueWithPaypal")}
          </Button>
        </>
      )}

      {step === "paypal" && (
        <>
          <div className="bg-surface-muted rounded-lg p-3 mb-4 flex justify-between text-sm">
            <span className="text-content-secondary">{t("modal.totalToPay")}</span>
            <Money value={amount} currency="USD" className="font-bold text-content-primary" />
          </div>

          {isPending ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size={32} />
            </div>
          ) : (
            <PayPalButtons
              style={{
                layout: "vertical",
                color: "gold",
                shape: "rect",
                label: "pay",
                height: 45,
              }}
              createOrder={createOrder}
              onApprove={onApprove}
              onError={() => toast.error(t("modal.paymentError"))}
              onCancel={() => setStep("select")}
            />
          )}

          <Button variant="ghost" block className="mt-3" onClick={() => setStep("select")}>
            {t("modal.back")}
          </Button>
        </>
      )}

      {step === "success" && (
        <div className="text-center py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="mx-auto text-positive-content mb-4" size={64} />
          </motion.div>

          <h4 className="text-2xl font-bold text-content-primary mb-2">{t("modal.rechargeDone")}</h4>
          <p className="text-content-secondary text-sm mb-6">
            {t("modal.institutionBalanceUpdated")}
          </p>

          {newBalance !== null && (
            <div className="bg-positive-surface border border-positive-line rounded-xl p-5 mb-6">
              <p className="text-sm text-content-secondary mb-1">{t("modal.newInstitutionBalance")}</p>
              <Money
                value={newBalance}
                currency={currency}
                className="block text-4xl font-bold text-positive-content"
              />
            </div>
          )}

          <Button block onClick={onClose}>
            {t("modal.close")}
          </Button>
        </div>
      )}
    </Modal>
  );
}
