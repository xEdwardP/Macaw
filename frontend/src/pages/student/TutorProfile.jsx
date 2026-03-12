import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Star,
  BookOpen,
  Clock,
  Award,
  ChevronLeft,
  Calendar,
} from "lucide-react";
import { tutorsService } from "../../services/tutors.service";
import { reviewsService } from "../../services/reviews.service";

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

export default function TutorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: tutor, isLoading } = useQuery({
    queryKey: ["tutor", id],
    queryFn: () => tutorsService.getOne(id).then((r) => r.data.data),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => reviewsService.getTutorReviews(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const reviews = reviewsData?.reviews || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Tutor no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ChevronLeft size={18} />
          Volver a búsqueda
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center"
            >
              <div
                className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center
              text-orange-600 font-bold text-3xl mx-auto mb-4"
              >
                {tutor.name.charAt(0)}
              </div>
              <h1 className="text-xl font-bold text-gray-900">{tutor.name}</h1>
              <p className="text-gray-500 text-sm mt-1">{tutor.career}</p>
              {tutor.university && (
                <p className="text-xs text-gray-400 mt-1">
                  {tutor.university.name}
                </p>
              )}

              <div className="flex items-center justify-center gap-2 mt-3">
                <Star className="text-yellow-400 fill-yellow-400" size={18} />
                <span className="font-semibold text-gray-800">
                  {tutor.tutorProfile?.averageRating?.toFixed(1) || "0.0"}
                </span>
                <span className="text-gray-400 text-sm">
                  ({tutor.tutorProfile?.totalSessions || 0} sesiones)
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-2xl font-bold text-orange-600">
                  ${tutor.tutorProfile?.hourlyRate}
                </span>
                <span className="text-gray-400 text-sm">/hora</span>
              </div>

              {tutor.tutorProfile?.isVerified && (
                <div
                  className="flex items-center justify-center gap-1 mt-3
                text-green-600 text-sm font-medium"
                >
                  <Award size={14} />
                  Tutor verificado
                </div>
              )}

              <button
                onClick={() => navigate(`/tutors/${id}/book`)}
                className="w-full mt-4 py-3 bg-orange-600 hover:bg-orange-700
                text-white font-medium rounded-xl transition-colors"
              >
                Reservar sesión
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-orange-600" />
                Materias
              </h3>
              <div className="flex flex-wrap gap-2">
                {tutor.tutorProfile?.subjects?.map((s) => (
                  <span
                    key={s.subject.id}
                    className="text-xs bg-orange-50 text-orange-700
                    px-3 py-1 rounded-full border border-orange-100"
                  >
                    {s.subject.name}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-orange-600" />
                Disponibilidad
              </h3>
              {tutor.tutorProfile?.availability?.length > 0 ? (
                <div className="space-y-2">
                  {tutor.tutorProfile.availability.map((a) => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">
                        {DAYS[a.dayOfWeek]}
                      </span>
                      <span className="text-gray-500">
                        {a.startTime} - {a.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin horarios definidos</p>
              )}
            </motion.div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {tutor.tutorProfile?.bio && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
              >
                <h3 className="font-semibold text-gray-900 mb-3">
                  Sobre el tutor
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {tutor.tutorProfile.bio}
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star size={16} className="text-orange-600" />
                Reseñas ({reviews.length})
              </h3>

              {reviews.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Este tutor aún no tiene reseñas.
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full bg-orange-100 flex items-center
                          justify-center text-orange-600 font-medium text-sm"
                          >
                            {review.reviewer.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {review.reviewer.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={
                                i < review.rating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-200 fill-gray-200"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 ml-10">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
