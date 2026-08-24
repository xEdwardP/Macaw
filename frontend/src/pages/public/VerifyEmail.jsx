import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bird, CheckCircle2, XCircle } from "lucide-react";
import { useVerifyEmail } from "../../data/useAccount";
import { useSyncProfile } from "../../data/useSession";
import { translateError } from "../../i18n/translateError";
import { Button, Card, Spinner } from "../../ui";
import PreferencesMenu from "../../components/layout/PreferencesMenu";

export default function VerifyEmail() {
  const { t } = useTranslation("auth");
  const { token } = useParams();
  const verify = useVerifyEmail();
  const attempted = useRef(false);

  const { refetch } = useSyncProfile();

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    verify.mutate(token, { onSuccess: () => refetch?.() });
  }, [token, verify, refetch]);

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center px-4 py-16">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <PreferencesMenu />
      </div>

      <Card className="p-8 w-full max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 justify-center mb-6">
          <Bird className="text-brand" size={32} />
          <span className="text-2xl font-bold text-brand">Macaw</span>
        </Link>

        {verify.isPending && (
          <>
            <Spinner className="mx-auto mb-4" />
            <p className="text-content-secondary">{t("verify.checking")}</p>
          </>
        )}

        {verify.isSuccess && (
          <>
            <CheckCircle2 className="mx-auto text-positive-content mb-4" size={48} />
            <h2 className="text-xl font-bold text-content-primary">
              {t("verify.doneTitle")}
            </h2>
            <p className="text-content-secondary text-sm mt-2">
              {t("verify.doneBody")}
            </p>
            <Button as={Link} to="/dashboard" block className="mt-6">
              {t("verify.continue")}
            </Button>
          </>
        )}

        {verify.isError && (
          <>
            <XCircle className="mx-auto text-danger-content mb-4" size={48} />
            <h2 className="text-xl font-bold text-content-primary">
              {t("verify.failedTitle")}
            </h2>
            <p className="text-content-secondary text-sm mt-2">
              {translateError(verify.error)}
            </p>
            <Button as={Link} to="/account" variant="secondary" block className="mt-6">
              {t("verify.goToAccount")}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
