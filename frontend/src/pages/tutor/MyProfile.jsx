import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUnitLabels } from "../../domain/useUnitLabels";
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
import { useAuthStore } from "../../store/authStore";
import {
  useAddTutorSubject,
  useRemoveTutorSubject,
  useSetAvailability,
  useTutor,
  useUpdateTutorProfile,
} from "../../data/useTutors";
import { useSubjects, useUnits } from "../../data/useInstitution";
import { useWeekdayNames } from "../../domain/useWeekdayNames";

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
const MAX_TERM = 20;

export default function TutorMyProfile() {
  const { t } = useTranslation();
  const DAYS = useWeekdayNames();
  const unitLabel = useUnitLabels();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");

  const [filterFaculty, setFilterFaculty] = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [subjectPage, setSubjectPage] = useState(1);

  const { data: tutor, isLoading } = useTutor(user?.id);

  const { data: subjectsData, isLoading: loadingSubjects } = useSubjects({
    page: subjectPage,
    limit: PAGE_SIZE,
    ...(filterFaculty === "general"
      ? { general: "true" }
      : filterFaculty
        ? { unitId: filterFaculty }
        : {}),
    ...(filterQuarter ? { termNumber: filterQuarter } : {}),
    ...(filterSearch ? { search: filterSearch } : {}),
  });
  const { data: unitsData } = useUnits({
    limit: 100,
    institutionId: user.institutionId,
  });

  const allSubjects = subjectsData?.data || [];
  const faculties = unitsData?.data || [];

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

  const { mutate: updateProfile, isPending: savingProfile } =
    useUpdateTutorProfile();
  const { mutate: addSubject } = useAddTutorSubject();
  const { mutate: removeSubject } = useRemoveTutorSubject();
  const { mutate: saveAvailabilitySlots, isPending: savingAvailability } =
    useSetAvailability();

  const saveAvailability = (slots) =>
    saveAvailabilitySlots(slots.map(({ _key, ...slot }) => slot));

  const addSlot = () => {
    if (newSlot.startTime >= newSlot.endTime) {
      toast.error(t("tutors:mine.startBeforeEnd"));
      return;
    }
    const sameDay = availability.filter(
      (s) => s.dayOfWeek === newSlot.dayOfWeek,
    );
    const hasOverlap = sameDay.some(
      (s) => newSlot.startTime < s.endTime && newSlot.endTime > s.startTime,
    );
    if (hasOverlap) {
      toast.error(t("tutors:mine.slotOverlaps"));
      return;
    }
    const _key = `${newSlot.dayOfWeek}-${newSlot.startTime}-${Date.now()}`;
    setAvailability([...availability, { ...newSlot, _key }]);
  };

  const removeSlot = (_key) =>
    setAvailability(availability.filter((s) => s._key !== _key));

  const existingSubjectIds =
    tutor?.tutorProfile?.subjects?.map((s) => s.subject.id) || [];

  const pagedSubjects = allSubjects.filter(
    (subject) => !existingSubjectIds.includes(subject.id),
  );

  const totalSubjects = subjectsData?.total || 0;
  const totalPages = subjectsData?.totalPages || 1;
  const resetPage = () => setSubjectPage(1);

  const quarterOptions = useMemo(
    () => Array.from({ length: MAX_TERM }, (_, index) => index + 1),
    [],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-surface flex items-center justify-center text-brand font-bold text-2xl">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-content-primary">{user?.name}</h1>
              <p className="text-content-secondary text-sm">{user?.program}</p>
              {tutor?.academicUnit && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Building size={12} className="text-content-muted" />
                  <span className="text-xs text-content-muted">
                    {tutor.academicUnit.name}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-rating fill-rating" />
                  <span className="text-sm font-medium text-content-primary">
                    {tutor?.tutorProfile?.averageRating?.toFixed(1) || "0.0"}
                  </span>
                </div>
                <span className="text-content-muted">·</span>
                <span className="text-sm text-content-secondary">
                  {t("common:unit.session", {
                    count: tutor?.tutorProfile?.totalSessions || 0,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: "profile", label: t("tutors:mine.tabProfile") },
            { key: "subjects", label: t("tutors:mine.tabSubjects") },
            { key: "availability", label: t("tutors:mine.tabAvailability") },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-brand-solid text-brand-contrast"
                  : "bg-surface text-content-secondary border border-line-default hover:border-brand"
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
            className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6"
          >
            <h3 className="font-semibold text-content-primary mb-4">
              {t("tutors:mine.profileInfo")}
            </h3>
            <form onSubmit={submitProfile(updateProfile)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">
                  {t("tutors:mine.bio")}
                </label>
                <textarea
                  {...regProfile("bio")}
                  rows={4}
                  placeholder={t("tutors:mine.bioPlaceholder")}
                  className="w-full px-4 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand resize-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">
                  {t("tutors:mine.pricePerHour")}
                </label>
                <input
                  {...regProfile("hourlyRate")}
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  className="w-full px-4 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-6 py-2 bg-brand-solid hover:brightness-95 text-brand-contrast rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <Save size={16} />
                {savingProfile ? t("action.saving") : t("action.save")}
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
            <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6">
              <h3 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-brand" />
                {t("tutors:mine.mySubjects", {
                  count: tutor?.tutorProfile?.subjects?.length || 0,
                })}
              </h3>
              {!tutor?.tutorProfile?.subjects?.length ? (
                <p className="text-sm text-content-muted">
                  {t("tutors:mine.noSubjectsYet")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tutor.tutorProfile.subjects.map((s) => (
                    <div
                      key={s.subject.id}
                      className="flex items-center gap-2 bg-brand-surface border border-brand-line px-3 py-1.5 rounded-full"
                    >
                      <span className="text-sm text-brand">
                        {s.subject.name}
                      </span>
                      <button
                        onClick={() => removeSubject(s.subject.id)}
                        aria-label={t("tutors:mine.removeSubject", {
                          subject: s.subject.name,
                        })}
                        className="text-brand hover:text-brand transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6">
              <h3 className="font-semibold text-content-primary mb-4">
                {t("tutors:mine.addSubject")}
              </h3>
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
                  />
                  <input
                    type="text"
                    placeholder={t("tutors:mine.searchByName")}
                    value={filterSearch}
                    onChange={(e) => {
                      setFilterSearch(e.target.value);
                      resetPage();
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">
                      {unitLabel.singular}
                    </label>
                    <select
                      value={filterFaculty}
                      onChange={(e) => {
                        setFilterFaculty(e.target.value);
                        resetPage();
                      }}
                      className="w-full px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand text-sm"
                    >
                      <option value="">{t("tutors:mine.all")}</option>
                      <option value="general">{t("tutors:mine.generalSubjects")}</option>
                      {faculties.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">
                      {t("tutors:mine.term")}
                    </label>
                    <select
                      value={filterQuarter}
                      onChange={(e) => {
                        setFilterQuarter(e.target.value);
                        resetPage();
                      }}
                      className="w-full px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand text-sm"
                    >
                      <option value="">{t("tutors:mine.allMasculine")}</option>
                      {quarterOptions.map((q) => (
                        <option key={q} value={q}>
                          {unitLabel.term} {q}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-content-muted">
                  {t("tutors:mine.subjectCount", { count: totalSubjects })}
                </p>
                {(filterFaculty || filterQuarter || filterSearch) && (
                  <button
                    onClick={() => {
                      setFilterFaculty("");
                      setFilterQuarter("");
                      setFilterSearch("");
                      resetPage();
                    }}
                    className="text-xs text-brand hover:text-brand transition-colors"
                  >
                    {t("tutors:search.clearFilters")}
                  </button>
                )}
              </div>

              {loadingSubjects ? (
                <p className="text-sm text-content-muted py-6 text-center">
                  {t("state.loading")}
                </p>
              ) : pagedSubjects.length === 0 ? (
                <p className="text-sm text-content-muted py-6 text-center">
                  {t("tutors:mine.noSubjectsWithFilters")}
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
                      className="flex items-start gap-2 p-3 border border-line-default rounded-lg hover:border-brand hover:bg-brand-surface transition-all text-left"
                    >
                      <Plus
                        size={14}
                        className="text-brand flex-shrink-0 mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-content-primary leading-tight truncate">
                          {subject.name}
                        </p>
                        <p className="text-xs text-content-muted mt-0.5">
                          {subject.termNumber
                            ? `${unitLabel.term} ${subject.termNumber}`
                            : ""}
                          {subject.credits
                            ? ` · ${t("institution:subjects.creditCount", { count: subject.credits })}`
                            : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-line-subtle">
                  <button
                    onClick={() => setSubjectPage((p) => Math.max(1, p - 1))}
                    disabled={subjectPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-content-secondary border border-line-default rounded-lg hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} /> {t("common:action.previous")}
                  </button>
                  <span className="text-xs text-content-secondary">
                    {t("common:pagination.pageOf", {
                      page: subjectPage,
                      totalPages,
                    })}
                  </span>
                  <button
                    onClick={() =>
                      setSubjectPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={subjectPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-content-secondary border border-line-default rounded-lg hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {t("common:action.next")} <ChevronRight size={14} />
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
            <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6">
              <h3 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
                <Clock size={16} className="text-brand" />
                {t("tutors:mine.currentSchedule")}
              </h3>
              {availability.length === 0 ? (
                <p className="text-sm text-content-muted">
                  {t("tutors:mine.noSchedule")}
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
                        className="flex items-center justify-between p-3 bg-surface-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-content-primary w-24">
                            {DAYS[slot.dayOfWeek]}
                          </span>
                          <span className="text-sm text-content-secondary">
                            {slot.startTime} — {slot.endTime}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSlot(slot._key)}
                          aria-label={t("tutors:mine.removeSlot", {
                            day: DAYS[slot.dayOfWeek],
                            start: slot.startTime,
                            end: slot.endTime,
                          })}
                          className="text-content-muted hover:text-danger-content transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6">
              <h3 className="font-semibold text-content-primary mb-4">
                {t("tutors:mine.addSchedule")}
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    {t("tutors:mine.day")}
                  </label>
                  <select
                    value={newSlot.dayOfWeek}
                    onChange={(e) =>
                      setNewSlot({
                        ...newSlot,
                        dayOfWeek: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand text-sm"
                  >
                    {DAYS.slice(1).map((day, i) => (
                      <option key={i + 1} value={i + 1}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    {t("sessions:book.startTime")}
                  </label>
                  <select
                    value={newSlot.startTime}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, startTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand text-sm"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    {t("tutors:mine.endTime")}
                  </label>
                  <select
                    value={newSlot.endTime}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, endTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand text-sm"
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
                className="flex items-center gap-2 px-4 py-2 border border-brand-line text-brand hover:bg-brand-surface rounded-lg transition-colors text-sm font-medium"
              >
                <Plus size={16} /> {t("tutors:mine.addSchedule")}
              </button>
            </div>

            <button
              onClick={() => saveAvailability(availability)}
              disabled={savingAvailability}
              className="w-full py-3 bg-brand-solid hover:brightness-95 text-brand-contrast font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {savingAvailability
                ? t("action.saving")
                : t("tutors:mine.saveAvailability")}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
