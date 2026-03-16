import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Users, DollarSign, Building } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/authStore";
import { walletService } from "../../services/wallet.service";
import api from "../../services/api";

function SubsidyModal({
  student,
  universityId,
  universityBalance,
  onClose,
  onSubmit,
  isPending,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Aplicar subsidio
        </h3>
        <p className="text-sm text-gray-500 mb-4">para {student.name}</p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">Balance disponible</span>
          <span className="font-bold text-green-600">
            ${universityBalance?.toFixed(2) || "0.00"} USD
          </span>
        </div>

        <form
          onSubmit={handleSubmit((data) =>
            onSubmit({
              studentId: student.id,
              universityId,
              amount: parseFloat(data.amount),
              reason: data.reason,
            }),
          )}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto (USD)
              </label>
              <input
                {...register("amount", {
                  required: "Ingresa un monto",
                  min: { value: 1, message: "Mínimo $1" },
                  max: {
                    value: universityBalance || 0,
                    message: "Saldo universitario insuficiente",
                  },
                })}
                type="number"
                min="1"
                step="0.5"
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
                Motivo
              </label>
              <textarea
                {...register("reason", { required: "Ingresa un motivo" })}
                rows={3}
                placeholder="Ej: Apoyo académico estudiante en riesgo..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
              />
              {errors.reason && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.reason.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
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
              disabled={
                isPending || !universityBalance || universityBalance <= 0
              }
              className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white
              rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {isPending ? "Aplicando..." : "Aplicar subsidio"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function UniversityStudents() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [subsidyStudent, setSubsidyStudent] = useState(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ["students", search],
    queryFn: () =>
      api
        .get("/universities/students", { params: { search } })
        .then((r) => r.data.data),
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get("/universities/analytics").then((r) => r.data.data),
  });

  const universityBalance = analytics?.overview?.universityBalance || 0;

  const { mutate: applySubsidy, isPending } = useMutation({
    mutationFn: (data) => walletService.addSubsidy(data),
    onSuccess: () => {
      toast.success("Subsidio aplicado exitosamente");
      setSubsidyStudent(null);
      queryClient.invalidateQueries(["students"]);
      queryClient.invalidateQueries(["analytics"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al aplicar subsidio"),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Estudiantes</h1>
        <p className="text-gray-500 mb-6">
          Gestiona los estudiantes de tu universidad
        </p>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Balance disponible para subsidios
              </p>
              <p className="text-xs text-gray-400">Fondos de la universidad</p>
            </div>
          </div>
          <span
            className={`text-2xl font-bold ${universityBalance > 0 ? "text-green-600" : "text-red-500"}`}
          >
            ${universityBalance?.toFixed(2) || "0.00"}
          </span>
        </div>

        <div className="relative mb-6">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl bg-white
            focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (students || []).length === 0 ? (
          <div className="text-center py-20">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">
              No se encontraron estudiantes
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {(students || []).map((student, i) => {
              const totalSessions = student.sessionsAsStudent?.length || 0;
              const completed =
                student.sessionsAsStudent?.filter(
                  (s) => s.status === "completed",
                ).length || 0;

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full bg-blue-100 flex items-center
                    justify-center text-blue-600 font-bold flex-shrink-0"
                    >
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">
                        {student.name}
                      </h3>
                      <p className="text-sm text-gray-500">{student.email}</p>
                      {student.faculty && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building size={11} className="text-gray-300" />
                          <span className="text-xs text-gray-400">
                            {student.faculty.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">
                          {totalSessions}
                        </p>
                        <p className="text-xs text-gray-400">sesiones</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-green-600">
                          {completed}
                        </p>
                        <p className="text-xs text-gray-400">completadas</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-orange-600">
                          ${student.wallet?.balance?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-xs text-gray-400">saldo</p>
                      </div>
                      <button
                        onClick={() => setSubsidyStudent(student)}
                        disabled={universityBalance <= 0}
                        className="flex items-center gap-2 px-3 py-2 bg-orange-50
                        border border-orange-200 text-orange-600 hover:bg-orange-100
                        rounded-lg transition-colors text-sm font-medium
                        disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <DollarSign size={14} />
                        Subsidiar
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {subsidyStudent && (
        <SubsidyModal
          student={subsidyStudent}
          universityId={user?.universityId}
          universityBalance={universityBalance}
          onClose={() => setSubsidyStudent(null)}
          onSubmit={applySubsidy}
          isPending={isPending}
        />
      )}
    </div>
  );
}
