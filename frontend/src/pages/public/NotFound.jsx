import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bird, ArrowLeft, Compass } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { EmptyState } from "../../patterns";

export default function NotFound() {
  const { user, token } = useAuthStore();
  const { t } = useTranslation("landing");
  const { t: tCommon } = useTranslation();

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-md"
      >
        <div className="flex flex-col items-center">
          <Bird className="text-brand mb-4" size={56} />
          <span className="text-9xl font-extrabold text-brand-content leading-none select-none tracking-tight">
            404
          </span>
        </div>

        <EmptyState
          icon={Compass}
          title={t("notFound.title")}
          description={t("notFound.body")}
          className="py-6"
          action={
            <Link
              to={token && user ? "/dashboard" : "/"}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-solid hover:brightness-95 text-brand-contrast font-semibold rounded-xl transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              {tCommon("action.goHome")}
            </Link>
          }
        />
      </motion.div>
    </div>
  );
}
