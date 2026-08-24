import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { paypalService } from "../../services/paypal.service";
import { Button, Modal, Spinner } from "../../ui";
import Money, { formatMoney } from "../../domain/Money";
import { useLocaleSettings } from "../../domain/useLocaleSettings";
import { translateError } from "../../i18n/translateError";

const AMOUNTS = [5, 10, 20, 50, 100];

export default function RechargeModal({ onClose, onSuccess }) {
  const { t } = useTranslation("wallet");
  const { locale } = useLocaleSettings();
  const [amount, setAmount] = useState(10);
  const [step, setStep] = useState("select");
  const [newBalance, setNewBalance] = useState(null);
  const [{ isPending }] = usePayPalScriptReducer();

  const createOrder = async () => {
    try {
      const order = await paypalService.createOrder({ amount });
      return order.orderId;
    } catch (err) {
      toast.error(translateError(err));
      throw err;
    }
  };

  const onApprove = async (data) => {
    try {
      const result = await paypalService.captureOrder({ orderId: data.orderID });
      setNewBalance(result.balance);
      setStep("success");
      onSuccess?.();
    } catch (err) {
      toast.error(translateError(err));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("modal.rechargeWallet")}>
      {step === "select" && (
        <>
          <p className="text-sm text-content-secondary mb-4">
            {t("modal.pickAmount")}
          </p>

          <div className="grid grid-cols-5 gap-2 mb-6">
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

          <div className="bg-brand-surface border border-brand-line rounded-lg p-3 mb-6 flex justify-between text-sm">
            <span className="text-content-secondary">{t("modal.selectedAmount")}</span>
            <Money value={amount} currency="USD" className="font-bold text-brand" />
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
            {t("modal.addedToWallet", {
              amount: formatMoney(amount, { currency: "USD", locale }),
            })}
          </p>

          {newBalance !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-positive-surface border border-positive-line rounded-xl p-5 mb-6"
            >
              <p className="text-sm text-content-secondary mb-1">{t("modal.newBalance")}</p>
              <Money
                value={newBalance}
                className="block text-4xl font-bold text-positive-content"
              />
            </motion.div>
          )}

          <Button block onClick={onClose}>
            {t("modal.close")}
          </Button>
        </div>
      )}
    </Modal>
  );
}
