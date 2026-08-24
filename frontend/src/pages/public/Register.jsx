import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Mail, Lock, User, GraduationCap, BookOpen, Bird } from "lucide-react";
import { authService } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { useInstitutionByDomain, useUnits } from "../../data/useInstitution";
import { useUnitLabels } from "../../domain/useUnitLabels";
import { translateError } from "../../i18n/translateError";
import { Button, Card, Input, Select } from "../../ui";
import PreferencesMenu from "../../components/layout/PreferencesMenu";
import { cn } from "../../ui/cn";

const ROLES = [
  { value: "student", icon: BookOpen },
  { value: "tutor", icon: GraduationCap },
];

const buildSchema = (t) =>
  z.object({
    name: z.string().min(2, t("validation.nameShort")),
    email: z.string().email(t("validation.email")),
    password: z.string().min(8, t("validation.passwordMin", { count: 8 })),
    role: z.enum(["student", "tutor"]),
    academicUnitId: z.string().optional(),
  });

export default function Register() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [params] = useSearchParams();
  const [choosingRole, setChoosingRole] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(useMemo(() => buildSchema(t), [t])),
    defaultValues: { role: params.get("role") === "tutor" ? "tutor" : "student" },
  });

  const selectedRole = watch("role");
  const email = watch("email");

  const emailDomain = email?.includes("@") ? email.split("@")[1] : null;

  const { data: institution } = useInstitutionByDomain(emailDomain);

  const { data: unitsData } = useUnits(
    { institutionId: institution?.id, limit: 100 },
    { enabled: Boolean(institution) },
  );

  const units = unitsData?.data || [];

  const unitLabel = useUnitLabels(institution?.type);

  const { mutate, isPending } = useMutation({
    mutationFn: authService.register,
    onSuccess: (session) => {
      setAuth(session.user, session.token);
      toast.success(t("register.created"));
      navigate("/dashboard");
    },
    onError: (err) => toast.error(translateError(err)),
  });

  const submit = (values) => {
    if (choosingRole) mutate(values);
    else setChoosingRole(true);
  };

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4 py-16">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <PreferencesMenu />
      </div>

      <Card className="p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <Bird className="text-brand" size={32} />
            <span className="text-2xl font-bold text-brand">Macaw</span>
          </Link>
          <h2 className="text-2xl font-bold text-content-primary mt-4">
            {choosingRole ? t("register.roleTitle") : t("register.title")}
          </h2>
          <p className="text-content-secondary text-sm mt-1">
            {choosingRole ? t("register.roleSubtitle") : t("register.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className={cn("space-y-4", choosingRole && "hidden")}>
            <Input
              label={t("field.fullName")}
              icon={User}
              placeholder={t("field.fullNamePlaceholder")}
              error={errors.name?.message}
              {...register("name")}
            />

            <Input
              label={t("field.institutionalEmail")}
              type="email"
              icon={Mail}
              placeholder={t("field.emailPlaceholder")}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label={t("field.password")}
              type="password"
              icon={Lock}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            {units.length > 0 && (
              <Select
                label={unitLabel.singular}
                placeholder={unitLabel.pick}
                error={errors.academicUnitId?.message}
                options={units.map((unit) => ({
                  value: unit.id,
                  label: unit.name,
                }))}
                {...register("academicUnitId")}
              />
            )}

            <Button type="submit" block size="lg">
              {t("common:action.continue")}
            </Button>
          </div>

          <div className={cn("space-y-4", !choosingRole && "hidden")}>
            <p className="text-sm font-medium text-content-primary">
              {t("register.roleLabel")}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selectedRole === value}
                  onClick={() => setValue("role", value)}
                  className={cn(
                    "border-2 rounded-lg p-4 text-center transition-colors",
                    selectedRole === value
                      ? "border-brand bg-brand-surface"
                      : "border-line-default hover:border-line-strong",
                  )}
                >
                  <Icon
                    className={cn(
                      "mx-auto mb-1",
                      selectedRole === value
                        ? "text-brand"
                        : "text-content-muted",
                    )}
                    size={22}
                  />
                  <span className="block text-sm font-medium text-content-primary">
                    {t(value === "student" ? "register.asStudent" : "register.asTutor")}
                  </span>
                  <span className="block text-xs text-content-secondary mt-1">
                    {t(`register.roleHint.${value}`)}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                block
                size="lg"
                onClick={() => setChoosingRole(false)}
              >
                {t("common:action.back")}
              </Button>
              <Button type="submit" block size="lg" loading={isPending}>
                {t("register.finish")}
              </Button>
            </div>
          </div>
        </form>

        <p className="text-center text-sm text-content-secondary mt-6">
          {t("register.haveAccount")}{" "}
          <Link to="/login" className="text-brand font-medium hover:underline">
            {t("register.loginLink")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
