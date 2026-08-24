import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Mail, Lock, Bird } from "lucide-react";
import { authService } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { translateError } from "../../i18n/translateError";
import { Button, Card, Input } from "../../ui";
import PreferencesMenu from "../../components/layout/PreferencesMenu";

const buildSchema = (t) =>
  z.object({
    email: z.string().email(t("validation.email")),
    password: z.string().min(6, t("validation.passwordMin", { count: 6 })),
  });

export default function Login() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const schema = useMemo(() => buildSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => {
      setAuth(session.user, session.token);
      toast.success(t("login.welcomeBack", { name: session.user.name }));
      navigate("/dashboard");
    },
    onError: (err) => toast.error(translateError(err)),
  });

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
            {t("login.title")}
          </h2>
          <p className="text-content-secondary text-sm mt-1">
            {t("login.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit(mutate)} className="space-y-4">
          <Input
            label={t("field.email")}
            type="email"
            placeholder={t("field.emailPlaceholder")}
            icon={Mail}
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label={t("field.password")}
            type="password"
            placeholder="••••••••"
            icon={Lock}
            error={errors.password?.message}
            {...register("password")}
          />

          <Button type="submit" block size="lg" loading={isPending} className="mt-2">
            {t("login.submit")}
          </Button>
        </form>

        <p className="text-center text-sm mt-4">
          <Link
            to="/forgot-password"
            className="text-content-secondary hover:text-brand hover:underline"
          >
            {t("forgot.link")}
          </Link>
        </p>

        <p className="text-center text-sm text-content-secondary mt-6">
          {t("login.noAccount")}{" "}
          <Link to="/register" className="text-brand font-medium hover:underline">
            {t("login.registerLink")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
