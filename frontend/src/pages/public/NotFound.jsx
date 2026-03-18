import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bird, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function NotFound() {
  const { user, token } = useAuthStore();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center mb-6"
        >
          <Bird className="text-orange-500 mb-4" size={56} />
          <span className="text-9xl font-extrabold text-orange-100 leading-none select-none tracking-tight">
            404
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Página no encontrada
          </h2>
          <p className="text-gray-500 mb-8">
            La página que buscas no existe o fue movida.
          </p>

          <Link
            to={token && user ? "/dashboard" : "/"}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
