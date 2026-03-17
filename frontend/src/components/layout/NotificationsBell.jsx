import { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useSocket } from '../../hooks/useSocket';
import { useNavigate } from 'react-router-dom';

export const NotificationBell = ({ userId }) => {
  const socket = useSocket(userId);
  const { notifications, markAsRead, unreadCount } = useNotifications(socket);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = (index, notification) => {
    markAsRead(index);

    // Ejemplo de navegación según tipo de evento
    switch (notification.event) {
      case 'new_session_request':
      case 'session_confirmed':
      case 'session_completed':
        navigate(`/sessions/${notification.session.id}`);
        break;
      case 'session_disputed':
      case 'dispute_resolved':
        navigate(`/admin/disputes`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative">
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs px-1">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border rounded shadow-lg z-50 max-h-80 overflow-y-auto">
          {notifications.length === 0 && <p className="p-2">No hay notificaciones</p>}
          {notifications.map((n, i) => (
            <div
              key={i}
              onClick={() => handleClick(i, n)}
              className={`p-2 border-b cursor-pointer ${n.read ? 'bg-gray-100' : 'bg-white'}`}
            >
              <strong>{n.event.replace('_', ' ')}</strong>
              <p className="text-sm">{n.session?.subject?.name || 'Sesión'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};