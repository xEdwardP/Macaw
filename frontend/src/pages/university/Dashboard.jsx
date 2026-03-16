import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  Star,
  TrendingUp,
  Award,
  DollarSign,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import api from "../../services/api";

export default function UniversityDashboard() {
  const { user } = useAuthStore();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get("/universities/analytics").then((r) => r.data.data),
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: () => api.get("/universities/students").then((r) => r.data.data),
  });

  const students = studentsData || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Universidad
          </h1>
          <p className="text-gray-500 mt-1">Vista general de la plataforma</p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              {
                label: "Estudiantes",
                value: analytics?.overview?.totalStudents || 0,
                icon: Users,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Tutores",
                value: analytics?.overview?.totalTutors || 0,
                icon: Award,
                color: "text-orange-600",
                bg: "bg-orange-50",
              },
              {
                label: "Sesiones",
                value: analytics?.overview?.totalSessions || 0,
                icon: BookOpen,
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                label: "Tasa completado",
                value: `${analytics?.overview?.completionRate || 0}%`,
                icon: TrendingUp,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                label: "Balance universitario",
                value: `$${analytics?.overview?.universityBalance?.toFixed(2) || "0.00"}`,
                icon: DollarSign,
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
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star size={16} className="text-orange-600" />
              Mejores tutores
            </h3>
            {analytics?.topTutors?.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No hay datos aún
              </p>
            ) : (
              <div className="space-y-3">
                {analytics?.topTutors?.map((tutor, i) => (
                  <div key={tutor.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-5">
                      {i + 1}
                    </span>
                    <div
                      className="w-8 h-8 rounded-full bg-orange-100 flex items-center
                    justify-center text-orange-600 font-bold text-sm"
                    >
                      {tutor.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">
                        {tutor.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {tutor.tutorProfile?.totalSessions} sesiones ·{" "}
                        {tutor.tutorProfile?.averageRating?.toFixed(1)} rating
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star
                        size={12}
                        className="text-yellow-400 fill-yellow-400"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {tutor.tutorProfile?.averageRating?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-orange-600" />
              Materias más solicitadas
            </h3>
            {analytics?.topSubjects?.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No hay datos aún
              </p>
            ) : (
              <div className="space-y-3">
                {analytics?.topSubjects?.map((subject, i) => (
                  <div key={subject.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-5">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">
                        {subject.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {subject.code} · {subject.area}
                      </p>
                    </div>
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                      {subject._count.sessions} sesiones
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-orange-600" />
              Sesiones recientes
            </h3>
            {analytics?.recentSessions?.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No hay sesiones aún
              </p>
            ) : (
              <div className="space-y-3">
                {analytics?.recentSessions?.slice(0, 5).map((session) => {
                  const [year, month, day] = session.date
                    .split("T")[0]
                    .split("-")
                    .map(Number);
                  const date = new Date(
                    year,
                    month - 1,
                    day,
                  ).toLocaleDateString("es-HN", {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center
                      justify-center text-gray-600 font-bold text-xs flex-shrink-0"
                      >
                        {session.student.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 truncate">
                          {session.student.name} → {session.tutor.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {session.subject.name} · {date}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0
                        ${
                          session.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : session.status === "confirmed"
                              ? "bg-blue-100 text-blue-700"
                              : session.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-orange-600" />
              Resumen de subsidios
            </h3>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Balance disponible
                </p>
                <p className="text-xs text-gray-400">Fondos para subsidios</p>
              </div>
              <span className="text-2xl font-bold text-green-600">
                ${analytics?.overview?.universityBalance?.toFixed(2) || "0.00"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Total subsidiado</span>
                <span className="font-semibold text-green-600">
                  $
                  {analytics?.overview?.totalSubsidiesAmount?.toFixed(2) ||
                    "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Total estudiantes</span>
                <span className="font-semibold text-gray-900">
                  {students.length}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">
                  Sesiones completadas
                </span>
                <span className="font-semibold text-gray-900">
                  {analytics?.overview?.completedSessions || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
