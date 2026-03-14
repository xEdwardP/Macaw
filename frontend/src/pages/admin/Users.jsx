import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Users, Shield, GraduationCap, BookOpen } from "lucide-react";
import api from "../../services/api";

const ROLE_CONFIG = {
  student: {
    label: "Estudiante",
    color: "bg-blue-100 text-blue-700",
    icon: BookOpen,
  },
  tutor: {
    label: "Tutor",
    color: "bg-orange-100 text-orange-700",
    icon: GraduationCap,
  },
  university: {
    label: "Universidad",
    color: "bg-purple-100 text-purple-700",
    icon: Users,
  },
  admin: { label: "Admin", color: "bg-red-100 text-red-700", icon: Shield },
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["all-students"],
    queryFn: () => api.get("/universities/students").then((r) => r.data.data),
  });

  const { data: tutors, isLoading: loadingTutors } = useQuery({
    queryKey: ["all-tutors"],
    queryFn: () => api.get("/tutors").then((r) => r.data.data),
  });

  const allUsers = [
    ...(students || []).map((s) => ({ ...s, role: "student" })),
    ...(tutors || []).map((t) => ({ ...t, role: "tutor" })),
  ];

  const filtered = allUsers.filter((u) => {
    const matchSearch = search
      ? u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchRole = role === "all" ? true : u.role === role;
    return matchSearch && matchRole;
  });

  const isLoading = loadingStudents || loadingTutors;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Usuarios</h1>
        <p className="text-gray-500 mb-8">
          Todos los usuarios registrados en la plataforma
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: allUsers.length, color: "text-gray-900" },
            {
              label: "Estudiantes",
              value: allUsers.filter((u) => u.role === "student").length,
              color: "text-blue-600",
            },
            {
              label: "Tutores",
              value: allUsers.filter((u) => u.role === "tutor").length,
              color: "text-orange-600",
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

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
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
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl bg-white
            focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
          >
            <option value="all">Todos los roles</option>
            <option value="student">Estudiantes</option>
            <option value="tutor">Tutores</option>
          </select>
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">
              No se encontraron usuarios
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((user, i) => {
              const config = ROLE_CONFIG[user.role];
              const Icon = config.icon;
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full bg-gray-100 flex items-center
                    justify-center text-gray-600 font-bold flex-shrink-0"
                    >
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-medium text-gray-900">
                          {user.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.career && (
                        <p className="text-xs text-gray-400">{user.career}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {user.role === "student" && (
                        <div className="text-right">
                          <p className="font-semibold text-orange-600">
                            ${user.wallet?.balance?.toFixed(2) || "0.00"}
                          </p>
                          <p className="text-xs text-gray-400">saldo</p>
                        </div>
                      )}
                      {user.role === "tutor" && (
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {user.tutorProfile?.averageRating?.toFixed(1) ||
                              "0.0"}
                          </p>
                          <p className="text-xs text-gray-400">rating</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
