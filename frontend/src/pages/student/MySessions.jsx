import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  Star,
  X,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { sessionsService } from "../../services/sessions.service";
import { reviewsService } from "../../services/reviews.service";
import ConfirmModal from "../../components/ui/ConfirmModal";

const STATUS_LABELS = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmada", color: "bg-blue-100 text-blue-700" },
  pending_confirmation: {
    label: "Pendiente de confirmar",
    color: "bg-purple-100 text-purple-700",
  },
  disputed: { label: "En disputa", color: "bg-red-100 text-red-700" },
  completed: { label: "Completada", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-700" },
};

// ReviewModal y DisputeModal quedan igual, no se modifican

export default function MySessions() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [reviewSession, setReviewSession] = useState(null);
  const [disputeSession, setDisputeSession] = useState(null);
  const [cancelSessionModal, setCancelSessionModal] = useState({
    isOpen: false,
    session: null,
  });

  const queryClient = useQueryClient();
  const limit = 5; // sesiones por página

  const { data, isLoading } = useQuery({
    queryKey: ["sessions", page, filter],
    queryFn: () =>
      sessionsService
        .getAll({
          page,
          limit,
          status: filter === "all" ? undefined : filter,
        })
        .then((r) => r.data),
  });

  const { mutate: cancelSession } = useMutation({
    mutationFn: (id) => sessionsService.cancel(id),
    onSuccess: () => {
      toast.success("Sesión cancelada");
      queryClient.invalidateQueries(["sessions"]);
      queryClient.invalidateQueries(["wallet"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al cancelar"),
  });

  const { mutate: submitReview, isPending: isReviewing } = useMutation({
    mutationFn: (data) => reviewsService.create(data),
    onSuccess: () => {
      toast.success("Reseña enviada");
      setReviewSession(null);
      queryClient.invalidateQueries(["sessions"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al enviar reseña"),
  });

  const { mutate: studentConfirm, isPending: isConfirming } = useMutation({
    mutationFn: (id) => sessionsService.studentConfirm(id),
    onSuccess: () => {
      toast.success("Sesión confirmada, pago liberado al tutor");
      queryClient.invalidateQueries(["sessions"]);
      queryClient.invalidateQueries(["wallet"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al confirmar"),
  });

  const { mutate: submitDispute, isPending: isDisputing } = useMutation({
    mutationFn: ({ id, reason }) => sessionsService.dispute(id, reason),
    onSuccess: () => {
      toast.success("Reporte enviado al administrador");
      setDisputeSession(null);
      queryClient.invalidateQueries(["sessions"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al enviar reporte"),
  });

  const sessions = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis sesiones</h1>
        <p className="text-gray-500 mb-8">Historial y próximas sesiones</p>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "all", label: "Todas" },
            { key: "pending", label: "Pendientes" },
            { key: "confirmed", label: "Confirmadas" },
            { key: "pending_confirmation", label: "Por confirmar" },
            { key: "disputed", label: "En disputa" },
            { key: "completed", label: "Completadas" },
            { key: "cancelled", label: "Canceladas" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
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

        {/* Contenido de sesiones */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">No hay sesiones</h3>
            <p className="text-gray-500 mt-1">No tienes sesiones en esta categoria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, i) => {
              const status = STATUS_LABELS[session.status];
              const [year, month, day] = session.date
                .split("T")[0]
                .split("-")
                .map(Number);
              const date = new Date(year, month - 1, day).toLocaleDateString(
                "es-HN",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              );

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
                >
                  {/* Contenido de sesión */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {session.subject.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        con {session.tutor.name}
                      </p>
                    </div>
                    <span className="text-orange-600 font-semibold">
                      ${session.price}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      {date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-gray-400" />
                      {session.startTime} - {session.endTime}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100 flex-wrap">
                    {session.status === "confirmed" && session.meetingUrl && (
                      <a
                        href={session.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        <Video size={14} />
                        Unirse a la sesión
                      </a>
                    )}

                    {session.status === "pending_confirmation" && (
                      <>
                        <button
                          onClick={() => studentConfirm(session.id)}
                          disabled={isConfirming}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600
                          hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={14} />
                          Confirmar sesión recibida
                        </button>
                        <button
                          onClick={() => setDisputeSession(session)}
                          className="flex items-center gap-2 px-4 py-2 border border-red-200
                          text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors"
                        >
                          <AlertTriangle size={14} />
                          Reportar problema
                        </button>
                        <div
                          className="w-full flex items-center gap-2 text-xs text-amber-600 bg-amber-50
                        border border-amber-200 px-3 py-2 rounded-lg"
                        >
                          Si no confirmas en 24hrs el pago se liberará
                          automáticamente
                        </div>
                      </>
                    )}

                    {["pending", "confirmed"].includes(session.status) && (
                      <button
                        onClick={() =>
                          setCancelSessionModal({ isOpen: true, session })
                        }
                        className="flex items-center gap-2 px-4 py-2 border border-red-200
                        text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors"
                      >
                        <X size={14} />
                        Cancelar
                      </button>
                    )}

                    {session.status === "completed" && !session.review && (
                      <button
                        onClick={() => setReviewSession(session)}
                        className="flex items-center gap-2 px-4 py-2 border border-orange-200
                        text-orange-600 hover:bg-orange-50 text-sm rounded-lg transition-colors"
                      >
                        <Star size={14} />
                        Dejar reseña
                      </button>
                    )}

                    {session.status === "completed" && session.review && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle size={14} />
                        Reseña enviada
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* PAGINACIÓN */}
        {sessions.length > 0 && (
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* MODALES */}
      {reviewSession && (
        <ReviewModal
          session={reviewSession}
          onClose={() => setReviewSession(null)}
          onSubmit={submitReview}
          isPending={isReviewing}
        />
      )}

      {disputeSession && (
        <DisputeModal
          session={disputeSession}
          onClose={() => setDisputeSession(null)}
          onSubmit={(id, reason) => submitDispute({ id, reason })}
          isPending={isDisputing}
        />
      )}

      {cancelSessionModal.isOpen && (
        <ConfirmModal
          isOpen={cancelSessionModal.isOpen}
          onClose={() => setCancelSessionModal({ isOpen: false, session: null })}
          onConfirm={() => cancelSession(cancelSessionModal.session.id)}
          title="Cancelar sesión?"
          message="Esta acción no se puede deshacer."
          confirmLabel="Sí, cancelar"
          cancelLabel="No, volver"
          variant="danger"
        />
      )}
    </div>
  );
}