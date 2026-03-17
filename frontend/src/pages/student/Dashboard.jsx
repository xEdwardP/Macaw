import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Search,
  Wallet,
  Star,
  Clock,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { sessionsService } from "../../services/sessions.service";
import { walletService } from "../../services/wallet.service";
import { aiService } from "../../services/ai.service";

const STATUS_LABELS = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmada", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completada", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export default function StudentDashboard() {
  const { user } = useAuthStore();

  const { data: sessions } = useQuery({
    queryKey: ["sessions-dashboard"],
    queryFn: () =>
      sessionsService
        .getAll({ page: 1, limit: 100 })
        .then((r) => r.data.data.data),
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getMyWallet().then((r) => r.data.data),
  });

  const { data: aiData } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => aiService.getRecommendations().then((r) => r.data.data),
    retry: false,
  });

  const upcomingSessions = (sessions || [])
    .filter((s) => ["pending", "confirmed"].includes(s.status))
    .slice(0, 3);

  const completedCount = (sessions || []).filter(
    (s) => s.status === "completed",
  ).length;
  const recommendations = aiData?.recommendations || [];
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Hola, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-gray-500 mt-1">Bienvenido de vuelta a Macaw</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Saldo disponible",
              value: `$${wallet?.balance?.toFixed(2) || "0.00"}`,
              icon: Wallet,
              color: "text-orange-600",
              bg: "bg-orange-50",
            },
            {
              label: "Sesiones activas",
              value: upcomingSessions.length,
              icon: Calendar,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Completadas",
              value: completedCount,
              icon: Star,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "Saldo congelado",
              value: `$${wallet?.frozen?.toFixed(2) || "0.00"}`,
              icon: Clock,
              color: "text-yellow-600",
              bg: "bg-yellow-50",
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Próximas sesiones
                </h3>
                <Link
                  to="/student/sessions"
                  className="text-sm text-orange-600 hover:underline flex items-center gap-1"
                >
                  Ver todas <ChevronRight size={14} />
                </Link>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto text-gray-300 mb-3" size={36} />
                  <p className="text-gray-500 text-sm">
                    No tienes sesiones próximas
                  </p>
                  <Link
                    to="/tutors"
                    className="mt-3 inline-block text-sm text-orange-600 hover:underline"
                  >
                    Buscar un tutor
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => {
                    const status = STATUS_LABELS[session.status];
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
                        className="flex items-center gap-4 p-3 rounded-lg bg-gray-50"
                      >
                        <div
                          className="w-10 h-10 rounded-full bg-orange-100 flex items-center
                        justify-center text-orange-600 font-bold flex-shrink-0"
                        >
                          {session.tutor.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700">
                            {session.subject.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            con {session.tutor.name} · {date}{" "}
                            {session.startTime}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Acciones rápidas
              </h3>
              <div className="space-y-2">
                {[
                  {
                    label: "Buscar tutor",
                    icon: Search,
                    to: "/tutors",
                    color: "text-orange-600",
                    bg: "bg-orange-50",
                  },
                  {
                    label: "Mis sesiones",
                    icon: Calendar,
                    to: "/student/sessions",
                    color: "text-blue-600",
                    bg: "bg-blue-50",
                  },
                  {
                    label: "Mi wallet",
                    icon: Wallet,
                    to: "/student/wallet",
                    color: "text-green-600",
                    bg: "bg-green-50",
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

            {recommendations.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Recomendados para ti
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Sugerencias basadas en tu perfil
                </p>
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((rec) => (
                    <Link
                      key={rec.tutorId}
                      to={`/tutors/${rec.tutorId}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-full bg-orange-100 flex items-center
                      justify-center text-orange-600 font-bold text-sm flex-shrink-0"
                      >
                        {rec.tutor?.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {rec.tutor?.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {rec.reason}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-gray-400 flex-shrink-0"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
