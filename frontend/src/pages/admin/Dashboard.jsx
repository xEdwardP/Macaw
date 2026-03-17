// frontend/src/pages/admin/AdminDashboard.jsx
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
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get("/universities/analytics").then((r) => r.data.data),
  });

  const { data: students, isLoading: isStudentsLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => api.get("/universities/students").then((r) => r.data.data),
  });

  const { data: earnings, isLoading: isEarningsLoading } = useQuery({
    queryKey: ["platform-earnings"],
    queryFn: () =>
      api.get("/universities/platform-earnings").then((r) => r.data.data),
  });

  const loadingSkeleton = (
    <div className="animate-pulse bg-gray-100 h-8 w-full rounded"></div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield size={28} className="text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Panel de administración
            </h1>
          </div>
          <p className="text-gray-500">
            Vista global de la plataforma Macaw
          </p>
        </motion.div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            {
              label: "Estudiantes",
              value: analytics?.overview?.totalStudents || 0,
              icon: Users,
              color: "text-blue-600",
              bg: "bg-blue-50",
              loading: isAnalyticsLoading,
            },
            {
              label: "Tutores",
              value: analytics?.overview?.totalTutors || 0,
              icon: Award,
              color: "text-orange-600",
              bg: "bg-orange-50",
              loading: isAnalyticsLoading,
            },
            {
              label: "Sesiones totales",
              value: analytics?.overview?.totalSessions || 0,
              icon: BookOpen,
              color: "text-green-600",
              bg: "bg-green-50",
              loading: isAnalyticsLoading,
            },
            {
              label: "Total subsidiado",
              value: `$${analytics?.overview?.totalSubsidiesAmount?.toFixed(
                2
              ) || "0.00"}`,
              icon: DollarSign,
              color: "text-purple-600",
              bg: "bg-purple-50",
              loading: isAnalyticsLoading,
            },
            {
              label: "Ganancias plataforma",
              value: `$${earnings?.balance?.toFixed(2) || "0.00"}`,
              icon: TrendingUp,
              color: "text-green-600",
              bg: "bg-green-50",
              loading: isEarningsLoading,
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
                {stat.loading ? loadingSkeleton : stat.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Tutors */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star size={16} className="text-orange-600" />
              Mejores tutores
            </h3>
            <div className="space-y-3">
              {isAnalyticsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 animate-pulse"
                    >
                      <div className="w-5 h-5 bg-gray-200 rounded"></div>
                      <div className="w-8 h-8 rounded-full bg-orange-100"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))
                : analytics?.topTutors?.map((tutor, i) => (
                    <div key={tutor.id} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400 w-5">
                        {i + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                        {tutor.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">
                          {tutor.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {tutor.tutorProfile?.totalSessions} sesiones
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium">
                          {tutor.tutorProfile?.averageRating?.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Top Subjects */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-orange-600" />
              Materias más solicitadas
            </h3>
            <div className="space-y-3">
              {isAnalyticsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-5 h-5 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                      </div>
                      <div className="h-4 w-12 bg-gray-100 rounded"></div>
                    </div>
                  ))
                : analytics?.topSubjects?.map((subject, i) => (
                    <div key={subject.id} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400 w-5">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">
                          {subject.name}
                        </p>
                        <p className="text-xs text-gray-400">{subject.area}</p>
                      </div>
                      <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                        {subject._count.sessions} sesiones
                      </span>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}