import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

function FacultyModal({ faculty, onClose, onSubmit, isPending }) {
  const [name, setName] = useState(faculty?.name || "");
  const [code, setCode] = useState(faculty?.code || "");

  const handleSubmit = () => {
    if (!name.trim() || !code.trim())
      return toast.error("Nombre y código son requeridos");
    onSubmit({ name, code });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            {faculty ? "Editar facultad" : "Nueva facultad"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Ingeniería y Arquitectura"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: ING"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {isPending
              ? "Guardando..."
              : faculty
                ? "Guardar cambios"
                : "Crear facultad"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteModal({ faculty, onClose, onConfirm, isPending }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Eliminar facultad</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-13">
          ¿Estás seguro que deseas eliminar{" "}
          <span className="font-medium text-gray-700">"{faculty.name}"</span>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {isPending ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function UniversityFaculties() {
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [subjectPage, setSubjectPage] = useState(1);
  const limit = 8;
  const subjectLimit = 8;
  const queryClient = useQueryClient();

  const { data: facultiesData, isLoading } = useQuery({
    queryKey: ["faculties", page],
    queryFn: async () => {
      const r = await api.get("/universities/faculties", {
        params: { page, limit },
      });
      return r.data.data;
    },
  });

  const { data: subjectsData = [] } = useQuery({
    queryKey: ["faculty-subjects", selected, subjectPage],
    queryFn: async () => {
      const r = await api.get(`/universities/faculties/${selected}/subjects`, {
        params: { page: subjectPage, limit: subjectLimit },
      });
      return r.data.data;
    },
    enabled: !!selected,
  });

  const faculties = facultiesData?.data || facultiesData || [];
  const totalFaculties = facultiesData?.total || faculties.length;
  const totalFacultyPages = facultiesData?.totalPages || 1;
  const fromF = totalFaculties === 0 ? 0 : (page - 1) * limit + 1;
  const toF = Math.min(page * limit, totalFaculties);

  const subjects = subjectsData?.data || subjectsData || [];
  const totalSubjects = subjectsData?.total || subjects.length;
  const totalSubjectPages = subjectsData?.totalPages || 1;
  const fromS = totalSubjects === 0 ? 0 : (subjectPage - 1) * subjectLimit + 1;
  const toS = Math.min(subjectPage * subjectLimit, totalSubjects);

  const { mutate: createFaculty, isPending: isCreating } = useMutation({
    mutationFn: async (data) => api.post("/universities/faculties", data),
    onSuccess: () => {
      toast.success("Facultad creada");
      setModal(null);
      queryClient.invalidateQueries(["faculties"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al crear"),
  });

  const { mutate: updateFaculty, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }) =>
      api.put(`/universities/faculties/${id}`, data),
    onSuccess: () => {
      toast.success("Facultad actualizada");
      setModal(null);
      queryClient.invalidateQueries(["faculties"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al actualizar"),
  });

  const { mutate: deleteFaculty, isPending: isDeleting } = useMutation({
    mutationFn: async (id) => api.delete(`/universities/faculties/${id}`),
    onSuccess: () => {
      toast.success("Facultad eliminada");
      setSelected(null);
      setModal(null);
      queryClient.invalidateQueries(["faculties"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al eliminar"),
  });

  const selectedFaculty = faculties.find((f) => f.id === selected);

  const handleSelectFaculty = (id) => {
    setSelected(id);
    setSubjectPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Facultades</h1>
            <p className="text-gray-500 mt-1">
              Gestiona las facultades de tu universidad
            </p>
          </div>
          <button
            onClick={() => setModal({ type: "create" })}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Nueva facultad
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Facultades</h2>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : faculties.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="mx-auto text-gray-300 mb-3" size={40} />
                <p className="text-gray-500 text-sm">
                  No hay facultades registradas
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Crea la primera para comenzar
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50 flex-1">
                  {faculties.map((faculty, i) => (
                    <motion.div
                      key={faculty.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => handleSelectFaculty(faculty.id)}
                      className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors
                        ${selected === faculty.id ? "bg-orange-50 border-l-2 border-orange-600" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {faculty.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {faculty.code} · {faculty._count?.subjects || 0}{" "}
                          materias
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ type: "edit", faculty });
                          }}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ type: "delete", faculty });
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {totalFacultyPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      {fromF}-{toF} de {totalFaculties}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs text-gray-500">
                        {page} / {totalFacultyPages}
                      </span>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(p + 1, totalFacultyPages))
                        }
                        disabled={page === totalFacultyPages}
                        className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {selectedFaculty
                  ? `Materias — ${selectedFaculty.name}`
                  : "Materias"}
              </h2>
            </div>

            {!selected ? (
              <div className="text-center py-16">
                <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
                <p className="text-gray-500 text-sm">Selecciona una facultad</p>
                <p className="text-gray-400 text-xs mt-1">
                  para ver sus materias
                </p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
                <p className="text-gray-500 text-sm">Sin materias asignadas</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50 flex-1">
                  {subjects.map((subject, i) => (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-4"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {subject.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {subject.code}
                          {subject.quarter
                            ? ` · Trimestre ${subject.quarter}`
                            : ""}
                          {subject.credits
                            ? ` · ${subject.credits} créditos`
                            : ""}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {totalSubjectPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      {fromS}-{toS} de {totalSubjects}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setSubjectPage((p) => Math.max(p - 1, 1))
                        }
                        disabled={subjectPage === 1}
                        className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs text-gray-500">
                        {subjectPage} / {totalSubjectPages}
                      </span>
                      <button
                        onClick={() =>
                          setSubjectPage((p) =>
                            Math.min(p + 1, totalSubjectPages),
                          )
                        }
                        disabled={subjectPage === totalSubjectPages}
                        className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modal?.type === "create" && (
          <FacultyModal
            onClose={() => setModal(null)}
            onSubmit={(data) => createFaculty(data)}
            isPending={isCreating}
          />
        )}
        {modal?.type === "edit" && (
          <FacultyModal
            faculty={modal.faculty}
            onClose={() => setModal(null)}
            onSubmit={(data) => updateFaculty({ id: modal.faculty.id, data })}
            isPending={isUpdating}
          />
        )}
        {modal?.type === "delete" && (
          <DeleteModal
            faculty={modal.faculty}
            onClose={() => setModal(null)}
            onConfirm={() => deleteFaculty(modal.faculty.id)}
            isPending={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
