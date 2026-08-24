import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Star,
  BookOpen,
  Clock,
  Award,
  ChevronLeft,
  Calendar,
} from "lucide-react";
import { useTutor } from "../../data/useTutors";
import { useTutorReviews } from "../../data/useReviews";
import Money from "../../domain/Money";
import Spinner from "../../ui/Spinner";
import { useWeekdayNames } from "../../domain/useWeekdayNames";


export default function TutorProfile() {
  const { t } = useTranslation();
  const DAYS = useWeekdayNames();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: tutor, isLoading } = useTutor(id);
  const { data: reviewsData } = useTutorReviews(id);

  const reviews = reviewsData?.reviews || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <p className="text-content-secondary">{t("tutors:profile.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-content-secondary hover:text-content-primary mb-6 transition-colors"
        >
          <ChevronLeft size={18} />
          {t("tutors:profile.backToSearch")}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6 text-center"
            >
              <div
                className="w-20 h-20 rounded-full bg-brand-surface flex items-center justify-center
              text-brand font-bold text-3xl mx-auto mb-4"
              >
                {tutor.name.charAt(0)}
              </div>
              <h1 className="text-xl font-bold text-content-primary">{tutor.name}</h1>
              <p className="text-content-secondary text-sm mt-1">{tutor.program}</p>
              {tutor.institution && (
                <p className="text-xs text-content-muted mt-1">
                  {tutor.institution.name}
                </p>
              )}

              <div className="flex items-center justify-center gap-2 mt-3">
                <Star className="text-rating fill-rating" size={18} />
                <span className="font-semibold text-content-primary">
                  {tutor.tutorProfile?.averageRating?.toFixed(1) || "0.0"}
                </span>
                <span className="text-content-muted text-sm">
                  {t("tutors:profile.sessionCount", { count: tutor.tutorProfile?.totalSessions || 0 })}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-line-subtle">
                <span className="text-2xl font-bold text-brand">
                  <Money value={tutor.tutorProfile?.hourlyRate} />
                </span>
                <span className="text-content-muted text-sm">
                  {t("tutors:profile.perHour")}
                </span>
              </div>

              {tutor.tutorProfile?.isVerified && (
                <div
                  className="flex items-center justify-center gap-1 mt-3
                text-positive-content text-sm font-medium"
                >
                  <Award size={14} />
                  {t("tutors:profile.verified")}
                </div>
              )}

              <button
                onClick={() => navigate(`/tutors/${id}/book`)}
                className="w-full mt-4 py-3 bg-brand-solid hover:brightness-95
                text-on-solid font-medium rounded-xl transition-colors"
              >
                {t("tutors:profile.bookSession")}
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6"
            >
              <h3 className="font-semibold text-content-primary mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-brand" />
                {t("tutors:profile.subjects")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {tutor.tutorProfile?.subjects?.map((s) => (
                  <span
                    key={s.subject.id}
                    className="text-xs bg-brand-surface text-brand
                    px-3 py-1 rounded-full border border-brand-line"
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
              className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6"
            >
              <h3 className="font-semibold text-content-primary mb-3 flex items-center gap-2">
                <Clock size={16} className="text-brand" />
                {t("tutors:profile.availability")}
              </h3>
              {tutor.tutorProfile?.availability?.length > 0 ? (
                <div className="space-y-2">
                  {tutor.tutorProfile.availability.map((a) => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <span className="text-content-secondary font-medium">
                        {DAYS[a.dayOfWeek]}
                      </span>
                      <span className="text-content-secondary">
                        {a.startTime} - {a.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-content-muted">{t("tutors:profile.noSchedule")}</p>
              )}
            </motion.div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {tutor.tutorProfile?.bio && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6"
              >
                <h3 className="font-semibold text-content-primary mb-3">
                  {t("tutors:profile.about")}
                </h3>
                <p className="text-content-secondary leading-relaxed">
                  {tutor.tutorProfile.bio}
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6"
            >
              <h3 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
                <Star size={16} className="text-brand" />
                {t("tutors:profile.reviewCount", { count: reviews.length })}
              </h3>

              {reviews.length === 0 ? (
                <p className="text-sm text-content-muted">
                  {t("tutors:profile.noReviews")}
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-line-subtle pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full bg-brand-surface flex items-center
                          justify-center text-brand font-medium text-sm"
                          >
                            {review.reviewer.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-content-primary">
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
                                  ? "text-rating fill-rating"
                                  : "text-content-muted fill-line-default"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-content-secondary ml-10">
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
