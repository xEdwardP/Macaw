import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (userId) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    socketRef.current = io(import.meta.env.VITE_API_URL, {
      query: { userId },
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [userId]);

  return socketRef.current;
};