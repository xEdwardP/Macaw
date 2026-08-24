import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bird, Mail, MailCheck } from "lucide-react";
import { useForgotPassword } from "../../data/useAccount";
import { Button, Card, Input } from "../../ui";
import PreferencesMenu from "../../components/layout/PreferencesMenu";

const buildSchema = (t) => z.object({ email: z.string().email(t("validation.email")) });

export default function ForgotPassword() {
  const { t } = useTranslation("auth");
  const [sentTo, setSentTo] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(useMemo(() => buildSchema(t), [t])) });

  const forgot = useForgotPassword();

  const submit = (values) =>
    forgot.mutate(values, { onSuccess: () => setSentTo(values.email) });

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
        </div>

        {sentTo ? (
          <div className="text-center">
            <MailCheck className="mx-auto text-positive-content mb-4" size={48} />
            <h2 className="text-xl font-bold text-content-primary">
              {t("forgot.sentTitle")}
            </h2>
            <p className="text-content-secondary text-sm mt-2">
              {t("forgot.sentBody", { email: sentTo })}
            </p>
            <Button as={Link} to="/login" variant="secondary" block className="mt-6">
              {t("forgot.backToLogin")}
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-content-primary">
                {t("forgot.title")}
              </h2>
              <p className="text-content-secondary text-sm mt-1">
                {t("forgot.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit(submit)} className="space-y-4">
              <Input
                label={t("field.email")}
                type="email"
                icon={Mail}
                placeholder={t("field.emailPlaceholder")}
                error={errors.email?.message}
                {...register("email")}
              />

              <Button type="submit" block size="lg" loading={forgot.isPending}>
                {t("forgot.submit")}
              </Button>
            </form>

            <p className="text-center text-sm text-content-secondary mt-6">
              <Link to="/login" className="text-brand font-medium hover:underline">
                {t("forgot.backToLogin")}
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
