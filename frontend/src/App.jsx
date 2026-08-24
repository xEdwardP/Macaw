import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router";
import Navbar from "./components/layout/Navbar";
import ErrorBoundary from "./app/ErrorBoundary";
import { applyBrand } from "./app/branding";
import { useAuthStore } from "./store/authStore";
import { useThemeStore } from "./store/themeStore";
import { changeLocale } from "./i18n";
import { useSyncProfile } from "./data/useSession";
import { useRealtime } from "./data/useRealtime";

function useInstitutionBranding() {
  const primaryColor = useAuthStore(
    (state) => state.user?.institution?.primaryColor,
  );
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    applyBrand(primaryColor, theme);
  }, [primaryColor, theme]);
}

function useSystemThemeSync() {
  const syncSystem = useThemeStore((state) => state.syncSystem);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", syncSystem);
    return () => query.removeEventListener("change", syncSystem);
  }, [syncSystem]);
}

function useAccountPreferences() {
  const user = useAuthStore((state) => state.user);
  const setPreference = useThemeStore((state) => state.setPreference);

  useEffect(() => {
    if (!user) return;
    const preferred = user.locale || user.institution?.locale;
    if (preferred) changeLocale(preferred);
    if (user.themePreference) setPreference(user.themePreference);
  }, [user, setPreference]);
}

function Layout() {
  const token = useAuthStore((state) => state.token);
  useSyncProfile();
  useRealtime();
  useInstitutionBranding();
  useSystemThemeSync();
  useAccountPreferences();

  return (
    <>
      {token && <Navbar />}
      <AppRouter />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
