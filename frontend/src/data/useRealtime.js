import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectRealtime } from "../app/realtime";
import { queryKeys } from "./queryKeys";
import { useAuthStore } from "../store/authStore";

export function useRealtime() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return undefined;

    const socket = connectRealtime(token, {
      notification: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all(),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all() });
      },
    });

    return () => socket.close();
  }, [token, queryClient]);
}
