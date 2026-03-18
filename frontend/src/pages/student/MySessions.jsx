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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { sessionsService } from "../../services/sessions.service";
import { reviewsService } from "../../services/reviews.service";

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

function ReviewModal({ session, onClose, onSubmit, isPending }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-1">Dejar reseña</h3>
        <p className="text-sm text-gray-500 mb-6">
          Sesión con {session.tutor.name}
        </p>

        <div className="flex gap-2 mb-4 justify-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setRating(s)}>
              <Star
                size={32}
                className={
                  s <= rating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-200 fill-gray-200"
                }
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comparte tu experiencia con este tutor..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ sessionId: session.id, rating, comment })}
            disabled={isPending}
            className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {isPending ? "Enviando..." : "Enviar reseña"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DisputeModal({ session, onClose, onSubmit, isPending }) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-1">
          <AlertTriangle className="text-red-500" size={22} />
          <h3 className="text-lg font-bold text-gray-900">Reportar problema</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Sesión con {session.tutor.name}
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-red-700">
            El administrador revisará tu caso y tomará una decisión. Los
            créditos permanecerán congelados hasta que se resuelva la disputa.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Describe el problema
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: El tutor no se conectó a la videollamada, la sesión no se realizó..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit(session.id, reason)}
            disabled={isPending || !reason.trim()}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {isPending ? "Enviando..." : "Enviar reporte"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CancelModal({ onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Cancelar sesion</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Esta accion no se puede deshacer. Si cancelas con menos de 24hrs de
          anticipacion solo recibiras un reembolso del 50%.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            No, volver
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
          >
            Si, cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function MySessions() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [reviewSession, setReviewSession] = useState(null);
  const [disputeSession, setDisputeSession] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const queryClient = useQueryClient();
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["sessions", page, filter],
    queryFn: () =>
      sessionsService
        .getAll({ page, limit, status: filter === "all" ? undefined : filter })
        .then((r) => r.data.data),
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
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const handleFilterChange = (key) => {
    setFilter(key);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis sesiones</h1>
        <p className="text-gray-500 mb-8">Historial y próximas sesiones</p>

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
              onClick={() => handleFilterChange(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${filter === f.key ? "bg-orange-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"}`}
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
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">
              No hay sesiones
            </h3>
            <p className="text-gray-500 mt-1">
              No tienes sesiones en esta categoria
            </p>
          </div>
        ) : (
          <>
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
                          Unirse a la sesion
                        </a>
                      )}

                      {session.status === "pending_confirmation" && (
                        <>
                          <button
                            onClick={() => studentConfirm(session.id)}
                            disabled={isConfirming}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                          >
                            <CheckCircle size={14} />
                            Confirmar sesión recibida
                          </button>
                          <button
                            onClick={() => setDisputeSession(session)}
                            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors"
                          >
                            <AlertTriangle size={14} />
                            Reportar problema
                          </button>
                          <div className="w-full flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                            Si no confirmas en 24hrs el pago se liberará
                            automáticamente
                          </div>
                        </>
                      )}

                      {session.status === "disputed" && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                          <AlertTriangle size={14} />
                          Disputa en revisión por el administrador
                        </div>
                      )}

                      {["pending", "confirmed"].includes(session.status) && (
                        <button
                          onClick={() => setConfirmModal(session.id)}
                          className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors"
                        >
                          <X size={14} />
                          Cancelar
                        </button>
                      )}

                      {session.status === "completed" && !session.review && (
                        <button
                          onClick={() => setReviewSession(session)}
                          className="flex items-center gap-2 px-4 py-2 border border-orange-200 text-orange-600 hover:bg-orange-50 text-sm rounded-lg transition-colors"
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

            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Mostrando {from}-{to} de {total} sesiones
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                  Anterior
                </button>
                <span className="text-sm text-gray-500">
                  {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

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

      {confirmModal && (
        <CancelModal
          onClose={() => setConfirmModal(null)}
          onConfirm={() => {
            cancelSession(confirmModal);
            setConfirmModal(null);
          }}
        />
      )}
    </div>
  );
}
