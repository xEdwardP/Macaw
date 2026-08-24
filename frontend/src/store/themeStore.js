import { create } from "zustand";
import { persist } from "zustand/middleware";

export const THEME_PREFERENCES = ["light", "dark", "system"];

const STORAGE_KEY = "macaw-theme";

const systemTheme = () =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const effectiveTheme = (preference) =>
  preference === "system" ? systemTheme() : preference;

const applyTheme = (preference) => {
  const theme = effectiveTheme(preference);
  document.documentElement.dataset.theme = theme;
  return theme;
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      preference: "system",
      theme: effectiveTheme("system"),
      setPreference: (preference) => {
        if (!THEME_PREFERENCES.includes(preference)) return;
        set({ preference, theme: applyTheme(preference) });
      },
      syncSystem: () => {
        if (get().preference === "system") set({ theme: applyTheme("system") });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: ({ preference }) => ({ preference }),
      onRehydrateStorage: () => (state) => {
        if (state)
          useThemeStore.setState({ theme: applyTheme(state.preference) });
      },
    },
  ),
);

export { effectiveTheme, STORAGE_KEY as THEME_STORAGE_KEY };
