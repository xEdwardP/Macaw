import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bird, Lock } from "lucide-react";
import { useResetPassword } from "../../data/useAccount";
import { translateError } from "../../i18n/translateError";
import { Alert, Button, Card, Input } from "../../ui";
import PreferencesMenu from "../../components/layout/PreferencesMenu";

const buildSchema = (t) =>
  z
    .object({
      password: z.string().min(8, t("validation.passwordMin", { count: 8 })),
      confirm: z.string(),
    })
    .refine((values) => values.password === values.confirm, {
      message: t("validation.passwordsDiffer"),
      path: ["confirm"],
    });

export default function ResetPassword() {
  const { t } = useTranslation("auth");
  const { token } = useParams();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(useMemo(() => buildSchema(t), [t])) });

  const reset = useResetPassword(() => navigate("/login"));

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4 py-16">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <PreferencesMenu />
      </div>

      <Card className="p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <Bird className="text-brand" size={32} />
            <span className="text-2xl font-bold text-brand">Macaw</span>
          </Link>
          <h2 className="text-2xl font-bold text-content-primary mt-4">
            {t("reset.title")}
          </h2>
          <p className="text-content-secondary text-sm mt-1">
            {t("reset.subtitle")}
          </p>
        </div>

        {reset.isError && (
          <Alert tone="danger" className="mb-4">
            {translateError(reset.error)}
          </Alert>
        )}

        <form
          onSubmit={handleSubmit(({ password }) => reset.mutate({ token, password }))}
          className="space-y-4"
        >
          <Input
            label={t("reset.newPassword")}
            type="password"
            icon={Lock}
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />

          <Input
            label={t("reset.confirmPassword")}
            type="password"
            icon={Lock}
            placeholder="••••••••"
            error={errors.confirm?.message}
            {...register("confirm")}
          />

          <Button type="submit" block size="lg" loading={reset.isPending}>
            {t("reset.submit")}
          </Button>
        </form>

        <p className="text-center text-sm text-content-secondary mt-6">
          <Link to="/forgot-password" className="text-brand font-medium hover:underline">
            {t("reset.requestAnother")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
