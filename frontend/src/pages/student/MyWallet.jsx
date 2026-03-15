import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  TrendingUp,
  Plus,
} from "lucide-react";
import { walletService } from "../../services/wallet.service";
import RechargeModal from "../../components/wallet/RechargeModal";

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
    label: "Pago liberado",
    color: "text-blue-600",
    bg: "bg-blue-100",
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

export default function MyWallet() {
  const [showRecharge, setShowRecharge] = useState(false);
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

  const transactions = txData?.transactions || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Mi Wallet</h1>
          <button
            onClick={() => setShowRecharge(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600
            hover:bg-orange-700 text-white rounded-xl transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Recargar
          </button>
        </div>
        <p className="text-gray-500 mb-8">Saldo y historial de transacciones</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-600 rounded-xl p-6 text-white md:col-span-1"
          >
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={18} />
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
            <div className="flex items-center gap-2 mb-2 text-yellow-600">
              <Clock size={18} />
              <span className="text-sm text-gray-500">Congelado</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${loadingWallet ? "..." : wallet?.frozen?.toFixed(2) || "0.00"}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
          >
            <div className="flex items-center gap-2 mb-2 text-green-600">
              <TrendingUp size={18} />
              <span className="text-sm text-gray-500">Total gastado</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              $
              {loadingWallet ? "..." : (wallet?.lifetimeEarned || 0).toFixed(2)}
            </div>
          </motion.div>
        </div>

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
                const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.recharge;
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

      {showRecharge && (
        <RechargeModal
          onClose={() => setShowRecharge(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(["wallet"]);
            queryClient.invalidateQueries(["transactions"]);
          }}
        />
      )}
    </div>
  );
}
