import { useAuthStore } from "../store/authStore";

const DEFAULTS = {
  allowCrossInstitutionTutoring: false,
  crossInstitutionAllowList: [],
  allowCrossCurrencySessions: false,
  studentSelfTopUp: true,
  tutorWithdrawals: true,
};

export function useInstitutionPolicy() {
  const settings = useAuthStore((state) => state.user?.institution?.settings);

  return { ...DEFAULTS, ...(settings || {}) };
}
