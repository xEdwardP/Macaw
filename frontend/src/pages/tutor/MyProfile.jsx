import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  Star,
  BookOpen,
  Clock,
  Plus,
  X,
  Save,
  Building,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { tutorsService } from "../../services/tutors.service";
import { useAuthStore } from "../../store/authStore";
import api from "../../services/api";

const DAYS = [
  "",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const HOURS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];
const PAGE_SIZE = 12;

export default function TutorMyProfile() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  const [filterFaculty, setFilterFaculty] = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [subjectPage, setSubjectPage] = useState(1);

  const { data: tutor, isLoading } = useQuery({
    queryKey: ["tutor", user?.id],
    queryFn: () => tutorsService.getOne(user?.id).then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: ["subjects-all"],
    queryFn: () =>
      api
        .get("/universities/subjects", { params: { limit: 1000 } })
        .then((r) => r.data.data.data),
  });

  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties-all"],
    queryFn: () =>
      api
        .get("/universities/faculties", { params: { limit: 100 } })
        .then((r) => r.data.data.data),
  });

  const { register: regProfile, handleSubmit: submitProfile } = useForm({
    values: {
      bio: tutor?.tutorProfile?.bio || "",
      hourlyRate: tutor?.tutorProfile?.hourlyRate || 8,
    },
  });

  const [availability, setAvailability] = useState([]);

  useEffect(() => {
    if (tutor?.tutorProfile?.availability) {
      setAvailability(
        tutor.tutorProfile.availability.map((slot, i) => ({
          ...slot,
          _key: `${slot.dayOfWeek}-${slot.startTime}-${i}`,
        })),
      );
    }
  }, [tutor]);

  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "17:00",
  });

  const { mutate: updateProfile, isPending: savingProfile } = useMutation({
    mutationFn: (data) => tutorsService.updateProfile(data),
    onSuccess: () => {
      toast.success("Perfil actualizado");
      queryClient.invalidateQueries(["tutor", user?.id]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al actualizar"),
  });

  const { mutate: addSubject } = useMutation({
    mutationFn: (data) => tutorsService.addSubject(data),
    onSuccess: () => {
      toast.success("Materia agregada");
      queryClient.invalidateQueries(["tutor", user?.id]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al agregar materia"),
  });

  const { mutate: removeSubject } = useMutation({
    mutationFn: (id) => tutorsService.removeSubject(id),
    onSuccess: () => {
      toast.success("Materia eliminada");
      queryClient.invalidateQueries(["tutor", user?.id]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error al eliminar materia"),
  });

  const { mutate: saveAvailability, isPending: savingAvailability } =
    useMutation({
      mutationFn: (slots) =>
        tutorsService.setAvailability(
          slots.map(({ _key, ...slot }) => slot),
        ),
      onSuccess: () => {
        toast.success("Disponibilidad actualizada");
        queryClient.invalidateQueries(["tutor", user?.id]);
      },
      onError: (err) =>
        toast.error(
          err.response?.data?.message || "Error al guardar disponibilidad",
        ),
    });

  const addSlot = () => {
    if (newSlot.startTime >= newSlot.endTime) {
      toast.error("La hora de inicio debe ser anterior a la hora de fin");
      return;
    }
    const sameDay = availability.filter(
      (s) => s.dayOfWeek === newSlot.dayOfWeek,
    );
    const hasOverlap = sameDay.some(
      (s) => newSlot.startTime < s.endTime && newSlot.endTime > s.startTime,
    );
    if (hasOverlap) {
      toast.error("Este bloque se traslapa con otro horario del mismo día");
      return;
    }
    const _key = `${newSlot.dayOfWeek}-${newSlot.startTime}-${Date.now()}`;
    setAvailability([...availability, { ...newSlot, _key }]);
  };

  const removeSlot = (_key) =>
    setAvailability(availability.filter((s) => s._key !== _key));

  const existingSubjectIds =
    tutor?.tutorProfile?.subjects?.map((s) => s.subject.id) || [];

  const filteredSubjects = useMemo(() => {
    return (allSubjects || []).filter((s) => {
      if (existingSubjectIds.includes(s.id)) return false;
      if (filterFaculty === "general") {
        if (!s.isGeneral) return false;
      } else if (filterFaculty) {
        const belongsToFaculty = (s.faculties || []).some(
          (f) => f.facultyId === filterFaculty,
        );
        if (!belongsToFaculty) return false;
      }
      if (filterQuarter && s.quarter !== parseInt(filterQuarter)) return false;
      if (
        filterSearch &&
        !s.name.toLowerCase().includes(filterSearch.toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    allSubjects,
    existingSubjectIds,
    filterFaculty,
    filterQuarter,
    filterSearch,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubjects.length / PAGE_SIZE),
  );
  const pagedSubjects = filteredSubjects.slice(
    (subjectPage - 1) * PAGE_SIZE,
    subjectPage * PAGE_SIZE,
  );
  const resetPage = () => setSubjectPage(1);

  const quarterOptions = useMemo(
    () =>
      [...new Set((allSubjects || []).map((s) => s.quarter))]
        .filter(Boolean)
        .sort((a, b) => a - b),
    [allSubjects],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-2xl">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-gray-500 text-sm">{user?.career}</p>
              {tutor?.faculty && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Building size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {tutor.faculty.name}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {tutor?.tutorProfile?.averageRating?.toFixed(1) || "0.0"}
                  </span>
                </div>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-500">
                  {tutor?.tutorProfile?.totalSessions || 0} sesiones
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: "profile", label: "Perfil" },
            { key: "subjects", label: "Materias" },
            { key: "availability", label: "Disponibilidad" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-orange-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">
              Información del perfil
            </h3>
            <form onSubmit={submitProfile(updateProfile)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Biografía
                </label>
                <textarea
                  {...regProfile("bio")}
                  rows={4}
                  placeholder="Cuéntale a los estudiantes sobre ti, tu experiencia y metodología..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio por hora (USD)
                </label>
                <input
                  {...regProfile("hourlyRate")}
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <Save size={16} />
                {savingProfile ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </motion.div>
        )}

        {activeTab === "subjects" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-orange-600" />
                Mis materias ({tutor?.tutorProfile?.subjects?.length || 0})
              </h3>
              {!tutor?.tutorProfile?.subjects?.length ? (
                <p className="text-sm text-gray-400">
                  No tienes materias agregadas aún
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tutor.tutorProfile.subjects.map((s) => (
                    <div
                      key={s.subject.id}
                      className="flex items-center gap-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full"
                    >
                      <span className="text-sm text-orange-700">
                        {s.subject.name}
                      </span>
                      <button
                        onClick={() => removeSubject(s.subject.id)}
                        className="text-orange-400 hover:text-orange-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Agregar materia
              </h3>
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={filterSearch}
                    onChange={(e) => {
                      setFilterSearch(e.target.value);
                      resetPage();
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Facultad
                    </label>
                    <select
                      value={filterFaculty}
                      onChange={(e) => {
                        setFilterFaculty(e.target.value);
                        resetPage();
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    >
                      <option value="">Todas</option>
                      <option value="general">Materias generales</option>
                      {faculties.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Trimestre
                    </label>
                    <select
                      value={filterQuarter}
                      onChange={(e) => {
                        setFilterQuarter(e.target.value);
                        resetPage();
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    >
                      <option value="">Todos</option>
                      {quarterOptions.map((q) => (
                        <option key={q} value={q}>
                          Trimestre {q}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400">
                  {filteredSubjects.length} materia
                  {filteredSubjects.length !== 1 ? "s" : ""}
                </p>
                {(filterFaculty || filterQuarter || filterSearch) && (
                  <button
                    onClick={() => {
                      setFilterFaculty("");
                      setFilterQuarter("");
                      setFilterSearch("");
                      resetPage();
                    }}
                    className="text-xs text-orange-500 hover:text-orange-700 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              {pagedSubjects.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  No hay materias con esos filtros
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {pagedSubjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() =>
                        addSubject({
                          subjectId: subject.id,
                          level: "intermediate",
                        })
                      }
                      className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
                    >
                      <Plus
                        size={14}
                        className="text-orange-600 flex-shrink-0 mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 leading-tight truncate">
                          {subject.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {subject.quarter ? `Trim. ${subject.quarter}` : ""}
                          {subject.credits ? ` · ${subject.credits} cr.` : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setSubjectPage((p) => Math.max(1, p - 1))}
                    disabled={subjectPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <span className="text-xs text-gray-500">
                    Página {subjectPage} de {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setSubjectPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={subjectPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "availability" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-orange-600" />
                Horarios actuales
              </h3>
              {availability.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No tienes horarios definidos
                </p>
              ) : (
                <div className="space-y-2">
                  {availability
                    .slice()
                    .sort((a, b) =>
                      a.dayOfWeek !== b.dayOfWeek
                        ? a.dayOfWeek - b.dayOfWeek
                        : a.startTime.localeCompare(b.startTime),
                    )
                    .map((slot) => (
                      <div
                        key={slot._key}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 w-24">
                            {DAYS[slot.dayOfWeek]}
                          </span>
                          <span className="text-sm text-gray-500">
                            {slot.startTime} — {slot.endTime}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSlot(slot._key)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Agregar horario
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Día
                  </label>
                  <select
                    value={newSlot.dayOfWeek}
                    onChange={(e) =>
                      setNewSlot({
                        ...newSlot,
                        dayOfWeek: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  >
                    {DAYS.slice(1).map((day, i) => (
                      <option key={i + 1} value={i + 1}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Inicio
                  </label>
                  <select
                    value={newSlot.startTime}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, startTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fin
                  </label>
                  <select
                    value={newSlot.endTime}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, endTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={addSlot}
                className="flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium"
              >
                <Plus size={16} /> Agregar horario
              </button>
            </div>

            <button
              onClick={() => saveAvailability(availability)}
              disabled={savingAvailability}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {savingAvailability ? "Guardando..." : "Guardar disponibilidad"}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
