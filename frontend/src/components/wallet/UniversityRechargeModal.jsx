// frontend/src/components/ui/UniversityRechargeModal.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { Building, X, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { universitiesService } from "../../services/universities.service";

const AMOUNTS = [100, 250, 500, 1000, 2000];

export default function UniversityRechargeModal({ currentBalance, onClose, onSuccess }) {
  const [amount, setAmount] = useState(500);
  const [step, setStep] = useState("select");
  const [newBalance, setNewBalance] = useState(null);
  const [{ isPending }] = usePayPalScriptReducer();

  const handleCreateOrder = async () => {
    try {
      const res = await universitiesService.createUniversityOrder({ amount });
      return res.data.data.orderId;
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al crear orden");
      throw err;
    }
  };

  const handleApprove = async (data) => {
    try {
      const res = await universitiesService.captureUniversityOrder({ orderId: data.orderID });
      setNewBalance(res.data.data.balance);
      setStep("success");
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al procesar el pago");
    }
  };

  const handleError = (err) => {
    console.error("PayPal error:", err);
    toast.error("Error en el pago. Intenta de nuevo.");
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building className="text-orange-600" size={22} />
            <h3 className="text-lg font-bold text-gray-900">
              Recargar balance universitario
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-6">
          {step === "select" && (
            <>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 flex justify-between text-sm">
                <span className="text-gray-600">Balance actual</span>
                <span className="font-bold text-green-600">
                  ${currentBalance?.toFixed(2) || "0.00"} USD
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-4">Selecciona el monto a recargar</p>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {AMOUNTS.map((a) => (
                  <motion.button
                    key={a}
                    onClick={() => setAmount(a)}
                    whileHover={{ scale: 1.05 }}
                    className={`py-3 rounded-lg text-sm font-semibold transition-all
                      ${amount === a ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    ${a}
                  </motion.button>
                ))}
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monto seleccionado</span>
                  <span className="font-bold text-orange-600">${amount}.00 USD</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Balance después de recarga</span>
                  <span className="font-bold text-green-600">
                    ${(currentBalance || 0 + amount).toFixed(2)} USD
                  </span>
                </div>
              </div>

              <button
                onClick={() => setStep("paypal")}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors"
              >
                Continuar con PayPal
              </button>
            </>
          )}

          {step === "paypal" && (
            <>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 flex justify-between text-sm">
                <span className="text-gray-600">Total a pagar</span>
                <span className="font-bold text-gray-900">${amount}.00 USD</span>
              </div>

              {isPending ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent" />
                </div>
              ) : (
                <PayPalButtons
                  style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay", height: 45 }}
                  createOrder={handleCreateOrder}
                  onApprove={handleApprove}
                  onError={handleError}
                  onCancel={() => setStep("select")}
                />
              )}

              <button
                onClick={() => setStep("select")}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Volver
              </button>
            </>
          )}

          {step === "success" && (
            <div className="text-center py-4 space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
              </motion.div>
              <h4 className="text-2xl font-bold text-gray-900">Recarga exitosa</h4>
              <p className="text-gray-500 text-sm mb-6">
                Se han agregado <strong className="text-orange-600">${amount}.00</strong> al balance universitario
              </p>
              {newBalance !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6"
                >
                  <p className="text-sm text-gray-500 mb-1">Nuevo balance disponible</p>
                  <p className="text-4xl font-bold text-green-600">${newBalance.toFixed(2)}</p>
                </motion.div>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}