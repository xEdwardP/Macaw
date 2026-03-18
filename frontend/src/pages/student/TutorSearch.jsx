import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  Star,
  BookOpen,
  Clock,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { tutorsService } from "../../services/tutors.service";
import { universitiesService } from "../../services/universities.service";

export default function TutorSearch() {
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 9;

  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties-all"],
    queryFn: () =>
      universitiesService
        .getFaculties({ limit: 100 })
        .then((r) => r.data.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["tutors", search, minRating, maxRate, facultyId, page],
    queryFn: () =>
      tutorsService
        .getAll({ search, minRating, maxRate, facultyId, page, limit })
        .then((r) => r.data.data),
  });

  const tutors = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const handleFilterChange = (fn) => {
    fn();
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Encontrar tutor
          </h1>
          <p className="text-gray-500">
            Conecta con los mejores tutores de tu universidad
          </p>

          <div className="flex gap-3 mt-6">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar por nombre o carrera..."
                value={search}
                onChange={(e) =>
                  handleFilterChange(() => setSearch(e.target.value))
                }
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all
              ${showFilters ? "bg-orange-600 text-white border-orange-600" : "bg-white text-gray-700 border-gray-300 hover:border-orange-400"}`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:block">Filtros</span>
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-4 mt-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facultad
                </label>
                <select
                  value={facultyId}
                  onChange={(e) =>
                    handleFilterChange(() => setFacultyId(e.target.value))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="">Todas las facultades</option>
                  {(faculties || []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating mínimo
                </label>
                <select
                  value={minRating}
                  onChange={(e) =>
                    handleFilterChange(() => setMinRating(e.target.value))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="">Cualquiera</option>
                  <option value="4">4+ estrellas</option>
                  <option value="4.5">4.5+ estrellas</option>
                  <option value="5">5 estrellas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio máximo por hora
                </label>
                <select
                  value={maxRate}
                  onChange={(e) =>
                    handleFilterChange(() => setMaxRate(e.target.value))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="">Cualquiera</option>
                  <option value="5">Hasta $5</option>
                  <option value="10">Hasta $10</option>
                  <option value="15">Hasta $15</option>
                  <option value="20">Hasta $20</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() =>
                    handleFilterChange(() => {
                      setSearch("");
                      setMinRating("");
                      setMaxRate("");
                      setFacultyId("");
                    })
                  }
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Limpiar filtros
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : tutors.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">
              No se encontraron tutores
            </h3>
            <p className="text-gray-500 mt-1">
              Intenta con otros filtros de búsqueda
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {total} tutor{total !== 1 ? "es" : ""} encontrado
              {total !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutors.map((tutor, i) => (
                <motion.div
                  key={tutor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/tutors/${tutor.id}`}
                    className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all p-6"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl flex-shrink-0">
                        {tutor.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {tutor.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {tutor.career}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <Star
                          className="text-yellow-400 fill-yellow-400"
                          size={16}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {tutor.tutorProfile?.averageRating?.toFixed(1) ||
                            "0.0"}
                        </span>
                        <span className="text-sm text-gray-400">
                          ({tutor.tutorProfile?.totalSessions || 0} sesiones)
                        </span>
                      </div>
                      <span className="text-orange-600 font-semibold text-sm">
                        ${tutor.tutorProfile?.hourlyRate}/hr
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {tutor.tutorProfile?.subjects?.slice(0, 3).map((s) => (
                        <span
                          key={s.subject.id}
                          className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full border border-orange-100"
                        >
                          {s.subject.name}
                        </span>
                      ))}
                      {tutor.tutorProfile?.subjects?.length > 3 && (
                        <span className="text-xs text-gray-400 px-2 py-1">
                          +{tutor.tutorProfile.subjects.length - 3} más
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        {tutor.tutorProfile?.availability?.length > 0
                          ? "Disponible esta semana"
                          : "Sin horarios definidos"}
                      </div>
                      <div className="flex items-center gap-1 text-orange-600 text-sm font-medium">
                        Ver perfil
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-3">
              <p className="text-sm text-gray-500">
                Mostrando {from}-{to} de {total} tutores
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
    </div>
  );
}
