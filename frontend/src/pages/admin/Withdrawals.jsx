import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DollarSign, CheckCircle, X, Clock } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { withdrawalService } from "../../services/wallet.service";

const STATUS_LABELS = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Aprobado", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
};

export default function AdminWithdrawals() {
  const [filter, setFilter] = useState("all");
  const [rejectId, setRejectId] = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["all-withdrawals"],
    queryFn: () => withdrawalService.getAll().then((r) => r.data.data),
  });

  const { mutate: approve } = useMutation({
    mutationFn: (id) => withdrawalService.approve(id),
    onSuccess: () => {
      toast.success("Retiro aprobado");
      queryClient.invalidateQueries(["all-withdrawals"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al aprobar"),
  });

  const { mutate: reject } = useMutation({
    mutationFn: ({ id, notes }) => withdrawalService.reject(id, notes),
    onSuccess: () => {
      toast.success("Retiro rechazado");
      setRejectId(null);
      setRejectNotes("");
      queryClient.invalidateQueries(["all-withdrawals"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al rechazar"),
  });

  const withdrawals = data || [];
  const filtered =
    filter === "all"
      ? withdrawals
      : withdrawals.filter((w) => w.status === filter);
  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Retiros</h1>
        <p className="text-gray-500 mb-8">
          Gestiona las solicitudes de retiro de los tutores
        </p>

        {pendingCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Clock className="text-yellow-500 flex-shrink-0" size={20} />
            <p className="text-sm text-yellow-700 font-medium">
              Tienes {pendingCount} solicitud{pendingCount > 1 ? "es" : ""} de
              retiro pendiente{pendingCount > 1 ? "s" : ""}.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {
              label: "Pendientes",
              value: withdrawals.filter((w) => w.status === "pending").length,
              color: "text-yellow-600",
            },
            {
              label: "Aprobados",
              value: withdrawals.filter((w) => w.status === "approved").length,
              color: "text-green-600",
            },
            {
              label: "Rechazados",
              value: withdrawals.filter((w) => w.status === "rejected").length,
              color: "text-red-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center"
            >
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: "all", label: "Todos" },
            { key: "pending", label: "Pendientes" },
            { key: "approved", label: "Aprobados" },
            { key: "rejected", label: "Rechazados" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  filter === f.key
                    ? "bg-orange-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
                }`}
            >
              {f.label}
              {f.key === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <DollarSign className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">
              No hay solicitudes
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((w, i) => {
              const status = STATUS_LABELS[w.status];
              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {w.user.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{w.user.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        PayPal: {w.paypalEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-orange-600">
                        ${w.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(w.createdAt).toLocaleDateString("es-HN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {w.notes && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2 mb-3">
                      <p className="text-xs text-red-600">Motivo: {w.notes}</p>
                    </div>
                  )}

                  {w.status === "pending" && (
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `¿Aprobar retiro de $${w.amount} a ${w.paypalEmail}?`,
                            )
                          )
                            approve(w.id);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600
                        hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                      >
                        <CheckCircle size={14} />
                        Aprobar
                      </button>
                      <button
                        onClick={() => setRejectId(w.id)}
                        className="flex items-center gap-2 px-4 py-2 border border-red-200
                        text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors"
                      >
                        <X size={14} />
                        Rechazar
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Rechazar retiro
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo del rechazo
              </label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                placeholder="Explica el motivo del rechazo..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectId(null);
                  setRejectNotes("");
                }}
                className="flex-1 py-2 border border-gray-300 text-gray-700
                rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => reject({ id: rejectId, notes: rejectNotes })}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white
                rounded-lg transition-colors text-sm"
              >
                Rechazar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
