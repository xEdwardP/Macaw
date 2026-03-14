import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Clock, X } from "lucide-react";
import toast from "react-hot-toast";
import { sessionsService } from "../../services/sessions.service";

const STATUS_LABELS = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmada", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completada", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export default function AdminSessions() {
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: () => sessionsService.getAll().then((r) => r.data.data),
  });

  const { mutate: cancelSession } = useMutation({
    mutationFn: (id) => sessionsService.cancel(id),
    onSuccess: () => {
      toast.success("Sesión cancelada");
      queryClient.invalidateQueries(["admin-sessions"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al cancelar"),
  });

  const sessions = data || [];
  const filtered =
    filter === "all" ? sessions : sessions.filter((s) => s.status === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sesiones</h1>
        <p className="text-gray-500 mb-8">
          Todas las sesiones de la plataforma
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: sessions.length, color: "text-gray-900" },
            {
              label: "Pendientes",
              value: sessions.filter((s) => s.status === "pending").length,
              color: "text-yellow-600",
            },
            {
              label: "Completadas",
              value: sessions.filter((s) => s.status === "completed").length,
              color: "text-green-600",
            },
            {
              label: "Canceladas",
              value: sessions.filter((s) => s.status === "cancelled").length,
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

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "all", label: "Todas" },
            { key: "pending", label: "Pendientes" },
            { key: "confirmed", label: "Confirmadas" },
            { key: "completed", label: "Completadas" },
            { key: "cancelled", label: "Canceladas" },
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
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">
              No hay sesiones
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((session, i) => {
              const status = STATUS_LABELS[session.status];
              const [year, month, day] = session.date
                .split("T")[0]
                .split("-")
                .map(Number);
              const date = new Date(year, month - 1, day).toLocaleDateString(
                "es-HN",
                {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              );

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {session.subject.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {session.student.name} → {session.tutor.name}
                      </p>
                    </div>
                    <span className="text-orange-600 font-semibold">
                      ${session.price}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={13} />
                      {date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={13} />
                      {session.startTime} - {session.endTime}
                    </div>
                  </div>

                  {["pending", "confirmed"].includes(session.status) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          if (confirm("¿Cancelar esta sesión?"))
                            cancelSession(session.id);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 border border-red-200
                        text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors"
                      >
                        <X size={14} />
                        Cancelar sesión
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
