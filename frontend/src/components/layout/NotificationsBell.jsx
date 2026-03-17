import { useState } from "react";
import { useNotifications } from "../../hooks/useNotifications";
import { useSocket } from "../../hooks/useSocket";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

export const NotificationBell = ({ userId }) => {
  const socket = useSocket(userId);
  const { notifications, markAsRead, unreadCount } = useNotifications(socket);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = (index, notification) => {
    markAsRead(index);

    switch (notification.event) {
      case "new_session_request":
      case "session_confirmed":
      case "session_completed":
        navigate(`/sessions/${notification.session.id}`);
        break;
      case "session_disputed":
      case "dispute_resolved":
        navigate(`/admin/disputes`);
        break;
      default:
        break;
    }
    setOpen(false); // cerrar dropdown al hacer click
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ x: 2, y: -2, scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-2 rounded-full text-orange-600 hover:bg-orange-100 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1">
            {unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10, x: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {notifications.length === 0 && (
              <p className="p-4 text-gray-500 text-center">No hay notificaciones</p>
            )}
            {notifications.map((n, i) => (
              <motion.div
                key={i}
                onClick={() => handleClick(i, n)}
                whileHover={{ x: 5, backgroundColor: "#FFF7ED" }} // ligero desplazamiento + color hover
                transition={{ type: "spring", stiffness: 300 }}
                className={`p-3 border-b cursor-pointer ${
                  n.read ? "bg-gray-50" : "bg-white"
                }`}
              >
                <strong className="text-gray-800 capitalize">{n.event.replace("_", " ")}</strong>
                <p className="text-sm text-gray-600">
                  {n.session?.subject?.name || "Sesión"}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};