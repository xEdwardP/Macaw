import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Star, BookOpen, Clock, Plus, X, Save } from "lucide-react";
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

export default function TutorMyProfile() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: tutor, isLoading } = useQuery({
    queryKey: ["tutor", user?.id],
    queryFn: () => tutorsService.getOne(user?.id).then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api.get("/universities/subjects").then((r) => r.data.data),
  });

  const { register: regProfile, handleSubmit: submitProfile } = useForm({
    values: {
      bio: tutor?.tutorProfile?.bio || "",
      hourlyRate: tutor?.tutorProfile?.hourlyRate || 8,
    },
  });

  const [availability, setAvailability] = useState(
    tutor?.tutorProfile?.availability || [],
  );
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
      mutationFn: (slots) => tutorsService.setAvailability(slots),
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
    const exists = availability.find((s) => s.dayOfWeek === newSlot.dayOfWeek);
    if (exists) {
      toast.error("Ya tienes un horario para ese día");
      return;
    }
    setAvailability([...availability, { ...newSlot }]);
  };

  const removeSlot = (dayOfWeek) => {
    setAvailability(availability.filter((s) => s.dayOfWeek !== dayOfWeek));
  };

  const existingSubjectIds =
    tutor?.tutorProfile?.subjects?.map((s) => s.subject.id) || [];
  const availableSubjects = (subjects || []).filter(
    (s) => !existingSubjectIds.includes(s.id),
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
            <div
              className="w-16 h-16 rounded-full bg-orange-100 flex items-center
            justify-center text-orange-600 font-bold text-2xl"
            >
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-gray-500 text-sm">{user?.career}</p>
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-6 py-2 bg-orange-600
                hover:bg-orange-700 text-white rounded-lg transition-colors
                disabled:opacity-50 text-sm font-medium"
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
                Mis materias
              </h3>
              {tutor?.tutorProfile?.subjects?.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No tienes materias agregadas aún
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tutor?.tutorProfile?.subjects?.map((s) => (
                    <div
                      key={s.subject.id}
                      className="flex items-center gap-2 bg-orange-50 border
                      border-orange-100 px-3 py-1.5 rounded-full"
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
              {availableSubjects.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Ya tienes todas las materias disponibles
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableSubjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() =>
                        addSubject({
                          subjectId: subject.id,
                          level: "intermediate",
                        })
                      }
                      className="flex items-center gap-2 p-3 border border-gray-200
                      rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
                    >
                      <Plus
                        size={14}
                        className="text-orange-600 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {subject.name}
                        </p>
                        <p className="text-xs text-gray-400">{subject.area}</p>
                      </div>
                    </button>
                  ))}
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
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                    .map((slot) => (
                      <div
                        key={slot.dayOfWeek}
                        className="flex items-center justify-between p-3
                      bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 w-24">
                            {DAYS[slot.dayOfWeek]}
                          </span>
                          <span className="text-sm text-gray-500">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSlot(slot.dayOfWeek)}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
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
                className="flex items-center gap-2 px-4 py-2 border border-orange-300
                text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                Agregar horario
              </button>
            </div>

            <button
              onClick={() => saveAvailability(availability)}
              disabled={savingAvailability}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white
              font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center
              justify-center gap-2"
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
