import { useEffect, useState } from 'react';

export const useNotifications = (socket) => {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!socket) return;

    const events = [
      'new_session_request',
      'session_confirmed',
      'session_completed',
      'session_disputed',
      'dispute_resolved'
    ];

    events.forEach(event => {
      socket.on(event, (data) => {
        setNotifications(prev => {
          const updated = [{ event, ...data, read: false }, ...prev];
          localStorage.setItem('notifications', JSON.stringify(updated));
          return updated;
        });
      });
    });

    return () => {
      events.forEach(event => socket.off(event));
    };
  }, [socket]);

  const markAsRead = (index) => {
    setNotifications(prev => {
      const updated = [...prev];
      updated[index].read = true;
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, markAsRead, unreadCount };
};