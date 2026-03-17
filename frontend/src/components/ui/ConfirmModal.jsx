
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger", // danger | warning | success
}) {
  const colors = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-orange-500 hover:bg-orange-600",
    success: "bg-green-600 hover:bg-green-700",
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 relative mx-4 sm:mx-0"
            initial={{ y: -50, scale: 0.8, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -50, scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
              onClick={onClose}
            >
              <X size={20} />
            </button>

            {/* Título */}
            <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>

            {/* Mensaje */}
            <p className="text-gray-600 mb-6">{message}</p>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition w-full sm:w-auto"
              >
                {cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-lg text-white ${colors[variant]} transition w-full sm:w-auto`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}