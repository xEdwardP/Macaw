import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Palette, Shield, Upload, Wallet } from "lucide-react";
import { useMyInstitution } from "../../data/useInstitution";
import {
  useCurrencies,
  useUpdateMyInstitution,
  useUploadInstitutionLogo,
} from "../../data/useInstitutionAdmin";
import { INSTITUTION_TYPES } from "../../domain/institutionTypes";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "../../i18n";
import { Alert, Button, Card, Input, Select, SkeletonCards } from "../../ui";
import { PageHeader, PageShell } from "../../patterns";
import { cn } from "../../ui/cn";

const DEFAULT_PRIMARY_COLOR = "#ea580c";

const TIMEZONES = [
  "America/Tegucigalpa",
  "America/Guatemala",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Buenos_Aires",
  "Europe/Madrid",
  "UTC",
];

const POLICIES = [
  { key: "studentSelfTopUp", icon: Wallet },
  { key: "tutorWithdrawals", icon: Wallet },
  { key: "allowCrossInstitutionTutoring", icon: Shield },
  { key: "allowCrossCurrencySessions", icon: Shield },
];

function Toggle({ checked, onChange, label, description, icon: Icon }) {
  return (
    <label className="flex items-start gap-3 py-4 border-b border-line-subtle last:border-0 cursor-pointer">
      <Icon size={18} className="text-content-muted flex-shrink-0 mt-0.5" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-content-primary">
          {label}
        </span>
        <span className="block text-xs text-content-secondary mt-0.5">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only peer"
      />
      <span
        aria-hidden
        className={cn(
          "w-10 h-6 rounded-full flex-shrink-0 relative transition-colors",
          checked ? "bg-brand-solid" : "bg-surface-sunken border border-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-surface shadow transition-all",
            checked ? "left-5" : "left-1",
          )}
        />
      </span>
    </label>
  );
}

export default function InstitutionSettings() {
  const { t } = useTranslation("institution");
  const { data: institution, isLoading } = useMyInstitution();
  const { data: currencies } = useCurrencies();
  const update = useUpdateMyInstitution();
  const uploadLogo = useUploadInstitutionLogo();
  const logoInput = useRef(null);

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!institution || form) return;
    setForm({
      name: institution.name,
      type: institution.type,
      timezone: institution.timezone,
      locale: institution.locale,
      primaryColor: institution.primaryColor || DEFAULT_PRIMARY_COLOR,
      logo: institution.logo || "",
      settings: { ...institution.settings },
    });
  }, [institution, form]);

  if (isLoading || !form)
    return (
      <PageShell>
        <SkeletonCards count={3} />
      </PageShell>
    );

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const setPolicy = (key) => (value) =>
    setForm((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value },
    }));

  const save = () =>
    update.mutate({
      name: form.name,
      type: form.type,
      timezone: form.timezone,
      locale: form.locale,
      primaryColor: form.primaryColor,
      logo: form.logo.trim() || null,
      settings: {
        studentSelfTopUp: form.settings.studentSelfTopUp,
        tutorWithdrawals: form.settings.tutorWithdrawals,
        allowCrossInstitutionTutoring:
          form.settings.allowCrossInstitutionTutoring,
        allowCrossCurrencySessions: form.settings.allowCrossCurrencySessions,
      },
    });

  const currency = (currencies || []).find(
    (item) => item.code === institution.currencyCode,
  );

  return (
    <PageShell width="max-w-3xl">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-content-primary mb-4">
          {t("settings.identity")}
        </h2>

        <div className="space-y-4">
          <Input
            label={t("apply.institutionName")}
            value={form.name}
            onChange={set("name")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t("apply.type")}
              value={form.type}
              onChange={set("type")}
              hint={t("settings.typeHint")}
              options={INSTITUTION_TYPES.map((value) => ({
                value,
                label: t(`units:institutionType.${value}`),
              }))}
            />

            <Input
              label={t("apply.currency")}
              value={
                currency ? `${currency.code} · ${currency.name}` : institution.currencyCode
              }
              hint={t("settings.currencyLocked")}
              disabled
              readOnly
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t("settings.timezone")}
              value={form.timezone}
              onChange={set("timezone")}
              options={TIMEZONES.map((value) => ({ value, label: value }))}
            />

            <Select
              label={t("settings.locale")}
              value={form.locale}
              onChange={set("locale")}
              hint={t("settings.localeHint")}
              options={SUPPORTED_LOCALES.map((value) => ({
                value,
                label: LOCALE_LABELS[value],
              }))}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
          <Palette size={16} className="text-content-muted" />
          {t("settings.branding")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <span className="block text-sm font-medium text-content-primary mb-1">
              {t("settings.primaryColor")}
            </span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label={t("settings.primaryColor")}
                value={form.primaryColor}
                onChange={set("primaryColor")}
                className="w-12 h-10 rounded-lg border border-line-strong bg-surface cursor-pointer"
              />
              <Input
                value={form.primaryColor}
                onChange={set("primaryColor")}
                aria-label={t("settings.primaryColorHex")}
              />
            </div>
            <p className="text-content-muted text-xs mt-1">
              {t("settings.primaryColorHint")}
            </p>
          </div>

          <div>
            <Input
              label={t("settings.logo")}
              placeholder="https://..."
              hint={t("settings.logoHint")}
              value={form.logo}
              onChange={set("logo")}
            />

            <div className="flex items-center gap-3 mt-3">
              {form.logo && (
                <img
                  src={form.logo}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover border border-line-default"
                />
              )}
              <Button
                variant="secondary"
                size="sm"
                loading={uploadLogo.isPending}
                onClick={() => logoInput.current?.click()}
              >
                <Upload size={15} />
                {t("settings.uploadLogo")}
              </Button>
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file)
                    uploadLogo.mutate(file, {
                      onSuccess: (institution) =>
                        setForm((current) => ({
                          ...current,
                          logo: institution.logo || "",
                        })),
                    });
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-content-primary mb-2">
          {t("settings.policies")}
        </h2>
        <p className="text-sm text-content-secondary mb-2">
          {t("settings.policiesHint")}
        </p>

        {POLICIES.map(({ key, icon }) => (
          <Toggle
            key={key}
            icon={icon}
            checked={Boolean(form.settings[key])}
            onChange={setPolicy(key)}
            label={t(`settings.policy.${key}`)}
            description={t(`settings.policyHint.${key}`)}
          />
        ))}

        {!form.settings.studentSelfTopUp && (
          <Alert tone="info" className="mt-4">
            {t("settings.selfTopUpOffNote")}
          </Alert>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={update.isPending} size="lg">
          {t("common:action.save")}
        </Button>
      </div>
    </PageShell>
  );
}
