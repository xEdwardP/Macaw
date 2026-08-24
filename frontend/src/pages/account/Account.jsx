import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Camera,
  KeyRound,
  MailWarning,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useUnits } from "../../data/useInstitution";
import { useUnitLabels } from "../../domain/useUnitLabels";
import {
  useChangePassword,
  useResendVerification,
  useUpdateProfile,
  useUploadAvatar,
} from "../../data/useAccount";
import { Alert, Avatar, Badge, Button, Card, Input, Select } from "../../ui";
import { PageHeader, PageShell } from "../../patterns";
import PreferencesMenu from "../../components/layout/PreferencesMenu";

const EMPTY_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirm: "",
};

function AvatarPicker({ user }) {
  const { t } = useTranslation("auth");
  const input = useRef(null);
  const upload = useUploadAvatar();

  return (
    <div className="flex items-center gap-4">
      <Avatar name={user?.name} src={user?.avatar} size="xl" />

      <div className="min-w-0">
        <Button
          variant="secondary"
          size="sm"
          loading={upload.isPending}
          onClick={() => input.current?.click()}
        >
          <Camera size={15} />
          {t("profile.changeAvatar")}
        </Button>
        <p className="text-xs text-content-muted mt-1.5">
          {t("profile.avatarHint")}
        </p>

        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function PasswordCard() {
  const { t } = useTranslation("auth");
  const [values, setValues] = useState(EMPTY_PASSWORD);
  const change = useChangePassword(() => setValues(EMPTY_PASSWORD));

  const set = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const mismatch =
    values.confirm.length > 0 && values.confirm !== values.newPassword;

  const ready =
    values.currentPassword.length > 0 &&
    values.newPassword.length >= 8 &&
    !mismatch;

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
        <KeyRound size={16} className="text-content-muted" />
        {t("profile.password")}
      </h2>

      <div className="space-y-4">
        <Input
          label={t("profile.currentPassword")}
          type="password"
          value={values.currentPassword}
          onChange={set("currentPassword")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("reset.newPassword")}
            type="password"
            hint={t("profile.passwordHint")}
            value={values.newPassword}
            onChange={set("newPassword")}
          />
          <Input
            label={t("reset.confirmPassword")}
            type="password"
            error={mismatch ? t("validation.passwordsDiffer") : undefined}
            value={values.confirm}
            onChange={set("confirm")}
          />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          disabled={!ready}
          loading={change.isPending}
          onClick={() =>
            change.mutate({
              currentPassword: values.currentPassword,
              newPassword: values.newPassword,
            })
          }
        >
          {t("profile.updatePassword")}
        </Button>
      </div>
    </Card>
  );
}

export default function Account() {
  const { t } = useTranslation("auth");
  const user = useAuthStore((state) => state.user);
  const unitLabel = useUnitLabels();

  const { data: unitsData } = useUnits(
    { institutionId: user?.institutionId, limit: 100 },
    { enabled: Boolean(user?.institutionId) },
  );

  const units = unitsData?.data || [];

  const [form, setForm] = useState(null);
  const save = useUpdateProfile();
  const resend = useResendVerification();

  useEffect(() => {
    if (!user || form) return;
    setForm({
      name: user.name || "",
      program: user.program || "",
      termNumber: user.termNumber ?? "",
      academicUnitId: user.academicUnitId || "",
      paypalEmail: user.paypalEmail || "",
    });
  }, [user, form]);

  if (!user || !form) return null;

  const studiesHere = user.role === "student" || user.role === "tutor";

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = () =>
    save.mutate({
      name: form.name.trim(),
      ...(studiesHere
        ? {
            program: form.program.trim() || null,
            termNumber: form.termNumber === "" ? null : Number(form.termNumber),
            academicUnitId: form.academicUnitId || null,
          }
        : {}),
      ...(user.role === "tutor"
        ? { paypalEmail: form.paypalEmail.trim() || null }
        : {}),
    });

  return (
    <PageShell width="max-w-3xl">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      {!user.emailVerifiedAt && (
        <Alert tone="warning" title={t("verify.pendingTitle")} className="mb-6">
          <p className="mb-3">{t("verify.pendingBody", { email: user.email })}</p>
          <Button
            variant="secondary"
            size="sm"
            loading={resend.isPending}
            onClick={() => resend.mutate()}
          >
            <MailWarning size={15} />
            {t("verify.resend")}
          </Button>
        </Alert>
      )}

      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-content-primary mb-4 flex items-center gap-2">
          <User size={16} className="text-content-muted" />
          {t("profile.identity")}
        </h2>

        <div className="space-y-5">
          <AvatarPicker user={user} />

          <Input
            label={t("field.fullName")}
            value={form.name}
            onChange={set("name")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t("field.email")}
              value={user.email}
              hint={t("profile.emailLocked")}
              disabled
              readOnly
            />
            {studiesHere && (
              <Input
                label={t("profile.program")}
                hint={t("profile.programHint")}
                value={form.program}
                onChange={set("program")}
              />
            )}
          </div>

          {studiesHere && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {units.length > 0 && (
                <Select
                  label={unitLabel.singular}
                  value={form.academicUnitId}
                  onChange={set("academicUnitId")}
                  placeholder={unitLabel.pick}
                  options={units.map((unit) => ({
                    value: unit.id,
                    label: unit.name,
                  }))}
                />
              )}
              <Input
                label={unitLabel.term}
                type="number"
                min="1"
                max="20"
                value={form.termNumber}
                onChange={set("termNumber")}
              />
            </div>
          )}

          {user.role === "tutor" && (
            <Input
              label={t("profile.paypalEmail")}
              type="email"
              hint={t("profile.paypalHint")}
              value={form.paypalEmail}
              onChange={set("paypalEmail")}
            />
          )}
        </div>

        <div className="flex justify-end mt-5">
          <Button loading={save.isPending} onClick={submit}>
            {t("common:action.save")}
          </Button>
        </div>
      </Card>

      {user.role === "tutor" && (
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-content-primary mb-2 flex items-center gap-2">
            <BadgeCheck size={16} className="text-content-muted" />
            {t("profile.verification")}
          </h2>

          {user.tutorProfile?.isVerified ? (
            <div className="flex items-center gap-2">
              <Badge tone="positive">
                <ShieldCheck size={13} />
                {t("profile.verified")}
              </Badge>
              <span className="text-sm text-content-secondary">
                {t("profile.verifiedBody")}
              </span>
            </div>
          ) : (
            <p className="text-sm text-content-secondary">
              {t("profile.unverifiedBody")}
            </p>
          )}
        </Card>
      )}

      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-content-primary mb-4">
          {t("profile.preferences")}
        </h2>
        <PreferencesMenu stacked className="max-w-sm" />
      </Card>

      <PasswordCard />
    </PageShell>
  );
}
