import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "../services/notifications.service";
import { queryKeys } from "./queryKeys";
import { useAuthStore } from "../store/authStore";

export function useNotifications(params = { limit: 15 }) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationsService.list(params),
    enabled: Boolean(token),
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(),
      }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(),
      }),
  });
}
