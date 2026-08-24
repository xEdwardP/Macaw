import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUnitLabels } from "../../domain/useUnitLabels";
import { useLocaleSettings } from "../../domain/useLocaleSettings";
import { formatMoney } from "../../domain/Money";
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
  ShieldCheck,
} from "lucide-react";
import Avatar from "../../ui/Avatar";
import { useAuthStore } from "../../store/authStore";
import { useTutors } from "../../data/useTutors";
import { useSubjects, useUnits } from "../../data/useInstitution";

const RATING_OPTIONS = [4, 4.5, 5];
const RATE_OPTIONS = [5, 10, 15, 20];

export default function TutorSearch() {
  const { t } = useTranslation();
  const unitLabel = useUnitLabels();
  const { currency, locale } = useLocaleSettings();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [unitId, setUnitId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 9;

  const { data: unitsData } = useUnits({
    institutionId: user.institutionId,
    limit: 100,
  });

  const { data: subjectsData } = useSubjects({
    limit: 100,
    unitId: unitId || undefined,
  });

  const { data, isLoading } = useTutors({
    search,
    minRating,
    maxRate,
    unitId,
    subjectId,
    page,
    limit,
  });

  const faculties = unitsData?.data || [];
  const subjects = subjectsData?.data || [];
  const subjectsTruncated = (subjectsData?.total || 0) > subjects.length;

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
    <div className="min-h-screen bg-surface-muted">
      <div className="bg-surface border-b border-line-default">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl font-bold text-content-primary mb-2">
            {t("tutors:search.title")}
          </h1>
          <p className="text-content-secondary">
            {t("tutors:search.subtitle")}
          </p>

          <div className="flex gap-3 mt-6">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted"
                size={18}
              />
              <input
                type="text"
                placeholder={t("tutors:search.placeholder")}
                value={search}
                onChange={(e) =>
                  handleFilterChange(() => setSearch(e.target.value))
                }
                className="w-full pl-11 pr-4 py-3 border border-line-strong rounded-xl focus:outline-none focus:ring-2 ring-brand focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all
              ${showFilters ? "bg-brand-solid text-brand-contrast border-brand" : "bg-surface text-content-primary border-line-strong hover:border-brand"}`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:block">{t("tutors:search.filters")}</span>
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-4 mt-4"
            >
              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">
                  {unitLabel.singular}
                </label>
                <select
                  value={unitId}
                  onChange={(e) =>
                    handleFilterChange(() => setUnitId(e.target.value))
                  }
                  className="px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand text-sm"
                >
                  <option value="">
                    {t("tutors:search.allUnits", { plural: unitLabel.plural })}
                  </option>
                  {(faculties || []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">
                  {t("tutors:search.subject")}
                </label>
                <select
                  value={subjectId}
                  onChange={(e) =>
                    handleFilterChange(() => setSubjectId(e.target.value))
                  }
                  className="px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand text-sm max-w-56"
                >
                  <option value="">{t("tutors:search.allSubjects")}</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                {subjectsTruncated && (
                  <p className="text-xs text-content-muted mt-1 max-w-56">
                    {t("tutors:search.subjectsTruncated", {
                      count: subjects.length,
                    })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">
                  {t("tutors:search.minRating")}
                </label>
                <select
                  value={minRating}
                  onChange={(e) =>
                    handleFilterChange(() => setMinRating(e.target.value))
                  }
                  className="px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand text-sm"
                >
                  <option value="">{t("tutors:search.any")}</option>
                  {RATING_OPTIONS.map((rating) => (
                    <option key={rating} value={rating}>
                      {t("tutors:search.minStars", { count: rating })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">
                  {t("tutors:search.maxPricePerHour")}
                </label>
                <select
                  value={maxRate}
                  onChange={(e) =>
                    handleFilterChange(() => setMaxRate(e.target.value))
                  }
                  className="px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand text-sm"
                >
                  <option value="">{t("tutors:search.any")}</option>
                  {RATE_OPTIONS.map((rate) => (
                    <option key={rate} value={rate}>
                      {t("tutors:search.upTo", {
                        amount: formatMoney(rate, { currency, locale }),
                      })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() =>
                    handleFilterChange(() => {
                      setSearch("");
                      setMinRating("");
                      setMaxRate("");
                      setUnitId("");
                      setSubjectId("");
                    })
                  }
                  className="px-3 py-2 text-sm text-content-secondary hover:text-content-primary underline"
                >
                  {t("tutors:search.clearFilters")}
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
              <div key={i} className="bg-surface rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-surface-sunken rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-surface-sunken rounded w-3/4 mb-2" />
                    <div className="h-3 bg-surface-sunken rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-surface-sunken rounded w-full mb-2" />
                <div className="h-3 bg-surface-sunken rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : tutors.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="mx-auto text-content-muted mb-4" size={48} />
            <h3 className="text-lg font-medium text-content-primary">
              {t("tutors:search.emptyTitle")}
            </h3>
            <p className="text-content-secondary mt-1">
              {t("tutors:search.emptyBody")}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-content-secondary mb-6">
              {t("tutors:search.found", { count: total })}
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
                    className="block bg-surface rounded-xl border border-line-subtle shadow-sm hover:shadow-md hover:border-brand-line transition-all p-6"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar name={tutor.name} src={tutor.avatar} size="lg" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-content-primary truncate flex items-center gap-1.5">
                          {tutor.name}
                          {tutor.tutorProfile?.isVerified && (
                            <ShieldCheck
                              size={15}
                              className="text-positive-content flex-shrink-0"
                              aria-label={t("tutors:search.verified")}
                            />
                          )}
                        </h3>
                        <p className="text-sm text-content-secondary truncate">
                          {tutor.program}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <Star
                          className="text-rating fill-rating"
                          size={16}
                        />
                        <span className="text-sm font-medium text-content-primary">
                          {tutor.tutorProfile?.averageRating?.toFixed(1) ||
                            "0.0"}
                        </span>
                        <span className="text-sm text-content-muted">
                          (
                          {t("common:unit.session", {
                            count: tutor.tutorProfile?.totalSessions || 0,
                          })}
                          )
                        </span>
                      </div>
                      <span className="text-brand font-semibold text-sm">
                        {t("tutors:search.perHour", {
                          amount: formatMoney(tutor.tutorProfile?.hourlyRate, {
                            currency,
                            locale,
                          }),
                        })}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {tutor.tutorProfile?.subjects?.slice(0, 3).map((s) => (
                        <span
                          key={s.subject.id}
                          className="text-xs bg-brand-surface text-brand px-2 py-1 rounded-full border border-brand-line"
                        >
                          {s.subject.name}
                        </span>
                      ))}
                      {tutor.tutorProfile?.subjects?.length > 3 && (
                        <span className="text-xs text-content-muted px-2 py-1">
                          {t("tutors:search.andMore", {
                            count: tutor.tutorProfile.subjects.length - 3,
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-line-subtle">
                      <div className="flex items-center gap-1 text-xs text-content-muted">
                        <Clock size={12} />
                        {t(
                          tutor.tutorProfile?.availability?.length > 0
                            ? "tutors:search.availableThisWeek"
                            : "tutors:search.noSchedule",
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-brand text-sm font-medium">
                        {t("tutors:search.viewProfile")}
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-3">
              <p className="text-sm text-content-secondary">
                {t("common:pagination.showing", {
                  from,
                  to,
                  total,
                  noun: t("tutors:search.noun"),
                })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 border border-line-default rounded-lg text-sm text-content-secondary hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                  {t("common:action.previous")}
                </button>
                <span className="text-sm text-content-secondary">
                  {t("pagination.pageOf", { page, totalPages })}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 border border-line-default rounded-lg text-sm text-content-secondary hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t("common:action.next")}
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
