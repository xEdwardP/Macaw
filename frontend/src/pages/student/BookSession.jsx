import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
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
import { useBookedSlots, useTutor } from "../../data/useTutors";
import { useCreateSession } from "../../data/useSessions";
import { useMyWallet } from "../../data/useWallet";
import Money from "../../domain/Money";
import { getTodayDateString } from "../../utils/dateTime";
import { useWeekdayNames } from "../../domain/useWeekdayNames";

const buildSchema = (t) =>
  z.object({
    subjectId: z.string().min(1, t("sessions:book.pickSubject")),
    date: z.string().min(1, t("sessions:book.pickDate")),
    startTime: z.string().min(1, t("sessions:book.pickTime")),
    notes: z.string().optional(),
  });

const generateHoursInRange = (startTime, endTime) => {
  const hours = [];
  let current = parseInt(startTime.split(":")[0]);
  const end = parseInt(endTime.split(":")[0]);
  while (current < end) {
    hours.push(`${String(current).padStart(2, "0")}:00`);
    current++;
  }
  return hours;
};

const getWeekdayFromDateStr = (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const jsDay = new Date(year, month - 1, day).getDay();
  return jsDay === 0 ? 7 : jsDay;
};

export default function BookSession() {
  const { t } = useTranslation();
  const DAYS = useWeekdayNames();
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const { data: tutor } = useTutor(id);

  const { data: wallet } = useMyWallet();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(useMemo(() => buildSchema(t), [t])) });

  const selectedDate = watch("date");
  const selectedStartTime = watch("startTime");
  const selectedSubjectId = watch("subjectId");

  useEffect(() => {
    setValue("startTime", "");
  }, [selectedDate]);

  const price = tutor?.tutorProfile?.hourlyRate || 0;
  const hasBalance = wallet?.balance >= price;

  const availableDays = [
    ...new Set(
      tutor?.tutorProfile?.availability?.map((a) => a.dayOfWeek) || [],
    ),
  ];

  const isDateAvailable = (dateStr) => {
    if (!dateStr) return false;
    return availableDays.includes(getWeekdayFromDateStr(dateStr));
  };

  const selectedDayBlocks = selectedDate
    ? tutor?.tutorProfile?.availability?.filter(
        (a) => a.dayOfWeek === getWeekdayFromDateStr(selectedDate),
      ) || []
    : [];

  const { data: bookedSlots = [] } = useBookedSlots(id, selectedDate, {
    enabled: Boolean(selectedDate) && isDateAvailable(selectedDate),
  });

  const { mutate: book, isPending } = useCreateSession(() =>
    setTimeout(() => navigate("/student/sessions"), 1000),
  );

  const mutate = (data) =>
    book({
      tutorId: id,
      subjectId: data.subjectId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.startTime.replace(/(\d+)/, (h) =>
        String(parseInt(h) + 1).padStart(2, "0"),
      ),
      notes: data.notes,
    });

  const availableHours = (() => {
    if (!selectedDate || !isDateAvailable(selectedDate)) return [];
    if (!selectedDayBlocks.length) return [];
    return selectedDayBlocks
      .flatMap((block) => generateHoursInRange(block.startTime, block.endTime))
      .sort();
  })();

  const isToday = selectedDate === getTodayDateString();

  const isHourBooked = (hour) => {
    const hourEnd = `${String(parseInt(hour) + 1).padStart(2, "0")}:00`;

    if (isToday) {
      const now = new Date();
      const currentHour = now.getHours();
      if (parseInt(hour) <= currentHour) return true;
    }

    return bookedSlots.some(
      (slot) => hour < slot.endTime && hourEnd > slot.startTime,
    );
  };

  const selectedSubject = tutor?.tutorProfile?.subjects?.find(
    (s) => s.subject.id === selectedSubjectId,
  );

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-content-secondary hover:text-content-primary mb-6 transition-colors"
        >
          <ChevronLeft size={18} />
          {t("sessions:book.backToProfile")}
        </button>

        <h1 className="text-2xl font-bold text-content-primary mb-2">
          {t("tutors:profile.bookSession")}
        </h1>
        {tutor && (
          <p className="text-content-secondary mb-8">
            {t("sessions:mine.sessionWith", { name: tutor.name })}
          </p>
        )}

        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${step >= s ? "bg-brand-solid text-brand-contrast" : "bg-surface-sunken text-content-secondary"}`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-12 transition-all ${step > s ? "bg-brand-solid" : "bg-surface-sunken"}`}
                />
              )}
            </div>
          ))}
          <div className="ml-4 text-sm text-content-secondary">
            {t(`sessions:book.step.${step}`)}
          </div>
        </div>

        <form onSubmit={handleSubmit(mutate)}>
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6">
                <h3 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
                  <BookOpen size={16} className="text-brand" />
                  {t("sessions:book.subject")}
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
                            ? "border-brand bg-brand-surface"
                            : "border-line-default hover:border-line-strong"
                        }`}
                      >
                        <div className="text-sm font-medium text-content-primary">
                          {s.subject.name}
                        </div>
                        <div className="text-xs text-content-muted mt-1">
                          {s.level}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.subjectId && (
                  <p className="text-danger-content text-xs mt-2">
                    {errors.subjectId.message}
                  </p>
                )}
              </div>

              <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6">
                <h3 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-brand" />
                  {t("common:field.date")}
                </h3>
                <input
                  {...register("date")}
                  type="date"
                  min={getTodayDateString()}
                  className="w-full px-4 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand"
                />
                {selectedDate && !isDateAvailable(selectedDate) && (
                  <p className="text-warning-content text-xs mt-2">
                    {t("sessions:book.noAvailabilityThisDay")}
                  </p>
                )}
                {errors.date && (
                  <p className="text-danger-content text-xs mt-2">
                    {errors.date.message}
                  </p>
                )}
                <div className="mt-3">
                  <p className="text-xs text-content-muted mb-2">
                    {t("sessions:book.availableDays")}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tutor?.tutorProfile?.availability
                      ?.slice()
                      .sort((a, b) =>
                        a.dayOfWeek !== b.dayOfWeek
                          ? a.dayOfWeek - b.dayOfWeek
                          : a.startTime.localeCompare(b.startTime),
                      )
                      .map((a, i) => (
                        <span
                          key={`${a.dayOfWeek}-${a.startTime}-${i}`}
                          className="text-xs bg-positive-surface text-positive-content px-2 py-1 rounded-full border border-positive-line"
                        >
                          {DAYS[a.dayOfWeek]} {a.startTime}–{a.endTime}
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
                className="w-full py-3 bg-brand-solid hover:brightness-95 text-brand-contrast font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("common:action.continue")}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6">
                <h3 className="font-semibold text-content-primary mb-1 flex items-center gap-2">
                  <Clock size={16} className="text-brand" />
                  {t("sessions:book.startTime")}
                </h3>
                {selectedDayBlocks.length > 0 && (
                  <p className="text-xs text-content-muted mb-4">
                    {t("sessions:book.availableBlocks")}{" "}
                    {selectedDayBlocks
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((b) => `${b.startTime}–${b.endTime}`)
                      .join("  ·  ")}
                  </p>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {availableHours.map((hour) => {
                    const booked = isHourBooked(hour);
                    return (
                      <label
                        key={hour}
                        className={
                          booked ? "cursor-not-allowed" : "cursor-pointer"
                        }
                      >
                        <input
                          {...register("startTime")}
                          type="radio"
                          value={hour}
                          disabled={booked}
                          className="sr-only"
                        />
                        <div
                          className={`border-2 rounded-lg py-2 text-center text-sm transition-all relative
                          ${
                            booked
                              ? "border-line-subtle bg-surface-muted text-content-muted line-through"
                              : selectedStartTime === hour
                                ? "border-brand bg-brand-surface text-brand font-medium"
                                : "border-line-default text-content-secondary hover:border-line-strong"
                          }`}
                        >
                          {hour}
                          {booked && (
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-danger-solid text-on-solid rounded-full px-1">
                              {t("sessions:book.busy")}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                {availableHours.length === 0 && (
                  <p className="text-sm text-content-muted text-center py-4">
                    {t("sessions:book.noSlotsThisDay")}
                  </p>
                )}
                {errors.startTime && (
                  <p className="text-danger-content text-xs mt-2">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6">
                <h3 className="font-semibold text-content-primary mb-3">
                  {t("sessions:book.notesForTutor")}
                </h3>
                <textarea
                  {...register("notes")}
                  placeholder={t("sessions:book.notesPlaceholder")}
                  rows={3}
                  className="w-full px-4 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 ring-brand resize-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-line-strong text-content-primary font-medium rounded-xl hover:bg-surface-muted transition-colors"
                >
                  {t("sessions:book.back")}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={
                    !selectedStartTime || isHourBooked(selectedStartTime)
                  }
                  className="flex-1 py-3 bg-brand-solid hover:brightness-95 text-brand-contrast font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("common:action.continue")}
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
              <div className="bg-surface rounded-xl border border-line-subtle shadow-sm p-6">
                <h3 className="font-semibold text-content-primary mb-4">
                  {t("sessions:book.summary")}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-content-secondary">{t("sessions:book.tutor")}</span>
                    <span className="font-medium text-content-primary">
                      {tutor?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-content-secondary">{t("sessions:book.subject")}</span>
                    <span className="font-medium text-content-primary">
                      {selectedSubject?.subject.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-content-secondary">{t("common:field.date")}</span>
                    <span className="font-medium text-content-primary">
                      {selectedDate}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-content-secondary">{t("common:field.time")}</span>
                    <span className="font-medium text-content-primary">
                      {selectedStartTime} —{" "}
                      {selectedStartTime?.replace(/(\d+)/, (h) =>
                        String(parseInt(h) + 1).padStart(2, "0"),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-line-subtle">
                    <span className="text-content-secondary">{t("sessions:book.duration")}</span>
                    <span className="font-medium text-content-primary">
                      {t("common:unit.hour", { count: 1 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-line-subtle">
                    <span className="text-content-primary">{t("sessions:book.total")}</span>
                    <Money value={price} currency={tutor?.institution?.currencyCode} className="text-brand text-lg" />
                  </div>
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 flex items-center justify-between
                ${hasBalance ? "bg-positive-surface border-positive-line" : "bg-danger-surface border-danger-line"}`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard
                    size={18}
                    className={hasBalance ? "text-positive-content" : "text-danger-content"}
                  />
                  <div>
                    <p className="text-sm font-medium text-content-primary">
                      {t("sessions:book.yourBalance")}
                    </p>
                    <p className="text-xs text-content-secondary">
                      {t("sessions:book.walletBalance")}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-bold text-lg ${hasBalance ? "text-positive-content" : "text-danger-content"}`}
                >
                  <Money value={wallet?.balance} currency={wallet?.currency} />
                </span>
              </div>

              {!hasBalance && (
                <p className="text-danger-content text-sm text-center">
                  {t("sessions:book.notEnoughBalance")}
                </p>
              )}

              <div className="bg-info-surface border border-info-line rounded-xl p-4 flex items-start gap-3">
                <Video
                  size={18}
                  className="text-info-content mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-info-content">
                    {t("sessions:book.videoCallIncluded")}
                  </p>
                  <p className="text-xs text-info-content mt-1">
                    {t("sessions:book.meetingLinkNote")}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-line-strong text-content-primary font-medium rounded-xl hover:bg-surface-muted transition-colors"
                >
                  {t("sessions:book.back")}
                </button>
                <button
                  type="submit"
                  disabled={!hasBalance || isPending}
                  className="flex-1 py-3 bg-brand-solid hover:brightness-95 text-brand-contrast font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? t("state.processing") : t("sessions:book.confirm")}
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}
