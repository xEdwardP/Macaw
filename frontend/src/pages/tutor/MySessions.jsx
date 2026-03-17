import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Clock, Video, CheckCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import { sessionsService } from "../../services/sessions.service";
import ConfirmModal from "../../components/ui/ConfirmModal";

const STATUS_LABELS = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmada", color: "bg-blue-100 text-blue-700" },
  pending_confirmation: { label: "Esperando confirmación", color: "bg-purple-100 text-purple-700" },
  completed: { label: "Completada", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export default function TutorMySessions() {
  const [filter, setFilter] = useState("all");
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    onConfirm: null,
    title: "",
    message: "",
    confirmLabel: "",
    cancelLabel: "",
    variant: "danger",
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionsService.getAll().then((r) => r.data.data),
  });

  const { mutate: confirmSession } = useMutation({
    mutationFn: (id) => sessionsService.confirm(id),
    onSuccess: () => {
      toast.success("Sesión confirmada");
      queryClient.invalidateQueries(["sessions"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Error al confirmar"),
  });

  const { mutate: completeSession } = useMutation({
    mutationFn: (id) => sessionsService.complete(id),
    onSuccess: () => {
      toast.success("Sesión completada");
      queryClient.invalidateQueries(["sessions"]);
      queryClient.invalidateQueries(["wallet"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Error al completar"),
  });

  const { mutate: cancelSession } = useMutation({
    mutationFn: (id) => sessionsService.cancel(id),
    onSuccess: () => {
      toast.success("Sesión cancelada");
      queryClient.invalidateQueries(["sessions"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Error al cancelar"),
  });

  const sessions = data || [];
  const filtered = filter === "all" ? sessions : sessions.filter((s) => s.status === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis sesiones</h1>
        <p className="text-gray-500 mb-8">Gestiona tus sesiones de tutoría</p>

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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">No hay sesiones</h3>
            <p className="text-gray-500 mt-1">No tienes sesiones en esta categoria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((session, i) => {
              const status = STATUS_LABELS[session.status];
              const [year, month, day] = session.date.split("T")[0].split("-").map(Number);
              const date = new Date(year, month - 1, day).toLocaleDateString("es-HN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{session.subject.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Estudiante: {session.student.name}</p>
                    </div>
                    <span className="text-orange-600 font-semibold">${session.price}</span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" /> {date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-gray-400" /> {session.startTime} - {session.endTime}
                    </div>
                  </div>

                  {session.notes && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-gray-500 font-medium mb-1">Notas del estudiante:</p>
                      <p className="text-sm text-gray-600">{session.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    {session.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              onConfirm: () => confirmSession(session.id),
                              title: "Confirmar sesión?",
                              message: "Esta acción no se puede deshacer.",
                              confirmLabel: "Si, confirmar",
                              cancelLabel: "No, volver",
                              variant: "success",
                            })
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <CheckCircle size={14} /> Confirmar
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              onConfirm: () => cancelSession(session.id),
                              title: "Rechazar sesión?",
                              message: "Esta acción no se puede deshacer.",
                              confirmLabel: "Si, rechazar",
                              cancelLabel: "No, volver",
                              variant: "danger",
                            })
                          }
                          className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors"
                        >
                          <X size={14} /> Rechazar
                        </button>
                      </>
                    )}

                    {session.status === "confirmed" && (
                      <>
                        {session.meetingUrl && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Video size={14} /> Unirse a la sesión
                          </a>
                        )}
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              onConfirm: () => completeSession(session.id),
                              title: "Completar sesión?",
                              message: "Esta acción marcará la sesión como completada.",
                              confirmLabel: "Si, completar",
                              cancelLabel: "No, volver",
                              variant: "success",
                            })
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <CheckCircle size={14} /> Marcar completada
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              onConfirm: () => cancelSession(session.id),
                              title: "Cancelar sesión?",
                              message: "Esta acción no se puede deshacer.",
                              confirmLabel: "Si, cancelar",
                              cancelLabel: "No, volver",
                              variant: "danger",
                            })
                          }
                          className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors"
                        >
                          <X size={14} /> Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal {...confirmModal} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} />
    </div>
  );
}