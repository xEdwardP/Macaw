import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Bird, Lock, User } from "lucide-react";
import { authService } from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { translateError } from "../../i18n/translateError";
import { Alert, Button, Card, Input, Spinner } from "../../ui";
import DateTime from "../../domain/DateTime";
import RoleBadge from "../../domain/RoleBadge";
import PreferencesMenu from "../../components/layout/PreferencesMenu";

const buildSchema = (t) =>
  z.object({
    name: z.string().min(2, t("validation.nameShort")),
    password: z.string().min(8, t("validation.passwordMin", { count: 8 })),
  });

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4 py-16">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <PreferencesMenu />
      </div>

      <Card className="p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 justify-center">
            <Bird className="text-brand" size={32} />
            <span className="text-2xl font-bold text-brand">Macaw</span>
          </span>
        </div>

        {children}
      </Card>
    </div>
  );
}

export default function AcceptInvitation() {
  const { t } = useTranslation("auth");
  const { token } = useParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => authService.describeInvitation(token),
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(useMemo(() => buildSchema(t), [t])) });

  const { mutate, isPending } = useMutation({
    mutationFn: (values) => authService.acceptInvitation({ ...values, token }),
    onSuccess: (session) => {
      setAuth(session.user, session.token);
      toast.success(t("invitation.accepted"));
      navigate("/dashboard");
    },
    onError: (err) => toast.error(translateError(err)),
  });

  if (isLoading)
    return (
      <Shell>
        <div className="flex justify-center py-8">
          <Spinner size={32} />
        </div>
      </Shell>
    );

  if (error)
    return (
      <Shell>
        <Alert tone="danger" title={t("invitation.unavailable")}>
          {translateError(error)}
        </Alert>
        <Button as={Link} to="/login" variant="secondary" block className="mt-6">
          {t("login.title")}
        </Button>
      </Shell>
    );

  return (
    <Shell>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-content-primary">
          {t("invitation.title", { institution: invitation.institution.name })}
        </h2>
        <p className="text-content-secondary text-sm mt-2">
          {t("invitation.subtitle", { email: invitation.email })}
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <RoleBadge role={invitation.role} withIcon />
          <span className="text-xs text-content-muted">
            {t("invitation.validUntil")}{" "}
            <DateTime value={invitation.expiresAt} />
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(mutate)} className="space-y-4">
        <Input
          label={t("field.fullName")}
          placeholder={t("field.fullNamePlaceholder")}
          icon={User}
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label={t("invitation.choosePassword")}
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" block size="lg" loading={isPending} className="mt-2">
          {t("invitation.submit")}
        </Button>
      </form>
    </Shell>
  );
}
