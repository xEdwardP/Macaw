import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Star,
  DollarSign,
  CheckCircle,
  Clock,
  ChevronRight,
  Video,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { sessionsService } from "../../services/sessions.service";
import { walletService } from "../../services/wallet.service";

const STATUS_LABELS = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmada", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completada", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export default function TutorDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionsService.getAll().then((r) => r.data.data),
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getMyWallet().then((r) => r.data.data),
  });

  const { mutate: confirmSession } = useMutation({
    mutationFn: (id) => sessionsService.confirm(id),
    onSuccess: () => {
      toast.success("Sesión confirmada");
      queryClient.invalidateQueries(["sessions"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al confirmar"),
  });

  const { mutate: completeSession } = useMutation({
    mutationFn: (id) => sessionsService.complete(id),
    onSuccess: () => {
      toast.success("Sesión completada");
      queryClient.invalidateQueries(["sessions"]);
      queryClient.invalidateQueries(["wallet"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al completar"),
  });

  const { mutate: cancelSession } = useMutation({
    mutationFn: (id) => sessionsService.cancel(id),
    onSuccess: () => {
      toast.success("Sesión cancelada");
      queryClient.invalidateQueries(["sessions"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al cancelar"),
  });

  const allSessions = sessions || [];
  const pendingSessions = allSessions.filter((s) => s.status === "pending");
  const confirmedSessions = allSessions.filter((s) => s.status === "confirmed");
  const completedCount = allSessions.filter(
    (s) => s.status === "completed",
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Hola, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-gray-500 mt-1">Panel de tutor</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Saldo disponible",
              value: `$${wallet?.balance?.toFixed(2) || "0.00"}`,
              icon: DollarSign,
              color: "text-orange-600",
              bg: "bg-orange-50",
            },
            {
              label: "Solicitudes",
              value: pendingSessions.length,
              icon: Clock,
              color: "text-yellow-600",
              bg: "bg-yellow-50",
            },
            {
              label: "Confirmadas",
              value: confirmedSessions.length,
              icon: Calendar,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Completadas",
              value: completedCount,
              icon: CheckCircle,
              color: "text-green-600",
              bg: "bg-green-50",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.bg}`}
              >
                <stat.icon size={20} className={stat.color} />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending sessions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-yellow-600" />
              Solicitudes pendientes
              {pendingSessions.length > 0 && (
                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                  {pendingSessions.length}
                </span>
              )}
            </h3>

            {pendingSessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No hay solicitudes pendientes
              </p>
            ) : (
              <div className="space-y-3">
                {pendingSessions.map((session) => {
                  const [year, month, day] = session.date
                    .split("T")[0]
                    .split("-")
                    .map(Number);
                  const date = new Date(
                    year,
                    month - 1,
                    day,
                  ).toLocaleDateString("es-HN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={session.id}
                      className="border border-gray-100 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-8 h-8 rounded-full bg-blue-100 flex items-center
                        justify-center text-blue-600 font-bold text-sm"
                        >
                          {session.student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {session.student.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {session.subject.name} · {date} {session.startTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmSession(session.id)}
                          className="flex-1 py-1.5 bg-green-600 hover:bg-green-700
                          text-white text-xs rounded-lg transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => cancelSession(session.id)}
                          className="flex-1 py-1.5 border border-red-200 text-red-600
                          hover:bg-red-50 text-xs rounded-lg transition-colors"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confirmed sessions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" />
              Sesiones confirmadas
            </h3>

            {confirmedSessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No hay sesiones confirmadas
              </p>
            ) : (
              <div className="space-y-3">
                {confirmedSessions.map((session) => {
                  const [year, month, day] = session.date
                    .split("T")[0]
                    .split("-")
                    .map(Number);
                  const date = new Date(
                    year,
                    month - 1,
                    day,
                  ).toLocaleDateString("es-HN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={session.id}
                      className="border border-gray-100 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-8 h-8 rounded-full bg-orange-100 flex items-center
                        justify-center text-orange-600 font-bold text-sm"
                        >
                          {session.student.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            {session.student.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {session.subject.name} · {date} {session.startTime}
                          </p>
                        </div>
                        <span className="text-orange-600 font-semibold text-sm">
                          ${session.price}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {session.meetingUrl && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Video size={12} />
                            Unirse
                          </a>
                        )}
                        <button
                          onClick={() => completeSession(session.id)}
                          className="flex-1 py-1.5 bg-green-600 hover:bg-green-700
                          text-white text-xs rounded-lg transition-colors"
                        >
                          Completar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wallet summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-orange-600" />
              Resumen de ganancias
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Saldo disponible</span>
                <span className="font-semibold text-gray-900">
                  ${wallet?.balance?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Ganancias totales</span>
                <span className="font-semibold text-green-600">
                  ${wallet?.lifetimeEarned?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">
                  Sesiones completadas
                </span>
                <span className="font-semibold text-gray-900">
                  {completedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Acciones rápidas
            </h3>
            <div className="space-y-2">
              {[
                {
                  label: "Ver todas las sesiones",
                  icon: Calendar,
                  to: "/tutor/sessions",
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  label: "Mi wallet",
                  icon: DollarSign,
                  to: "/tutor/wallet",
                  color: "text-green-600",
                  bg: "bg-green-50",
                },
                {
                  label: "Mi perfil",
                  icon: Users,
                  to: "/tutor/profile",
                  color: "text-orange-600",
                  bg: "bg-orange-50",
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.bg}`}
                  >
                    <action.icon size={16} className={action.color} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {action.label}
                  </span>
                  <ChevronRight size={14} className="text-gray-400 ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
