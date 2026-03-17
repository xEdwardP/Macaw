import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building, DollarSign, Users, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../../services/api";
import { universitiesService } from "../../services/universities.service";

function RechargeModal({ university, onClose, onSubmit, isPending }) {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-md overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Recargar balance</h3>
            <p className="text-sm text-gray-500">{university.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex justify-between">
          <span className="text-sm text-gray-600">Balance actual</span>
          <span className="font-bold text-green-600">${university.balance?.toFixed(2) || "0.00"} USD</span>
        </div>

        <form onSubmit={handleSubmit((data) => onSubmit({ universityId: university.id, amount: parseFloat(data.amount) }))}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto a recargar (USD)
            </label>
            <input
              {...register("amount", { required: "Ingresa un monto", min: { value: 1, message: "Mínimo $1" } })}
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-700">
              Solo recarga el balance cuando hayas verificado que la universidad realizó la transferencia correspondiente.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {isPending ? "Recargando..." : "Recargar balance"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function AdminUniversities() {
  const [rechargeUniversity, setRechargeUniversity] = useState(null);
  const queryClient = useQueryClient();

  const { data: universities, isLoading } = useQuery({
    queryKey: ["universities"],
    queryFn: () => api.get("/universities/list").then((r) => r.data.data),
  });

  const { mutate: recharge, isPending } = useMutation({
    mutationFn: (data) => universitiesService.rechargeUniversity(data),
    onSuccess: () => {
      toast.success("Balance recargado exitosamente");
      setRechargeUniversity(null);
      queryClient.invalidateQueries(["universities"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Error al recargar"),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Universidades</h1>
        <p className="text-gray-500 mb-8">Gestiona las universidades y sus balances</p>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (universities || []).length === 0 ? (
          <div className="text-center py-20">
            <Building className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">No hay universidades registradas</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {(universities || []).map((university, i) => (
              <motion.div
                key={university.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 gap-4 md:gap-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                      <Building size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{university.name}</h3>
                      <p className="text-sm text-gray-500">{university.domain}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setRechargeUniversity(university)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <Plus size={14} /> Recargar balance
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign size={16} className="text-green-600" />
                      <span className="text-xs text-gray-500">Balance</span>
                    </div>
                    <p className={`text-xl font-bold ${university.balance > 0 ? "text-green-600" : "text-gray-400"}`}>
                      ${university.balance?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users size={16} className="text-blue-600" />
                      <span className="text-xs text-gray-500">Estudiantes</span>
                    </div>
                    <p className="text-xl font-bold text-blue-600">{university._count?.users || 0}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign size={16} className="text-orange-600" />
                      <span className="text-xs text-gray-500">Comisión</span>
                    </div>
                    <p className="text-xl font-bold text-orange-600">{(university.commissionRate * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {rechargeUniversity && (
        <RechargeModal
          university={rechargeUniversity}
          onClose={() => setRechargeUniversity(null)}
          onSubmit={recharge}
          isPending={isPending}
        />
      )}
    </div>
  );
}