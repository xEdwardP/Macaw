import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  TrendingUp,
  Plus,
  X,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  walletService,
  withdrawalService,
} from "../../services/wallet.service";

const TYPE_CONFIG = {
  recharge: {
    label: "Recarga",
    color: "text-green-600",
    bg: "bg-green-100",
    icon: ArrowUpCircle,
  },
  frozen: {
    label: "Reserva",
    color: "text-yellow-600",
    bg: "bg-yellow-100",
    icon: Clock,
  },
  released: {
    label: "Pago recibido",
    color: "text-green-600",
    bg: "bg-green-100",
    icon: ArrowUpCircle,
  },
  commission: {
    label: "Comision",
    color: "text-gray-600",
    bg: "bg-gray-100",
    icon: ArrowDownCircle,
  },
  subsidy: {
    label: "Subsidio",
    color: "text-purple-600",
    bg: "bg-purple-100",
    icon: ArrowUpCircle,
  },
  withdrawal: {
    label: "Retiro",
    color: "text-red-600",
    bg: "bg-red-100",
    icon: ArrowDownCircle,
  },
  refund: {
    label: "Reembolso",
    color: "text-green-600",
    bg: "bg-green-100",
    icon: ArrowUpCircle,
  },
};

function WithdrawalModal({ wallet, onClose, onSuccess }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const { mutate, isPending } = useMutation({
    mutationFn: (data) =>
      withdrawalService.create({
        amount: parseFloat(data.amount),
        paypalEmail: data.paypalEmail,
      }),
    onSuccess: () => {
      toast.success("Solicitud de retiro enviada");
      onSuccess?.();
      onClose();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al solicitar retiro"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Solicitar retiro</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Saldo disponible</span>
            <span className="font-bold text-orange-600">
              ${wallet?.balance?.toFixed(2)} USD
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(mutate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto a retirar (USD)
            </label>
            <input
              {...register("amount", {
                required: "Ingresa un monto",
                min: { value: 1, message: "Minimo $1" },
                max: {
                  value: wallet?.balance || 0,
                  message: "Saldo insuficiente",
                },
              })}
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de PayPal
            </label>
            <input
              {...register("paypalEmail", {
                required: "Ingresa tu email de PayPal",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Email invalido",
                },
              })}
              type="email"
              placeholder="tu@paypal.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {errors.paypalEmail && (
              <p className="text-red-500 text-xs mt-1">
                {errors.paypalEmail.message}
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="text-amber-600 mt-0.5 flex-shrink-0"
              />
              <p className="text-xs text-amber-700">
                El monto sera congelado mientras el admin procesa tu solicitud.
                Una vez aprobada, recibiras el pago en tu cuenta de PayPal.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-gray-700
              rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white
              rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {isPending ? "Enviando..." : "Solicitar retiro"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function TutorMyWallet() {
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getMyWallet().then((r) => r.data.data),
  });

  const { data: txData, isLoading: loadingTx } = useQuery({
    queryKey: ["transactions"],
    queryFn: () =>
      walletService.getTransactions({ limit: 20 }).then((r) => r.data.data),
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: () => withdrawalService.getAll().then((r) => r.data.data),
  });

  const transactions = txData?.transactions || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Mi Wallet</h1>
          <button
            onClick={() => setShowWithdrawal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600
            hover:bg-orange-700 text-white rounded-xl transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Solicitar retiro
          </button>
        </div>
        <p className="text-gray-500 mb-8">
          Ganancias e historial de transacciones
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-600 rounded-xl p-6 text-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} />
              <span className="text-sm opacity-80">Saldo disponible</span>
            </div>
            <div className="text-3xl font-bold">
              ${loadingWallet ? "..." : wallet?.balance?.toFixed(2) || "0.00"}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-green-600" />
              <span className="text-sm text-gray-500">Total ganado</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              $
              {loadingWallet
                ? "..."
                : wallet?.lifetimeEarned?.toFixed(2) || "0.00"}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-yellow-600" />
              <span className="text-sm text-gray-500">Congelado</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${loadingWallet ? "..." : wallet?.frozen?.toFixed(2) || "0.00"}
            </div>
          </motion.div>
        </div>

        {withdrawals?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Solicitudes de retiro
            </h3>
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      ${w.amount.toFixed(2)} USD
                    </p>
                    <p className="text-xs text-gray-400">{w.paypalEmail}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(w.createdAt).toLocaleDateString("es-HN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium
                    ${
                      w.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : w.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {w.status === "pending"
                      ? "Pendiente"
                      : w.status === "approved"
                        ? "Aprobado"
                        : "Rechazado"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-6">
            Historial de transacciones
          </h3>

          {loadingTx ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              No hay transacciones aun
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx, i) => {
                const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.released;
                const Icon = config.icon;
                const isPositive = [
                  "recharge",
                  "released",
                  "subsidy",
                  "refund",
                ].includes(tx.type);
                const date = new Date(tx.createdAt).toLocaleDateString(
                  "es-HN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                );

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}
                    >
                      <Icon size={18} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">
                        {config.label}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-gray-400">{date}</p>
                    </div>
                    <span
                      className={`font-semibold text-sm flex-shrink-0
                      ${isPositive ? "text-green-600" : "text-red-500"}`}
                    >
                      {isPositive ? "+" : "-"}${tx.amount.toFixed(2)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showWithdrawal && (
        <WithdrawalModal
          wallet={wallet}
          onClose={() => setShowWithdrawal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(["wallet"]);
            queryClient.invalidateQueries(["withdrawals"]);
            queryClient.invalidateQueries(["transactions"]);
          }}
        />
      )}
    </div>
  );
}
