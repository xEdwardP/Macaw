import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

function SubjectModal({ subject, faculties, onClose, onSubmit, isPending }) {
  const existingFacultyId = subject?.isGeneral
    ? "general"
    : subject?.faculties?.[0]?.facultyId || "";

  const [form, setForm] = useState({
    name: subject?.name || "",
    code: subject?.code || "",
    quarter: subject?.quarter || "",
    credits: subject?.credits || "",
    facultyId: existingFacultyId,
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.code.trim())
      return toast.error("Nombre y código son requeridos");
    if (!form.facultyId) return toast.error("Selecciona una facultad");
    onSubmit({
      name: form.name,
      code: form.code,
      quarter: form.quarter ? parseInt(form.quarter) : null,
      credits: form.credits ? parseInt(form.credits) : null,
      isGeneral: form.facultyId === "general",
      facultyId: form.facultyId === "general" ? null : form.facultyId,
    });
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
            {subject ? "Editar materia" : "Nueva materia"}
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
              value={form.name}
              onChange={set("name")}
              placeholder="Ej: Cálculo I"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código
            </label>
            <input
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              placeholder="Ej: MAT-101"
              disabled={!!subject}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facultad
            </label>
            <select
              value={form.facultyId}
              onChange={set("facultyId")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white"
            >
              <option value="">Selecciona una facultad</option>
              <option value="general">Todas las facultades (General)</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trimestre
              </label>
              <input
                type="number"
                value={form.quarter}
                onChange={set("quarter")}
                placeholder="Ej: 1"
                min={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Créditos
              </label>
              <input
                type="number"
                value={form.credits}
                onChange={set("credits")}
                placeholder="Ej: 4"
                min={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>
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
              : subject
                ? "Guardar cambios"
                : "Crear materia"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteModal({ subject, onClose, onConfirm, isPending }) {
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
          <h3 className="text-lg font-bold text-gray-900">Eliminar materia</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          ¿Estás seguro que deseas eliminar{" "}
          <span className="font-medium text-gray-700">"{subject.name}"</span>?
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

export default function UniversitySubjects() {
  const [modal, setModal] = useState(null);
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryClient = useQueryClient();

  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ["subjects", page, facultyFilter, search],
    queryFn: async () => {
      const params = { page, limit };
      if (facultyFilter !== "all") params.facultyId = facultyFilter;
      if (search) params.search = search;
      const r = await api.get("/universities/subjects", { params });
      return r.data.data;
    },
  });

  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties-all"],
    queryFn: async () => {
      const r = await api.get("/universities/faculties", {
        params: { limit: 100 },
      });
      return r.data.data.data;
    },
  });

  const subjects = subjectsData?.data || [];
  const total = subjectsData?.total || 0;
  const totalPages = subjectsData?.totalPages || 1;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const handleFilterChange = (id) => {
    setFacultyFilter(id);
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const { mutate: createSubject, isPending: isCreating } = useMutation({
    mutationFn: async (data) => api.post("/universities/subjects", data),
    onSuccess: () => {
      toast.success("Materia creada");
      setModal(null);
      queryClient.invalidateQueries(["subjects"]);
      queryClient.invalidateQueries(["faculties"]);
      queryClient.invalidateQueries(["faculties-all"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al crear"),
  });

  const { mutate: updateSubject, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }) =>
      api.put(`/universities/subjects/${id}`, data),
    onSuccess: () => {
      toast.success("Materia actualizada");
      setModal(null);
      queryClient.invalidateQueries(["subjects"]);
      queryClient.invalidateQueries(["faculties"]);
      queryClient.invalidateQueries(["faculties-all"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al actualizar"),
  });

  const { mutate: deleteSubject, isPending: isDeleting } = useMutation({
    mutationFn: async (id) => api.delete(`/universities/subjects/${id}`),
    onSuccess: () => {
      toast.success("Materia eliminada");
      setModal(null);
      queryClient.invalidateQueries(["subjects"]);
      queryClient.invalidateQueries(["faculties"]);
      queryClient.invalidateQueries(["faculties-all"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al eliminar"),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Materias</h1>
            <p className="text-gray-500 mt-1">
              Gestiona las materias de tu universidad
            </p>
          </div>
          <button
            onClick={() => setModal({ type: "create" })}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Nueva materia
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
          >
            Buscar
          </button>
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors"
            >
              Limpiar
            </button>
          )}
        </form>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${facultyFilter === "all" ? "bg-orange-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"}`}
          >
            Todas
          </button>
          {faculties.map((f) => (
            <button
              key={f.id}
              onClick={() => handleFilterChange(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${facultyFilter === f.id ? "bg-orange-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"}`}
            >
              {f.code}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 animate-pulse h-16"
              />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">
              No hay materias
            </h3>
            <p className="text-gray-500 mt-1 text-sm">
              {search
                ? `Sin resultados para "${search}"`
                : "Crea la primera materia para comenzar"}
            </p>
            {search && (
              <button
                onClick={handleClearSearch}
                className="mt-3 text-sm text-orange-600 hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {subjects.map((subject, i) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {subject.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {subject.code}
                      {subject.quarter ? ` · Trimestre ${subject.quarter}` : ""}
                      {subject.credits ? ` · ${subject.credits} créditos` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setModal({ type: "edit", subject })}
                      className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setModal({ type: "delete", subject })}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Mostrando {from}-{to} de {total} materias
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

      <AnimatePresence>
        {modal?.type === "create" && (
          <SubjectModal
            faculties={faculties}
            onClose={() => setModal(null)}
            onSubmit={(data) => createSubject(data)}
            isPending={isCreating}
          />
        )}
        {modal?.type === "edit" && (
          <SubjectModal
            subject={modal.subject}
            faculties={faculties}
            onClose={() => setModal(null)}
            onSubmit={(data) => updateSubject({ id: modal.subject.id, data })}
            isPending={isUpdating}
          />
        )}
        {modal?.type === "delete" && (
          <DeleteModal
            subject={modal.subject}
            onClose={() => setModal(null)}
            onConfirm={() => deleteSubject(modal.subject.id)}
            isPending={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
