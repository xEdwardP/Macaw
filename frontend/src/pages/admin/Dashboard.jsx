import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  TrendingUp,
  DollarSign,
  Award,
  Star,
  Shield,
} from "lucide-react";
import api from "../../services/api";

export default function AdminDashboard() {
  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get("/universities/analytics").then((r) => r.data.data),
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: () => api.get("/universities/students").then((r) => r.data.data),
  });

  const { data: earnings } = useQuery({
    queryKey: ["platform-earnings"],
    queryFn: () =>
      api.get("/universities/platform-earnings").then((r) => r.data.data),
  });

  const students = studentsData?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield size={28} className="text-orange-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Panel de administración
            </h1>
          </div>
          <p className="text-gray-500">Vista global de la plataforma Macaw</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
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
              label: "Sesiones totales",
              value: analytics?.overview?.totalSessions || 0,
              icon: BookOpen,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "Total subsidiado",
              value: `$${analytics?.overview?.totalSubsidiesAmount?.toFixed(2) || "0.00"}`,
              icon: DollarSign,
              color: "text-purple-600",
              bg: "bg-purple-50",
            },
            {
              label: "Ganancias plataforma",
              value: `$${earnings?.balance?.toFixed(2) || "0.00"}`,
              icon: TrendingUp,
              color: "text-green-600",
              bg: "bg-green-50",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5"
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-3 ${stat.bg}`}
              >
                <stat.icon size={18} className={stat.color} />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-gray-900 break-all leading-tight">
                {stat.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star size={16} className="text-orange-600" />
              Mejores tutores
            </h3>
            {!analytics?.topTutors?.length ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No hay datos aún
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.topTutors.map((tutor, i) => (
                  <div key={tutor.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-5 flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm flex-shrink-0">
                      {tutor.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {tutor.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {tutor.tutorProfile?.totalSessions} sesiones
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star
                        size={12}
                        className="text-yellow-400 fill-yellow-400"
                      />
                      <span className="text-sm font-medium">
                        {tutor.tutorProfile?.averageRating?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-orange-600" />
              Materias más solicitadas
            </h3>
            {!analytics?.topSubjects?.length ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No hay datos aún
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.topSubjects.map((subject, i) => (
                  <div key={subject.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-5 flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {subject.name}
                      </p>
                      <p className="text-xs text-gray-400">{subject.code}</p>
                    </div>
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full flex-shrink-0">
                      {subject._count.sessions} sesiones
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={16} className="text-orange-600" />
              Estudiantes registrados
            </h3>
            {!students.length ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No hay estudiantes aún
              </p>
            ) : (
              <div className="space-y-3">
                {students.slice(0, 6).map((student) => (
                  <div key={student.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {student.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {student.career}
                      </p>
                    </div>
                    <span className="text-xs text-green-600 font-medium flex-shrink-0">
                      ${student.wallet?.balance?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-orange-600" />
              Resumen de la plataforma
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Sesiones completadas",
                  value: analytics?.overview?.completedSessions || 0,
                },
                {
                  label: "Sesiones canceladas",
                  value: analytics?.overview?.cancelledSessions || 0,
                },
                {
                  label: "Tasa de completado",
                  value: `${analytics?.overview?.completionRate || 0}%`,
                },
                {
                  label: "Total subsidiado",
                  value: `$${analytics?.overview?.totalSubsidiesAmount?.toFixed(2) || "0.00"}`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 gap-3"
                >
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="font-semibold text-gray-900 break-all text-right">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6 lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-600" />
              Ganancias de la plataforma
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-50 gap-3">
                  <span className="text-sm text-gray-500">Saldo actual</span>
                  <span className="font-semibold text-green-600 break-all text-right">
                    ${earnings?.balance?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50 gap-3">
                  <span className="text-sm text-gray-500">Total histórico</span>
                  <span className="font-semibold text-gray-900 break-all text-right">
                    ${earnings?.lifetimeEarned?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-500">
                    Comisión por sesión
                  </span>
                  <span className="font-semibold text-gray-900">10%</span>
                </div>
              </div>

              {earnings?.transactions?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-3">
                    Últimas comisiones
                  </p>
                  <div className="space-y-2">
                    {earnings.transactions.slice(0, 5).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex justify-between items-center text-sm gap-3"
                      >
                        <span className="text-gray-500 text-xs">
                          {new Date(tx.createdAt).toLocaleDateString("es-HN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="font-medium text-green-600">
                          +${tx.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
