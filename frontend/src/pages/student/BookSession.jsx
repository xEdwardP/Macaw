import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Calendar,
  Clock,
  BookOpen,
  CreditCard,
  Video,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { tutorsService } from "../../services/tutors.service";
import { sessionsService } from "../../services/sessions.service";
import { walletService } from "../../services/wallet.service";

const schema = z.object({
  subjectId: z.string().min(1, "Selecciona una materia"),
  date: z.string().min(1, "Selecciona una fecha"),
  startTime: z.string().min(1, "Selecciona una hora"),
  notes: z.string().optional(),
});

const HOURS = [
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
];

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

export default function BookSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const { data: tutor } = useQuery({
    queryKey: ["tutor", id],
    queryFn: () => tutorsService.getOne(id).then((r) => r.data.data),
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getMyWallet().then((r) => r.data.data),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const selectedDate = watch("date");
  const selectedStartTime = watch("startTime");
  const selectedSubjectId = watch("subjectId");

  const { mutate, isPending } = useMutation({
    mutationFn: (data) =>
      sessionsService.create({
        tutorId: id,
        subjectId: data.subjectId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.startTime.replace(/(\d+)/, (h) =>
          String(parseInt(h) + 1).padStart(2, "0"),
        ),
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success("Sesion reservada exitosamente");
      setTimeout(() => navigate("/student/sessions"), 1000);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Error al reservar");
    },
  });

  const price = tutor?.tutorProfile?.hourlyRate || 0;
  const hasBalance = wallet?.balance >= price;
  const availableDays = [
    ...new Set(
      tutor?.tutorProfile?.availability?.map((a) => a.dayOfWeek) || [],
    ),
  ];

  const isDateAvailable = (dateStr) => {
    if (!dateStr) return false;
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const jsDay = date.getDay();
    const adjustedDay = jsDay === 0 ? 7 : jsDay;
    return availableDays.includes(adjustedDay);
  };

  const selectedSubject = tutor?.tutorProfile?.subjects?.find(
    (s) => s.subject.id === selectedSubjectId,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ChevronLeft size={18} />
          Volver al perfil
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Reservar sesión
        </h1>
        {tutor && (
          <p className="text-gray-500 mb-8">
            con <span className="font-medium text-gray-700">{tutor.name}</span>
          </p>
        )}

        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${
                  step >= s
                    ? "bg-orange-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-12 transition-all
                  ${step > s ? "bg-orange-600" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
          <div className="ml-4 text-sm text-gray-500">
            {step === 1 && "Selecciona materia y fecha"}
            {step === 2 && "Selecciona horario"}
            {step === 3 && "Confirmar reserva"}
          </div>
        </div>

        <form onSubmit={handleSubmit(mutate)}>
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen size={16} className="text-orange-600" />
                  Materia
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {tutor?.tutorProfile?.subjects?.map((s) => (
                    <label key={s.subject.id} className="cursor-pointer">
                      <input
                        {...register("subjectId")}
                        type="radio"
                        value={s.subject.id}
                        className="sr-only"
                      />
                      <div
                        className={`border-2 rounded-lg p-3 text-center transition-all
                        ${
                          selectedSubjectId === s.subject.id
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-700">
                          {s.subject.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {s.level}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.subjectId && (
                  <p className="text-red-500 text-xs mt-2">
                    {errors.subjectId.message}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-orange-600" />
                  Fecha
                </h3>
                <input
                  {...register("date")}
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {selectedDate && !isDateAvailable(selectedDate) && (
                  <p className="text-amber-600 text-xs mt-2">
                    El tutor no tiene disponibilidad este dia. Selecciona otro.
                  </p>
                )}
                {errors.date && (
                  <p className="text-red-500 text-xs mt-2">
                    {errors.date.message}
                  </p>
                )}

                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">
                    Dias disponibles:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableDays.map((d) => (
                      <span
                        key={d}
                        className="text-xs bg-green-50 text-green-700
                      px-2 py-1 rounded-full border border-green-100"
                      >
                        {DAYS[d]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={
                  !selectedSubjectId ||
                  !selectedDate ||
                  !isDateAvailable(selectedDate)
                }
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-orange-600" />
                  Hora de inicio
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {HOURS.map((hour) => (
                    <label key={hour} className="cursor-pointer">
                      <input
                        {...register("startTime")}
                        type="radio"
                        value={hour}
                        className="sr-only"
                      />
                      <div
                        className={`border-2 rounded-lg py-2 text-center text-sm transition-all
                        ${
                          selectedStartTime === hour
                            ? "border-orange-500 bg-orange-50 text-orange-700 font-medium"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {hour}
                      </div>
                    </label>
                  ))}
                </div>
                {errors.startTime && (
                  <p className="text-red-500 text-xs mt-2">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Notas para el tutor
                </h3>
                <textarea
                  {...register("notes")}
                  placeholder="Describe los temas que necesitas repasar..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700
                  font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!selectedStartTime}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white
                  font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Resumen de la sesión
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tutor</span>
                    <span className="font-medium text-gray-700">
                      {tutor?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Materia</span>
                    <span className="font-medium text-gray-700">
                      {selectedSubject?.subject.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fecha</span>
                    <span className="font-medium text-gray-700">
                      {selectedDate}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Hora</span>
                    <span className="font-medium text-gray-700">
                      {selectedStartTime}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-gray-100">
                    <span className="text-gray-500">Duracion</span>
                    <span className="font-medium text-gray-700">1 hora</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                    <span className="text-gray-900">Total</span>
                    <span className="text-orange-600 text-lg">${price}</span>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 flex items-center justify-between
                ${
                  hasBalance
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard
                    size={18}
                    className={hasBalance ? "text-green-600" : "text-red-500"}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Tu saldo
                    </p>
                    <p className="text-xs text-gray-500">
                      Saldo disponible en wallet
                    </p>
                  </div>
                </div>
                <span
                  className={`font-bold text-lg ${hasBalance ? "text-green-600" : "text-red-500"}`}
                >
                  ${wallet?.balance?.toFixed(2) || "0.00"}
                </span>
              </div>

              {!hasBalance && (
                <p className="text-red-500 text-sm text-center">
                  Saldo insuficiente. Contacta a tu universidad para recargar tu
                  wallet.
                </p>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Video
                  size={18}
                  className="text-blue-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Videollamada incluida
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Se generara un enlace de Jitsi Meet automaticamente al
                    reservar.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700
                  font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={!hasBalance || isPending}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white
                  font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Reservando..." : "Confirmar reserva"}
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}
