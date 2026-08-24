import { io } from "socket.io-client";

const serverUrl = () => {
  const api = import.meta.env.VITE_API_URL || "/api";

  try {
    return new URL(api, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
};

export function connectRealtime(token, handlers = {}) {
  const socket = io(serverUrl(), {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  for (const [event, handler] of Object.entries(handlers))
    socket.on(event, handler);

  return socket;
}
