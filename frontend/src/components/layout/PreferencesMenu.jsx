import { useTranslation } from "react-i18next";
import { Moon, Sun, Monitor, Languages } from "lucide-react";
import { useThemeStore, THEME_PREFERENCES } from "../../store/themeStore";
import { changeLocale, SUPPORTED_LOCALES, LOCALE_LABELS } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { useUpdatePreferences } from "../../data/useUsers";
import { cn } from "../../ui/cn";

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };

export default function PreferencesMenu({ className, stacked = false }) {
  const { t, i18n } = useTranslation();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const token = useAuthStore((state) => state.token);
  const updateUser = useAuthStore((state) => state.updateUser);
  const savePreferences = useUpdatePreferences();

  const persist = (changes) => {
    updateUser(changes);
    if (token) savePreferences.mutate(changes);
  };

  const pickTheme = (value) => {
    setPreference(value);
    persist({ themePreference: value });
  };

  const pickLocale = async (value) => {
    await changeLocale(value);
    persist({ locale: value });
  };

  const themes = (
    <div
      role="radiogroup"
      aria-label={t("theme.label")}
      className={cn(
        "flex items-center gap-0.5 rounded-lg bg-surface-sunken p-0.5",
        stacked && "w-full",
      )}
    >
      {THEME_PREFERENCES.map((value) => {
        const Icon = THEME_ICONS[value];
        const active = preference === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(`theme.${value}`)}
            title={t(`theme.${value}`)}
            onClick={() => pickTheme(value)}
            className={cn(
              "p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 ring-brand",
              stacked && "flex-1 flex items-center justify-center gap-1.5",
              active
                ? "bg-surface text-content-primary shadow-sm"
                : "text-content-muted hover:text-content-primary",
            )}
          >
            <Icon size={15} />
            {stacked && (
              <span className="text-xs font-medium">{t(`theme.${value}`)}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  const language = (
    <label
      className={cn(
        "flex items-center gap-1.5 text-content-muted",
        stacked && "w-full justify-between",
      )}
    >
      <Languages size={15} />
      <span className={stacked ? "text-xs font-medium mr-auto ml-1.5" : "sr-only"}>
        {t("language.label")}
      </span>
      <select
        value={i18n.resolvedLanguage}
        onChange={(event) => pickLocale(event.target.value)}
        className={cn(
          "bg-transparent text-sm font-medium text-content-primary focus:outline-none focus-visible:ring-2 ring-brand rounded-md cursor-pointer",
          stacked && "text-right",
        )}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>
    </label>
  );

  if (stacked)
    return (
      <div className={cn("space-y-3", className)}>
        <div>
          <p className="text-xs font-medium text-content-muted mb-1.5">
            {t("theme.label")}
          </p>
          {themes}
        </div>
        {language}
      </div>
    );

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {themes}
      {language}
    </div>
  );
}
