
import { Bird } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleGoHome = () => {
    navigate(user ? "/dashboard" : "/");
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Logo */}
      <Bird className="w-20 h-20 text-orange-200 mb-6" />

      {/* 404 */}
      <h1 className="text-7xl font-extrabold text-gray-300 mb-4">404</h1>

      {/* Mensajes */}
      <h2 className="text-3xl font-semibold mb-2">Página no encontrada</h2>
      <p className="text-gray-500 mb-6">
        La página que buscas no existe o fue movida
      </p>

      {/* Botón */}
      <button
        onClick={handleGoHome}
        className="px-6 py-3 bg-orange-200 text-white font-semibold rounded-lg shadow hover:bg-orange-300 transition"
      >
        Volver al inicio
      </button>
    </motion.div>
  );
}